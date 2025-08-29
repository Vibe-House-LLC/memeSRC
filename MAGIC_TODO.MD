## MAGIC: Gemini Image Edit (Image + Prompt, No Mask)

### Overview
Add a new magic editing tool that accepts an image and a prompt (no masking layer) and generates a new image using Google Gemini. This lives alongside existing OpenAI-powered tools (Magic Erase/Fill) without breaking them. The new flow mirrors the existing inpaint pattern: a request lambda validates and enqueues work; a background lambda runs the model; results are written to S3 and recorded to DynamoDB; the frontend polls for the result.

### Objectives
- Integrate Google Gemini model `"gemini-2.5-flash-image-preview"` in a new background lambda.
- Keep existing OpenAI flows fully intact (no changes to `/inpaint` or the OpenAI lambdas).
- Add a new public API route: `POST /generate-image` that accepts `{ image, prompt }` (no mask).
- Replace the demo mock step in `src/components/magic-editor/MagicEditor.tsx` with the real backend flow (or plumb it via a prop); update `src/pages/MagicPage.tsx` to display results.
- Manage the Gemini API key via SSM Parameter Store key `gemini_api_key` (like `openai_apikey`).

---

## Repo Integration Map (current state)

- Existing OpenAI entrypoint (inpaint):
  - API route: `publicapi` POST `/inpaint` → lambda `memesrcinpainter`
  - Code: `amplify/backend/function/memesrcinpainter/src/index.js`
    - Validates user and deducts a credit via `/${ENV}/public/user/spendCredits` by invoking `memesrcUserFunction`.
    - Uploads `image` and `mask` to S3 bucket `process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME`.
    - Creates `MagicResult` in Dynamo (`process.env.API_MEMESRC_MAGICRESULTTABLE_NAME`).
    - Asynchronously invokes background lambda `process.env.FUNCTION_MEMESRCOPENAI_NAME` with `{ magicResultId, imageKey, maskKey, prompt }`.
    - Returns `{ magicResultId }` immediately.
- Existing OpenAI background processor:
  - Code: `amplify/backend/function/memesrcOpenAI/src/index.js`
    - Loads `openai_apikey` from SSM (env var holds the SSM parameter name).
    - Fetches inputs from S3, calls OpenAI Images Edits API, writes JPEGs to S3 under `public/`.
    - Produces CDN URLs like `https://i-${ENV}.memesrc.com/<id>.jpeg` and updates `MagicResult.results`.
- Frontend inpainting flow (reference):
  - `src/pages/V2EditorPage.js` and `src/pages/EditorPage.js`: calls `API.post('publicapi','/inpaint', { body })`, polls GraphQL `getMagicResult(id)` until `results` is populated.
- Demo magic editor page and mock:
  - Page: `src/pages/MagicPage.tsx` embeds `src/components/magic-editor/MagicEditor.tsx`.
  - Mock: `src/utils/mockMagicEdit.ts` (called inside `MagicEditor.tsx`). Replace this with real API call + polling.

---

## Backend Changes (new Gemini flow)

### 1) New API route
- File: `amplify/backend/api/publicapi/cli-inputs.json`
- Add new path mapping (keep permissions aligned with `/inpaint`):
  - Path: `"/generate-image"`
  - Lambda: `"memesrcGeminiHandler"` (new)

### 2) New request lambda: `memesrcGeminiHandler`
- Location: `amplify/backend/function/memesrcGeminiHandler/`
- Responsibilities (mirrors `memesrcinpainter`, minus mask):
  - Parse `{ image, prompt }` from `event.body` (image as data URL or base64).
  - Validate auth and spend 1 credit by invoking `process.env.FUNCTION_MEMESRCUSERFUNCTION_NAME` with path `/${ENV}/public/user/spendCredits`.
  - Persist input image to S3:
    - Bucket: `process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME`
    - Key: `tmp/${uuid}.png` (use mime-type from input; default `image/png`).
  - Create `MagicResult` item in DynamoDB:
    - Table: `process.env.API_MEMESRC_MAGICRESULTTABLE_NAME`
    - Fields: `id`, `magicResultUserId`, `prompt`, timestamps, `__typename: "MagicResult"`.
  - Invoke background lambda asynchronously (`InvocationType: 'Event'`) with payload `{ magicResultId, imageKey, prompt }`.
  - Return `{ magicResultId }` immediately with 200.

IAM/env:
- Needs permission to invoke `memesrcGeminiProcessor`.
- Needs S3 PutObject to the generated images bucket.
- Needs DynamoDB PutItem on the MagicResult table.
- Reuse existing patterns from `memesrcinpainter` CloudFormation template for policies.

### 3) New background lambda: `memesrcGeminiProcessor`
- Location: `amplify/backend/function/memesrcGeminiProcessor/`
- Responsibilities:
  - Load Gemini API key from SSM via env var name `process.env.gemini_api_key` (same pattern as `openai_apikey`).
    - Use `@aws-sdk/client-ssm` → `GetParameterCommand({ Name: process.env.gemini_api_key, WithDecryption: true })`.
  - Read input image from S3 `imageKey`.
  - Call Google Gemini with model `"gemini-2.5-flash-image-preview"` to generate an image from the prompt and input image.
  - Extract the returned image binary, write to S3 under `public/${uuid}.jpeg`.
  - Build CDN URL: `https://i-${process.env.ENV}.memesrc.com/${fileName}`.
  - Update `MagicResult.results` with a JSON array of URLs (consistent with OpenAI flow) via Dynamo `UpdateItem`.

IAM/env:
- SSM: `ssm:GetParameter` for the parameter referenced by `process.env.gemini_api_key`.
- S3: `GetObject` for `imageKey`, `PutObject` for `public/` outputs.
- DynamoDB: `UpdateItem` on `process.env.API_MEMESRC_MAGICRESULTTABLE_NAME`.

Dependencies (inside this lambda’s `src/package.json`):
- `@google/generative-ai`
- `@aws-sdk/client-ssm`
- `@aws-sdk/client-s3`
- `@aws-sdk/client-dynamodb`
- `uuid`

#### Gemini Node usage (reference snippet)
```javascript
// Inside memesrcGeminiProcessor/src/index.js
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const uuid = require('uuid');

const streamToBuffer = (stream) => new Promise((resolve, reject) => {
  const chunks = []; stream.on('data', c => chunks.push(c));
  stream.on('error', reject); stream.on('end', () => resolve(Buffer.concat(chunks)));
});

exports.handler = async (event) => {
  const { magicResultId, imageKey, prompt } = event;
  const ssm = new SSMClient({ region: 'us-east-1' });
  const s3 = new S3Client({ region: 'us-east-1' });
  const ddb = new DynamoDBClient({ region: 'us-east-1' });

  // 1) Load Gemini API key
  const { Parameter } = await ssm.send(new GetParameterCommand({ Name: process.env.gemini_api_key, WithDecryption: true }));
  const genAI = new GoogleGenerativeAI(Parameter.Value);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });

  // 2) Read input image from S3
  const imgObj = await s3.send(new GetObjectCommand({ Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME, Key: imageKey }));
  const imgBuffer = await streamToBuffer(imgObj.Body);
  const mimeType = 'image/png'; // or detect from key/content-type if needed
  const imageBase64 = imgBuffer.toString('base64');

  // 3) Generate content
  const promptText = prompt || 'Enhance this image';
  const response = await model.generateContent([
    promptText,
    { inlineData: { data: imageBase64, mimeType } },
  ]);

  // 4) Extract first returned image part
  const parts = response?.response?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p?.inlineData?.mimeType?.startsWith('image/')) || parts.find(p => p?.inlineData?.data);
  if (!imagePart?.inlineData?.data) throw new Error('No image was returned by Gemini');
  const outBuffer = Buffer.from(imagePart.inlineData.data, 'base64');

  // 5) Persist to S3 and update DynamoDB
  const fileName = `${uuid.v4()}.jpeg`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
    Key: `public/${fileName}`,
    Body: outBuffer,
    ContentType: 'image/jpeg',
  }));
  const cdnUrl = `https://i-${process.env.ENV}.memesrc.com/${fileName}`;

  await ddb.send(new UpdateItemCommand({
    TableName: process.env.API_MEMESRC_MAGICRESULTTABLE_NAME,
    Key: { id: { S: magicResultId } },
    UpdateExpression: 'set results = :r, updatedAt = :u',
    ExpressionAttributeValues: {
      ':r': { S: JSON.stringify([cdnUrl]) },
      ':u': { S: new Date().toISOString() },
    },
  }));
};
```

Notes:
- The SDK returns multimodal parts; we select the first `inlineData` image part. Add defensive checks and logging.
- If multiple variants are desired, repeat the call or read additional parts (if provided) and push multiple CDN URLs.
- Honor existing patterns for retries/backoff if needed.

### 4) Amplify wiring
- Create both lambdas via `amplify add function` and set Node.js runtime aligning with existing functions.
- For `memesrcGeminiProcessor`, add a Lambda env var `gemini_api_key` whose value is the name of the SSM parameter (not the secret itself). Grant `ssm:GetParameter`.
- Grant S3 and Dynamo permissions mirroring `memesrcOpenAI`.
- Update `amplify/backend/api/publicapi/cli-inputs.json` to add `/generate-image` → `memesrcGeminiHandler` (permissions: `private` with `auth` create/read/update/delete similar to `/inpaint`).
- Deploy: `amplify push`.

---

## Frontend Changes

### Replace mock with real API in Magic Editor flow
Current mock call site:
- `src/components/magic-editor/MagicEditor.tsx` calls `mockMagicEdit(...)` in `handleApply`.

Replace with:
- Call the new API: `API.post('publicapi', '/generate-image', { body: { image: internalSrc, prompt: currentPrompt } })`.
- From the response, read `{ magicResultId }` and poll GraphQL `getMagicResult(id)` until `results` is populated (JSON array of CDN URLs). This mirrors `V2EditorPage.js`/`EditorPage.js`.
- When an image URL is available, update the editor image and history with the returned CDN image, clear the prompt, and end processing state.

Sketch (inside `handleApply`):
```typescript
import { API } from 'aws-amplify';
import { getMagicResult } from '../path/to/graphql/queries'; // adjust import location if needed

async function applyGeminiEdit(imageDataUrl: string, prompt: string, onProgress?: (p: number) => void) {
  const { magicResultId } = await API.post('publicapi', '/generate-image', { body: { image: imageDataUrl, prompt } });
  const started = Date.now();
  const QUERY_INTERVAL = 1500; // match existing polling cadence
  const TIMEOUT = 120000; // 2 minutes, adjust as needed
  return await new Promise<string>((resolve, reject) => {
    const t = setInterval(async () => {
      try {
        // optionally emit synthetic progress
        if (onProgress) {
          const p = Math.min(99, Math.floor(((Date.now() - started) / TIMEOUT) * 100));
          onProgress(p);
        }
        const res = await API.graphql({
          query: getMagicResult,
          variables: { id: magicResultId },
          authMode: 'AMAZON_COGNITO_USER_POOLS'
        });
        const results = res?.data?.getMagicResult?.results;
        if (results) {
          clearInterval(t);
          const [firstUrl] = JSON.parse(results);
          resolve(firstUrl);
        }
        if (Date.now() - started > TIMEOUT) {
          clearInterval(t);
          reject(new Error('Timed out waiting for Gemini result'));
        }
      } catch (e) {
        clearInterval(t);
        reject(e);
      }
    }, QUERY_INTERVAL);
  });
}
```

UI/UX notes:
- Keep the existing progress bar UX. While waiting, show the pending prompt and progress.
- On success, commit the returned image into the editor history (like the mock does) and mark the pending entry as complete.
- On error/timeout, mark the history entry as failed and show a snackbar.

MagicPage wiring:
- `src/pages/MagicPage.tsx` already handles stages (pick → edit → done). No stage changes needed; the edit step’s `MagicEditor` will now call the real API.

---

## Request/Response Contracts

### POST /generate-image (new)
- Request body: `{ image: string; prompt: string }`
  - `image`: data URL (preferred) or base64; backend will strip the prefix and decode.
  - `prompt`: freeform text.
- Response: `{ magicResultId: string }` (immediate).

### Poll for results
- Use existing GraphQL `getMagicResult(id)`.
- When ready, `results` is a JSON stringified array of CDN URLs (e.g., `"[\"https://i-dev.memesrc.com/abc.jpeg\"]"`).

---

## SSM & Secrets
- Create SSM SecureString parameter for Gemini: name: your choice, referenced by lambda env var `gemini_api_key`.
  - Example: parameter path `/memesrc/${ENV}/gemini_api_key` → set the lambda env var to that exact path string.
- Permissions: allow the background lambda to `ssm:GetParameter` that name.

---

## Testing & Validation
- Unit tests (lambda-level):
  - Validate input (missing image/prompt → 400) in `memesrcGeminiHandler`.
  - Spend credits happy-path and insufficient credits → 403 error response.
  - Background lambda: mock SSM/S3 and Gemini SDK; ensure a valid `inlineData` image leads to S3 `public/` write and Dynamo update with URL array.
- Integration tests:
  - End-to-end: call `/generate-image` with a small PNG data URL + prompt; ensure a `MagicResult` is created and populated; confirm CDN URL works.
  - Load tests: multiple concurrent calls; validate S3 and Dynamo throughput and that polling UX stays responsive.

---

## Non-breaking Guarantees
- No changes to existing `/inpaint` or to `memesrcinpainter`/`memesrcOpenAI` behavior.
- New route is additive and isolated (`/generate-image`).
- Frontend changes only replace the mock path in `MagicEditor.tsx`; no changes to pages that rely on inpainting.

---

## Implementation Checklist
1) Backend
   - [ ] Create `memesrcGeminiHandler` (request lambda). Mirror `memesrcinpainter` minus `mask` handling.
   - [ ] Create `memesrcGeminiProcessor` (background lambda). Implement Gemini call and S3/Dynamo updates.
   - [ ] Add `/generate-image` mapping in `amplify/backend/api/publicapi/cli-inputs.json` to `memesrcGeminiHandler`.
   - [ ] Configure env var `gemini_api_key` and SSM permission for processor lambda.
   - [ ] Grant S3/Dynamo/Lambda permissions analogous to OpenAI functions.
   - [ ] `amplify push` and verify deployed function names in `team-provider-info.json`.

2) Frontend
   - [ ] Replace `mockMagicEdit` usage in `src/components/magic-editor/MagicEditor.tsx` with API + poll flow.
   - [ ] Ensure progress UX is retained; on success set image to returned CDN URL.
   - [ ] `MagicPage.tsx` continues to handle stage transitions; no mask UI needed.

3) Validation
   - [ ] Manual E2E test from `MagicPage` with a few prompts.
   - [ ] Verify `MagicResult` items and S3 outputs; URLs resolve via CDN domain `i-${ENV}.memesrc.com`.
   - [ ] Confirm existing OpenAI inpaint still works.

---

## References
- Google Gemini Node SDK: `@google/generative-ai`
- Model: `gemini-2.5-flash-image-preview` (image + prompt → image)
- Existing repo flows to mirror:
  - Request lambda: `amplify/backend/function/memesrcinpainter/src/index.js`
  - Background lambda: `amplify/backend/function/memesrcOpenAI/src/index.js`
  - API mapping: `amplify/backend/api/publicapi/cli-inputs.json`
  - Frontend polling example: `src/pages/V2EditorPage.js`, `src/pages/EditorPage.js`



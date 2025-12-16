/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["openai_apikey","gemini_api_key"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  })
  .promise();

Parameters will be of the form { Name: 'secretName', Value: 'secretValue', ... }[]
*/
/* Amplify Params - DO NOT EDIT
	API_MEMESRC_GRAPHQLAPIIDOUTPUT
	API_MEMESRC_MAGICEDITHISTORYTABLE_ARN
	API_MEMESRC_MAGICEDITHISTORYTABLE_NAME
	API_MEMESRC_MAGICRESULTTABLE_ARN
	API_MEMESRC_MAGICRESULTTABLE_NAME
	API_MEMESRC_RATELIMITTABLE_ARN
	API_MEMESRC_RATELIMITTABLE_NAME
	API_MEMESRC_WEBSITESETTINGTABLE_ARN
	API_MEMESRC_WEBSITESETTINGTABLE_NAME
	AUTH_MEMESRCC3C71449_USERPOOLID
	ENV
	REGION
	STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT */

const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient, UpdateItemCommand, GetItemCommand, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const AWS = require('aws-sdk');
const uuid = require('uuid');
const axios = require('axios');
const FormData = require('form-data');
const { Buffer } = require('buffer');
const { sendEmail } = require('/opt/email-function');
const MAX_REFERENCE_IMAGES = 4;
const DEFAULT_RATE_LIMIT = 100;
const MODEL_RATE_LIMIT_FIELD = {
  openai: 'openAIRateLimit',
  gemini: 'nanoBananaRateLimit',
};
const MODEL_USAGE_FIELD = {
  openai: 'openaiUsage',
  gemini: 'geminiUsage',
};
const cognitoISP = new AWS.CognitoIdentityServiceProvider({
  region: process.env.AWS_REGION || process.env.REGION || 'us-east-1',
});
let cachedOpenAiKey;
// Gemini client (lazy dependency; only used when no mask is provided)
let GoogleGenerativeAI;
try {
  ({ GoogleGenerativeAI } = require('@google/generative-ai'));
} catch (_) {
  // Defer require issues to runtime in environments without the package
}

const streamToBuffer = (stream) => {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
};

// Minimal image size parser for PNG and JPEG buffers
const getImageSize = (buffer) => {
    if (!buffer || !Buffer.isBuffer(buffer)) return null;
    // PNG signature
    if (buffer.length >= 24 && buffer.readUInt32BE(0) === 0x89504e47) {
        try {
            const width = buffer.readUInt32BE(16);
            const height = buffer.readUInt32BE(20);
            if (width > 0 && height > 0) return { width, height };
        } catch (_) { /* ignore */ }
    }
    // JPEG
    if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
        let offset = 2;
        while (offset < buffer.length) {
            if (buffer[offset] !== 0xff) break;
            const marker = buffer[offset + 1];
            // SOF0 - SOF15, excluding DHT (0xC4) and JPG (0xC8, 0xCC)
            if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
                if (offset + 8 <= buffer.length) {
                    const height = buffer.readUInt16BE(offset + 5);
                    const width = buffer.readUInt16BE(offset + 7);
                    if (width > 0 && height > 0) return { width, height };
                }
                break;
            } else {
                const blockLen = buffer.readUInt16BE(offset + 2);
                if (!blockLen || offset + 2 + blockLen > buffer.length) break;
                offset += 2 + blockLen;
            }
        }
    }
    return null;
};

const parseNumberOrDefault = (value, fallback) => {
    const parsed = typeof value === 'number' ? value : parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const capitalize = (value = '') => value.charAt(0).toUpperCase() + value.slice(1);

const getOpenAiApiKey = async (ssmClient) => {
    if (cachedOpenAiKey) return cachedOpenAiKey;
    const command = new GetParameterCommand({ Name: process.env.openai_apikey, WithDecryption: true });
    console.log('[OpenAI] Fetching API key from SSM', { paramName: process.env.openai_apikey });
    const data = await ssmClient.send(command);
    cachedOpenAiKey = data?.Parameter?.Value;
    if (!cachedOpenAiKey) {
        throw new Error('Missing OpenAI API key');
    }
    return cachedOpenAiKey;
};

const moderateContent = async ({ apiKey, prompt, images = [] }) => {
    if (!apiKey) throw new Error('OpenAI API key missing for moderation');
    const input = [];
    if (prompt) {
        input.push({ type: 'text', text: String(prompt).slice(0, 8000) });
    }
    images.forEach((img) => {
        if (img) {
            input.push({
                type: 'image_url',
                image_url: { url: img },
            });
        }
    });
    if (!input.length) return { flagged: false };
    console.log('[Moderation] Checking content', { promptLength: prompt ? String(prompt).length : 0, imageCount: images.length });
    const resp = await axios.post('https://api.openai.com/v1/moderations', {
        model: 'omni-moderation-latest',
        input,
    }, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
    });
    const result = resp?.data?.results?.[0];
    console.log('[Moderation] Response', {
        id: resp?.data?.id,
        model: resp?.data?.model,
        flagged: Boolean(result?.flagged),
        categories: result?.categories,
    });
    if (!result) return { flagged: false };
    const categories = result.categories || {};
    const flagged = Boolean(result.flagged);
    return { flagged, categories };
};

const getUtcDayId = () => new Date().toISOString().slice(0, 10);

const getResetEta = () => {
    const now = new Date();
    const reset = new Date(now);
    reset.setUTCHours(24, 0, 0, 0); // UTC midnight
    const diffMs = Math.max(0, reset.getTime() - now.getTime());
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes };
};

const fetchModelRateLimit = async (dynamoClient, modelKey) => {
    const tableName = process.env.API_MEMESRC_WEBSITESETTINGTABLE_NAME;
    if (!tableName) {
        console.warn('[RateLimit] Missing website settings table env var; using default', { fallback: DEFAULT_RATE_LIMIT });
        return DEFAULT_RATE_LIMIT;
    }
    const limitField = MODEL_RATE_LIMIT_FIELD[modelKey] || MODEL_RATE_LIMIT_FIELD.openai;
    const resp = await dynamoClient.send(new GetItemCommand({
        TableName: tableName,
        Key: { id: { S: 'globalSettings' } },
        ProjectionExpression: '#limitField',
        ExpressionAttributeNames: {
            '#limitField': limitField,
        },
    }));
    const limit = parseNumberOrDefault(resp?.Item?.[limitField]?.N, DEFAULT_RATE_LIMIT);
    return limit;
};

const fetchAdminEmails = async () => {
    const userPoolId = process.env.AUTH_MEMESRCC3C71449_USERPOOLID;
    if (!userPoolId) {
        console.warn('[AdminEmail] Missing USERPOOLID env; cannot notify admins');
        return [];
    }
    const emails = new Set();
    let nextToken;
    do {
        try {
            const resp = await cognitoISP.listUsersInGroup({
                UserPoolId: userPoolId,
                GroupName: 'admins',
                Limit: 60,
                NextToken: nextToken,
            }).promise();
            console.log('[AdminEmail] Fetched admin page', {
                count: resp?.Users?.length || 0,
                nextToken: resp?.NextToken ? 'yes' : 'no',
            });
            (resp?.Users || []).forEach((user) => {
                const emailAttr = (user.Attributes || []).find((attr) => attr.Name === 'email');
                if (emailAttr?.Value) {
                    emails.add(emailAttr.Value);
                }
            });
            nextToken = resp?.NextToken;
        } catch (err) {
            console.error('[AdminEmail] Failed to list admin users', { message: err?.message });
            break;
        }
    } while (nextToken);
    const emailList = Array.from(emails);
    console.log('[AdminEmail] Final admin email list', { count: emailList.length, emails: emailList });
    return emailList;
};

const getRateLimitSnapshot = async (dynamoClient, rateLimitId = getUtcDayId()) => {
    if (!process.env.API_MEMESRC_RATELIMITTABLE_NAME) return null;
    try {
        const resp = await dynamoClient.send(new GetItemCommand({
            TableName: process.env.API_MEMESRC_RATELIMITTABLE_NAME,
            Key: { id: { S: rateLimitId } },
        }));
        const item = resp?.Item || {};
        return {
            rateLimitId,
            usage: {
                openai: parseNumberOrDefault(item?.[MODEL_USAGE_FIELD.openai]?.N, 0),
                gemini: parseNumberOrDefault(item?.[MODEL_USAGE_FIELD.gemini]?.N, 0),
                total: parseNumberOrDefault(item?.currentUsage?.N, 0),
            },
        };
    } catch (err) {
        console.error('[RateLimit] Failed to fetch usage snapshot', { message: err?.message });
        return null;
    }
};

const getAllModelLimits = async (dynamoClient) => {
    const limits = {};
    for (const key of Object.keys(MODEL_RATE_LIMIT_FIELD)) {
        limits[key] = await fetchModelRateLimit(dynamoClient, key);
    }
    return limits;
};

const markAdminAlertSent = async ({ dynamoClient, modelKey, rateLimitId }) => {
    if (!process.env.API_MEMESRC_RATELIMITTABLE_NAME || !rateLimitId) return false;
    const nowIso = new Date().toISOString();
    try {
        await dynamoClient.send(new UpdateItemCommand({
            TableName: process.env.API_MEMESRC_RATELIMITTABLE_NAME,
            Key: { id: { S: rateLimitId } },
            UpdateExpression: 'SET #alerts = if_not_exists(#alerts, :emptyMap), #alerts.#modelKey = if_not_exists(#alerts.#modelKey, :ts)',
            ConditionExpression: 'attribute_not_exists(#alerts.#modelKey)',
            ExpressionAttributeNames: {
                '#alerts': 'adminAlerts',
                '#modelKey': modelKey,
            },
            ExpressionAttributeValues: {
                ':emptyMap': { M: {} },
                ':ts': { S: nowIso },
            },
        }));
        return true;
    } catch (err) {
        if (err?.message?.includes('document path')) {
            console.warn('[AdminEmail] Resetting adminAlerts map due to invalid path; overwriting existing value', {
                modelKey,
                rateLimitId,
            });
            try {
                await dynamoClient.send(new UpdateItemCommand({
                    TableName: process.env.API_MEMESRC_RATELIMITTABLE_NAME,
                    Key: { id: { S: rateLimitId } },
                    UpdateExpression: 'SET #alerts = :map',
                    ExpressionAttributeNames: {
                        '#alerts': 'adminAlerts',
                    },
                    ExpressionAttributeValues: {
                        ':map': { M: { [modelKey]: { S: nowIso } } },
                    },
                }));
                return true;
            } catch (fallbackErr) {
                console.error('[AdminEmail] Fallback alert mark failed', { message: fallbackErr?.message });
            }
        }
        if (err?.name !== 'ConditionalCheckFailedException') {
            console.error('[AdminEmail] Failed to mark alert as sent', { message: err?.message });
        }
        return false;
    }
};

const buildRateLimitEmailContent = ({ modelKey, limit, snapshot, limits, eta }) => {
    const modelLabel = capitalize(modelKey);
    const models = ['openai', 'gemini'];
    const rows = models.map((key) => {
        const used = snapshot?.usage?.[key] || 0;
        const max = limits?.[key] || DEFAULT_RATE_LIMIT;
        return {
            key,
            label: capitalize(key),
            used,
            max,
            remaining: Math.max(0, max - used),
        };
    });
    const etaText = `Limits reset in ${eta.hours} hour(s) and ${eta.minutes} minute(s) (midnight UTC).`;
    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
          <h2 style="color: #111;">${modelLabel} daily limit reached</h2>
          <p>The ${modelLabel} model hit its daily limit of ${limit} generations.</p>
          <p><strong>Usage snapshot (${snapshot?.rateLimitId || getUtcDayId()}):</strong></p>
          <ul>
            ${rows.map((row) => `<li>${row.label}: ${row.used}/${row.max} used (${row.remaining} remaining today)</li>`).join('')}
          </ul>
          <p>${etaText}</p>
          <p style="color: #555;">This notice was sent to the admins group.</p>
        </body>
      </html>
    `;
    const textBody = [
        `${modelLabel} daily limit reached (${limit}).`,
        '',
        `Usage snapshot (${snapshot?.rateLimitId || getUtcDayId()}):`,
        ...rows.map((row) => `- ${row.label}: ${row.used}/${row.max} used (${row.remaining} remaining today)`),
        '',
        etaText,
        'This notice was sent to the admins group.',
    ].join('\n');
    return { subject: `memeSRC: ${modelLabel} daily limit reached`, htmlBody, textBody };
};

const notifyAdminsOfRateLimit = async ({ dynamoClient, modelKey, limit, rateLimitId }) => {
    const safeRateLimitId = rateLimitId || getUtcDayId();
    try {
        const marked = await markAdminAlertSent({ dynamoClient, modelKey, rateLimitId: safeRateLimitId });
        if (!marked) {
            console.log('[AdminEmail] Alert already sent for this model/day', { modelKey, rateLimitId: safeRateLimitId });
            return;
        }
        const adminEmails = await fetchAdminEmails();
        if (!adminEmails.length) {
            console.warn('[AdminEmail] No admin emails found; skipping notification');
            return;
        }
        const [snapshot, limits] = await Promise.all([
            getRateLimitSnapshot(dynamoClient, safeRateLimitId),
            getAllModelLimits(dynamoClient),
        ]);
        const eta = getResetEta();
        const { subject, htmlBody, textBody } = buildRateLimitEmailContent({
            modelKey,
            limit: limit || limits?.[modelKey] || DEFAULT_RATE_LIMIT,
            snapshot,
            limits,
            eta,
        });
        await sendEmail({
            toAddresses: adminEmails,
            subject,
            htmlBody,
            textBody,
        });
        console.log('[AdminEmail] Rate limit alert sent', { modelKey, rateLimitId: safeRateLimitId, recipients: adminEmails.length });
    } catch (err) {
        console.error('[AdminEmail] Failed to send rate limit alert', { message: err?.message, modelKey });
    }
};

const incrementDailyUsage = async ({ dynamoClient, modelKey, limit }) => {
    const tableName = process.env.API_MEMESRC_RATELIMITTABLE_NAME;
    if (!tableName) {
        throw new Error('Missing API_MEMESRC_RATELIMITTABLE_NAME environment variable');
    }
    const rateLimitId = getUtcDayId();
    const modelUsageField = MODEL_USAGE_FIELD[modelKey] || MODEL_USAGE_FIELD.openai;
    const nowIso = new Date().toISOString();
    try {
        const updateResp = await dynamoClient.send(new UpdateItemCommand({
            TableName: tableName,
            Key: { id: { S: rateLimitId } },
            UpdateExpression: 'SET currentUsage = if_not_exists(currentUsage, :zero) + :incr, #modelUsage = if_not_exists(#modelUsage, :zero) + :incr, createdAt = if_not_exists(createdAt, :now), updatedAt = :now',
            ConditionExpression: 'attribute_not_exists(#modelUsage) OR #modelUsage < :limitValue',
            ExpressionAttributeNames: {
                '#modelUsage': modelUsageField,
            },
            ExpressionAttributeValues: {
                ':zero': { N: '0' },
                ':incr': { N: '1' },
                ':limitValue': { N: limit.toString() },
                ':now': { S: nowIso },
            },
            ReturnValues: 'UPDATED_NEW',
        }));
        const modelUsage = parseNumberOrDefault(updateResp?.Attributes?.[modelUsageField]?.N, 0);
        const totalUsage = parseNumberOrDefault(updateResp?.Attributes?.currentUsage?.N, 0);
        return { rateLimitId, modelUsage, totalUsage };
    } catch (error) {
        if (error?.name === 'ConditionalCheckFailedException') {
            const rateLimitError = new Error(`Daily ${modelKey} rate limit reached`);
            rateLimitError.code = 'RateLimitExceeded';
            rateLimitError.rateLimitId = rateLimitId;
            rateLimitError.modelKey = modelKey;
            rateLimitError.limit = limit;
            throw rateLimitError;
        }
        throw error;
    }
};

const enforceRateLimit = async (dynamoClient, modelKey) => {
    const limit = await fetchModelRateLimit(dynamoClient, modelKey);
    const usage = await incrementDailyUsage({ dynamoClient, modelKey, limit });
    console.log('[RateLimit] Usage incremented', {
        modelKey,
        rateLimitId: usage.rateLimitId,
        modelUsage: usage.modelUsage,
        totalUsage: usage.totalUsage,
        limit,
    });
    return { ...usage, limit };
};

const recordRateLimitError = async ({ dynamoClient, magicResultId, modelKey, limit, rateLimitId }) => {
    if (!magicResultId || !process.env.API_MEMESRC_MAGICRESULTTABLE_NAME) {
        return;
    }
    const errorPayload = {
        reason: 'rate_limit',
        message: `Daily ${modelKey} limit reached. Please try again tomorrow.`,
        model: modelKey,
        limit,
        rateLimitId,
        timestamp: new Date().toISOString(),
    };
    try {
        await dynamoClient.send(new UpdateItemCommand({
            TableName: process.env.API_MEMESRC_MAGICRESULTTABLE_NAME,
            Key: { id: { S: magicResultId } },
            UpdateExpression: 'SET #error = :error, updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#error': 'error',
            },
            ExpressionAttributeValues: {
                ':error': { S: JSON.stringify(errorPayload) },
                ':updatedAt': { S: new Date().toISOString() },
            },
        }));
        console.warn('[RateLimit] Recorded rate limit error on MagicResult', {
            magicResultId,
            modelKey,
            rateLimitId,
            limit,
        });
    } catch (err) {
        console.error('[RateLimit] Failed to record error on MagicResult', {
            magicResultId,
            message: err?.message,
        });
    }
};

const recordModerationError = async ({ dynamoClient, magicResultId, modelKey, categories }) => {
    if (!magicResultId || !process.env.API_MEMESRC_MAGICRESULTTABLE_NAME) {
        return;
    }
    const errorPayload = {
        reason: 'moderation',
        message: 'Content was blocked by safety filters.',
        model: modelKey,
        categories,
        timestamp: new Date().toISOString(),
    };
    try {
        await dynamoClient.send(new UpdateItemCommand({
            TableName: process.env.API_MEMESRC_MAGICRESULTTABLE_NAME,
            Key: { id: { S: magicResultId } },
            UpdateExpression: 'SET #error = :error, updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#error': 'error',
            },
            ExpressionAttributeValues: {
                ':error': { S: JSON.stringify(errorPayload) },
                ':updatedAt': { S: new Date().toISOString() },
            },
        }));
    } catch (err) {
        console.error('[Moderation] Failed to record error on MagicResult', { magicResultId, message: err?.message });
    }
};

const ensureNotFlagged = async ({ apiKey, prompt, images, dynamoClient, magicResultId, modelKey }) => {
    let moderation;
    try {
        moderation = await moderateContent({ apiKey, prompt, images });
    } catch (err) {
        await recordModerationError({
            dynamoClient,
            magicResultId,
            modelKey,
            categories: { provider: 'openai', reason: 'moderation_api_error', message: err?.message },
        });
        const error = new Error('Moderation service failed');
        error.code = 'ModerationUnavailable';
        error.modelKey = modelKey;
        throw error;
    }
    if (moderation.flagged) {
        await recordModerationError({ dynamoClient, magicResultId, modelKey, categories: moderation.categories });
        const error = new Error('Content blocked by safety filters');
        error.code = 'ModerationBlocked';
        error.modelKey = modelKey;
        throw error;
    }
};

const recordMagicEditHistory = async ({ dynamoClient, ownerSub, prompt, imageUrl, metadata }) => {
    if (!process.env.API_MEMESRC_MAGICEDITHISTORYTABLE_NAME) return;
    const nowIso = new Date().toISOString();
    const item = {
        id: { S: uuid.v4() },
        prompt: prompt ? { S: String(prompt) } : { NULL: true },
        imageUrl: imageUrl ? { S: imageUrl } : { NULL: true },
        metadata: metadata ? { S: JSON.stringify(metadata) } : { NULL: true },
        owner: ownerSub ? { S: ownerSub } : { NULL: true },
        createdAt: { S: nowIso },
        updatedAt: { S: nowIso },
        status: { S: 'unreviewed' },
    };
    await dynamoClient.send(new PutItemCommand({
        TableName: process.env.API_MEMESRC_MAGICEDITHISTORYTABLE_NAME,
        Item: item,
    }));
};

const makeRequest = async (formData, headers) => {
    try {
        return await axios.post('https://api.openai.com/v1/images/edits', formData, { headers });
    } catch (error) {
        if (error.response && error.response.status === 400) {
            console.error("Received 400 error, retrying in 5 seconds...");
            await new Promise(resolve => setTimeout(resolve, 5000));  // Wait for 5 seconds
            return await axios.post('https://api.openai.com/v1/images/edits', formData, { headers });
        } else {
            throw error;  // If it's another error or a retry after 400 also fails, throw it
        }
    }
}

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    const ssmClient = new SSMClient({ region: "us-east-1" });
    const s3Client = new S3Client({ region: "us-east-1" });
    const dynamoClient = new DynamoDBClient({ region: "us-east-1" });

    console.log('[Magic] Handler start', {
        hasEvent: Boolean(event),
        eventType: typeof event,
        eventKeys: event ? Object.keys(event) : [],
        env: process.env.ENV,
        region: 'us-east-1',
        bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
    });

    const { magicResultId, imageKey, maskKey, prompt, referenceKeys, userSub } = event || {};
    console.log('[Magic] Params', {
        magicResultId,
        hasImageKey: Boolean(imageKey),
        hasMaskKey: Boolean(maskKey),
        referenceCount: Array.isArray(referenceKeys) ? referenceKeys.length : 0,
        promptLength: (prompt || '').length,
    });

    // Branch: if maskKey is provided, run existing OpenAI edit flow; otherwise run Gemini image+prompt flow
    if (!maskKey) {
        console.log('[Magic] Branch selected: Gemini (no maskKey)');
        if (!imageKey) {
            console.error('[Gemini] Missing required imageKey');
            throw new Error('Missing required parameter: imageKey');
        }
        // Gemini path: single image + prompt → new image
        const paramName = process.env.gemini_api_key;
        if (!paramName) {
            throw new Error('Missing env var gemini_api_key');
        }

        console.log('[Gemini] Fetching API key from SSM', { paramName });
        const keyResp = await ssmClient.send(new GetParameterCommand({ Name: paramName, WithDecryption: true }));
        if (!keyResp?.Parameter?.Value) {
            throw new Error('Failed to load Gemini API key from SSM');
        }

        if (!GoogleGenerativeAI) {
            // Attempt require again (useful after deployment when deps are installed)
            ({ GoogleGenerativeAI } = require('@google/generative-ai'));
        }

        const genAI = new GoogleGenerativeAI(keyResp.Parameter.Value);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image-preview' });

        // Read input image from S3
        console.log('[Gemini] S3 GetObject (input image) start', {
            bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
            key: imageKey,
        });
        const imgObj = await s3Client.send(new GetObjectCommand({
            Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
            Key: imageKey,
        }));
        const imgBuffer = await streamToBuffer(imgObj.Body);
        const imageBase64 = imgBuffer.toString('base64');
        const mimeType = 'image/png';
        const openAiKey = await getOpenAiApiKey(ssmClient);
        const baseSize = getImageSize(imgBuffer);
        const baseAspect = baseSize && baseSize.height > 0 ? Number(baseSize.width / baseSize.height) : null;
        const baseSizeHint = baseSize
            ? `Base image dimensions: ${baseSize.width}x${baseSize.height} (aspect ratio ${baseAspect?.toFixed(4)}). Output must match this size and aspect ratio.`
            : 'Output must match the original base image size and aspect ratio.';

        console.log('[Gemini] Input', {
            magicResultId,
            imageKey,
            promptLength: (prompt || '').length,
            mimeType,
            s3ContentLength: imgObj?.ContentLength || imgBuffer.length,
        });

        // Generate
        const userPrompt = prompt || 'Enhance this image';
        const referencesToLoad = Array.isArray(referenceKeys) ? referenceKeys.slice(0, MAX_REFERENCE_IMAGES) : [];
        const referenceImages = [];
        for (const key of referencesToLoad) {
            try {
                const refObj = await s3Client.send(new GetObjectCommand({
                    Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
                    Key: key,
                }));
                if (!refObj?.Body) continue;
                const refBuffer = await streamToBuffer(refObj.Body);
                referenceImages.push({
                    key,
                    data: refBuffer.toString('base64'),
                    mimeType: refObj.ContentType || 'image/png',
                    size: refBuffer.length,
                });
            } catch (err) {
                console.warn('[Gemini] Failed to load reference image', { key, message: err?.message });
            }
        }

        const contentParts = [
            { text: 'Base image to edit. Keep core subjects unless instructions say otherwise.' },
            { inlineData: { data: imageBase64, mimeType } },
        ];

        if (referenceImages.length) {
            contentParts.push({ text: baseSizeHint });
            contentParts.push({ text: `Reference photos (${referenceImages.length}). Use them for style/context; do not overwrite the base content unless requested.` });
            referenceImages.forEach((ref, idx) => {
                contentParts.push({ text: `Reference ${idx + 1}` });
                contentParts.push({ inlineData: { data: ref.data, mimeType: ref.mimeType || 'image/png' } });
            });
        }

        const promptPreface = referenceImages.length
            ? `${baseSizeHint} Edit the original base photo without changing its aspect ratio or dimensions. Use the reference photos only as guidance for style/placement/content; do not resize, crop, or match their canvas. Final output must retain the base photo framing and canvas size.`
            : '';

        if (promptPreface) {
            contentParts.push({ text: promptPreface });
        }
        contentParts.push({ text: `User instructions: ${userPrompt}` });

        // Moderation: prompt + base image + references
        try {
            const moderationImages = [
                `data:${mimeType};base64,${imageBase64}`,
                ...referenceImages.map((ref) => `data:${ref.mimeType || 'image/png'};base64,${ref.data}`),
            ];
            await ensureNotFlagged({
                apiKey: openAiKey,
                prompt: userPrompt,
                images: moderationImages,
                dynamoClient,
                magicResultId,
                modelKey: 'gemini',
            });
        } catch (err) {
            console.error('[Moderation] Gemini input blocked', { message: err?.message });
            throw err;
        }
        // Rate limit after passing moderation
        let rateLimitUsageGemini;
        try {
            rateLimitUsageGemini = await enforceRateLimit(dynamoClient, 'gemini');
        } catch (err) {
            if (err?.code === 'RateLimitExceeded') {
                await recordRateLimitError({
                    dynamoClient,
                    magicResultId,
                    modelKey: 'gemini',
                    limit: err?.limit,
                    rateLimitId: err?.rateLimitId,
                });
                await notifyAdminsOfRateLimit({
                    dynamoClient,
                    modelKey: 'gemini',
                    limit: err?.limit,
                    rateLimitId: err?.rateLimitId,
                });
            }
            throw err;
        }
        if (rateLimitUsageGemini?.modelUsage >= rateLimitUsageGemini?.limit) {
            await notifyAdminsOfRateLimit({
                dynamoClient,
                modelKey: 'gemini',
                limit: rateLimitUsageGemini.limit,
                rateLimitId: rateLimitUsageGemini.rateLimitId,
            });
        }

        console.log('[Gemini] Invoking model', {
            model: 'gemini-2.5-flash-image-preview',
            promptPreview: String(prompt).slice(0, 120),
            generationConfig: { responseModalities: ['IMAGE'], temperature: 0 },
            referenceCount: referenceImages.length,
        });
        let response;
        try {
            response = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: contentParts,
                }],
                generationConfig: {
                    responseModalities: ['IMAGE'],
                    temperature: 0,
                },
            });
        } catch (err) {
            console.error('[Gemini] generateContent error', {
                message: err?.message,
                name: err?.name,
                stack: err?.stack,
            });
            throw err;
        }

        const numCandidates = response?.response?.candidates?.length || 0;
        const parts = response?.response?.candidates?.[0]?.content?.parts || [];
        const partsSummary = Array.isArray(parts)
            ? parts.map((p, idx) => ({
                idx,
                hasInlineData: Boolean(p?.inlineData),
                mimeType: p?.inlineData?.mimeType,
                dataLength: p?.inlineData?.data ? String(p.inlineData.data).length : 0,
                hasMedia: Boolean(p?.media),
                mediaDataLength: p?.media ? (Array.isArray(p.media) ? (p.media[0]?.data ? String(p.media[0].data).length : 0) : (p.media?.data ? String(p.media.data).length : 0)) : 0,
                textPreview: typeof p?.text === 'string' ? p.text.slice(0, 80) : undefined,
            }))
            : [];

        console.log('[Gemini] Response summary', {
            hasResponse: Boolean(response?.response),
            numCandidates,
            partsCount: parts?.length || 0,
            partsSummary,
            usage: response?.response?.usageMetadata || null,
            safety: response?.response?.promptFeedback?.safetyRatings || null,
        });

        // Try to extract image from inlineData or media
        const imagePartInline = parts.find(p => p?.inlineData?.data);
        const imagePartMedia = parts.find(p => p?.media && (Array.isArray(p.media) ? p.media[0]?.data : p.media?.data));

        let outBuffer;
        let outMime = 'image/jpeg';
        if (imagePartInline?.inlineData?.data) {
            try {
                outBuffer = Buffer.from(imagePartInline.inlineData.data, 'base64');
                outMime = imagePartInline.inlineData.mimeType || 'image/jpeg';
            } catch (e) {
                console.warn('[Gemini] Failed to decode inlineData as base64, will try raw bytes');
                outBuffer = Buffer.isBuffer(imagePartInline.inlineData.data)
                    ? Buffer.from(imagePartInline.inlineData.data)
                    : undefined;
            }
        } else if (imagePartMedia?.media) {
            const media = Array.isArray(imagePartMedia.media) ? imagePartMedia.media[0] : imagePartMedia.media;
            const data = media?.data;
            try {
                if (typeof data === 'string') {
                    outBuffer = Buffer.from(data, 'base64');
                } else if (data) {
                    outBuffer = Buffer.from(data);
                }
                outMime = media?.mimeType || 'image/jpeg';
            } catch (e) {
                console.warn('[Gemini] Failed to decode media data');
            }
        }

        if (!outBuffer) {
            const textParts = parts.filter(p => typeof p?.text === 'string').map(p => p.text);
            console.error('[Gemini] No image returned; parts detail', { partsSummary, textPreview: (textParts.join('\n') || '').slice(0, 200) });
            await recordModerationError({
                dynamoClient,
                magicResultId,
                modelKey: 'gemini',
                categories: { provider: 'gemini', reason: 'no_image_returned' },
            });
            const err = new Error('No image was returned by Gemini (possibly blocked by provider).');
            err.code = 'ProviderModeration';
            throw err;
        }

        try {
            const encodedOutput = `data:${outMime || 'image/jpeg'};base64,${outBuffer.toString('base64')}`;
            await ensureNotFlagged({
                apiKey: openAiKey,
                prompt: userPrompt,
                images: [encodedOutput],
                dynamoClient,
                magicResultId,
                modelKey: 'gemini',
            });
        } catch (err) {
            console.error('[Moderation] Gemini output blocked', { message: err?.message });
            throw err;
        }

        const fileName = `${uuid.v4()}.jpeg`;
        console.log('[Gemini] Writing output image to S3');
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
            Key: `public/${fileName}`,
            Body: outBuffer,
            ContentType: outMime || 'image/jpeg',
        }));
        const cdnUrl = `https://i-${process.env.ENV}.memesrc.com/${fileName}`;
        console.log('[Gemini] Wrote image + computed CDN URL', { fileName, cdnUrl });

        // Record history entry (Gemini generates one image)
        try {
            await recordMagicEditHistory({
                dynamoClient,
                ownerSub: userSub,
                prompt: userPrompt,
                imageUrl: cdnUrl,
                metadata: {
                    initialImageKey: imageKey || null,
                    model: 'gemini',
                },
            });
        } catch (err) {
            console.warn('[History] Failed to record Gemini magic edit history', { message: err?.message });
        }

        console.log('[Gemini] Updating DynamoDB with results');
        await dynamoClient.send(new UpdateItemCommand({
            TableName: process.env.API_MEMESRC_MAGICRESULTTABLE_NAME,
            Key: {
                "id": { S: magicResultId }
            },
            UpdateExpression: "set results = :results, updatedAt = :updatedAt",
            ExpressionAttributeValues: {
                ":results": { S: JSON.stringify([cdnUrl]) },
                ":updatedAt": { S: new Date().toISOString() }
            }
        }));
        console.log('[Gemini] UpdateItem complete', { magicResultId });
        return; // done with Gemini branch
    }

    // Fetch the images from S3
    if (!imageKey) {
        console.error('[OpenAI] Missing required imageKey');
        throw new Error('Missing required parameter: imageKey');
    }
    if (!maskKey) {
        console.error('[OpenAI] Missing required maskKey');
        throw new Error('Missing required parameter: maskKey');
    }
    const openAiKey = await getOpenAiApiKey(ssmClient);
    console.log('[OpenAI] S3 GetObject (image) start', {
        bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
        key: imageKey,
    });
    const imageObject = await s3Client.send(new GetObjectCommand({
        Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
        Key: imageKey
    }));
    console.log('[OpenAI] S3 GetObject (mask) start', {
        bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
        key: maskKey,
    });
    const maskObject = await s3Client.send(new GetObjectCommand({
        Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
        Key: maskKey
    }));

    const image_data = await streamToBuffer(imageObject.Body);
    const mask_data = await streamToBuffer(maskObject.Body);

    let formData = new FormData();
    formData.append('image', image_data, {
        filename: 'image.png',
        contentType: 'image/png',
    });
    formData.append('mask', mask_data, {
        filename: 'mask.png',
        contentType: 'image/png',
    });
    formData.append('prompt', prompt);
    formData.append('n', 2);
    formData.append('size', "1024x1024");

    const headers = {
        'Authorization': `Bearer ${openAiKey}`,
        ...formData.getHeaders()
    };

    // Moderation: input prompt + base image
    const baseImageDataUrl = `data:${imageObject.ContentType || 'image/png'};base64,${image_data.toString('base64')}`;
    try {
        await ensureNotFlagged({
            apiKey: openAiKey,
            prompt,
            images: [baseImageDataUrl],
            dynamoClient,
            magicResultId,
            modelKey: 'openai',
        });
    } catch (err) {
        console.error('[Moderation] OpenAI input blocked', { message: err?.message });
        throw err;
    }
    // Rate limit after passing moderation
    let rateLimitUsageOpenai;
    try {
        rateLimitUsageOpenai = await enforceRateLimit(dynamoClient, 'openai');
    } catch (err) {
        if (err?.code === 'RateLimitExceeded') {
            await recordRateLimitError({
                dynamoClient,
                magicResultId,
                modelKey: 'openai',
                limit: err?.limit,
                rateLimitId: err?.rateLimitId,
            });
            await notifyAdminsOfRateLimit({
                dynamoClient,
                modelKey: 'openai',
                limit: err?.limit,
                rateLimitId: err?.rateLimitId,
            });
        }
        throw err;
    }
    if (rateLimitUsageOpenai?.modelUsage >= rateLimitUsageOpenai?.limit) {
        await notifyAdminsOfRateLimit({
            dynamoClient,
            modelKey: 'openai',
            limit: rateLimitUsageOpenai.limit,
            rateLimitId: rateLimitUsageOpenai.rateLimitId,
        });
    }

    console.log('[OpenAI] Submitting edit request to OpenAI');
    const response = await makeRequest(formData, headers);
    console.log('[OpenAI] Received response', { items: Array.isArray(response?.data?.data) ? response.data.data.length : 0 });

    const promises = response.data.data.map(async (imageItem) => {
        const image_url = imageItem.url;

        const imageResponse = await axios({
            method: 'get',
            url: image_url,
            responseType: 'arraybuffer'
        });

        const imageBuffer = Buffer.from(imageResponse.data, 'binary');
        const fileName = `${uuid.v4()}.jpeg`;
        const s3Params = {
            Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
            Key: `public/${fileName}`,
            Body: imageBuffer,
            ContentType: 'image/jpeg',
        };

        // Moderation on generated output
        const encodedOutput = `data:${s3Params.ContentType};base64,${imageBuffer.toString('base64')}`;
        try {
            await ensureNotFlagged({
                apiKey: openAiKey,
                prompt,
                images: [encodedOutput],
                dynamoClient,
                magicResultId,
                modelKey: 'openai',
            });
        } catch (err) {
            console.error('[Moderation] OpenAI output blocked', { message: err?.message });
            const moderationCodes = ['ModerationBlocked', 'ModerationUnavailable', 'ProviderModeration'];
            if (moderationCodes.includes(err?.code) && !err?.moderationRecorded) {
                await recordModerationError({
                    dynamoClient,
                    magicResultId,
                    modelKey: 'openai',
                    categories: { provider: 'openai', reason: 'output_blocked' },
                });
                err.moderationRecorded = true;
            }
            throw err;
        }

        // Record history entry for each OpenAI-generated image
        try {
            const cdnUrl = `https://i-${process.env.ENV}.memesrc.com/${fileName}`;
            await recordMagicEditHistory({
                dynamoClient,
                ownerSub: userSub,
                prompt,
                imageUrl: cdnUrl,
                metadata: {
                    initialImageKey: imageKey || null,
                    model: 'openai',
                },
            });
        } catch (err) {
            console.warn('[History] Failed to record OpenAI magic edit history', { message: err?.message });
        }

        console.log('[OpenAI] Writing generated image to S3', { key: s3Params.Key });
        await s3Client.send(new PutObjectCommand(s3Params));

        return `https://i-${process.env.ENV}.memesrc.com/${fileName}`;
    });

    let cdnImageUrls;
    try {
        cdnImageUrls = await Promise.all(promises);
    } catch (err) {
        const moderationCodes = ['ModerationBlocked', 'ModerationUnavailable', 'ProviderModeration'];
        const isModerationError = Boolean(err?.moderationRecorded || moderationCodes.includes(err?.code));
        if (isModerationError && !err?.moderationRecorded) {
            await recordModerationError({
                dynamoClient,
                magicResultId,
                modelKey: 'openai',
                categories: { provider: 'openai', reason: 'no_image_returned' },
            });
            err.moderationRecorded = true;
        }
        if (!isModerationError) {
            console.error('[OpenAI] Image processing failed (non-moderation)', { message: err?.message, code: err?.code });
        }
        throw err;
    }
    console.log('[OpenAI] Uploaded images to S3', { count: cdnImageUrls.length });

    console.log('[OpenAI] Updating DynamoDB with results');
    await dynamoClient.send(new UpdateItemCommand({
        TableName: process.env.API_MEMESRC_MAGICRESULTTABLE_NAME,
        Key: {
            "id": { S: magicResultId }
        },
        UpdateExpression: "set results = :results, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
            ":results": { S: JSON.stringify(cdnImageUrls) },
            ":updatedAt": { S: new Date().toISOString() }
        }
    }));
    console.log('[OpenAI] UpdateItem complete', { magicResultId });
};

// Top-level error listener (defensive): wrap handler in try/catch if desired
// Keeping as-is to preserve Lambda contract; important logs are emitted inline above.

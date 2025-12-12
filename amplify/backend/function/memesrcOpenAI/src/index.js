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
	API_MEMESRC_MAGICRESULTTABLE_ARN
	API_MEMESRC_MAGICRESULTTABLE_NAME
	ENV
	REGION
	STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT */

const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient, UpdateItemCommand, GetItemCommand } = require("@aws-sdk/client-dynamodb");
const uuid = require('uuid');
const axios = require('axios');
const FormData = require('form-data');
const { Buffer } = require('buffer');
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

const getUtcDayId = () => new Date().toISOString().slice(0, 10);

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
            UpdateExpression: 'SET error = :error, updatedAt = :updatedAt',
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

    const { magicResultId, imageKey, maskKey, prompt, referenceKeys } = event || {};
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
        try {
            await enforceRateLimit(dynamoClient, 'gemini');
        } catch (err) {
            if (err?.code === 'RateLimitExceeded') {
                await recordRateLimitError({
                    dynamoClient,
                    magicResultId,
                    modelKey: 'gemini',
                    limit: err?.limit,
                    rateLimitId: err?.rateLimitId,
                });
            }
            throw err;
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
            throw new Error('No image was returned by Gemini');
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
    try {
        await enforceRateLimit(dynamoClient, 'openai');
    } catch (err) {
        if (err?.code === 'RateLimitExceeded') {
            await recordRateLimitError({
                dynamoClient,
                magicResultId,
                modelKey: 'openai',
                limit: err?.limit,
                rateLimitId: err?.rateLimitId,
            });
        }
        throw err;
    }
    const command = new GetParameterCommand({ Name: process.env.openai_apikey, WithDecryption: true });
    console.log('[OpenAI] Fetching API key from SSM', { paramName: process.env.openai_apikey });
    const data = await ssmClient.send(command);
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
        'Authorization': `Bearer ${data.Parameter.Value}`,
        ...formData.getHeaders()
    };

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

        console.log('[OpenAI] Writing generated image to S3', { key: s3Params.Key });
        await s3Client.send(new PutObjectCommand(s3Params));

        return `https://i-${process.env.ENV}.memesrc.com/${fileName}`;
    });

    const cdnImageUrls = await Promise.all(promises);
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

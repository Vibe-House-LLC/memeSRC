/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["openai_apikey"].map(secretName => process.env[secretName]),
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
const { DynamoDBClient, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const uuid = require('uuid');
const axios = require('axios');
const FormData = require('form-data');
const { Buffer } = require('buffer');

const streamToBuffer = (stream) => {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
};

// Single attempt requester with fixed timeout. No fallbacks, no retries.
const makeRequest = async (formData, config, opts = { timeoutMs: 120000 }) => {
    const { timeoutMs = 120000 } = opts || {};
    return axios.post('https://api.openai.com/v1/images/edits', formData, {
        ...config,
        timeout: timeoutMs,
        validateStatus: (status) => status >= 200 && status < 300,
    });
}

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event, context) => {
	const ssmClient = new SSMClient({ region: "us-east-1" });
	const s3Client = new S3Client({ region: "us-east-1" });
	const dynamoClient = new DynamoDBClient({ region: "us-east-1" });

	let finished = false;
	let watchdog;

	const { magicResultId, imageKey, maskKey, prompt, size, input_fidelity } = event;
	const sanitizedPrompt = (typeof prompt === 'string' && prompt.trim().length > 0)
		? prompt
		: 'Fill the masked areas realistically, matching surrounding pixels.';

	try {
		// Watchdog setup: ensure we mark the record as failed just before Lambda timeout
		try {
			console.log('Worker start: event summary', { hasId: !!magicResultId, hasImageKey: !!imageKey, hasMaskKey: !!maskKey, size, input_fidelity });
			const remainingMs = (typeof context?.getRemainingTimeInMillis === 'function') ? context.getRemainingTimeInMillis() : 60000;
			const watchdogDelay = Math.max(1000, remainingMs - 2000);
			console.log('Watchdog configured with delay ms', watchdogDelay);
			watchdog = setTimeout(async () => {
				if (finished || !magicResultId) return;
				try {
					await dynamoClient.send(new UpdateItemCommand({
						TableName: process.env.API_MEMESRC_MAGICRESULTTABLE_NAME,
						Key: { id: { S: magicResultId } },
						UpdateExpression: "set #status = :status, #error = :error, #updatedAt = :updatedAt, #currentStatus = :cs",
						ExpressionAttributeNames: {
							"#status": "status",
							"#error": "error",
							"#updatedAt": "updatedAt",
							"#currentStatus": "currentStatus"
						},
						ExpressionAttributeValues: {
							":status": { S: "failed" },
							":error": { S: JSON.stringify({ message: 'Worker timeout before completion', code: 'LambdaTimeout' }) },
							":updatedAt": { S: new Date().toISOString() },
							":cs": { S: "worker: timeout" }
						}
					}));
				} catch (wtErr) {
					console.error('Failed to write timeout status for MagicResult', wtErr);
				}
			}, watchdogDelay);
		} catch (wtSetupErr) {
			console.error('Failed to set watchdog timer', wtSetupErr);
		}

		const command = new GetParameterCommand({ Name: process.env.openai_apikey, WithDecryption: true });
		const data = await ssmClient.send(command);
		console.log('Fetched OpenAI API key from SSM');

		// Helper to write current status safely
		const writeCurrentStatus = async (text) => {
			try {
				await dynamoClient.send(new UpdateItemCommand({
					TableName: process.env.API_MEMESRC_MAGICRESULTTABLE_NAME,
					Key: { id: { S: magicResultId } },
					UpdateExpression: "set #currentStatus = :cs, #updatedAt = :updatedAt",
					ExpressionAttributeNames: {
						"#currentStatus": "currentStatus",
						"#updatedAt": "updatedAt"
					},
					ExpressionAttributeValues: {
						":cs": { S: text },
						":updatedAt": { S: new Date().toISOString() }
					}
				}));
			} catch (e) { console.error('Failed to write currentStatus', text, e); }
		};

		await writeCurrentStatus('worker: credentials loaded');

		// Fetch the images from S3
		const imageObject = await s3Client.send(new GetObjectCommand({
			Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
			Key: imageKey
		}));
		const maskObject = await s3Client.send(new GetObjectCommand({
			Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
			Key: maskKey
		}));
		console.log('Fetched inputs from S3', { imageKey, maskKey });

		const image_data = await streamToBuffer(imageObject.Body);
		const mask_data = await streamToBuffer(maskObject.Body);

		await writeCurrentStatus('worker: inputs loaded');

		const headers = {
			'Authorization': `Bearer ${data.Parameter.Value}`,
			// Remaining form headers will be added per request
		};

		const buildFormData = (desiredSize, fidelity) => {
			let fd = new FormData();
			fd.append('model', 'gpt-image-1');
			fd.append('image', image_data, {
				filename: 'image.png',
				contentType: 'image/png',
			});
			fd.append('mask', mask_data, {
				filename: 'mask.png',
				contentType: 'image/png',
			});
			fd.append('prompt', sanitizedPrompt);
			fd.append('n', 2);
			fd.append('size', desiredSize || "1024x1024");
			return fd;
		};

		// Single call per variant, no fallbacks

		await writeCurrentStatus(`worker: contacting OpenAI (improved size=${size || '1024x1024'})`);
		const openAiResults = [];
		try {
			const fdImproved = buildFormData(size || '1024x1024', input_fidelity);
			const improved = await makeRequest(fdImproved, { headers: { ...headers, ...fdImproved.getHeaders() } }, { timeoutMs: 120000 });
			openAiResults[1] = { status: 'fulfilled', value: improved };
			await writeCurrentStatus('worker: improved completed');
		} catch (e) {
			console.error('OpenAI improved error', e?.response?.status, e?.response?.data || e?.message);
			openAiResults[1] = { status: 'rejected', reason: e };
			await writeCurrentStatus('worker: improved failed');
		}
		await writeCurrentStatus('worker: contacting OpenAI (original size=1024x1024)');
		try {
			const fdOriginal = buildFormData('1024x1024', null);
			const original = await makeRequest(fdOriginal, { headers: { ...headers, ...fdOriginal.getHeaders() } }, { timeoutMs: 120000 });
			openAiResults[0] = { status: 'fulfilled', value: original };
			await writeCurrentStatus('worker: original completed');
		} catch (e) {
			console.error('OpenAI original error', e?.response?.status, e?.response?.data || e?.message);
			openAiResults[0] = { status: 'rejected', reason: e };
			await writeCurrentStatus('worker: original failed');
		}
		console.log('OpenAI results settled', openAiResults.map(r => ({ status: r.status, err: r.status === 'rejected' ? (r.reason?.message || r.reason) : undefined })));

		await writeCurrentStatus('worker: processing responses');

		const saveResponses = async (response, isImproved) => {
			const promises = response.data.data.map(async (imageItem) => {
				let imageBuffer;
				let contentType = 'image/png';
				if (imageItem?.b64_json) {
					imageBuffer = Buffer.from(imageItem.b64_json, 'base64');
					contentType = 'image/png';
				} else if (imageItem?.url) {
					const urlStr = imageItem.url.toString().trim();
					try { new URL(urlStr); } catch { throw new Error('Invalid image URL from OpenAI'); }
					const imageResponse = await axios({ method: 'get', url: urlStr, responseType: 'arraybuffer', timeout: 90000 });
					imageBuffer = Buffer.from(imageResponse.data, 'binary');
					contentType = imageResponse.headers['content-type'] || 'image/png';
				} else {
					throw new Error('Unexpected image item format: missing b64_json and url');
				}

				const ext = contentType.includes('jpeg') ? 'jpeg' : 'png';
				const fileName = `${uuid.v4()}.${ext}`;
				const s3Params = {
					Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
					Key: `public/${fileName}`,
					Body: imageBuffer,
					ContentType: contentType,
				};

				await s3Client.send(new PutObjectCommand(s3Params));

				const baseUrl = `https://i-${process.env.ENV}.memesrc.com/${fileName}`;
				return isImproved ? `${baseUrl}?variant=improved` : baseUrl;
			});
			return Promise.all(promises);
		};

		// For fulfilled responses, save to S3; for rejected, collect errors
		const errors = [];
		let fulfilledOld;
		let fulfilledNew;
		if (openAiResults[0].status === 'fulfilled') {
			fulfilledOld = openAiResults[0].value;
		} else {
			const err0 = openAiResults[0].reason;
			errors.push({ variant: 'original_square', stage: 'OpenAIRequest', message: err0?.message || 'Unknown error', code: err0?.response?.status || err0?.code, details: err0?.response?.data });
		}
		if (openAiResults[1].status === 'fulfilled') {
			fulfilledNew = openAiResults[1].value;
		} else {
			const err1 = openAiResults[1].reason;
			errors.push({ variant: 'improved', stage: 'OpenAIRequest', message: err1?.message || 'Unknown error', code: err1?.response?.status || err1?.code, details: err1?.response?.data });
		}

		await writeCurrentStatus('worker: saving results');
		const saveTasks = [];
		if (fulfilledOld) saveTasks.push(saveResponses(fulfilledOld, false));
		if (fulfilledNew) saveTasks.push(saveResponses(fulfilledNew, true));

		const saved = await Promise.allSettled(saveTasks);
		console.log('Save tasks settled', saved.map(r => ({ status: r.status, err: r.status === 'rejected' ? (r.reason?.message || r.reason) : undefined })));
		const urlBatches = [];
		saved.forEach((res, idx) => {
			if (res.status === 'fulfilled') {
				urlBatches.push(res.value);
			} else {
				errors.push({ variant: idx === 0 && fulfilledOld ? 'original_square' : 'improved', stage: 'SaveToS3', message: res.reason?.message || 'Failed to save generated images', code: res.reason?.code });
			}
		});
		const cdnImageUrls = urlBatches.flat();

		if (cdnImageUrls.length === 4) {
			await dynamoClient.send(new UpdateItemCommand({
				TableName: process.env.API_MEMESRC_MAGICRESULTTABLE_NAME,
				Key: {
					"id": { S: magicResultId }
				},
				UpdateExpression: "set #results = :results, #status = :status, #updatedAt = :updatedAt, #currentStatus = :cs REMOVE #error",
				ExpressionAttributeNames: {
					"#results": "results",
					"#status": "status",
					"#updatedAt": "updatedAt",
					"#currentStatus": "currentStatus",
					"#error": "error"
				},
				ExpressionAttributeValues: {
					":results": { S: JSON.stringify(cdnImageUrls) },
					":status": { S: "completed" },
					":updatedAt": { S: new Date().toISOString() },
					":cs": { S: "worker: completed" }
				}
			}));
		} else if (cdnImageUrls.length > 0) {
			await dynamoClient.send(new UpdateItemCommand({
				TableName: process.env.API_MEMESRC_MAGICRESULTTABLE_NAME,
				Key: {
					"id": { S: magicResultId }
				},
				UpdateExpression: "set #results = :results, #status = :status, #error = :error, #updatedAt = :updatedAt, #currentStatus = :cs",
				ExpressionAttributeNames: {
					"#results": "results",
					"#status": "status",
					"#error": "error",
					"#updatedAt": "updatedAt",
					"#currentStatus": "currentStatus"
				},
				ExpressionAttributeValues: {
					":results": { S: JSON.stringify(cdnImageUrls) },
					":status": { S: "completed_partial" },
					":error": { S: JSON.stringify({ message: 'Partial success', reasons: errors }) },
					":updatedAt": { S: new Date().toISOString() },
					":cs": { S: "worker: partial" }
				}
			}));
		} else {
			await dynamoClient.send(new UpdateItemCommand({
				TableName: process.env.API_MEMESRC_MAGICRESULTTABLE_NAME,
				Key: {
					"id": { S: magicResultId }
				},
				UpdateExpression: "set #status = :status, #error = :error, #updatedAt = :updatedAt, #currentStatus = :cs",
				ExpressionAttributeNames: {
					"#status": "status",
					"#error": "error",
					"#updatedAt": "updatedAt",
					"#currentStatus": "currentStatus"
				},
				ExpressionAttributeValues: {
					":status": { S: "failed" },
					":error": { S: JSON.stringify({ message: 'No images generated by OpenAI', stage: 'Finalize', reasons: errors }) },
					":updatedAt": { S: new Date().toISOString() },
					":cs": { S: "worker: failed finalize" }
				}
			}));
		}

		finished = true;
	} catch (err) {
		console.error("OpenAI worker failed:", err);
		const safeError = {
			message: err?.message || 'Unknown error',
			code: err?.response?.status || err?.code || 'Unknown',
			details: err?.response?.data || undefined,
		};
		try {
			await dynamoClient.send(new UpdateItemCommand({
				TableName: process.env.API_MEMESRC_MAGICRESULTTABLE_NAME,
				Key: {
					"id": { S: magicResultId }
				},
				UpdateExpression: "set #status = :status, #error = :error, #updatedAt = :updatedAt, #currentStatus = :cs",
				ExpressionAttributeNames: {
					"#status": "status",
					"#error": "error",
					"#updatedAt": "updatedAt",
					"#currentStatus": "currentStatus"
				},
				ExpressionAttributeValues: {
					":status": { S: "failed" },
					":error": { S: JSON.stringify({ ...safeError, stage: 'Unhandled' }) },
					":updatedAt": { S: new Date().toISOString() },
					":cs": { S: "worker: failed unhandled" }
				}
			}));
		} catch (writeErr) {
			console.error('Failed to write failure status for MagicResult', writeErr);
		}
		finished = true;
	} finally {
		if (watchdog) clearTimeout(watchdog);
	}
	// Do not rethrow to avoid Lambda retries writing duplicate errors
};

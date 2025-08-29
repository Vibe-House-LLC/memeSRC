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
const { DynamoDBClient, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const uuid = require('uuid');
const axios = require('axios');
const FormData = require('form-data');
const { Buffer } = require('buffer');
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

    const { magicResultId, imageKey, maskKey, prompt } = event;

    // Branch: if maskKey is provided, run existing OpenAI edit flow; otherwise run Gemini image+prompt flow
    if (!maskKey) {
        // Gemini path: single image + prompt → new image
        const paramName = process.env.gemini_api_key;
        if (!paramName) {
            throw new Error('Missing env var gemini_api_key');
        }

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
        const imgObj = await s3Client.send(new GetObjectCommand({
            Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
            Key: imageKey,
        }));
        const imgBuffer = await streamToBuffer(imgObj.Body);
        const imageBase64 = imgBuffer.toString('base64');
        const mimeType = 'image/png';

        // Generate
        const promptText = prompt || 'Enhance this image';
        const response = await model.generateContent([
            promptText,
            { inlineData: { data: imageBase64, mimeType } },
        ]);

        const parts = response?.response?.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find(p => p?.inlineData?.mimeType?.startsWith('image/')) || parts.find(p => p?.inlineData?.data);
        if (!imagePart?.inlineData?.data) {
            throw new Error('No image was returned by Gemini');
        }
        const outBuffer = Buffer.from(imagePart.inlineData.data, 'base64');

        const fileName = `${uuid.v4()}.jpeg`;
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
            Key: `public/${fileName}`,
            Body: outBuffer,
            ContentType: 'image/jpeg',
        }));
        const cdnUrl = `https://i-${process.env.ENV}.memesrc.com/${fileName}`;

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

        return; // done with Gemini branch
    }

    const command = new GetParameterCommand({ Name: process.env.openai_apikey, WithDecryption: true });
    const data = await ssmClient.send(command);

    // Fetch the images from S3
    const imageObject = await s3Client.send(new GetObjectCommand({
        Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
        Key: imageKey
    }));
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

    const response = await makeRequest(formData, headers);

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

        await s3Client.send(new PutObjectCommand(s3Params));

        return `https://i-${process.env.ENV}.memesrc.com/${fileName}`;
    });

    const cdnImageUrls = await Promise.all(promises);

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
};

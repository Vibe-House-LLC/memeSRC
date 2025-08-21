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

    const { magicResultId, imageKey, maskKey, prompt, mode, style } = event;

    const command = new GetParameterCommand({ Name: process.env.openai_apikey, WithDecryption: true });
    const data = await ssmClient.send(command);

    const buildStickerPrompt = (userPrompt, styleName) => {
        const styleMap = {
            realistic: "photorealistic, detailed textures, natural lighting",
            cartoon: "cartoon, bold outlines, simplified shapes, vibrant colors",
            "3d": "3D render, soft studio lighting, physically based materials",
            pixel: "2D pixel art, clean 1px outlines, 32-bit palette",
            "pixel art": "2D pixel art, clean 1px outlines, 32-bit palette",
            line: "clean vector line art, minimal shading",
            "line art": "clean vector line art, minimal shading",
            watercolor: "watercolor, soft edges, subtle gradients",
            comic: "comic book style, inked lines, halftone shading",
            clay: "clay render, soft shadows, subsurface scattering"
        };
        const selected = styleMap[(styleName || 'realistic').toString().toLowerCase()] || styleMap.realistic;
        return [
            "Create a clean, isolated cutout sticker of the subject with a fully transparent background.",
            `Subject: ${userPrompt}.`,
            `Visual style: ${selected}.`,
            "Requirements: no background or backdrop, no drop shadow, centered composition, crisp anti-aliased edges, high contrast, well-defined silhouette, square composition, suitable for compositing in design tools.",
            "Output specifics: PNG with alpha transparency, 1024x1024, medium quality."
        ].join(' ');
    };

    if ((mode || '').toLowerCase() === 'sticker') {
        // Generate transparent-background sticker images with gpt-image-1
        const stickerPrompt = buildStickerPrompt(prompt, style);

        const genResponse = await axios.post(
            'https://api.openai.com/v1/images/generations',
            {
                model: 'gpt-image-1',
                prompt: stickerPrompt,
                size: '1024x1024',
                background: 'transparent',
                quality: 'medium',
                n: 2
            },
            {
                headers: {
                    Authorization: `Bearer ${data.Parameter.Value}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const promises = genResponse.data.data.map(async (imageItem) => {
            const image_base64 = imageItem.b64_json;
            const imageBuffer = Buffer.from(image_base64, 'base64');
            const fileName = `${uuid.v4()}.png`;
            const s3Params = {
                Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
                Key: `public/${fileName}`,
                Body: imageBuffer,
                ContentType: 'image/png',
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

        return;
    }

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

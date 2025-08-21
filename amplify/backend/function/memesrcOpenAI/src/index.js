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

    const { magicResultId, imageKey, maskKey, prompt, size, input_fidelity } = event;

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

    const headers = {
        'Authorization': `Bearer ${data.Parameter.Value}`,
        // Remaining form headers will be added per request
    };

    const buildFormData = (desiredSize, fidelity) => {
        let fd = new FormData();
        fd.append('image', image_data, {
            filename: 'image.png',
            contentType: 'image/png',
        });
        fd.append('mask', mask_data, {
            filename: 'mask.png',
            contentType: 'image/png',
        });
        fd.append('prompt', prompt);
        fd.append('n', 2);
        fd.append('size', desiredSize || "1024x1024");
        if (fidelity) {
            fd.append('input_fidelity', fidelity);
        }
        return fd;
    };

    // Old original square method (2 variations)
    const formOld = buildFormData("1024x1024", null);

    // New and improved method (2 variations)
    const formNew = buildFormData(size || "1024x1024", input_fidelity);

    // Run both OpenAI edit requests in parallel
    const [responseOld, responseNew] = await Promise.all([
        makeRequest(formOld, { ...headers, ...formOld.getHeaders() }),
        makeRequest(formNew, { ...headers, ...formNew.getHeaders() })
    ]);

    const saveResponses = async (response, isImproved) => {
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

            const baseUrl = `https://i-${process.env.ENV}.memesrc.com/${fileName}`;
            return isImproved ? `${baseUrl}?variant=improved` : baseUrl;
        });
        return Promise.all(promises);
    };

    // Save both sets of images to S3 in parallel
    const [oldUrls, newUrls] = await Promise.all([
        saveResponses(responseOld, false),
        saveResponses(responseNew, true)
    ]);
    const cdnImageUrls = [...oldUrls, ...newUrls];

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

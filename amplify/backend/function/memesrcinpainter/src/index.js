/* Amplify Params - DO NOT EDIT
	API_MEMESRC_GRAPHQLAPIIDOUTPUT
	API_MEMESRC_MAGICRESULTTABLE_ARN
	API_MEMESRC_MAGICRESULTTABLE_NAME
	ENV
	FUNCTION_MEMESRCOPENAI_NAME
	FUNCTION_MEMESRCUSERFUNCTION_NAME
	REGION
	STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT *//*
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
ENV
FUNCTION_MEMESRCUSERFUNCTION_NAME
REGION
Amplify Params - DO NOT EDIT */

const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const uuid = require('uuid');

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    const lambdaClient = new LambdaClient({ region: "us-east-1" });
    const dynamoClient = new DynamoDBClient({ region: "us-east-1" });
    const s3Client = new S3Client({ region: "us-east-1" });

    const userSub = (event.requestContext?.identity?.cognitoAuthenticationProvider) ? event.requestContext.identity.cognitoAuthenticationProvider.split(':').slice(-1) : '';

    const body = JSON.parse(event.body);
    const prompt = body.prompt;

    // Upload images to S3
    const imageKey = `tmp/${uuid.v4()}.png`;
    const maskKey = `tmp/${uuid.v4()}.png`;

    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
        Key: imageKey,
        Body: Buffer.from(body.image.split(",")[1], 'base64'),
        ContentType: 'image/png',
    }));

    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
        Key: maskKey,
        Body: Buffer.from(body.mask.split(",")[1], 'base64'),
        ContentType: 'image/png',
    }));

    // Create the DynamoDB record
    const dynamoRecord = {
        "id": { S: uuid.v4() },
        "createdAt": { S: new Date().toISOString() },
        "magicResultUserId": { S: userSub[0] },
        "prompt": { S: prompt },
        "updatedAt": { S: new Date().toISOString() },
        "__typename": { S: "MagicResult" }
    };

    await dynamoClient.send(new PutItemCommand({
        TableName: process.env.API_MEMESRC_MAGICRESULTTABLE_NAME,
        Item: dynamoRecord
    }));

    // Invoke the OpenAI processing Lambda asynchronously
    await lambdaClient.send(new InvokeCommand({
        FunctionName: process.env.FUNCTION_MEMESRCOPENAI_NAME,
        InvocationType: "Event",
        Payload: JSON.stringify({ 
            magicResultId: dynamoRecord.id.S,
            imageKey,
            maskKey,
            prompt
        })
    }));

    // Return the new MagicResult id
    return {
        statusCode: 200,
        body: JSON.stringify({
            magicResultId: dynamoRecord.id.S
        }),
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
        },
    };
};

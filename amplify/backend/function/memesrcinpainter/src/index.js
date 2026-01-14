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
const { TextDecoder } = require('util');
const uuid = require('uuid');

const MAX_REFERENCE_IMAGES = 4;

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    const lambdaClient = new LambdaClient({ region: "us-east-1" });
    const dynamoClient = new DynamoDBClient({ region: "us-east-1" });
    const s3Client = new S3Client({ region: "us-east-1" });

    const userAuthProvider = event.requestContext?.identity?.cognitoAuthenticationProvider || '';
    const userSub = userAuthProvider ? userAuthProvider.split(':').pop() : '';
    const body = JSON.parse(event.body);
    const prompt = body.prompt;
    const hasMask = Boolean(body.mask);
    const references = Array.isArray(body.references) ? body.references.filter((src) => typeof src === 'string' && src) : [];

    console.log(JSON.stringify(process.env))

    const ensureCreditsAvailable = async () => {
        if (!process.env.FUNCTION_MEMESRCUSERFUNCTION_NAME) {
            throw Object.assign(new Error('User function not configured'), { code: 'UserFunctionMissing' });
        }
        const payload = {
            path: `/${process.env.ENV}/public/user/get`,
            requestContext: userAuthProvider ? { identity: { cognitoAuthenticationProvider: userAuthProvider } } : undefined,
        };
        const userDetailsResult = await lambdaClient.send(new InvokeCommand({
            FunctionName: process.env.FUNCTION_MEMESRCUSERFUNCTION_NAME,
            Payload: Buffer.from(JSON.stringify(payload)),
        }));
        const userDetailsString = userDetailsResult.Payload ? new TextDecoder().decode(userDetailsResult.Payload) : '{}';
        const userDetails = userDetailsString ? JSON.parse(userDetailsString) : {};
        const userDetailsBody = typeof userDetails.body === 'string' ? JSON.parse(userDetails.body) : userDetails.body;
        const credits = userDetailsBody?.data?.getUserDetails?.credits;
        if (!Number.isFinite(credits)) {
            throw Object.assign(new Error('Unable to determine credit balance'), { code: 'CreditLookupFailed' });
        }
        if (credits < 1) {
            throw Object.assign(new Error('Insufficient credits'), { code: 'InsufficientCredits' });
        }
        return credits;
    };

    let preCredits;
    try {
        preCredits = await ensureCreditsAvailable();
    } catch (err) {
        return {
            statusCode: 403,
            body: JSON.stringify({
                error: {
                    name: err?.code || 'InsufficientCredits',
                    message: err?.message || 'Insufficient credits'
                }
            }),
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "true",
            },
        };
    }

    // Upload image inputs to S3 (mask optional)
    const imageKey = `tmp/${uuid.v4()}.png`;
    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
        Key: imageKey,
        Body: Buffer.from(String(body.image).split(",")[1] || '', 'base64'),
        ContentType: 'image/png',
    }));

    const referenceKeys = [];
    if (!hasMask && references.length) {
        const referencesToUpload = references.slice(0, MAX_REFERENCE_IMAGES);
        for (const ref of referencesToUpload) {
            const key = `tmp/${uuid.v4()}.png`;
            await s3Client.send(new PutObjectCommand({
                Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
                Key: key,
                Body: Buffer.from(String(ref).split(",")[1] || '', 'base64'),
                ContentType: 'image/png',
            }));
            referenceKeys.push(key);
        }
    }

    let maskKey = undefined;
    if (hasMask) {
        maskKey = `tmp/${uuid.v4()}.png`;
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
            Key: maskKey,
            Body: Buffer.from(String(body.mask).split(",")[1] || '', 'base64'),
            ContentType: 'image/png',
        }));
    }

    // Create the DynamoDB record for MagicResult
    const dynamoRecord = {
        "id": { S: uuid.v4() },
        "createdAt": { S: new Date().toISOString() },
        "magicResultUserId": { S: userSub },
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
            // Only include maskKey if present; background will branch accordingly
            ...(maskKey ? { maskKey } : {}),
            ...(referenceKeys.length ? { referenceKeys } : {}),
            prompt,
            userSub
        })
    }));

    // Return the new MagicResult id and the user's updated credit balance
    return {
        statusCode: 200,
        body: JSON.stringify({
            magicResultId: dynamoRecord.id.S,
            // Include an expected credit balance so the frontend can update immediately
            credits: typeof preCredits === 'number' ? Math.max(0, preCredits - 1) : undefined
        }),
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
        },
    };
};

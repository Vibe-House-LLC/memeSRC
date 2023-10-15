/* Amplify Params - DO NOT EDIT
	API_MEMESRC_GRAPHQLAPIIDOUTPUT
	API_MEMESRC_MAGICRESULTTABLE_ARN
	API_MEMESRC_MAGICRESULTTABLE_NAME
	ENV
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

const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient, PutItemCommand, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const uuid = require('uuid');
const axios = require('axios');
const FormData = require('form-data');
const { Buffer } = require('buffer');

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    const lambdaClient = new LambdaClient({ region: "us-east-1" });
    const ssmClient = new SSMClient({ region: "us-east-1" });
    const s3Client = new S3Client({ region: "us-east-1" });
    const dynamoClient = new DynamoDBClient({ region: "us-east-1" });

    const userSub = (event.requestContext?.identity?.cognitoAuthenticationProvider) ? event.requestContext.identity.cognitoAuthenticationProvider.split(':').slice(-1) : '';

    const invokeRequest = {
        FunctionName: process.env.FUNCTION_MEMESRCUSERFUNCTION_NAME,
        Payload: JSON.stringify({
            subId: userSub[0],
            path: `/${process.env.ENV}/public/user/spendCredits`,
            numCredits: 1
        }),
    };

    const userDetailsResult = await lambdaClient.send(new InvokeCommand(invokeRequest));
    const userDetailsString = new TextDecoder().decode(userDetailsResult.Payload);
    const userDetails = JSON.parse(userDetailsString);
    const userDetailsBody = JSON.parse(userDetails.body);
    const credits = userDetailsBody?.data?.getUserDetails?.credits;

    if (!credits) {
        return {
            statusCode: 403,
            body: JSON.stringify({
                error: {
                    name: "InsufficientCredits",
                    message: "Insufficient credits"
                }
            }),
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "true",
            },
        };
    }

    const body = JSON.parse(event.body);
    const prompt = body.prompt;

    // Create the DynamoDB record immediately after checking credits
    const dynamoRecord = {
        "id": { S: uuid.v4() },
        "createdAt": { S: new Date().toISOString() },
        "magicResultUserId": { S: userSub[0] },
        "prompt": { S: prompt },
        "source": { S: "your-source-here" },
        "status": { S: "pending" },
        "updatedAt": { S: new Date().toISOString() },
        "__typename": { S: "MagicResult" }
    };

    await dynamoClient.send(new PutItemCommand({
        TableName: process.env.API_MEMESRC_MAGICRESULTTABLE_NAME,
        Item: dynamoRecord
    }));

    const command = new GetParameterCommand({ Name: process.env.openai_apikey, WithDecryption: true });
    const data = await ssmClient.send(command);

    const image_data = Buffer.from(body.image.split(",")[1], 'base64');
    const mask_data = Buffer.from(body.mask.split(",")[1], 'base64');

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

    const response = await axios.post('https://api.openai.com/v1/images/edits', formData, { headers });

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
            "id": dynamoRecord.id
        },
        UpdateExpression: "set results = :results, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
            ":results": { S: JSON.stringify(cdnImageUrls) },
            ":updatedAt": { S: new Date().toISOString() }
        }
    }));

    return {
        statusCode: 200,
        body: JSON.stringify({
            imageUrls: cdnImageUrls
        }),
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": "true",
        },
    };
};

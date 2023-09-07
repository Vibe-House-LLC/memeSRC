/* Amplify Params - DO NOT EDIT
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
const uuid = require('uuid');
const axios = require('axios');
const FormData = require('form-data');
const { Buffer } = require('buffer');

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    // Create a new Lambda client
    const lambdaClient = new LambdaClient({ region: "us-east-1" });

    // Get user sub
    const userSub = (event.requestContext?.identity?.cognitoAuthenticationProvider) ? event.requestContext.identity.cognitoAuthenticationProvider.split(':').slice(-1) : '';

    // Create the request object to invoke the user details function
    const invokeRequest = {
        FunctionName: process.env.FUNCTION_MEMESRCUSERFUNCTION_NAME,
        Payload: JSON.stringify({
            // username: "Some Username"
            // or alternatively
            subId: userSub[0],
            path: `/${process.env.ENV}/public/user/spendCredits`,
            numCredits: 1
        }),
    };

    // Invoke the user details function and wait for the result
    const userDetailsResult = await lambdaClient.send(new InvokeCommand(invokeRequest));

    // Convert the Uint8Array to a string
    const userDetailsString = new TextDecoder().decode(userDetailsResult.Payload);

    // Parse the result of the user details function
    console.log(userDetailsString);
    const userDetails = JSON.parse(userDetailsString);

    console.log(userDetails)

    // Check the user's credits
    console.log(userDetails)
    const userDetailsBody = JSON.parse(userDetails.body)
    console.log(userDetailsBody)
    const credits = userDetailsBody?.data?.getUserDetails?.credits;
    console.log('credits', credits)
    if (!credits) {
        console.log('User Does Not Have Enough Credits')
        return {
            statusCode: 403, // Forbidden
            body: JSON.stringify({
                error: {
                    name: "InsufficientCredits",
                    message: "Insufficient credits"
                }
            }),
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", // CORS requirement
                "Access-Control-Allow-Credentials": "true", // Required for cookies, authorization headers with HTTPS
            },
        };
    }
    console.log('Made it past the credit check')

    // Create a new SSM client
    const ssmClient = new SSMClient({ region: "us-east-1" });

    // Command to get parameter
    const command = new GetParameterCommand({ Name: process.env.openai_apikey, WithDecryption: true });

    // Retrieve configured secrets from SSM
    const data = await ssmClient.send(command);

    // Parse input
    const body = JSON.parse(event.body);
    const image_data = Buffer.from(body.image.split(",")[1], 'base64');
    const mask_data = Buffer.from(body.mask.split(",")[1], 'base64');
    const prompt = body.prompt;

    console.log('test')

    // Prepare the form data
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
    formData.append('n', 1);
    formData.append('size', "1024x1024");

    // Prepare the headers
    const headers = {
        'Authorization': `Bearer ${data.Parameter.Value}`,
        ...formData.getHeaders()
    };

    // Send the request
    const response = await axios.post('https://api.openai.com/v1/images/edits', formData, { headers });

    // Set up the S3 client
    const s3Client = new S3Client({ region: "us-east-1" });

    // This will be our collection of promises
    const promises = response.data.data.map(async (imageItem) => {
        const image_url = imageItem.url;
        console.log(image_url);

        // Download the image from the URL
        const imageResponse = await axios({
            method: 'get',
            url: image_url,
            responseType: 'arraybuffer'
        });

        // Image buffer
        const imageBuffer = Buffer.from(imageResponse.data, 'binary');

        // Define a unique filename using a UUID
        const fileName = `${uuid.v4()}.jpeg`;

        // Define the S3 upload parameters with the `/public` directory
        const s3Params = {
            Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
            Key: `public/${fileName}`,
            Body: imageBuffer,
            ContentType: 'image/jpeg',
        };

        // Upload the image to S3
        const uploadCommand = new PutObjectCommand(s3Params);
        await s3Client.send(uploadCommand);


        // Construct the public URL for the uploaded image based on your CDN setup
        return `https://i-${process.env.ENV}.memesrc.com/${fileName}`;
    });

    // Wait for all promises to resolve
    const cdnImageUrls = await Promise.all(promises);

    // Formulate response
    const res = {
        statusCode: 200,
        body: JSON.stringify({
            imageUrls: cdnImageUrls // Return the array of CDN URLs of the uploaded images
        }),
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*", // CORS requirement
            "Access-Control-Allow-Credentials": "true", // Required for cookies, authorization headers with HTTPS
        },
    };

    return res;
};

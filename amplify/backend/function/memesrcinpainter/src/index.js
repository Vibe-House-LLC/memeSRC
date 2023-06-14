/* Amplify Params - DO NOT EDIT
ENV
FUNCTION_MEMESRCUSERFUNCTION_NAME
REGION
Amplify Params - DO NOT EDIT */

const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
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
            path: `/${process.env.ENV}/public/user/get`
        }),
    };

    // Invoke the user details function and wait for the result
    const userDetailsResult = await lambdaClient.send(new InvokeCommand(invokeRequest));

    // Convert the Uint8Array to a string
    const userDetailsString = new TextDecoder().decode(userDetailsResult.Payload);

    // Parse the result of the user details function
    console.log(userDetailsString);
    const userDetails = JSON.parse(userDetailsString);

    // Check the user's credits
    const credits = userDetails.body.data.getUserDetails.credits; // The path might be different depending on your GraphQL schema

    if (credits <= 0) {
        return {
            statusCode: 403, // Forbidden
            body: JSON.stringify({
                message: "Insufficient credits"
            }),
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", // CORS requirement
                "Access-Control-Allow-Credentials": "true", // Required for cookies, authorization headers with HTTPS
            },
        };
    }

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

    const image_url = response.data.data[0].url;
    console.log(image_url);
    // const image_url = "https://memesrc.com/test-gen.png"

    // Download the image from the URL
    const imageResponse = await axios({
        method: 'get',
        url: image_url,
        responseType: 'arraybuffer'
    });

    // Convert image data to base64 string
    const base64Image = Buffer.from(imageResponse.data, 'binary').toString('base64');

    // Formulate response
    const res = {
        statusCode: 200,
        body: JSON.stringify({
            imageData: `data:image/jpeg;base64,${base64Image}`
        }),
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*", // CORS requirement
            "Access-Control-Allow-Credentials": "true", // Required for cookies, authorization headers with HTTPS
        },
    };

    return res;
};

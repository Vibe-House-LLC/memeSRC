const { SSMClient, GetParameterCommand } = require("@aws-sdk/client-ssm");
const axios = require('axios');
const FormData = require('form-data');
const { Buffer } = require('buffer');

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
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

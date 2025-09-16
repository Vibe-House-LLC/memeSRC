/* Amplify Params - DO NOT EDIT
	ENV
	FUNCTION_MEMESRCINDEXANDPUBLISH_NAME
	REGION
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const AWS = require('aws-sdk');
const lambda = new AWS.Lambda();

exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);

    try {
        const params = {
            FunctionName: process.env.FUNCTION_MEMESRCINDEXANDPUBLISH_NAME,
            InvocationType: 'Event',
            Payload: JSON.stringify(event)
        };
        const result = await lambda.invoke(params).promise();
        console.log('Invoked memesrcIndexAndPublish:', JSON.stringify(result));
    } catch (error) {
        console.error('Error invoking memesrcIndexAndPublish:', error);
        return {
            statusCode: 500,
        //  Uncomment below to enable CORS requests
         headers: {
             "Access-Control-Allow-Origin": "*",
             "Access-Control-Allow-Headers": "*"
         },
            body: JSON.stringify('Failed to trigger indexing'),
        };
    }

    return {
        statusCode: 202,
    //  Uncomment below to enable CORS requests
     headers: {
         "Access-Control-Allow-Origin": "*",
         "Access-Control-Allow-Headers": "*"
     },
        body: JSON.stringify('Indexing triggered'),
    };
};

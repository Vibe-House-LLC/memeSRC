/* Amplify Params - DO NOT EDIT
	ENV
	FUNCTION_MEMESRCUPDATEMEDIA_NAME
	REGION
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const AWS = require('aws-sdk');
const lambda = new AWS.Lambda({ region: process.env.REGION });

exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    
    try {
        // Prepare parameters for invoking memesrcUpdateMedia function
        const params = {
            FunctionName: process.env.FUNCTION_MEMESRCUPDATEMEDIA_NAME,
            InvocationType: 'Event', // Async invocation
            Payload: JSON.stringify(event) // Forward the event as received
        };

        console.log(`Invoking memesrcUpdateMedia function with payload: ${JSON.stringify(event)}`);
        
        // Invoke the memesrcUpdateMedia function asynchronously
        await lambda.invoke(params).promise();
        
        console.log('memesrcUpdateMedia function invoked successfully');
        
        return {
            statusCode: 200,
            //  Uncomment below to enable CORS requests
             headers: {
                 "Access-Control-Allow-Origin": "*",
                 "Access-Control-Allow-Headers": "*"
             },
            body: JSON.stringify('Media approval processed successfully'),
        };
    } catch (error) {
        console.error('Error invoking memesrcUpdateMedia function:', error);
        
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*"
            },
            body: JSON.stringify({
                error: 'Failed to process media approval',
                message: error.message
            }),
        };
    }
};

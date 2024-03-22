/* Amplify Params - DO NOT EDIT
	ENV
	FUNCTION_MEMESRCOPENSEARCH_NAME
	REGION
Amplify Params - DO NOT EDIT */

const aws = require('aws-sdk');

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);

    const inputArg = event.queryStringParameters.index;

    const lambda = new aws.Lambda({ region: process.env.REGION });
    const params = {
        FunctionName: process.env.FUNCTION_MEMESRCOPENSEARCH_NAME,
        InvocationType: 'Event',
        Payload: JSON.stringify({ index: inputArg }),
    };

    try {
        await lambda.invoke(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'CSV indexing job started' }),
        };
    } catch (error) {
        console.error('Error starting CSV indexing job:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An error occurred while starting the CSV indexing job' }),
        };
    }
};

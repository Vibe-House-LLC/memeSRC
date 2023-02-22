/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const uuid = require('uuid');

exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(uuid.v4())
    };
};

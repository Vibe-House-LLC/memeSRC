/* Amplify Params - DO NOT EDIT
	AUTH_MEMESRCC3C71449_USERPOOLID
	ENV
	REGION
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const AWS = require('aws-sdk');
AWS.config.region = 'us-east-1';

const identity = new AWS.CognitoIdentityServiceProvider();

exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);

    if (event.email) {
        console.log(process.env.AUTH_MEMESRCC3C71449_USERPOOLID)
        const { email } = event.email
        const userParams = {
            UserPoolId: process.env.AUTH_MEMESRCC3C71449_USERPOOLID,
            AttributesToGet: ['email'],
            Filter: `email = \"${email}\"`,
            Limit: 60,
        };
        try {
            const { Users } = await identity.listUsers(userParams).promise();
            console.log({ Users })
            if (Users && Users.length > 0) {
                console.log(JSON.stringify(Users))
            } else {
                console.log("NOTHING FOUND")
            }
        } catch (error) {
            console.log({ error }, JSON.stringify(error))
            // callback({ error }, null);
        }
    } else {
        callback('MissingParameters', null);
    }

    return {
        statusCode: 200,
    //  Uncomment below to enable CORS requests
    //  headers: {
    //      "Access-Control-Allow-Origin": "*",
    //      "Access-Control-Allow-Headers": "*"
    //  },
        body: JSON.stringify('Hello from Lambda!'),
    };
};

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

async function listAllUsers(userParams) {
    let users = [];
    let paginationToken = null;

    do {
        if (paginationToken) {
            userParams.PaginationToken = paginationToken;
        }

        const { Users, PaginationToken } = await identity.listUsers(userParams).promise();
        users = users.concat(Users);
        paginationToken = PaginationToken;
        console.log("Pulled another page")
    } while (paginationToken);

    return users;
}

exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    const email = event["email"]

    if (event.email) {
        console.log(process.env.AUTH_MEMESRCC3C71449_USERPOOLID);
        console.log(`email = \"${email}\"`)
        const userParams = {
            UserPoolId: process.env.AUTH_MEMESRCC3C71449_USERPOOLID,
            AttributesToGet: ['email'],
            Filter: `email = \"${email}\"`,
            Limit: 60,
        };

        try {
            const filteredUsers = await listAllUsers(userParams);

            if (filteredUsers.length > 0) {
                console.log(JSON.stringify(filteredUsers));
            } else {
                console.log("No users found with the provided email.");
            }
        } catch (error) {
            console.log({ error }, JSON.stringify(error));
            // callback({ error }, null);
        }
    } else {
        console.log('FAILED: MissingParameters');
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

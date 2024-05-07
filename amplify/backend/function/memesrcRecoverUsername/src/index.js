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
        console.log("Pulled another page");
    } while (paginationToken);

    return users;
}

exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    const email = event["email"];

    if (email) {
        console.log(process.env.AUTH_MEMESRCC3C71449_USERPOOLID);
        console.log(`email = \"${email}\"`);
        const userParams = {
            UserPoolId: process.env.AUTH_MEMESRCC3C71449_USERPOOLID,
            AttributesToGet: ['email'],
            Filter: `email = \"${email}\"`,
            Limit: 60,
        };

        try {
            const filteredUsers = await listAllUsers(userParams);

            if (filteredUsers.length > 0) {
                // Sort the users by the creation date in ascending order
                filteredUsers.sort((a, b) => new Date(a.UserCreateDate) - new Date(b.UserCreateDate));
                const userList = filteredUsers.map(user => ({
                    Username: user.Username,
                    UserCreateDate: user.UserCreateDate
                }));
                console.log(JSON.stringify(userList, null, 2));
            } else {
                console.log("No users found with the provided email.");
            }
        } catch (error) {
            console.log({ error }, JSON.stringify(error));
        }
    } else {
        console.log('FAILED: MissingParameters');
    }

    return {
        statusCode: 200,
        body: JSON.stringify('Hello from Lambda!'),
    };
};

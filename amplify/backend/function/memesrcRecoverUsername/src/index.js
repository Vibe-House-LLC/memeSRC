/* Amplify Params - DO NOT EDIT
	AUTH_MEMESRCC3C71449_USERPOOLID
	ENV
	REGION
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const AWS = require('aws-sdk');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const region = 'us-east-1';
const identity = new AWS.CognitoIdentityServiceProvider();
const sesClient = new SESClient({ region });

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

async function sendEmail(toAddress, subject, body) {
    const params = {
        Destination: {
            ToAddresses: [toAddress],
        },
        Message: {
            Body: {
                Text: {
                    Data: body,
                },
            },
            Subject: {
                Data: subject,
            },
        },
        Source: 'memeSRC <no-reply@memesrc.com>',
    };

    await sesClient.send(new SendEmailCommand(params));
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
                const userList = filteredUsers.map(user => user.Username);

                // Create the email body with the list of usernames
                const emailBody = `Your memeSRC username${userList.length > 0 ? 's' : ''}:\n\n • ${userList.join('\n • ')}\n\n`;

                // Send the email
                await sendEmail(email, 'Username Recovery (memeSRC)', emailBody);
                console.log(`Email sent to ${email}`);
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
        body: JSON.stringify('Email sent successfully'),
    };
};

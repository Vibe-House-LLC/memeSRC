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
        Source: 'no-reply@memesrc.com', // Replace with your verified SES email address
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
                const userList = filteredUsers.map(user => ({
                    Username: user.Username,
                    UserCreateDate: user.UserCreateDate
                }));
                console.log(JSON.stringify(userList, null, 2));

                // Create the email body with the list of usernames
                const emailBody = `Here are the usernames associated with your email address:\n\n${userList.map(user => `- ${user.Username} (Created on: ${user.UserCreateDate})`).join('\n')}`;

                // Send the email
                await sendEmail(email, 'Your Usernames', emailBody);
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

/* Amplify Params - DO NOT EDIT
	API_MEMESRC_GRAPHQLAPIIDOUTPUT
	API_MEMESRC_USAGEEVENTTABLE_ARN
	API_MEMESRC_USAGEEVENTTABLE_NAME
	AUTH_MEMESRCC3C71449_USERPOOLID
	ENV
	REGION
Amplify Params - DO NOT EDIT */

const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const AWS = require('aws-sdk');
const { randomUUID } = require('crypto');
  
/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    const region = process.env.REGION || "us-east-1";
    const dynamoClient = new DynamoDBClient({ region });
    const identity = new AWS.CognitoIdentityServiceProvider({ region });
    const userAuthProvider = event.requestContext?.identity?.cognitoAuthenticationProvider || '';
    const userSub = userAuthProvider ? userAuthProvider.split(':').pop() : '';
    let body = {};

    try {
        body = event?.body ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) : {};
    } catch (parseError) {
        console.log('Failed to parse request body', parseError);
        return {
            statusCode: 400,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*"
            },
            body: JSON.stringify({ message: 'Invalid request body' }),
        };
    }

    if (!body?.eventType) {
        return {
            statusCode: 400,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*"
            },
            body: JSON.stringify({ message: 'Missing required field: eventType' }),
        };
    }

    let username = '';

    if (userSub) {
        try {
            const userParams = {
                UserPoolId: process.env.AUTH_MEMESRCC3C71449_USERPOOLID,
                Filter: `sub = \"${userSub}\"`,
                Limit: 1,
            };
            const { Users } = await identity.listUsers(userParams).promise();
            username = Users && Users.length ? Users[0].Username : '';
        } catch (error) {
            console.log('Failed to fetch Cognito username', error);
        }
    }

    const normalizedEventData = (() => {
        if (body.eventData === undefined || body.eventData === null || body.eventData === '') {
            return null;
        }

        if (typeof body.eventData === 'string') {
            return body.eventData;
        }

        try {
            return JSON.stringify(body.eventData);
        } catch (error) {
            return String(body.eventData);
        }
    })();

    const identityId = username ? `${userSub}::${username}` : (body.identityId || '');
    const now = new Date().toISOString();
    const maxAttempts = 3;
    let usageEventId = '';

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const candidateId = typeof randomUUID === 'function' ? randomUUID() : AWS.util.uuid.v4();
        const dynamoRecord = {
            id: { S: candidateId },
            eventType: { S: String(body.eventType) },
            createdAt: { S: now },
            updatedAt: { S: now },
            __typename: { S: "UsageEvent" },
        };

        if (identityId) {
            dynamoRecord.identityId = { S: identityId };
        }

        if (normalizedEventData) {
            dynamoRecord.eventData = { S: normalizedEventData };
        }

        if (body.sessionId) {
            dynamoRecord.sessionId = { S: String(body.sessionId) };
        }

        try {
            await dynamoClient.send(new PutItemCommand({
                TableName: process.env.API_MEMESRC_USAGEEVENTTABLE_NAME,
                Item: dynamoRecord,
                ConditionExpression: "attribute_not_exists(id)"
            }));
            usageEventId = candidateId;
            break;
        } catch (error) {
            if (error && error.name === 'ConditionalCheckFailedException') {
                if (attempt === maxAttempts - 1) {
                    throw error;
                }
                continue;
            }
            throw error;
        }
    }

    if (!usageEventId) {
        throw new Error('Failed to create usage event id');
    }

    // The structure that'll be sent in the body is:
    // {
    //     "eventData": "{\"searchTerm\":\"This is a quick test\",\"resolvedIndex\":\"_universal\",\"index\":\"_universal\",\"source\":\"HomePage\"}",
    //     "eventType": "search",
    //     "identityId": "noauth-dZsK_k6S5wrX",
    //     "sessionId": "sess-7U7jANyuQ-He"
    // }
    // We need to add the createdAt and updatedAt fields with the current timestamp in ISO format
    // If a username is found, replace the identityId with the username
    // If no username is found, keep the identityId as is
    // Finally, the function should just return { id: 'id_from_dynamodb' }


    return {
        statusCode: 200,
    //  Uncomment below to enable CORS requests
     headers: {
         "Access-Control-Allow-Origin": "*",
         "Access-Control-Allow-Headers": "*"
     },
        body: JSON.stringify({ id: usageEventId }),
    };
};

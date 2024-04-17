/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
const AWS = require('aws-sdk');
AWS.config.region = 'us-east-1';

const identity = new AWS.CognitoIdentityServiceProvider();

exports.handler = async (event, context, callback) => {
  if (event.request.userAttributes.email) {
    const { email } = event.request.userAttributes
    const userParams = {
      UserPoolId: event.userPoolId,
      AttributesToGet: ['email'],
      Filter: `email = \"${email}\"`,
      Limit: 1,
    };
    try {
      const { Users } = await identity.listUsers(userParams).promise();
      console.log({ Users })
      if (Users && Users.length > 0) {
        callback('EmailExistsException', null);
      } else {
        callback(null, event);
      }
    } catch (error) {
      console.log({ error }, JSON.stringify(error))
      callback({ error }, null);
    }
  } else {
    callback('MissingParameters', null);
  }
};

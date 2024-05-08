/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
const AWS = require('aws-sdk');
AWS.config.region = 'us-east-1';

const identity = new AWS.CognitoIdentityServiceProvider();

exports.handler = async (event, context, callback) => {

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
    } while (paginationToken);

    return users;
  }

  if (event.request.userAttributes.email) {
    const { email } = event.request.userAttributes
    const userParams = {
      UserPoolId: event.userPoolId,
      AttributesToGet: ['email'],
      Filter: `email = \"${email}\"`,
      Limit: 60,
    };
    try {
      const Users = await listAllUsers(userParams)
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

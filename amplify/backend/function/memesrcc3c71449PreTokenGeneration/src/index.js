/* Amplify Params - DO NOT EDIT
  API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT
  API_MEMESRC_GRAPHQLAPIIDOUTPUT
  API_MEMESRC_GRAPHQLAPIKEYOUTPUT
  ENV
  REGION
  STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT *//**
 * @fileoverview
 *
 * This CloudFormation Trigger creates a handler which awaits the other handlers
 * specified in the `MODULES` env var, located at `./${MODULE}`.
 */

/**
 * The names of modules to load are stored as a comma-delimited string in the
 * `MODULES` env var.
 */
const moduleNames = process.env.MODULES.split(',');
/**
 * The array of imported modules.
 */
const modules = moduleNames.map((name) => require(`./${name}`));

/**
 * This async handler iterates over the given modules and awaits them.
 *
 * @see https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html#nodejs-handler-async
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 *
 */

const { makeGraphQLRequest } = require('/opt/graphql-handler');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event, context) => {
  console.log('EVENT: ', JSON.stringify(event))

  await Promise.all(modules.map((module) => module.handler(event, context)));

  const subId = event?.request?.userAttributes?.sub;
  const avatar = event?.request?.userAttributes?.picture;

  if (!subId) {
    return event;
  }

  const getUserQuery = `
    query {
      getUserDetails(id: "${subId}") {
        createdAt
        email
        id
        stripeId
        username
        updatedAt
        status
        earlyAccessStatus
        contributorAccessStatus
        magicSubscription
        subscriptionStatus
        userNotifications(sortDirection: DESC) {
          items {
            avatar
            createdAt
            description
            id
            isUnRead
            title
            type
            path
          }
        }
        credits
        favorites
      }
    }
  `

  try {
    const userDetails = await makeGraphQLRequest({ query: getUserQuery });

    if (userDetails?.body?.data?.getUserDetails) {
      event.response = {
        claimsOverrideDetails: {
          claimsToAddOrOverride: {
            ...userDetails.body.data.getUserDetails,
          }
        },
      };
    }
  } catch (error) {
    console.log('ERROR: ', error);
    return event;
  }

  return event;
};


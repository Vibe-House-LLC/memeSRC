/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["stripeKey"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  })
  .promise();

Parameters will be of the form { Name: 'secretName', Value: 'secretValue', ... }[]
*/
/* Amplify Params - DO NOT EDIT
  API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT
  API_MEMESRC_GRAPHQLAPIIDOUTPUT
  API_MEMESRC_GRAPHQLAPIKEYOUTPUT
  ENV
  REGION
Amplify Params - DO NOT EDIT */

import crypto from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { SSM, GetParametersCommand } from '@aws-sdk/client-ssm';
import { default as fetch, Request } from 'node-fetch';
import Stripe from 'stripe';

const GRAPHQL_ENDPOINT = process.env.API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const { Sha256 } = crypto;

function createUserDetails(params) {
  const email = params.email ? `email: "${params.email}",` : '';
  const username = params.username ? `username: "${params.username.toLowerCase()}",` : '';
  const stripeId = params.email ? `stripeId: "${params.stripeId}",` : '';
  const sub = params.sub ? `id: "${params.sub}",` : '';
  const status = params.status ? `status: "${params.status}",` : '';

  const query = `
      mutation createUserDetails {
          createUserDetails(input: {${email}${username}${stripeId}${sub}${status}}) {
              id
              email
              createdAt
              stripeId
              username
              updatedAt
              status
          }
      }
  `;

  return query;
}

async function getAllVotes(seriesId) {
  let id = seriesId ? `totalVotes-${seriesId}` : "totalVotes";

  let query = `
    query GetAnalyticsMetrics {
      getAnalyticsMetrics(id: "${id}") {
        value
        updatedAt
      }
    }
  `;

  console.log(query);
  const response = await makeRequest(query);
  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to fetch votes. Status code: ${response.statusCode}. Errors: ${JSON.stringify(response.body.errors)}`
    );
  }

  const totalVotes = JSON.parse(response.body.data.getAnalyticsMetrics.value);

  return totalVotes;
}

async function processVotes({ allItems, userSub }) {
  const votesCount = {};
  const currentUserVotes = {};
  const votesCountUp = {};
  const votesCountDown = {};
  const currentUserVotesUp = {};
  const currentUserVotesDown = {};
  const lastUserVoteTimestamps = {};
  const lastBoostValue = {};
  const nextVoteTime = {};

  console.log(`allItems: ${JSON.stringify(allItems)}`)

  const seriesIds = new Set(allItems.map(item => item.seriesUserVoteSeriesId));
  const isLastUserVoteOlderThan24Hours = {};
  seriesIds.forEach(id => isLastUserVoteOlderThan24Hours[id] = true);

  allItems.forEach((vote) => {
    console.log(vote)
    if (vote.boost > 0) {
      currentUserVotesUp[vote.seriesUserVoteSeriesId] = (currentUserVotesUp[vote.seriesUserVoteSeriesId] || 0) + vote.boost;
    } else if (vote.boost < 0) {
      currentUserVotesDown[vote.seriesUserVoteSeriesId] = (currentUserVotesDown[vote.seriesUserVoteSeriesId] || 0) + vote.boost;
    }

    votesCount[vote.seriesUserVoteSeriesId] = (votesCount[vote.seriesUserVoteSeriesId] || 0) + vote.boost;

    currentUserVotes[vote.seriesUserVoteSeriesId] = (currentUserVotes[vote.seriesUserVoteSeriesId] || 0) + vote.boost;

    const voteTime = new Date(vote.createdAt);
    if (!lastUserVoteTimestamps[vote.seriesUserVoteSeriesId] || voteTime > lastUserVoteTimestamps[vote.seriesUserVoteSeriesId]) {
      lastUserVoteTimestamps[vote.seriesUserVoteSeriesId] = voteTime;
      lastBoostValue[vote.seriesUserVoteSeriesId] = vote.boost;
      const currentTime = new Date().getTime();
      const diffInHours = (currentTime - voteTime.getTime()) / (1000 * 60 * 60);
      isLastUserVoteOlderThan24Hours[vote.seriesUserVoteSeriesId] = diffInHours > 24;

      // calculate next vote time
      if (diffInHours < 24) {
        nextVoteTime[vote.seriesUserVoteSeriesId] = new Date(voteTime.getTime() + 24 * 60 * 60 * 1000).toISOString();
      } else {
        nextVoteTime[vote.seriesUserVoteSeriesId] = null;
      }
    }
  });

  return {
    allItems,
    votesCount,
    currentUserVotes,
    votesCountUp,
    votesCountDown,
    currentUserVotesUp,
    currentUserVotesDown,
    lastUserVoteTimestamps,
    isLastUserVoteOlderThan24Hours,
    lastBoostValue,
    nextVoteTime
  };
}

function updateUserDetailsCredits(params) {
  const id = params.id ? `id: "${params.id}",` : '';
  const credits = params.credits !== undefined ? `credits: ${params.credits},` : '';

  const mutation = `
    mutation updateUserDetails {
      updateUserDetails(input: {${id}${credits}}) {
        id
        credits
      }
    }
  `;

  return mutation;
}

function updateUserDetails(params) {
  const email = params.email ? `email: "${params.email}",` : '';
  const username = params.username ? `username: "${params.username.toLowerCase()}",` : '';
  const stripeId = params.email ? `stripeId: "${params.stripeId}",` : '';
  const sub = params.sub ? `id: "${params.sub}",` : '';
  const status = params.status ? `status: "${params.status}",` : '';

  const query = `
      mutation updateUserDetails {
          updateUserDetails(input: {${email}${username}${stripeId}${sub}${status}}) {
              createdAt
              email
              id
              stripeId
              username
              updatedAt
              status
          }
      }
  `;

  return query;
}

function getUserDetails(params, nextToken = null) {
  const limit = 1000;

  let innerQuery = '';

  if (params.username) {
    innerQuery = `
      listUserDetails(filter: {username: {eq: "${params.username.toLowerCase()}"}}) {
        items {
          updatedAt
          username
          stripeId
          id
          email
          createdAt
          status
          earlyAccessStatus
          contributorAccessStatus
          magicSubscription
          votes(limit: ${limit}${nextToken ? `, nextToken: "${nextToken}"` : ''}) {
            items {
              series { id }
              boost
              seriesUserVoteSeriesId
              createdAt
            }
            nextToken
          }
          credits
        }
      }
    `;
  } else if (params.subId) {
    innerQuery = `
      getUserDetails(id: "${params.subId}") {
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
        votes(limit: ${limit}${nextToken ? `, nextToken: "${nextToken}"` : ''}) {
          items {
            series { id }
            boost
            seriesUserVoteSeriesId
            createdAt
          }
          nextToken
        }
        credits
      }
    `;
  }

  const query = `
    query {
      ${innerQuery}
    }
  `;

  return query;
}

async function makeRequest(query) {
  const endpoint = new URL(GRAPHQL_ENDPOINT);

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region: AWS_REGION,
    service: 'appsync',
    sha256: Sha256,
  });

  const requestToBeSigned = new HttpRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      host: endpoint.host,
    },
    hostname: endpoint.host,
    body: JSON.stringify({ query }),
    path: endpoint.pathname,
  });

  const signed = await signer.sign(requestToBeSigned);
  const request = new Request(endpoint, signed);

  let statusCode = 200;
  let body;
  let response;

  try {
    response = await fetch(request);
    body = await response.json();
    if (body.errors) statusCode = 400;
  } catch (error) {
    statusCode = 500;
    body = {
      error: [
        {
          message: error.message,
        },
      ],
    };
  }

  return {
    statusCode,
    body,
  };
}

async function makeRequestWithVariables(query, passedVars = {}) {
  const endpoint = new URL(GRAPHQL_ENDPOINT);

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region: AWS_REGION,
    service: 'appsync',
    sha256: Sha256
  });

  const variables = passedVars;

  const requestToBeSigned = new HttpRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      host: endpoint.host
    },
    hostname: endpoint.host,
    body: JSON.stringify({ query, variables }), // Pass the query and variables
    path: endpoint.pathname
  });

  const signed = await signer.sign(requestToBeSigned);
  const request = new Request(endpoint, signed);

  let statusCode = 200;
  let body;
  let response;

  try {
    response = await fetch(request);
    body = await response.json();
    if (body.errors) statusCode = 400;
  } catch (error) {
    statusCode = 500;
    body = {
      errors: [
        {
          message: error.message
        }
      ]
    };
  }

  return {
    statusCode,
    body
  };
}

async function getAllUserVotes(params) {
  let allVotes = [];
  let nextToken = null;

  do {
    const query = getUserDetails(params, nextToken);
    const response = await makeRequest(query);

    console.log(`response: ${JSON.stringify(response)}`)

    // Depending on the structure of your response, you might need to adjust the following lines.
    const userDetails = response.body.data.getUserDetails;

    if (userDetails && userDetails.votes && userDetails.votes.items) {
      allVotes = allVotes.concat(userDetails.votes.items);
      nextToken = userDetails.votes.nextToken;
    }

  } while (nextToken);

  return allVotes;
}

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

export const handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);
  // Get the users sub (if it exist)
  const userSub = event.requestContext?.identity?.cognitoAuthenticationProvider
    ? event.requestContext.identity.cognitoAuthenticationProvider.split(':').pop()
    : '';
  // Grab the request body (if it exist)
  const body = event.body ? JSON.parse(event.body) : '';
  // Get the path
  const path = event.path;
  // Pull secrets from SSM
  const ssmClient = new SSM();
  const ssmParams = {
    Names: ['stripeKey'].map(secretName => process.env[secretName]),
    WithDecryption: true,
  };
  const { Parameters } = await ssmClient.send(new GetParametersCommand(ssmParams));


  const stripeKey = Parameters.find(param => param.Name === process.env['stripeKey']).Value;

  const stripe = new Stripe(stripeKey);
  // Create the response variable
  let response;

  if (path === `/${process.env.ENV}/public/user/new`) {
    const username = body.username;
    const email = body.email;
    const sub = body.sub;
    const status = 'unverified';
    const credits = 0;
    console.log('NEW USER');
    response = await makeRequest(createUserDetails({ username, sub, email, status, credits }));
    console.log(response);
  }

  if (path === `/${process.env.ENV}/public/user/update/status`) {
    const status = 'verified';
    if (userSub && userSub !== '') {
      response = await makeRequest(updateUserDetails({ sub: userSub, status }));
    }
  }

  // This is the new route handler for getting user details.
  if (path === `/${process.env.ENV}/public/user/get`) {
    const subId = userSub;

    if (subId) {
      response = await makeRequest(getUserDetails({ subId }));
    } else {
      response = {
        statusCode: 400,
        body: {
          errors: [
            {
              message: "Request must include either 'username' or 'subId' in Payload.",
            },
          ],
        },
      };
    }
  }

  if (path === `/${process.env.ENV}/public/user/spendCredits`) {
    const subId = event.subId;
    const numCredits = event.numCredits;

    if (!subId || !numCredits) {
      response = {
        statusCode: 400,
        body: {
          errors: [
            {
              message: "Request must include 'subId' and 'numCredits' in Payload.",
            },
          ],
        },
      };
    } else {
      // First, get the user's current credit balance.
      const getUserResponse = await makeRequest(getUserDetails({ subId }));
      const credits = getUserResponse.body.data.getUserDetails.credits;
      // Check if the user has at least one credit.
      if (credits >= numCredits) {
        // The user has at least one credit, so spend one.
        const updatedCredits = credits - numCredits;
        response = getUserResponse;
        await makeRequest(updateUserDetailsCredits({ id: subId, credits: updatedCredits }));
      } else {
        // The user does not have enough credits.
        response = {
          statusCode: 400,
          body: {
            error: 'User does not have enough credits.',
          },
        };
      }
    }
  }

  if (path === `/${process.env.ENV}/public/user/update/earlyAccess`) {
    const query = `
      mutation updateUserDetails {
          updateUserDetails(input: { id: "${userSub}", earlyAccessStatus: "requested" }) {
              id
              earlyAccessStatus
          }
        }
      `;

    console.log(query)

    response = await makeRequest(query);
  }

  if (path === `/${process.env.ENV}/public/vote`) {
    const seriesId = body.seriesId;
    const boost = body.boost;

    console.log('LOAD USER');
    const userDetails = await makeRequest(getUserDetails({ subId: userSub }));
    console.log('User Details:', userDetails);

    console.log('SEPARATE USER VOTES');
    const usersVotes = userDetails.body.data.getUserDetails.votes.items;
    console.log('User Votes:', usersVotes);

    console.log('CHECK IF VOTE EXISTS FOR SERIES ID');
    const lastVote = usersVotes
      ?.filter((item) => item.series?.id === seriesId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    console.log('Last Vote:', lastVote);

    // Check if the last vote was more than 24 hours ago
    let canVote = false;
    if (lastVote) {
      const voteTime = new Date(lastVote.createdAt);
      console.log(`Last Vote Time: ${voteTime}`)
      const diffInHours = (new Date() - voteTime) / 1000 / 60 / 60;
      console.log(`diffInHours: ${diffInHours}`)
      canVote = diffInHours >= 24;
    } else {
      canVote = true;
    }

    console.log('Can Vote:', canVote);

    if (canVote) {
      console.log('CREATE VOTE QUERY');
      const createVote = `
        mutation createSeriesUserVote {
            createSeriesUserVote(input: {userDetailsVotesId: "${userSub}", seriesUserVoteSeriesId: "${seriesId}", boost: ${boost > 0 ? 1 : -1
        }}) {
              id
            }
        }
      `;
      console.log('Create Vote Query:', createVote);

      // Hit GraphQL to place vote
      response = await makeRequest(createVote);
      console.log('Vote Response:', response);
    } else {
      // The user has already voted recently. Return a Forbidden error with details
      response = {
        statusCode: 403,
        body: {
          name: 'VoteTooRecent',
          message: 'You can only vote once every 24 hours.',
        },
      };
      console.log('Forbidden Error:', response);
    }
  }

  if (path === `/${process.env.ENV}/public/vote/list`) {
    // To fix the issue, we need to first check if the user is auth'd. This is going to get their auth type.
    // If they're not signed in, it will return "unauthenticated". We'll use that below to dictate what to send back.
    const userAuth = event.requestContext.identity.cognitoAuthenticationType

    // Extract the seriesId from the query string parameters if present
    const seriesId = event.queryStringParameters && event.queryStringParameters.id;

    try {
      // Pass the seriesId to the getAllVotes function
      const totalVotes = await getAllVotes(seriesId);

      if (seriesId) {
        response = {
          statusCode: 200,
          body: JSON.stringify(totalVotes),
        };
      } else {
        // Now we want to change it so that it only tries to get user votes if a users logged in.
        // First lets set these as lets
        let currentUserVotesUp = null
        let currentUserVotesDown = null
        let isLastUserVoteOlderThan24Hours = null
        let lastBoostValue = null
        let nextVoteTime = null
        let lastUserVoteTimestamps = null
        let combinedUserVotes = {};

        if (userAuth !== "unauthenticated") {
          // Summarize the user's personal votes
          const userVotes = await getAllUserVotes({ subId: userSub });
          console.log(`userVotes: ${JSON.stringify(userVotes)}`)
          // const userVotes = allVotes.body.data.getUserDetails.votes.items;

          console.log(totalVotes)
          // The next change is going to be setting these values to the lets. That way they'll be null unless we hit this step.
          // I'm going to comment out the original code in case we need to come back to it.
          /* 
          const {
            currentUserVotesUp,
            currentUserVotesDown,
            isLastUserVoteOlderThan24Hours,
            lastBoostValue,
            nextVoteTime,
            lastUserVoteTimestamps
          } = await processVotes({ allItems: userVotes, userSub }); 
          */

          const userProcessedVotes = await processVotes({ allItems: userVotes, userSub });
          currentUserVotesUp = userProcessedVotes.currentUserVotesUp
          currentUserVotesDown = userProcessedVotes.currentUserVotesDown
          isLastUserVoteOlderThan24Hours = userProcessedVotes.isLastUserVoteOlderThan24Hours
          lastBoostValue = userProcessedVotes.lastBoostValue
          nextVoteTime = userProcessedVotes.nextVoteTime
          lastUserVoteTimestamps = userProcessedVotes.lastUserVoteTimestamps
          for (let id in currentUserVotesUp) {
            combinedUserVotes[id] = (currentUserVotesUp[id] || 0) - (currentUserVotesDown[id] || 0);
          }
        }

        const combinedVotes = {};
        const votesUp = {};
        const votesDown = {};

        for (let id in totalVotes) {
          combinedVotes[id] = totalVotes[id].upvotes - totalVotes[id].downvotes;
          votesUp[id] = totalVotes[id].upvotes;
          votesDown[id] = -totalVotes[id].downvotes; // To keep the downvotes as negative
        }

        // const combinedUserVotes = {};
        // for (let id in currentUserVotesUp) {
        //   combinedUserVotes[id] = (currentUserVotesUp[id] || 0) - (currentUserVotesDown[id] || 0);
        // }

        const result = {
          votes: combinedVotes,
          userVotes: combinedUserVotes,
          votesUp: votesUp,
          votesDown: votesDown,
          userVotesUp: currentUserVotesUp,
          userVotesDown: currentUserVotesDown,
          ableToVote: isLastUserVoteOlderThan24Hours,
          lastBoost: lastBoostValue,
          nextVoteTime: nextVoteTime,
          lastVoteTime: lastUserVoteTimestamps
        };

        response = {
          statusCode: 200,
          body: result,
        };
      }
    } catch (error) {
      console.log(`Failed to get votes: ${error.message}`);
      response = {
        statusCode: 500,
        body: `Failed to get votes: ${error.message}`,
      };
    }
  }

  if (path === `/${process.env.ENV}/public/requests/add`) {
    const listTvdbResultsQuery = `
      query seriesByTvdbid {
        seriesByTvdbid(tvdbid: "${body.tvdb_id}") {
          items {
            name
            id
          }
        }
      }
    `
    console.log('listTvdbResultsQuery')
    console.log(listTvdbResultsQuery)

    // Attempt to load the TVDB ID from GraphQL
    const listTvdbResults = await makeRequest(listTvdbResultsQuery)
    console.log('listTvdbResults')
    console.log(listTvdbResults)

    // Check to see if there are any results
    console.log('ITEM LENGTH', listTvdbResults.body?.data?.seriesByTvdbid?.items.length)
    if (listTvdbResults.body?.data?.seriesByTvdbid?.items.length > 0) {
      // Send a response saying the series already exists
      response = {
        statusCode: 409,
        body: {
          name: 'SeriesAlreadyExist',
          message: 'This series has already been requested!'
        }
      }
    } else {
      const { tvdb_id, year, overview, slug, name, image_url } = body
      // Create the series
      const createSeriesQuery = `
        mutation createSeries {
          createSeries(input: {year: ${year}, tvdbid: "${tvdb_id}", statusText: "submittedRequest", slug: "${slug}", name: "${name}", image: "${image_url}", description: ${JSON.stringify(overview)}}) {
            id
          }
        }
      `
      console.log('createSeriesQuery')
      console.log(createSeriesQuery)

      const createSeries = await makeRequest(createSeriesQuery)
      console.log('createSeries')
      console.log(createSeries)
      // Send a response saying the series has been added to the quests
      response = {
        statusCode: 200,
        body: {
          name: 'SeriesAdded',
          message: 'Your request has been submitted!',
          id: createSeries.body.data.createSeries.id
        }
      }
    }
  }

  // This is what works with the S3 Trigger to take note of uploaded files
  if (path === `/trigger/addFile`) {
    console.log('ADD FILE')
    console.log(event.userSub)
    console.log(event.key)

    const { sourceMediaId, key } = event;

    const createFileQuery = `
      mutation createFile {
        createFile(input: {sourceMediaFilesId: "${sourceMediaId}", key: "${key}", status: "uploaded"}) {
          id
        }
      }
    `

    const createFile = await makeRequest(createFileQuery)

    response = {
      statusCode: 200,
      body: {
        success: true,
        message: `${key} has been uploaded to ${sourceMediaId}`,
        details: createFile.body
      }
    }
  }

  // This sets a users Contributor status to "requested"
  if (path === `/${process.env.ENV}/public/user/update/contributorStatus`) {

    const query = `
      mutation updateUserDetails {
          updateUserDetails(input: { id: "${userSub}", contributorAccessStatus: "requested" }) {
              id
              contributorAccessStatus
          }
        }
      `;
    console.log(query)

    const becomeContributor = await makeRequest(query)
    console.log(becomeContributor)

    response = {
      statusCode: 200,
      body: {
        success: true,
        message: `You have been added to the waiting list!`,
        details: becomeContributor
      }
    }
  }

  // Get the checkout session
  if (path === `/${process.env.ENV}/public/user/update/getPortalLink`) {
    try {
      // Lets pull in the user details
      const query = `
        query getUserDetails {
            getUserDetails(id: "${userSub}") {
              earlyAccessStatus
              id
              email
              magicSubscription
              stripeCustomerInfo {
                createdAt
                id
              }
            }
          }
        `;
      console.log('The Query')
      console.log(query)

      const userDetailsQuery = await makeRequest(query);
      console.log('userDetailsQuery')
      console.log(userDetailsQuery)

      const userDetails = userDetailsQuery.body.data.getUserDetails
      console.log('User Details')
      console.log(userDetails)

      // Now lets set the customer id
      const stripeCustomerId = userDetails.stripeCustomerInfo.id

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: body.currentUrl,
      });

      response = {
        statusCode: 200,
        body: portalSession.url
      }

    } catch (error) {
      console.log(error)
      response = {
        statusCode: 500,
        body: {
          error,
          message: 'Something went wrong. Please try again.'
        }
      }
    }
  }

  // Get the checkout session
  if (path === `/${process.env.ENV}/public/user/update/getCheckoutSession`) {
    try {
      // Lets pull in the user details
      const query = `
        query getUserDetails {
            getUserDetails(id: "${userSub}") {
              earlyAccessStatus
              id
              email
              magicSubscription
              stripeCustomerInfo {
                createdAt
                id
              }
            }
          }
        `;
      console.log('The Query')
      console.log(query)

      const userDetailsQuery = await makeRequest(query);
      console.log('userDetailsQuery')
      console.log(userDetailsQuery)

      const userDetails = userDetailsQuery.body.data.getUserDetails
      console.log('User Details')
      console.log(userDetails)

      // Now lets set the customer id
      let stripeCustomerId;
      if (!userDetails.stripeCustomerInfo) {
        // Create stripe customer since they don't have one.
        // metadata is only viewable by us, so I've added their sub as "userId" as this could be useful in the future.
        const customer = await stripe.customers.create({
          email: userDetails.email,
          metadata: {
            userId: userDetails.id
          }
        });

        // Now lets add the StripeCustomer to GraphQL
        const createStripeCustomerQuery = `
          mutation createStripeCustomer {
            createStripeCustomer(input: {id: "${customer.id}", stripeCustomerUserId: "${userDetails.id}"}) {
              id
            }
          }
        `
        console.log('createStripeCustomerQuery')
        console.log(createStripeCustomerQuery)
        await makeRequest(createStripeCustomerQuery)

        const addStripeCustomerToUserQuery = `
        mutation updateUserDetails {
          updateUserDetails(input: {id: "${userDetails.id}", userDetailsStripeCustomerInfoId: "${customer.id}"}) {
            id
          }
        }
        `
        console.log('addStripeCustomerToUserQuery')
        console.log(addStripeCustomerToUserQuery)
        const addStripeCustomerToUser = await makeRequest(addStripeCustomerToUserQuery)
        console.log('addStripeCustomerToUser')
        console.log(addStripeCustomerToUser)
        console.log(JSON.stringify(addStripeCustomerToUser))

        // And finally, lets set stripeCustomerId to the new id
        stripeCustomerId = customer.id

      } else {
        // The user already has a StripeCustomer made, so we will set stripeCustomerId to the one attached to their userDetails.
        stripeCustomerId = userDetails.stripeCustomerInfo.id
      }

      const stripeCustomerInfo = await stripe.customers.retrieve(stripeCustomerId, {
        expand: ['subscriptions'],
      });
      console.log('stripeCustomerInfo')
      console.log(stripeCustomerInfo)

      // Now that the customerId is set, lets create a checkout session.
      const session = await stripe.checkout.sessions.create({
        success_url: `https://api.memesrc.com/${process.env.ENV}/public/stripeVerification?checkoutSessionId={CHECKOUT_SESSION_ID}`,
        cancel_url: body.currentUrl,
        customer: stripeCustomerId,
        line_items: [
          { price: `${process.env.ENV === 'beta' ? 'price_1NbXguAqFX20vifI34N1MJFO' : 'price_1Nhc9UAqFX20vifI0mYIzSfs'}`, quantity: 1 },
        ],
        mode: 'subscription',
        discounts: [{
          coupon: `${process.env.ENV === 'beta' ? 'DIdAixG9' : 'GTke5f0s'}`
        }],
        metadata: {
          callbackUrl: body.currentUrl
        }
      });

      const createCheckoutSessionQuery = `
        mutation createStripeCheckoutSession {
          createStripeCheckoutSession(input: {id: "${session.id}", userDetailsStripeCheckoutSessionId: "${userDetails.id}", status: "open"}) {
            id
          }
        }
      `
      console.log('createCheckoutSessionQuery')
      console.log(createCheckoutSessionQuery)

      const createCheckoutSession = await makeRequest(createCheckoutSessionQuery)
      console.log('createCheckoutSession')
      console.log(createCheckoutSession)

      response = {
        statusCode: 200,
        body: session.url
      }

    } catch (error) {
      console.log(error)
      response = {
        statusCode: 500,
        body: {
          error,
          message: 'Something went wrong. Please try again.'
        }
      }
    }
  }

  // Cancel a subscription
  if (path === `/${process.env.ENV}/public/user/update/cancelSubscription`) {
    try {
      // Lets pull in the user details
      const query = `
        query getUserDetails {
            getUserDetails(id: "${userSub}") {
              earlyAccessStatus
              id
              email
              magicSubscription
              stripeCustomerInfo {
                createdAt
                id
              }
            }
          }
        `;
      console.log('The Query')
      console.log(query)

      const userDetailsQuery = await makeRequest(query);
      console.log('userDetailsQuery')
      console.log(userDetailsQuery)

      const userDetails = userDetailsQuery.body.data.getUserDetails
      console.log('User Details')
      console.log(userDetails)


      const stripeCustomerId = userDetails.stripeCustomerInfo.id

      const stripeCustomerInfo = await stripe.customers.retrieve(stripeCustomerId, {
        expand: ['subscriptions'],
      });
      console.log('stripeCustomerInfo')
      console.log(JSON.stringify(stripeCustomerInfo))
      const subscriptions = stripeCustomerInfo.subscriptions.data

      async function cancelActiveSubscriptions(subscriptions) {
        // Get only active subscriptions
        const activeSubscriptions = subscriptions.filter(subscription => subscription.status === 'active');

        // Cancel each active subscription
        for (const subscription of activeSubscriptions) {
          try {
            await stripe.subscriptions.cancel(subscription.id);
            console.log(`Subscription ${subscription.id} cancelled successfully.`);
          } catch (error) {
            console.error(`Failed to cancel subscription ${subscription.id}.`, error);
          }
        }
      }

      await cancelActiveSubscriptions(subscriptions)

      const removeMagicSubscriptionQuery = `
        mutation updateUserDetails {
          updateUserDetails(input: {id: "${userSub}", magicSubscription: null, subscriptionStatus: "canceled"}) {
            id
          }
        }
        `
      console.log('removeMagicSubscriptionQuery')
      console.log(removeMagicSubscriptionQuery)

      await makeRequest(removeMagicSubscriptionQuery)

      response = {
        statusCode: 200,
        body: {
          subscriptionCancelled: true,
          message: 'Your subscription has been canceled.'
        }
      }

    } catch (error) {
      console.log(error)
      response = {
        statusCode: 500,
        body: {
          error,
          message: 'Something went wrong. Please try again.'
        }
      }
    }
  }

  if (path === `/${process.env.ENV}/public/user/update/acceptMagicInvitation`) {
    try {
      /* ---------------------- Lets pull in the user details --------------------- */
      const query = `
        query getUserDetails {
            getUserDetails(id: "${userSub}") {
              earlyAccessStatus
              id
              magicSubscription
              credits
            }
          }
        `;
      console.log('UserDetails Query Text')
      console.log(query)

      const userDetailsQuery = await makeRequest(query);
      console.log('userDetailsQuery')
      console.log(userDetailsQuery)

      const userDetails = userDetailsQuery.body.data.getUserDetails
      console.log('User Details')
      console.log(userDetails)

      /* ----------------------- Now lets check their status ---------------------- */

      if (userDetails?.earlyAccessStatus === 'invited') {
        const freeCreditValue = Math.max(5, (userDetails.credits || 0));
        // They're invited. Set their magic credits to 5
        const acceptInviteQuery = `
          mutation updateUserDetails {
            updateUserDetails(input: {id: "${userSub}", earlyAccessStatus: "accepted", credits: ${freeCreditValue} }) {
              id
              earlyAccessStatus
              credits
            }
          }
        `
        console.log('acceptInviteQuery')
        console.log(acceptInviteQuery)

        const acceptInvite = await makeRequest(acceptInviteQuery)
        console.log('acceptInvite')
        console.log(acceptInvite)

        // The user has now accepted the invite and has free credits
        response = {
          statusCode: 200,
          body: {
            status: 'accepted',
            message: `You're in! You have some free credits.`,
            credits: acceptInvite.body.data.updateUserDetails.credits
          }
        }
      } else if (userDetails?.earlyAccessStatus === 'accepted') {
        // The user is in the accepted state.
        response = {
          status: 403,
          body: {
            status: 'alreadyAccepted',
            message: 'You have already accepted the invitation.'
          }
        }
      } else {
        // The user is not in the invited state.
        response = {
          status: 403,
          body: {
            status: 'notInvited',
            message: 'You have not been invited to early access.'
          }
        }
      }
    } catch (error) {
      // There was an error
      console.log(error)
      response = {
        status: 403,
        body: {
          status: 'error',
          message: 'There was an error when making the request'
        }
      }
    }
  }

  // This handles adding the customers credits after subscribing
  if (path === `/function/magic69/addCredits`) {
    try {
      // Lets get the checkout session from GraphQL
      const getStripeCheckoutSessionQuery = `
        query getStripeCheckoutSession {
          getStripeCheckoutSession(id: "${body.checkoutSessionId}") {
            id
            status
            user {
              id
            }
          }
        }
      `
      console.log('getStripeCheckoutSessionQuery')
      console.log(getStripeCheckoutSessionQuery)

      const getStripeCheckoutSession = await makeRequest(getStripeCheckoutSessionQuery);
      console.log('getStripeCheckoutSession')
      console.log(getStripeCheckoutSession)

      // Now if the checkout session status is open, lets add their credits.
      const userId = getStripeCheckoutSession.body.data.getStripeCheckoutSession.user.id
      const status = getStripeCheckoutSession.body.data.getStripeCheckoutSession.status

      if (status === 'open') {
        const updateUserDetailsQuery = `
          mutation updateUserDetails {
            updateUserDetails(input: {id: "${userId}", magicSubscription: "true", credits: 69, subscriptionPeriodStart: "${body.periodStart}", subscriptionPeriodEnd: "${body.periodEnd}", subscriptionStatus: "active"}) {
              id
              credits
            }
          }
        `
        console.log('updateUserDetailsQuery')
        console.log(updateUserDetailsQuery)

        const updateUsersCredits = await makeRequest(updateUserDetailsQuery)
        console.log('updateUsersCredits')
        console.log(updateUsersCredits)

        const updateCheckoutSessionStatus = `
          mutation updateStripeCheckoutSession {
            updateStripeCheckoutSession(input: {id: "${body.checkoutSessionId}", status: "complete"}) {
              id
            }
          }
        `
        console.log('updateCheckoutSessionStatus')
        console.log(updateCheckoutSessionStatus)

        const updateCheckoutSession = await makeRequest(updateCheckoutSessionStatus)
        console.log('updateCheckoutSession')
        console.log(updateCheckoutSession)

        response = {
          statusCode: 200,
          body: {
            complete: true,
            message: 'User has been given 69 credits'
          }
        }
      } else {
        response = {
          statusCode: 500,
          body: {
            message: 'This checkout session has already been completed.',
            errorCode: 'CheckoutSessionCompleted'
          }
        }
      }
    } catch (error) {
      response = {
        statusCode: 500,
        body: {
          error,
          message: 'Something went wrong. Please try again.'
        }
      }
    }
  }

  if (path === `/function/magic69/renewCredits`) {
    // Lets wrap this in a try/catch. That way if stripe customer in GraphQL doesn't exist, it will fail.
    try {
      // First we want to get the UserDetails ID by checking the stripe customer.
      const getStripeCustomerQuery = `
        query getStripeCustomer {
          getStripeCustomer(id: "${body.stripeCustomerId}") {
            user {
              id
              credits
            }
          }
        }
      `
      console.log('getStripeCustomerQuery', getStripeCustomerQuery);
      const stripeCustomer = await makeRequest(getStripeCustomerQuery);
      console.log('stripeCustomer', JSON.stringify(stripeCustomer))

      // Now lets make sure that the customer existed.
      if (stripeCustomer?.body?.data?.getStripeCustomer?.user?.id) {
        // The stripe customer exists and is attached to a user.
        // Lets throw 69 credits at them.
        const userId = stripeCustomer.body.data.getStripeCustomer.user.id
        const newCreditValue = Math.max(69, (stripeCustomer.body.data.getStripeCustomer.user.credits || 0));

        const updateUserDetailsQuery = `
          mutation updateUserDetails {
            updateUserDetails(input: {id: "${userId}", magicSubscription: "true", credits: ${newCreditValue}, subscriptionPeriodStart: "${body.periodStart}", subscriptionPeriodEnd: "${body.periodEnd}", subscriptionStatus: "active"}) {
              id
              credits
            }
          }
        `
        console.log('updateUserDetailsQuery')
        console.log(updateUserDetailsQuery)

        const updateUsersCredits = await makeRequest(updateUserDetailsQuery)
        console.log('updateUsersCredits')
        console.log(updateUsersCredits)

        // The user now has 69 credits, and their subscriptionPeriodStart and subscriptionPeriodEnd have been updated
        response = {
          statusCode: 200,
          body: {
            code: 'success',
            message: `The user now has ${newCreditValue} credits, and their subscriptionPeriodStart and subscriptionPeriodEnd have been updated`
          }
        }
      } else {
        response = {
          statusCode: 406,
          body: {
            error: 'UserDoesNotExist',
            message: 'The stripe customer ID does not correspond to a customer ID in GraphQL. This could be because the customer ID in question did not sign up for magic tools.'
          }
        }
      }

    } catch (error) {
      console.log(error)
      response = {
        statusCode: 500,
        body: {
          error: 'TryCaught',
          message: 'Something failed in the try/catch. Check logs for memesrcUserFunction.'
        }
      }
    }
  }

  if (path === `/function/magic69/failedPayment`) {
    // Lets wrap this in a try/catch. That way if stripe customer in GraphQL doesn't exist, it will fail.
    try {
      // First we want to get the UserDetails ID by checking the stripe customer.
      const getStripeCustomerQuery = `
        query getStripeCustomer {
          getStripeCustomer(id: "${body.stripeCustomerId}") {
            user {
              id
            }
          }
        }
      `
      console.log('getStripeCustomerQuery', getStripeCustomerQuery);
      const stripeCustomer = await makeRequest(getStripeCustomerQuery);
      console.log('stripeCustomer', JSON.stringify(stripeCustomer))

      // Now lets make sure that the customer existed.
      if (stripeCustomer?.body?.data?.getStripeCustomer?.user?.id) {
        // The stripe customer exists and is attached to a user.
        // Lets reduce them to 0 credits
        const userId = stripeCustomer.body.data.getStripeCustomer.user.id

        const updateUserDetailsQuery = `
          mutation updateUserDetails {
            updateUserDetails(input: {id: "${userId}", subscriptionStatus: "failedPayment", credits: 0}) {
              id
              credits
            }
          }
        `
        console.log('updateUserDetailsQuery')
        console.log(updateUserDetailsQuery)

        const updateUsersCredits = await makeRequest(updateUserDetailsQuery)
        console.log('updateUsersCredits')
        console.log(updateUsersCredits)

        // The user subscriptionStatus is now set to failedPayment
        response = {
          statusCode: 200,
          body: {
            code: 'success',
            message: 'The user subscriptionStatus is now set to failedPayment'
          }
        }
      } else {
        response = {
          statusCode: 406,
          body: {
            error: 'UserDoesNotExist',
            message: 'The stripe customer ID does not correspond to a customer ID in GraphQL. This could be because the customer ID in question did not sign up for magic tools.'
          }
        }
      }

    } catch (error) {
      console.log(error)
      response = {
        statusCode: 500,
        body: {
          error: 'TryCaught',
          message: 'Something failed in the try/catch. Check logs for memesrcUserFunction.'
        }
      }
    }
  }


  // Stripe callback to cancel subscription
  if (path === `/function/magic69/cancelSubscription`) {
    // Lets wrap this in a try/catch. That way if stripe customer in GraphQL doesn't exist, it will fail.
    try {
      // First we want to get the UserDetails ID by checking the stripe customer.
      const getStripeCustomerQuery = `
        query getStripeCustomer {
          getStripeCustomer(id: "${body.stripeCustomerId}") {
            user {
              id
            }
          }
        }
      `
      console.log('getStripeCustomerQuery', getStripeCustomerQuery);
      const stripeCustomer = await makeRequest(getStripeCustomerQuery);
      console.log('stripeCustomer', JSON.stringify(stripeCustomer))

      // Now lets make sure that the customer existed.
      if (stripeCustomer?.body?.data?.getStripeCustomer?.user?.id) {
        // The stripe customer exists and is attached to a user.
        // Let's reduce them to 0 credits.
        const userId = stripeCustomer.body.data.getStripeCustomer.user.id

        const updateUserDetailsQuery = `
        mutation updateUserDetails {
          updateUserDetails(input: {id: "${userId}", magicSubscription: null, subscriptionStatus: "canceled", credits: 0}) {
            id
          }
        }
        `
        console.log('updateUserDetailsQuery')
        console.log(updateUserDetailsQuery)

        const updateUserDetails = await makeRequest(updateUserDetailsQuery)
        console.log('updateUserDetails')
        console.log(updateUserDetails)

        // The user subscriptionStatus is now set to canceled
        response = {
          statusCode: 200,
          body: {
            code: 'success',
            message: 'The user subscriptionStatus is now set to canceled'
          }
        }
      } else {
        response = {
          statusCode: 406,
          body: {
            error: 'UserDoesNotExist',
            message: 'The stripe customer ID does not correspond to a customer ID in GraphQL. This could be because the customer ID in question did not sign up for magic tools.'
          }
        }
      }

    } catch (error) {
      console.log(error)
      response = {
        statusCode: 500,
        body: {
          error: 'TryCaught',
          message: 'Something failed in the try/catch. Check logs for memesrcUserFunction.'
        }
      }
    }
  }

  // This marks a notification as read
  if (path === `/${process.env.ENV}/public/user/update/notification/read`) {
    // First we want to pull down the notification and compare the users sub to the one associated to the notification
    // We'll wrap all of this in a try/catch so that if anyone tries to tamper with any of the data and it fails, nothing will happen.
    try {
      const getNotificationQuery = `
      query getUserNotification {
        getUserNotification(id: "${body.notificationId}") {
          user {
            id
          }
          isUnRead
        }
      }
    `
      console.log('getNotificationQuery')
      console.log(getNotificationQuery)

      const getNotification = await makeRequest(getNotificationQuery);
      console.log('getNotification')
      console.log(getNotification)

      if (getNotification.body.data.getUserNotification.user.id === userSub) {
        // If the user sub matches the one associated with the notification, lets make isUnRead: false
        const updateNotificationQuery = `
          mutation updateUserNotification {
            updateUserNotification(input: {id: "${body.notificationId}", isUnRead: false}) {
              id
            }
          }
        `
        console.log('updateNotificationQuery')
        console.log(updateNotificationQuery)

        const updateNotification = await makeRequest(updateNotificationQuery);
        console.log('updateNotification');
        console.log(updateNotification)
      } else {
        response = {
          statusCode: 403,
          body: 'You do not have permission to update this notification.'
        }
      }

    } catch (error) {
      response = {
        statusCode: 500,
        body: 'Something went wrong.'
      }
    }

    response = {
      statusCode: 200,
      body: 'The notification has been marked as read.'
    }
  }

  // This marks a notification as unread
  if (path === `/${process.env.ENV}/public/user/update/notification/unread`) {
    // First we want to pull down the notification and compare the users sub to the one associated to the notification
    // We'll wrap all of this in a try/catch so that if anyone tries to tamper with any of the data and it fails, nothing will happen.
    try {
      const getNotificationQuery = `
      query getUserNotification {
        getUserNotification(id: "${body.notificationId}") {
          user {
            id
          }
          isUnRead
        }
      }
    `
      console.log('getNotificationQuery')
      console.log(getNotificationQuery)

      const getNotification = await makeRequest(getNotificationQuery);
      console.log('getNotification')
      console.log(getNotification)

      if (getNotification.body.data.getUserNotification.user.id === userSub) {
        // If the user sub matches the one associated with the notification, lets make isUnRead: true
        const updateNotificationQuery = `
          mutation updateUserNotification {
            updateUserNotification(input: {id: "${body.notificationId}", isUnRead: true}) {
              id
            }
          }
        `
        console.log('updateNotificationQuery')
        console.log(updateNotificationQuery)

        const updateNotification = await makeRequest(updateNotificationQuery);
        console.log('updateNotification');
        console.log(updateNotification)
      } else {
        response = {
          statusCode: 403,
          body: 'You do not have permission to update this notification.'
        }
      }

    } catch (error) {
      response = {
        statusCode: 500,
        body: 'Something went wrong.'
      }
    }

    response = {
      statusCode: 200,
      body: 'The notification has been marked as unread.'
    }
  }

  // Return list of users saved metadata objects
  if (path === `/${process.env.ENV}/public/user/update/getSavedMetadata`) {
    const getUsersMetadataQuery = `
      query getUserDetails($id: ID!, $nextToken: String) {
        getUserDetails(id: $id) {
          contentMetadatas(nextToken: $nextToken) {
            items {
              contentMetadata {
                version
                updatedAt
                title
                status
                id
                frameCount
                emoji
                description
                createdAt
                colorSecondary
                colorMain
              }
            }
            nextToken
          }
        }
      }
    `;
    console.log('getUsersMetadataQuery', getUsersMetadataQuery);

    async function fetchAllContentMetadatas(id) {
      let allItems = []; // Array to hold all contentMetadata items
      let nextToken = null; // Variable to track the nextToken

      // Function to recursively fetch contentMetadatas
      async function fetchPage(nt) {
        try {
          // Adjust your makeRequestWithVariables function to accept nextToken if provided
          const response = await makeRequestWithVariables(getUsersMetadataQuery, { id: id, nextToken: nt });
          const contentMetadatas = response?.body.data?.getUserDetails?.contentMetadatas;

          // Concatenate the new items to the allItems array
          allItems = allItems.concat(contentMetadatas.items.map(item => item.contentMetadata));

          // If there's a nextToken, recursively call fetchPage again
          if (contentMetadatas.nextToken) {
            await fetchPage(contentMetadatas.nextToken);
          }
        } catch (error) {
          console.error('Failed to fetch contentMetadatas:', error);
          throw new Error('Failed to fetch contentMetadatas');
        }
      }

      await fetchPage(nextToken); // Start the recursive fetching

      return allItems; // Return all fetched items
    }

    try {
      const getUsersMetadataRequest = await fetchAllContentMetadatas(userSub);
      console.log('getUsersMetadataRequest', JSON.stringify(getUsersMetadataRequest));

      // If this works it will return an array of the objects in the body
      response = {
        statusCode: 200,
        body: getUsersMetadataRequest
      }
    } catch (error) {
      console.log(error);
      response = {
        statusCode: 500,
        body: {
          errorCode: 'FAILED_TO_LIST_USERS_SAVED_METADATA',
          message: 'Something went wrong attempting to pull saved metadata.',
        }
      }
    }
  }

  if (path === `/${process.env.ENV}/public/user/update/saveMetadata`) {
    /* ----------------------------- GraphQL Queries ---------------------------- */
    const getContentMetadataQuery = `
    query getContentMetadata($id: ID!) {
      getContentMetadata(id: $id) {
        id
      }
    }
    `;
    console.log('getContentMetadataQuery', getContentMetadataQuery);

    const createContentMetadataQuery = `
      mutation createContentMetadata($colorMain: String, $colorSecondary: String, $description: String, $emoji: String, $frameCount: Int, $id: ID!, $status: Int, $title: String, $version: Int) {
        createContentMetadata(input: {colorMain: $colorMain, colorSecondary: $colorSecondary, description: $description, emoji: $emoji, frameCount: $frameCount, id: $id, status: $status, title: $title, version: $version}) {
          colorMain
          colorSecondary
          createdAt
          description
          emoji
          frameCount
          id
          status
          title
          updatedAt
          version
        }
      }
    `
    console.log('createContentMetadataQuery', createContentMetadataQuery)

    const createUserMetadataQuery = `
      mutation MyMutation($contentMetadataId: ID, $userDetailsId: ID) {
        createUserMetadata(input: {contentMetadataId: $contentMetadataId, userDetailsId: $userDetailsId}) {
          id
        }
      }
    `
    console.log('createUserMetadataQuery', createUserMetadataQuery)

    /* --------------------------- Variables From Body -------------------------- */

    const cid = body?.cid
    const colorMain = body?.colorMain
    const colorSecondary = body?.colorSecondary
    const description = body?.description
    const emoji = body?.emoji
    const frameCount = body?.frameCount
    const title = body?.title

    try {
      if (cid) {
        // First lets make sure the id doesn't exist.
        const getContentMetadataRequest = await makeRequestWithVariables(getContentMetadataQuery, { id: cid })
        console.log('getContentMetadataRequest', JSON.stringify(getContentMetadataRequest));

        if (!getContentMetadataRequest?.body?.data?.getContentMetadata?.id) {
          // There was not a match
          
          // Lets make a new one.
          const createContentMetadataRequest = await makeRequestWithVariables(createContentMetadataQuery, { id: cid, colorMain, colorSecondary, description, emoji, frameCount, title, status: 0, version: 2 });
          console.log('createContentMetadataRequest', JSON.stringify(createContentMetadataRequest));

          // Now assuming that worked, let's make the connection to the user.
          const createUserMetadataRequest = await makeRequestWithVariables(createUserMetadataQuery, { contentMetadataId: cid, userDetailsId: userSub });
          console.log('createUserMetadataRequest', JSON.stringify(createUserMetadataRequest));

          // Now lets return the data so that it can be added to their list on the front end.
          response = {
            statusCode: 200,
            body: {
              ...createContentMetadataRequest?.body?.data?.createContentMetadata
            }
          }
        } else {
          // There was a match
          response = {
            statusCode: 200,
            body: {
              alreadyExists: true
            }
          }
        }
      }
      
    } catch (error) {
      console.log(error);
      response = {
        statusCode: 500,
        body: {
          errorCode: 'FAILED_TO_SAVE_METADATA',
          message: 'Something went wrong attempting to pull saved metadata.',
        }
      }
    }
  }

  // console.log(response);

  return {
    statusCode: response.statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      ...response.headers,
    },
    body: JSON.stringify(response.body),
  };
};

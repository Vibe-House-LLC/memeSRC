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

async function getAllVotes(userSub, nextToken) {
  let query = `
    query ListSeriesUserVotes {
      listSeriesUserVotes(limit: 1000${nextToken ? `, nextToken: "${nextToken}"` : ''}) {
        items {
          id
          boost
          userDetailsVotesId
          seriesUserVoteSeriesId
          createdAt
        }
        nextToken
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

  let allItems = response.body.data.listSeriesUserVotes.items;
  if (response.body.data.listSeriesUserVotes.nextToken) {
    console.log('loading another page...');
    console.log(`nextToken: ${response.body.data.listSeriesUserVotes.nextToken}`);
    let newItems = await getAllVotes(userSub, response.body.data.listSeriesUserVotes.nextToken);
    allItems = allItems.concat(newItems);
    console.log('loaded another page');
  }

  return allItems;
}

async function processVotes(allItems, userSub) {
  const votesCount = {};
  const currentUserVotes = {};
  const votesCountUp = {};
  const votesCountDown = {};
  const currentUserVotesUp = {};
  const currentUserVotesDown = {};
  const lastUserVoteTimestamps = {};
  const lastBoostValue = {};
  const nextVoteTime = {};

  const seriesIds = new Set(allItems.map(item => item.seriesUserVoteSeriesId));
  const isLastUserVoteOlderThan24Hours = {};
  seriesIds.forEach(id => isLastUserVoteOlderThan24Hours[id] = true);

  allItems.forEach((vote) => {
    if (vote.boost > 0) {
      votesCountUp[vote.seriesUserVoteSeriesId] = (votesCountUp[vote.seriesUserVoteSeriesId] || 0) + vote.boost;
      if (vote.userDetailsVotesId && vote.userDetailsVotesId.normalize() === userSub.normalize()) {
        currentUserVotesUp[vote.seriesUserVoteSeriesId] =
          (currentUserVotesUp[vote.seriesUserVoteSeriesId] || 0) + vote.boost;
      }
    } else if (vote.boost < 0) {
      votesCountDown[vote.seriesUserVoteSeriesId] = (votesCountDown[vote.seriesUserVoteSeriesId] || 0) + vote.boost;
      if (vote.userDetailsVotesId && vote.userDetailsVotesId.normalize() === userSub.normalize()) {
        currentUserVotesDown[vote.seriesUserVoteSeriesId] =
          (currentUserVotesDown[vote.seriesUserVoteSeriesId] || 0) + vote.boost;
      }
    }

    votesCount[vote.seriesUserVoteSeriesId] = (votesCount[vote.seriesUserVoteSeriesId] || 0) + vote.boost;

    if (vote.userDetailsVotesId && vote.userDetailsVotesId.normalize() === userSub.normalize()) {
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

function getUserDetails(params) {
  // console.log(`getUserDetails PARAMS: ${params}`);
  if (params.username) {
    const query = `
          query listUserDetails {
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
                      votes {
                        items {
                            series {
                                id
                            }
                            boost
                            createdAt
                        }
                      }
                      credits
                  }
              }
          }
      `;
    // console.log(query);
    return query;
  } else if (params.subId) {
    const query = `
          query getUserDetails {
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
                  votes {
                    items {
                        series {
                            id
                        }
                        boost
                        createdAt
                    }
                  }
                  credits
              }
          }
      `;
    console.log(query);
    return query;
  }
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

    // Check if the last vote was more than 5 minutes ago
    let canVote = false;
    if (lastVote) {
      const voteTime = new Date(lastVote.createdAt);
      console.log(`Last Vote Time: ${voteTime}`)
      const diffInMinutes = (new Date() - voteTime) / 1000 / 60;
      console.log(`diffInMinutes: ${diffInMinutes}`)
      canVote = diffInMinutes > 5;
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
          message: 'You can only vote once every 5 minutes.',
        },
      };
      console.log('Forbidden Error:', response);
    }
  }

  if (path === `/${process.env.ENV}/public/vote/list`) {
    try {
      const rawVotes = await getAllVotes(userSub);
      const {
        allVotes,
        votesCount,
        currentUserVotes,
        votesCountUp,
        votesCountDown,
        currentUserVotesUp,
        currentUserVotesDown,
        isLastUserVoteOlderThan24Hours,
        lastBoostValue,
        nextVoteTime,
        lastUserVoteTimestamps
      } = await processVotes(rawVotes, userSub);

      const result = {
        votes: votesCount,
        userVotes: currentUserVotes,
        votesUp: votesCountUp,
        votesDown: votesCountDown,
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
          { price: 'price_1NbXguAqFX20vifI34N1MJFO', quantity: 1 },
        ],
        mode: 'subscription',
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
          updateUserDetails(input: {id: "${userSub}", magicSubscription: null}) {
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
        // They're invited. Set their magic credits to 5
        const acceptInviteQuery = `
          mutation updateUserDetails {
            updateUserDetails(input: {id: "${userSub}", earlyAccessStatus: "accepted", credits: 5 }) {
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

        // The user has now accepted the invite and has 5 free credits
        response = {
          statusCode: 200,
          body: {
            status: 'accepted',
            message: 'Welcome! Enjoy 5 free magic points.',
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
      response = {
        status: 403,
        body: {
          status: 'error',
          message: 'There was an error when making the request.'
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
            updateUserDetails(input: {id: "${userId}", magicSubscription: "true", credits: 69}) {
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

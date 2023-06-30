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
import { default as fetch, Request } from 'node-fetch';

const GRAPHQL_ENDPOINT = process.env.API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const { Sha256 } = crypto;

function getUserDetails(params) {
    console.log(`getUserDetails PARAMS: ${params}`)
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
                      votes {
                        items {

                        }
                      }
                      credits
                  }
              }
          }
      `
        console.log(query)
        return query
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
                  votes {
                    items {
                        series {
                            id
                        }
                    }
                  }
                  credits
              }
          }
      `
        console.log(query)
        return query
    }
}

async function makeRequest(query) {
    console.log('MAKE REQUEST')
    console.log(query)
    const endpoint = new URL(GRAPHQL_ENDPOINT);


    const signer = new SignatureV4({
        credentials: defaultProvider(),
        region: AWS_REGION,
        service: 'appsync',
        sha256: Sha256
    });


    const requestToBeSigned = new HttpRequest({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            host: endpoint.host
        },
        hostname: endpoint.host,
        body: JSON.stringify({ query }),
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
        if (body.errors) {
            statusCode = 400;
            console.log(body.errors)
        }
    } catch (error) {
        statusCode = 500;
        body = {
            error: [
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

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
export const handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    // Get the users sub (if it exist)
    const userSub = (event.requestContext?.identity?.cognitoAuthenticationProvider) ? event.requestContext.identity.cognitoAuthenticationProvider.split(':').slice(-1) : '';
    // Grab the request body (if it exist)
    const body = event.body ? JSON.parse(event.body) : '';
    // Get the path
    const path = event.path
    // Create the response variable
    let response;

    if (path === `/${process.env.ENV}/public/vote`) {
        console.log('GET SERIES ID FROM BODY')
        const seriesId = body.seriesId
        console.log(seriesId)

        console.log('LOAD USER')
        const userDetails = await makeRequest(getUserDetails({ subId: userSub }))
        console.log(userDetails)

        console.log('SEPERATE USER VOTES')
        const usersVotes = userDetails.body.data.getUserDetails.votes.items
        console.log(usersVotes)

        console.log('CHECK IF VOTE EXIST FOR SERIES ID')
        const voteExist = usersVotes?.some(item => item.series.id === seriesId);
        console.log(voteExist)

        if (!voteExist) {
            // They have not voted for this series yet

            // Build query to cast vote
            console.log('CREATE VOTE QUERY')
            const createVote = `
                mutation createSeriesUserVote {
                    createSeriesUserVote(input: {userDetailsVotesId: "${userSub}", seriesUserVoteSeriesId: "${seriesId}", boost: 1})
                }
            `;
            console.log(createVote)

            // Hit GraphQL to place vote
            response = await makeRequest(createVote)
            console.log(response)

        } else {
            // The user has already voted. Return a Forbidden error with details
            response = {
                statusCode: 403,
                body: {
                    name: 'MaxVotesReached',
                    message: 'You have reached the maximum number of votes for this series.'
                }
            }
        }
    }

    console.log(response)

    return {
        statusCode: response.statusCode,
        // Uncomment below to enable CORS requests
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            ...response.headers
        },
        body: JSON.stringify(response.body)
    };
};

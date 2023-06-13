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

function createUserDetails(params) {
  const email = params.email ? `email: "${params.email}",` : ''
  const username = params.username ? `username: "${params.username}",` : ''
  const stripeId = params.email ? `stripeId: "${params.stripeId}",` : ''
  const sub = params.sub ? `id: "${params.sub}",` : ''
  const status = params.status ? `status: "${params.status}",` : ''

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
  `

  return query
}

function updateUserDetails(params) {
  const email = params.email ? `email: "${params.email}",` : ''
  const username = params.username ? `username: "${params.username}",` : ''
  const stripeId = params.email ? `stripeId: "${params.stripeId}",` : ''
  const sub = params.sub ? `id: "${params.sub}",` : ''
  const status = params.status ? `status: "${params.status}",` : ''

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
  `

  return query
}

function getUserDetails(params) {
  if (params.username) {
      const query = `
          query listUserDetails {
              listUserDetails(filter: {username: {eq: "${params.username}"}}) {
                  items {
                      updatedAt
                      username
                      stripeId
                      id
                      email
                      createdAt
                      status
                  }
              }
          }
      `
      return query
  } else if (params.sub) {
      const query = `
          query getUserDetails {
              getUserDetails(id: "${params.id}") {
                  createdAt
                  email
                  id
                  stripeId
                  username
                  updatedAt
                  status
              }
          }
      `
      return query
  }
}

async function makeRequest(query) {
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

  if (path === `/${process.env.ENV}/public/user/new`) {
    const username = body.username
    const email = body.email
    const sub = body.sub
    const status = 'unverified'
    console.log('NEW USER')
    response = await makeRequest(createUserDetails({username, sub, email, status}))
    console.log(response)
  }

  if (path === `/${process.env.ENV}/public/user/update/status`) {
    const status = 'verified'
    if (userSub && userSub !== ''){
        response = await makeRequest(updateUserDetails({userSub, status}))
    }
  }

  console.log(response)

  return {
    statusCode: response.statusCode,
    //  Uncomment below to enable CORS requests
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      ...response.headers
    },
    body: JSON.stringify(response.body)
  };
};

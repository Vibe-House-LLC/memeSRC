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
import createUserDetails from './functions/createUserDetails'
import updateUserDetails from './functions/updateUserDetails';

const GRAPHQL_ENDPOINT = process.env.API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const { Sha256 } = crypto;

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

  if (path === '/user/new') {
    const username = body.username
    const email = body.email
    const status = 'unverified'
    response = await makeRequest(createUserDetails({username, email, status}))
  }

  if (path === '/user/update/status') {
    const username = body.username
    const status = 'verified'
    if (userSub && userSub !== ''){
        response = await makeRequest(updateUserDetails({username, status}))
    }
  }

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

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

const userDetailsQuery = `
  query getUserDetails {
      getUserDetails(id: "889a369c-158f-45aa-aa0c-e1479b2075dd") {
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
`;

const createSignedQueryRequest = async (query) => {
  const endpoint = new URL(GRAPHQL_ENDPOINT);

  console.log(GRAPHQL_ENDPOINT)

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
  return new Request(endpoint, signed);
}

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

export const handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  let statusCode = 200;
  let body;
  let response;

  try {
    // await runIterations();
    const request = await createSignedQueryRequest(userDetailsQuery);
    const response = await fetch(request);
    const body = await response.json();
    console.log(body)
  } catch (error) {
    console.error('Iterations failed', error);
  }


  return {
    statusCode,
    //  Uncomment below to enable CORS requests
    // headers: {
    //   "Access-Control-Allow-Origin": "*",
    //   "Access-Control-Allow-Headers": "*"
    // }, 
    body: JSON.stringify(body)
  };
};
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

const updateProgressQuery = (id, progress) => `
  mutation {
    updateSeries(input: {id: "${id}", statusText: "Processing: ${progress}"}) {
      id
      createdAt
      description
      image
      name
      slug
      tvdbid
      updatedAt
      year
      statusText
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

  async function runIterations() {
    return new Promise((resolve, reject) => {
      let i = 0;

      const intervalId = setInterval(async () => {
        const value = (i+1) * 10; // simulate progress depending on the iteration
        let statusMessage = 'Preparing'
        if (value > 10 && value <= 30) {
          statusMessage = 'extracting subtitles'
        } else if (value > 30 && value <= 70) {
          statusMessage = 'extracting frames'
        } else if (value > 70 && value < 100) {
          statusMessage = 'cleaning up'
        } else if (value >= 100) {
          statusMessage = 'done'
        }
        const request = await createSignedQueryRequest(updateProgressQuery('2959d743-aba8-49a9-a2db-2d1968c24a79', `${value.toString()}% (${statusMessage})`));

        try {
          const response = await fetch(request);
          const body = await response.json();
          if (body.errors) statusCode = 400;
        } catch (error) {
          statusCode = 500;
          const body = {
            errors: [
              {
                message: error.message
              }
            ]
          };
          reject(body);
          clearInterval(intervalId);
          return;
        }

        i++;
        if (i >= 10) {
          clearInterval(intervalId);
          resolve();
        }
      }, 1000);
    });
  }

  try {
    await runIterations();
    console.log('Iterations completed successfully');
  } catch (error) {
    console.error('Iterations failed', error);
  }

  // const request = await createSignedQueryRequest(updateProgressQuery('2959d743-aba8-49a9-a2db-2d1968c24a79', '69'))

  // try {
  //   response = await fetch(request);
  //   body = await response.json();
  //   if (body.errors) statusCode = 400;
  // } catch (error) {
  //   statusCode = 500;
  //   body = {
  //     errors: [
  //       {
  //         message: error.message
  //       }
  //     ]
  //   };
  // }

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
const { SignatureV4 } = require('@aws-sdk/signature-v4');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { HttpRequest } = require('@aws-sdk/protocol-http');
const { Sha256 } = require('@aws-crypto/sha256-js');

/**
 * Makes a GraphQL request with variables to AWS AppSync
 * @param {Object} params - Request parameters
 * @param {string} params.query - The GraphQL query/mutation string
 * @param {Object} [params.variables={}] - Variables to pass to the GraphQL query
 * @param {string} params.graphqlEndpoint - The GraphQL endpoint URL
 * @param {string} [params.awsRegion] - AWS region (default: process.env.AWS_REGION)
 * @returns {Promise<{statusCode: number, body: Object}>} Response with statusCode and body
 */
async function makeRequestWithVariables({ query, variables = {}, graphqlEndpoint, awsRegion = process.env.AWS_REGION }) {
  if (!query) {
    throw new Error('GraphQL query is required');
  }
  
  if (!graphqlEndpoint) {
    throw new Error('GraphQL endpoint is required');
  }

  const endpoint = new URL(graphqlEndpoint);

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region: awsRegion,
    service: 'appsync',
    sha256: Sha256
  });

  const requestBody = JSON.stringify({ query, variables });

  const requestToBeSigned = new HttpRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      host: endpoint.host
    },
    hostname: endpoint.host,
    body: requestBody,
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
 * Simplified GraphQL request function that uses environment variables
 * @param {Object} params - Request parameters
 * @param {string} params.query - The GraphQL query/mutation string
 * @param {Object} [params.variables={}] - Variables to pass to the GraphQL query
 * @returns {Promise<{statusCode: number, body: Object}>} Response with statusCode and body
 */
async function makeGraphQLRequest({ query, variables = {} }) {
  const graphqlEndpoint = process.env.API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT;
  const awsRegion = process.env.AWS_REGION;

  if (!graphqlEndpoint) {
    throw new Error('GraphQL endpoint not found in environment variables. Expected API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT');
  }

  return makeRequestWithVariables({ 
    query, 
    variables, 
    graphqlEndpoint, 
    awsRegion 
  });
}

module.exports = {
  makeRequestWithVariables,
  makeGraphQLRequest
};

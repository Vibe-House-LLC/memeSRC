const { defaultProvider } = require("@aws-sdk/credential-provider-node");
const { SignatureV4 } = require("@aws-sdk/signature-v4");
const { HttpRequest } = require("@aws-sdk/protocol-http");
const { Sha256 } = require("@aws-crypto/sha256-js");
const axios = require("axios");


const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

/**
 * Makes a request to the GraphQL endpoint with the provided query and variables.
 * @async
 * @param {string} graphQlEndpoint - The GraphQL endpoint url.
 * @param {string} query - The GraphQL query to be executed.
 * @param {Object} [passedVars={}] - The variables to be passed along with the query.
 * @returns {Promise<Object>} - A promise that resolves to an object containing the status code and response body.
 * @throws {Error} - If an error occurs during the request.
 */
async function makeRequestWithVariables(graphQlEndpoint, query, passedVars = {}) {
  const endpoint = new URL(graphQlEndpoint);

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region: AWS_REGION,
    service: "appsync",
    sha256: Sha256,
  });

  const variables = passedVars;

  const requestToBeSigned = new HttpRequest({
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      host: endpoint.host,
    },
    hostname: endpoint.host,
    body: JSON.stringify({ query, variables }),
    path: endpoint.pathname,
  });

  const signed = await signer.sign(requestToBeSigned);

  let statusCode = 200;
  let body;
  let response;

  try {
    response = await axios.post(
      endpoint,
      {
        query,
        variables,
      },
      {
        headers: signed.headers,
      }
    );
    body = response.data;
    if (body.errors) statusCode = 400;
  } catch (error) {
    statusCode = 500;
    body = {
      errors: [
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

module.exports = {
  makeRequestWithVariables,
};
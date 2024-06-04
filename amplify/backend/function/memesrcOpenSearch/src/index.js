/* Amplify Params - DO NOT EDIT
	API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT
	API_MEMESRC_GRAPHQLAPIIDOUTPUT
	API_MEMESRC_GRAPHQLAPIKEYOUTPUT
	ENV
	REGION
Amplify Params - DO NOT EDIT */const aws = require('aws-sdk');
const { Client } = require('@opensearch-project/opensearch');
const axios = require('axios');
const csv = require('csv-parser');
const { csvToOpenSearch } = require('./indexToOpenSearch');

/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["opensearchUser","opensearchPass"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  })
  .promise();

Parameters will be of the form { Name: 'secretName', Value: 'secretValue', ... }[]
*/


/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  const indexId = event.index

  const GRAPHQL_ENDPOINT = process.env.API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT;

  /* -------------------- GraphQL Metadata Update Functions ------------------- */

  const updateV2ContentMetadataQuery = `
  mutation MyMutation($id: ID!, $isIndexing: Boolean, $lastIndexingStartedAt: AWSDateTime) {
      updateV2ContentMetadata(input: {id: $id, isIndexing: $isIndexing, lastIndexingStartedAt: $lastIndexingStartedAt}) {
      id
      isIndexing
      lastIndexingStartedAt
      title
      colorMain
      colorSecondary
      createdAt
      description
      emoji
      fontFamily
      frameCount
      status
      updatedAt
      version
      }
    }
  `

  // Call this function with the indexId when finished indexing
  const setMetadataAsFinishedProcessing = async (indexId) => {
    try {
        await makeRequestWithVariables(GRAPHQL_ENDPOINT, updateV2ContentMetadataQuery, { id: indexId, isIndexing: false })
    } catch (error) {
        console.log('ERROR SETTING METADATA AS FINISHED PROCESSING: ', error)
    }
  }

  /* -------------------------------------------------------------------------- */

  const { Parameters } = await new aws.SSM()
    .getParameters({
      Names: ["opensearchUser", "opensearchPass"].map(secretName => process.env[secretName]),
      WithDecryption: true,
    })
    .promise();

  const OPENSEARCH_USER = Parameters.find(param => param.Name === process.env.opensearchUser).Value;
  const OPENSEARCH_PASS = Parameters.find(param => param.Name === process.env.opensearchPass).Value;

  const OPENSEARCH_ENDPOINT = "https://search-memesrc-3lcaiflaubqkqafuim5oyxupwa.us-east-1.es.amazonaws.com";

  csvToOpenSearch(indexId, OPENSEARCH_USER, OPENSEARCH_PASS, OPENSEARCH_ENDPOINT)
  setMetadataAsFinishedProcessing(indexId)
  
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'CSV indexing completed successfully' }),
  };
};

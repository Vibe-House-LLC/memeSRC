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
  const inputArg = event.index;
  const csvUrl = `https://img.memesrc.com/v2/${inputArg}/_docs.csv`;
  const indexName = `v2-${inputArg}`;
  const batchSize = 100;

  try {
    const client = new Client({
      node: OPENSEARCH_ENDPOINT,
      auth: {
        username: OPENSEARCH_USER,
        password: OPENSEARCH_PASS,
      },
    });

    const response = await axios.get(csvUrl, { responseType: 'stream' });

    const rows = [];

    await new Promise((resolve, reject) => {
      response.data.pipe(csv())
        .on('data', (row) => {
          if (row.subtitle_text) {
            const decodedSubtitle = Buffer.from(row.subtitle_text, 'base64').toString('utf-8');
            row.subtitle_text = decodedSubtitle;
          }
          rows.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    const batches = [];
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const bulkBody = batch.flatMap((doc) => [
        { index: { _index: indexName } },
        doc,
      ]);
      batches.push(bulkBody);
    }

    let processedCount = 0;

    for (const bulkBody of batches) {
      const bulkResponse = await client.bulk({
        body: bulkBody,
      });
      console.log("Bulk indexing response:", bulkResponse.body);
      processedCount += bulkBody.length / 2;
      console.log(`Processed ${processedCount} out of ${rows.length} rows`);
    }

    console.log('CSV indexing completed.');

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'CSV indexing completed successfully' }),
    };
  } catch (error) {
    console.error('Error indexing CSV:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An error occurred while indexing the CSV' }),
    };
  }
};

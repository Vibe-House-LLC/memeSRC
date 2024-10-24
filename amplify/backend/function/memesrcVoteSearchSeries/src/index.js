/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["opensearch_pass"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  })
  .promise();

Parameters will be of the form { Name: 'secretName', Value: 'secretValue', ... }[]
*/


/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
const { SSMClient, GetParametersCommand } = require("@aws-sdk/client-ssm");
const { Client } = require('@opensearch-project/opensearch');

const REGION = process.env.REGION;
const ssm = new SSMClient({ region: REGION });

const indexName = `votes-series-${process.env.ENV}`;

// Function to retrieve OpenSearch credentials
async function getOpenSearchCredentials() {
    const getParametersCommand = new GetParametersCommand({
        Names: ["opensearch_pass"].map(secretName => process.env[secretName]),
        WithDecryption: true,
    });

    try {
        const response = await ssm.send(getParametersCommand);
        const opensearchPass = response.Parameters.find(p => p.Name === process.env.opensearch_pass).Value;
        return {
            password: opensearchPass,
            username: process.env.opensearch_user
        };
    } catch (error) {
        console.error('Error retrieving parameters from SSM:', error);
        throw error;
    }
}

// Helper function for OpenSearch client creation
function createOpenSearchClient(credentials) {
    return new Client({
        node: 'https://search-memesrc-3lcaiflaubqkqafuim5oyxupwa.us-east-1.es.amazonaws.com',
        auth: {
            username: credentials.username,
            password: credentials.password
        }
    });
}

exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);

    try {
        // Get search prefix from event
        const searchPrefix = event.queryStringParameters?.prefix || '';
        
        if (!searchPrefix) {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*"
                },
                body: JSON.stringify({ message: 'Search prefix is required' })
            };
        }

        // Get OpenSearch credentials
        const credentials = await getOpenSearchCredentials();
        const client = createOpenSearchClient(credentials);

        // Perform the search
        const searchResponse = await client.search({
            index: indexName,
            body: {
                query: {
                    match_phrase_prefix: {
                        name: searchPrefix.toLowerCase()
                    }
                },
                size: 350
            }
        });

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*"
            },
            body: JSON.stringify({
                hits: searchResponse.body.hits.hits.map(hit => ({
                    id: hit._id,
                    ...hit._source
                }))
            })
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*"
            },
            body: JSON.stringify({ 
                message: 'Error performing search',
                error: error.message 
            })
        };
    }
};

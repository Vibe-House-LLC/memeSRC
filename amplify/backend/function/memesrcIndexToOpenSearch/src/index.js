/* Amplify Params - DO NOT EDIT
    API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT
    API_MEMESRC_GRAPHQLAPIIDOUTPUT
    API_MEMESRC_GRAPHQLAPIKEYOUTPUT
    ENV
    FUNCTION_MEMESRCOPENSEARCH_NAME
    REGION
Amplify Params - DO NOT EDIT */


// const aws = require('aws-sdk');
const { Sha256 } = require('@aws-crypto/sha256-js');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { SignatureV4 } = require('@aws-sdk/signature-v4');
const { HttpRequest } = require('@aws-sdk/protocol-http');
const axios = require('axios');

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);

    const GRAPHQL_ENDPOINT = process.env.API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT;
    const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
    const body = event.body ? JSON.parse(event.body) : '';
    let response;

    /**
     * Makes a request to the GraphQL endpoint with the provided query and variables.
     * @async
     * @param {string} query - The GraphQL query to be executed.
     * @param {Object} [passedVars={}] - The variables to be passed along with the query.
     * @returns {Promise<Object>} - A promise that resolves to an object containing the status code and response body.
     * @throws {Error} - If an error occurs during the request.
     */
    async function makeRequestWithVariables(query, passedVars = {}) {
        const endpoint = new URL(GRAPHQL_ENDPOINT);

        const signer = new SignatureV4({
            credentials: defaultProvider(),
            region: AWS_REGION,
            service: 'appsync',
            sha256: Sha256
        });

        const variables = passedVars;

        const requestToBeSigned = new HttpRequest({
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                host: endpoint.host
            },
            hostname: endpoint.host,
            body: JSON.stringify({ query, variables }), // Pass the query and variables
            path: endpoint.pathname
        });

        const signed = await signer.sign(requestToBeSigned);

        let statusCode = 200;
        let body;
        let response;

        try {
            response = await axios.post(endpoint, {
                query,
                variables
            }, {
                headers: signed.headers
            });
            body = response.data;
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

    const setMetadataAsProcessing = async (indexId) => {
        try {
            const updateRequest = await makeRequestWithVariables(updateV2ContentMetadataQuery, { id: indexId, isIndexing: true, lastIndexingStartedAt: new Date().toISOString() })
            response = {
                statusCode: 200,
                body: updateRequest
            }
        } catch (error) {
            console.log('ERROR SETTING METADATA AS PROCESSING: ', error)
        }
    }

    const setMetadataAsFinishedProcessing = async (indexId) => {
        try {
            const updateRequest = await makeRequestWithVariables(updateV2ContentMetadataQuery, { id: indexId, isIndexing: false })
            response = {
                statusCode: 200,
                body: updateRequest
            }
        } catch (error) {
            console.log('ERROR SETTING METADATA AS FINISHED PROCESSING: ', error)
        }
    }

    /* -------------------------------------------------------------------------- */

    // TODO: Handle re-indexing here
    // From the front end I'll send the indexId through as indexId
    // You can grab it via body?.indexId

    // Call setMetadataAsProcessing(THE_INDEX_ID) when starting

    // Call setMetadataAsFinishedProcessing(THE_INDEX_ID) when finishing

    return {
        statusCode: response.statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            ...response.headers,
        },
        body: JSON.stringify(response.body),
    };



    /* ---------------------------- OLD FUNCTION CODE ---------------------------

    
    I commented out the const aws = require('aws-sdk'); from the file. If you still need it, you can add it back here and install it to the layer.
    

    const inputArg = event.queryStringParameters.index;

    const lambda = new aws.Lambda({ region: process.env.REGION });
    const params = {
        FunctionName: process.env.FUNCTION_MEMESRCOPENSEARCH_NAME,
        InvocationType: 'Event',
        Payload: JSON.stringify({ index: inputArg }),
    };

    try {
        await lambda.invoke(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'CSV indexing job started' }),
        };
    } catch (error) {
        console.error('Error starting CSV indexing job:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An error occurred while starting the CSV indexing job' }),
        };
    }

    -------------------------------------------------------------------------- */
};

/* Amplify Params - DO NOT EDIT
    API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT
    API_MEMESRC_GRAPHQLAPIIDOUTPUT
    API_MEMESRC_GRAPHQLAPIKEYOUTPUT
    ENV
    FUNCTION_MEMESRCOPENSEARCH_NAME
    REGION
Amplify Params - DO NOT EDIT */


// const aws = require('aws-sdk');
const { makeRequestWithVariables } = require('/opt/graphql-request');

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);

    const GRAPHQL_ENDPOINT = process.env.API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT;
    const body = event.body ? JSON.parse(event.body) : '';
    let response;

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
            const updateRequest = await makeRequestWithVariables(GRAPHQL_ENDPOINT, updateV2ContentMetadataQuery, { id: indexId, isIndexing: true, lastIndexingStartedAt: new Date().toISOString() })
            response = {
                statusCode: 200,
                body: updateRequest
            }
        } catch (error) {
            console.log('ERROR SETTING METADATA AS PROCESSING: ', error)
            response = {
                statusCode: 500,
                body: {
                    message: "Something went wrong when trying to update GraphQL before starting indexing."
                }
            }
        }
    }

    /* -------------------------------------------------------------------------- */
    
    const indexId = body?.indexId

    try {
        await setMetadataAsProcessing(indexId)
    } catch (error) {
        console.log(error)
    }
    
    // TODO: Handle re-indexing here

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

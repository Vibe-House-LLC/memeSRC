/* Amplify Params - DO NOT EDIT
	API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT
	API_MEMESRC_GRAPHQLAPIIDOUTPUT
	API_MEMESRC_GRAPHQLAPIKEYOUTPUT
	ENV
	FUNCTION_MEMESRCZIPEXTRACTOR_NAME
	REGION
	STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT *//* Amplify Params - DO NOT EDIT
    API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT
    API_MEMESRC_GRAPHQLAPIIDOUTPUT
    API_MEMESRC_GRAPHQLAPIKEYOUTPUT
    ENV
    REGION
    STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT */

const { makeGraphQLRequest } = require('/opt/graphql-handler');
const AWS = require('aws-sdk');

// Initialize Lambda client for invoking other functions
const lambda = new AWS.Lambda();

const getFile = `
    query GetFile($id: ID!) {
        getFile(id: $id) {
            id
            key
            unzippedPath
            status
            sourceMedia {
                id
                pendingAlias
            }
        }
    }
`;

const listAliasesQuery = `
    query ListAliases {
        listAliases {
            items {
                id
            }
            nextToken
        }
    }
`;



const listAllAliases = async () => {
    let nextToken = null;
    let aliases = [];
    do {
        const response = await makeGraphQLRequest({ query: listAliasesQuery, variables: { nextToken } });
        const { items, nextToken: newNextToken } = response.body.data.listAliases;
        aliases.push(...items);
        nextToken = newNextToken;
    } while (nextToken);
    return aliases;
};



/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    let statusCode = 200;
    let body;
    try {
        console.log(`EVENT: ${JSON.stringify(event)}`);

        // Get the file and source media ids
        const { fileId, emailAddresses } = JSON.parse(event.body);
        console.log(`FILE ID: ${fileId}`);
        console.log(`EMAIL ADDRESSES: ${emailAddresses}`);

        // Get the file details
        const { key, unzippedPath, sourceMedia, status } = (await makeGraphQLRequest({ query: getFile, variables: { id: fileId } })).body.data.getFile;
        const { id: sourceMediaId, pendingAlias } = sourceMedia;
        console.log(`FILE KEY: ${key}`);
        console.log(`FILE UNZIPPED PATH: ${unzippedPath}`);
        console.log(`FILE SOURCE MEDIA: ${JSON.stringify(sourceMedia)}`);
        console.log(`FILE STATUS: ${status}`);
        console.log(`SOURCE MEDIA ID: ${sourceMediaId}`);
        console.log(`SOURCE MEDIA PENDING ALIAS: ${pendingAlias}`);

        // Get all the aliases
        const aliases = await listAllAliases();
        console.log(`ALIASES: ${JSON.stringify(aliases)}`);

        // Check if the pending alias is already in the aliases
        const aliasAlreadyExists = aliases.some(alias => alias.id === pendingAlias);
        console.log(`DOES ALIAS ALREADY EXISTS: ${aliasAlreadyExists}`);

        // Determine the extraction location
        let extractionLocation = null;
        if (aliasAlreadyExists) {
            extractionLocation = 'protected/srcPending';
        } else {
            extractionLocation = 'protected/src';
        }
        const extractionLocationKey = `${extractionLocation}/${pendingAlias}`;
        console.log(`EXTRACTION LOCATION: ${extractionLocation}`);
        console.log(`EXTRACTION LOCATION KEY: ${extractionLocationKey}`);

        // Prepare payload for the ZipExtractor function
        const extractorPayload = {
            fileId,
            sourceMediaId,
            key,
            extractionLocation,
            extractionLocationKey,
            aliasAlreadyExists,
            pendingAlias,
            emailAddresses: emailAddresses || [],
        };
        
        console.log(`Invoking ZipExtractor with payload: ${JSON.stringify(extractorPayload)}`);
        
        // Invoke the ZipExtractor function asynchronously
        const zipExtractorFunctionName = process.env.FUNCTION_MEMESRCZIPEXTRACTOR_NAME;
        
        try {
            const invokeParams = {
                FunctionName: zipExtractorFunctionName,
                InvocationType: 'Event', // Asynchronous invocation
                Payload: JSON.stringify({
                    body: JSON.stringify(extractorPayload)
                })
            };
            
            const result = await lambda.invoke(invokeParams).promise();
            console.log(`Successfully invoked ZipExtractor function: ${zipExtractorFunctionName}`);
            console.log(`Invocation result: ${JSON.stringify(result)}`);
            
        } catch (invocationError) {
            console.error('Error invoking ZipExtractor function:', invocationError);
            throw new Error(`Failed to invoke zip extraction: ${invocationError.message}`);
        }

        body = {
            message: 'Zip extraction initiated successfully',
            extractionLocation,
            pendingAlias,
            fileId,
            sourceMediaId,
            extractionStatus: 'INITIATED',
            expectedSourceMediaStatus: aliasAlreadyExists ? 'PENDING' : 'ACTIVE'
        };
    } catch (error) {
        console.error('Error:', error);
        statusCode = 500;
        body = 'An error occurred while processing the request';
    }
    return {
        statusCode,
        //  Uncomment below to enable CORS requests
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*"
        },
        body: JSON.stringify(body),
    };
};

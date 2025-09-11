/* Amplify Params - DO NOT EDIT
    API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT
    API_MEMESRC_GRAPHQLAPIIDOUTPUT
    API_MEMESRC_GRAPHQLAPIKEYOUTPUT
    ENV
    REGION
    STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const { makeGraphQLRequest } = require('/opt/graphql-handler');
const axios = require('axios');

const AWS = require('aws-sdk');

const getSourceMediaQuery = `
    query GetSourceMedia($id: ID!) {
        getSourceMedia(id: $id) {
            id
            status
            series {
                id
                tvdbid
                slug
                name
                year
            }
        }
    }
`;

const createAliasMutation = `

    mutation CreateAlias($input: CreateAliasInput!) {
        createAlias(input: $input) {
            id
        }
    }
`;

const updateSeriesMutation = `

    mutation UpdateSeries($input: UpdateSeriesInput!) {
        updateSeries(input: $input) {
            id
        }
    }
`;

const createAlias = async (data) => {
    try {
        const aliasDetails = await makeGraphQLRequest({ query: createAliasMutation, variables: { input: data } });
        return aliasDetails?.body?.data?.createAlias || null;
    } catch (error) {
        console.error('Error creating alias:', error);
        throw error;
    }
}

const updateSeries = async (data) => {
    try {
        const seriesDetails = await makeGraphQLRequest({ query: updateSeriesMutation, variables: { input: data } });
        return seriesDetails?.body?.data?.updateSeries || null;
    } catch (error) {
        console.error('Error updating series:', error);
        throw error;
    }
}

// Initialize S3 client
const s3 = new AWS.S3();

const indexToOpenSearch = async (data) => {
    // ------------------------------------------------------------
    // TODO: Eihter 
    // ------------------------------------------------------------
    const { openSearchUser, openSearchPass } = data;
    const OPENSEARCH_USER = openSearchUser;
    const OPENSEARCH_PASS = openSearchPass;

    const OPENSEARCH_ENDPOINT = "https://search-memesrc-3lcaiflaubqkqafuim5oyxupwa.us-east-1.es.amazonaws.com";
    const alias = data.alias;
    const env = process.env.ENV === "dev" ? "dev" : "v2";
    const csvUrl = `https://img.memesrc.com/v2/${alias}/_docs.csv`;
    const indexName = `${env}-${alias}`;
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
        return true;
    } catch (error) {
        console.error('Error indexing CSV:', error);
        return false;
    }
}
exports.handler = async (event) => {
    try {
        console.log(`EVENT: ${JSON.stringify(event)}`);
        const { sourceMediaId, newAlias = false } = JSON.parse(event);
        const sourceMediaDetails = await makeGraphQLRequest({ query: getSourceMediaQuery, variables: { id: sourceMediaId } });
        const sourceMedia = sourceMediaDetails?.body?.data?.getSourceMedia;
        const alias = sourceMedia?.pendingAlias;
        const seriesData = sourceMedia?.series;
        console.log('SOURCE MEDIA DATA: ', JSON.stringify(sourceMedia));

        // TODO: Add secrets
        // Placeholders:
        const openSearchUser = 'opensearch_user';
        const openSearchPass = 'opensearch_pass';

        // Index to OpenSearch
        const indexToOpenSearchResponse = await indexToOpenSearch({
            alias,
            openSearchUser,
            openSearchPass
        });
        console.log('INDEX TO OPENSEARCH RESPONSE: ', JSON.stringify('indexToOpenSearchResponse: ', indexToOpenSearchResponse));

        // Once indexing is complete, we can add the alias (if it doesn't exist) and update the series
        if (newAlias) {
            const aliasData = await createAlias({
                id: alias,
                aliasV2ContentMetadataId: alias
            });
            console.log('ALIAS DATA: ', JSON.stringify(aliasData));

            const seriesResponse = await updateSeries({
                id: seriesData?.id,
                slug: alias,
            });
            console.log('SERIES DATA: ', JSON.stringify(seriesResponse));
        }
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }

    return {
        statusCode: 200,
        //  Uncomment below to enable CORS requests
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*"
        },
        body: JSON.stringify('Indexing Complete!'),
    };
};

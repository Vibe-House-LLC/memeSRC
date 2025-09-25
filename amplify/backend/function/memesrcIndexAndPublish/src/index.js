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
/* Amplify Params - DO NOT EDIT
    API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT
    API_MEMESRC_GRAPHQLAPIIDOUTPUT
    API_MEMESRC_GRAPHQLAPIKEYOUTPUT
    ENV
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

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const { makeGraphQLRequest } = require('/opt/graphql-handler');
const AWS = require('aws-sdk');
const { Client } = require('@opensearch-project/opensearch');
const csv = require('csv-parser');

const getSourceMediaQuery = `
    query GetSourceMedia($id: ID!) {
        getSourceMedia(id: $id) {
            id
            status
            pendingAlias
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

const updateAliasMutation = `
    mutation UpdateAlias($input: UpdateAliasInput!) {
        updateAlias(input: $input) {
            id
            status
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
        console.log('CREATING ALIAS: ', JSON.stringify(data));
        const aliasDetails = await makeGraphQLRequest({ query: createAliasMutation, variables: { input: data } });
        return aliasDetails?.body?.data?.createAlias || null;
    } catch (error) {
        console.error('Error creating alias:', error);
        throw error;
    }
}

const updateSeries = async (data) => {
    try {
        console.log('UPDATING SERIES: ', JSON.stringify(data));
        const seriesDetails = await makeGraphQLRequest({ query: updateSeriesMutation, variables: { input: data } });
        return seriesDetails?.body?.data?.updateSeries || null;
    } catch (error) {
        console.error('Error updating series:', error);
        throw error;
    }
}

const updateSourceMediaMutation = `

    mutation UpdateSourceMedia($input: UpdateSourceMediaInput!) {
        updateSourceMedia(input: $input) {
            id
            status
        }
    }
`;

const updateSourceMedia = async (data) => {
    try {
        const sourceMediaDetails = await makeGraphQLRequest({ query: updateSourceMediaMutation, variables: { input: data } });
        return sourceMediaDetails?.body?.data?.updateSourceMedia || null;
    } catch (error) {
        console.error('Error updating source media:', error);
        throw error;
    }
}

const updateAliasStatus = async (alias, status) => {
    try {
        const aliasDetails = await makeGraphQLRequest({ query: updateAliasMutation, variables: { input: { id: alias, status } } });
        return aliasDetails?.body?.data?.updateAlias || null;
    } catch (error) {
        console.error('Error updating alias:', error);
        throw error;
    }
}

// Initialize AWS clients
const s3 = new AWS.S3();
const cloudFront = new AWS.CloudFront();

const indexToOpenSearch = async (data) => {
    const { openSearchUser, openSearchPass } = data;
    const OPENSEARCH_USER = openSearchUser;
    const OPENSEARCH_PASS = openSearchPass;

    const OPENSEARCH_ENDPOINT = "https://search-memesrc-3lcaiflaubqkqafuim5oyxupwa.us-east-1.es.amazonaws.com";
    const alias = data.alias;
    const env = process.env.ENV === "beta" ? "v2" : process.env.ENV || "unknown-env";
    console.log('ENV: ', env);
    const bucketName = process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME;
    const csvKey = `protected/src/${alias}/_docs.csv`;
    console.log('CSV KEY: ', csvKey);
    const indexName = `${env}-${alias}`;
    console.log('INDEX NAME: ', indexName);
    const batchSize = 100;

    try {
        const client = new Client({
            node: OPENSEARCH_ENDPOINT,
            auth: {
                username: OPENSEARCH_USER,
                password: OPENSEARCH_PASS,
            },
        });

        const rows = [];

        const s3Stream = s3.getObject({ Bucket: bucketName, Key: csvKey }).createReadStream();

        await new Promise((resolve, reject) => {
            s3Stream
                .on('error', reject)
                .pipe(csv())
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

        if (rows.length === 0) {
            console.log('No rows found in CSV. Nothing to index.');
            return true;
        }

        // Create index if not exists
        try {
            const exists = await client.indices.exists({ index: indexName });
            if (!exists.body) {
                await client.indices.create({ index: indexName });
                console.log(`Created index: ${indexName}`);
            }
        } catch (idxErr) {
            // Some OpenSearch versions return boolean directly
            if (idxErr.meta?.statusCode !== 400) {
                console.warn('Index existence/create warning:', idxErr.message);
            }
        }

        const batches = [];
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            const bulkBody = batch.flatMap((doc) => [
                { index: { _index: indexName } },
                doc,
            ]);
            batches.push(bulkBody);
        }

        console.log('RANDOM ROW: ', rows[Math.floor(Math.random() * rows.length)]);
        console.log('ROWS: ', rows.length);

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

const getAliasQuery = `
    query GetAlias($id: ID!) {
        getAlias(id: $id) {
            id
        }
    }
`;

const checkForExistingAlias = async (alias) => {
    const aliasDetails = await makeGraphQLRequest({ query: getAliasQuery, variables: { id: alias } });
    return aliasDetails?.body?.data?.getAlias?.id ? true : false;
}

const invalidateSearchCache = async () => {
    const distributionMap = {
        dev: 'E10MX49ROQE79J',
        beta: 'E27309Q1D0QSZZ',
    };

    const env = process.env.ENV;
    const distributionId = distributionMap[env];

    if (!distributionId) {
        console.log(`No CloudFront distribution configured for env: ${env}`);
        return;
    }

    const callerReference = `search-invalidation-${distributionId}-${Date.now()}`;
    const paths = ['/search', '/search*'];

    try {
        const response = await cloudFront.createInvalidation({
            DistributionId: distributionId,
            InvalidationBatch: {
                CallerReference: callerReference,
                Paths: {
                    Quantity: paths.length,
                    Items: paths,
                },
            },
        }).promise();

        console.log(`Submitted CloudFront invalidation for /search: ${JSON.stringify(response)}`);
    } catch (error) {
        console.error('Error creating CloudFront invalidation:', error);
        throw error;
    }
}

exports.handler = async (event) => {
    let requestSourceMediaId = null;
    let requestExistingAlias = null;
    const { Parameters } = await (new AWS.SSM())
        .getParameters({
            Names: ["opensearchUser", "opensearchPass"].map(secretName => process.env[secretName]),
            WithDecryption: true,
        }).promise();

    const openSearchUser = Parameters.find(param => param.Name === process.env.opensearchUser).Value;
    const openSearchPass = Parameters.find(param => param.Name === process.env.opensearchPass).Value;

    try {
        console.log(`EVENT: ${JSON.stringify(event)}`);
        const parsedBody = JSON.parse(event?.body);
        requestSourceMediaId = parsedBody?.sourceMediaId ?? null;
        requestExistingAlias = parsedBody?.existingAlias ?? null;
        let sourceMediaDetails;
        let sourceMedia;
        let seriesData;
        // Get the source media details
        let alias = requestExistingAlias || null;

        if (alias) {
            try {
            const updateAliasResponse = await updateAliasStatus(alias, 'reindexing');
                console.log('UPDATE ALIAS RESPONSE: ', JSON.stringify(updateAliasResponse));
            } catch (error) {
                console.error('Error updating alias:', error);
                throw error;
            }
        }

        if (requestSourceMediaId) {
            sourceMediaDetails = await makeGraphQLRequest({ query: getSourceMediaQuery, variables: { id: requestSourceMediaId } });
            sourceMedia = sourceMediaDetails?.body?.data?.getSourceMedia;
            alias = sourceMedia?.pendingAlias;
            seriesData = sourceMedia?.series;
            console.log('SOURCE MEDIA DATA: ', JSON.stringify(sourceMedia));

            const updateSourceMediaResponse = await updateSourceMedia({
                id: requestSourceMediaId,
                status: 'indexing'
            });
            console.log('UPDATE SOURCE MEDIA RESPONSE: ', JSON.stringify(updateSourceMediaResponse));
        }

        if (!alias) {
            console.log('No alias found. Nothing to index.');
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*"
                },
                body: JSON.stringify('No alias found. Nothing to index. Please check the alias and try again.'),
            };
        }

        // TODO: Add secrets
        // Placeholders:
        // const openSearchUser = 'opensearch_user';
        // const openSearchPass = 'opensearch_pass';

        // Index to OpenSearch
        const indexToOpenSearchResponse = await indexToOpenSearch({
            alias,
            openSearchUser,
            openSearchPass
        });
        console.log('INDEX TO OPENSEARCH RESPONSE: ', JSON.stringify('indexToOpenSearchResponse: ', indexToOpenSearchResponse));

        if (indexToOpenSearchResponse) {
            await invalidateSearchCache();
        } else {
            console.warn('Indexing did not complete successfully; skipping CloudFront invalidation.');
        }

        // Once indexing is complete, we can add the alias (if it doesn't exist) and update the series
        if (requestSourceMediaId) {
            const doesAliasExist = await checkForExistingAlias(alias);
            if (!doesAliasExist) {
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

            const updateSourceMediaResponse = await updateSourceMedia({
                id: requestSourceMediaId,
                status: 'published'
            });
            console.log('UPDATE SOURCE MEDIA RESPONSE: ', JSON.stringify(updateSourceMediaResponse));
        }

        if (alias) {
            try {
                const updateAliasResponse = await updateAliasStatus(alias, 'indexed');
                console.log('UPDATE ALIAS RESPONSE: ', JSON.stringify(updateAliasResponse));
            } catch (error) {
                console.error('Error updating alias:', error);
                throw error;
            }
        }
    } catch (error) {
        console.error('Error:', error);
        if (requestExistingAlias) {
            try {
                const updateAliasResponse = await updateAliasStatus(requestExistingAlias, 'indexingFailed');
                console.log('UPDATE ALIAS RESPONSE: ', JSON.stringify(updateAliasResponse));
            } catch (aliasUpdateError) {
                console.error('Error updating alias:', aliasUpdateError);
                // Preserve and rethrow the original error below
            }
        }
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

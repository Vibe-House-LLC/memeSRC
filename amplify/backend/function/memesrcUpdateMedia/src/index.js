/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["tvdbApiKey","tvdbPin"].map(secretName => process.env[secretName]),
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
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const { makeGraphQLRequest } = require('/opt/graphql-handler');

const AWS = require('aws-sdk');

// Initialize S3 client
const s3 = new AWS.S3();

const createSeasonMutation = `
    mutation CreateSeason($input: CreateSeasonInput!) {
        createSeason(input: $input) {
            id
        }
    }
`;

const createEpisodeMutation = `
    mutation CreateEpisode($input: CreateEpisodeInput!) {
        createEpisode(input: $input) {
            id
        }
    }
`;

const updateSourceMediaMutation = `
    mutation UpdateSourceMedia($input: UpdateSourceMediaInput!) {
        updateSourceMedia(input: $input) {
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

const updateSeasonMutation = `
    mutation UpdateSeason($input: UpdateSeasonInput!) {
        updateSeason(input: $input) {
            id
        }
    }
`;

const updateEpisodeMutation = `
    mutation UpdateEpisode($input: UpdateEpisodeInput!) {
        updateEpisode(input: $input) {
            id
        }
    }
`;

const getAliasQuery = `
    query GetAlias($id: ID!) {
        getAlias(id: $id) {
            id
        }
    }
`;

const getV2ContentMetadataQuery = `
    query GetV2ContentMetadata($id: ID!) {
        getV2ContentMetadata(id: $id) {
            id
        }
    }
`;

const createV2ContentMetadataMutation = `
    mutation CreateV2ContentMetadata($input: CreateV2ContentMetadataInput!) {
        createV2ContentMetadata(input: $input) {
            id
        }
    }
`;

const updateV2ContentMetadataMutation = `
    mutation UpdateV2ContentMetadata($input: UpdateV2ContentMetadataInput!) {
        updateV2ContentMetadata(input: $input) {
            id
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

const getSeasonFromTvdb = async (tvdbid, season) => {
    // TODO: Hit the https://api4.thetvdb.com/v4/series/[tvdbid]/artworks?lang=eng&type=7
    // Grab the array data.artworks
    // const seasonIds = series.data.artworks.map(artwork => artwork.seasonId)
    // We'll need to hit the https://api4.thetvdb.com/v4/seasons/[seasonId] to get the description, image, year, and tvdbid
    // const seasonData = seasons.map(season => {
    //     return { 
    //         image: season.data.image,
    //         year: season.data.year,
    //         tvdbid: season.data.id,
    //         seasonNumber: season.data.seasonNumber
    //     }
    // }).sort((a, b) => a.seasonNumber - b.seasonNumber)
    // return seasonData
}

const getEpisodeFromTvdb = async (tvdbid, season, episode) => {
    // TODO: Hit the https://api4.thetvdb.com/v4/series/[tvdbid]/episodes/default?page=0&season=[season]&episodeNumber=[episode]
    // Grab the array data.episodes
    // if (episodes && episodes.length > 0) {
    //     const episodeData = episodes[0]
    //     return {
    //         name: episodeData.data.name,
    //         image: episodeData.data.image,
    //         year: episodeData.data.year,
    //         description: episodeData.data.overview,
    //         tvdbid: episodeData.data.id,
    //         episodeNumber: episodeData.data.number
    //     }
    // }
}

const getSeasonsFromDocs = async (docs, tvdbid) => {
    // TODO: Go through the docs and find all of the unique season numbers. They'll be under the season column. There will be a lot of lines with the same season number, so we need to make sure we're not adding the same season number multiple times.
    const seasons = new Set();
    for (const doc of docs) {
        if (doc.season && !seasons.has(doc.season)) {
            seasons.add(doc.season);
        }
    }
    // Get the description, image, year, and tvdbid from the tvdb api
    const seasonsData = seasons.map(async (season) => {
        const seasonData = await getSeasonFromTvdb(tvdbid, season);
        return seasonData;
    });
    return Array.from(seasons);
}

const addSeason = async (data) => {

}

const addEpisode = async (data) => {

}

const updateSeason = async (data) => {

}

const updateEpisode = async (data) => {

}

const updateSeries = async (data) => {

}

const getSeriesCsv = async (alias, newSeries = false) => {
    const csvPath = newSeries ? `protected/src/${alias}/_docs.csv` : `protected/srcPending/${alias}/_docs.csv`;
    // TODO: Get the CSV from S3 turn it into an array of objects
}

const getSeriesMetadata = async (alias, newSeries = false) => {
    const metadataPath = newSeries ? `protected/src/${alias}/00_metadata.json` : `protected/srcPending/${alias}/00_metadata.json`;
    // TODO: Get the metadata from S3 turn it into an object
}

const getV2ContentMetadata = async (alias) => {
    const v2ContentMetadataDetails = await makeGraphQLRequest({ query: getV2ContentMetadataQuery, variables: { id: alias } });
    return v2ContentMetadataDetails?.body?.data?.getV2ContentMetadata || null;
}

const createV2ContentMetadata = async (data) => {
    const v2ContentMetadataDetails = await makeGraphQLRequest({ query: createV2ContentMetadataMutation, variables: { input: data } });
    return v2ContentMetadataDetails?.body?.data?.createV2ContentMetadata || null;
}

const updateV2ContentMetadata = async (data) => {
    const v2ContentMetadataDetails = await makeGraphQLRequest({ query: updateV2ContentMetadataMutation, variables: { input: data } });
    return v2ContentMetadataDetails?.body?.data?.updateV2ContentMetadata || null;
}

const getTvdbToken = async (tvdbApiKey, tvdbPin) => {
    // TODO: Hit the https://api4.thetvdb.com/v4/login with the tvdbApiKey and tvdbPin
    // Grab the token from the response
    // Return the token
}

const processNewSeries = async (data) => {
    const { fileId, sourceMediaId, seasons, series, processAll, alias, tvdbApiKey, tvdbPin } = data;
    try {
        const docs = await getSeriesCsv(alias, true);
        const metadata = await getSeriesMetadata(alias, true);
        // Check to see if the v2 content metadata exists
        const v2ContentMetadata = await getV2ContentMetadata(alias);
        if (v2ContentMetadata?.id) {
            // Update the v2 content metadata
            await updateV2ContentMetadata({
                id: alias,
                title: metadata?.title,
                description: metadata?.description,
                frameCount: metadata?.frameCount,
                colorMain: metadata?.colorMain,
                colorSecondary: metadata?.colorSecondary,
                emoji: metadata?.emoji,
                status: metadata?.status || 0,
                version: metadata?.version || 2,
                fontFamily: metadata?.fontFamily
            });
        } else {
            // Create the v2 content metadata
            await createV2ContentMetadata({
                id: alias,
                title: metadata?.title,
                description: metadata?.description,
                frameCount: metadata?.frameCount,
                colorMain: metadata?.colorMain,
                colorSecondary: metadata?.colorSecondary,
                emoji: metadata?.emoji,
                status: metadata?.status || 0,
                version: metadata?.version || 2,
                fontFamily: metadata?.fontFamily
            });
        }

        // Create the seasons

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

const processExistingSeries = async (data) => {
    const { fileId, sourceMediaId, seasons, series, processAll, alias } = data;
}

exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);

    const { Parameters } = await (new AWS.SSM())
        .getParameters({
            Names: ["tvdbApiKey", "tvdbPin"].map(secretName => process.env[secretName]),
            WithDecryption: true,
        })
        .promise();

    const tvdbApiKey = Parameters.find(param => param.Name === process.env.tvdbApiKey).Value;
    const tvdbPin = Parameters.find(param => param.Name === process.env.tvdbPin).Value;

    const { fileId, sourceMediaId, seasons = [], series = null, processAll = false, alias } = event?.body;
    let statusCode = 500;
    let body;

    try {
        const aliasResponse = await makeGraphQLRequest({ query: getAliasQuery, variables: { id: alias } });
        const aliasData = aliasResponse?.body?.data?.getAlias;
        console.log('ALIAS DATA: ', JSON.stringify(aliasData));

        if (aliasData?.id) {
            statusCode = 200;
            await processNewSeries({
                fileId,
                sourceMediaId,
                seasons,
                series,
                processAll,
                alias,
                tvdbApiKey,
                tvdbPin
            });
        } else {
            statusCode = 200;
            await processExistingSeries({
                fileId,
                sourceMediaId,
                seasons,
                series,
                processAll,
                alias,
                tvdbApiKey,
                tvdbPin
            });
        }
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

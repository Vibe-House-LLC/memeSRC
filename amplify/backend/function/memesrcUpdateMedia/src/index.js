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

const getSeriesQuery = `
    query GetSeries($id: ID!) {
        getSeries(id: $id) {
            id
        }
    }
`;

const getSeasonQuery = `
    query GetSeason($id: ID!) {
        getSeason(id: $id) {
            id
        }
    }
`;

const createSeasonMutation = `
    mutation CreateSeason($input: CreateSeasonInput!) {
        createSeason(input: $input) {
            id
        }
    }
`;

const getEpisodeQuery = `
    query GetEpisode($id: ID!) {
        getEpisode(id: $id) {
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

const createSeriesMutation = `
    mutation CreateSeries($input: CreateSeriesInput!) {
        createSeries(input: $input) {
            id
        }
    }
`;

const getSourceMediaQuery = `
    query GetSourceMedia($id: ID!) {
        getSourceMedia(id: $id) {
            id
            pendingAlias
            series {
                id
                tvdbid
                slug
                name
                year
            }
            files {
                id
                key
                unzippedPath
                status
            }
            status
            user {
                id
                username
                email
            }
        }
    }
`;

const createSeriesContributorsMutation = `
    mutation CreateSeriesContributors($input: CreateSeriesContributorsInput!) {
        createSeriesContributors(input: $input) {
            id
        }
    }
`;

const getSeasonFromTvdb = async (tvdbid, season, token) => {
    try {
        // First, get the series artworks to find season IDs
        const artworksResponse = await fetch(`https://api4.thetvdb.com/v4/series/${tvdbid}/artworks?lang=eng&type=7`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!artworksResponse.ok) {
            throw new Error(`TVDB artworks request failed: ${artworksResponse.status} ${artworksResponse.statusText}`);
        }

        const artworksData = await artworksResponse.json();
        const artworks = artworksData.data?.artworks || [];

        // Find season IDs from artworks
        const seasonIds = artworks
            .filter(artwork => artwork.seasonId)
            .map(artwork => artwork.seasonId);

        if (seasonIds.length === 0) {
            return null;
        }

        // Get season data for each season ID
        const seasonPromises = seasonIds.map(async (seasonId) => {
            const seasonResponse = await fetch(`https://api4.thetvdb.com/v4/seasons/${seasonId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!seasonResponse.ok) {
                console.warn(`Failed to fetch season ${seasonId}: ${seasonResponse.status}`);
                return null;
            }

            const seasonData = await seasonResponse.json();
            const data = seasonData?.data;

            return {
                image: data?.image,
                year: data?.year,
                tvdbid: data?.id,
                seasonNumber: data?.seasonNumber
            };
        });

        const seasons = await Promise.all(seasonPromises);
        const validSeasons = seasons.filter(s => s !== null);

        // Find the specific season we're looking for
        const targetSeason = validSeasons.find(s => s.seasonNumber === season);
        return targetSeason || null;
    } catch (error) {
        console.error('Error getting season from TVDB:', error);
        throw error;
    }
}

const getEpisodeFromTvdb = async (tvdbid, season, episode, token) => {
    try {
        const response = await fetch(`https://api4.thetvdb.com/v4/series/${tvdbid}/episodes/default?page=0&season=${season}&episodeNumber=${episode}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`TVDB episodes request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const episodes = data.data?.episodes || [];

        if (episodes && episodes.length > 0) {
            const episodeData = episodes[0];
            return {
                name: episodeData.name,
                image: episodeData.image,
                year: episodeData.year,
                description: episodeData.overview,
                tvdbid: episodeData.id,
                episodeNumber: episodeData.number
            };
        }

        return null;
    } catch (error) {
        console.error('Error getting episode from TVDB:', error);
        throw error;
    }
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
    return Array.from(seasonsData);
}

const getEpisodesFromDocs = async (docs, tvdbid, token) => {
    try {
        // Create a map to group episodes by season
        const seasonEpisodesMap = new Map();

        // Go through docs and group episodes by season
        for (const doc of docs) {
            if (doc.season && doc.episode) {
                const seasonNum = doc.season;
                const episodeNum = doc.episode;

                if (!seasonEpisodesMap.has(seasonNum)) {
                    seasonEpisodesMap.set(seasonNum, new Set());
                }

                seasonEpisodesMap.get(seasonNum).add(episodeNum);
            }
        }

        // Convert to the desired format: { season: [episodes] }
        const result = {};

        for (const [season, episodeSet] of seasonEpisodesMap.entries()) {
            const episodeNumbers = Array.from(episodeSet).sort((a, b) => a - b);

            // Fetch episode data from TVDB for each episode
            const episodeDataPromises = episodeNumbers.map(async (episodeNumber) => {
                try {
                    const episodeData = await getEpisodeFromTvdb(tvdbid, season, episodeNumber, token);
                    return episodeData;
                } catch (error) {
                    console.warn(`Failed to fetch episode data for S${season}E${episodeNumber}:`, error);
                    return null;
                }
            });

            const episodeData = await Promise.all(episodeDataPromises);
            // Filter out any null results from failed API calls
            result[season] = episodeData.filter(episode => episode !== null);
        }

        return result;
    } catch (error) {
        console.error('Error getting episodes from docs:', error);
        throw error;
    }
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

const getSourceMedia = async (id) => {
    const sourceMediaDetails = await makeGraphQLRequest({ query: getSourceMediaQuery, variables: { id } });
    return sourceMediaDetails?.body?.data?.getSourceMedia || null;
}

const getSeriesCsv = async (newSeries = false, alias) => {
    try {
        const csvPath = newSeries ? `protected/src/${alias}/_docs.csv` : `protected/srcPending/${alias}/_docs.csv`;
        
        const params = {
            Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
            Key: csvPath
        };
        
        const response = await s3.getObject(params).promise();
        const csvContent = response.Body.toString('utf-8');
        
        // Parse CSV content into array of objects
        const lines = csvContent.trim().split('\n');
        if (lines.length === 0) {
            return [];
        }
        
        // Get headers from first line
        const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
        
        // Parse data rows
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(value => value.trim().replace(/"/g, ''));
            const row = {};
            
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            
            data.push(row);
        }
        
        return data;
    } catch (error) {
        console.error('Error getting CSV from S3:', error);
        throw error;
    }
}

const getSeriesMetadata = async (newSeries = false, alias) => {
    try {
        const metadataPath = newSeries ? `protected/src/${alias}/00_metadata.json` : `protected/srcPending/${alias}/00_metadata.json`;
        
        const params = {
            Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
            Key: metadataPath
        };
        
        const response = await s3.getObject(params).promise();
        const jsonContent = response.Body.toString('utf-8');
        
        // Parse JSON content into object
        const metadata = JSON.parse(jsonContent);
        
        return metadata;
    } catch (error) {
        console.error('Error getting metadata from S3:', error);
        throw error;
    }
}

const getV2ContentMetadata = async (alias) => {
    try {
        const v2ContentMetadataDetails = await makeGraphQLRequest({ query: getV2ContentMetadataQuery, variables: { id: alias } });
        return v2ContentMetadataDetails?.body?.data?.getV2ContentMetadata || null;
    } catch (error) {
        console.error('Error getting v2 content metadata:', error);
        throw error;
    }
}

const createV2ContentMetadata = async (data) => {
    try {
        const v2ContentMetadataDetails = await makeGraphQLRequest({ query: createV2ContentMetadataMutation, variables: { input: data } });
        return v2ContentMetadataDetails?.body?.data?.createV2ContentMetadata || null;
    } catch (error) {
        console.error('Error creating v2 content metadata:', error);
        throw error;
    }
}

const updateV2ContentMetadata = async (data) => {
    try {
    const v2ContentMetadataDetails = await makeGraphQLRequest({ query: updateV2ContentMetadataMutation, variables: { input: data } });
        return v2ContentMetadataDetails?.body?.data?.updateV2ContentMetadata || null;
    } catch (error) {
        console.error('Error updating v2 content metadata:', error);
        throw error;
    }
}

const getTvdbToken = async (tvdbApiKey, tvdbPin) => {
    try {
        const response = await fetch('https://api4.thetvdb.com/v4/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                apikey: tvdbApiKey,
                pin: tvdbPin
            })
        });

        if (!response.ok) {
            throw new Error(`TVDB login failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.data.token;
    } catch (error) {
        console.error('Error getting TVDB token:', error);
        throw error;
    }
}

const createAlias = async (alias) => {
    try {
        const aliasDetails = await makeGraphQLRequest({ query: createAliasMutation, variables: { input: { id: alias, aliasV2ContentMetadataId: alias } } });
        return aliasDetails?.body?.data?.createAlias || null;
    } catch (error) {
        console.error('Error creating alias:', error);
        throw error;
    }
}

const createSeriesContributors = async (data) => {
    try {
        const seriesContributorsDetails = await makeGraphQLRequest({ query: createSeriesContributorsMutation, variables: { input: data } });
        return seriesContributorsDetails?.body?.data?.updateSeriesContributors || null;
    } catch (error) {
        console.error('Error updating series contributors:', error);
        throw error;
    }
}

const moveSeasonFilesFromPendingToSrc = async (alias, seasons) => {
    try {
        console.log(`Moving season files for alias: ${alias}, seasons: ${JSON.stringify(seasons)}`);
        
        const bucketName = process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME;
        
        // Process each season
        for (const season of seasons) {
            console.log(`Processing season ${season} for alias ${alias}`);
            
            // List all files in the pending season folder
            const listParams = {
                Bucket: bucketName,
                Prefix: `protected/srcPending/${alias}/${season}/`
            };
            
            const listedObjects = await s3.listObjectsV2(listParams).promise();
            
            if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
                console.log(`No files found for season ${season} in pending folder`);
                continue;
            }
            
            // Copy each file to the src folder
            for (const object of listedObjects.Contents) {
                const sourceKey = object.Key;
                const destinationKey = sourceKey.replace(`protected/srcPending/${alias}/${season}/`, `protected/src/${alias}/${season}/`);
                
                console.log(`Copying ${sourceKey} to ${destinationKey}`);
                
                // Copy the file
                const copyParams = {
                    Bucket: bucketName,
                    CopySource: `${bucketName}/${sourceKey}`,
                    Key: destinationKey
                };
                
                await s3.copyObject(copyParams).promise();
                
                // Delete the original file from pending
                const deleteParams = {
                    Bucket: bucketName,
                    Key: sourceKey
                };
                
                await s3.deleteObject(deleteParams).promise();
                console.log(`Moved ${sourceKey} to ${destinationKey}`);
            }
        }
        
        console.log(`Successfully moved all files for seasons: ${JSON.stringify(seasons)}`);
    } catch (error) {
        console.error('Error moving season files:', error);
        throw error;
    }
}

const updateSeriesDocsWithNewSeasons = async (alias, seasons) => {
    try {
        console.log(`Updating series docs for alias: ${alias}, seasons: ${JSON.stringify(seasons)}`);
        
        const bucketName = process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME;
        
        // Get existing docs from src folder
        let existingDocs = [];
        try {
            existingDocs = await getSeriesCsv(true, alias); // true = newSeries (src folder)
        } catch (error) {
            console.log('No existing docs found, starting with empty array');
        }
        
        // Remove rows for seasons we're updating
        const filteredDocs = existingDocs.filter(doc => !seasons.includes(parseInt(doc.season)));
        console.log(`Filtered out ${existingDocs.length - filteredDocs.length} existing rows for seasons being updated`);
        
        // Get new docs from pending folder for each season
        let newDocs = [];
        for (const season of seasons) {
            try {
                // Get docs from the pending season folder
                const seasonDocsPath = `protected/srcPending/${alias}/${season}/_docs.csv`;
                const params = {
                    Bucket: bucketName,
                    Key: seasonDocsPath
                };
                
                const response = await s3.getObject(params).promise();
                const csvContent = response.Body.toString('utf-8');
                
                // Parse CSV content
                const lines = csvContent.trim().split('\n');
                if (lines.length > 1) { // Skip if only header
                    const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
                    
                    for (let i = 1; i < lines.length; i++) {
                        const values = lines[i].split(',').map(value => value.trim().replace(/"/g, ''));
                        const row = {};
                        
                        headers.forEach((header, index) => {
                            row[header] = values[index] || '';
                        });
                        
                        newDocs.push(row);
                    }
                }
            } catch (error) {
                console.warn(`No docs found for season ${season}:`, error.message);
            }
        }
        
        // Combine filtered existing docs with new docs
        const combinedDocs = [...filteredDocs, ...newDocs];
        
        // Sort by season then episode then subtitle_index
        combinedDocs.sort((a, b) => {
            const seasonA = parseInt(a.season) || 0;
            const seasonB = parseInt(b.season) || 0;
            if (seasonA !== seasonB) {
                return seasonA - seasonB;
            }
            const episodeA = parseInt(a.episode) || 0;
            const episodeB = parseInt(b.episode) || 0;
            if (episodeA !== episodeB) {
                return episodeA - episodeB;
            }
            const subtitleIndexA = parseInt(a.subtitle_index) || 0;
            const subtitleIndexB = parseInt(b.subtitle_index) || 0;
            return subtitleIndexA - subtitleIndexB;
        });
        
        // Convert back to CSV format
        if (combinedDocs.length > 0) {
            const headers = Object.keys(combinedDocs[0]);
            const csvLines = [headers.join(',')];
            
            combinedDocs.forEach(doc => {
                const row = headers.map(header => `"${doc[header] || ''}"`).join(',');
                csvLines.push(row);
            });
            
            const csvContent = csvLines.join('\n');
            
            // Write updated docs back to src folder
            const docsPath = `protected/src/${alias}/_docs.csv`;
            const putParams = {
                Bucket: bucketName,
                Key: docsPath,
                Body: csvContent,
                ContentType: 'text/csv'
            };
            
            await s3.putObject(putParams).promise();
            console.log(`Updated docs with ${combinedDocs.length} total rows`);
        }
        
    } catch (error) {
        console.error('Error updating series docs:', error);
        throw error;
    }
}

const updateSourceMedia = async (data) => {
    try {
        const sourceMediaDetails = await makeGraphQLRequest({ query: updateSourceMediaMutation, variables: { input: data } });
        return sourceMediaDetails?.body?.data?.updateSourceMedia || null;
    } catch (error) {
        console.error('Error updating source media:', error);
        throw error;
    }
}



const processNewSeries = async (data) => {
    const { sourceMediaId } = data;
    try {
        const sourceMedia = await getSourceMedia(sourceMediaId);
        const seriesData = sourceMedia?.series;
        const userData = sourceMedia?.user;
        const alias = sourceMedia?.pendingAlias;
        // const docs = await getSeriesCsv(alias, true);
        const metadata = await getSeriesMetadata(alias, true);
        // Check to see if the v2 content metadata exists
        const v2ContentMetadata = await getV2ContentMetadata(alias);
        if (v2ContentMetadata?.id) {
            // Update the v2 content metadata
            const v2ContentMetadataData = await updateV2ContentMetadata({
                id: alias,
                title: metadata?.title,
                description: metadata?.description,
                frameCount: metadata?.frameCount,
                colorMain: metadata?.colorMain,
                colorSecondary: metadata?.colorSecondary,
                emoji: metadata?.emoji,
                status: metadata?.status || 0,
                version: metadata?.version || 2,
                fontFamily: metadata?.fontFamily,
                seriesId: seriesData?.id
            });
            console.log('V2 CONTENT METADATA DATA: ', JSON.stringify(v2ContentMetadataData));
        } else {
            // Create the v2 content metadata
            const v2ContentMetadataData = await createV2ContentMetadata({
                id: alias,
                title: metadata?.title,
                description: metadata?.description,
                frameCount: metadata?.frameCount,
                colorMain: metadata?.colorMain,
                colorSecondary: metadata?.colorSecondary,
                emoji: metadata?.emoji,
                status: metadata?.status || 0,
                version: metadata?.version || 2,
                fontFamily: metadata?.fontFamily,
                seriesId: seriesData?.id
            });
            console.log('V2 CONTENT METADATA DATA: ', JSON.stringify(v2ContentMetadataData));
        }

        const updateSourceMediaResponse = await updateSourceMedia({
            id: sourceMediaId,
            status: 'indexing'
        });
        console.log('SOURCE MEDIA DATA: ', JSON.stringify(updateSourceMediaResponse));

        // const aliasData = await createAlias({
        //     id: alias,
        //     name: metadata?.title
        // });
        // console.log('ALIAS DATA: ', JSON.stringify(aliasData));

        // const seriesResponse = await updateSeries({
        //     id: seriesData?.id,
        //     slug: alias,
        // });
        // console.log('SERIES DATA: ', JSON.stringify(seriesResponse));

        const seriesContributorsResponse = await createSeriesContributors({
            seriesId: seriesData?.id,
            userDetailsId: userData?.id
        });
        console.log('SERIES CONTRIBUTORS DATA: ', JSON.stringify(seriesContributorsResponse));

        // THIS WOULD BE THE CALL TO REINDEX ON OPENSEARCH

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

const processExistingSeries = async (data) => {
    const { sourceMediaId, seasons } = data;
    try {
        const sourceMedia = await getSourceMedia(sourceMediaId);
        const seriesData = sourceMedia?.series;
        const userData = sourceMedia?.user;
        const alias = sourceMedia?.pendingAlias;
        // const docs = await getSeriesCsv(alias, true); // Not needed since we handle docs in updateSeriesDocsWithNewSeasons
        const metadata = await getSeriesMetadata(alias, true);
        // Check to see if the v2 content metadata exists
        const v2ContentMetadata = await getV2ContentMetadata(alias);
        if (v2ContentMetadata?.id) {
            // Update the v2 content metadata
            const v2ContentMetadataData = await updateV2ContentMetadata({
                id: alias,
                title: metadata?.title,
                description: metadata?.description,
                frameCount: metadata?.frameCount,
                colorMain: metadata?.colorMain,
                colorSecondary: metadata?.colorSecondary,
                emoji: metadata?.emoji,
                status: metadata?.status || 0,
                version: metadata?.version || 2,
                fontFamily: metadata?.fontFamily,
                seriesId: seriesData?.id
            });
            console.log('V2 CONTENT METADATA DATA: ', JSON.stringify(v2ContentMetadataData));
        } else {
            // Create the v2 content metadata
            const v2ContentMetadataData = await createV2ContentMetadata({
                id: alias,
                title: metadata?.title,
                description: metadata?.description,
                frameCount: metadata?.frameCount,
                colorMain: metadata?.colorMain,
                colorSecondary: metadata?.colorSecondary,
                emoji: metadata?.emoji,
                status: metadata?.status || 0,
                version: metadata?.version || 2,
                fontFamily: metadata?.fontFamily,
                seriesId: seriesData?.id
            });
            console.log('V2 CONTENT METADATA DATA: ', JSON.stringify(v2ContentMetadataData));
        }

        // Move season files from pending to src folder for approved seasons
        await moveSeasonFilesFromPendingToSrc(alias, seasons);
        
        // Update the series docs CSV by removing existing season rows and adding new ones
        await updateSeriesDocsWithNewSeasons(alias, seasons);

        const seriesContributorsResponse = await createSeriesContributors({
            seriesId: seriesData?.id,
            userDetailsId: userData?.id
        });
        console.log('SERIES CONTRIBUTORS DATA: ', JSON.stringify(seriesContributorsResponse));

        // THIS WOULD BE THE CALL TO REINDEX ON OPENSEARCH

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
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
                sourceMediaId
            });
        } else {
            statusCode = 200;
            await processExistingSeries({
                sourceMediaId,
                seasons,
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

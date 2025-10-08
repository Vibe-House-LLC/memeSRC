/* Amplify Params - DO NOT EDIT
    API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT
    API_MEMESRC_GRAPHQLAPIIDOUTPUT
    API_MEMESRC_GRAPHQLAPIKEYOUTPUT
    ENV
    FUNCTION_MEMESRCINDEXANDPUBLISH_NAME
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

// Initialize S3 client
const s3 = new AWS.S3();

// Initialize Lambda client
const lambda = new AWS.Lambda();

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
            identityId
            series {
                id
                tvdbid
                slug
                name
                year
            }
            files {
                items {
                    id
                    key
                    unzippedPath
                    status
                }
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

const getSeriesMetadata = async (newSeries = false, alias, path) => {
    try {
        const metadataPath = newSeries ? `protected/src/${alias}/00_metadata.json` : `${path}/00_metadata.json`;

        const params = {
            Bucket: process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME,
            Key: metadataPath
        };

        const response = await s3.getObject(params).promise();
        const jsonContent = response.Body.toString('utf-8');

        // Parse JSON content into object
        const metadata = JSON.parse(jsonContent);
        console.log('METADATA: ', JSON.stringify(metadata));

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
        console.log('V2 CONTENT METADATA DETAILS: ', JSON.stringify(v2ContentMetadataDetails));
        return v2ContentMetadataDetails?.body?.data?.createV2ContentMetadata || null;
    } catch (error) {
        console.error('Error creating v2 content metadata:', error);
        throw error;
    }
}

const updateV2ContentMetadata = async (data) => {
    try {
        const v2ContentMetadataDetails = await makeGraphQLRequest({ query: updateV2ContentMetadataMutation, variables: { input: data } });
        console.log('V2 CONTENT METADATA DETAILS: ', JSON.stringify(v2ContentMetadataDetails));
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
        console.log('SERIES CONTRIBUTORS DETAILS: ', JSON.stringify(seriesContributorsDetails));
        return seriesContributorsDetails?.body?.data?.createSeriesContributors || null;
    } catch (error) {
        console.error('Error updating series contributors:', error);
        throw error;
    }
}

const moveEpisodeFilesFromPendingToSrc = async (alias, episodes, path) => {
    try {
        console.log(`Moving episode files for alias: ${alias}, episodes: ${JSON.stringify(episodes)}`);

        const bucketName = process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME;

        // Process each episode
        for (const episode of episodes) {
            const { season, episode: episodeNumber } = episode;
            console.log(`Processing season ${season}, episode ${episodeNumber} for alias ${alias}`);

            // List all files in the pending episode folder
            const listParams = {
                Bucket: bucketName,
                Prefix: `${path}/${season}/${episodeNumber}/`
            };

            const listedObjects = await s3.listObjectsV2(listParams).promise();

            if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
                console.log(`No files found for season ${season}, episode ${episodeNumber} in pending folder`);
                continue;
            }

            // Copy each file to the src folder
            for (const object of listedObjects.Contents) {
                const sourceKey = object.Key;
                const destinationKey = sourceKey.replace(`${path}/${season}/${episodeNumber}/`, `protected/src/${alias}/${season}/${episodeNumber}/`);

                console.log(`Copying ${sourceKey} to ${destinationKey}`);

                // Copy the file
                const copyParams = {
                    Bucket: bucketName,
                    CopySource: `${bucketName}/${sourceKey}`,
                    Key: destinationKey
                };

                await s3.copyObject(copyParams).promise();

                // Delete the original file from pending
                // const deleteParams = {
                //     Bucket: bucketName,
                //     Key: sourceKey
                // };

                // await s3.deleteObject(deleteParams).promise();
                // console.log(`Moved ${sourceKey} to ${destinationKey}`);
            }
        }

        console.log(`Successfully moved all files for episodes: ${JSON.stringify(episodes)}`);
    } catch (error) {
        console.error('Error moving episode files:', error);
        throw error;
    }
}

const updateEpisodeDocsFromPending = async (alias, season, episodeNumber, path) => {
    try {
        console.log(`Updating episode docs for alias: ${alias}, season: ${season}, episode: ${episodeNumber}`);

        const bucketName = process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME;

        // Get docs from the pending episode folder
        const pendingEpisodeDocsPath = `${path}/${season}/${episodeNumber}/_docs.csv`;
        const srcEpisodeDocsPath = `protected/src/${alias}/${season}/${episodeNumber}/_docs.csv`;

        try {
            const params = {
                Bucket: bucketName,
                Key: pendingEpisodeDocsPath
            };

            const response = await s3.getObject(params).promise();
            const csvContent = response.Body.toString('utf-8');

            // Write the episode docs directly to src folder
            const putParams = {
                Bucket: bucketName,
                Key: srcEpisodeDocsPath,
                Body: csvContent,
                ContentType: 'text/csv'
            };

            await s3.putObject(putParams).promise();
            console.log(`Updated episode docs for season ${season}, episode ${episodeNumber}`);

            return csvContent;
        } catch (error) {
            console.warn(`No docs found for season ${season}, episode ${episodeNumber}:`, error.message);
            return null;
        }

    } catch (error) {
        console.error(`Error updating episode docs for season ${season}, episode ${episodeNumber}:`, error);
        throw error;
    }
}

const updateSeasonDocsFromEpisodes = async (alias, season) => {
    try {
        console.log(`Regenerating season ${season} docs for alias: ${alias} from episode docs`);

        const bucketName = process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME;

        // List all episode folders in this season
        const listParams = {
            Bucket: bucketName,
            Prefix: `protected/src/${alias}/${season}/`,
            Delimiter: '/'
        };

        const listedObjects = await s3.listObjectsV2(listParams).promise();
        const episodeFolders = (listedObjects.CommonPrefixes || [])
            .map(prefix => prefix.Prefix.split('/').slice(-2, -1)[0])
            .filter(folder => /^\d+$/.test(folder)) // Only numeric episode folders
            .sort((a, b) => parseInt(a) - parseInt(b));

        console.log(`Found episode folders in season ${season}: ${episodeFolders.join(', ')}`);

        // Collect docs from all episodes in this season
        let allSeasonDocs = [];
        for (const episode of episodeFolders) {
            try {
                const episodeDocsPath = `protected/src/${alias}/${season}/${episode}/_docs.csv`;
                const params = {
                    Bucket: bucketName,
                    Key: episodeDocsPath
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

                        allSeasonDocs.push(row);
                    }
                }
            } catch (error) {
                console.warn(`No docs found for season ${season}, episode ${episode}:`, error.message);
            }
        }

        // Sort by episode then subtitle_index
        allSeasonDocs.sort((a, b) => {
            const episodeA = parseInt(a.episode) || 0;
            const episodeB = parseInt(b.episode) || 0;
            if (episodeA !== episodeB) {
                return episodeA - episodeB;
            }
            const subtitleIndexA = parseInt(a.subtitle_index) || 0;
            const subtitleIndexB = parseInt(b.subtitle_index) || 0;
            return subtitleIndexA - subtitleIndexB;
        });

        // Convert back to CSV format and write season docs
        if (allSeasonDocs.length > 0) {
            const headers = Object.keys(allSeasonDocs[0]);
            const csvLines = [headers.join(',')];

            allSeasonDocs.forEach(doc => {
                const row = headers.map(header => `"${doc[header] || ''}"`).join(',');
                csvLines.push(row);
            });

            const csvContent = csvLines.join('\n');

            // Write season docs
            const seasonDocsPath = `protected/src/${alias}/${season}/_docs.csv`;
            const putParams = {
                Bucket: bucketName,
                Key: seasonDocsPath,
                Body: csvContent,
                ContentType: 'text/csv'
            };

            await s3.putObject(putParams).promise();
            console.log(`Regenerated season ${season} docs with ${allSeasonDocs.length} total rows from ${episodeFolders.length} episodes`);
        }

    } catch (error) {
        console.error(`Error regenerating season ${season} docs from episodes:`, error);
        throw error;
    }
}

const regenerateRootDocsFromSeasons = async (alias) => {
    try {
        console.log(`Regenerating root docs for alias: ${alias} from all season docs`);

        const bucketName = process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME;

        // List all season folders in src
        const listParams = {
            Bucket: bucketName,
            Prefix: `protected/src/${alias}/`,
            Delimiter: '/'
        };

        const listedObjects = await s3.listObjectsV2(listParams).promise();
        const seasonFolders = (listedObjects.CommonPrefixes || [])
            .map(prefix => prefix.Prefix.split('/').slice(-2, -1)[0])
            .filter(folder => /^\d+$/.test(folder)) // Only numeric season folders
            .sort((a, b) => parseInt(a) - parseInt(b));

        console.log(`Found season folders: ${seasonFolders.join(', ')}`);

        // Collect docs from all seasons
        let allDocs = [];
        for (const season of seasonFolders) {
            try {
                const seasonDocsPath = `protected/src/${alias}/${season}/_docs.csv`;
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

                        allDocs.push(row);
                    }
                }
            } catch (error) {
                console.warn(`No docs found for season ${season}:`, error.message);
            }
        }

        // Sort by season then episode then subtitle_index
        allDocs.sort((a, b) => {
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

        // Convert back to CSV format and write root docs
        if (allDocs.length > 0) {
            const headers = Object.keys(allDocs[0]);
            const csvLines = [headers.join(',')];

            allDocs.forEach(doc => {
                const row = headers.map(header => `"${doc[header] || ''}"`).join(',');
                csvLines.push(row);
            });

            const csvContent = csvLines.join('\n');

            // Write root docs
            const rootDocsPath = `protected/src/${alias}/_docs.csv`;
            const putParams = {
                Bucket: bucketName,
                Key: rootDocsPath,
                Body: csvContent,
                ContentType: 'text/csv'
            };

            await s3.putObject(putParams).promise();
            console.log(`Regenerated root docs with ${allDocs.length} total rows from ${seasonFolders.length} seasons`);
        }

    } catch (error) {
        console.error('Error regenerating root docs from seasons:', error);
        throw error;
    }
}

const updateSeriesDocsWithNewEpisodes = async (alias, episodes, path) => {
    try {
        console.log(`Updating series docs for alias: ${alias}, episodes: ${JSON.stringify(episodes)}`);

        // Step 1: Update episode-level _docs.csv files (episode → src)
        for (const { season, episode } of episodes) {
            await updateEpisodeDocsFromPending(alias, season, episode, path);
        }

        // Step 2: Group episodes by season and regenerate season docs from episodes
        const affectedSeasons = new Set(episodes.map(ep => ep.season));
        for (const season of affectedSeasons) {
            await updateSeasonDocsFromEpisodes(alias, season);
        }

        // Step 3: Regenerate the root _docs.csv from all season docs
        await regenerateRootDocsFromSeasons(alias);

        console.log(`Successfully updated ${episodes.length} episodes, ${affectedSeasons.size} seasons, and regenerated root docs`);

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

const invokeIndexAndPublish = async (sourceMediaId, newAlias) => {
    try {
        const payload = JSON.stringify({
            sourceMediaId,
            newAlias
        });

        const params = {
            FunctionName: process.env.FUNCTION_MEMESRCINDEXANDPUBLISH_NAME,
            InvocationType: 'Event', // Async invocation
            Payload: payload
        };

        console.log(`Invoking indexAndPublish function with payload: ${payload}`);
        const result = await lambda.invoke(params).promise();
        console.log('IndexAndPublish function invoked successfully:', result);
        return result;
    } catch (error) {
        console.error('Error invoking indexAndPublish function:', error);
        throw error;
    }
}



const processNewSeries = async (data) => {
    const { sourceMediaId } = data;
    try {
        const updateSourceMediaToPending = await updateSourceMedia({
            id: sourceMediaId,
            status: 'pending'
        });
        console.log('UPDATE SOURCE MEDIA TO PENDING: ', JSON.stringify(updateSourceMediaToPending));
        const sourceMedia = await getSourceMedia(sourceMediaId);
        const seriesData = sourceMedia?.series;
        const userData = sourceMedia?.user;
        const alias = sourceMedia?.pendingAlias;
        // const docs = await getSeriesCsv(alias, true);
        const metadata = await getSeriesMetadata(true, alias);
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
                v2ContentMetadataSeriesId: seriesData?.id
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
                v2ContentMetadataSeriesId: seriesData?.id
            });
            console.log('V2 CONTENT METADATA DATA: ', JSON.stringify(v2ContentMetadataData));
        }

        const updateSourceMediaResponse = await updateSourceMedia({
            id: sourceMediaId,
            status: 'indexing'
        });
        console.log('SOURCE MEDIA DATA: ', JSON.stringify(updateSourceMediaResponse));


        const updateSourceMediaToAwaitingIndexing = await updateSourceMedia({
            id: sourceMediaId,
            status: 'awaitingIndexing'
        });
        console.log('UPDATE SOURCE MEDIA TO AWAITING INDEXING: ', JSON.stringify(updateSourceMediaToAwaitingIndexing));

        // Invoke the indexAndPublish function for new series
        // await invokeIndexAndPublish(sourceMediaId, true);

        const seriesContributorsResponse = await createSeriesContributors({
            seriesId: seriesData?.id,
            userDetailsId: userData?.id
        });
        console.log('SERIES CONTRIBUTORS DATA: ', JSON.stringify(seriesContributorsResponse));
        return 'Indexing has been triggered';

    } catch (error) {
        console.error('Error:', error);

        const updateSourceMediaToFailed = await updateSourceMedia({
            id: sourceMediaId,
            status: 'failed'
        });
        console.log('UPDATE SOURCE MEDIA TO Failed: ', JSON.stringify(updateSourceMediaToFailed));
        throw error;
    }
}

const processSeries = async (data) => {
    const { sourceMediaId, episodes, identityId } = data;
    if (!identityId) {
        throw new Error('Identity ID is required');
    }
    const path = `protected/${identityId}/${sourceMediaId}`;
    try {
        const updateSourceMediaToPending = await updateSourceMedia({
            id: sourceMediaId,
            status: 'pending'
        });
        console.log('UPDATE SOURCE MEDIA TO PENDING: ', JSON.stringify(updateSourceMediaToPending));
        const sourceMedia = await getSourceMedia(sourceMediaId);
        const seriesData = sourceMedia?.series;
        const userData = sourceMedia?.user;
        const alias = sourceMedia?.pendingAlias;
        // const docs = await getSeriesCsv(alias, true); // Not needed since we handle docs in updateSeriesDocsWithNewEpisodes
        const metadata = await getSeriesMetadata(false, alias, path);
        // Check to see if the v2 content metadata exists
        const v2ContentMetadata = await getV2ContentMetadata(alias);
        if (v2ContentMetadata?.id) {
            // Update the v2 content metadata
            const v2ContentMetadataData = await updateV2ContentMetadata({
                id: alias,
                v2ContentMetadataAliasId: alias,
                title: metadata?.title,
                description: metadata?.description,
                frameCount: metadata?.frameCount,
                colorMain: metadata?.colorMain,
                colorSecondary: metadata?.colorSecondary,
                emoji: metadata?.emoji,
                status: metadata?.status || 0,
                version: metadata?.version || 2,
                fontFamily: metadata?.fontFamily,
                v2ContentMetadataSeriesId: seriesData?.id
            });
            console.log('V2 CONTENT METADATA DATA: ', JSON.stringify(v2ContentMetadataData));
        } else {
            // Create the v2 content metadata
            const v2ContentMetadataData = await createV2ContentMetadata({
                id: alias,
                v2ContentMetadataAliasId: alias,
                title: metadata?.title,
                description: metadata?.description,
                frameCount: metadata?.frameCount,
                colorMain: metadata?.colorMain,
                colorSecondary: metadata?.colorSecondary,
                emoji: metadata?.emoji,
                status: metadata?.status || 0,
                version: metadata?.version || 2,
                fontFamily: metadata?.fontFamily,
                v2ContentMetadataSeriesId: seriesData?.id
            });
            console.log('V2 CONTENT METADATA DATA: ', JSON.stringify(v2ContentMetadataData));
        }

        // Move episode files from pending to src folder for approved episodes
        await moveEpisodeFilesFromPendingToSrc(alias, episodes, path);

        // Update the series docs CSV by removing existing episode rows and adding new ones
        await updateSeriesDocsWithNewEpisodes(alias, episodes, path);

        const updateSourceMediaToAwaitingIndexing = await updateSourceMedia({
            id: sourceMediaId,
            status: 'awaitingIndexing'
        });
        console.log('UPDATE SOURCE MEDIA TO AWAITING INDEXING: ', JSON.stringify(updateSourceMediaToAwaitingIndexing));

        // Invoke the indexAndPublish function for existing series
        // await invokeIndexAndPublish(sourceMediaId, false);

        const seriesContributorsResponse = await createSeriesContributors({
            seriesId: seriesData?.id,
            userDetailsId: userData?.id
        });
        console.log('SERIES CONTRIBUTORS DATA: ', JSON.stringify(seriesContributorsResponse));
        return 'Indexing has been triggered';

        // THIS WOULD BE THE CALL TO REINDEX ON OPENSEARCH

    } catch (error) {
        console.error('Error:', error);

        const updateSourceMediaToFailed = await updateSourceMedia({
            id: sourceMediaId,
            status: 'failed'
        });
        console.log('UPDATE SOURCE MEDIA TO FAILED: ', JSON.stringify(updateSourceMediaToFailed));
        throw error;
    }
}

exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);

    const { sourceMediaId, episodes = [] } = JSON.parse(event?.body);
    console.log('SOURCE MEDIA ID: ', sourceMediaId);
    console.log('EPISODES: ', episodes);
    let statusCode = 500;
    let body;

    try {
        const sourceMediaResponse = await makeGraphQLRequest({ query: getSourceMediaQuery, variables: { id: sourceMediaId } });
        console.log('SOURCE MEDIA RESPONSE: ', JSON.stringify(sourceMediaResponse));
        const sourceMediaData = sourceMediaResponse?.body?.data?.getSourceMedia;
        const identityId = sourceMediaData?.identityId;
        const alias = sourceMediaData?.pendingAlias;
        console.log('SOURCE MEDIA DATA: ', JSON.stringify(sourceMediaData));
        console.log('ALIAS: ', JSON.stringify(alias));

        const aliasResponse = await makeGraphQLRequest({ query: getAliasQuery, variables: { id: alias } });
        const aliasData = aliasResponse?.body?.data?.getAlias;
        console.log('ALIAS DATA: ', JSON.stringify(aliasData));

        statusCode = 200;
        await processSeries({
            sourceMediaId,
            episodes,
            identityId
        });
        body = 'Indexing has been triggered';
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

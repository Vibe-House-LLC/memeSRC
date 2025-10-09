/* Amplify Params - DO NOT EDIT
	API_MEMESRC_GRAPHQLAPIENDPOINTOUTPUT
	API_MEMESRC_GRAPHQLAPIIDOUTPUT
	API_MEMESRC_GRAPHQLAPIKEYOUTPUT
	ENV
	FUNCTION_MEMESRCINDEXANDPUBLISH_NAME
	FUNCTION_MEMESRCMOVEAPPROVEDMEDIA_NAME
	REGION
	STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT *//* Amplify Params - DO NOT EDIT
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
const { sendEmail } = require('/opt/email-function');

const AWS = require('aws-sdk');

// Initialize S3 client
const s3 = new AWS.S3();

// Initialize Lambda client
const lambda = new AWS.Lambda();

const reviewUrl = process.env.ENV === 'beta'
    ? 'https://memesrc.com/dashboard/review-upload?sourceMediaId='
    : 'https://dev.memesrc.com/dashboard/review-upload?sourceMediaId=';

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

const extractEmailAddresses = (payload = {}) => {
    if (!payload || typeof payload !== 'object') {
        return [];
    }

    const { emailAddresses } = payload;

    if (!emailAddresses) {
        return [];
    }

    if (Array.isArray(emailAddresses)) {
        return emailAddresses
            .filter((value) => typeof value === 'string')
            .map((value) => value.trim())
            .filter(Boolean);
    }

    if (typeof emailAddresses === 'string') {
        return emailAddresses
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
    }

    return [];
};

const formatEpisodeSummary = (episodes = []) => {
    if (!Array.isArray(episodes) || episodes.length === 0) {
        return 'None specified';
    }

    return episodes
        .map(({ season, episode }) => {
            const seasonLabel = season !== undefined && season !== null ? `S${String(season).padStart(2, '0')}` : 'S??';
            const episodeLabel = episode !== undefined && episode !== null ? `E${String(episode).padStart(2, '0')}` : 'E??';
            return `${seasonLabel}${episodeLabel}`;
        })
        .join(', ');
};

const escapeHtml = (value = '') =>
    String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const sendUpdateEmailNotification = async ({
    emailAddresses,
    type,
    sourceMediaId,
    alias,
    seriesTitle,
    episodes = [],
    error
}) => {
    if (!Array.isArray(emailAddresses) || emailAddresses.length === 0) {
        return;
    }

    try {
        const totalEpisodes = episodes.length;
        const episodeSummary = formatEpisodeSummary(episodes);
        const friendlySeriesTitle = seriesTitle || alias || 'memeSRC Series';
        const now = new Date();
        const timestamp = now.toLocaleString();
        const encodedSourceMediaId = sourceMediaId ? encodeURIComponent(sourceMediaId) : '';
        const reviewLink = encodedSourceMediaId ? `${reviewUrl}${encodedSourceMediaId}` : reviewUrl;
        const metaSpan = `<span style="font-size: 0; color: transparent;">SourceMedia:${escapeHtml(sourceMediaId || 'unknown')}|Alias:${escapeHtml(alias || 'n/a')}|${Date.now()}</span>`;
        const baseLines = [
            `Series: ${friendlySeriesTitle}`,
            `Source Media ID: ${sourceMediaId || 'unknown'}`,
            alias ? `Alias: ${alias}` : null,
            totalEpisodes ? `Episodes (${totalEpisodes}): ${episodeSummary}` : 'Episodes: None specified'
        ].filter(Boolean);

        let subject;
        let htmlBody;
        let textBody;

        switch (type) {
            case 'start': {
                subject = 'memeSRC: Series Update Started';
                htmlBody = `
                    <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <h1 style="color: #2c3e50;">Series Update Started</h1>
                            <p>We're preparing your updates for <strong>${escapeHtml(friendlySeriesTitle)}</strong>.</p>
                            <p><strong>Source Media ID:</strong> ${escapeHtml(sourceMediaId || 'unknown')}</p>
                            ${alias ? `<p><strong>Alias:</strong> ${escapeHtml(alias)}</p>` : ''}
                            <p><strong>Episodes queued:</strong> ${totalEpisodes} (${escapeHtml(episodeSummary)})</p>
                            <p>Process started at: <strong>${escapeHtml(timestamp)}</strong></p>
                            <p>We'll let you know when everything is finished. You can review progress any time:</p>
                            <p><a href="${reviewLink}" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Upload</a></p>
                            <p>— The memeSRC Team</p>
                            ${metaSpan}
                        </body>
                    </html>
                `;

                const textBodyLines = [
                    'Series Update Started',
                    '',
                    ...baseLines,
                    `Started at: ${timestamp}`,
                    '',
                    'Review progress:',
                    reviewLink,
                    '',
                    '— The memeSRC Team'
                ];
                textBody = textBodyLines.join('\n');
                break;
            }
            case 'success': {
                subject = 'memeSRC: Series Update Complete';
                htmlBody = `
                    <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <h1 style="color: #27ae60;">Series Update Complete</h1>
                            <p>Your updates for <strong>${escapeHtml(friendlySeriesTitle)}</strong> are finished.</p>
                            <p><strong>Source Media ID:</strong> ${escapeHtml(sourceMediaId || 'unknown')}</p>
                            ${alias ? `<p><strong>Alias:</strong> ${escapeHtml(alias)}</p>` : ''}
                            <p><strong>Episodes processed:</strong> ${totalEpisodes} (${escapeHtml(episodeSummary)})</p>
                            <p>Completed at: <strong>${escapeHtml(timestamp)}</strong></p>
                            <p>You can review the refreshed content and continue your workflow:</p>
                            <p><a href="${reviewLink}" style="background-color: #27ae60; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Review Updated Content</a></p>
                            <p>— The memeSRC Team</p>
                            ${metaSpan}
                        </body>
                    </html>
                `;

                const textBodyLines = [
                    'Series Update Complete',
                    '',
                    ...baseLines,
                    `Completed at: ${timestamp}`,
                    '',
                    'Review the updated content:',
                    reviewLink,
                    '',
                    '— The memeSRC Team'
                ];
                textBody = textBodyLines.join('\n');
                break;
            }
            case 'failure': {
                const errorMessage = error?.message || 'Unknown error occurred';
                const safeErrorMessage = escapeHtml(errorMessage);
                subject = 'memeSRC: Series Update Failed';
                htmlBody = `
                    <html>
                        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <h1 style="color: #e74c3c;">Series Update Failed</h1>
                            <p>We couldn't complete the update for <strong>${escapeHtml(friendlySeriesTitle)}</strong>.</p>
                            <p><strong>Source Media ID:</strong> ${escapeHtml(sourceMediaId || 'unknown')}</p>
                            ${alias ? `<p><strong>Alias:</strong> ${escapeHtml(alias)}</p>` : ''}
                            <p><strong>Episodes attempted:</strong> ${totalEpisodes} (${escapeHtml(episodeSummary)})</p>
                            <p><strong>Failed at:</strong> ${escapeHtml(timestamp)}</p>
                            <p><strong>Error:</strong> ${safeErrorMessage}</p>
                            <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #e74c3c; margin: 20px 0;">
                                <h3 style="margin-top: 0; color: #e74c3c;">What you can try:</h3>
                                <ul>
                                    <li>Retry the update from your dashboard</li>
                                    <li>Confirm the episodes you selected are available</li>
                                    <li>Contact support if the issue continues</li>
                                </ul>
                            </div>
                            <p>Review details or retry when you're ready:</p>
                            <p><a href="${reviewLink}" style="background-color: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Review Upload</a></p>
                            <p>— The memeSRC Team</p>
                            ${metaSpan}
                        </body>
                    </html>
                `;

                const textBodyLines = [
                    'Series Update Failed',
                    '',
                    ...baseLines,
                    `Failed at: ${timestamp}`,
                    `Error: ${errorMessage}`,
                    '',
                    'Review details or retry when you are ready:',
                    reviewLink,
                    '',
                    'If the issue continues, please contact support.',
                    '',
                    '— The memeSRC Team'
                ];
                textBody = textBodyLines.join('\n');
                break;
            }
            default:
                return;
        }

        await sendEmail({
            toAddresses: emailAddresses,
            subject,
            htmlBody,
            textBody
        });
        console.log(`Sent ${type} update notification email to ${emailAddresses.join(', ')}`);
    } catch (emailError) {
        console.error(`Failed to send ${type} update notification email:`, emailError);
    }
};

const chunkArray = (items, size) => {
    if (!Array.isArray(items) || size <= 0) {
        return [];
    }

    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }

    return chunks;
};

const invokeMoveApprovedMedia = async ({ alias, episodes, path }) => {
    const payload = JSON.stringify({ alias, episodes, path });
    const params = {
        FunctionName: process.env.FUNCTION_MEMESRCMOVEAPPROVEDMEDIA_NAME,
        InvocationType: 'RequestResponse',
        Payload: payload
    };

    const response = await lambda.invoke(params).promise();

    if (response.FunctionError) {
        throw new Error(`MoveApprovedMedia lambda returned an error: ${response.FunctionError}`);
    }

    let payloadBuffer;
    if (!response.Payload) {
        payloadBuffer = Buffer.from('');
    } else if (Buffer.isBuffer(response.Payload)) {
        payloadBuffer = response.Payload;
    } else if (response.Payload instanceof Uint8Array) {
        payloadBuffer = Buffer.from(response.Payload);
    } else if (typeof response.Payload === 'string') {
        payloadBuffer = Buffer.from(response.Payload, 'utf-8');
    } else {
        payloadBuffer = Buffer.from(JSON.stringify(response.Payload));
    }
    const responsePayloadString = payloadBuffer.toString('utf-8');

    let responsePayload;
    try {
        responsePayload = responsePayloadString ? JSON.parse(responsePayloadString) : {};
    } catch (parseError) {
        throw new Error(`Failed to parse MoveApprovedMedia response: ${parseError.message}`);
    }

    const { statusCode = response.StatusCode, body } = responsePayload;

    if (statusCode !== 200) {
        throw new Error(`MoveApprovedMedia lambda responded with status ${statusCode}: ${body}`);
    }

    if (!body) {
        return {};
    }

    try {
        return typeof body === 'string' ? JSON.parse(body) : body;
    } catch (parseBodyError) {
        console.warn('Failed to parse body from MoveApprovedMedia response, returning raw body');
        return body;
    }
};

const copyMetadataToSrc = async (alias, path) => {
    const bucketName = process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME;
    console.log(`Copying metadata for alias ${alias} from ${path}`);
    const params = {
        Bucket: bucketName,
        CopySource: `${bucketName}/${path}/00_metadata.json`,
        Key: `protected/src/${alias}/00_metadata.json`
    };

    await s3.copyObject(params).promise();
};

const moveEpisodeFilesFromPendingToSrc = async (alias, episodes, path) => {
    if (!Array.isArray(episodes) || episodes.length === 0) {
        console.log('No episodes to move from pending to src');
        return;
    }

    try {
        console.log(`Triggering MoveApprovedMedia lambda for alias ${alias} with ${episodes.length} episodes`);
        const episodeChunks = chunkArray(episodes, 5);

        const invocationPromises = episodeChunks.map((chunk) =>
            invokeMoveApprovedMedia({
                alias,
                episodes: chunk,
                path
            })
        );

        await Promise.all(invocationPromises);
        await copyMetadataToSrc(alias, path);
        console.log(`Successfully triggered MoveApprovedMedia for ${episodeChunks.length} chunk(s)`);
    } catch (error) {
        console.error('Error invoking MoveApprovedMedia lambda:', error);
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
    const { sourceMediaId, episodes, identityId, emailAddresses } = data;
    if (!identityId) {
        throw new Error('Identity ID is required');
    }
    const path = `protected/${identityId}/${sourceMediaId}`;
    let alias;
    let seriesData;
    let metadata;
    let userData;
    try {
        const updateSourceMediaToPending = await updateSourceMedia({
            id: sourceMediaId,
            status: 'pending'
        });
        console.log('UPDATE SOURCE MEDIA TO PENDING: ', JSON.stringify(updateSourceMediaToPending));
        const sourceMedia = await getSourceMedia(sourceMediaId);
        seriesData = sourceMedia?.series;
        userData = sourceMedia?.user;
        alias = sourceMedia?.pendingAlias;
        // const docs = await getSeriesCsv(alias, true); // Not needed since we handle docs in updateSeriesDocsWithNewEpisodes
        metadata = await getSeriesMetadata(false, alias, path);

        await sendUpdateEmailNotification({
            emailAddresses,
            type: 'start',
            sourceMediaId,
            alias,
            seriesTitle: metadata?.title || seriesData?.name,
            episodes
        });
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

        await sendUpdateEmailNotification({
            emailAddresses,
            type: 'success',
            sourceMediaId,
            alias,
            seriesTitle: metadata?.title || seriesData?.name,
            episodes
        });
        return 'Indexing has been triggered';

        // THIS WOULD BE THE CALL TO REINDEX ON OPENSEARCH

    } catch (error) {
        console.error('Error:', error);

        const updateSourceMediaToFailed = await updateSourceMedia({
            id: sourceMediaId,
            status: 'failed'
        });
        console.log('UPDATE SOURCE MEDIA TO FAILED: ', JSON.stringify(updateSourceMediaToFailed));

        // Populate any missing context so failure notifications have useful data.
        if (!alias || !seriesData || !metadata || !userData) {
            try {
                const fallbackSourceMedia = await getSourceMedia(sourceMediaId);
                seriesData = seriesData || fallbackSourceMedia?.series;
                userData = userData || fallbackSourceMedia?.user;
                alias = alias || fallbackSourceMedia?.pendingAlias;
            } catch (fallbackSourceError) {
                console.error('Failed to fetch source media for failure notification:', fallbackSourceError);
            }
            if (!metadata && alias) {
                try {
                    metadata = await getSeriesMetadata(false, alias, path);
                } catch (fallbackMetadataError) {
                    console.error('Failed to fetch series metadata for failure notification:', fallbackMetadataError);
                }
            }
        }
        const failureSeriesTitle = metadata?.title || seriesData?.name || alias || 'Unknown Series';

        await sendUpdateEmailNotification({
            emailAddresses,
            type: 'failure',
            sourceMediaId,
            alias: alias || 'unknown-alias',
            seriesTitle: failureSeriesTitle,
            episodes,
            error
        });
        throw error;
    }
}

exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);

    let payload = {};
    try {
        payload = typeof event?.body === 'string' ? JSON.parse(event.body) : (event?.body || {});
    } catch (parseError) {
        console.error('Failed to parse event body:', parseError);
        throw parseError;
    }

    const { sourceMediaId, episodes = [] } = payload;
    const emailAddresses = extractEmailAddresses(payload);
    console.log('SOURCE MEDIA ID: ', sourceMediaId);
    console.log('EPISODES: ', episodes);
    console.log('EMAIL ADDRESSES: ', emailAddresses);
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
            identityId,
            emailAddresses
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

/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const AWS = require('aws-sdk');

const s3 = new AWS.S3();

const listAllObjects = async (bucket, prefix) => {
    const objects = [];
    let continuationToken;

    do {
        const params = {
            Bucket: bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken
        };

        const response = await s3.listObjectsV2(params).promise();
        objects.push(...(response.Contents || []));
        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return objects;
};

const moveEpisodeFiles = async (bucket, alias, path, season, episodeNumber) => {
    const seasonKey = `${season}`;
    const episodeKey = `${episodeNumber}`;
    const pendingPrefix = `${path}/${seasonKey}/${episodeKey}/`;

    console.log(`Listing objects with prefix ${pendingPrefix}`);
    const objects = await listAllObjects(bucket, pendingPrefix);

    if (!objects.length) {
        console.log(`No files found for season ${seasonKey}, episode ${episodeKey}`);
        return;
    }

    const copyPromises = objects.map(async ({ Key: sourceKey }) => {
        const destinationKey = sourceKey.replace(pendingPrefix, `protected/src/${alias}/${seasonKey}/${episodeKey}/`);
        const copyParams = {
            Bucket: bucket,
            CopySource: `${bucket}/${sourceKey}`,
            Key: destinationKey
        };

        console.log(`Copying ${sourceKey} to ${destinationKey}`);
        await s3.copyObject(copyParams).promise();
    });

    await Promise.all(copyPromises);
};

exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);

    const { alias, episodes, path } = event || {};

    if (!alias || !Array.isArray(episodes) || episodes.length === 0 || !path) {
        console.error('Invalid invocation payload received');
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid payload. Expected alias, path, and non-empty episodes array.' })
        };
    }

    const bucket = process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME;

    try {
        for (const episode of episodes) {
            const { season, episode: episodeNumber } = episode;

            if (season === undefined || episodeNumber === undefined) {
                console.warn(`Skipping episode with missing identifiers: ${JSON.stringify(episode)}`);
                continue;
            }

            console.log(`Moving files for season ${season}, episode ${episodeNumber}`);
            await moveEpisodeFiles(bucket, alias, path, season, episodeNumber);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Episodes moved successfully', movedCount: episodes.length })
        };
    } catch (error) {
        console.error('Error moving approved media:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to move approved media', error: error.message })
        };
    }
};

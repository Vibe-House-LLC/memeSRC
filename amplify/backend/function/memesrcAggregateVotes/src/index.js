/* Amplify Params - DO NOT EDIT
	API_MEMESRC_ANALYTICSMETRICSTABLE_ARN
	API_MEMESRC_ANALYTICSMETRICSTABLE_NAME
	API_MEMESRC_GRAPHQLAPIIDOUTPUT
	API_MEMESRC_SERIESTABLE_ARN
	API_MEMESRC_SERIESTABLE_NAME
	API_MEMESRC_SERIESUSERVOTETABLE_ARN
	API_MEMESRC_SERIESUSERVOTETABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT */

const { DynamoDBClient, PutItemCommand, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const REGION = process.env.REGION;
const ddb = new DynamoDBClient({ region: REGION });

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

// Utility function to perform full table scan with pagination
async function scanDynamoDBTable(params) {
    let lastEvaluatedKey;
    const allResults = [];
    do {
        if (lastEvaluatedKey) {
            params.ExclusiveStartKey = lastEvaluatedKey;
        }
        const scanResponse = await ddb.send(new ScanCommand(params));
        allResults.push(...scanResponse.Items);
        lastEvaluatedKey = scanResponse.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    return allResults;
}

// Add this function at the top of the file, after the imports
function compareTitles(a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
}

exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);

    // Check if the required environment variables are set
    const requiredEnvVars = [
        'API_MEMESRC_SERIESUSERVOTETABLE_NAME',
        'API_MEMESRC_SERIESTABLE_NAME',
        'API_MEMESRC_ANALYTICSMETRICSTABLE_NAME'
    ];

    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingEnvVars.length > 0) {
        console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
        return {
            statusCode: 500,
            body: JSON.stringify(`Missing required environment variables: ${missingEnvVars.join(', ')}`)
        };
    }

    // Scan the SeriesUserVote DynamoDB table with pagination
    const votesScanParams = {
        TableName: process.env.API_MEMESRC_SERIESUSERVOTETABLE_NAME
    };

    // Modify the scan parameters for the Series table
    const seriesScanParams = {
        TableName: process.env.API_MEMESRC_SERIESTABLE_NAME,
        ProjectionExpression: "id, #n",
        ExpressionAttributeNames: {
            "#n": "name"
        }
    };

    let scanResults, allSeries;
    try {
        const voteItems = await scanDynamoDBTable(votesScanParams);
        scanResults = voteItems.map(item => unmarshall(item));

        const seriesItems = await scanDynamoDBTable(seriesScanParams);
        allSeries = seriesItems.map(item => unmarshall(item));
    } catch (scanError) {
        console.error(`Error scanning DynamoDB tables: ${JSON.stringify(scanError)}`);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Failed to scan DynamoDB tables',
                error: scanError.message,
                tableName: scanError.__type.includes('SeriesUserVote') ? votesScanParams.TableName : seriesScanParams.TableName
            })
        };
    }

    // Create a map of series IDs to names for easy lookup
    const seriesNameMap = Object.fromEntries(allSeries.map(series => [series.id, series.name]));

    // Initialize voteAggregation with all series, setting votes to 0
    const voteAggregation = {};
    for (let seriesId of allSeries.map(series => series.id)) {
        voteAggregation[seriesId] = { upvotes: 0, downvotes: 0 };
    }

    const userVoteAggregation = {};

    // Aggregate the votes
    for (let item of scanResults) {
        const seriesId = item.seriesUserVoteSeriesId;
        const userId = item.userDetailsVotesId;
        const boost = parseInt(item.boost);
        const voteTime = item.createdAt || item.updatedAt;

        // User-specific aggregation
        const userSeriesKey = `${userId}#${seriesId}`;
        if (!userVoteAggregation[userSeriesKey]) {
            userVoteAggregation[userSeriesKey] = { upvotes: 0, downvotes: 0, lastVoteTime: voteTime, lastBoost: boost };
        } else {
            // Update lastVoteTime and lastBoost if this vote is more recent
            if (voteTime > userVoteAggregation[userSeriesKey].lastVoteTime) {
                userVoteAggregation[userSeriesKey].lastVoteTime = voteTime;
                userVoteAggregation[userSeriesKey].lastBoost = boost;
            }
        }

        if (boost > 0) {
            voteAggregation[seriesId].upvotes += boost;
            userVoteAggregation[userSeriesKey].upvotes += boost;
        } else if (boost < 0) {
            voteAggregation[seriesId].downvotes += Math.abs(boost);
            userVoteAggregation[userSeriesKey].downvotes += Math.abs(boost);
        }
    }

    // Get top 250 seriesId by upvotes
    const topUpvotes = Object.entries(voteAggregation)
        .sort(([aId, a], [bId, b]) => {
            const upvoteDiff = b.upvotes - a.upvotes;
            if (upvoteDiff !== 0) return upvoteDiff;
            // If upvotes are equal, sort by title
            return compareTitles(seriesNameMap[aId] || '', seriesNameMap[bId] || '');
        })
        .slice(0, 250)
        .map(([seriesId, votes]) => ({ seriesId, upvotes: votes.upvotes, downvotes: votes.downvotes }));

    // Get top 250 seriesId by upvotes minus downvotes (battleground)
    const topBattleground = Object.entries(voteAggregation)
        .sort(([aId, a], [bId, b]) => {
            const voteDiffA = a.upvotes - a.downvotes;
            const voteDiffB = b.upvotes - b.downvotes;
            const battlegroundDiff = voteDiffB - voteDiffA;
            if (battlegroundDiff !== 0) return battlegroundDiff;
            // If vote differences are equal, sort by title
            return compareTitles(seriesNameMap[aId] || '', seriesNameMap[bId] || '');
        })
        .slice(0, 250)
        .map(([seriesId, votes]) => ({ seriesId, upvotes: votes.upvotes, downvotes: votes.downvotes }));

    // Write aggregated results for each series to AnalyticsMetrics DynamoDB table
    const currentTime = new Date().toISOString();
    for (const [seriesId, votes] of Object.entries(voteAggregation)) {
        const individualPutParams = {
            TableName: process.env.API_MEMESRC_ANALYTICSMETRICSTABLE_NAME,
            Item: marshall({
                id: `totalVotes-${seriesId}`,  // Unique ID per series
                value: JSON.stringify(votes),
                createdAt: currentTime,
                updatedAt: currentTime,
                __typename: "AnalyticsMetrics"
            })
        };

        try {
            await ddb.send(new PutItemCommand(individualPutParams));
        } catch (putError) {
            console.error(`Error putting individual series vote to DynamoDB table: ${JSON.stringify(putError)}`);
            return {
                statusCode: 500,
                body: JSON.stringify('Failed to put individual series vote to DynamoDB table')
            };
        }
    }

    // Write aggregated results for all series to AnalyticsMetrics DynamoDB table
    const putParams = {
        TableName: process.env.API_MEMESRC_ANALYTICSMETRICSTABLE_NAME,
        Item: marshall({
            id: "totalVotes",
            value: JSON.stringify(voteAggregation),
            createdAt: currentTime,
            updatedAt: currentTime,
            __typename: "AnalyticsMetrics"
        })
    };

    try {
        await ddb.send(new PutItemCommand(putParams));
    } catch (putError) {
        console.error(`Error putting item to DynamoDB table: ${JSON.stringify(putError)}`);
        return {
            statusCode: 500,
            body: JSON.stringify('Failed to put item to DynamoDB table')
        };
    }

    // Write top 250 upvotes to AnalyticsMetrics DynamoDB table
    const topUpvotesPutParams = {
        TableName: process.env.API_MEMESRC_ANALYTICSMETRICSTABLE_NAME,
        Item: marshall({
            id: "topVotes-upvotes",
            value: JSON.stringify(topUpvotes),
            createdAt: currentTime,
            updatedAt: currentTime,
            __typename: "AnalyticsMetrics"
        })
    };

    try {
        await ddb.send(new PutItemCommand(topUpvotesPutParams));
    } catch (putError) {
        console.error(`Error putting top upvotes to DynamoDB table: ${JSON.stringify(putError)}`);
        return {
            statusCode: 500,
            body: JSON.stringify('Failed to put top upvotes to DynamoDB table')
        };
    }

    // Write top 250 battleground votes to AnalyticsMetrics DynamoDB table
    const topBattlegroundPutParams = {
        TableName: process.env.API_MEMESRC_ANALYTICSMETRICSTABLE_NAME,
        Item: marshall({
            id: "topVotes-battleground",
            value: JSON.stringify(topBattleground),
            createdAt: currentTime,
            updatedAt: currentTime,
            __typename: "AnalyticsMetrics"
        })
    };

    try {
        await ddb.send(new PutItemCommand(topBattlegroundPutParams));
    } catch (putError) {
        console.error(`Error putting top battleground votes to DynamoDB table: ${JSON.stringify(putError)}`);
        return {
            statusCode: 500,
            body: JSON.stringify('Failed to put top battleground votes to DynamoDB table')
        };
    }

    // Write user-specific aggregated results to AnalyticsMetrics DynamoDB table
    for (const [userSeriesKey, votes] of Object.entries(userVoteAggregation)) {
        const [userId, seriesId] = userSeriesKey.split('#');
        const userVotePutParams = {
            TableName: process.env.API_MEMESRC_ANALYTICSMETRICSTABLE_NAME,
            Item: marshall({
                id: `userVotes#${userId}#${seriesId}`,
                value: JSON.stringify({
                    upvotes: votes.upvotes,
                    downvotes: votes.downvotes,
                    lastVoteTime: votes.lastVoteTime,
                    lastBoost: votes.lastBoost  // Add the lastBoost value
                }),
                createdAt: currentTime,
                updatedAt: currentTime,
                __typename: "AnalyticsMetrics"
            })
        };

        try {
            await ddb.send(new PutItemCommand(userVotePutParams));
        } catch (putError) {
            console.error(`Error putting user vote aggregation to DynamoDB table: ${JSON.stringify(putError)}`);
            // Note: We're not returning here to allow the function to continue processing other votes
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify(voteAggregation)
    };
};

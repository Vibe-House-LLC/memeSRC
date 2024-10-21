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

exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);

    // Scan the SeriesUserVote DynamoDB table with pagination
    const scanParams = {
        TableName: process.env.API_MEMESRC_SERIESUSERVOTETABLE_NAME
    };

    let scanResults;
    try {
        const items = await scanDynamoDBTable(scanParams);
        scanResults = items.map(item => unmarshall(item));
    } catch (scanError) {
        console.error(`Error scanning DynamoDB table: ${JSON.stringify(scanError)}`);
        return {
            statusCode: 500,
            body: JSON.stringify('Failed to scan DynamoDB table')
        };
    }

    // Aggregate the votes
    const voteAggregation = {};
    const userVoteAggregation = {};

    for (let item of scanResults) {
        const seriesId = item.seriesUserVoteSeriesId;
        const userId = item.userDetailsVotesId;
        const boost = parseInt(item.boost);

        // Global aggregation
        if (!voteAggregation[seriesId]) {
            voteAggregation[seriesId] = { upvotes: 0, downvotes: 0 };
        }

        // User-specific aggregation
        const userSeriesKey = `${userId}#${seriesId}`;
        if (!userVoteAggregation[userSeriesKey]) {
            userVoteAggregation[userSeriesKey] = { upvotes: 0, downvotes: 0 };
        }

        if (boost > 0) {
            voteAggregation[seriesId].upvotes += boost;
            userVoteAggregation[userSeriesKey].upvotes += boost;
        } else if (boost < 0) {
            voteAggregation[seriesId].downvotes += Math.abs(boost);
            userVoteAggregation[userSeriesKey].downvotes += Math.abs(boost);
        }
    }

    // Get top 100 seriesId by upvotes
    const topUpvotes = Object.entries(voteAggregation)
        .sort(([, a], [, b]) => b.upvotes - a.upvotes)
        .slice(0, 100)
        .map(([seriesId, votes]) => ({ seriesId, upvotes: votes.upvotes, downvotes: votes.downvotes }));

    // Get top 100 seriesId by upvotes minus downvotes (battleground)
    const topBattleground = Object.entries(voteAggregation)
        .sort(([, a], [, b]) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))
        .slice(0, 100)
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

    // Write top 100 upvotes to AnalyticsMetrics DynamoDB table
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

    // Write top 100 battleground votes to AnalyticsMetrics DynamoDB table
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
                value: JSON.stringify(votes),
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

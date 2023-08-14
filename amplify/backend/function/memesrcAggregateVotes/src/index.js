// Import required AWS SDK v3 clients and commands for Node.js
const { DynamoDBClient, PutItemCommand, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const REGION = process.env.REGION;
const ddb = new DynamoDBClient({ region: REGION });

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);

    // Scan the SeriesUserVote DynamoDB table
    const scanParams = {
        TableName: process.env.API_MEMESRC_SERIESUSERVOTETABLE_NAME
    };

    let scanResults;
    try {
        const scanResponse = await ddb.send(new ScanCommand(scanParams));
        scanResults = scanResponse.Items.map(item => unmarshall(item));
    } catch (scanError) {
        console.error(`Error scanning DynamoDB table: ${JSON.stringify(scanError)}`);
        return {
            statusCode: 500,
            body: JSON.stringify('Failed to scan DynamoDB table')
        };
    }

    // Aggregate the votes
    const voteAggregation = {};
    for (let item of scanResults) {
        const seriesId = item.seriesUserVoteSeriesId;
        const boost = parseInt(item.boost);

        if (!voteAggregation[seriesId]) {
            voteAggregation[seriesId] = { upvotes: 0, downvotes: 0 };
        }

        if (boost > 0) {
            voteAggregation[seriesId].upvotes += boost;
        } else if (boost < 0) {
            voteAggregation[seriesId].downvotes += Math.abs(boost);
        }
    }

    // Write aggregated results to AnalyticsMetrics DynamoDB table
    const currentTime = new Date().toISOString();
    const putParams = {
        TableName: process.env.API_MEMESRC_ANALYTICSMETRICSTABLE_NAME,
        Item: marshall({
            id: "voteAggregation",
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

    return {
        statusCode: 200,
        body: JSON.stringify(voteAggregation)
    };
};

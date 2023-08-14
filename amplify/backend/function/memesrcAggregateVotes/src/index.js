/* Amplify Params - DO NOT EDIT
	API_MEMESRC_GRAPHQLAPIIDOUTPUT
	API_MEMESRC_SERIESUSERVOTETABLE_ARN
	API_MEMESRC_SERIESUSERVOTETABLE_NAME
	ENV
	REGION
Amplify Params - DO NOT EDIT *//* Amplify Params - DO NOT EDIT
    API_MEMESRC_GRAPHQLAPIIDOUTPUT
    API_MEMESRC_SERIESUSERVOTETABLE_ARN
    API_MEMESRC_SERIESUSERVOTETABLE_NAME
    ENV
    REGION
Amplify Params - DO NOT EDIT */

const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);

    // Scan the DynamoDB table
    const params = {
        TableName: process.env.API_MEMESRC_SERIESUSERVOTETABLE_NAME
    };
    let scanResults;
    try {
        scanResults = await dynamoDb.scan(params).promise();
    } catch (scanError) {
        console.error(`Error scanning DynamoDB table: ${JSON.stringify(scanError)}`);
        return {
            statusCode: 500,
            body: JSON.stringify('Failed to scan DynamoDB table')
        };
    }

    // Aggregate the votes
    const voteAggregation = {};
    for (let item of scanResults.Items) {
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

    return {
        statusCode: 200,
        body: JSON.stringify(voteAggregation)
    };
};

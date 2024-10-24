/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["opensearch_pass"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  })
  .promise();

Parameters will be of the form { Name: 'secretName', Value: 'secretValue', ... }[]
*/
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
const { SSMClient, GetParametersCommand } = require("@aws-sdk/client-ssm");
const { Client } = require('@opensearch-project/opensearch');

const REGION = process.env.REGION;
const ddb = new DynamoDBClient({ region: REGION });
const ssm = new SSMClient({ region: REGION });

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

// New function to retrieve OpenSearch credentials
async function getOpenSearchCredentials() {
    const getParametersCommand = new GetParametersCommand({
        Names: ["opensearch_pass"].map(secretName => process.env[secretName]),
        WithDecryption: true,
    });

    try {
        const response = await ssm.send(getParametersCommand);
        const opensearchPass = response.Parameters.find(p => p.Name === process.env.opensearch_pass).Value;
        return {
            password: opensearchPass,
            username: process.env.opensearch_user
        };
    } catch (error) {
        console.error('Error retrieving parameters from SSM:', error);
        throw error;
    }
}

// Move these variables into the handler
let opensearchPass;
let opensearchUser;

// Add this helper function for OpenSearch client creation
function createOpenSearchClient(credentials) {
    return new Client({
        node: 'https://search-memesrc-3lcaiflaubqkqafuim5oyxupwa.us-east-1.es.amazonaws.com',
        auth: {
            username: credentials.username,
            password: credentials.password
        }
    });
}

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

function compareTitles(a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
}

// Add this constant at the top with the other constants
const TOP_ITEM_COUNT = 10;

exports.handler = async (event) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    // Get OpenSearch credentials at the start of handler
    try {
        const credentials = await getOpenSearchCredentials();
        opensearchPass = credentials.password;
        opensearchUser = credentials.username;
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify('Failed to retrieve parameters from SSM')
        };
    }

    // Try to create the 'votes-series' index
    try {
        const client = createOpenSearchClient({ username: opensearchUser, password: opensearchPass });
        const indexName = 'votes-series';
        
        const { body: indexExists } = await client.indices.exists({ index: indexName });
        if (!indexExists) {
            await client.indices.create({
                index: indexName,
                body: {
                    mappings: {
                        properties: {
                            id: { type: 'keyword' },
                            name: { type: 'text' },
                            createdAt: { type: 'date' },
                            updatedAt: { type: 'date' }
                        }
                    }
                }
            });
            console.log(`Index '${indexName}' created successfully.`);
        } else {
            console.log(`Index '${indexName}' already exists.`);
        }
    } catch (error) {
        console.error('Error managing OpenSearch index:', error);
        // Continue with the rest of the function
    }

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
                // Remove the table name determination that was using __type
                tableName: process.env.API_MEMESRC_SERIESUSERVOTETABLE_NAME
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

    // Get top 10 seriesId by upvotes
    const topUpvotes = Object.entries(voteAggregation)
        .sort(([aId, a], [bId, b]) => {
            const upvoteDiff = b.upvotes - a.upvotes;
            if (upvoteDiff !== 0) return upvoteDiff;
            return compareTitles(seriesNameMap[aId] || '', seriesNameMap[bId] || '');
        })
        .map(([seriesId, votes], index) => ({ 
            seriesId, 
            upvotes: votes.upvotes, 
            downvotes: votes.downvotes,
            rank: index + 1 
        }));

    // Get all seriesId by upvotes minus downvotes (battleground)
    const topBattleground = Object.entries(voteAggregation)
        .sort(([aId, a], [bId, b]) => {
            const voteDiffA = a.upvotes - a.downvotes;
            const voteDiffB = b.upvotes - b.downvotes;
            const battlegroundDiff = voteDiffB - voteDiffA;
            if (battlegroundDiff !== 0) return battlegroundDiff;
            return compareTitles(seriesNameMap[aId] || '', seriesNameMap[bId] || '');
        })
        .map(([seriesId, votes], index) => ({ 
            seriesId, 
            upvotes: votes.upvotes, 
            downvotes: votes.downvotes,
            rank: index + 1 
        }));

    // Create ranking maps for easy lookup
    const upvoteRankMap = Object.fromEntries(topUpvotes.map(item => [item.seriesId, item.rank]));
    const battlegroundRankMap = Object.fromEntries(topBattleground.map(item => [item.seriesId, item.rank]));

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

    // Write top 10 upvotes to AnalyticsMetrics DynamoDB table
    const topUpvotesPutParams = {
        TableName: process.env.API_MEMESRC_ANALYTICSMETRICSTABLE_NAME,
        Item: marshall({
            id: "topVotes-upvotes",
            value: JSON.stringify(topUpvotes.slice(0, TOP_ITEM_COUNT)),  // Only store top N
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

    // Write top 10 battleground votes to AnalyticsMetrics DynamoDB table
    const topBattlegroundPutParams = {
        TableName: process.env.API_MEMESRC_ANALYTICSMETRICSTABLE_NAME,
        Item: marshall({
            id: "topVotes-battleground",
            value: JSON.stringify(topBattleground.slice(0, TOP_ITEM_COUNT)),  // Only store top N
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

    // Modify the OpenSearch indexing section
    try {
        const client = createOpenSearchClient({ username: opensearchUser, password: opensearchPass });
        
        // Enhance series documents with ranking information
        const enhancedSeries = allSeries.map(doc => ({
            ...doc,
            rankUpvotes: upvoteRankMap[doc.id] || 0,
            rankBattleground: battlegroundRankMap[doc.id] || 0,
            votes: voteAggregation[doc.id] || { upvotes: 0, downvotes: 0 }
        }));
        
        const body = enhancedSeries.flatMap(doc => [
            { index: { _index: 'votes-series', _id: doc.id } },
            doc
        ]);

        const bulkResponse = await client.bulk({ body });
        
        console.log('Bulk response:', JSON.stringify(bulkResponse, null, 2));
        
        if (bulkResponse.body?.errors) {
            console.error('Bulk indexing had errors:', JSON.stringify(bulkResponse.body.items, null, 2));
        }

    } catch (error) {
        console.error('Error bulk indexing series:', error);
        return {
            statusCode: 500,
            body: JSON.stringify('Failed to bulk index series data')
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(voteAggregation)
    };
};

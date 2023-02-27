/* Amplify Params - DO NOT EDIT
    API_MEMESRC_ANALYTICSMETRICSTABLE_ARN
    API_MEMESRC_ANALYTICSMETRICSTABLE_NAME
    API_MEMESRC_GRAPHQLAPIIDOUTPUT
    ENV
    REGION
    STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT */


/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand } = require("@aws-sdk/client-athena");
const { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

const client = new DynamoDBClient({ region: process.env.REGION });

const ATHENA_DB = 'memesrc';
const ATHENA_OUTPUT_LOCATION = `s3://${process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME}/athena`;

// Analytics Queries for Athena
const analyticsQueries = {
    totalFrameViews: `
        SELECT COUNT(*) AS TOTAL_FRAME_VIEWS
        FROM memesrc.${process.env.ENV}_raw__frame_views
        -- WHERE FROM_ISO8601_TIMESTAMP(event_time) > current_timestamp - interval '1' day
        --   AND CAST(year AS INTEGER) = YEAR(CURRENT_DATE) 
        --   AND CAST(month AS INTEGER) = MONTH(CURRENT_DATE) 
        --   AND (CAST(day AS INTEGER) = DAY(CURRENT_DATE) OR CAST(day AS INTEGER) = DAY(current_timestamp - interval '1' day));`,
    totalSearches: `
        SELECT COUNT(*) AS TOTAL_SEARCHES
        FROM memesrc.${process.env.ENV}_raw__searches
        -- WHERE FROM_ISO8601_TIMESTAMP(event_time) > current_timestamp - interval '1' day
        --   AND CAST(year AS INTEGER) = YEAR(CURRENT_DATE) 
        --   AND CAST(month AS INTEGER) = MONTH(CURRENT_DATE) 
        --   AND (CAST(day AS INTEGER) = DAY(CURRENT_DATE) OR CAST(day AS INTEGER) = DAY(current_timestamp - interval '1' day));`,
    totalRandoms: `
        SELECT COUNT(*) AS TOTAL_RANDOMS
        FROM memesrc.${process.env.ENV}_raw__randoms
        -- WHERE FROM_ISO8601_TIMESTAMP(event_time) > current_timestamp - interval '1' day
        --   AND CAST(year AS INTEGER) = YEAR(CURRENT_DATE) 
        --   AND CAST(month AS INTEGER) = MONTH(CURRENT_DATE) 
        --   AND (CAST(day AS INTEGER) = DAY(CURRENT_DATE) OR CAST(day AS INTEGER) = DAY(current_timestamp - interval '1' day));`,
    totalSessions: `
        WITH combined AS (
            SELECT session_id
            FROM memesrc.${process.env.ENV}_raw__frame_views
            -- WHERE FROM_ISO8601_TIMESTAMP(event_time) > current_timestamp - interval '1' day
            --   AND CAST(year AS INTEGER) = YEAR(CURRENT_DATE) 
            --   AND CAST(month AS INTEGER) = MONTH(CURRENT_DATE) 
            --   AND (CAST(day AS INTEGER) = DAY(CURRENT_DATE) OR CAST(day AS INTEGER) = DAY(current_timestamp - interval '1' day))
            UNION
            SELECT session_id
            FROM memesrc.${process.env.ENV}_raw__searches
            -- WHERE FROM_ISO8601_TIMESTAMP(event_time) > current_timestamp - interval '1' day
            --   AND CAST(year AS INTEGER) = YEAR(CURRENT_DATE) 
            --   AND CAST(month AS INTEGER) = MONTH(CURRENT_DATE) 
            --   AND (CAST(day AS INTEGER) = DAY(CURRENT_DATE) OR CAST(day AS INTEGER) = DAY(current_timestamp - interval '1' day))
            UNION
            SELECT session_id
            FROM memesrc.${process.env.ENV}_raw__randoms
            -- WHERE FROM_ISO8601_TIMESTAMP(event_time) > current_timestamp - interval '1' day
            --    AND CAST(year AS INTEGER) = YEAR(CURRENT_DATE) 
            --    AND CAST(month AS INTEGER) = MONTH(CURRENT_DATE) 
            --    AND (CAST(day AS INTEGER) = DAY(CURRENT_DATE) OR CAST(day AS INTEGER) = DAY(current_timestamp - interval '1' day))
        )
        SELECT COUNT(DISTINCT session_id) AS TOTAL_SESSIONS
        FROM combined
        ORDER BY TOTAL_SESSIONS DESC;`,
    popularShows: `
        SELECT 
          COALESCE(series_id, '_unknown') AS series_id
        , COUNT(*) AS TOTAL_FRAME_VIEWS
        FROM memesrc.${process.env.ENV}_raw__frame_views
        -- WHERE FROM_ISO8601_TIMESTAMP(event_time) > current_timestamp - interval '1' day
        --   AND CAST(year AS INTEGER) = YEAR(CURRENT_DATE) 
        --   AND CAST(month AS INTEGER) = MONTH(CURRENT_DATE) 
        --   AND (CAST(day AS INTEGER) = DAY(CURRENT_DATE) OR CAST(day AS INTEGER) = DAY(current_timestamp - interval '1' day))
        GROUP BY series_id;`
}

const athena = new AthenaClient({ region: 'us-east-1' });

exports.handler = async (event) => {
    try {
        console.log(`EVENT: ${JSON.stringify(event)}`);

        // Pick the query based on the request
        const { metric } = event.queryStringParameters
        const query = analyticsQueries[metric]
        console.log(query)

        // Execute each query separately
        console.log(`Executing query: ${query}`);

        // Start the query execution
        const startQueryExecutionCommand = new StartQueryExecutionCommand({
            QueryString: query,
            QueryExecutionContext: { Database: ATHENA_DB },
            ResultConfiguration: { OutputLocation: ATHENA_OUTPUT_LOCATION }
        });
        const startQueryExecutionResponse = await athena.send(startQueryExecutionCommand);
        const queryExecutionId = startQueryExecutionResponse.QueryExecutionId;

        // Wait for the query to complete
        let status = 'QUEUED';
        while (status === 'QUEUED' || status === 'RUNNING') {
            const getQueryExecutionCommand = new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId });
            const getQueryExecutionResponse = await athena.send(getQueryExecutionCommand);
            status = getQueryExecutionResponse.QueryExecution.Status.State;
            console.log(`Query status: ${status}`);
            if (status === 'FAILED' || status === 'CANCELLED') {
                throw new Error(`Query ${queryExecutionId} failed or was cancelled`);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Get the query results
        const getQueryResultsCommand = new GetQueryResultsCommand({ QueryExecutionId: queryExecutionId });
        const getQueryResultsResponse = await athena.send(getQueryResultsCommand);
        const queryResults = getQueryResultsResponse.ResultSet.Rows.map(row => row.Data.map(col => col.VarCharValue));
        console.log(`Query results: ${JSON.stringify(queryResults)}`);

        result = JSON.stringify(queryResults)

        // TODO: Create or update dynamodb (env vars has details) item with id=`'${metric}' so it has value=`${result}`.
        const now = new Date().toISOString();

        const getItemParams = {
            TableName: process.env.API_MEMESRC_ANALYTICSMETRICSTABLE_NAME,
            Key: marshall({ id: metric })
        };

        let item;
        try {
            const getItemCommand = new GetItemCommand(getItemParams);
            const { Item } = await client.send(getItemCommand);
            item = Item && unmarshall(Item);
        } catch (err) {
            console.log(`Get item error: ${err}`);
        }

        const itemParams = {
            TableName: process.env.API_MEMESRC_ANALYTICSMETRICSTABLE_NAME,
            Item: marshall({
                id: metric,
                value: result,
                createdAt: item ? item.createdAt : now,
                updatedAt: now,
                __typename: "AnalyticsMetrics"
            })
        };

        if (item) {
            const updateItemParams = {
                TableName: process.env.API_MEMESRC_ANALYTICSMETRICSTABLE_NAME,
                Key: marshall({ id: metric }),
                UpdateExpression: "SET #value = :value, #updatedAt = :updatedAt",
                ExpressionAttributeNames: {
                    "#value": "value",
                    "#updatedAt": "updatedAt"
                },
                ExpressionAttributeValues: marshall({
                    ":value": result,
                    ":updatedAt": now
                }),
                ReturnValues: "ALL_NEW"
            };
            const { Attributes } = await client.send(new UpdateItemCommand(updateItemParams));
            item = unmarshall(Attributes);
        } else {
            const { Item } = await client.send(new PutItemCommand(itemParams));
            item = unmarshall(Item);
        }

        resultBody = {
            metric: metric,
            value: item.value, 
            updatedAt: item.updatedAt
        }

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(resultBody),
        };
    } catch (error) {
        console.error(`Error: ${error}`);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message })
        };
    }
};

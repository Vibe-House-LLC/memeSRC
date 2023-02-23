/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand } = require("@aws-sdk/client-athena");


const test = {
    "id": "eadf48f0-d665-4571-b1ea-ca2e7b364414",
    "searchString": "Garfield",
    "seriesName": "ithinkyoushouldleave",
    "session_id": "001016ae-1e87-4cf9-9afe-26721ee2ae5c",
    "event_time": "2023-02-22T22:44:42.127Z"
}

const ATHENA_DB = 'memesrc';
const ATHENA_OUTPUT_LOCATION = `s3://${process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME}/athena`;
const ATHENA_QUERY = `
    
    DROP TABLE IF EXISTS memesrc.${process.env.ENV}_raw__frame_views;
    CREATE EXTERNAL TABLE memesrc.${process.env.ENV}_raw__frame_views ( 
              id string
            , session_id string
            , fid string
            , series_id string
            , season_num int
            , epsiode_num int
            , frame_num int
            , event_time string )
        PARTITIONED BY (year string, month string, day string)
        ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
        LOCATION 's3://${process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME}/analytics/frame';
    MSCK REPAIR TABLE memesrc.${process.env.ENV}_raw__frame_views;

    DROP TABLE IF EXISTS memesrc.${process.env.ENV}_raw__searches;
    CREATE EXTERNAL TABLE memesrc.${process.env.ENV}_raw__searches ( 
          id string
        , session_id string
        , search_query string
        , series_id string
        , event_time string )
        PARTITIONED BY (year string, month string, day string)
        ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
        LOCATION 's3://${process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME}/analytics/search';
    MSCK REPAIR TABLE memesrc.${process.env.ENV}_raw__searches;

    DROP TABLE IF EXISTS memesrc.${process.env.ENV}_raw__random;
    CREATE EXTERNAL TABLE memesrc.${process.env.ENV}_raw__random ( 
          id string
        , session_id string
        , series_id string
        , event_time string )
        PARTITIONED BY (year string, month string, day string)
        ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
        LOCATION 's3://${process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME}/analytics/random';
    MSCK REPAIR TABLE memesrc.${process.env.ENV}_raw__random;
`;

console.log(ATHENA_OUTPUT_LOCATION)

const athena = new AthenaClient({ region: 'us-east-1' });

exports.handler = async (event) => {
    try {
        console.log(`EVENT: ${JSON.stringify(event)}`);

        // Split the query into separate statements
        const queries = ATHENA_QUERY.split(';').map(q => q.trim()).filter(q => q.length > 0);

        // Execute each query separately
        const results = [];
        for (const query of queries) {
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

            results.push(queryResults);
        }

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Content-Type": "application/json"
            }, 
            body: JSON.stringify(results),
        };
    } catch (error) {
        console.error(`Error: ${error}`);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message })
        };
    }
};

/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
const { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand } = require("@aws-sdk/client-athena");

// CONFIGURATION
const ATHENA_DB = 'memesrc';
const TABLE_NAMES = [
    `${ATHENA_DB}.${process.env.ENV}_raw__frame_views`,
    `${ATHENA_DB}.${process.env.ENV}_raw__searches`,
    `${ATHENA_DB}.${process.env.ENV}_raw__randoms`
]
const ATHENA_OUTPUT_LOCATION = `s3://${process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME}/athena`;

// Build athena queries to add today's parition to the index for each table
const date = new Date();
const year = date.getFullYear();
const month = (date.getMonth() + 1).toString().padStart(2, '0');
const day = date.getDate().toString().padStart(2, '0');
const ATHENA_QUERY = TABLE_NAMES.map(tableName => `ALTER TABLE ${tableName} ADD PARTITION (year=${year}, month=${month}, day=${day});`).join('\n');

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
                console.log(`QUERY EXECUTION STATUS: ${JSON.stringify(getQueryExecutionResponse.QueryExecution.Status)}`)
                console.log(`Query status: ${status}`);
                if (status === 'FAILED' || status === 'CANCELLED') {
                    console.log(`Query ${queryExecutionId} failed or was cancelled`);
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Get the query results
            const getQueryResultsCommand = new GetQueryResultsCommand({ QueryExecutionId: queryExecutionId });
            const getQueryResultsResponse = await athena.send(getQueryResultsCommand);
            const queryResults = getQueryResultsResponse.ResultSet?.Rows.map(row => row.Data.map(col => col.VarCharValue));
            console.log(`Query results: ${JSON.stringify(queryResults)}`);

            results.push(queryResults);
        }

        return {
            statusCode: 200,
            // Uncomment below to enable CORS requests
            // headers: {
            //     "Access-Control-Allow-Origin": "*",
            //     "Access-Control-Allow-Headers": "*"
            // }, 
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

/* Amplify Params - DO NOT EDIT
    ENV
    REGION
    STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT *//*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["opensearch_user","opensearch_pass","opensearch_url"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  })
  .promise();

Parameters will be of the form { Name: 'secretName', Value: 'secretValue', ... }[]
*/
/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const { S3 } = require("@aws-sdk/client-s3");
const { SSM, GetParametersCommand } = require("@aws-sdk/client-ssm");
const uuid = require('uuid');
const axios = require('axios');

// Analytics bucket name
const analyticsBucket = process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME;

const trackAnalyticsEventToS3 = (eventData, eventType, sessionId) => {
    const uniqueId = uuid.v4();
    const s3 = new S3();
    const eventTime = new Date(Date.now());
    const year = eventTime.getUTCFullYear();
    const month = `0${eventTime.getUTCMonth() + 1}`.slice(-2);
    const day = `0${eventTime.getUTCDate()}`.slice(-2);

    const s3Params = {
        Bucket: analyticsBucket,
        Key: `analytics/${eventType}/year=${year}/month=${month}/day=${day}/${uniqueId}.json`,
        Body: JSON.stringify({ id: uniqueId, ...eventData, session_id: sessionId, event_time: eventTime }),
        ContentType: "application/json"
    };

    // console.log(s3Params)

    return s3.putObject(s3Params);
};

exports.handler = async (event) => {

    // Get the query string params
    const params = event.queryStringParameters;

    let randomFrame

    if (params.warmup) {
        randomFrame = { status: 'ready' }
    } else {
        // Pull secrets from SSM
        const ssmClient = new SSM();
        const ssmParams = {
            Names: ["opensearch_user", "opensearch_pass", "opensearch_url"].map(secretName => process.env[secretName]),
            WithDecryption: true,
        };
        const { Parameters } = await ssmClient.send(new GetParametersCommand(ssmParams));

        // OpenSearch values
        const opensearch_url = Parameters.find(param => param.Name === process.env['opensearch_url']).Value
        const opensearch_user = Parameters.find(param => param.Name === process.env['opensearch_user']).Value
        const opensearch_pass = Parameters.find(param => param.Name === process.env['opensearch_pass']).Value

        const listIndexes = async () => {
            // /_cat/indices?h=index,docs.count&format=json
            const url = `${opensearch_url}/_cat/indices?h=index&format=json`
            const headers = { 'Content-Type': 'application/json' };
            const opensearch_auth = {
                username: opensearch_user,
                password: opensearch_pass
            };
            return axios.get(url, {
                auth: opensearch_auth,
                headers
            }).then((response) => {
                const indexes = response.data.filter(item => !item.index.startsWith('.'));
                // console.log(indexes)
                return indexes;
            }).catch((error) => {
                console.log(error);
            });
        }

        // Define function to get a random frame
        const getRandomFrame = async series => {
            console.log(`SELECTED SERIES: ${series}`)
            let index;
            if (series && series !== '_universal') {
                index = series
            }
            else {
                await listIndexes().then(indexes => {
                    // console.log(indexes)
                    // console.log(Math.floor(Math.random() * indexes.length))
                    index = indexes[Math.floor(Math.random() * indexes.length)].index
                })
            }
            console.log(`SEARCHING INDEX: ${index}`)
            const url = `${opensearch_url}/${index}/_search`
            const headers = { 'Content-Type': 'application/json' };
            const opensearch_auth = {
                username: opensearch_user,
                password: opensearch_pass
            };
            const payload = {
                size: 1,
                query: {
                    function_score: {
                        functions: [
                            {
                                random_score: {
                                    seed: Date.now().toString()
                                }
                            }
                        ]
                    }
                }
            }
            return axios.get(url, {
                auth: opensearch_auth,
                data: payload,
                headers
            }).then((response) => {
                const randomFrame = response.data.hits.hits[0]._source
                console.log(randomFrame)
                return randomFrame;
            }).catch((error) => {
                console.log(error);
            });
        }

        // Output the event for debugging purposes
        // console.log(`EVENT: ${JSON.stringify(event)}`);

        // console.log(`EVENT: ${JSON.stringify(event)}`);

        randomFrame = await getRandomFrame(params.series);

        // Track analytics event
        const data = {
            series_id: params.series
        };
        try {
            await trackAnalyticsEventToS3(data, "random", params.sessionId);
            console.log("Analytics event tracked to S3 data lake");
        } catch (error) {
            console.error(`Analytics error: ${error}`);
        }
    }

    return {
        statusCode: 200,
        //  Uncomment below to enable CORS requests
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*"
        },
        body: JSON.stringify(randomFrame),
    };
};

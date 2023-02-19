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

const trackAnalyticsEventToS3 = (eventData, eventType) => {
    const uniqueId = uuid.v4();
    const s3 = new S3();
    const eventTime = new Date(Date.now());
    const year = eventTime.getUTCFullYear();
    const month = `0${eventTime.getUTCMonth() + 1}`.slice(-2);
    const day = `0${eventTime.getUTCDate()}`.slice(-2);

    const s3Params = {
        Bucket: analyticsBucket,
        Key: `analytics/${eventType}/year=${year}/month=${month}/day=${day}/${uniqueId}.json`,
        Body: JSON.stringify({ ...eventData, eventTime, eventYear: year, eventMonth: month, eventDay: day }),
        ContentType: "application/json"
    };

    console.log(s3Params)

    return s3.putObject(s3Params);
};

exports.handler = async (event) => {
    console.log(`ENV VARS:\n${JSON.stringify(process.env)}`)

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

    // Define function to get a random frame
    const getRandomFrame = series => {
        const index = (series && series !== '_universal') ? series : "*,-fc-*"
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
    console.log(`EVENT: ${JSON.stringify(event)}`);

    // Get the query string params
    const params = event.queryStringParameters;

    console.log(`EVENT: ${JSON.stringify(event)}`);

    const randomFrame = await getRandomFrame(params.series);

    // Track analytics event
    const data = {
        seriesName: params.series
    };
    try {
        await trackAnalyticsEventToS3(data, "random");
        console.log("Successfully wrote data to S3");
    } catch (error) {
        console.error(error);
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

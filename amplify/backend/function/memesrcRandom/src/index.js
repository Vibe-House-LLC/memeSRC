/*
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

const aws = require('aws-sdk');
const axios = require('axios');

exports.handler = async (event) => {
    // Pull secrets from SSM
    const { Parameters } = await (new aws.SSM())
        .getParameters({
            Names: ["opensearch_user", "opensearch_pass", "opensearch_url"].map(secretName => process.env[secretName]),
            WithDecryption: true,
        })
        .promise();

    // OpenSearch values
    const opensearch_url = Parameters.find(param => param.Name === process.env['opensearch_url']).Value
    const opensearch_user = Parameters.find(param => param.Name === process.env['opensearch_user']).Value
    const opensearch_pass = Parameters.find(param => param.Name === process.env['opensearch_pass']).Value

    // Define function to get a random frame
    const getRandomFrame = series => {
        const index = (series && series!=='_universal') ? series : "*,-fc-*"
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

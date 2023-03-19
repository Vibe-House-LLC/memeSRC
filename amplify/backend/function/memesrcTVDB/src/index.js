/*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["apikey","pin"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  })
  .promise();

Parameters will be of the form { Name: 'secretName', Value: 'secretValue', ... }[]
*/

const { SSM, GetParametersCommand } = require("@aws-sdk/client-ssm");
const axios = require('axios');

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const getTvdbToken = async () => {
  // Pull secrets from SSM
  const ssmClient = new SSM();
  const ssmParams = {
    Names: ["apikey", "pin"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  };
  const { Parameters } = await ssmClient.send(new GetParametersCommand(ssmParams));

  // OpenSearch values
  const tvdbApiKey = Parameters.find(param => param.Name === process.env['apikey']).Value
  const tvdbPin = Parameters.find(param => param.Name === process.env['pin']).Value

  var data = JSON.stringify({
    "apikey": tvdbApiKey,
    "pin": tvdbPin
  });

  var config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://api4.thetvdb.com/v4/login',
    headers: {
      'Content-Type': 'application/json'
    },
    data: data
  };

  return await axios(config)
    .then(function (response) {
      return response.data.data.token
    })
    .catch(function (error) {
      console.log(error)
      return { error }
    });
}

const searchTvdb = async (query) => {
  const token = await getTvdbToken()

  var config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: `https://api4.thetvdb.com/v4/search?query=${query}&limit=1`,
    headers: {
      'x-api-key': '7e8bc22c-ae9c-4abf-b246-07ed665c8e96',
      'Authorization': `Bearer ${token}`
    }
  };

  return await axios(config)
    .then(function (response) {
      return response.data;
    })
    .catch(function (error) {
      console.log(error);
      return { error }
    });
}

exports.handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  results = await searchTvdb(event.queryStringParameters.query)

  return {
    statusCode: 200,
    //  Uncomment below to enable CORS requests
    //  headers: {
    //      "Access-Control-Allow-Origin": "*",
    //      "Access-Control-Allow-Headers": "*"
    //  }, 
    body: JSON.stringify(results.data),
  };
};

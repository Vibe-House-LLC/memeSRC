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

const tvdbAuthToken = async () => {
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

const tvdbSearch = async (query) => {
  const token = await tvdbAuthToken()
  console.log(token)
  var config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: `https://api4.thetvdb.com/v4/search?query=${query}&limit=5`,
    headers: {
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

const tvdbApi = async (path) => {
  const token = await tvdbAuthToken()

  var config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: `https://api4.thetvdb.com/v4/${path}`,
    headers: {
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

  let results
  
  // Determine the action to take
  const cleanPath = event.path.split(`/${process.env.ENV}/public/tvdb/`)[1];
  console.log(`Clean Path: ${cleanPath}`)
  switch (cleanPath) {
    case 'search':
      results = await tvdbSearch(event.queryStringParameters.query)
      break
    default:
      results = await tvdbApi(cleanPath)
      break
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(results.data),
  };
};

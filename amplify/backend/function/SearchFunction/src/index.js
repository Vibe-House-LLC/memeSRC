/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const aws = require('aws-sdk');
const axios = require('axios');

// Define the function to search OpenSearch
const search = (search_string, series_name, opensearch_endpoint, opensearch_user, opensearch_pass) => {
  const max_results = 50;

  const opensearch_auth = {
    username: opensearch_user,
    password: opensearch_pass
  };

  let url;
  if (series_name === '_universal') {
    url = `${opensearch_endpoint}/*,-fc-*/_search?size=${max_results}`;
  } else {
    url = `${opensearch_endpoint}/${series_name}/_search?size=${max_results}`;
  }
  const payload = {
    query: {
      match: {
        sub_content: search_string
      }
    }
  };

  const headers = { 'Content-Type': 'application/json' };
  return axios.get(url, {
    auth: opensearch_auth,
    data: payload,
    headers
  }).then((response) => {
    return response.data;
  }).catch((error) => {
    console.log(error);
  });
};

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

  // Output the event for debugging purposes
  console.log(`EVENT: ${JSON.stringify(event)}`);

  // Get the query string params
  const params = event.queryStringParameters;

  // Pull the results from OpenSearch and clean them up
  const response = await search(params.q, params.series, opensearch_url, opensearch_user, opensearch_pass)
  const hits = response.hits.hits
  const cleanResults = hits.map(hit => ({
    fid: hit._id,
    series_name: hit._index,
    season_number: hit._source.season.toString(),
    episode_number: hit._source.episode.toString(),
    frame_image: `/${hit._index}/img/${hit._source.season}/${hit._source.episode}/${hit._id}.jpg`,
    subtitle: hit._source.sub_content
  }));

  // Return the search results as JSON
  return {
    statusCode: 200,
    body: JSON.stringify(cleanResults),
    headers: {
      'ContentType': 'application/json',
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*"
    }
  };
};

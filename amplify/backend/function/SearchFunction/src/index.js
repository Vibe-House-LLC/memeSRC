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
/* Amplify Params - DO NOT EDIT
  ENV
  REGION
  STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT *//**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const { S3 } = require("@aws-sdk/client-s3");
const { SSM, GetParametersCommand } = require("@aws-sdk/client-ssm");
const axios = require('axios');
const uuid = require('uuid');

// S3 bucket name for the analyticsBucket
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

  console.log(s3Params)

  return s3.putObject(s3Params);
};

function tokenSuggestions(suggestBlock, original) {
  const tokens = String(original || "").trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];

  const normalized = tokens.map((t) => t.toLowerCase().replace(/[^\w]/g, ""));
  const entries = suggestBlock?.did_you_mean || [];
  const used = new Set();

  const result = tokens.map((t) => ({ original: t, suggested: null }));

  for (const entry of entries) {
    const options = entry.options || [];
    if (!options.length) continue;

    const best =
      options.reduce(
        (acc, cur) =>
          (cur.score ?? -Infinity) > (acc?.score ?? -Infinity) ? cur : acc,
        null
      ) || null;

    if (!best?.text) continue;

    const idx = normalized.findIndex(
      (t, i) => !used.has(i) && t === entry.text.toLowerCase()
    );
    if (idx >= 0) {
      result[idx].suggested = best.text;
      used.add(idx);
    }
  }

  return result;
}


const createTestObject = (prefix, data) => {
  const uniqueId = uuid.v4(); // use UUID for unique identifier
  const s3 = new S3(); // create a new instance of the AWS SDK S3 client
  const s3Params = { // Set up the parameters for the S3 object
    Bucket: analyticsBucket,
    Key: `${prefix}/${uniqueId}.json`,
    Body: JSON.stringify(data),
    ContentType: 'application/json'
  };
  return s3.putObject(s3Params); // Return the S3 promise for the S3 object
}

// Define the function to search OpenSearch
const search = async (searchString, seriesName, sessionId, opensearchEndpoint, opensearchUser, opensearchPass) => {
  const max_results = 50;

  // console.log(`ENV VARS:\n${JSON.stringify(process.env)}`)

  // trackAnalyticsEventToS3(data, "search")
  //   .then(() => console.log("Successfully wrote data to S3"))
  //   .catch((err) => console.error(err));

  // Track analytics event
  const data = {
    search_query: searchString,
    series_id: seriesName
  };
  try {
    await trackAnalyticsEventToS3(data, "search", sessionId);
    console.log("Successfully wrote data to S3");
  } catch (error) {
    console.error(error);
  }


  const opensearch_auth = {
    username: opensearchUser,
    password: opensearchPass
  };

  let url;
  if (seriesName === '_universal') {
    url = `${opensearchEndpoint}/*,-fc-*/_search?size=${max_results}`;
  } else {
    url = `${opensearchEndpoint}/${seriesName}/_search?size=${max_results}`;
  }
  const payload = {
    query: {
      match: {
        sub_content: searchString
      }
    },
    suggest: {
      did_you_mean: {
        text: searchString,
        term: {
          field: "sub_content",
          suggest_mode: "missing",
          min_word_length: 3
        }
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
  // Get the query string params
  const params = event.queryStringParameters;

  let cleanResults
  let suggestions
  if (params.warmup) {
    cleanResults = { "status": "ready" }
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

    // Output the event for debugging purposes
    // console.log(`EVENT: ${JSON.stringify(event)}`);

    // Pull the results from OpenSearch and clean them up
    const response = await search(params.q, params.series, params.sessionId, opensearch_url, opensearch_user, opensearch_pass)
    const hits = response.hits.hits
    cleanResults = hits.map(hit => ({
      fid: hit._id,
      series_name: hit._index,
      season_number: hit._source.season.toString(),
      episode_number: hit._source.episode.toString(),
      frame_image: `/${hit._index}/img/${hit._source.season}/${hit._source.episode}/${hit._id}.jpg`,
      subtitle: hit._source.sub_content
    }));
    suggestions = tokenSuggestions(response.suggest, params.q);
  }

  // Return the search results as JSON
  return {
    statusCode: 200,
    body: JSON.stringify({ results: cleanResults, suggestions: suggestions }),
    headers: {
      'ContentType': 'application/json',
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*"
    }
  };
};

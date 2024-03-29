/* Amplify Params - DO NOT EDIT
	API_MEMESRC_FRAMESUBTITLETABLE_ARN
	API_MEMESRC_FRAMESUBTITLETABLE_NAME
	API_MEMESRC_GRAPHQLAPIIDOUTPUT
	ENV
	REGION
	STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT *//*
Use the following code to retrieve configured secrets from SSM:

const aws = require('aws-sdk');

const { Parameters } = await (new aws.SSM())
  .getParameters({
    Names: ["opensearch_user","opensearch_url","opensearch_pass"].map(secretName => process.env[secretName]),
    WithDecryption: true,
  })
  .promise();

Parameters will be of the form { Name: 'secretName', Value: 'secretValue', ... }[]
*/
/* Amplify Params - DO NOT EDIT
  ENV
  REGION
  STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const { S3 } = require("@aws-sdk/client-s3");
const { SSM, GetParametersCommand } = require("@aws-sdk/client-ssm");
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
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
    Body: JSON.stringify({ id: uniqueId, ...eventData, session_id: sessionId, event_time: eventTime}),
    ContentType: "application/json"
  };

  console.log(s3Params)

  return s3.putObject(s3Params);
};


const splitFrameId = (frameId) => {
  const [seriesId, idS, idE, frameNum] = frameId.split('-')
  return { seriesId, frameNum: parseInt(frameNum), idS, idE }
}

const generateFrameIds = (frameId, fineTuning = false) => {
  const frameMultiple = fineTuning ? 1 : 9
  const { seriesId, frameNum, idS, idE } = splitFrameId(frameId)
  const baseId = `${seriesId}-${idS}-${idE}`
  const prevIds = Array.from({ length: 9 }, (_, i) => {
    const newFrameNum = frameNum + (i - 4) * frameMultiple
    return `${baseId}-${newFrameNum}`
  })
  return prevIds
}

const generateSurroundingFrames = (frameId) => {
  const ids = generateFrameIds(frameId)
  const { seriesId, idS, idE } = splitFrameId(frameId)
  const surroundingFrameData = ids.map((id) => {
    const newFrameNum = id.split('-')[3]
    return { fid: id, frame_image: `/${seriesId}/img/${idS}/${idE}/${id}.jpg` }
  })
  return surroundingFrameData
}

const generateFineTuningFrames = (frameId) => {
  const ids = generateFrameIds(frameId, true)
  const { seriesId, idS, idE } = splitFrameId(frameId)
  const fineTuningData = ids.map((id) => `/${seriesId}/img/${idS}/${idE}/${id}.jpg`)
  return fineTuningData
}

function parseFrameData(frameData) {
  const { content_id, frame_id, sub_content } = frameData;

  const seriesName = content_id.split('-')[0];
  const [idS, idE] = frame_id.split('-').slice(1);

  const surroundingFrames = generateSurroundingFrames(frame_id)
  const fineTuningFrames = generateFineTuningFrames(frame_id)

  return {
    fid: frame_id,
    series_name: seriesName,
    season_number: parseInt(idS),
    episode_number: parseInt(idE),
    subtitle: sub_content,
    frame_image: `/${seriesName}/img/${idS}/${idE}/${frame_id}.jpg`,
    frames_surrounding: surroundingFrames,
    frames_fine_tuning: fineTuningFrames
  };
}

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

  const getFrameFromOpenSearch = async fid => {
    const seriesId = fid.split('-')[0];
    const url = `${opensearch_url}/${seriesId}/_doc/${fid}`;
    console.log(`OPENSEARCH REQUEST URL: ${url}`);
    const headers = { 'Content-Type': 'application/json' };
    const opensearch_auth = {
      username: opensearch_user,
      password: opensearch_pass
    };
    return axios.get(url, {
      auth: opensearch_auth,
      headers
    }).then(response => {
      return parseFrameData(response.data._source);
    }).catch(error => {
      console.log(error);
      throw error;
    });
  };  

  // Define function to get a random frame
  const getFrame = async fid => {
    const dynamoDBClient = new DynamoDB();
    const dynamoDBParams = {
      TableName: process.env.API_MEMESRC_FRAMESUBTITLETABLE_NAME,
      Key: {
        id: { S: fid }
      }
    };
    return dynamoDBClient
      .getItem(dynamoDBParams)
      .then(data => {
        if (data.Item) {
          // If item exists in DynamoDB
          const rawFrameData = {
            content_id: fid.split('-')[0], // extract series info from fid
            frame_id: fid,
            sub_content: data.Item.subtitle.S
          };
          return parseFrameData(rawFrameData);
        } else {
          // Fallback to OpenSearch if no record in DynamoDB
          return getFrameFromOpenSearch(fid);
        }
      })
      .catch(error => {
        console.log(error);
        throw error;
      });
  };
  
  // Output the event for debugging purposes
  // console.log(`EVENT: ${JSON.stringify(event)}`);

  // Get the query string params
  const params = event.queryStringParameters;

  // console.log(`EVENT: ${JSON.stringify(event)}`);

  const fid = params.fid;

  const frame = await getFrame(fid);

  // TESTING
  console.log(`STARTTTTT:`);
  const surroundingFramesWithSubtitles = await Promise.all(frame.frames_surrounding.map(async record => {
    try {
      const frameData = await getFrame(record.fid);
      return {
        ...record,
        subtitle: frameData.subtitle
      };
    } catch (error) {
      console.log(error);
    }
  }));

  frame.frames_surrounding = surroundingFramesWithSubtitles
  
  // console.log(output);
  
  // console.log(`BRAND NEW OUTPUT: ${JSON.stringify(surroundingFramesWithSubtitles)}`);

  // Track analytics event
  const frameData = splitFrameId(fid);
  // seriesId, idS, idE, frameNum
  const data = {
    fid,
    series_id: frameData.seriesId,
    season_num: frameData.idS,
    epsiode_num: frameData.idE,
    frame_num: frameData.frameNum
  }
  try {
    await trackAnalyticsEventToS3(data, "frame", params.sessionId);
    console.log("Successfully wrote data to S3");
  } catch (error) {
    console.error(error);
  }

  return {
    statusCode: 200,
    //  Uncomment below to enable CORS requests
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(frame)
  };
};

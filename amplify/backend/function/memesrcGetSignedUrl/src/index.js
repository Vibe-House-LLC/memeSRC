/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

const AWS = require('aws-sdk');

const s3 = new AWS.S3();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

const getPathFromEvent = (event) => {
  const queryPath = event?.queryStringParameters?.path;
  if (typeof queryPath === 'string' && queryPath.trim().length > 0) {
    return queryPath.trim();
  }
  if (event?.body) {
    try {
      const body = JSON.parse(event.body);
      if (typeof body?.path === 'string' && body.path.trim().length > 0) {
        return body.path.trim();
      }
    } catch (_) {
      return null;
    }
  }
  return null;
};

const normalizeKey = (path) => {
  if (!path) return null;
  let key = path.trim();
  if (key.startsWith('s3://')) {
    const withoutScheme = key.replace('s3://', '');
    const parts = withoutScheme.split('/');
    parts.shift();
    key = parts.join('/');
  }
  if (key.startsWith('http://') || key.startsWith('https://')) {
    try {
      const parsed = new URL(key);
      key = parsed.pathname.replace(/^\/+/, '');
    } catch (_) {
      return null;
    }
  }
  key = key.replace(/^\/+/, '');
  return key.length > 0 ? key : null;
};

exports.handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);
  try {
    const rawPath = getPathFromEvent(event);
    const key = normalizeKey(rawPath);
    if (!key) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing path' }),
      };
    }

    const bucket = process.env.STORAGE_MEMESRCGENERATEDIMAGES_BUCKETNAME;
    if (!bucket) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing bucket configuration' }),
      };
    }

    const signedUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: bucket,
      Key: key,
      Expires: 60 * 10,
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ url: signedUrl }),
    };
  } catch (error) {
    console.error('Failed to create signed URL', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to create signed URL' }),
    };
  }
};

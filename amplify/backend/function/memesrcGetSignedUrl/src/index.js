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

const parsePathsValue = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch (_) {
      // fall through to delimiter parsing
    }
    if (trimmed.includes(',')) {
      return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [trimmed];
  }
  return [];
};

const getPathsFromEvent = (event) => {
  const queryPaths = parsePathsValue(event?.queryStringParameters?.paths);
  if (queryPaths.length > 0) return queryPaths;
  const queryPath = event?.queryStringParameters?.path;
  if (typeof queryPath === 'string' && queryPath.trim().length > 0) {
    return [queryPath.trim()];
  }
  if (event?.body) {
    try {
      const body = JSON.parse(event.body);
      const bodyPaths = parsePathsValue(body?.paths);
      if (bodyPaths.length > 0) return bodyPaths;
      if (typeof body?.path === 'string' && body.path.trim().length > 0) {
        return [body.path.trim()];
      }
    } catch (_) {
      return [];
    }
  }
  return [];
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
    const rawPaths = getPathsFromEvent(event);
    if (!rawPaths.length) {
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

    const uniquePaths = Array.from(new Set(rawPaths));
    const results = await Promise.all(
      uniquePaths.map(async (path) => {
        const key = normalizeKey(path);
        if (!key) {
          return { path, error: 'Invalid path' };
        }
        try {
          const signedUrl = await s3.getSignedUrlPromise('getObject', {
            Bucket: bucket,
            Key: key,
            Expires: 60 * 10,
          });
          return { path, url: signedUrl };
        } catch (error) {
          console.error('Failed to create signed URL', error);
          return { path, error: 'Failed to create signed URL' };
        }
      })
    );

    const urls = {};
    const errors = {};
    results.forEach((result) => {
      if (result.url) {
        urls[result.path] = result.url;
      }
      if (result.error) {
        errors[result.path] = result.error;
      }
    });

    if (uniquePaths.length === 1 && Object.keys(urls).length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: errors[uniquePaths[0]] || 'Invalid path' }),
      };
    }

    const responseBody = {
      urls,
      errors,
    };
    if (uniquePaths.length === 1 && Object.keys(urls).length === 1) {
      responseBody.url = urls[uniquePaths[0]];
    }
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(responseBody),
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

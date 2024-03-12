const https = require('https');
const JSZip = require('jszip');

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
  try {
    const { id, season, episode, subtitle } = event.pathParameters;

    if (!id || !season || !episode || !subtitle) {
      return {
        statusCode: 400,
        body: JSON.stringify('Missing required path parameters'),
      };
    }

    const subtitleIndex = parseInt(subtitle);

    if (isNaN(subtitleIndex) || subtitleIndex < 0) {
      return {
        statusCode: 400,
        body: JSON.stringify('Invalid subtitle index'),
      };
    }

    const groupIndex = Math.floor(subtitleIndex / 15);
    const zipUrl = `https://memesrc.com/v2/${id}/${season}/${episode}/s${groupIndex}.zip`;

    console.log("zipUrl", zipUrl);

    const zipData = await new Promise((resolve, reject) => {
      https.get(zipUrl, (response) => {
        let data = [];
        response.on('data', (chunk) => {
          data.push(chunk);
        });
        response.on('end', () => {
          resolve(Buffer.concat(data));
        });
      }).on('error', (error) => {
        reject(error);
      });
    });

    const zip = await JSZip.loadAsync(zipData);
    const videoPath = `s${subtitleIndex}.mp4`;
    const videoFile = zip.file(videoPath);

    if (!videoFile) {
      return {
        statusCode: 404,
        body: JSON.stringify('Video file not found in ZIP'),
      };
    }

    const videoData = await videoFile.async('nodebuffer');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
      body: videoData.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify('An error occurred while processing the request'),
    };
  }
};

const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

const CHUNK_DURATION = 25; // Duration of each chunk in seconds
const FPS = 10; // Frames per second of the source

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
  try {
    const { index, season, episode, frame } = event.pathParameters;

    if (!index || !season || !episode || !frame) {
      return {
        statusCode: 400,
        body: JSON.stringify('Missing required path parameters'),
      };
    }

    const frameNumber = parseInt(frame);

    if (isNaN(frameNumber) || frameNumber < 1) {
      return {
        statusCode: 400,
        body: JSON.stringify('Invalid frame number'),
      };
    }

    const fileIndex = Math.floor((frameNumber - 1) / (CHUNK_DURATION * FPS));
    const internalFrameIndex = ((frameNumber - 1) % (CHUNK_DURATION * FPS)) / FPS;

    const videoUrl = `https://memesrc.com/v2/${index}/${season}/${episode}/${fileIndex}.mp4`;
    const outputFile = path.join('/tmp', `frame-${Date.now()}.jpg`);

    await new Promise((resolve, reject) => {
      const command = ffmpeg(videoUrl)
        .outputOptions([
          `-ss ${internalFrameIndex}`,
          '-vframes 1',
          '-c:v mjpeg',
          '-f image2',
        ])
        .output(outputFile)
        .on('end', resolve)
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(err);
        });

      console.log('FFmpeg command:', command.toString());
      console.log('Video URL:', videoUrl);
      console.log('Internal Frame Index:', internalFrameIndex);
      console.log('Output File:', outputFile);

      command.run();
    });

    const imageBuffer = fs.readFileSync(outputFile);
    const base64Image = imageBuffer.toString('base64');

    const response = {
        statusCode: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
        },
        body: base64Image,
        isBase64Encoded: true,
      }

    console.log('response:', JSON.stringify(response))

    return response;
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify('An error occurred while processing the request'),
    };
  }
};

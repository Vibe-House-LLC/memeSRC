const fs = require('fs');
const path = require('path');
const https = require('https');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

const CHUNK_DURATION = 25; // Duration of each chunk in seconds
const FPS = 10; // Frames per second of the source

async function downloadFile(url, filePath) {
  const file = fs.createWriteStream(filePath);
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      })
      .on('error', (err) => {
        fs.unlink(filePath, () => {
          reject(err);
        });
      });
  });
}

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = async (event) => {
  const { id, season, episode, range } = event.pathParameters;
  const { base64subtitle } = event.queryStringParameters || {};

  if (!id || !season || !episode || !range) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Missing required parameters: ${JSON.stringify(event.pathParameters)}` }),
    };
  }

  const [startFrame, endFrame] = range.split('-').map(Number);

  const startFileIndex = Math.floor((startFrame - 1) / (CHUNK_DURATION * FPS));
  const endFileIndex = Math.floor((endFrame - 1) / (CHUNK_DURATION * FPS));

  const outputFile = path.join('/tmp', `${id}-${season}-${episode}-${range}.gif`);

  try {
    const inputFiles = [];
    for (let i = startFileIndex; i <= endFileIndex; i++) {
      const videoUrl = `https://memesrc.com/v2/${id}/${season}/${episode}/${i}.mp4`;
      const localFilePath = path.join('/tmp', `${id}-${season}-${episode}-${i}.mp4`);
      await downloadFile(videoUrl, localFilePath);
      inputFiles.push(localFilePath);
    }

    if (inputFiles.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No input files found for the specified range' }),
      };
    }

    let subtitleOptions = [];
    if (base64subtitle) {
      const subtitleText = Buffer.from(base64subtitle, 'base64').toString('utf-8');
      const subtitleLines = subtitleText.split('\n');
      const subtitleFile = path.join('/tmp', `${id}-${season}-${episode}-${range}.srt`);
    
      const srtContent = subtitleLines
        .map((line, index) => {
          return `${index + 1}\n00:00:00,000 --> 00:00:30,000\n${line}\n\n`;
        })
        .join('');
    
      fs.writeFileSync(subtitleFile, srtContent);
      subtitleOptions = [`subtitles=${subtitleFile}:force_style='FontName=Arial,FontSize=14'`];
    }

    await new Promise((resolve, reject) => {
      const command = ffmpeg();

      inputFiles.forEach((file) => {
        command.input(file);
      });

      command
        .inputOptions([`-ss ${((startFrame - 1) % (CHUNK_DURATION * FPS)) / FPS}`])
        .outputOptions([
          `-frames:v ${endFrame - startFrame + 1}`,
          '-vf',
          `fps=${FPS},scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse${subtitleOptions.length > 0 ? `,${subtitleOptions.join(',')}` : ''}`,
          '-loop',
          '0',
        ])
        .output(outputFile)
        .on('end', () => {
          console.log('GIF generation complete');
          resolve();
        })
        .on('error', (err) => {
          console.error('Error generating GIF:', err);
          reject(err);
        });

      console.log('FFmpeg command:', command.toString());
      command.run();
    });

    const gifBuffer = fs.readFileSync(outputFile);
    inputFiles.forEach((file) => {
      fs.unlinkSync(file);
    });
    fs.unlinkSync(outputFile);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/gif',
      },
      body: gifBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error('Error generating GIF:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate GIF' }),
    };
  }
};

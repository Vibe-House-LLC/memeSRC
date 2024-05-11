import { Buffer } from "buffer";
import { Storage } from "aws-amplify";
import sanitizeHtml from 'sanitize-html';
import { extractVideoFrames } from './videoFrameExtractor';

// Utility function to fetch JSON data from a given URL
const fetchJSON = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Utility function to fetch CSV data and parse it
const fetchCSV = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const csvText = await response.text();
  return csvText.split('\n').map((row) => row.split(','));
};

// Helper function to find subtitle info for a frame and decode base64 subtitle
const findSubtitleForFrame = (csvData, season, episode, frame) => {
  // console.log('finding subtitle for ', season, episode, frame);
  for (let i = 1; i < csvData.length; i += 1) {
    const [csvSeason, csvEpisode, , encodedSubtitleText, startFrame, endFrame] = csvData[i];
    if (
      season === parseInt(csvSeason, 10) &&
      episode === parseInt(csvEpisode, 10) &&
      frame >= parseInt(startFrame, 10) &&
      frame <= parseInt(endFrame, 10)
    ) {
      let subtitleText = Buffer.from(encodedSubtitleText, 'base64').toString(); // Decode subtitle text from base64
      subtitleText = sanitizeHtml(subtitleText, {
        allowedTags: [], // Allow no tags
        allowedAttributes: {}, // Allow no attributes
      });
      return { subtitle: subtitleText, index: i }; // Return sanitized text and index
    }
  }
  return { subtitle: null, index: -1 }; // Return null and -1 if not found
};

// Function to fetch only the subtitle and main image for a frame
const fetchFrameSubtitleAndImage = async (cid, season, episode, frame) => {
  season = parseInt(season, 10);
  episode = parseInt(episode, 10);
  frame = parseInt(frame, 10);

  const csvDownload = (await Storage.get(`src/${cid}/${season}/${episode}/_docs.csv`, { level: 'public', download: true, customPrefix: { public: 'protected/' } })).Body
  const csvData = await csvDownload.text().split('\n').map((row) => row.split(','));

  const { subtitle } = findSubtitleForFrame(csvData, season, episode, frame);
  // Pass a single-element array with the frame
  const mainFrameImages = await extractVideoFrames(cid, season, episode, [frame], 10, 1.0);
  const mainFrameImage = mainFrameImages.length > 0 ? mainFrameImages[0] : 'No image available';

  return {
    subtitle: subtitle || '',
    frame_image: mainFrameImage,
  };
};


// Function to fetch only the frames_fine_tuning array
const fetchFramesFineTuning = async (cid, season, episode, frame) => {
  season = parseInt(season, 10);
  episode = parseInt(episode, 10);
  frame = parseInt(frame, 10);
  // Generate an array of frame indexes for fine-tuning
  const frameIndexes = Array.from({ length: 11 }, (_, i) => frame - 5 + i);
  return extractVideoFrames(cid, season, episode, frameIndexes, 10);
};

// Function to fetch frames_surrounding as an array of promises for image extraction
const fetchFramesSurroundingPromises = (cid, season, episode, frame) => {
  season = parseInt(season, 10);
  episode = parseInt(episode, 10);
  frame = parseInt(frame, 10);

  const offsets = [-40, -30, -20, -10, 0, 10, 20, 30, 40];
  const scaleFactor = 0.2;

  const surroundingFramePromises = offsets.map(offset => {
    const surroundingFrameIndex = Math.round((frame + offset) / 10) * 10; // Round to the nearest whole second
    return extractVideoFrames(cid, season, episode, [surroundingFrameIndex], 10, scaleFactor)
      .then(frameImages => {
        return {
          frame: surroundingFrameIndex,
          frameImage: frameImages.length > 0 ? frameImages[0] : 'No image available',
        };
      });
  });

  return surroundingFramePromises;
};


// Full implementation of fetchFrameInfo with conditional features
const fetchFrameInfo = async (cid, season, episode, frame, options = {}) => {
  try {
    season = parseInt(season, 10);
    episode = parseInt(episode, 10);
    frame = parseInt(frame, 10);
  

    const metadataDownload = (await Storage.get(`src/${cid}/00_metadata.json`, { level: 'public', download: true, customPrefix: { public: 'protected/' } })).Body

    const metadata = JSON.parse((await metadataDownload.text()))

    const seriesName = metadata.index_name;

    const csvDownload = (await Storage.get(`src/${cid}/${season}/${episode}/_docs.csv`, { level: 'public', download: true, customPrefix: { public: 'protected/' } })).Body
    const csvData = (await csvDownload.text()).split('\n').map((row) => row.split(','));
  

    const { subtitle: mainSubtitle, index: mainSubtitleIndex } = findSubtitleForFrame(csvData, season, episode, frame);
    let mainFrameImage = 'No image available';
    let framesFineTuning = [];
    const subtitlesSurrounding = [];
    let framesSurrounding = [];
  

    // Fetch the main frame image and subtitle only if no specific options are set or the relevant option is true
    if (Object.keys(options).length === 0 || options.mainImage) {
      const mainFrameImages = await extractVideoFrames(cid, season, episode, [frame], 10);
      mainFrameImage = mainFrameImages.length > 0 ? mainFrameImages[0] : 'No image available';
    }
  

    // Fetch frames_fine_tuning array if requested
    if (options.framesFineTuning) {
      framesFineTuning = await fetchFramesFineTuning(cid, season, episode, frame);
    }
  

    // Fetch surrounding subtitles and images if requested
    if (options.subtitlesSurrounding) {
      if (mainSubtitleIndex !== -1) { // Ensure mainSubtitleIndex was found      
        const startIndex = Math.max(1, mainSubtitleIndex - 3);
        const endIndex = Math.min(csvData.length - 1, mainSubtitleIndex + 3);
        for (let i = startIndex; i <= endIndex; i += 1) {
          const [, , , encodedSubtitleText, startFrame, endFrame] = csvData[i];
          const subtitleText = Buffer.from(encodedSubtitleText, 'base64').toString();
          const middleFrame = Math.round(((parseInt(startFrame, 10) + parseInt(endFrame, 10)) / 2) / 10) * 10; // Round to the nearest whole second
          subtitlesSurrounding.push(
            {
              subtitle: subtitleText, // Use decoded subtitle text
              frame: middleFrame,
            }
          );
        }
      } else { // If no current subtitle found, use the nearest subtitle for surrounding subtitles
        let closestSubtitleIndex = -1;
        let minDistance = Infinity;
        for (let i = 1; i < csvData.length; i += 1) {
          const [, , , , startFrame, endFrame] = csvData[i];
          const distance = Math.min(Math.abs(frame - startFrame), Math.abs(frame - endFrame));
          if (distance < minDistance) {
            minDistance = distance;
            closestSubtitleIndex = i;
          }
        }

        if (closestSubtitleIndex !== -1) {
          const startIndex = Math.max(1, closestSubtitleIndex - 3);
          const endIndex = Math.min(csvData.length - 1, closestSubtitleIndex + 3);
          for (let i = startIndex; i <= endIndex; i += 1) {
            const [, , , encodedSubtitleText, startFrame, endFrame] = csvData[i];
            const subtitleText = Buffer.from(encodedSubtitleText, 'base64').toString();
            const middleFrame = Math.floor((parseInt(startFrame, 10) + parseInt(endFrame, 10)) / 2);
            subtitlesSurrounding.push(
              {
                subtitle: subtitleText,
                frame: middleFrame,
              }
            );
          }
        }
      }
    }
    // console.log("TEST: 9")
    // Fetch frames_surrounding as an array of promises for image extraction if requested
    if (options.framesSurroundingPromises) {
      framesSurrounding = fetchFramesSurroundingPromises(cid, season, episode, frame);
      // Note: framesSurrounding is returned as an array of promises, to be resolved by the caller
    }

    // console.log("TEST: 10")

    return {
      series_name: seriesName,
      subtitle: mainSubtitle || '',
      frame_image: mainFrameImage,
      frames_surrounding: framesSurrounding,
      frames_fine_tuning: framesFineTuning,
      subtitles_surrounding: subtitlesSurrounding,
      fontFamily: metadata.fontFamily || '',
      source: 'IPFS',
    };
  } catch (error) {
    // console.log("TEST: -1")
    console.error('Failed to fetch frame information:', error);
    throw error;
  }
};

export {
  fetchFrameInfo,
  fetchFrameSubtitleAndImage,
  fetchFramesFineTuning,
  fetchFramesSurroundingPromises,
};

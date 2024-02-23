import { extractVideoFrames } from './videoFrameExtractor';

const fetchFrameImageUrls = async (cid, season, episode, frameStart, frameEnd, fps = 10, scaleFactor = 1.0) => {
  // Call the extractVideoFrames function to get blob URLs for frames
  return extractVideoFrames(cid, season, episode, frameStart, frameEnd, fps, scaleFactor);
};

// Utility function to decode base64-encoded text
const decodeBase64 = (base64String) => {
  try {
    return atob(base64String); // Decode base64 string to plain text
  } catch (error) {
    console.error('Failed to decode base64 string:', error);
    return null; // Return null in case of error
  }
};

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
  console.log('finding subtitle for ', season, episode, frame);
  for (let i = 1; i < csvData.length; i += 1) {
    const [csvSeason, csvEpisode, , encodedSubtitleText, startFrame, endFrame] = csvData[i];
    if (
      season === parseInt(csvSeason, 10) &&
      episode === parseInt(csvEpisode, 10) &&
      frame >= parseInt(startFrame, 10) &&
      frame <= parseInt(endFrame, 10)
    ) {
      const subtitleText = decodeBase64(encodedSubtitleText); // Decode subtitle text from base64
      return { subtitle: subtitleText, index: i }; // Return decoded text and index
    }
  }
  return { subtitle: null, index: -1 }; // Return null and -1 if not found
};

// Function to fetch only the subtitle and main image for a frame
const fetchFrameSubtitleAndImage = async (cid, season, episode, frame) => {
  season = parseInt(season, 10);
  episode = parseInt(episode, 10);
  frame = parseInt(frame, 10);

  const csvUrl = `https://ipfs.memesrc.com/ipfs/${cid}/${season}/${episode}/_docs.csv`;
  const csvData = await fetchCSV(csvUrl);
  const { subtitle } = findSubtitleForFrame(csvData, season, episode, frame);
  const mainFrameImages = await extractVideoFrames(cid, season, episode, frame, frame, 10);
  const mainFrameImage = mainFrameImages.length > 0 ? mainFrameImages[0] : 'No image available';

  return {
    subtitle: subtitle || 'No subtitle for this frame.',
    frame_image: mainFrameImage,
  };
};

// Function to fetch only the frames_fine_tuning array
const fetchFramesFineTuning = async (cid, season, episode, frame) => {
  season = parseInt(season, 10);
  episode = parseInt(episode, 10);
  frame = parseInt(frame, 10);
  return extractVideoFrames(cid, season, episode, frame - 4, frame + 6, 10);
};

// Function to fetch frames_surrounding as an array of promises for image extraction
const fetchFramesSurroundingPromises = (cid, season, episode, frame) => {
  season = parseInt(season, 10);
  episode = parseInt(episode, 10);
  frame = parseInt(frame, 10);
  const surroundingFramePromises = [];
  for (let offset = -40; offset <= 40; offset += 10) {
    if (offset === 0 || Math.abs(offset) <= 40) { // Include the current frame and 4 on either side
      const surroundingFrame = frame + offset;
      surroundingFramePromises.push(
        extractVideoFrames(cid, season, episode, surroundingFrame, surroundingFrame, 10, 0.1)
          .then(frameImages => {
            // Ensure the promise resolves to an object with the expected structure
            return {
              frame: surroundingFrame,
              frameImage: frameImages.length > 0 ? frameImages[0] : 'No image available',
              // Add other keys if necessary
            };
          })
      );
    }
  }
  return surroundingFramePromises;
};


// Full implementation of fetchFrameInfo with conditional features
const fetchFrameInfo = async (cid, season, episode, frame, options = {}) => {
  try {
    season = parseInt(season, 10);
    episode = parseInt(episode, 10);
    frame = parseInt(frame, 10);

    const metadataUrl = `https://ipfs.memesrc.com/ipfs/${cid}/00_metadata.json`;
    const metadata = await fetchJSON(metadataUrl);
    const seriesName = metadata.index_name;

    const csvUrl = `https://ipfs.memesrc.com/ipfs/${cid}/${season}/${episode}/_docs.csv`;
    const csvData = await fetchCSV(csvUrl);

    const { subtitle: mainSubtitle, index: mainSubtitleIndex } = findSubtitleForFrame(csvData, season, episode, frame);
    let mainFrameImage = 'No image available';
    let framesFineTuning = [];
    const subtitlesSurrounding = [];
    let framesSurrounding = [];

    // Fetch the main frame image and subtitle only if no specific options are set or the relevant option is true
    if (Object.keys(options).length === 0 || options.mainImage) {
      const mainFrameImages = await extractVideoFrames(cid, season, episode, frame, frame, 10);
      mainFrameImage = mainFrameImages.length > 0 ? mainFrameImages[0] : 'No image available';
    }

    // Fetch frames_fine_tuning array if requested
    if (options.framesFineTuning) {
      framesFineTuning = await fetchFramesFineTuning(cid, season, episode, frame);
    }

    // Fetch surrounding subtitles and images if requested
    if (options.subtitlesSurrounding) {
      // Adjusted to handle the returned object with subtitle and index
      const { subtitle: mainSubtitle, index: mainSubtitleIndex } = findSubtitleForFrame(csvData, season, episode, frame);

      // Fetch surrounding subtitles with images, adjusted to use mainSubtitleIndex and decode base64
      const subtitlesSurroundingPromises = [];
      if (mainSubtitleIndex !== -1) { // Ensure mainSubtitleIndex was found
        const startIndex = Math.max(1, mainSubtitleIndex - 3);
        const endIndex = Math.min(csvData.length - 1, mainSubtitleIndex + 3);
        for (let i = startIndex; i <= endIndex; i += 1) {
          const [,, , encodedSubtitleText, startFrame, endFrame] = csvData[i];
          const subtitleText = decodeBase64(encodedSubtitleText); // Decode subtitle text from base64 here
          const middleFrame = Math.floor((parseInt(startFrame, 10) + parseInt(endFrame, 10)) / 2);
          subtitlesSurrounding.push(
            {
              subtitle: subtitleText, // Use decoded subtitle text
              frame: middleFrame,
            }
          );
        }
      }

      // Resolve all promises for surrounding subtitles with images
      // subtitlesSurrounding = await Promise.all(subtitlesSurroundingPromises);
    }

    // Fetch frames_surrounding as an array of promises for image extraction if requested
    if (options.framesSurroundingPromises) {
      framesSurrounding = fetchFramesSurroundingPromises(cid, season, episode, frame);
      // Note: framesSurrounding is returned as an array of promises, to be resolved by the caller
    }

    return {
      series_name: seriesName,
      subtitle: mainSubtitle || 'No subtitle for this frame.',
      frame_image: mainFrameImage,
      frames_surrounding: framesSurrounding,
      frames_fine_tuning: framesFineTuning,
      subtitles_surrounding: subtitlesSurrounding,
      source: 'IPFS',
    };
  } catch (error) {
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

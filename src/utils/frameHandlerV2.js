import { extractVideoFrames } from './videoFrameExtractor';

const fetchFrameImageUrls = async (cid, season, episode, frameStart, frameEnd, fps = 10) => {
  // Call the extractVideoFrames function to get blob URLs for frames
  return extractVideoFrames(cid, season, episode, frameStart, frameEnd, fps);
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

// Modified Helper function to find subtitle info for a frame and decode base64 subtitle
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

const fetchFrameInfo = async (cid, season, episode, frame) => {
  try {
    season = parseInt(season, 10);
    episode = parseInt(episode, 10);
    frame = parseInt(frame, 10);

    const metadataUrl = `https://ipfs.memesrc.com/ipfs/${cid}/00_metadata.json`;
    const metadata = await fetchJSON(metadataUrl);
    const seriesName = metadata.index_name;

    const csvUrl = `https://ipfs.memesrc.com/ipfs/${cid}/${season}/${episode}/_docs.csv`;
    const csvData = await fetchCSV(csvUrl);

    // Adjusted to handle the returned object with subtitle and index
    const { subtitle: mainSubtitle, index: mainSubtitleIndex } = findSubtitleForFrame(csvData, season, episode, frame);

    // Fetch surrounding subtitles with images, adjusted to use mainSubtitleIndex and decode base64
    const subtitlesSurroundingPromises = [];
    if (mainSubtitleIndex !== -1) { // Ensure mainSubtitleIndex was found
      const startIndex = Math.max(1, mainSubtitleIndex - 5);
      const endIndex = Math.min(csvData.length - 1, mainSubtitleIndex + 5);
      for (let i = startIndex; i <= endIndex; i += 1) {
        if (i !== mainSubtitleIndex) {
          const [,, , encodedSubtitleText, startFrame, endFrame] = csvData[i];
          const subtitleText = decodeBase64(encodedSubtitleText); // Decode subtitle text from base64 here
          const middleFrame = Math.round((parseInt(startFrame, 10) + parseInt(endFrame, 10)) / 2);
          subtitlesSurroundingPromises.push(
            fetchFrameImageUrls(cid, season, episode, middleFrame, middleFrame, 10).then(
              (frameImages) => {
                const frameImage = frameImages.length > 0 ? frameImages[0] : 'No image available';
                return {
                  subtitle: subtitleText, // Use decoded subtitle text
                  frame: middleFrame,
                  frameImage,
                };
              }
            )
          );
        }
      }
    }

    // Resolve all promises for surrounding subtitles with images
    const subtitlesSurrounding = await Promise.all(subtitlesSurroundingPromises);

    // Initialize promises array for surrounding frames
    const surroundingFramePromises = [];

    for (let offset = -40; offset <= 40; offset += 10) {
        if (offset === 0 || Math.abs(offset) <= 40) { // Include the current frame and 4 on either side
            const surroundingFrame = frame + offset;
            const surroundingSubtitle = findSubtitleForFrame(csvData, season, episode, surroundingFrame);
            surroundingFramePromises.push(
              fetchFrameImageUrls(cid, season, episode, surroundingFrame, surroundingFrame, 10).then(
                (surroundingFrameImages) => {
                  const surroundingFrameImage =
                    surroundingFrameImages.length > 0 ? surroundingFrameImages[0] : 'No image available';
                  return {
                    frame: surroundingFrame,
                    frameImage: surroundingFrameImage,
                    subtitle: surroundingSubtitle.subtitle, // Adjusted to access subtitle property
                  };
                }
              )
            );
        }
    }

    // Resolve all promises for surrounding frames
    const framesSurrounding = await Promise.all(surroundingFramePromises);

    const [mainFrameImages, framesFineTuning] = await Promise.all([
      extractVideoFrames(cid, season, episode, frame, frame, 10),
      extractVideoFrames(cid, season, episode, frame - 5, frame + 5, 10),
    ]);

    const mainFrameImage = mainFrameImages.length > 0 ? mainFrameImages[0] : 'No image available';

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

export default fetchFrameInfo;

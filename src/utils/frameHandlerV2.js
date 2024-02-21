// Import the extractVideoFrames function from videoFrameExtractor.js
import { extractVideoFrames } from './videoFrameExtractor';

const fetchFrameImageUrls = async (cid, season, episode, frameStart, frameEnd, fps = 30) => {
  // Call the extractVideoFrames function to get blob URLs for frames
  return extractVideoFrames(cid, season, episode, frameStart, frameEnd, fps);
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

// Helper function to find subtitle info for a frame
const findSubtitleForFrame = (csvData, season, episode, frame) => {
  console.log('finding subtitle for ', season, episode, frame);
  for (let i = 1; i < csvData.length; i += 1) {
    // Adjusted for ESLint
    const [csvSeason, csvEpisode, , subtitleText, startFrame, endFrame] = csvData[i];
    if (
      season === parseInt(csvSeason, 10) &&
      episode === parseInt(csvEpisode, 10) &&
      frame >= parseInt(startFrame, 10) &&
      frame <= parseInt(endFrame, 10)
    ) {
      return subtitleText;
    }
  }
  return null; // No subtitle for this frame
};

// Update the fetchFrameInfo function to include frame image URL fetching
const fetchFrameInfo = async (cid, season, episode, frame) => {
  try {
    // Parse args as integers
    season = parseInt(season, 10);
    episode = parseInt(episode, 10);
    frame = parseInt(frame, 10);

    // Fetching series name from metadata
    const metadataUrl = `https://ipfs.memesrc.com/ipfs/${cid}/00_metadata.json`;
    const metadata = await fetchJSON(metadataUrl);
    const seriesName = metadata.index_name;

    // Fetching subtitles from CSV
    const csvUrl = `https://ipfs.memesrc.com/ipfs/${cid}/${season}/${episode}/_docs.csv`;
    const csvData = await fetchCSV(csvUrl);

    // Finding the relevant subtitle for the main frame
    const mainSubtitle = findSubtitleForFrame(csvData, season, episode, frame);

    // Initialize promises array for surrounding frames
    const surroundingFramePromises = [];

    for (let offset = -50; offset <= 50; offset += 10) {
      if (offset !== 0) {
        const surroundingFrame = frame + offset;
        const surroundingSubtitle = findSubtitleForFrame(csvData, season, episode, surroundingFrame);
        // Add promise to the array without awaiting here
        surroundingFramePromises.push(
          fetchFrameImageUrls(cid, season, episode, surroundingFrame, surroundingFrame, 30).then(
            (surroundingFrameImages) => {
              const surroundingFrameImage =
                surroundingFrameImages.length > 0 ? surroundingFrameImages[0] : 'No image available';
              return {
                frame: surroundingFrame,
                frameImage: surroundingFrameImage,
                subtitle: surroundingSubtitle,
              };
            }
          )
        );
      }
    }

    // Resolve all promises for surrounding frames
    const framesSurrounding = await Promise.all(surroundingFramePromises);

    // Fetch the main frame image URL and frames for fine tuning concurrently
    const [mainFrameImages, framesFineTuning] = await Promise.all([
      fetchFrameImageUrls(cid, season, episode, frame, frame, 30),
      fetchFrameImageUrls(cid, season, episode, frame - 5, frame + 5, 30),
    ]);

    const mainFrameImage = mainFrameImages.length > 0 ? mainFrameImages[0] : 'No image available';

    // Constructing return object
    return {
      series_name: seriesName,
      subtitle: mainSubtitle || 'No subtitle for this frame.',
      frame_image: mainFrameImage,
      frames_surrounding: framesSurrounding,
      frames_fine_tuning: framesFineTuning,
      source: 'IPFS',
    };
  } catch (error) {
    console.error('Failed to fetch frame information:', error);
    throw error;
  }
};

export default fetchFrameInfo;

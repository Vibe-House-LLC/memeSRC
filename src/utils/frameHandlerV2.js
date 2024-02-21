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
    return csvText.split('\n').map(row => row.split(','));
  };
  
  // Helper function to find subtitle info for a frame
  const findSubtitleForFrame = (csvData, season, episode, frame) => {
    console.log("finding subtitle for ", season, episode, frame)
    for (let i = 1; i < csvData.length; i += 1) { // Adjusted for ESLint
      const [csvSeason, csvEpisode, , subtitleText, startFrame, endFrame] = csvData[i];
      if (season === parseInt(csvSeason, 10) && episode === parseInt(csvEpisode, 10) && frame >= parseInt(startFrame, 10) && frame <= parseInt(endFrame, 10)) {
        return subtitleText;
      }
    }
    return null; // No subtitle for this frame
  };
  
  // Main function to fetch frame information
  const fetchFrameInfo = async (cid, season, episode, frame) => {
    try {
      // Parse args as integers
      season = parseInt(season, 10)
      episode = parseInt(episode, 10)
      frame = parseInt(frame, 10)

      // Fetching series name from metadata
      const metadataUrl = `https://ipfs.memesrc.com/ipfs/${cid}/00_metadata.json`;
      const metadata = await fetchJSON(metadataUrl);
      const seriesName = metadata.index_name;
  
      // Fetching subtitles from CSV
      const csvUrl = `https://ipfs.memesrc.com/ipfs/${cid}/${season}/${episode}/_docs.csv`;
      const csvData = await fetchCSV(csvUrl);
  
      // Finding the relevant subtitle for the main frame
      const mainSubtitle = findSubtitleForFrame(csvData, season, episode, frame);
  
      // Constructing framesSurrounding array
      const framesSurrounding = [];
      for (let offset = -50; offset <= 50; offset += 10) {
        // Only add frames that are not the main frame itself
        if (offset !== 0) {
          const surroundingFrame = frame + offset;
          const surroundingSubtitle = findSubtitleForFrame(csvData, season, episode, surroundingFrame);
          framesSurrounding.push({
            frame: surroundingFrame,
            frameImage: `TODO`, // Placeholder for the frame image URL
            subtitle: surroundingSubtitle,
          });
        }
      }
  
      // Constructing return object
      return {
        seriesName, // Adjusted for camelCase
        subtitle: mainSubtitle || "No subtitle for this frame.", // Simplified conditional
        frameImage: `TODO`, // Placeholder for the main frame image URL, adjusted for camelCase
        framesSurrounding, // Adjusted for camelCase
        source: "IPFS",
      };
    } catch (error) {
      console.error("Failed to fetch frame information:", error);
      throw error;
    }
  };
  
  export default fetchFrameInfo;
  
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
  
  // Main function to fetch frame information
  const fetchFrameInfo = async (cid, season, episode, frame) => {
    try {
      // Fetching series name from metadata
      const metadataUrl = `https://ipfs.memesrc.com/ipfs/${cid}/00_metadata.json`;
      const metadata = await fetchJSON(metadataUrl);
      const seriesName = metadata.index_name;
  
      // Fetching subtitles from CSV
      const csvUrl = `https://ipfs.memesrc.com/ipfs/${cid}/${season}/${episode}/_docs.csv`;
      const csvData = await fetchCSV(csvUrl);
      let subtitleInfo = null;
  
      // Finding the relevant subtitle for the frame
      for (let i = 1; i < csvData.length; i+=1) { // Skipping header row
        const [csvSeason, csvEpisode, subtitleIndex, subtitleText, startFrame, endFrame] = csvData[i];
        if (season === csvSeason && episode === csvEpisode && frame >= startFrame && frame <= endFrame) {
          subtitleInfo = {
            subtitle: subtitleText,
            frame_image: `https://ifps.memesrc.com/${cid}/${season}/${episode}/s${subtitleIndex}.zip`,
          };
          break;
        }
      }
  
      // Constructing return object
      return {
        series_name: seriesName,
        subtitle: subtitleInfo ? subtitleInfo.subtitle : "No subtitle for this frame.",
        frame_image: subtitleInfo ? subtitleInfo.frame_image : null,
        source: "IPFS",
      };
    } catch (error) {
      console.error("Failed to fetch frame information:", error);
      throw error;
    }
  };
  
  export default fetchFrameInfo;

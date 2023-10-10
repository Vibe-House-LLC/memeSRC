import { API, graphqlOperation } from "aws-amplify";
import { getFrameSubtitle } from "../graphql/queries"; // assuming queries.js is in the same directory

const ERROR_SUBTITLE = "ERROR: AWAITING DDB CACHE";

const splitFrameId = (frameId) => {
  const [seriesId, idS, idE, frameNum] = frameId.split('-')
  return { seriesId, frameNum: parseInt(frameNum, 10), idS, idE }
}

const generateFrameIds = (frameId, fineTuning = false) => {
  const frameMultiple = fineTuning ? 1 : 9
  const { seriesId, frameNum, idS, idE } = splitFrameId(frameId)
  const baseId = `${seriesId}-${idS}-${idE}`
  const prevIds = Array.from({ length: 9 }, (_, i) => {
    const newFrameNum = frameNum + (i - 4) * frameMultiple
    return `${baseId}-${newFrameNum}`
  })
  return prevIds
}

const fetchSubtitleForFrame = async (frameId) => {
  try {
    const frameData = await API.graphql(graphqlOperation(getFrameSubtitle, { id: frameId }));
    if (frameData.data.getFrameSubtitle && typeof frameData.data.getFrameSubtitle.subtitle !== 'undefined') {
      return frameData.data.getFrameSubtitle.subtitle || "";
  }
  
    throw new Error('Subtitle not found in DynamoDB');
  
  } catch (error) {
    console.warn(`Failed to fetch subtitle for frame ID ${frameId} from DynamoDB:`, error);
    return ERROR_SUBTITLE;
  }
}

const generateSurroundingFrames = async (frameId) => {
  const ids = generateFrameIds(frameId);
  const { seriesId, idS, idE } = splitFrameId(frameId);

  const surroundingFrameDataPromises = ids.map(async (id) => {
    const subtitle = await fetchSubtitleForFrame(id);
    const newFrameNum = id.split('-')[3];
    return {
      fid: id,
      frame_image: `/${seriesId}/img/${idS}/${idE}/${id}.jpg`,
      subtitle
    };
  });

  return Promise.all(surroundingFrameDataPromises);
}

const generateFineTuningFrames = (frameId) => {
  const ids = generateFrameIds(frameId, true)
  const { seriesId, idS, idE } = splitFrameId(frameId)
  const fineTuningData = ids.map((id) => `/${seriesId}/img/${idS}/${idE}/${id}.jpg`)
  return fineTuningData
}

const parseFrameData = async (frameId, subtitle, source) => {
  const seriesName = frameId.split('-')[0];
  const [idS, idE] = frameId.split('-').slice(1);
  
  // Await for the promises to resolve
  const surroundingFrames = await generateSurroundingFrames(frameId);
  const fineTuningFrames = generateFineTuningFrames(frameId); // Assuming this is synchronous

  return {
    fid: frameId,
    series_name: seriesName,
    season_number: parseInt(idS, 10),
    episode_number: parseInt(idE, 10),
    subtitle: (typeof subtitle === 'string') ? subtitle : ERROR_SUBTITLE,
    frame_image: `/${seriesName}/img/${idS}/${idE}/${frameId}.jpg`,
    frames_surrounding: surroundingFrames,
    frames_fine_tuning: fineTuningFrames,
    source
  };
}


const getFrame = async (fid) => {
  console.log(`GETTING FRAME: ${fid}`);
  
  try {
    const subtitle = await fetchSubtitleForFrame(fid);
    console.log(subtitle)
    if (subtitle !== ERROR_SUBTITLE) {
      console.log("IT THOUGHT IT MATCHED DDB")
      return parseFrameData(fid, subtitle, "DDB");
    }
    throw new Error('Subtitle not found in DynamoDB');
  } catch (error) {
    console.warn("Failed to fetch frame data from DynamoDB. Falling back to REST API:", error);
    
    try {
      const restApiData = await API.get('publicapi', '/frame', { queryStringParameters: { fid } });
      if (restApiData) {
        return restApiData; // Return the data directly from the REST API
      }
      throw new Error('No data received from REST API');
    } catch (restApiError) {
      console.error("Failed to fetch frame data from REST API:", restApiError);
      // You could decide what to return in case of complete failure. For example, an error object or a default structure.
      return {
        error: "Failed to fetch frame data from both DDB and REST API",
        details: restApiError.message
      };
    }
  }
}

export default getFrame;

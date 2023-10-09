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

const generateSurroundingFrames = (frameId) => {
  const ids = generateFrameIds(frameId)
  const { seriesId, idS, idE } = splitFrameId(frameId)
  const surroundingFrameData = ids.map((id) => {
    const newFrameNum = id.split('-')[3]
    return { fid: id, frame_image: `/${seriesId}/img/${idS}/${idE}/${id}.jpg` }
  })
  return surroundingFrameData
}

const generateFineTuningFrames = (frameId) => {
  const ids = generateFrameIds(frameId, true)
  const { seriesId, idS, idE } = splitFrameId(frameId)
  const fineTuningData = ids.map((id) => `/${seriesId}/img/${idS}/${idE}/${id}.jpg`)
  return fineTuningData
}

const parseFrameData = async (frameId, subtitle) => {
  const seriesName = frameId.split('-')[0];
  const [idS, idE] = frameId.split('-').slice(1);
  
  const surroundingFrames = generateSurroundingFrames(frameId)
  const fineTuningFrames = generateFineTuningFrames(frameId)

  return {
    fid: frameId,
    series_name: seriesName,
    season_number: parseInt(idS, 10),
    episode_number: parseInt(idE, 10),
    subtitle: subtitle || ERROR_SUBTITLE,
    frame_image: `/${seriesName}/img/${idS}/${idE}/${frameId}.jpg`,
    frames_surrounding: surroundingFrames,
    frames_fine_tuning: fineTuningFrames
  };
}

const getFrame = async (fid) => {
  try {
    const frameData = await API.graphql(graphqlOperation(getFrameSubtitle, { id: fid }));
    const subtitle = frameData.data.getFrameSubtitle.subtitle;

    if (subtitle) {
      return parseFrameData(fid, subtitle);
    }
    
    throw new Error('Subtitle not found in DynamoDB');
  } catch (error) {
    console.warn("Failed to fetch frame data from DynamoDB. Falling back to REST API:", error);
    
    try {
      const restApiData = await API.get('publicapi', '/frame', { queryStringParameters: { fid } });
      if (restApiData && restApiData.subtitle) {
        return parseFrameData(fid, restApiData.subtitle);
      }
      
      return parseFrameData(fid, ERROR_SUBTITLE);
    } catch (restApiError) {
      console.error("Failed to fetch frame data from REST API:", restApiError);
      return parseFrameData(fid, ERROR_SUBTITLE);
    }
  }
}

export const getSurroundingFrameSubtitles = async (fid) => {
  const surroundingFrameData = generateSurroundingFrames(fid);

  // Fetch subtitles for each frame
  const framesWithSubtitles = await Promise.all(
    surroundingFrameData.map(async (frame) => {
      const data = await getFrame(frame.fid);
      return {
        fid: frame.fid,
        frame_image: frame.frame_image,
        subtitle: data.subtitle,
      };
    })
  );

  return framesWithSubtitles;
};

export default getFrame;

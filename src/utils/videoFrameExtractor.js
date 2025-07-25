export async function extractVideoFrames(cid, season, episode, frameIndexes) {
  const frameUrls = frameIndexes.map(
    (frameId) => `https://v2-${process.env.REACT_APP_USER_BRANCH}.memesrc.com/frame/${cid}/${season}/${episode}/${frameId}`
  );

  return frameUrls;
}

export async function extractFramesFromVideo(_videoUrl, _frameNumbers, _assumedFps = 10, _scaleFactor = 1.0) {
  console.warn('extractFramesFromVideo is deprecated. Please use extractVideoFrames instead.');
  return [];
}

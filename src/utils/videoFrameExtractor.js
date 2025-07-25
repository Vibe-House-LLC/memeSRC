export async function extractVideoFrames(cid, season, episode, frameIndexes) {
  const frameUrls = frameIndexes.map(
    (frameId) => `https://v2-${process.env.REACT_APP_USER_BRANCH}.memesrc.com/frame/${cid}/${season}/${episode}/${frameId}`
  );

  return frameUrls;
}

export async function extractFramesFromVideo() {
  console.warn('extractFramesFromVideo is deprecated. Please use extractVideoFrames instead.');
  return [];
}

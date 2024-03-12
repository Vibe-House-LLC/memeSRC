export async function extractVideoFrames(cid, season, episode, frameIndexes, fps, scaleFactor) {
  const frameUrls = frameIndexes.map(frameId => {
    return `https://v2.memesrc.com/frame/${cid}/${season}/${episode}/${frameId}`;
  });

  return frameUrls;
}

export async function extractFramesFromVideo(videoUrl, frameNumbers, assumedFps = 10, scaleFactor = 1.0) {
  console.warn('extractFramesFromVideo is deprecated. Please use extractVideoFrames instead.');
  return [];
}

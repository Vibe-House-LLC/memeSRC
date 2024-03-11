export async function extractVideoFrames(cid, season, episode, frameIndexes, fps, scaleFactor) {
  const frameUrls = frameIndexes.map(frameId => {
    return `https://api-dev.memesrc.com/dev/v2/frame/${cid}/${season}/${episode}/${frameId}`;
  });

  const frameBlobs = await Promise.all(frameUrls.map(async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }));

  return frameBlobs;
}

export async function extractFramesFromVideo(videoUrl, frameNumbers, assumedFps = 10, scaleFactor = 1.0) {
  console.warn('extractFramesFromVideo is deprecated. Please use extractVideoFrames instead.');
  return [];
}
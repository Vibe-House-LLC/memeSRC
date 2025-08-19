export async function extractVideoFrames(
  cid: string,
  season: string | number,
  episode: string | number,
  frameIndexes: Array<string | number>
): Promise<string[]> {
  const frameUrls = frameIndexes.map(
    (frameId) => `https://v2-${process.env.REACT_APP_USER_BRANCH}.memesrc.com/frame/${cid}/${season}/${episode}/${frameId}`
  );

  return frameUrls;
}

export async function extractFramesFromVideo(): Promise<any[]> {
  console.warn('extractFramesFromVideo is deprecated. Please use extractVideoFrames instead.');
  return [];
}


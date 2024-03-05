export async function extractVideoFrames(cid, season, episode, frameIndexes, fps, scaleFactor) {
  // Map frame indexes to their respective video files and frame numbers within those files
  const videoLength = 25; // Assuming a fixed video length, adjust as necessary
  const framesPerContainer = videoLength * fps;
  const fileFrameGroups = {};

  frameIndexes.forEach(frameId => {
      const fileNumber = Math.floor(frameId / framesPerContainer);
      const frameNumber = frameId % framesPerContainer;
      const fileName = `${fileNumber}.mp4`; // Adjust format as necessary
      if (!fileFrameGroups[fileName]) {
          fileFrameGroups[fileName] = [];
      }
      fileFrameGroups[fileName].push(frameNumber);
  });

  // Extract frames for each video file
  const fileList = Object.keys(fileFrameGroups).map(async (key) => {
      const videoUrl = `https://ipfs.memesrc.com/ipfs/${cid}/${season}/${episode}/${key}`;
      const frameBlobs = await extractFramesFromVideo(videoUrl, fileFrameGroups[key], fps, scaleFactor);
      return frameBlobs;
  });

  // Await the completion of all promises and return the results in the same order as the input indexes
  const images = await Promise.all(fileList);
  return images.flat();
}

export async function extractFramesFromVideo(videoUrl, frameNumbers, assumedFps = 10, scaleFactor=1.0) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.crossOrigin = 'anonymous';
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const blobs = [];
    let currentFrameIndex = 0;

    video.addEventListener('canplaythrough', () => {
      canvas.width = video.videoWidth*scaleFactor;    // Reduce the resolution a bit for testing performance
      canvas.height = video.videoHeight*scaleFactor;  // Reduce the resolution a bit for testing performance
      
      const captureFrame = (frameIndex) => {
        const frameTime = frameIndex / assumedFps;
        console.log("frameTime", frameTime)
        video.currentTime = frameTime;
      };

      video.addEventListener('seeked', async () => {
        console.log('CURRENT TIME: ', video.currentTime)
        if (currentFrameIndex < frameNumbers.length) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            const objUrl = URL.createObjectURL(blob);
            blobs.push(objUrl);
            currentFrameIndex += 1;
            if (currentFrameIndex < frameNumbers.length) {
              captureFrame(frameNumbers[currentFrameIndex]);
            } else {
              // Once all frames are extracted, pause the video
              video.pause();
              resolve(blobs);
            }
          }, 'image/jpeg');
        }
      });

      // Start capturing frames
      captureFrame(frameNumbers[currentFrameIndex] - 1);
    });

    video.addEventListener('error', (e) => {
      reject(new Error('Error loading video'));
    });
  });
}

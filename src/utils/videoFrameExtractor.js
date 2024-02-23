export async function extractVideoFrames(cid, season, episode, frameStart, frameEnd, fps, scaleFactor) {
    // Calculate frames per container based on video length and fps
    const videoLength = 25; // Assuming a fixed value, adjust as necessary
    const framesPerContainer = videoLength * fps;

    // Calculate start and end file numbers based on frameStart and frameEnd
    const startFile = Math.floor(frameStart / framesPerContainer);
    const endFile = Math.floor(frameEnd / framesPerContainer);

    // Dynamically generate the fileFrameGroups based on frameStart and frameEnd
    const fileFrameGroups = {};
    for (let frameId = frameStart; frameId <= frameEnd; frameId+=1) {
        const fileNumber = Math.floor(frameId / framesPerContainer);
        const frameNumber = frameId % framesPerContainer; // Correct for zero indexing if necessary
        const fileName = `${fileNumber}.mp4`; // Adjust format as necessary
        fileFrameGroups[fileName] = fileFrameGroups[fileName] || [];
        fileFrameGroups[fileName].push(frameNumber);
    }

    // Loop through each video file and extract the specified frames
    const fileList = Object.keys(fileFrameGroups).map(async (key) => {
      const videoUrl = `https://ipfs.memesrc.com/ipfs/${cid}/${season}/${episode}/${key}`;
  
      const frameBlobs = await extractFramesFromVideo(videoUrl, fileFrameGroups[key], fps, scaleFactor);
  
      return [...frameBlobs];
    });
  
    // Await the completion of all promises and flatten the result
    const images = await Promise.all(fileList);
  
    // Return the flat array of blob URLs
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

    video.addEventListener('loadedmetadata', () => {
      canvas.width = video.videoWidth*scaleFactor;    // Reduce the resolution a bit for testing performance
      canvas.height = video.videoHeight*scaleFactor;  // Reduce the resolution a bit for testing performance

      const captureFrame = (frameIndex) => {
        const frameTime = frameIndex / assumedFps;
        video.currentTime = frameTime;
      };

      video.addEventListener('seeked', async () => {
        if (currentFrameIndex < frameNumbers.length) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            const objUrl = URL.createObjectURL(blob);
            blobs.push(objUrl);
            currentFrameIndex += 1;
            if (currentFrameIndex < frameNumbers.length) {
              captureFrame(frameNumbers[currentFrameIndex] - 1);
            } else {
              // Once all frames are extracted, pause the video
              video.pause();
              // video.removeAttribute('src'); // Empty the source
              // video.load(); // Load the empty source to stop the video
              // video.remove(); // Remove the video element
              // canvas.width = 0; // Clear the canvas width
              // canvas.height = 0; // Clear the canvas height
              resolve(blobs);
            }
          }, 'image/jpeg');
        }
      });

      // Start capturing frames
      captureFrame(frameNumbers[currentFrameIndex] - 1); // Adjust for 0-based indexing
    });

    video.addEventListener('error', (e) => {
      reject(new Error('Error loading video'));
    });
  });
}

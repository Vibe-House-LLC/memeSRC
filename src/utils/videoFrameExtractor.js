export async function extractVideoFrames(cid, season, episode, frameStart, frameEnd, fps) {
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
  
      const frameBlobs = await extractFramesFromVideo(videoUrl, fileFrameGroups[key], fps);
  
      return [...frameBlobs];
    });
  
    // Await the completion of all promises and flatten the result
    const images = await Promise.all(fileList);
  
    // Return the flat array of blob URLs
    return images.flat();
}

export async function extractFramesFromVideo(videoUrl, frameNumbers, assumedFps = 30) {
  return new Promise((resolve, reject) => {
    // Create a video element
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.crossOrigin = 'anonymous'; // Handle CORS policy
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const blobs = [];
    let currentFrameIndex = 0;

    video.addEventListener('loadedmetadata', () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Function to capture a frame at a specific index
      const captureFrame = (frameIndex) => {
        const frameTime = frameIndex / assumedFps;
        video.currentTime = frameTime;
      };

      video.addEventListener('seeked', async () => {
        if (currentFrameIndex < frameNumbers.length) {
          // Draw the video frame to the canvas
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          // Convert the canvas to a blob
          canvas.toBlob((blob) => {
            const objUrl = URL.createObjectURL(blob);
            blobs.push(objUrl);
            currentFrameIndex += 1;
            if (currentFrameIndex < frameNumbers.length) {
              // Capture the next frame
              captureFrame(frameNumbers[currentFrameIndex] - 1); // Adjust for 0-based indexing
            } else {
              // Resolve the promise when all frames are loaded
              resolve(blobs);
            }
          }, 'image/jpeg'); // Specify the format and quality if needed
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

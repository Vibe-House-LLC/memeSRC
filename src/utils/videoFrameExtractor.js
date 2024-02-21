// videoFrameExtractor.js
export async function loopThroughKeys(obj, fps, subtitleObj) {
    const files = [];
    // Loop through each key in the object
    const fileList = Object.keys(obj).map(async (key) => {
      const videoUrl = `https://ipfs.memesrc.com/ipfs/${params.cid}/${subtitleObj.season}/${subtitleObj.episode}/${key}`;
  
      const frameBlobs = await extractFramesFromVideo(videoUrl, obj[key], fps);
  
      // console.log(frameBlobs)
  
      return [...frameBlobs];
    });
  
    const images = await Promise.all(fileList);
  
    console.log(images.flat());
  
    setFrames(images.flat());
  }
  
  export async function extractFramesFromVideo(videoUrl, frameNumbers, assumedFps = 30) {
    return new Promise((resolve, reject) => {
      // Create a video element
      const video = document.createElement('video');
      video.src = videoUrl;
      video.muted = true;
      video.crossOrigin = "anonymous"; // Handle CORS policy
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
  
export const resizeImage = (file, maxSize = 1500) => new Promise((resolve, reject) => {
  const img = new Image();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  img.onload = () => {
    try {
      const { width, height } = img;

      let newWidth = width;
      let newHeight = height;

      if (width > height) {
        if (width > maxSize) {
          newWidth = maxSize;
          newHeight = (height * maxSize) / width;
        }
      } else if (height > maxSize) {
        newHeight = maxSize;
        newWidth = (width * maxSize) / height;
      }

      canvas.width = newWidth;
      canvas.height = newHeight;

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        file.type || 'image/jpeg',
        0.85
      );
    } catch (error) {
      reject(error);
    }
  };

  img.onerror = () => {
    reject(new Error('Failed to load image'));
  };

  img.src = URL.createObjectURL(file);
});

export const saveImageToLibrary = async (dataUrl, filename = null) => {
  const { Storage } = await import('aws-amplify');
  try {
    const response = await fetch(dataUrl);
    const originalBlob = await response.blob();

    const file = new File([originalBlob], filename || 'collage-image', {
      type: originalBlob.type
    });

    let blobToUpload;
    try {
      blobToUpload = await resizeImage(file);
    } catch (resizeError) {
      console.warn('Failed to resize image for library, using original:', resizeError);
      blobToUpload = originalBlob;
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).slice(2);
    const extension = blobToUpload.type ? blobToUpload.type.split('/')[1] : 'jpg';
    const key = `library/${timestamp}-${randomId}-${filename || 'collage-image'}.${extension}`;

    await Storage.put(key, blobToUpload, {
      level: 'protected',
      contentType: blobToUpload.type,
      cacheControl: 'max-age=31536000',
    });

    console.log('Successfully saved image to library:', key);
    return key;
  } catch (error) {
    console.error('Error saving image to library:', error);
    throw error;
  }
};

import { fabric } from 'fabric';
import { API, graphqlOperation } from 'aws-amplify';

export const oImgBuild = (path) =>
  new Promise((resolve) => {
    fabric.Image.fromURL(`https://memesrc.com${path}`, (oImg) => {
      resolve(oImg);
    }, { crossOrigin: 'anonymous' });
  });

export const loadImg = (paths, func) => Promise.all(paths.map(func));

export const downloadDataURL = (dataURL, fileName) => {
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = fileName;
  link.click();
};

export function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) throw new Error('Invalid data URL');
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

export async function checkMagicResult(id) {
  try {
    const result = await API.graphql(
      graphqlOperation(`query MyQuery {
            getMagicResult(id: "${id}") {
              results
            }
          }`)
    );
    return result.data.getMagicResult?.results;
  } catch (error) {
    console.error('Error fetching magic result:', error);
    return null;
  }
}

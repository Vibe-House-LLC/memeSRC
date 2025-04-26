import { post as amplifyPost, get as amplifyGet } from 'aws-amplify/api';
import { uploadData as amplifyUploadData, getUrl as amplifyGetUrl, downloadData as amplifyDownloadData } from 'aws-amplify/storage';

export async function get({ apiName, path, options }) {
  try {
    const response = await amplifyGet({
      apiName,
      path,
      options
    }).response;
    
    // The body is a ReadableStream in Amplify v6, we need to parse it
    if (response.body && typeof response.body.json === 'function') {
      return await response.body.json();
    }
    
    console.error('Invalid API response format:', response);
    return {};
  } catch (error) {
    console.error('Error in get request:', error);
    throw error;
  }
}

export async function post({ apiName, path, options }) {
  try {
    const response = await amplifyPost({
      apiName,
      path,
      options
    }).response;
    
    // The body is a ReadableStream in Amplify v6, we need to parse it
    if (response.body && typeof response.body.json === 'function') {
      return await response.body.json();
    }
    
    console.error('Invalid API response format:', response);
    return {};
  } catch (error) {
    console.error('Error in post request:', error);
    throw error;
  }
}

export function uploadData({ key, data, options }) {
  return amplifyUploadData({
    key,
    data,
    options
  });
}

export function getUrl({ key, options }) {
  return amplifyGetUrl({
    key,
    options
  });
}

export function downloadData({ key, options }) {
  return amplifyDownloadData({
    key,
    options
  });
}
import { post as amplifyPost, get as amplifyGet } from 'aws-amplify/api';
import { uploadData as amplifyUploadData, getUrl as amplifyGetUrl, downloadData as amplifyDownloadData } from 'aws-amplify/storage';

export async function get({ apiName, path, options }) {
  const response = await amplifyGet({
    apiName,
    path,
    options
  }).response;
  return response.body;
}

export async function post({ apiName, path, options }) {
  const response = await amplifyPost({
    apiName,
    path,
    options
  }).response;
  return response.body;
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
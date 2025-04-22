import { post as amplifyPost, get as amplifyGet } from 'aws-amplify/api';
import { uploadData as amplifyUploadData, getUrl as amplifyGetUrl, downloadData as amplifyDownloadData } from 'aws-amplify/storage';

export function get({ apiName, path, options }) {
  return amplifyGet({
    apiName,
    path,
    options
  });
}

export function post({ apiName, path, options }) {
  return amplifyPost({
    apiName,
    path,
    options
  });
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
import { API } from 'aws-amplify';

const getSessionID = async (): Promise<string> => {
  const existing = sessionStorage.getItem('sessionID');
  if (existing) {
    return existing;
  }
  try {
    const generatedSessionID = (await API.get('publicapi', '/uuid', {})) as string;
    sessionStorage.setItem('sessionID', generatedSessionID);
    return generatedSessionID;
  } catch (err) {
    console.log(`UUID Gen Fetch Error:  ${err}`);
    throw err;
  }
};

export default getSessionID;

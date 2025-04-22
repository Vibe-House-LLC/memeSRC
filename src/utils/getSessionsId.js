import { get } from 'aws-amplify/api';

const getSessionID = async () => {
    let sessionID;
    if ('sessionID' in sessionStorage) {
      sessionID = sessionStorage.getItem('sessionID');
      return Promise.resolve(sessionID);
    }
    return get({
      apiName: 'publicapi',
      path: '/uuid'
    })
      .then((generatedSessionID) => {
        sessionStorage.setItem('sessionID', generatedSessionID);
        return generatedSessionID;
      })
      .catch((err) => {
        console.log(`UUID Gen Fetch Error:  ${err}`);
        throw err;
      });
  };

export default getSessionID
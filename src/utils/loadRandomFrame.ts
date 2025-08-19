import { useContext, useState } from 'react';
import { API } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import getSessionID from './getSessionsId';
import getRandomIndex from './getRandomIndex';
import loadV2Csv from './loadV2Csv';
import findMidpoint from './findMidpoint';
import useSearchDetailsV2 from '../hooks/useSearchDetailsV2';
import { UserContext } from '../UserContext';

type LoadRandomReturn = {
  loadRandomFrame: (show?: string) => Promise<void>;
  loadingRandom: boolean;
  error: any;
};

function useLoadRandomFrame(): LoadRandomReturn {
  const [loadingRandom, setLoadingRandom] = useState(false);
  const { shows } = useContext(UserContext as any) as any;
  const [error, setError] = useState<any>(null);
  const navigate = useNavigate();
  const { setShowObj } = useSearchDetailsV2() as any;

  const loadRandomFrame = async (show = '_universal') => {
    setLoadingRandom(true);
    setError(null);

    try {
      let showObject: any;
      if (show === '_universal') {
        showObject = getRandomIndex(shows);
      } else if (show === '_favorites') {
        showObject = getRandomIndex(shows.filter((s: any) => s.isFavorite));
      } else {
        showObject = shows.find((singleShow: any) => singleShow.id === show);
      }

      if (showObject?.version === 2) {
        const loadedShowSubtitles: any[] = (await loadV2Csv(showObject.id)) as any[];
        setShowObj(loadedShowSubtitles);
        const randomSubtitle: any = getRandomIndex(loadedShowSubtitles);
        const midpointFrame = findMidpoint(randomSubtitle.start_frame, randomSubtitle.end_frame);
        const roundedFrame = Math.round(midpointFrame / 10) * 10;
        setLoadingRandom(false);
        navigate(`/frame/${showObject.id}/${randomSubtitle.season}/${randomSubtitle.episode}/${roundedFrame}`);
      } else {
        const sessionId = await getSessionID();
        const apiName = 'publicapi';
        const path = '/random';
        const myInit = {
          queryStringParameters: {
            series: showObject.id,
            sessionId,
          },
        } as any;

        const response: any = await API.get(apiName as any, path as any, myInit as any);
        const fid = response.frame_id;
        navigate(`/frame/${fid}`);
        setLoadingRandom(false);
      }
    } catch (err: any) {
      console.error(err);
      setError(err);
      setLoadingRandom(false);
    }
  };

  return { loadRandomFrame, loadingRandom, error };
}

export default useLoadRandomFrame;

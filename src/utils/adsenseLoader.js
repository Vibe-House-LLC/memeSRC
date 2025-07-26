// src/utils/adsenseLoader.js
import { useContext, useEffect } from 'react';
import { UserContext } from '../UserContext';

let adsenseLoaded = false;

export const useAdsenseLoader = () => {
  const { user } = useContext(UserContext);

  useEffect(() => {
    const loadAds = () => {
      if (!adsenseLoaded && (!user || user?.userDetails?.subscriptionStatus !== 'active')) {
        const script = document.createElement("script");
        script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1307598869123774";
        script.async = true;
        script.crossOrigin = "anonymous";
        document.body.appendChild(script);
        adsenseLoaded = true;

        return () => {
          if (user?.userDetails?.subscriptionStatus === 'active') {
            document.body.removeChild(script);
            adsenseLoaded = false;
            const ads = document.getElementsByClassName('adsbygoogle');
            Array.from(ads).forEach(ad => ad.remove());
          }
        };
      }
      return undefined;
    };

    if ('requestIdleCallback' in window) {
      return requestIdleCallback(loadAds);
    }

    return loadAds();
    // eslint-disable-next-line consistent-return
  }, [user]);
};

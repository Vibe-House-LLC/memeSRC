// src/utils/adsenseLoader.ts
import { useContext, useEffect } from 'react';
import { UserContext } from '../UserContext';

let adsenseLoaded = false;

export const useAdsenseLoader = (): void => {
  const { user } = useContext(UserContext as any) as any;

  useEffect(() => {
    if (!adsenseLoaded && (!user || user?.userDetails?.subscriptionStatus !== 'active')) {
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1307598869123774';
      script.async = true;
      script.crossOrigin = 'anonymous';

      const loadScript = () => {
        document.body.appendChild(script);
        adsenseLoaded = true;
      };

      const win = window as any;
      const idleId = 'requestIdleCallback' in win ? win.requestIdleCallback(loadScript) : setTimeout(loadScript, 1000);

      return () => {
        if ('cancelIdleCallback' in win) {
          win.cancelIdleCallback(idleId);
        } else {
          clearTimeout(idleId);
        }
        if (adsenseLoaded && user?.userDetails?.subscriptionStatus === 'active') {
          document.body.removeChild(script);
          adsenseLoaded = false;
          const ads = document.getElementsByClassName('adsbygoogle');
          Array.from(ads).forEach((ad) => (ad as Element).remove());
        }
      };
    }
    return undefined;
  }, [user]);
};


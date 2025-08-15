// src/utils/adsenseLoader.js
import { useContext, useEffect } from 'react';
import { UserContext } from '../UserContext';

let adsenseLoaded = false;

export const useAdsenseLoader = () => {
  const { user } = useContext(UserContext);
  
  useEffect(() => {
    // Only load AdSense if user is not logged in or doesn't have an active subscription
    if (!adsenseLoaded && (!user || user?.userDetails?.subscriptionStatus !== 'active')) {
      const script = document.createElement("script");
      script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1307598869123774";
      script.async = true;
      script.crossOrigin = "anonymous";

      const loadScript = () => {
        document.body.appendChild(script);
        adsenseLoaded = true;
      };

      const idleId = 'requestIdleCallback' in window
        ? window.requestIdleCallback(loadScript)
        : setTimeout(loadScript, 1000);

      return () => {
        if ('cancelIdleCallback' in window) {
          window.cancelIdleCallback(idleId);
        } else {
          clearTimeout(idleId);
        }
        if (adsenseLoaded && user?.userDetails?.subscriptionStatus === 'active') {
          document.body.removeChild(script);
          adsenseLoaded = false;
          const ads = document.getElementsByClassName('adsbygoogle');
          Array.from(ads).forEach(ad => ad.remove());
        }
      };
    }
    return undefined; // Explicit return for when conditions aren't met
  }, [user]);
};

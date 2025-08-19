// src/utils/adsenseLoader.ts
import { useContext, useEffect } from 'react';
import { UserContext } from '../UserContext';

let adsenseLoaded = false;

type UserCtx = {
  user?: {
    userDetails?: {
      subscriptionStatus?: string | null;
    };
  } | null | undefined;
};

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (cb: () => void) => number;
    cancelIdleCallback?: (id: number) => void;
  };

export const useAdsenseLoader = (): void => {
  const { user } = useContext(UserContext) as unknown as UserCtx;

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

      const win = window as IdleWindow;
      const idleId: number = win.requestIdleCallback
        ? win.requestIdleCallback(loadScript)
        : window.setTimeout(loadScript, 1000);

      return () => {
        if (win.cancelIdleCallback) {
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

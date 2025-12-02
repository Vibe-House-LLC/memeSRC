// src/utils/adsenseLoader.ts
import { useContext, useEffect } from 'react';
import { UserContext } from '../UserContext';

let adsenseLoaded = false;
const ADSENSE_SRC = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1307598869123774';

type UserCtx = {
  user?: {
    userDetails?: {
      subscriptionStatus?: string | null;
      magicSubscription?: string | null;
    };
  } | null | undefined;
};

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (cb: () => void) => number;
    cancelIdleCallback?: (id: number) => void;
  };

const removeAdsenseArtifacts = () => {
  const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${ADSENSE_SRC}"]`);
  if (existingScript?.parentElement) {
    existingScript.parentElement.removeChild(existingScript);
  }
  const ads = document.getElementsByClassName('adsbygoogle');
  Array.from(ads).forEach((ad) => (ad as Element).remove());
  adsenseLoaded = false;
};

// Disable ads for everyone during December 2024 and December 2025.
export const isAdPauseActive = (): boolean => {
  const now = new Date();
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();
  return month === 11 && (year === 2024 || year === 2025);
};

export const shouldShowAds = (user?: UserCtx['user']): boolean => {
  if (isAdPauseActive()) return false;
  const isSubscribed =
    user?.userDetails?.subscriptionStatus === 'active' || user?.userDetails?.magicSubscription === 'true';
  return !isSubscribed;
};

export const useAdsenseLoader = (): void => {
  const { user } = useContext(UserContext) as unknown as UserCtx;
  const adsEnabled = shouldShowAds(user);

  useEffect(() => {
    if (!adsEnabled) {
      if (adsenseLoaded) {
        removeAdsenseArtifacts();
      }
      return undefined;
    }

    if (!adsenseLoaded) {
      const script = document.createElement('script');
      script.src = ADSENSE_SRC;
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
        if (adsenseLoaded && !adsEnabled) {
          removeAdsenseArtifacts();
        }
      };
    }
    return undefined;
  }, [adsEnabled, user]);
};

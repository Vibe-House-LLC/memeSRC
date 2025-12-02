import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { UserContext } from '../UserContext';
import { safeGetItem, safeSetItem } from '../utils/storage';
import { isAdPauseActive, isSubscribedUser, type UserCtx } from '../utils/adsenseLoader';

const AD_FREE_DECEMBER_DIALOG_DISMISSED_KEY = 'adFreeDecemberDialog2025Dismissed';

interface AdFreeDecemberContextType {
  triggerDialog: () => void;
  showDialog: boolean;
  closeDialog: () => void;
}

const AdFreeDecemberContext = createContext<AdFreeDecemberContextType | undefined>(undefined);

export function AdFreeDecemberProvider({ children }: { children: ReactNode }) {
  const { user } = useContext(UserContext);
  const [showDialog, setShowDialog] = useState(false);
  const [hasBeenTriggered, setHasBeenTriggered] = useState(false);

  const shouldShow = useCallback(() => {
    // Check if already dismissed
    const dismissed = safeGetItem(AD_FREE_DECEMBER_DIALOG_DISMISSED_KEY) === 'true';
    if (dismissed) return false;

    // Don't show to users who already shouldn't see ads (pro/subscribed)
    if (isSubscribedUser(user as UserCtx['user'])) return false;

    // Only show during the ad pause window (December 2024/2025)
    return isAdPauseActive();
  }, [user]);

  const triggerDialog = useCallback(() => {
    // Only trigger once per session
    if (hasBeenTriggered) return;

    if (shouldShow()) {
      setShowDialog(true);
      setHasBeenTriggered(true);
    }
  }, [shouldShow, hasBeenTriggered]);

  const closeDialog = useCallback(() => {
    setShowDialog(false);
    safeSetItem(AD_FREE_DECEMBER_DIALOG_DISMISSED_KEY, 'true');
  }, []);

  return (
    <AdFreeDecemberContext.Provider value={{ triggerDialog, showDialog, closeDialog }}>
      {children}
    </AdFreeDecemberContext.Provider>
  );
}

export function useAdFreeDecember() {
  const context = useContext(AdFreeDecemberContext);
  if (!context) {
    throw new Error('useAdFreeDecember must be used within AdFreeDecemberProvider');
  }
  return context;
}

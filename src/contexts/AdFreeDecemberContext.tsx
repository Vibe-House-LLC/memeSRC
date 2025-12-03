import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { UserContext } from '../UserContext';
import { safeGetItem, safeSetItem } from '../utils/storage';
import { isAdPauseActive, isSubscribedUser, type UserCtx } from '../utils/adsenseLoader';

export const AD_FREE_DECEMBER_DISMISSED_KEY = 'adFreeDecember2025Dismissed';
const LEGACY_AD_FREE_DECEMBER_DIALOG_DISMISSED_KEY = 'adFreeDecemberDialog2025Dismissed';

export const hasDismissedAdFreeDecember = (): boolean => {
  const canonicalDismissed = safeGetItem(AD_FREE_DECEMBER_DISMISSED_KEY) === 'true';
  const legacyDismissed = safeGetItem(LEGACY_AD_FREE_DECEMBER_DIALOG_DISMISSED_KEY) === 'true';

  if (legacyDismissed && !canonicalDismissed) {
    safeSetItem(AD_FREE_DECEMBER_DISMISSED_KEY, 'true');
  }

  return canonicalDismissed || legacyDismissed;
};

export const persistAdFreeDecemberDismissal = (): void => {
  safeSetItem(AD_FREE_DECEMBER_DISMISSED_KEY, 'true');
  safeSetItem(LEGACY_AD_FREE_DECEMBER_DIALOG_DISMISSED_KEY, 'true');
};

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
    if (hasDismissedAdFreeDecember()) return false;

    // Don't show to users who already shouldn't see ads (pro/subscribed)
    if (isSubscribedUser(user as UserCtx['user'])) return false;

    // Only show during the ad pause window (December 2024/2025)
    return isAdPauseActive();
  }, [user, hasDismissedAdFreeDecember]);

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
    persistAdFreeDecemberDismissal();
  }, [persistAdFreeDecemberDismissal]);

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

import { createContext } from 'react'

export const STRIPE_REFRESH_STORAGE_KEY = 'memeSRCStripeRefreshPending'

export const UserContext = createContext({
    user: false,
    setUser: () => {},
    shows: [],
    setShows: () => {},
    defaultShow: false,
    handleUpdateDefaultShow: () => {},
    setDefaultShow: () => {},
    handleUpdateUserDetails: () => {},
    showFeed: false,
    setShowFeed: () => {},
    forceTokenRefresh: async () => {},
    isUserLoading: false,
    startStripeRefreshPolling: () => {},
});

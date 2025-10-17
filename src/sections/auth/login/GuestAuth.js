import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Auth, Hub } from 'aws-amplify';
import PropTypes from "prop-types";
import { UserContext, STRIPE_REFRESH_STORAGE_KEY } from '../../../UserContext';
import { getShowsWithFavorites } from "../../../utils/fetchShowsRevised";
import { readJSON, safeGetItem, safeRemoveItem, safeSetItem, writeJSON } from '../../../utils/storage';
import { fetchProfilePhoto } from '../../../utils/profilePhoto';
import { normalizeOptionalString, pickFirstValidString, sanitizeStringRecord } from '../../../utils/authUserIdentity';

/* eslint-disable react-hooks/exhaustive-deps */

GuestAuth.propTypes = {
  children: PropTypes.object
}

export default function GuestAuth(props) {
  const [user, setUser] = useState(() => readJSON('memeSRCUserDetails') || null);
  const [shows, setShows] = useState(() => readJSON('memeSRCShows') || []);
  const [defaultShow, setDefaultShow] = useState();
  const [showFeed, setShowFeed] = useState(false);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const location = useLocation();
  const profilePhotoRef = useRef(null);
  const userRef = useRef(null);
  const paymentRefreshTriggeredRef = useRef(false);
  const forceTokenRefreshRef = useRef(async () => {});
  const hasInitializedAuthRef = useRef(false);
  const loadingCounterRef = useRef(0);
  const isMountedRef = useRef(true);
  const stripeRefreshIntervalRef = useRef(null);
  const stripeRefreshInFlightRef = useRef(false);

  const startLoading = useCallback(() => {
    loadingCounterRef.current += 1;
    if (loadingCounterRef.current === 1 && isMountedRef.current) {
      setIsUserLoading(true);
    }
  }, [setIsUserLoading]);

  const stopLoading = useCallback(() => {
    loadingCounterRef.current = Math.max(loadingCounterRef.current - 1, 0);
    if (loadingCounterRef.current === 0 && isMountedRef.current) {
      setIsUserLoading(false);
    }
  }, [setIsUserLoading]);

  useEffect(() => {
    profilePhotoRef.current = user?.profilePhoto ?? null;
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (location.pathname !== 'login') {
      const userDetails = readJSON('memeSRCUserDetails') || {};

      if (user && (user.userDetails !== userDetails.userDetails)) {
        const clensedUser = { ...user };
        delete clensedUser.storage;
        writeJSON('memeSRCUserDetails', clensedUser);
      }

      if (user) {
        // console.log(user)
        const localStorageDefaultShow = safeGetItem('memeSRCDefaultIndex') || '_universal'
        setDefaultShow(localStorageDefaultShow)
      } else {
        setDefaultShow('_universal')
      }
    }
  }, [user])

  const handleTokenRefreshed = useCallback(
    async (authData, options = {}) => {
      startLoading();
      try {
        const refreshedUser = authData?.data ?? authData;
        if (!refreshedUser) {
          return;
        }

        const {
          overrideUserDetails: overrideDetailsInput = null,
          profilePhoto: explicitProfilePhoto,
        } = options;

        const existingUser = userRef.current || {};
        const existingUserDetails = existingUser.userDetails || {};

        const sanitizedExistingUserDetails = sanitizeStringRecord(existingUserDetails);
        const rawTokenPayload =
          refreshedUser?.signInUserSession?.idToken?.payload ||
          refreshedUser?.signInUserSession?.accessToken?.payload ||
          {};
        const tokenPayload = sanitizeStringRecord(rawTokenPayload);
        const overrideDetails = overrideDetailsInput ? sanitizeStringRecord(overrideDetailsInput) : null;

        const resolveFavoriteIds = (source) => {
          if (source === undefined) return null;
          if (Array.isArray(source)) return source;
          if (typeof source === 'string') {
            try {
              return JSON.parse(source) || [];
            } catch (error) {
              console.log('Failed to parse favorites payload:', error);
              return null;
            }
          }
          return null;
        };

        let favoriteIds = null;
        if (overrideDetails && Object.prototype.hasOwnProperty.call(overrideDetails, 'favorites')) {
          favoriteIds = resolveFavoriteIds(overrideDetails.favorites);
        }
        if (favoriteIds === null && Object.prototype.hasOwnProperty.call(tokenPayload || {}, 'favorites')) {
          favoriteIds = resolveFavoriteIds(tokenPayload?.favorites);
        }
        if (
          favoriteIds === null &&
          Object.prototype.hasOwnProperty.call(sanitizedExistingUserDetails || {}, 'favorites')
        ) {
          favoriteIds = resolveFavoriteIds(sanitizedExistingUserDetails?.favorites);
        }
        if (favoriteIds === null) {
          favoriteIds = [];
        }

        const parseUserNotifications = (notifications) => {
          if (typeof notifications !== 'string') {
            return notifications;
          }

          try {
            return JSON.parse(notifications);
          } catch (error) {
            console.log('Failed to parse user notifications from refreshed token payload:', error);
            return notifications;
          }
        };

        const baseUserDetails = {
          ...sanitizedExistingUserDetails,
          ...tokenPayload,
        };

        if (tokenPayload?.userNotifications) {
          baseUserDetails.userNotifications = parseUserNotifications(tokenPayload.userNotifications);
        } else if (typeof sanitizedExistingUserDetails.userNotifications === 'string') {
          baseUserDetails.userNotifications = parseUserNotifications(
            sanitizedExistingUserDetails.userNotifications
          );
        }

        const mergedUserDetails = overrideDetails
          ? sanitizeStringRecord({
              ...baseUserDetails,
              ...overrideDetails,
            })
          : baseUserDetails;

        const resolvedEmail = pickFirstValidString(
          overrideDetails?.email,
          mergedUserDetails?.email,
          sanitizedExistingUserDetails?.email,
          existingUser?.email,
          tokenPayload?.email,
          refreshedUser?.attributes?.email
        );

        if (resolvedEmail) {
          mergedUserDetails.email = resolvedEmail;
        } else if (mergedUserDetails.email && !normalizeOptionalString(mergedUserDetails.email)) {
          delete mergedUserDetails.email;
        }

        const resolvedUsername = pickFirstValidString(
          overrideDetails?.username,
          mergedUserDetails?.username,
          sanitizedExistingUserDetails?.username,
          existingUser?.username,
          refreshedUser?.username,
          tokenPayload?.['cognito:username'],
          tokenPayload?.preferred_username,
          tokenPayload?.username,
          resolvedEmail
        );

        if (resolvedUsername) {
          mergedUserDetails.username = resolvedUsername;
        } else if (
          mergedUserDetails.username &&
          !normalizeOptionalString(mergedUserDetails.username)
        ) {
          delete mergedUserDetails.username;
        }

        const resolvedProfilePhoto =
          explicitProfilePhoto !== undefined
            ? explicitProfilePhoto
            : profilePhotoRef.current ?? existingUser.profilePhoto ?? null;

        const updatedUser = {
          ...existingUser,
          ...refreshedUser,
          ...tokenPayload,
          userDetails: mergedUserDetails,
          profilePhoto: resolvedProfilePhoto,
        };

        if (resolvedEmail) {
          updatedUser.email = resolvedEmail;
        } else if (updatedUser.email && !normalizeOptionalString(updatedUser.email)) {
          delete updatedUser.email;
        }

        if (resolvedUsername) {
          updatedUser.username = resolvedUsername;
          updatedUser.userDetails.username = resolvedUsername;
        } else if (updatedUser.username && !normalizeOptionalString(updatedUser.username)) {
          delete updatedUser.username;
          if (
            updatedUser.userDetails?.username &&
            !normalizeOptionalString(updatedUser.userDetails.username)
          ) {
            delete updatedUser.userDetails.username;
          }
        }

        profilePhotoRef.current = resolvedProfilePhoto ?? null;
        userRef.current = updatedUser;

        try {
          const loadedShows = await getShowsWithFavorites(favoriteIds);
          if (!loadedShows?.some((show) => show.isFavorite)) {
            setDefaultShow('_universal');
          }

          const cleanedUser = { ...updatedUser };
          delete cleanedUser.storage;
          setUser(cleanedUser);
          writeJSON('memeSRCUserDetails', cleanedUser);
          writeJSON('memeSRCShows', loadedShows);
          setShows(loadedShows);
        } catch (error) {
          console.log('Failed to refresh shows after token refresh:', error);
          const cleanedUser = { ...updatedUser };
          delete cleanedUser.storage;
          setUser(cleanedUser);
          writeJSON('memeSRCUserDetails', cleanedUser);
        }
      } finally {
        stopLoading();
      }
    },
    [setUser, setShows, setDefaultShow, startLoading, stopLoading]
  );

  const forceTokenRefresh = useCallback(
    async (options = {}) => {
      startLoading();
      try {
        const refreshedUser = await Auth.currentAuthenticatedUser({ bypassCache: true });
        await handleTokenRefreshed(refreshedUser, options);
      } catch (error) {
        console.log('Failed to force token refresh after payment completion:', error);
      } finally {
        stopLoading();
      }
    },
    [handleTokenRefreshed, startLoading, stopLoading]
  );

  const stopStripeRefreshPolling = useCallback(() => {
    if (typeof window === 'undefined') {
      stripeRefreshIntervalRef.current = null;
      return;
    }

    if (stripeRefreshIntervalRef.current !== null) {
      window.clearInterval(stripeRefreshIntervalRef.current);
      stripeRefreshIntervalRef.current = null;
    }
  }, []);

  const runStripeRefresh = useCallback(async () => {
    if (stripeRefreshInFlightRef.current) {
      return;
    }

    stripeRefreshInFlightRef.current = true;
    try {
      console.log('Running stripe refresh');
      await forceTokenRefresh();
    } finally {
      stripeRefreshInFlightRef.current = false;
    }
  }, [forceTokenRefresh]);

  const startStripeRefreshPolling = useCallback(() => {
    if (typeof window === 'undefined') {
      return stopStripeRefreshPolling;
    }

    safeSetItem(STRIPE_REFRESH_STORAGE_KEY, 'pending');
    stopStripeRefreshPolling();
    runStripeRefresh();

    const intervalId = window.setInterval(() => {
      runStripeRefresh();
    }, 5000);

    stripeRefreshIntervalRef.current = intervalId;

    return stopStripeRefreshPolling;
  }, [runStripeRefresh, stopStripeRefreshPolling]);

  useEffect(() => {
    const refreshStatus = safeGetItem(STRIPE_REFRESH_STORAGE_KEY);
    if (refreshStatus !== 'pending' || stripeRefreshIntervalRef.current !== null) {
      return;
    }

    let isCancelled = false;

    const executePendingRefresh = async () => {
      try {
        await runStripeRefresh();
      } finally {
        if (!isCancelled && location.pathname !== '/account' && location.pathname !== '/subscription-portal') {
          safeSetItem(STRIPE_REFRESH_STORAGE_KEY, 'completed');
        }
      }
    };

    executePendingRefresh();

    return () => {
      isCancelled = true;
    };
  }, [location.pathname, runStripeRefresh]);

  useEffect(() => () => {
    stopStripeRefreshPolling();
  }, [stopStripeRefreshPolling]);

  useEffect(() => {
    forceTokenRefreshRef.current = forceTokenRefresh;
  }, [forceTokenRefresh]);

  useEffect(() => {
    const listener = (capsule) => {
      if (capsule?.payload?.event === 'tokenRefresh') {
        handleTokenRefreshed(capsule.payload);
      }
    };

    Hub.listen('auth', listener);

    return () => {
      Hub.remove('auth', listener);
    };
  }, [handleTokenRefreshed]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentComplete = params.get('paymentComplete') === 'Subscription was successful!';

    if (paymentComplete && !paymentRefreshTriggeredRef.current) {
      paymentRefreshTriggeredRef.current = true;
      forceTokenRefresh();
    }

    if (!paymentComplete) {
      paymentRefreshTriggeredRef.current = false;
    }
  }, [location.search, forceTokenRefresh]);

  const handleUpdateDefaultShow = (show) => {
    if (user) {
      safeSetItem('memeSRCDefaultIndex', show)
    }
    setDefaultShow(show)
  }

  const handleUpdateUserDetails = useCallback(
    async (newUserDetails) => {
      startLoading();
      try {
        const sanitizedDetails = sanitizeStringRecord(newUserDetails || {});

        const favoritesSource = Object.prototype.hasOwnProperty.call(sanitizedDetails, 'favorites')
          ? sanitizedDetails.favorites
          : newUserDetails?.favorites;

        let favorites = [];
        if (Array.isArray(favoritesSource)) {
          favorites = favoritesSource;
        } else if (typeof favoritesSource === 'string') {
          try {
            favorites = JSON.parse(favoritesSource) || [];
          } catch (error) {
            console.log('Failed to parse favorites from user details update:', error);
          }
        }

        const loadedShows = await getShowsWithFavorites(favorites);
        if (!shows?.some((show) => show.isFavorite)) {
          setDefaultShow('_universal');
        }

        const resolvedEmail = pickFirstValidString(
          sanitizedDetails?.email,
          user?.userDetails?.email,
          user?.email
        );
        if (resolvedEmail) {
          sanitizedDetails.email = resolvedEmail;
        } else if (sanitizedDetails.email && !normalizeOptionalString(sanitizedDetails.email)) {
          delete sanitizedDetails.email;
        }

        const resolvedUsername = pickFirstValidString(
          sanitizedDetails?.username,
          user?.userDetails?.username,
          user?.username,
          resolvedEmail
        );
        if (resolvedUsername) {
          sanitizedDetails.username = resolvedUsername;
        } else if (
          sanitizedDetails.username &&
          !normalizeOptionalString(sanitizedDetails.username)
        ) {
          delete sanitizedDetails.username;
        }

        const updatedUser = {
          ...user,
          userDetails: sanitizedDetails,
          profilePhoto: profilePhotoRef.current,
        };

        if (resolvedEmail) {
          updatedUser.email = resolvedEmail;
        } else if (updatedUser.email && !normalizeOptionalString(updatedUser.email)) {
          delete updatedUser.email;
        }

        if (resolvedUsername) {
          updatedUser.username = resolvedUsername;
        } else if (updatedUser.username && !normalizeOptionalString(updatedUser.username)) {
          delete updatedUser.username;
        }

        profilePhotoRef.current = updatedUser.profilePhoto ?? null;
        userRef.current = updatedUser;
        setUser(updatedUser);
        const clensedUser = { ...updatedUser };
        delete clensedUser.storage;
        writeJSON('memeSRCUserDetails', clensedUser);
        writeJSON('memeSRCShows', loadedShows);
        setShows(loadedShows);
      } catch (error) {
        console.log(error);
        throw error;
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading, shows, user, setDefaultShow, setUser, setShows]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (location.pathname === '/login') {
      hasInitializedAuthRef.current = false;
      return;
    }

    if (hasInitializedAuthRef.current) {
      return;
    }
    hasInitializedAuthRef.current = true;

    const localStorageUser = readJSON('memeSRCUserDetails');
    const localStorageShows = readJSON('memeSRCShows');
    const localStorageDefaultShow = safeGetItem('memeSRCDefaultIndex');

    if (!user && localStorageUser) {
      setUser(localStorageUser);
    } else if (!localStorageUser) {
      setDefaultShow('_universal');
    }

    if (localStorageShows) {
      setShows(localStorageShows);
      const hasFavorites = localStorageShows.some((show) => show.isFavorite);
      setDefaultShow(hasFavorites ? localStorageDefaultShow || '_universal' : '_universal');
    }

    const initialiseAuthState = async () => {
      startLoading();
      try {
        const currentUser = await Auth.currentAuthenticatedUser();
        try {
          const profilePhotoUrl = await fetchProfilePhoto();
          await handleTokenRefreshed(currentUser, { profilePhoto: profilePhotoUrl ?? null });
        } catch (error) {
          console.log('Failed to initialise authenticated user state:', error);
          await handleTokenRefreshed(currentUser, { profilePhoto: null });
        }
      } catch (error) {
        try {
          const loadedShows = await getShowsWithFavorites();
          if (!shows?.some((show) => show.isFavorite)) {
            setDefaultShow('_universal');
          }
          setUser(false); // indicate the context is ready but user is not auth'd
          safeRemoveItem('memeSRCUserInfo');
          writeJSON('memeSRCShows', loadedShows);
          setShows(loadedShows);
          setDefaultShow('_universal');
        } catch (loadError) {
          console.log(loadError);
        }
      } finally {
        stopLoading();
      }
    };

    initialiseAuthState();
  }, [location.pathname, user])

  return (
    <UserContext.Provider value={{ user, setUser, shows, setShows, defaultShow, handleUpdateDefaultShow, setDefaultShow, handleUpdateUserDetails, showFeed, setShowFeed, forceTokenRefresh, isUserLoading, startStripeRefreshPolling }}>
      {props.children}
    </UserContext.Provider>
  )
}

/* eslint-enable react-hooks/exhaustive-deps */
export const useForceTokenRefresh = () => {
  const context = useContext(UserContext);
  if (!context?.forceTokenRefresh) {
    throw new Error('forceTokenRefresh is not available in UserContext');
  }
  return context.forceTokenRefresh;
};

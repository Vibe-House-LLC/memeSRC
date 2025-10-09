import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Auth, Hub } from 'aws-amplify';
import PropTypes from "prop-types";
import { UserContext } from '../../../UserContext';
import { getShowsWithFavorites } from "../../../utils/fetchShowsRevised";
import { readJSON, safeGetItem, safeRemoveItem, safeSetItem, writeJSON } from '../../../utils/storage';
import { fetchProfilePhoto } from '../../../utils/profilePhoto';

/* eslint-disable react-hooks/exhaustive-deps */

GuestAuth.propTypes = {
  children: PropTypes.object
}

export default function GuestAuth(props) {
  const [user, setUser] = useState(() => readJSON('memeSRCUserDetails') || null);
  const [shows, setShows] = useState(() => readJSON('memeSRCShows') || []);
  const [defaultShow, setDefaultShow] = useState();
  const [showFeed, setShowFeed] = useState(() => {
    const storedPreference = safeGetItem('memeSRCShowFeed');
    if (storedPreference === null) {
      return false;
    }
    return storedPreference !== 'false';
  });
  const location = useLocation();
  const userGroups = user?.['cognito:groups'];
  const isAdmin = Array.isArray(userGroups) && userGroups.includes('admins');
  const effectiveShowFeed = isAdmin && showFeed;
  const profilePhotoRef = useRef(null);
  const userRef = useRef(null);
  const paymentRefreshTriggeredRef = useRef(false);
  const forceTokenRefreshRef = useRef(async () => {});
  const hasInitializedAuthRef = useRef(false);

  useEffect(() => {
    profilePhotoRef.current = user?.profilePhoto ?? null;
    userRef.current = user;
  }, [user]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (location.pathname !== 'login') {
      const userDetails = readJSON('memeSRCUserDetails') || {};

      if (user && (user.userDetails !== userDetails.userDetails)) {
        writeJSON('memeSRCUserDetails', user);
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

  const handleTokenRefreshed = useCallback((authData) => {
    const refreshedUser = authData?.data ?? authData;
    if (!refreshedUser) {
      return;
    }

    const existingUser = userRef.current || {};
    const existingUserDetails = existingUser.userDetails || {};

    const tokenPayload = refreshedUser?.signInUserSession?.idToken?.payload || refreshedUser?.signInUserSession?.accessToken?.payload || {};
    const favoritesRaw = tokenPayload?.favorites;

    let favoriteIds = [];
    if (Array.isArray(favoritesRaw)) {
      favoriteIds = favoritesRaw;
    } else if (typeof favoritesRaw === 'string') {
      try {
        favoriteIds = JSON.parse(favoritesRaw) || [];
      } catch (error) {
        console.log('Failed to parse favorites from refreshed token payload:', error);
        favoriteIds = [];
      }
    } else {
      const previousFavorites = existingUserDetails?.favorites;
      if (Array.isArray(previousFavorites)) {
        favoriteIds = previousFavorites;
      } else if (typeof previousFavorites === 'string') {
        try {
          favoriteIds = JSON.parse(previousFavorites) || [];
        } catch (error) {
          console.log('Failed to parse favorites from existing user details:', error);
          favoriteIds = [];
        }
      }
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

    const userDetailsFromToken = {
      ...existingUserDetails,
      ...tokenPayload,
    };

    if (tokenPayload?.userNotifications) {
      userDetailsFromToken.userNotifications = parseUserNotifications(tokenPayload.userNotifications);
    } else if (typeof existingUserDetails.userNotifications === 'string') {
      userDetailsFromToken.userNotifications = parseUserNotifications(existingUserDetails.userNotifications);
    }

    const updatedUser = {
      ...existingUser,
      ...refreshedUser,
      ...tokenPayload,
      userDetails: userDetailsFromToken,
      profilePhoto: profilePhotoRef.current ?? existingUser.profilePhoto ?? null,
    };

    if (!updatedUser.username) {
      updatedUser.username = existingUser.username || refreshedUser.username;
    }

    getShowsWithFavorites(favoriteIds)
      .then((loadedShows) => {
        if (!loadedShows?.some((show) => show.isFavorite)) {
          setDefaultShow('_universal');
        }

        profilePhotoRef.current = updatedUser.profilePhoto ?? null;
        setUser(updatedUser);
        writeJSON('memeSRCUserDetails', updatedUser);
        writeJSON('memeSRCShows', loadedShows);
        setShows(loadedShows);
      })
      .catch((error) => {
        console.log('Failed to refresh shows after token refresh:', error);
        profilePhotoRef.current = updatedUser.profilePhoto ?? null;
        setUser(updatedUser);
        writeJSON('memeSRCUserDetails', updatedUser);
      });
  }, [setUser, setShows, setDefaultShow]);

  const forceTokenRefresh = useCallback(async () => {
    try {
      const refreshedUser = await Auth.currentAuthenticatedUser({ bypassCache: true });
      handleTokenRefreshed(refreshedUser);
    } catch (error) {
      console.log('Failed to force token refresh after payment completion:', error);
    }
  }, [handleTokenRefreshed]);

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

  const handleUpdateUserDetails = (newUserDetails) => new Promise((resolve, reject) => {
      const favorites = newUserDetails?.favorites ? JSON.parse(newUserDetails?.favorites) : [];
      getShowsWithFavorites(favorites)
        .then((loadedShows) => {
          if (!shows?.some((show) => show.isFavorite)) {
            setDefaultShow('_universal');
          }
          const updatedUser = {
            ...user,
            userDetails: { ...newUserDetails },
            profilePhoto: profilePhotoRef.current,
          };

          profilePhotoRef.current = updatedUser.profilePhoto ?? null;
          setUser(updatedUser);
          writeJSON('memeSRCUserDetails', updatedUser);
          writeJSON('memeSRCShows', loadedShows);
          setShows(loadedShows);
          resolve();
        })
        .catch((error) => {
          console.log(error);
          reject(error);
        });
    });

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

    Auth.currentAuthenticatedUser().then((x) => {
      console.log(x)
      const tokenPayload = x?.signInUserSession?.idToken?.payload || x?.signInUserSession?.accessToken?.payload || {};
      const favoritesRaw = tokenPayload?.favorites;

      let favoriteIds = [];
      if (Array.isArray(favoritesRaw)) {
        favoriteIds = favoritesRaw;
      } else if (typeof favoritesRaw === 'string') {
        try {
          favoriteIds = JSON.parse(favoritesRaw) || [];
        } catch (error) {
          console.log('Failed to parse favorites from token payload:', error);
          favoriteIds = [];
        }
      }

      const parseUserNotifications = (notifications) => {
        if (typeof notifications !== 'string') {
          return notifications;
        }

        try {
          return JSON.parse(notifications);
        } catch (error) {
          console.log('Failed to parse user notifications from token payload:', error);
          return notifications;
        }
      };

      const buildUserState = (profilePhoto) => {
        const userDetailsFromToken = {
          ...tokenPayload,
          ...(tokenPayload?.userNotifications && {
            userNotifications: parseUserNotifications(tokenPayload.userNotifications),
          }),
        };

        return {
          ...x,
          ...tokenPayload,
          userDetails: userDetailsFromToken,
          profilePhoto,
        };
      };

      getShowsWithFavorites(favoriteIds).then(loadedShows => {
        if (!loadedShows?.some(show => show.isFavorite)) {
          setDefaultShow('_universal')
        }

        fetchProfilePhoto().then(profilePhotoUrl => {
          const userWithPhoto = buildUserState(profilePhotoUrl);

          profilePhotoRef.current = profilePhotoUrl;
          userRef.current = userWithPhoto;
          setUser(userWithPhoto);
          writeJSON('memeSRCUserDetails', userWithPhoto);
        }).catch(error => {
          console.log('Error fetching profile photo:', error);
          profilePhotoRef.current = null;
          const userWithoutPhoto = buildUserState(undefined);
          userRef.current = userWithoutPhoto;
          setUser(userWithoutPhoto);
          writeJSON('memeSRCUserDetails', userWithoutPhoto);
        });

        writeJSON('memeSRCShows', loadedShows)
        setShows(loadedShows)
      }).catch(error => {
        console.log(error)
      })
    }).catch(() => {
      getShowsWithFavorites().then(loadedShows => {
        if (!shows?.some(show => show.isFavorite)) {
          setDefaultShow('_universal')
        }
        setUser(false)  // indicate the context is ready but user is not auth'd
        safeRemoveItem('memeSRCUserInfo')
        writeJSON('memeSRCShows', loadedShows)
        setShows(loadedShows)
        setDefaultShow('_universal')
      }).catch(error => {
        console.log(error)
      })
    });
  }, [location.pathname, user])

  useEffect(() => {
    safeSetItem('memeSRCShowFeed', showFeed ? 'true' : 'false');
  }, [showFeed]);

  return (
    <UserContext.Provider value={{ user, setUser, shows, setShows, defaultShow, handleUpdateDefaultShow, setDefaultShow, handleUpdateUserDetails, showFeed: effectiveShowFeed, setShowFeed, forceTokenRefresh }}>
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

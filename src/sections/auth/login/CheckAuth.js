import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Auth, Hub } from 'aws-amplify';
import { PropTypes } from "prop-types";
import { UserContext } from '../../../UserContext';
import { readJSON, safeGetItem, safeRemoveItem, safeSetItem, writeJSON } from '../../../utils/storage';
import { fetchProfilePhoto } from '../../../utils/profilePhoto';
import { normalizeOptionalString, pickFirstValidString, sanitizeStringRecord } from '../../../utils/authUserIdentity';

CheckAuth.propTypes = {
  children: PropTypes.object
}

export default function CheckAuth(props) {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [user, setUser] = useState(() => readJSON('memeSRCUserDetails') || null);
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
  const hasAttemptedAuthRef = useRef(false);

  useEffect(() => {
    profilePhotoRef.current = user?.profilePhoto ?? null;
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const userDetails = safeGetItem('memeSRCUserDetails')
    const userObject = { ...userDetails }
    console.log(userObject)
    if (user && (user.userDetails !== userObject.userDetails)) {
      console.log('writing user')
      console.log(user)
      const clensedUser = { ...user };
      delete clensedUser.storage;
      writeJSON('memeSRCUserDetails', clensedUser);
      console.log('New User Details')
      console.log({ ...user?.signInUserSession?.accessToken?.payload, ...user.userDetails })
      console.log('Full User Details');
      console.log(user)

    }
  }, [user])

  const handleTokenRefreshed = useCallback(async (authData, options = {}) => {
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

    const finalUsername = pickFirstValidString(
      resolvedUsername,
      existingUser?.username,
      refreshedUser?.username,
      tokenPayload?.['cognito:username'],
      tokenPayload?.preferred_username,
      tokenPayload?.username,
      resolvedEmail
    );

    if (finalUsername) {
      updatedUser.username = finalUsername;
      updatedUser.userDetails.username = finalUsername;
    } else if (updatedUser.username && !normalizeOptionalString(updatedUser.username)) {
      delete updatedUser.username;
      if (updatedUser.userDetails?.username && !normalizeOptionalString(updatedUser.userDetails.username)) {
        delete updatedUser.userDetails.username;
      }
    }

    profilePhotoRef.current = resolvedProfilePhoto ?? null;
    userRef.current = updatedUser;

    const clensedUser = { ...updatedUser };
    delete clensedUser.storage;
    setUser(clensedUser);
    writeJSON('memeSRCUserDetails', clensedUser);
  }, [setUser]);

  const forceTokenRefresh = useCallback(async (options = {}) => {
    try {
      const refreshedUser = await Auth.currentAuthenticatedUser({ bypassCache: true });
      await handleTokenRefreshed(refreshedUser, options);
    } catch (error) {
      console.log('Failed to force token refresh after payment completion:', error);
    }
  }, [handleTokenRefreshed]);

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

  useEffect(() => {
    console.log(location.pathname)
    if (user) {  // we only want this logic to occur after user context is prepped
      if (user.username || location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/verify' || location.pathname === '/forgotpassword' || location.pathname === '/forgotusername') {
        setContent(props.children);
      } else {
        navigate(`/login?dest=${encodeURIComponent(location.pathname)}`, { replace: true });
      }
    } else {
      const localStorageUser = readJSON('memeSRCUserDetails')
      if (localStorageUser) {
        setUser(localStorageUser)
      }
    }
  }, [user, navigate, props.children, location.pathname])

  useEffect(() => {
    if (hasAttemptedAuthRef.current) {
      return;
    }
    hasAttemptedAuthRef.current = true;

    const localStorageUser = readJSON('memeSRCUserDetails');
    if (!user && localStorageUser) {
      setUser(localStorageUser);
    }

    Auth.currentAuthenticatedUser()
      .then(async (currentUser) => {
        try {
          const profilePhotoUrl = await fetchProfilePhoto();
          await handleTokenRefreshed(currentUser, { profilePhoto: profilePhotoUrl ?? null });
        } catch (error) {
          console.log('Failed to initialise authenticated user state:', error);
          await handleTokenRefreshed(currentUser, { profilePhoto: null });
        }

        console.log(currentUser);
        console.log('Updating Amplify config to use AMAZON_COGNITO_USER_POOLS');
        // Amplify.configure({
        //     "aws_appsync_authenticationType": "AMAZON_COGNITO_USER_POOLS",
        // });
      })
      .catch(() => {
        setUser({ username: false }); // indicate the context is ready but user is not auth'd
        safeRemoveItem('memeSRCUserInfo');
        console.log("There wasn't an authenticated user found");
        console.log('Updating Amplify config to use API_KEY');
        // Amplify.configure({
        //     "aws_appsync_authenticationType": "API_KEY",
        // });
      });
  }, [user]);

  useEffect(() => {
    safeSetItem('memeSRCShowFeed', showFeed ? 'true' : 'false');
  }, [showFeed]);

  return (
    <UserContext.Provider value={{ user, setUser, showFeed: effectiveShowFeed, setShowFeed, forceTokenRefresh }}>
      {content}
    </UserContext.Provider>
  )
}

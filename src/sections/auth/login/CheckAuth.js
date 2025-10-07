import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Auth, Hub } from 'aws-amplify';
import { PropTypes } from "prop-types";
import { UserContext } from '../../../UserContext';
import { readJSON, safeGetItem, safeRemoveItem, safeSetItem, writeJSON } from '../../../utils/storage';
import { fetchProfilePhoto } from '../../../utils/profilePhoto';

CheckAuth.propTypes = {
  children: PropTypes.object
}

export default function CheckAuth(props) {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [user, setUser] = useState(null);
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

  useEffect(() => {
    const userDetails = safeGetItem('memeSRCUserDetails')
    const userObject = { ...userDetails }
    console.log(userObject)
    if (user && (user.userDetails !== userObject.userDetails)) {
      console.log('writing user')
      console.log(user)
      writeJSON('memeSRCUserDetails', user)
      console.log('New User Details')
      console.log({ ...user?.signInUserSession?.accessToken?.payload, ...user.userDetails })
      console.log('Full User Details');
      console.log(user)

    }
  }, [user])

  const handleTokenRefreshed = useCallback((authData) => {
    const refreshedUser = authData?.data;
    if (!refreshedUser) {
      return;
    }

    const tokenPayload = refreshedUser?.signInUserSession?.idToken?.payload || refreshedUser?.signInUserSession?.accessToken?.payload || {};

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
      ...tokenPayload,
      ...(tokenPayload?.userNotifications && {
        userNotifications: parseUserNotifications(tokenPayload.userNotifications),
      }),
    };

    const updatedUser = {
      ...refreshedUser,
      ...tokenPayload,
      userDetails: userDetailsFromToken,
      profilePhoto: user?.profilePhoto,
    };

    setUser(updatedUser);
    writeJSON('memeSRCUserDetails', updatedUser);
  }, [setUser, user]);

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
      // Set up the user context
      Auth.currentAuthenticatedUser().then((x) => {
        const tokenPayload = x?.signInUserSession?.idToken?.payload || x?.signInUserSession?.accessToken?.payload || {};

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

        // Fetch profile photo from S3 and store in context
        fetchProfilePhoto().then(profilePhotoUrl => {
          const userWithPhoto = buildUserState(profilePhotoUrl);

          setUser(userWithPhoto);
          writeJSON('memeSRCUserDetails', userWithPhoto);
        }).catch(error => {
          console.log('Error fetching profile photo:', error);
          const userWithoutPhoto = buildUserState(undefined);
          setUser(userWithoutPhoto);
          writeJSON('memeSRCUserDetails', userWithoutPhoto);
        });

        console.log(x)
        console.log("Updating Amplify config to use AMAZON_COGNITO_USER_POOLS")
        // Amplify.configure({
        //     "aws_appsync_authenticationType": "AMAZON_COGNITO_USER_POOLS",
        // });
      }).catch(() => {
        setUser({ username: false })  // indicate the context is ready but user is not auth'd
        safeRemoveItem('memeSRCUserInfo')
        console.log("There wasn't an authenticated user found")
        console.log("Updating Amplify config to use API_KEY")
        // Amplify.configure({
        //     "aws_appsync_authenticationType": "API_KEY",
        // });
      });
    }
  }, [user, navigate, props.children, location.pathname])

  useEffect(() => {
    safeSetItem('memeSRCShowFeed', showFeed ? 'true' : 'false');
  }, [showFeed]);

  return (
    <UserContext.Provider value={{ user, setUser, showFeed: effectiveShowFeed, setShowFeed }}>
      {content}
    </UserContext.Provider>
  )
}

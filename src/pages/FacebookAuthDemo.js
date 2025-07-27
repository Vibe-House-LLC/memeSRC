import { useContext, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { UserContext } from '../UserContext';
import { SnackbarContext } from '../SnackbarContext';

const isMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export default function FacebookAuthDemo() {
  const { user, setUser } = useContext(UserContext);
  const { setOpen, setMessage: setSnackbarMessage, setSeverity } = useContext(SnackbarContext);
  const [isConnected, setIsConnected] = useState(false);
  const [profileInfo, setProfileInfo] = useState(null);
  const [isFbSDKInitialized, setIsFbSDKInitialized] = useState(false);

  useEffect(() => {
    const initFacebookSDK = () => {
      window.fbAsyncInit = () => {
        window.FB.init({
          appId: '1983174058744030',
          cookie: true,
          xfbml: true,
          version: 'v12.0',
        });
        setIsFbSDKInitialized(true);
      };

      const loadFacebookSDK = () => {
        const script = document.createElement('script');
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        document.body.appendChild(script);
      };

      loadFacebookSDK();
    };

    initFacebookSDK();
  }, []);

  useEffect(() => {
    if (isFbSDKInitialized) {
      checkLoginState();
    }
  }, [isFbSDKInitialized]);

  const checkLoginState = () => {
    window.FB.getLoginStatus((response) => {
      statusChangeCallback(response);
    });
  };

  const statusChangeCallback = (response) => {
    if (response.status === 'connected') {
      // User is logged into Facebook and your app
      setIsConnected(true);
      setUser({
        ...user,
        facebookAccessToken: response.authResponse.accessToken,
        facebookUserId: response.authResponse.userID,
      });
      fetchProfileInfo();
      fetchGroupPosts(response.authResponse.userID, response.authResponse.accessToken);
    } else {
      // User is not logged into Facebook or your app
      setIsConnected(false);
    }
  };

  const handleFacebookLogin = () => {
    const loginOptions = {
      scope: 'public_profile',
      ...(isMobileDevice() && { display: 'redirect' }),
    };

    window.FB.login((response) => {
      if (response.authResponse) {
        // User is logged in and granted permissions
        statusChangeCallback(response);
      } else {
        // User cancelled login or did not fully authorize
        setSnackbarMessage('Facebook authentication failed');
        setSeverity('error');
        setOpen(true);
      }
    }, loginOptions);
  };

  const fetchProfileInfo = () => {
    window.FB.api('/me', { fields: 'id,name,first_name,last_name,picture.type(large)' }, (response) => {
      if (response && !response.error) {
        setProfileInfo(response);
      } else {
        setSnackbarMessage('Failed to fetch profile information');
        setSeverity('error');
        setOpen(true);
      }
    });
  };

  const fetchGroupPosts = (userId, accessToken) => {
    window.FB.api(`/${userId}/groups`, { access_token: accessToken }, (groupsResponse) => {
      if (groupsResponse && !groupsResponse.error) {
        const groupIds = groupsResponse.data.map((group) => group.id);
        const groupPostPromises = groupIds.map((groupId) =>
          new Promise((resolve) => {
            window.FB.api(`/${groupId}/feed`, { access_token: accessToken }, (postsResponse) => {
              resolve({ groupId, posts: postsResponse.data });
            });
          })
        );

        Promise.all(groupPostPromises).then((groupPostsData) => {
          setProfileInfo((prevProfileInfo) => ({
            ...prevProfileInfo,
            groupPosts: groupPostsData,
          }));
        });
      } else {
        setSnackbarMessage('Failed to fetch group posts');
        setSeverity('error');
        setOpen(true);
      }
    });
  };

  return (
    <>
      <Helmet>
        <title>Facebook Auth Demo • memeSRC</title>
      </Helmet>
      <Container maxWidth="xl" sx={{ height: '100%' }}>
        <Grid container justifyContent="center" mt={6}>
          <Grid item xs={12} md={8} lg={6}>
            <Typography variant="h2" gutterBottom mb={4}>
              Facebook Auth Demo
            </Typography>
            <Alert severity="warning" sx={{ mb: 4 }}>
              This page and the Sign in with Facebook functionality is currently just a development demo and serves no purpose yet.
            </Alert>
            {!isConnected ? (
              <Paper elevation={3} sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom mt={1} mb={2}>
                  Connect your Facebook account:
                </Typography>
                <Button variant="contained" size="large" fullWidth onClick={handleFacebookLogin}>
                  Sign in with Facebook
                </Button>
              </Paper>
            ) : (
              <Card sx={{ mt: 5, px: 1 }}>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    You're connected!
                  </Typography>
                  {profileInfo ? (
                    <>
                      <Typography variant="body1" gutterBottom>
                        Your Facebook profile information:
                      </Typography>
                      {profileInfo.picture && (
                        <img
                          src={profileInfo.picture.data.url}
                          alt="Profile"
                          loading="lazy"
                          style={{ width: '100px', height: '100px', borderRadius: '50%', marginBottom: '16px' }}
                        />
                      )}
                      <Typography variant="body2">
                        Name: {profileInfo.name}
                      </Typography>
                      <Typography variant="body2">
                        First Name: {profileInfo.first_name}
                      </Typography>
                      <Typography variant="body2">
                        Last Name: {profileInfo.last_name}
                      </Typography>
                      <Typography variant="body2">
                        User ID: {profileInfo.id}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2">Loading profile information...</Typography>
                  )}
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

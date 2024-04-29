import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API, Auth, Storage } from 'aws-amplify';
import { PropTypes } from "prop-types";
import { UserContext } from '../../../UserContext';

const getProfilePicture = async (key) => {
  const newProfilePicture = await Storage.get(key);
  return newProfilePicture;
};

CheckAuth.propTypes = {
  children: PropTypes.object
};

export default function CheckAuth(props) {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const userDetails = window.localStorage.getItem('memeSRCUserDetails');
    const userObject = { ...userDetails };
    console.log(userObject);
    if (user && user.userDetails !== userObject.userDetails) {
      console.log('writing user');
      console.log(user);
      window.localStorage.setItem('memeSRCUserDetails', JSON.stringify({ ...user?.signInUserSession?.accessToken?.payload, userDetails: { ...user.userDetails } }));
      console.log('New User Details');
      console.log({ ...user?.signInUserSession?.accessToken?.payload, ...user.userDetails });
      console.log('Full User Details');
      console.log(user);
    }
  }, [user]);

  useEffect(() => {
    console.log(location.pathname);
    if (user) {
      if (user.username || location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/verify' || location.pathname === '/forgotpassword') {
        setContent(props.children);
      } else {
        navigate(`/login?dest=${encodeURIComponent(location.pathname)}`, { replace: true });
      }
    } else {
      const localStorageUser = JSON.parse(window.localStorage.getItem('memeSRCUserDetails'));
      if (localStorageUser) {
        setUser(localStorageUser);
      }
      Auth.currentAuthenticatedUser().then(async (x) => {
        const userDetails = await API.get('publicapi', '/user/get');

        let profilePhoto = null;
        if (x?.attributes?.picture) {
          profilePhoto = await getProfilePicture(x.attributes.picture);
        }

        const updatedUser = {
          ...x,
          ...x.signInUserSession.accessToken.payload,
          userDetails: userDetails?.data?.getUserDetails,
          profilePhoto
        };

        setUser(updatedUser);
        window.localStorage.setItem('memeSRCUserDetails', JSON.stringify(updatedUser));
        console.log(x);
        console.log("Updating Amplify config to use AMAZON_COGNITO_USER_POOLS");
      }).catch(() => {
        setUser({ username: false });
        window.localStorage.removeItem('memeSRCUserInfo');
        console.log("There wasn't an authenticated user found");
        console.log("Updating Amplify config to use API_KEY");
      });
    }
  }, [user, navigate, props.children, location.pathname]);

  const login = (username, password) => {
    return new Promise((resolve, reject) => {
      Auth.signIn(username, password)
        .then((user) => {
          API.post('publicapi', '/user/update/status')
            .then(async (response) => {
              const userDetails = await API.get('publicapi', '/user/get');
              let profilePhoto = null;
              if (user?.attributes?.picture) {
                profilePhoto = await getProfilePicture(user.attributes.picture);
              }
              const updatedUser = {
                ...user,
                ...user.signInUserSession.accessToken.payload,
                userDetails: userDetails?.data?.getUserDetails,
                profilePhoto,
              };
              setUser(updatedUser);
              window.localStorage.setItem('memeSRCUserDetails', JSON.stringify(updatedUser));
              resolve(updatedUser);
            })
            .catch((error) => {
              reject(error);
            });
        })
        .catch((error) => {
          reject(error);
        });
    });
  };

  return (
    <UserContext.Provider value={{ user, setUser, login }}>
      {content}
    </UserContext.Provider>
  );
}
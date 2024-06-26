import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API, Auth } from 'aws-amplify';
import { PropTypes } from "prop-types";
import { UserContext } from '../../../UserContext';

CheckAuth.propTypes = {
  children: PropTypes.object
}

export default function CheckAuth(props) {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const userDetails = window.localStorage.getItem('memeSRCUserDetails')
    const userObject = { ...userDetails }
    console.log(userObject)
    if (user && (user.userDetails !== userObject.userDetails)) {
      console.log('writing user')
      console.log(user)
      window.localStorage.setItem('memeSRCUserDetails', JSON.stringify({ ...user?.signInUserSession?.accessToken?.payload, userDetails: { ...user.userDetails } }))
      console.log('New User Details')
      console.log({ ...user?.signInUserSession?.accessToken?.payload, ...user.userDetails })
      console.log('Full User Details');
      console.log(user)

    }
  }, [user])

  useEffect(() => {
    console.log(location.pathname)
    if (user) {  // we only want this logic to occur after user context is prepped
      if (user.username || location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/verify' || location.pathname === '/forgotpassword' || location.pathname === '/forgotusername') {
        setContent(props.children);
      } else {
        navigate(`/login?dest=${encodeURIComponent(location.pathname)}`, { replace: true });
      }
    } else {
      const localStorageUser = JSON.parse(window.localStorage.getItem('memeSRCUserDetails'))
      if (localStorageUser) {
        setUser(localStorageUser)
      }
      // Set up the user context
      Auth.currentAuthenticatedUser().then((x) => {
        API.get('publicapi', '/user/get').then(userDetails => {
          setUser({ ...x, ...x.signInUserSession.accessToken.payload, userDetails: userDetails?.data?.getUserDetails })  // if an authenticated user is found, set it into the context
          window.localStorage.setItem('memeSRCUserDetails', JSON.stringify({ ...x.signInUserSession.accessToken.payload, userDetails: userDetails?.data?.getUserDetails }))
          console.log(x)
          console.log("Updating Amplify config to use AMAZON_COGNITO_USER_POOLS")
          // Amplify.configure({
          //     "aws_appsync_authenticationType": "AMAZON_COGNITO_USER_POOLS",
          // });
        }).catch(err => console.log(err))
      }).catch(() => {
        setUser({ username: false })  // indicate the context is ready but user is not auth'd
        window.localStorage.removeItem('memeSRCUserInfo')
        console.log("There wasn't an authenticated user found")
        console.log("Updating Amplify config to use API_KEY")
        // Amplify.configure({
        //     "aws_appsync_authenticationType": "API_KEY",
        // });
      });
    }
  }, [user, navigate, props.children, location.pathname])

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {content}
    </UserContext.Provider>
  )
}
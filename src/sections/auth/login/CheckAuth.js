import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import PropTypes from 'prop-types';

import { get } from '../../../utils/api';
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
    const userObject = userDetails ? JSON.parse(userDetails) : null;
    if (user && (user.userDetails !== userObject?.userDetails)) {
      window.localStorage.setItem('memeSRCUserDetails', JSON.stringify({ 
        ...user?.attributes,
        userDetails: user.userDetails 
      }))
    }
  }, [user])

  useEffect(() => {
    if (user) {  // we only want this logic to occur after user context is prepped
      if (user.username || location.pathname === '/login' || location.pathname === '/signup' || 
          location.pathname === '/verify' || location.pathname === '/forgotpassword' || 
          location.pathname === '/forgotusername') {
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
      Promise.all([getCurrentUser(), fetchAuthSession()])
        .then(async ([currentUser, session]) => {
          try {
            const userDetailsResponse = await get({
              apiName: 'publicapi',
              path: '/user/get'
            });
            
            const userData = {
              username: currentUser.username,
              attributes: currentUser.attributes,
              signInDetails: session.tokens,
              userDetails: userDetailsResponse?.data?.getUserDetails
            };
            
            setUser(userData);
            window.localStorage.setItem('memeSRCUserDetails', JSON.stringify(userData));
          } catch (err) {
            console.error('Error fetching user details:', err);
          }
        })
        .catch((error) => {
          console.log("No authenticated user found:", error);
          setUser({ username: false });
          window.localStorage.removeItem('memeSRCUserDetails');
        });
    }
  }, [user, navigate, props.children, location.pathname])

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {content}
    </UserContext.Provider>
  )
}
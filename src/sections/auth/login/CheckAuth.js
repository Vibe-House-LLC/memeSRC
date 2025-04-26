import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';

import { UserContext } from '../../../UserContext';
import { useAuth } from '../../../hooks/useAuth';

CheckAuth.propTypes = {
  children: PropTypes.object
}

export default function CheckAuth(props) {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const location = useLocation();
  const { user, setUser, refreshUserData } = useAuth();

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
      // Attempt to refresh user data if needed
      refreshUserData();
    }
  }, [user, navigate, props.children, location.pathname, refreshUserData]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {content}
    </UserContext.Provider>
  );
}
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';

import { getShowsWithFavorites } from '../../../utils/fetchShowsRevised';
import { UserContext } from '../../../UserContext';
import { useAuth } from '../../../hooks/useAuth';

GuestAuth.propTypes = {
  children: PropTypes.object
}

export default function GuestAuth(props) {
  const navigate = useNavigate();
  const [shows, setShows] = useState(JSON.parse(window.localStorage.getItem('memeSRCShows')) || []);
  const [defaultShow, setDefaultShow] = useState('_universal');
  const location = useLocation();
  const { user, setUser, refreshUserData } = useAuth();
  // Add a ref to track initial mount
  const initialMount = useRef(true);

  // Load shows on mount or when user changes
  useEffect(() => {
    if (location.pathname !== 'login') {
      // Set default show based on user and localStorage
      if (user) {
        const localStorageDefaultShow = window.localStorage.getItem(`memeSRCDefaultIndex`) || '_universal';
        setDefaultShow(localStorageDefaultShow);
      } else {
        setDefaultShow('_universal');
      }

      // Load shows with favorites if available
      const favoritesToLoad = user?.userDetails?.favorites 
        ? JSON.parse(user.userDetails.favorites) 
        : [];
        
      getShowsWithFavorites(favoritesToLoad)
        .then(loadedShows => {
          window.localStorage.setItem('memeSRCShows', JSON.stringify(loadedShows));
          setShows(loadedShows);
        })
        .catch(error => {
          console.error('Error loading shows:', error);
        });
    }
  }, [user, location.pathname]);

  const handleUpdateDefaultShow = (show) => {
    if (user) {
      window.localStorage.setItem('memeSRCDefaultIndex', show);
    }
    setDefaultShow(show);
  };

  const handleUpdateUserDetails = (newUserDetails) => new Promise((resolve, reject) => {
    const favorites = newUserDetails?.favorites ? JSON.parse(newUserDetails?.favorites) : [];
    getShowsWithFavorites(favorites)
      .then((loadedShows) => {
        if (!shows?.some((show) => show.isFavorite)) {
          setDefaultShow('_universal');
        }
        
        // Update the user object with v5-compatible structure
        const updatedUser = {
          ...user,
          userDetails: newUserDetails,
        };
        
        console.log('handleUpdateUserDetails: updating user data:', updatedUser);
        
        setUser(updatedUser);
        window.localStorage.setItem('memeSRCUserDetails', JSON.stringify(updatedUser));
        window.localStorage.setItem('memeSRCShows', JSON.stringify(loadedShows));
        setShows(loadedShows);
        resolve();
      })
      .catch((error) => {
        console.log(error);
        reject(error);
      });
  });

  // Attempt to refresh user data ONLY on initial mount
  useEffect(() => {
    // Only run on initial mount
    if (initialMount.current && location.pathname !== 'login') {
      initialMount.current = false;
      refreshUserData();
    }
  }, [location.pathname]); // Removed refreshUserData from dependencies

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      shows, 
      setShows, 
      defaultShow, 
      handleUpdateDefaultShow, 
      setDefaultShow, 
      handleUpdateUserDetails 
    }}>
      {props.children}
    </UserContext.Provider>
  );
}
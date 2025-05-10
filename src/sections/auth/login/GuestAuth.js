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
  const [shows, setShows] = useState([]);
  const [defaultShow, setDefaultShow] = useState('_universal');
  const location = useLocation();
  const { user, setUser, refreshUserData } = useAuth();
  const initialMount = useRef(true);
  const [isInitializing, setIsInitializing] = useState(true);

  // Load shows on mount or when user changes
  useEffect(() => {
    if (location.pathname !== 'login') {
      const initializeData = async () => {
        try {
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
            
          const loadedShows = await getShowsWithFavorites(favoritesToLoad);
          window.localStorage.setItem('memeSRCShows', JSON.stringify(loadedShows));
          setShows(loadedShows);
        } catch (error) {
          console.error('Error loading shows:', error);
        } finally {
          setIsInitializing(false);
        }
      };

      initializeData();
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
    // Only run on initial mount and if we're not already initializing
    if (initialMount.current && location.pathname !== 'login' && !isInitializing) {
      initialMount.current = false;
      refreshUserData();
    }
  }, [location.pathname, isInitializing]);

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      shows, 
      setShows, 
      defaultShow, 
      handleUpdateDefaultShow, 
      setDefaultShow, 
      handleUpdateUserDetails,
      loading: isInitializing
    }}>
      {props.children}
    </UserContext.Provider>
  );
}
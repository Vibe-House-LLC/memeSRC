import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';

import { get } from '../../../utils/api';
import { getShowsWithFavorites } from '../../../utils/fetchShowsRevised';
import { UserContext } from '../../../UserContext';

GuestAuth.propTypes = {
  children: PropTypes.object
}

export default function GuestAuth(props) {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [user, setUser] = useState(null);
  const [shows, setShows] = useState(JSON.parse(window.localStorage.getItem('memeSRCShows')) || []);
  const [defaultShow, setDefaultShow] = useState();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== 'login') {
      const userDetails = window.localStorage.getItem('memeSRCUserDetails')
      const userObject = userDetails ? JSON.parse(userDetails) : null;

      if (user && (user.userDetails !== userObject?.userDetails)) {
        window.localStorage.setItem('memeSRCUserDetails', JSON.stringify({ 
          ...user?.attributes,
          userDetails: { ...user.userDetails } 
        }))
      }

      if (user) {
        const localStorageDefaultShow = window.localStorage.getItem(`memeSRCDefaultIndex`) || '_universal'
        setDefaultShow(localStorageDefaultShow)
      } else {
        setDefaultShow('_universal')
      }
    }
  }, [user])

  const handleUpdateDefaultShow = (show) => {
    if (user) {
      window.localStorage.setItem('memeSRCDefaultIndex', show)
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
          setUser({
            ...user,
            userDetails: { ...newUserDetails },
          });
          window.localStorage.setItem(
            'memeSRCUserDetails',
            JSON.stringify({
              ...user,
              userDetails: { ...newUserDetails },
            })
          );
          window.localStorage.setItem('memeSRCShows', JSON.stringify(loadedShows));
          setShows(loadedShows);
          resolve();
        })
        .catch((error) => {
          console.log(error);
          reject(error);
        });
    });

  useEffect(() => {
    if (location.pathname !== 'login') {
      const localStorageUser = JSON.parse(window.localStorage.getItem('memeSRCUserDetails'))
      const localStorageShows = JSON.parse(window.localStorage.getItem('memeSRCShows'))
      const localStorageDefaultShow = window.localStorage.getItem('memeSRCDefaultIndex')

      if (localStorageUser) {
        if (localStorageShows) {
          setDefaultShow(localStorageShows?.some(show => show.isFavorite) ? localStorageDefaultShow || '_universal' : '_universal')
        }
        setUser(localStorageUser)
      } else {
        setUser(false)
        setDefaultShow('_universal')
      }

      if (localStorageShows) {
        setShows(localStorageShows)
      }

      // Set up the user context
      Promise.all([getCurrentUser(), fetchAuthSession()])
        .then(async ([currentUser, session]) => {
          try {
            const userDetailsResponse = await get({
              apiName: 'publicapi',
              path: '/user/get'
            });
            
            const favorites = userDetailsResponse?.data?.getUserDetails?.favorites 
              ? JSON.parse(userDetailsResponse?.data?.getUserDetails?.favorites) 
              : [];
            
            const loadedShows = await getShowsWithFavorites(favorites);
            
            if (!shows?.some(show => show.isFavorite)) {
              setDefaultShow('_universal');
            }
            
            const userData = {
              username: currentUser.username,
              attributes: currentUser.attributes,
              signInDetails: session.tokens,
              userDetails: userDetailsResponse?.data?.getUserDetails
            };
            
            setUser(userData);
            window.localStorage.setItem('memeSRCUserDetails', JSON.stringify(userData));
            window.localStorage.setItem('memeSRCShows', JSON.stringify(loadedShows));
            setShows(loadedShows);
          } catch (err) {
            console.error('Error fetching user details:', err);
          }
        })
        .catch(() => {
          getShowsWithFavorites().then(loadedShows => {
            if (!shows?.some(show => show.isFavorite)) {
              setDefaultShow('_universal')
            }
            setUser(false)  // indicate the context is ready but user is not auth'd
            window.localStorage.removeItem('memeSRCUserInfo')
            window.localStorage.setItem('memeSRCShows', JSON.stringify(loadedShows))
            setShows(loadedShows)
            setDefaultShow('_universal')
          }).catch(error => {
            console.log(error)
          })
        });
    }
  }, [location.pathname])

  return (
    <UserContext.Provider value={{ user, setUser, shows, setShows, defaultShow, handleUpdateDefaultShow, setDefaultShow, handleUpdateUserDetails }}>
      {props.children}
    </UserContext.Provider>
  )
}
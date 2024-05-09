import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { API, Auth } from 'aws-amplify';
import { PropTypes } from "prop-types";
import { UserContext } from '../../../UserContext';
import { getShowsWithFavorites } from "../../../utils/fetchShowsRevised";

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
      console.log(user)
      const userDetails = window.localStorage.getItem('memeSRCUserDetails')
      const userObject = { ...userDetails }
      console.log(userDetails)

      if (user && (user.userDetails !== userObject.userDetails)) {
        window.localStorage.setItem('memeSRCUserDetails', JSON.stringify({ ...user?.signInUserSession?.accessToken?.payload, userDetails: { ...user.userDetails } }))
      }

      if (user) {
        console.log(user)
        const localStorageDefaultShow = window.localStorage.getItem(`memeSRCDefaultShow`) || '_universal'
        console.log('DEFAULT SHOW: ', window.localStorage.getItem(`memeSRCDefaultShow`))
        setDefaultShow(localStorageDefaultShow)
      } else {
        setDefaultShow('_universal')
      }
    }
  }, [user])

  const handleUpdateDefaultShow = (show) => {
    if (user) {
      window.localStorage.setItem('memeSRCDefaultShow', show)
    }
    setDefaultShow(show)
  }

  useEffect(() => {
    if (location.pathname !== 'login') {
      const localStorageUser = JSON.parse(window.localStorage.getItem('memeSRCUserDetails'))
      const localStorageShows = JSON.parse(window.localStorage.getItem('memeSRCShows'))
      const localStorageDefaultShow = window.localStorage.getItem('memeSRCDefaultShow')

      console.log(localStorageUser)

      if (localStorageUser) {
        console.log(localStorageShows?.some(show => show.isFavorite))
        setDefaultShow(localStorageShows?.some(show => show.isFavorite) ? localStorageDefaultShow : '_universal')
        setUser(localStorageUser)
      } else {
        setUser(false)
        setDefaultShow('_universal')
      }

      if (localStorageShows) {
        setShows(localStorageShows)
      }



      // Set up the user context
      // console.log(user)
      Auth.currentAuthenticatedUser().then((x) => {
        API.get('publicapi', '/user/get').then(userDetails => {
          getShowsWithFavorites().then(loadedShows => {
            if (!shows?.some(show => show.isFavorite)) {
              setDefaultShow('_universal')
            }
            setUser({ ...x, ...x.signInUserSession.accessToken.payload, userDetails: userDetails?.data?.getUserDetails })  // if an authenticated user is found, set it into the context
            // console.log(x)
            window.localStorage.setItem('memeSRCUserDetails', JSON.stringify({ ...x.signInUserSession.accessToken.payload, userDetails: userDetails?.data?.getUserDetails }))
            window.localStorage.setItem('memeSRCShows', JSON.stringify(loadedShows))
            setShows(loadedShows)
            // console.log("Updating Amplify config to use AMAZON_COGNITO_USER_POOLS")
            // Amplify.configure({
            //     "aws_appsync_authenticationType": "AMAZON_COGNITO_USER_POOLS",
            // });
          }).catch(error => {
            console.log(error)
          })
        }).catch(err => console.log(err))
      }).catch(() => {
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
    <UserContext.Provider value={{ user, setUser, shows, setShows, defaultShow, handleUpdateDefaultShow, setDefaultShow }}>
      {props.children}
    </UserContext.Provider>
  )
}
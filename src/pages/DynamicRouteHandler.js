import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API } from 'aws-amplify';

import { getAlias, getContentMetadata, getV2ContentMetadata } from '../graphql/queries'; // Import the getContentMetadata
import HomePage from './HomePage';
import useSearchDetailsV2 from '../hooks/useSearchDetailsV2';
import Page404 from './Page404';

const DynamicRouteHandler = () => {
  const { seriesId } = useParams();
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState(null);
  const { loadingSavedCids } = useSearchDetailsV2();
  const [error, setError] = useState(false);
  const [favorites, setFavorites] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {

    // const fetchContentMetadata = async () => {
    //   try {
    //     const response = await API.graphql({
    //       query: getContentMetadata,
    //       variables: { id: seriesId },
    //       authMode: 'API_KEY',
    //     });

    //     setMetadata(response.data.getContentMetadata);
    //   } catch (error) {
    //     console.error('Failed to fetch GraphQL content metadata:', error);
    //   } finally {
    //     setLoading(false);
    //   }
    // };

    // fetchContentMetadata();

    // First lets try to grab the metadata from v2
    if (seriesId === '_favorites') {
      setFavorites(true)
      setLoading(false)
    } else {
      setFavorites(false)
      console.log(seriesId)
      if (seriesId) {
        setLoading(true)
        setError(false)
        API.graphql({
          query: getAlias,
          variables: { id: seriesId },
          authMode: 'API_KEY'
        }).then(aliasResponse => {
          if (aliasResponse?.data?.getAlias?.v2ContentMetadata) {
            console.log('METADATA LOADED FROM ALIAS')
            setMetadata(aliasResponse?.data?.getAlias?.v2ContentMetadata)
            setLoading(false)
          } else {
            API.graphql({
              query: getV2ContentMetadata,
              variables: { id: seriesId },
              authMode: 'API_KEY',
            }).then(response => {
              if (response?.data?.getV2ContentMetadata) {
                console.log('METADATA LOADED FROM CID')
                setMetadata(response?.data?.getV2ContentMetadata)
                setLoading(false)
              } else {
                // That wasn't there, so lets check V2
                API.graphql({
                  query: getContentMetadata,
                  variables: { id: seriesId },
                  authMode: 'API_KEY',
                }).then(response => {
                  if (response?.data?.getContentMetadata) {
                    console.log('METADATA LOADED FROM V1 METADATA')
                    setMetadata(response?.data?.getContentMetadata)
                    setLoading(false)
                  } else {
                    setLoading(false)
                    setError(true)
                  }
                }).catch(error => {
                  console.log(error)
                  setLoading(false)
                  setError(true)
                })
              }
            }).catch(error => {
              console.log(error)
              setLoading(false)
              setError(true)
            })
          }
        }).catch(error => {
          console.log(error)
          setLoading(false)
          setError(true)
        })
      }
    }

  }, [seriesId]);

  useEffect(() => {
    // console.log('LOADING: ', loading)
    // console.log('LOADING SAVED CIDS', loadingSavedCids)
    // console.log('METADATA: ', metadata)
  }, [loading, loadingSavedCids, metadata]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (metadata) {
    return <HomePage metadata={metadata} />
  }

  if (favorites) {
    window.localStorage.setItem('memeSRCDefaultIndex', '_favorites')
    navigate('/')
  }

  return error ? <Page404 /> : <center><CircularProgress /></center>;
};

export default DynamicRouteHandler;

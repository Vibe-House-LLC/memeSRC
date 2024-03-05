import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { API, graphqlOperation } from 'aws-amplify';
import { getAlias, getContentMetadata, getV2ContentMetadata } from '../graphql/queries'; // Import the getContentMetadata
import SeriesPage from './SeriesPage';
import HomePage from './HomePage';
import useSearchDetailsV2 from '../hooks/useSearchDetailsV2';

const DynamicRouteHandler = () => {
  const { seriesId } = useParams();
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState(null);
  const { loadingSavedCids } = useSearchDetailsV2();

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
              }
            }).catch(error => {
              console.log(error)
              setLoading(false)
            })
          }
        }).catch(error => {
          console.log(error)
          setLoading(false)
        })
      }
    }).catch(error => {
      console.log(error)
      setLoading(false)
    })
  }, [seriesId]);

  if (loading || loadingSavedCids) {
    return <div>Loading...</div>;
  }

  if (metadata) {
    // return <SeriesPage seriesData={seriesData} />; // Pass seriesData as prop to SeriesPage
    return <HomePage />
  }

  return <Navigate to="/404" replace />;
};

export default DynamicRouteHandler;

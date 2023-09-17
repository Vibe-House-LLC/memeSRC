import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { API, graphqlOperation } from 'aws-amplify';
import { getContentMetadata } from '../graphql/queries'; // Import the getContentMetadata
import SeriesPage from './SeriesPage';
import HomePage from './HomePage';

const DynamicRouteHandler = () => {
  const { seriesId } = useParams();
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    const fetchContentMetadata = async () => {
      try {
        const response = await API.graphql({
          query: getContentMetadata,
          variables: { id: seriesId },
          authMode: 'API_KEY',
        });

        setMetadata(response.data.getContentMetadata);
      } catch (error) {
        console.error('Failed to fetch GraphQL content metadata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContentMetadata();
  }, [seriesId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (metadata) {
    // return <SeriesPage seriesData={seriesData} />; // Pass seriesData as prop to SeriesPage
    return <HomePage />
  }

  return <Navigate to="/404" replace />;
};

export default DynamicRouteHandler;

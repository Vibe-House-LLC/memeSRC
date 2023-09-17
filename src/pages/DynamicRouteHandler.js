import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { API, graphqlOperation } from 'aws-amplify';  // Ensure graphqlOperation is imported
import { listSeries } from '../graphql/queries';
import SeriesPage from './SeriesPage';

const DynamicRouteHandler = () => {
  const { seriesId } = useParams();
  const [loading, setLoading] = useState(true);
  const [seriesData, setSeriesData] = useState(null);

  useEffect(() => {
    const fetchSeriesData = async () => {
      try {
        const response = await API.graphql({
          ...graphqlOperation(listSeries, {
            filter: {
              slug: {
                eq: seriesId,
              },
            },
          }),
          authMode: 'API_KEY',
        });

        if (response.data.listSeries.items.length > 0) {
          setSeriesData(response.data.listSeries.items[0]);
        }
      } catch (error) {
        console.error('Failed to fetch GraphQL series data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSeriesData();
  }, [seriesId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (seriesData) {
    return <SeriesPage seriesData={seriesData} />; // Pass seriesData as prop to SeriesPage
  }

  return <Navigate to="/404" replace />;
};

export default DynamicRouteHandler;

import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { API } from 'aws-amplify';
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
          query: listSeries,
          variables: {
            filter: {
              slug: {
                eq: seriesId,
              },
            },
          },
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
    return <SeriesPage />; // Display the SeriesPage component when valid series data exists
  }

  return <Navigate to="/404" replace />;
};

export default DynamicRouteHandler;

import { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API } from 'aws-amplify';
import { CircularProgress } from '@mui/material';
import { getAlias, getContentMetadata, getV2ContentMetadata } from '../graphql/queries';
import HomePage from './HomePage';
import useSearchDetailsV2 from '../hooks/useSearchDetailsV2';
import Page404 from './Page404';
import { safeSetItem } from '../utils/storage';
import { useSearchFilterGroups } from '../hooks/useSearchFilterGroups';
import { UserContext } from '../UserContext';

const DynamicRouteHandler = () => {
  const { seriesId } = useParams();
  const { groups } = useSearchFilterGroups();
  const { shows } = useContext(UserContext);
  const navigate = useNavigate();
  const fetchedIdRef = useRef(null);

  const [asyncState, setAsyncState] = useState({
    metadata: null,
    loading: false,
    error: false,
    fetchedId: null
  });

  // Resolve metadata synchronously from Context (Shows or Groups)
  const syncMetadata = useMemo(() => {
    if (!seriesId || seriesId === '_favorites') return null;

    // Check groups
    if (seriesId.startsWith('custom_') || groups.some(g => g.id === seriesId)) {
      const filter = groups.find(g => g.id === seriesId);
      if (filter) {
        let items = [];
        let colorMain = '#000000';
        let colorSecondary = '#FFFFFF';
        try {
          const parsed = JSON.parse(filter.filters);
          items = parsed.items || [];
          colorMain = parsed.colorMain || '#000000';
          colorSecondary = parsed.colorSecondary || '#FFFFFF';
        } catch (e) {
          console.error("Error parsing filter", e);
        }

        const totalFrameCount = items.reduce((acc, itemId) => {
          const show = shows.find(s => s.id === itemId);
          return acc + (show?.frameCount || 0);
        }, 0);

        return {
          id: filter.id,
          title: filter.name,
          colorMain,
          colorSecondary,
          frameCount: totalFrameCount,
        };
      }
    }

    // Check shows
    const show = shows.find(s => s.id === seriesId);
    if (show) {
      return {
        id: show.id,
        title: show.title || show.name,
        colorMain: show.colorMain,
        colorSecondary: show.colorSecondary,
        frameCount: show.frameCount,
      };
    }

    return null;
  }, [seriesId, groups, shows]);

  // Handle side effects (Fetching data or Redirecting)
  useEffect(() => {
    if (!seriesId) return;

    if (seriesId === '_favorites') {
      safeSetItem('memeSRCDefaultIndex', '_favorites');
      navigate('/');
      return;
    }

    // If we have sync metadata, no need to fetch
    if (syncMetadata) return;

    // If we already have the data for this ID, don't refetch
    if (fetchedIdRef.current === seriesId) return;

    fetchedIdRef.current = seriesId; // cache to prevent duplicate fetches without retriggering effect
    setAsyncState({ metadata: null, loading: true, error: false, fetchedId: seriesId });

    let isMounted = true;

    const fetchMetadata = async () => {
      try {
        // 1. Try Alias
        const aliasResponse = await API.graphql({
          query: getAlias,
          variables: { id: seriesId },
          authMode: 'API_KEY'
        });

        if (aliasResponse?.data?.getAlias?.v2ContentMetadata) {
          if (isMounted) {
            setAsyncState({
              metadata: aliasResponse.data.getAlias.v2ContentMetadata,
              loading: false,
              error: false,
              fetchedId: seriesId
            });
          }
          return;
        }

        // 2. Try V2 Metadata
        const v2Response = await API.graphql({
          query: getV2ContentMetadata,
          variables: { id: seriesId },
          authMode: 'API_KEY',
        });

        if (v2Response?.data?.getV2ContentMetadata) {
          if (isMounted) {
            setAsyncState({
              metadata: v2Response.data.getV2ContentMetadata,
              loading: false,
              error: false,
              fetchedId: seriesId
            });
          }
          return;
        }

        // 3. Try V1 Metadata
        const v1Response = await API.graphql({
          query: getContentMetadata,
          variables: { id: seriesId },
          authMode: 'API_KEY',
        });

        if (v1Response?.data?.getContentMetadata) {
          if (isMounted) {
            setAsyncState({
              metadata: v1Response.data.getContentMetadata,
              loading: false,
              error: false,
              fetchedId: seriesId
            });
          }
          return;
        }

        // 4. Not Found
        if (isMounted) {
          setAsyncState({
            metadata: null,
            loading: false,
            error: true,
            fetchedId: seriesId
          });
        }

      } catch (error) {
        console.error(error);
        if (isMounted) {
          setAsyncState({
            metadata: null,
            loading: false,
            error: true,
            fetchedId: seriesId
          });
        }
      }
    };

    fetchMetadata();

    return () => { isMounted = false; };
  }, [seriesId, syncMetadata, navigate]);

  // Render Logic
  if (!seriesId) {
    return <HomePage />;
  }

  if (seriesId === '_favorites') {
    return <center><CircularProgress /></center>; // Show loading while redirecting
  }

  const activeMetadata = syncMetadata || (asyncState.fetchedId === seriesId ? asyncState.metadata : null);

  if (activeMetadata) {
    return <HomePage metadata={activeMetadata} />;
  }

  if (asyncState.error && asyncState.fetchedId === seriesId) {
    return <Page404 />;
  }

  return <center><CircularProgress /></center>;
};

export default DynamicRouteHandler;

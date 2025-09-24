import { API } from 'aws-amplify';
import React, { useState, useCallback, useEffect, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import FullScreenSearch from '../sections/search/FullScreenSearch';
import useSearchDetailsV2 from '../hooks/useSearchDetailsV2';
import { UserContext } from '../UserContext';
import { trackUsageEvent } from '../utils/trackUsageEvent';
import getSessionID from '../utils/getSessionsId';

const prepSessionID = () => {
  void getSessionID().catch((error) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('Failed to initialize session id', error);
    }
  });
};

const SEARCH_TERM_STORAGE_KEY = 'memeSRC:lastSearchTerm';

const readStoredSearchTerm = () => {
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    const stored = window.sessionStorage.getItem(SEARCH_TERM_STORAGE_KEY);
    return typeof stored === 'string' ? stored : '';
  } catch (error) {
    return '';
  }
};

export default function SearchPage({ metadata }) {
  const { defaultShow, shows } = useContext(UserContext)
  const [searchTerm, setSearchTerm] = useState(() => readStoredSearchTerm());
  const [seriesTitle, setSeriesTitle] = useState(shows.some(show => show.isFavorite) ? defaultShow : '_universal');
  const { setSearchQuery: setV2SearchQuery } = useSearchDetailsV2()

  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      if (searchTerm) {
        window.sessionStorage.setItem(SEARCH_TERM_STORAGE_KEY, searchTerm);
      } else {
        window.sessionStorage.removeItem(SEARCH_TERM_STORAGE_KEY);
      }
    } catch (error) {
      // Swallow storage errors (private mode, quota, etc.)
    }
  }, [searchTerm]);

  useEffect(() => {
    const runWarmups = () => {
      API.get('publicapi', '/search', { queryStringParameters: { warmup: true } })
      API.get('publicapi', '/random', { queryStringParameters: { warmup: true } })
      // Prep sessionID for future use
      prepSessionID()
    }

    const idleId = 'requestIdleCallback' in window
      ? window.requestIdleCallback(runWarmups)
      : setTimeout(runWarmups, 1000)

    return () => {
      if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId)
      } else {
        clearTimeout(idleId)
      }
    }
  }, [])

  const handleSearch = useCallback((e) => {
    if (e) {
      e.preventDefault();
    }

    const rawSearchTerm = typeof searchTerm === 'string' ? searchTerm : '';
    const trimmedSearchTerm = rawSearchTerm.trim();
    const searchTermForLogging = trimmedSearchTerm;
    setV2SearchQuery(rawSearchTerm)

    const favoritesList = Array.isArray(shows)
      ? shows.filter((show) => show?.isFavorite).map((show) => show?.id).filter(Boolean)
      : [];
    let resolvedIndex = seriesTitle;
    if (seriesTitle === '_favorites') {
      resolvedIndex = favoritesList.join(',') || '_favorites';
    }

    trackUsageEvent('search', {
      index: seriesTitle,
      searchTerm: searchTermForLogging,
      resolvedIndex,
      source: 'HomePage',
    });

    const encodedSearchTerms = encodeURI(rawSearchTerm)
    navigate(`/search/${seriesTitle}?searchTerm=${encodedSearchTerms}`)
  }, [seriesTitle, searchTerm, shows, navigate]);

  const memoizedFullScreenSearch = useMemo(() => (
    <FullScreenSearch
      searchFunction={handleSearch}
      setSearchTerm={setSearchTerm}
      setSeriesTitle={setSeriesTitle}
      searchTerm={searchTerm}
      seriesTitle={seriesTitle}
      shows={shows}
      metadata={metadata}
    />
  ), [handleSearch, setSearchTerm, setSeriesTitle, searchTerm, seriesTitle, shows, metadata]);

  return (
    <>
      <Helmet>
        <title>memeSRC</title>
      </Helmet>
      {memoizedFullScreenSearch}
    </>
  );
}

SearchPage.propTypes = {
  metadata: PropTypes.array,
};

import { API } from 'aws-amplify';
import React, { useState, useCallback, useEffect, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import FullScreenSearch from '../sections/search/FullScreenSearch';
import useSearchDetailsV2 from '../hooks/useSearchDetailsV2';
import { UserContext } from '../UserContext';

const prepSessionID = async () => {
  if (!("sessionID" in sessionStorage)) {
    API.get('publicapi', '/uuid')
      .then(generatedSessionID => {
        sessionStorage.setItem("sessionID", generatedSessionID);
        return generatedSessionID;
      })
      .catch(err => {
        console.log(`UUID Gen Fetch Error:  ${err}`);
        throw err;
      });
  }
};

export default function SearchPage({ metadata }) {
  const { defaultShow, shows } = useContext(UserContext)
  const [searchTerm, setSearchTerm] = useState('');
  const [seriesTitle, setSeriesTitle] = useState(shows.some(show => show.isFavorite) ? defaultShow : '_universal');
  const { savedCids, setSearchQuery: setV2SearchQuery } = useSearchDetailsV2()

  const navigate = useNavigate();

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

    setV2SearchQuery(searchTerm)
    const encodedSearchTerms = encodeURI(searchTerm)
    navigate(`/search/${seriesTitle}?searchTerm=${encodedSearchTerms}`)
  }, [seriesTitle, searchTerm, navigate, savedCids]);

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

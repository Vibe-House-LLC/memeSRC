import React, { useState, useCallback, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { get } from '../utils/api';
import FullScreenSearch from '../sections/search/FullScreenSearch';
import useSearchDetailsV2 from '../hooks/useSearchDetailsV2';
import { UserContext } from '../UserContext';

const prepSessionID = async () => {
  if (!("sessionID" in sessionStorage)) {
    try {
      const generatedSessionID = await get({
        apiName: 'publicapi',
        path: '/uuid'
      });
      sessionStorage.setItem("sessionID", generatedSessionID);
      return generatedSessionID;
    } catch (err) {
      console.log(`UUID Gen Fetch Error:  ${err}`);
      throw err;
    }
  }
};

export default function SearchPage({ metadata }) {
  const { defaultShow, shows } = useContext(UserContext)
  const [searchTerm, setSearchTerm] = useState('');
  const [seriesTitle, setSeriesTitle] = useState(shows.some(show => show.isFavorite) ? defaultShow : '_universal');
  const { savedCids, setSearchQuery: setV2SearchQuery } = useSearchDetailsV2()

  const navigate = useNavigate();


  const handleSearch = useCallback((e) => {
    if (e) {
      e.preventDefault();
    }

    setV2SearchQuery(searchTerm)
    const encodedSearchTerms = encodeURI(searchTerm)
    navigate(`/search/${seriesTitle}?searchTerm=${encodedSearchTerms}`)
  }, [seriesTitle, searchTerm, navigate, setV2SearchQuery]);

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

import { API } from 'aws-amplify';
import React, { useState, useCallback, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import FullScreenSearch from '../sections/search/FullScreenSearch';
import useSearchDetails from '../hooks/useSearchDetails';
import useSearchDetailsV2 from '../hooks/useSearchDetailsV2';
import { UserContext } from '../UserContext';
import { useShows } from '../contexts/useShows';

const prepSessionID = async () => {
  let sessionID;
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
  const { setSearchQuery } = useSearchDetails();
  const { user, defaultShow, shows } = useContext(UserContext)
  const [searchTerm, setSearchTerm] = useState('');
  const [seriesTitle, setSeriesTitle] = useState(shows.some(show => show.isFavorite) ? defaultShow : '_universal');
  const { savedCids, setSearchQuery: setV2SearchQuery } = useSearchDetailsV2()

  // useEffect(() => {
  //   console.log(shows.some(show => show.isFavorite))
  // }, []);

  const navigate = useNavigate();

  useEffect(() => {
    // Make sure API functions are warm
    API.get('publicapi', '/search', { queryStringParameters: { warmup: true } })
    API.get('publicapi', '/random', { queryStringParameters: { warmup: true } })
    // Prep sessionID for future use
    prepSessionID()
  }, [])

  const handleSearch = useCallback((e) => {
    if (e) {
      e.preventDefault();
    }

    setV2SearchQuery(searchTerm)
    const encodedSearchTerms = encodeURI(searchTerm)
    // console.log(`Navigating to: '${`/search/${seriesTitle}/${encodedSearchTerms}`}'`)
    navigate(`/search/${seriesTitle}?searchTerm=${encodedSearchTerms}`)
    // console.log(seriesTitle)

    // const v2 = shows?.find(obj => obj.id === seriesTitle) || savedCids?.find(obj => obj.id === seriesTitle)

    // if (v2 && v2?.version === 2) {
    //   setV2SearchQuery(searchTerm)
    //   const encodedSearchTerms = encodeURI(searchTerm)
    //   console.log(`Navigating to: '${`/v2/search/${seriesTitle}/${encodedSearchTerms}`}'`)
    //   navigate(`/v2/search/${seriesTitle}/${encodedSearchTerms}`)
    // } else {
    //   setSearchQuery(searchTerm)
    //   const encodedSearchTerms = encodeURI(searchTerm)
    //   console.log(`Navigating to: '${`/search/${seriesTitle}/${encodedSearchTerms}`}'`)
    //   navigate(`/search/${seriesTitle}/${encodedSearchTerms}`)
    // }

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

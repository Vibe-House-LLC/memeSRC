import { API } from 'aws-amplify';
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import FullScreenSearch from '../sections/search/FullScreenSearch';
import useSearchDetails from '../hooks/useSearchDetails';

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

export default function SearchPage() {
  const { setSearchQuery } = useSearchDetails();
  const [searchTerm, setSearchTerm] = useState('');
  const [seriesTitle, setSeriesTitle] = useState('_universal');

  const navigate = useNavigate();

  useEffect(() => {
    // Make sure API functions are warm
    API.get('publicapi', '/search', { queryStringParameters: { warmup: true } })
    API.get('publicapi', '/random', { queryStringParameters: { warmup: true } })
    // Prep sessionID for future use
    prepSessionID()
  }, [])

  const handleSearch = useCallback((e) => {
    if(e) {
      e.preventDefault();
    }
    setSearchQuery(searchTerm)
    const encodedSearchTerms = encodeURI(searchTerm)
    console.log(`Navigating to: '${`/search/${seriesTitle}/${encodedSearchTerms}`}'`)
    navigate(`/search/${seriesTitle}/${encodedSearchTerms}`)
  }, [seriesTitle, searchTerm, navigate]);

  return (
    <>
      <Helmet>
        <title>memeSRC</title>
      </Helmet>
      <FullScreenSearch
        searchFunction={handleSearch}
        setSearchTerm={setSearchTerm}
        setSeriesTitle={setSeriesTitle}
        searchTerm={searchTerm}
        seriesTitle={seriesTitle}
      />
    </>
  );
}

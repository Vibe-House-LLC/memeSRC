import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Grid, CircularProgress, Card } from '@mui/material';
import styled from '@emotion/styled';
import { useNavigate, useParams } from 'react-router-dom';
import TopBannerSearch from '../sections/search/TopBannerSearch';

const StyledCircularProgress = styled(CircularProgress)`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
`;

const StyledCard = styled(Card)`
  
  border: 3px solid transparent;
  box-sizing: border-box;

  &:hover {
    border: 3px solid orange;
  }
`;

const StyledCardMedia = styled.img`
  width: 100%;
  height: 300px;
  aspect-ratio: '16/9';
  object-fit: contain;
  object-position: center;
  background-color: black;
`;

const StyledTypography = styled.p(({ theme }) => ({
  fontSize: '14px',
  color: theme.palette.text.secondary,
  padding: '10px 10px 10px 25px'
}));

export default function SearchPage() {
  const params = useParams();

  const [searchTerm, setSearchTerm] = useState(params.searchTerms);
  const [seriesTitle, setSeriesTitle] = useState(params.seriesId);
  const [loadedSearchTerm, setLoadedSearchTerm] = useState(null);
  const [loadedSeriesTitle, setLoadedSeriesTitle] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  const memoizedResults = useMemo(() => results, [results]);

  const navigate = useNavigate();

  const getSessionID = async () => {
    let sessionID;
    if ("sessionID" in sessionStorage) {
      sessionID = sessionStorage.getItem("sessionID");
    } else {
      await fetch(`https://api.memesrc.com/?uuidGen`)
        .then(response => {
          response.json()
            .then(generatedSessionID => {
              sessionStorage.setItem("sessionID", generatedSessionID);
              sessionID = generatedSessionID
            }).catch(err => console.log(`JSON Parse Error:  ${err}`));
        }).catch(err => console.log(`UUID Gen Fetch Error:  ${err}`));
    }
    return sessionID;
  }

  useEffect(() => {
    if (params) {
      console.log(`'${params.seriesId}' !== '${loadedSeriesTitle}' || '${params.searchTerms}' !== '${loadedSearchTerm}'`)
      if (params.seriesId !== loadedSeriesTitle || params.searchTerms !== loadedSearchTerm) {
        setSearchTerm(params.searchTerms)
        setSeriesTitle(params.seriesId)
        console.log(params)
        setLoading(true);
        let apiSearchUrl;
        if (seriesTitle && seriesTitle !== '_universal') {
          apiSearchUrl = `https://api.memesrc.com/?series=${seriesTitle}&search=${searchTerm}`;
        } else {
          apiSearchUrl = `https://api.memesrc.com/?search=${searchTerm}`;
        }

        getSessionID().then(sessionID => {
          fetch(`${apiSearchUrl}&sessionID=${sessionID}`)
            .then(response => response.json())
            .then(data => {
              setResults(data);
              setLoading(false);
              setLoadedSearchTerm(searchTerm);
              setLoadedSeriesTitle(seriesTitle);
            })
            .catch(error => {
              console.error(error);
              setLoading(false);
            });
        }).catch(err => console.log(`Error with sessionID: ${err}`))
      }
    }
  }, [params, searchTerm, seriesTitle, loadedSeriesTitle, loadedSearchTerm])

  const handleSearch = useCallback((e) => {
    if (e) {
      e.preventDefault();
    }
    const encodedSearchTerms = encodeURI(searchTerm)
    console.log(`Navigating to: '${`/search/${seriesTitle}/${encodedSearchTerms}`}'`)
    navigate(`/search/${seriesTitle}/${encodedSearchTerms}`)
  }, [seriesTitle, searchTerm]);

  return (

    <>
      {(memoizedResults || loading) && <TopBannerSearch searchFunction={handleSearch} setSearchTerm={setSearchTerm} setSeriesTitle={setSeriesTitle} searchTerm={searchTerm} seriesTitle={seriesTitle} loading={loading} />}
      <Grid container spacing={2} alignItems='stretch' paddingX={{ xs: 2, md: 6 }}>
        {loading ? (
          <StyledCircularProgress />
        ) : memoizedResults && memoizedResults.map(result => (
          <Grid item xs={12} sm={6} md={3} key={result.fid}>
            <a href={`/editor/${result.fid}?search=${encodeURI(searchTerm)}`} style={{ textDecoration: 'none' }}>
              <StyledCard>
                <StyledCardMedia
                  component="img"
                  src={`https://memesrc.com${result.frame_image}`}
                  alt={result.subtitle}
                  title={result.subtitle} />
                <StyledTypography variant="body2">
                  Subtitle: {result.subtitle}<br />
                  Series: {result.series_name}<br />
                  Season: {result.season_number}<br />
                  Episode: {result.episode_number}
                </StyledTypography>
              </StyledCard>
            </a>
          </Grid>
        ))}
      </Grid>
    </>
  );
}

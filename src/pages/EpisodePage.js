import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Grid, CircularProgress, Card, Button } from '@mui/material';
import styled from '@emotion/styled';
import { Stack } from '@mui/system';
import { LoadingButton } from '@mui/lab';
// import FullScreenSearch from '../sections/search/FullScreenSearch';
// import TopBannerSearch from '../sections/search/TopBannerSearch';

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
  height: auto;
  background-color: black;
`;

const StyledTypography = styled.p(({ theme }) => ({
  fontSize: '14px',
  color: theme.palette.text.secondary,
  padding: '10px 10px 10px 25px'
}));

export default function EpisodePage() {
  // const [searchTerm, setSearchTerm] = useState('');
  // const [seriesTitle, setSeriesTitle] = useState('');
  const [results, setResults] = useState([]);
  const [sessionID, setSessionID] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const memoizedResults = useMemo(() => results, [results]);

  const { seriesId, seasonNum, episodeNum } = useParams();

  useEffect(() => {
    if ("sessionID" in sessionStorage) {
      setSessionID(sessionStorage.getItem("sessionID"));
    } else {
      fetch(`https://api.memesrc.com/?uuidGen`)
        .then(response => {
          response.text()
            .then(responseText => {
              const generatedSessionID = JSON.parse(responseText);
              setSessionID(generatedSessionID);
              sessionStorage.setItem("sessionID", generatedSessionID);
            }).catch(err => console.log(`JSON Parse Error:  ${err}`));
        }).catch(err => console.log(`UUID Gen Fetch Error:  ${err}`));
    }
  }, [])

  const loadFrames = useCallback((start) => {
    if (sessionID) {
      const apiEpisodeLookupUrl = `https://api.memesrc.com/?series=${seriesId}&season=${seasonNum}&episode=${episodeNum}&start=${start}&sessionID=${sessionID}`
      setLoadingMore(true);
      fetch(apiEpisodeLookupUrl)
        .then(response => response.json())
        .then(data => {
          setResults([...results, ...data]);
          setLoading(false);
          setLoadingMore(false);
        })
        .catch(error => {
          console.error(error);
          setLoading(false);
          setLoadingMore(false);
        });
    } else {
      console.log('Session ID not ready yet.')
    }
  }, [sessionID, seriesId, seasonNum, episodeNum, results]);

  useEffect(() => {
    loadFrames('0');
  }, [sessionID, seriesId, seasonNum, episodeNum]);


  // const classes = useStyles();

  return (

    <>
      {/* {!memoizedResults && !loading && <FullScreenSearch searchFunction={handleSearch} setSearchTerm={setSearchTerm} setSeriesTitle={setSeriesTitle} searchTerm={searchTerm} seriesTitle={seriesTitle} />}
      {(memoizedResults || loading) && <TopBannerSearch searchFunction={handleSearch} setSearchTerm={setSearchTerm} setSeriesTitle={setSeriesTitle} searchTerm={searchTerm} seriesTitle={seriesTitle} />} */}
      <Stack spacing={2} direction='column' padding={3}>
        <Grid container spacing={2} marginTop={5}>
          {loading ? (
            <StyledCircularProgress />
          ) : memoizedResults && memoizedResults.map(result => (
            <Grid item xs={12/2} sm={12/2} md={12/5} key={result.fid}>
              <a href={`/editor/${result.fid}`} style={{ textDecoration: 'none' }}>
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
        <Grid container justifyContent='center'>
          <Grid item xs={12} sm={3} md={1}>
            {!loading && <LoadingButton loading={loadingMore} variant='contained' fullWidth onClick={() => loadFrames(results.length)}>Load More</LoadingButton>}
          </Grid>
        </Grid>
      </Stack>
    </>
  );
}

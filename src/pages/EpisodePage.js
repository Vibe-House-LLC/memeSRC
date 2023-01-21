import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Grid, CircularProgress, Card } from '@mui/material';
import styled from '@emotion/styled';
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

export default function EpisodePage() {
  // const [searchTerm, setSearchTerm] = useState('');
  // const [seriesTitle, setSeriesTitle] = useState('');
  const [results, setResults] = useState(null);
  const [sessionID, setSessionID] = useState(null);
  const [loading, setLoading] = useState(false);

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

 useEffect(() => {
    if (sessionID) {
      setLoading(true);
      const apiEpisodeLookupUrl = `https://api.memesrc.com/?series=${seriesId}&season=${seasonNum}&episode=${episodeNum}&start=0&sessionID=${sessionID}`

      fetch(apiEpisodeLookupUrl)
        .then(response => response.json())
        .then(data => {
          setResults(data);
          setLoading(false);
        })
        .catch(error => {
          console.error(error);
          setLoading(false);
        });
    } else {
      setLoading(true);
      console.log('Session ID not ready yet.')
    }
  }, [sessionID, seriesId, seasonNum, episodeNum]);


  // const classes = useStyles();

  return (

    <>
      {/* {!memoizedResults && !loading && <FullScreenSearch searchFunction={handleSearch} setSearchTerm={setSearchTerm} setSeriesTitle={setSeriesTitle} searchTerm={searchTerm} seriesTitle={seriesTitle} />}
      {(memoizedResults || loading) && <TopBannerSearch searchFunction={handleSearch} setSearchTerm={setSearchTerm} setSeriesTitle={setSeriesTitle} searchTerm={searchTerm} seriesTitle={seriesTitle} />} */}
      <Grid container spacing={2} marginTop={5}>
        {loading ? (
          <StyledCircularProgress />
        ) : memoizedResults && memoizedResults.map(result => (
          <Grid item xs={12} sm={6} md={4} key={result.fid}>
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
    </>
  );
}

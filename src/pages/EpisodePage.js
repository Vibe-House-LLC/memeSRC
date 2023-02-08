import PropTypes from 'prop-types';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Grid, CircularProgress, Card } from '@mui/material';
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
  position: relative;

  &:hover img, &:active img, &:focus img{
    animation: bgmve 5s;
    animation-iteration-count: infinite;
    animation-timing-function: ease;
    }

  &:hover {
    border: 3px solid orange;
  }
`;

const StyledCardMedia = styled.img`
  width: 100%;
  height: 230px;
  aspect-ratio: '16/9';
  object-fit: cover;
  object-position: 50% 0;
  background-color: black;

  @keyframes bgmve {
    0% {object-position: 50% 0; animation-timing-function: ease-out;}
    25% {object-position: 0 0; animation-timing-function: ease-in;}
    50% {object-position: 50% 0; animation-timing-function: ease-out;}
    75% {object-position: 100% 0; animation-timing-function: ease-in;}
    100% {object-position: 50% 0; animation-timing-function: ease-in;}
  }
`;

const TopCardInfo = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background-color: rgb(0, 0, 0, 0.6);
  padding: 3px 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const BottomCardCaption = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  ${props => props.theme.breakpoints.up("xs")} {
    font-size: clamp(1em, 1.5vw, 1.5em);
    }
  ${props => props.theme.breakpoints.up("md")} {
  font-size: clamp(1em, 1.5vw, 1.5em);
  }
  font-weight: 800;
  padding: 18px 10px;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
`;

const SeasonEpisodeText = styled.span`
  color: #919191;
  font-size: 0.8em;
`;

// Prop types
EpisodePage.propTypes = {
    setSeriesTitle: PropTypes.func
};

export default function EpisodePage({ setSeriesTitle }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const memoizedResults = useMemo(() => results, [results]);

  const { seriesId, seasonNum, episodeNum } = useParams();

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

  const loadFrames = useCallback((start) => {
    const apiEpisodeLookupUrl = `https://api.memesrc.com/?series=${seriesId}&season=${seasonNum}&episode=${episodeNum}&start=${start}`
    setLoadingMore(true);
    getSessionID().then(sessionID => {
      fetch(`${apiEpisodeLookupUrl}&sessionID=${sessionID}`)
        .then(response => response.json())
        .then(data => {
          setSeriesTitle(data[1].series_name)
          setResults([...results, ...data]);
          setLoading(false);
          setLoadingMore(false);
        })
        .catch(error => {
          console.error(error);
          setLoading(false);
          setLoadingMore(false);
        });
    }).catch(err => console.log(`Error with sessionID: ${err}`))
  }, [seriesId, seasonNum, episodeNum, results, setSeriesTitle]);

  useEffect(() => {
    loadFrames('0');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // const classes = useStyles();

  return (

    <>
      {/* {!memoizedResults && !loading && <FullScreenSearch searchFunction={handleSearch} setSearchTerm={setSearchTerm} setSeriesTitle={setSeriesTitle} searchTerm={searchTerm} seriesTitle={seriesTitle} />}
      {(memoizedResults || loading) && <TopBannerSearch searchFunction={handleSearch} setSearchTerm={setSearchTerm} setSeriesTitle={setSeriesTitle} searchTerm={searchTerm} seriesTitle={seriesTitle} />} */}
      <Stack spacing={2} direction='column' padding={3}>
        <Grid container spacing={2} alignItems='stretch' paddingX={{ xs: 2, md: 6 }}>
          {loading ? (
            <StyledCircularProgress />
          ) : memoizedResults && memoizedResults.map(result => (
            <Grid item xs={6} sm={6} md={3} key={result.fid}>
              <a href={`/editor/${result.fid}`} style={{ textDecoration: 'none' }}>
                <StyledCard>
                  <StyledCardMedia
                    component="img"
                    src={`https://memesrc.com${result.frame_image}`}
                    alt={result.subtitle}
                    title={result.subtitle} />
                  <TopCardInfo>
                    <SeasonEpisodeText><b>S.</b>{result.season_number} <b>E.</b>{result.episode_number}</SeasonEpisodeText> <b>{result.series_name}</b>
                  </TopCardInfo>
                  <BottomCardCaption>
                    {result.subtitle}
                  </BottomCardCaption>

                  {/* <StyledTypography variant="body2">
                  Subtitle: {result.subtitle}<br />
                  Series: {result.series_name}<br />
                  Season: {result.season_number}<br />
                  Episode: {result.episode_number}
                </StyledTypography> */}
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

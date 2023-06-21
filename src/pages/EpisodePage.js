import PropTypes from 'prop-types';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Grid, CircularProgress, Card } from '@mui/material';
import styled from '@emotion/styled';
import { Stack } from '@mui/system';
import { LoadingButton } from '@mui/lab';
import { API } from 'aws-amplify';
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
  display: flex;
  flex-direction: column;

  &:hover {
    border: 3px solid orange;
  }
`;


const StyledCardMedia = styled.img`
  max-width: 100%;
  height: auto;
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

const BottomCardLabel = styled.div`
  position: absolute;
  top: 10px; 
  left: 10px;
  padding: 3px 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${props => props.theme.palette.common.white};
  text-align: left;
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

  const { seriesId, seasonNum, episodeNum, frameNum } = useParams();

  const getSessionID = async () => {
    let sessionID;
    if ("sessionID" in sessionStorage) {
      sessionID = sessionStorage.getItem("sessionID");
      return Promise.resolve(sessionID);
    }
    return API.get('publicapi', '/uuid')
      .then(generatedSessionID => {
        sessionStorage.setItem("sessionID", generatedSessionID);
        return generatedSessionID;
      })
      .catch(err => {
        console.log(`UUID Gen Fetch Error:  ${err}`);
        throw err;
      });
  };

  const loadFrames = useCallback((startInput) => {
    const start = Math.max(Number(startInput), 0);
    const apiEpisodeLookupUrl = `https://api.memesrc.com/?series=${seriesId}&season=${seasonNum}&episode=${episodeNum}&start=${start}`;
    setLoadingMore(true);
    getSessionID().then(sessionID => {
      fetch(`${apiEpisodeLookupUrl}&sessionID=${sessionID}`)
        .then(response => response.json())
        .then(data => {
          setSeriesTitle(data[1].series_name);
          
          // Combine old and new results, and de-duplicate based on fid
          const allResultsMap = new Map([...results, ...data].map(result => [result.fid, result]));
          const allResults = [...allResultsMap.values()];

          // Sort all results based on the number part of fid
          allResults.sort((a, b) => {
            const numA = Number(a.fid.split('-')[3]);
            const numB = Number(b.fid.split('-')[3]);
            return numA - numB;
          });
          setResults(allResults);
          setLoading(false);
          setLoadingMore(false);
        })
        .catch(error => {
          console.error(error);
          setLoading(false);
          setLoadingMore(false);
        });
    }).catch(err => console.log(`Error with sessionID: ${err}`));
  }, [seriesId, seasonNum, episodeNum, results, setSeriesTitle]);




  useEffect(() => {
    loadFrames(((Number(frameNum)+1) / 9) - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // const classes = useStyles();

  return (

    <>
      <Stack spacing={2} direction='column' padding={3}>
      <Grid container justifyContent='center'>
          <Grid item xs={12} sm={3} md={1}>
            {!loading && <LoadingButton loading={loadingMore} variant='contained' fullWidth onClick={() => loadFrames(((((Number(results[0].fid.split('-')[3]))+1) / 9) - 1)-500)}>Load Previous</LoadingButton>}
          </Grid>
        </Grid>
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
                </StyledCard>
              </a>
            </Grid>
          ))}
        </Grid>
        <Grid container justifyContent='center'>
          <Grid item xs={12} sm={3} md={1}>
            {!loading && <LoadingButton loading={loadingMore} variant='contained' fullWidth onClick={() => loadFrames(((((Number(results[results.length-1].fid.split('-')[3]))+1) / 9) - 1))}>Load Next</LoadingButton>}
          </Grid>
        </Grid>
      </Stack>
    </>
  );
}

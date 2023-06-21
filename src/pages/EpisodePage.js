import PropTypes from 'prop-types';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Grid, CircularProgress, List, ListItem, ListItemText, ListItemAvatar, Avatar, Card, CardActionArea, CardMedia, CardContent, Typography } from '@mui/material';
import styled from '@emotion/styled';
import { Stack } from '@mui/system';
import { LoadingButton } from '@mui/lab';
import { API } from 'aws-amplify';

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
    loadFrames(((Number(frameNum) + 1) / 9) - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // const classes = useStyles();

  return (
    <>
      {/* <Typography variant='h2'>{seriesId}</Typography>
      <Typography variant='h4'>{seriesId}</Typography> */}
      <Typography gutterBottom variant="h3" component="div">
                      <b>{seriesId}</b>
                    </Typography>
                    <Typography gutterBottom variant="h5" color="textSecondary">
                      <b>S.</b>{seasonNum} <b>E.</b>{episodeNum}
                    </Typography>
      <Grid container justifyContent='center' style={{ padding: '20px' }}>
        <Grid item xs={12} sm={3} md={1}>
          {!loading &&
            <LoadingButton
              variant='contained'
              fullWidth
              onClick={() => loadFrames(((((Number(results[0].fid.split('-')[3])) + 1) / 9) - 1) - 500)}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Previous Frames'}
            </LoadingButton>
          }
        </Grid>
      </Grid>

      {loading ? (
        <CircularProgress />
      ) : (
        <Grid container spacing={2}>
          {memoizedResults && memoizedResults.map(result => (
            <Grid item xs={12} sm={12} md={12} key={result.fid}>
              <div style={{ display: 'flex', justifyContent: 'center'}}>
                <Card component="a" href={`/editor/${result.fid}`} style={{ display: 'flex', textDecoration: 'none', maxWidth: '1000px' }}>
                  <CardMedia
                    component="img"
                    alt={result.subtitle}
                    style={{ width: '50%', objectFit: 'cover' }}
                    image={`https://memesrc.com${result.frame_image}`}
                  />
                  <CardContent>
                    <Typography variant="body1" color="textPrimary" component="p">
                      "{result.subtitle || '(...)'}"
                    </Typography>
                  </CardContent>
                </Card>
                </div>
            </Grid>
          ))}
        </Grid>

      )}

      <Grid container justifyContent='center' style={{ padding: '20px' }}>
        <Grid item xs={12} sm={3} md={1}>
          {!loading &&
            <LoadingButton
              variant='contained'
              fullWidth
              onClick={() => loadFrames(((((Number(results[results.length - 1].fid.split('-')[3])) + 1) / 9) - 1))}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Next Frames'}
            </LoadingButton>
          }
        </Grid>
      </Grid>
    </>
  );
}
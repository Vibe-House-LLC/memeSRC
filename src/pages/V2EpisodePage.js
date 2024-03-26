// V2EpisodePage.js

import { Buffer } from "buffer";
import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { CircularProgress, Container, Typography, Card, CardMedia, CardContent, Button, Grid, useMediaQuery, Box } from '@mui/material';
import PropTypes from 'prop-types';
import { extractVideoFrames } from '../utils/videoFrameExtractor';
import { UserContext } from '../UserContext';
import getV2Metadata from '../utils/getV2Metadata';

V2EpisodePage.propTypes = {
  setSeriesTitle: PropTypes.func.isRequired,
};

const formatTimecode = (frameId, fps) => {
  const totalSeconds = Math.floor(frameId / fps);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function V2EpisodePage({ setSeriesTitle }) {
  const { user } = useContext(UserContext);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { cid, season, episode, frame } = useParams();
  const [confirmedCid, setConfirmedCid] = useState();
  const [subtitles, setSubtitles] = useState([]);
  const [lastPrev, setLastPrev] = useState(null);
  const [lastNext, setLastNext] = useState(null);
  const fps = 10; // Frames per second
  const isMd = useMediaQuery(theme => theme.breakpoints.up('md'));

  useEffect(() => {
    getV2Metadata(cid).then(metadata => {
      setConfirmedCid(metadata.id)
    }).catch(error => {
      console.log(error)
    })
  }, [cid]);

  useEffect(() => {
    if (confirmedCid) {
      const fetchSubtitles = async () => {
        const subtitlesUrl = `https://memesrc.com/v2/${confirmedCid}/${season}/${episode}/_docs.csv`;
        const subtitlesResponse = await fetch(subtitlesUrl);
        const subtitlesCsv = await subtitlesResponse.text();

        const parsedSubtitles = subtitlesCsv.split('\n').slice(1).map(line => {
          const parts = line.split(',');
          return {
            season: parts[0],
            episode: parts[1],
            subtitle_index: parseInt(parts[2], 10),
            subtitle_text: parts[3],
            start_frame: parseInt(parts[4], 10),
            end_frame: parseInt(parts[5], 10),
          };
        });

        setSubtitles(parsedSubtitles);
      };

      fetchSubtitles().catch(console.error);
    }
  }, [confirmedCid, season, episode]);

  useEffect(() => {
    if (confirmedCid && subtitles.length > 0) {
      const fetchFrames = async () => {
        setLoading(true);

        const frameIndexes = [];
        for (let i = 0; i < 60; i += 1) {
          frameIndexes.push(parseInt(frame, 10) + i * fps);
        }

        const frames = await extractVideoFrames(confirmedCid, season, episode, frameIndexes, fps, 0.4);

        const frameResults = frameIndexes.map((frameId, index) => {
          const frameUrl = frames[index];
          const subtitle = subtitles.find(sub => frameId >= sub.start_frame && frameId <= sub.end_frame);
          return {
            fid: frameId.toString(),
            frame_image: frameUrl,
            subtitle: subtitle ? subtitle.subtitle_text : null,
            timecode: formatTimecode(frameId, fps),
          };
        });

        setResults(frameResults);
        setLastPrev(frameResults[0].fid);
        setLastNext(frameResults[frameResults.length - 1].fid);
        setLoading(false);
      };

      fetchFrames().catch(console.error);
    }
  }, [confirmedCid, season, episode, frame, fps, subtitles]);

  const navigateFrames = async (direction) => {
    setLoadingMore(true);
  
    const currentFrame = direction === 'prev' ? lastPrev : lastNext;
    const newFrame = direction === 'prev'
      ? Math.max(parseInt(currentFrame, 10) - fps * 15, 0)
      : parseInt(currentFrame, 10) + fps;
  
    const frameIndexes = [];
    const numFrames = direction === 'prev' ? 15 : 60;
    for (let i = 0; i < numFrames; i += 1) {
      frameIndexes.push(newFrame + i * fps);
    }
  
    const frames = await extractVideoFrames(confirmedCid, season, episode, frameIndexes, fps, 0.4);
  
    const frameResults = frameIndexes.map((frameId, index) => {
      const frameUrl = frames[index];
      const subtitle = subtitles.find(sub => frameId >= sub.start_frame && frameId <= sub.end_frame);
      return {
        fid: frameId.toString(),
        frame_image: frameUrl,
        subtitle: subtitle ? subtitle.subtitle_text : null,
        timecode: formatTimecode(frameId, fps),
      };
    });
  
    setResults(prevResults => {
      const existingFids = new Set(prevResults.map(result => result.fid));
      const newResults = frameResults.filter(result => !existingFids.has(result.fid));
  
      if (direction === 'prev') {
        setLastPrev(newResults[0].fid);
        return [...newResults, ...prevResults];
      }
  
      setLastNext(newResults[newResults.length - 1].fid);
      return [...prevResults, ...newResults];
    });
  
    setLoadingMore(false);
  };

  return (
    <Container maxWidth="lg">
      <Typography gutterBottom variant="h4" component="div" align="center" style={{ marginTop: '20px', marginBottom: '20px' }}>
        {cid} <br /><span style={{ fontSize: '18px' }}>Season {season}, Episode {episode}</span>
      </Typography>
      <Box marginBottom="20px">
        <Button fullWidth disabled={loading || loadingMore} variant="contained" onClick={() => navigateFrames('prev')} sx={{ mb: 2 }}>
          {loadingMore ? 'Loading...' : 'Previous Frames'}
        </Button>
      </Box>
      {loading ? (
        <Box display="flex" justifyContent="center" marginTop="50px">
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={4}>
          {results.map((result) => (
            <Grid item xs={12} key={result.fid}>
              <Card component="a" href={`/frame/${cid}/${season}/${episode}/${result.fid}`} style={{ display: 'flex', textDecoration: 'none', alignItems: 'center', padding: '20px' }}>
                <CardMedia
                  component="img"
                  style={{ width: '30%', objectFit: 'contain', marginRight: '20px' }}
                  image={result.frame_image}
                  alt={`Frame ${result.fid}`}
                />
                <CardContent style={{ flex: 1 }}>
                  <Typography variant="h6" color="textPrimary" component="p">
                    {result.subtitle ? Buffer.from(result.subtitle, 'base64').toString() : '(...)'}
                  </Typography>
                  <Typography variant="subtitle1" color="textSecondary" component="p" style={{ marginTop: '10px' }}>
                    Timecode: {result.timecode}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      <Box marginTop="20px">
        <Button fullWidth disabled={loading || loadingMore} variant="contained" onClick={() => navigateFrames('next')}>
          {loadingMore ? 'Loading...' : 'Next Frames'}
        </Button>
      </Box>
    </Container>
  );
}
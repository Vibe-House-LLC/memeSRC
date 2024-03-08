import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CircularProgress, Container, Typography, Card, CardMedia, CardContent, Button, Grid, useMediaQuery } from '@mui/material';
import PropTypes from 'prop-types';
import { extractVideoFrames } from '../utils/videoFrameExtractor';
import { UserContext } from '../UserContext';
import getV2Metadata from '../utils/getV2Metadata';

V2EpisodePage.propTypes = {
  setSeriesTitle: PropTypes.func.isRequired,
};

export default function V2EpisodePage({ setSeriesTitle }) {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const { cid, season, episode, frame } = useParams();
  const [confirmedCid, setConfirmedCid] = useState();
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
      const fetchSubtitlesAndFrames = async () => {
        setLoading(true);

        const subtitlesUrl = `https://memesrc.com/v2/${confirmedCid}/${season}/${episode}/_docs.csv`;
        const subtitlesResponse = await fetch(subtitlesUrl);
        const subtitlesCsv = await subtitlesResponse.text();

        const subtitles = subtitlesCsv.split('\n').slice(1).map(line => {
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

        // Generate frame indexes to fetch based on fps stepping
        const frameIndexes = [];
        for (let i = 0; i < fps * 60; i += fps) {
          frameIndexes.push(parseInt(frame, 10) + i);
        }

        const frames = await extractVideoFrames(confirmedCid, season, episode, frameIndexes, fps, 0.4);

        const frameResults = frameIndexes.map((frameId, index) => {
          const frameUrl = frames[index];
          const subtitle = subtitles.find(sub => frameId >= sub.start_frame && frameId <= sub.end_frame);
          return {
            fid: frameId.toString(),
            frame_image: frameUrl,
            subtitle: subtitle ? subtitle.subtitle_text : null,
          };
        });
        console.log("frameResults", frameResults)

        setResults(frameResults);
        setLoading(false);
      };

      fetchSubtitlesAndFrames().catch(console.error);
    }
  }, [confirmedCid, season, episode, frame, fps]);

  const navigateFrames = (direction) => {
    const currentFrame = parseInt(frame, 10);
    const newFrame = direction === 'prev' ? Math.max(currentFrame - fps * 10, 0) : currentFrame + fps * 10;
    navigate(`/v2/episode/${cid}/${season}/${episode}/${newFrame}`);
  };

  return (
    <Container maxWidth="lg">
      <Typography gutterBottom fontSize={isMd ? 24 : 15} component="div" style={{ marginTop: '20px' }}>
        {cid} <br /><span style={{ fontSize: isMd ? 20 : 14 }}>Season {season}, Episode {episode}</span>
      </Typography>
      {parseInt(frame, 10) !== 0 && (
        <Button disabled={loading} fullWidth={!isMd} variant="contained" onClick={() => navigateFrames('prev')} sx={{ mb: 4 }} style={{ marginTop: '20px' }}>
          Previous Frames
        </Button>
      )}
      {loading ? (
        <center>
          <CircularProgress />
        </center>
      ) : (
        <Container maxWidth="md">
          <Grid container spacing={2} alignContent="stretch">
            {results.map((result) => (
              <Grid item xs={12} key={result.fid}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Card component="a" href={`/v2/frame/${cid}/${season}/${episode}/${result.fid}`} style={{ display: 'flex', textDecoration: 'none', width: '100%' }}>
                    <CardMedia
                      component="img"
                      style={{ width: '50%', objectFit: 'contain' }}
                      image={result.frame_image}
                      alt={`Frame ${result.fid}`}
                    />
                    <CardContent sx={{ alignSelf: 'center' }}>
                      <Typography variant="body1" color="textPrimary" component="p">
                        {result.subtitle ? atob(result.subtitle) : 'No subtitle'}
                      </Typography>
                    </CardContent>
                  </Card>
                </div>
              </Grid>
            ))}
          </Grid>
        </Container>
      )}
      <br />
      <Button disabled={loading} fullWidth={!isMd} variant="contained" onClick={() => navigateFrames('next')} sx={{ mt: 2 }} style={{ marginBottom: '20px' }}>
        Next Frames
      </Button>
    </Container>
  );
}

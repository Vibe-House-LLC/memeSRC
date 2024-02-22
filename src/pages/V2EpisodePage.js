import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CircularProgress, Container, Grid, Typography, Card, CardMedia, CardContent, Button } from '@mui/material';
import PropTypes from 'prop-types';
import { extractVideoFrames } from '../utils/videoFrameExtractor'; // Ensure this import path matches your project structure
import { UserContext } from '../UserContext';

// Define prop types for the component
V2EpisodePage.propTypes = {
  setSeriesTitle: PropTypes.func,
};

// The main component
export default function V2EpisodePage({ setSeriesTitle }) {
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const { cid, season, episode, frame } = useParams();
  const fps = 10; // Frames per second

  useEffect(() => {
    const fetchSubtitlesAndFrames = async () => {
      setLoading(true);
      
      const subtitlesUrl = `https://ipfs.memesrc.com/ipfs/${cid}/${season}/${episode}/_docs.csv`;
      const subtitlesResponse = await fetch(subtitlesUrl);
      const subtitlesCsv = await subtitlesResponse.text();
      
      const subtitles = subtitlesCsv.split('\n').slice(1).map(line => {
        const parts = line.split(',');
        return {
          season: parts[0],
          episode: parts[1],
          subtitle_index: parseInt(parts[2], 10),
          subtitle_text: parts[3], // Assuming Base64 encoded
          start_frame: parseInt(parts[4], 10),
          end_frame: parseInt(parts[5], 10),
        };
      });

      const startFrame = parseInt(frame, 10);
      const endFrame = startFrame + (fps * 10) - 1; // Fetching 100 frames for 10 seconds

      const frames = await extractVideoFrames(cid, season, episode, startFrame, endFrame, fps);

      // Select one frame per second to display
      const selectedFrames = frames.filter((_, index) => index % fps === 0);

      const frameResults = selectedFrames.map((frameUrl, index) => {
        const frameId = startFrame + (index * fps);
        const subtitle = subtitles.find(sub => frameId >= sub.start_frame && frameId <= sub.end_frame);
        return {
          fid: frameId.toString(),
          frame_image: frameUrl,
          subtitle: subtitle ? subtitle.subtitle_text : null,
        };
      });

      setResults(frameResults);
      setLoading(false);
    };

    fetchSubtitlesAndFrames().catch(console.error);
  }, [cid, season, episode, frame, fps]);

  const navigateFrames = (direction) => {
    const currentFrame = parseInt(frame, 10);
    // Navigate in 100-frame increments to move 10 seconds
    const newFrame = direction === 'prev' ? Math.max(currentFrame - 100, 0) : currentFrame + 100;
    navigate(`/v2/episode/${cid}/${season}/${episode}/${newFrame}`);
  };

  return (
    <Container maxWidth="lg">
      <Typography gutterBottom variant="h3" component="div">
        {cid} <span>Season {season}, Episode {episode}</span>
      </Typography>
      <Grid container spacing={2} justifyContent="center" style={{ marginBottom: '20px' }}>
        <Button variant="contained" onClick={() => navigateFrames('prev')} disabled={parseInt(frame, 10) === 0}>
          Previous 10 Seconds
        </Button>
        <Button variant="contained" onClick={() => navigateFrames('next')} style={{ marginLeft: '20px' }}>
          Next 10 Seconds
        </Button>
      </Grid>
      {loading ? (
        <CircularProgress />
      ) : (
        <Grid container spacing={2}>
          {results.map((result, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card>
                <CardMedia
                  component="img"
                  height="140"
                  image={result.frame_image}
                  alt={`Frame ${result.fid}`}
                />
                <CardContent>
                  <Typography variant="body2" color="textSecondary">
                    {result.subtitle ? atob(result.subtitle) : 'No subtitle'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}

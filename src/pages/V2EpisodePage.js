import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CircularProgress, Container, Typography, Card, CardMedia, CardContent, Button } from '@mui/material';
import PropTypes from 'prop-types';
import { extractVideoFrames } from '../utils/videoFrameExtractor';
import { UserContext } from '../UserContext';

V2EpisodePage.propTypes = {
  setSeriesTitle: PropTypes.func,
};

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
          subtitle_text: parts[3],
          start_frame: parseInt(parts[4], 10),
          end_frame: parseInt(parts[5], 10),
        };
      });

      const startFrame = parseInt(frame, 10);
      const endFrame = startFrame + (fps * 100) - 1; // Fetching frames for 100 seconds

      const frames = await extractVideoFrames(cid, season, episode, startFrame, endFrame, fps);

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
    const newFrame = direction === 'prev' ? Math.max(currentFrame - (fps * 100), 0) : currentFrame + (fps * 100);
    navigate(`/v2/episode/${cid}/${season}/${episode}/${newFrame}`);
  };

  return (
    <Container maxWidth="lg">
      {parseInt(frame, 10) !== 0 && (
        <Button variant="contained" onClick={() => navigateFrames('prev')} style={{ marginTop: '20px' }}>
          Previous 100 Seconds
        </Button>
      )}
      <Typography gutterBottom variant="h3" component="div" style={{ marginTop: '20px' }}>
        {cid} <span>Season {season}, Episode {episode}</span>
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : (
        <div style={{ display: 'flex', overflowX: 'scroll', marginBottom: '20px' }}>
          {results.map((result, index) => (
            <Card key={index} style={{ minWidth: '300px', marginRight: '20px' }}>
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
          ))}
        </div>
      )}
      <Button variant="contained" onClick={() => navigateFrames('next')} style={{ marginBottom: '20px' }}>
        Next 100 Seconds
      </Button>
    </Container>
  );
}

// V2EpisodePage.js

import { Buffer } from "buffer";
import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Link as RouterLink, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Typography, Card, CardMedia, CardContent, Button, Grid, Box, Skeleton } from "@mui/material";
import { Storage } from "aws-amplify";
import sanitizeHtml from 'sanitize-html';
import { extractVideoFrames } from '../utils/videoFrameExtractor';
import { UserContext } from '../UserContext';
import getV2Metadata from '../utils/getV2Metadata';

import EpisodePageBannerAd from '../ads/SearchPageBannerAd';
import EpisodePageResultsAd from '../ads/SearchPageResultsAd';


const formatTimecode = (frameId, fps) => {
  const totalSeconds = Math.floor(frameId / fps);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function V2EpisodePage() {
  const { user } = useContext(UserContext);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { cid, season, episode, frame } = useParams();
  const [searchParams] = useSearchParams();
  const urlSearchTerm = searchParams.get('searchTerm');
  const [confirmedCid, setConfirmedCid] = useState();
  const [subtitles, setSubtitles] = useState([]);
  const [lastPrev, setLastPrev] = useState(null);
  const [lastNext, setLastNext] = useState(null);
  const firstFrame = 1;
  const [lastFrame, setLastFrame] = useState(null);
  const [imagesLoaded, setImagesLoaded] = useState({});
  const fps = 10; // Frames per second
  const navigate = useNavigate();

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
        // const subtitlesUrl = `https://img.memesrc.com/v2/${confirmedCid}/${season}/${episode}/_docs.csv`;
        // const subtitlesResponse = await fetch(subtitlesUrl);
        // const subtitlesCsv = await subtitlesResponse.text();

        const subtitlesDownload = (await Storage.get(`src/${confirmedCid}/${season}/${episode}/_docs.csv`, { level: 'public', download: true, customPrefix: { public: 'protected/' } })).Body
        const subtitlesCsv = await subtitlesDownload.text();

        const parsedSubtitles = subtitlesCsv.split('\n').slice(1).map(line => {
          const parts = line.split(',');
          const subtitleText = parts[3] || '';
          let decodedSubtitle = '';
          let sanitizedSubtitle = '';

          try {
            decodedSubtitle = Buffer.from(subtitleText, 'base64').toString();
            sanitizedSubtitle = sanitizeHtml(decodedSubtitle, {
              allowedTags: [],
              allowedAttributes: {},
            });
          } catch (error) {
            console.error('Error decoding subtitle:', error);
          }

          return {
            season: parts[0],
            episode: parts[1],
            subtitle_index: parseInt(parts[2], 10),
            subtitle_text: sanitizedSubtitle,
            start_frame: parseInt(parts[4], 10),
            end_frame: parseInt(parts[5], 10),
          };
        });

        if (parsedSubtitles.length > 0) {
          const lastSubtitle = parsedSubtitles[parsedSubtitles.length - 5];
          const lastFrameIndex = lastSubtitle.end_frame - 30;
          setLastFrame(lastFrameIndex);
        }

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

  const buildEpisodeLink = useCallback((targetFrame) => {
    const base = `/episode/${cid}/${season}/${episode}/${targetFrame}`;
    return urlSearchTerm ? `${base}?searchTerm=${encodeURIComponent(urlSearchTerm)}` : base;
  }, [cid, season, episode, urlSearchTerm]);

  const buildFrameLink = useCallback((fid) => {
    const base = `/frame/${cid}/${season}/${episode}/${fid}`;
    return urlSearchTerm ? `${base}?searchTerm=${encodeURIComponent(urlSearchTerm)}` : base;
  }, [cid, season, episode, urlSearchTerm]);

  const skipToStart = () => {
    navigate(buildEpisodeLink(1));
  };

  const skipToEnd = () => {
    if (subtitles.length > 0) {
      const lastSubtitle = subtitles[subtitles.length - 5];
      const lastFrameIndex = lastSubtitle.end_frame - 30;
      navigate(buildEpisodeLink(lastFrameIndex));
      window.scrollTo(0, 0);
    }
  };

  const injectAds = (results, adInterval) => {
    // Skip ad injection for active subscribers
    if (user?.userDetails?.subscriptionStatus === 'active') {
      return results;
    }

    const injectedResults = [];
    for (let i = 0; i < results.length; i += 1) {
      injectedResults.push(results[i]);

      if ((i + 1) % adInterval === 0 && i !== results.length - 1) {
        injectedResults.push({ isAd: true });
      }
    }

    return injectedResults;
  };

  const adInterval = 9;
  const resultsWithAds = injectAds(results, adInterval);

  const handleImageLoad = (fid) => {
    setImagesLoaded(prevState => ({ ...prevState, [fid]: true }));
  };

  return (
    <Container maxWidth="lg" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
      <Typography
        gutterBottom
        variant="h4"
        component="div"
        align="center"
        style={{ marginBottom: '20px', fontFamily: 'Arial, sans-serif', color: '#333' }}
      >
        {cid} <br />
        <span style={{ fontSize: '18px' }}>Season {season}, Episode {episode}</span>
      </Typography>
      <Box marginBottom="20px">
        {parseInt(frame, 10) > firstFrame && (
          <Button
            fullWidth
            disabled={loading || loadingMore}
            variant="contained"
            onClick={skipToStart}
            style={{ marginBottom: '16px', backgroundColor: '#1976d2', color: 'white', padding: '12px' }}
          >
            Skip to Start
          </Button>
        )}
        <Button
          fullWidth
          disabled={loading || loadingMore}
          variant="contained"
          onClick={() => navigateFrames('prev')}
          style={{ marginBottom: '16px', backgroundColor: '#1976d2', color: 'white', padding: '12px' }}
        >
          {loadingMore ? 'Loading...' : 'Previous Frames'}
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" marginTop="50px">
          <Skeleton variant="circular" width={40} height={40} />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {resultsWithAds.map((result, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              {result.isAd ? (
                <Card>
                  <EpisodePageResultsAd />
                </Card>
              ) : (
                <Card component={RouterLink} to={buildFrameLink(result.fid)} style={{ textDecoration: 'none' }}>
                  <Box sx={{ position: 'relative', paddingTop: '56.25%', backgroundColor: '#1f1f1f' }}>
                    <CardMedia
                      component="img"
                      image={result.frame_image}
                      alt={`Frame ${result.fid}`}
                      onLoad={() => handleImageLoad(result.fid)}
                      onError={() => {
                        console.error(`Failed to load image for frame ${result.fid}`);
                        handleImageLoad(result.fid);
                      }}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: imagesLoaded[result.fid] ? 'block' : 'none',
                      }}
                    />
                    {!imagesLoaded[result.fid] && (
                      <Skeleton
                        variant="rectangular"
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                        }}
                      />
                    )}
                  </Box>
                  <CardContent sx={{ backgroundColor: '#1f1f1f', padding: '16px' }}>
                    <Typography variant="subtitle1" color="textPrimary" style={{ marginBottom: '8px', minHeight: '3em' }}>
                      {result.subtitle || '(...)'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Timecode: {result.timecode}
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Grid>
          ))}
        </Grid>
      )}

        <Box marginTop="20px">
          {user?.userDetails?.subscriptionStatus !== 'active' && (
            <EpisodePageBannerAd />
          )}
        </Box>

      <Box marginTop="20px">
        <Button
          fullWidth
          disabled={loading || loadingMore}
          variant="contained"
          onClick={() => navigateFrames('next')}
          style={{ backgroundColor: '#1976d2', color: 'white', padding: '12px' }}
        >
          {loadingMore ? 'Loading...' : 'Next Frames'}
        </Button>
        {parseInt(frame, 10) < lastFrame && (
          <Button
            fullWidth
            disabled={loading || loadingMore}
            variant="contained"
            onClick={skipToEnd}
            style={{ marginTop: '16px', backgroundColor: '#1976d2', color: 'white', padding: '12px' }}
          >
            Skip to End
          </Button>
        )}
      </Box>
    </Container>
  );
}

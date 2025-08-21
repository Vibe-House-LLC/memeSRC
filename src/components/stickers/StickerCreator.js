import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { API, graphqlOperation } from 'aws-amplify';
import { Box } from '@mui/system';
import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

// Reusable sticker creator that invokes backend sticker generation and returns selected image via onSelect
export default function StickerCreator({ onSelect, initialStyle = 'realistic', buttonLabel = 'Generate Sticker' }) {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState(initialStyle);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicResultId, setMagicResultId] = useState('');
  const [images, setImages] = useState([]);
  const [selected, setSelected] = useState('');

  const STYLE_OPTIONS = useMemo(
    () => [
      { value: 'realistic', label: 'Realistic' },
      { value: 'cartoon', label: 'Cartoon' },
      { value: '3d', label: '3D' },
      { value: 'pixel art', label: 'Pixel Art' },
      { value: 'line art', label: 'Line Art' },
      { value: 'watercolor', label: 'Watercolor' },
      { value: 'comic', label: 'Comic' },
      { value: 'clay', label: 'Clay' },
    ],
    []
  );

  const QUERY_INTERVAL = 1000;
  const TIMEOUT = 60 * 1000;

  const checkMagicResult = useCallback(async (id) => {
    try {
      const result = await API.graphql(
        graphqlOperation(
          `query GetMagicResult { getMagicResult(id: "${id}") { results } }`
        )
      );
      return result.data.getMagicResult?.results;
    } catch (err) {
      console.error('Error fetching magic result:', err);
      return null;
    }
  }, []);

  const handleGenerate = async () => {
    setError('');
    setImages([]);
    setSelected('');
    if (!prompt || !prompt.trim()) {
      setError('Please enter a subject to generate a sticker.');
      return;
    }
    setLoading(true);
    try {
      const response = await API.post('publicapi', '/inpaint', {
        body: {
          prompt: prompt.trim(),
          mode: 'sticker',
          style,
        },
      });
      const { magicResultId: id } = response || {};
      if (!id) {
        throw new Error('Failed to start sticker job');
      }
      setMagicResultId(id);

      const startTime = Date.now();
      const poll = setInterval(async () => {
        const results = await checkMagicResult(id);
        if (results || Date.now() - startTime >= TIMEOUT) {
          clearInterval(poll);
          setLoading(false);
          if (results) {
            try {
              const urls = JSON.parse(results);
              setImages(urls);
            } catch (e) {
              setError('Unexpected response format.');
            }
          } else {
            setError('The request timed out. Please try again.');
          }
        }
      }, QUERY_INTERVAL);
    } catch (err) {
      setLoading(false);
      const insufficient = err?.response?.data?.error?.name === 'InsufficientCredits';
      if (insufficient) {
        setError('Insufficient credits.');
      } else {
        setError('Failed to generate sticker.');
      }
      console.error(err);
    }
  };

  useEffect(() => {
    if (!selected || !onSelect) return;
    onSelect(selected, { images, magicResultId });
  }, [selected]);

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">Create a Sticker</Typography>
          <TextField
            label="Describe the sticker"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., red apple, neon outline"
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel id="style-label">Style</InputLabel>
            <Select
              labelId="style-label"
              label="Style"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
            >
              {STYLE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </CardContent>
      <CardActions>
        <Button variant="contained" onClick={handleGenerate} disabled={loading}>
          {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : buttonLabel}
        </Button>
      </CardActions>

      {images.length > 0 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>Results</Typography>
          <Grid container spacing={1}>
            {images.map((url, idx) => (
              <Grid item xs={6} sm={4} md={3} key={`sticker-${idx}`}>
                <Card
                  onClick={() => setSelected(url)}
                  sx={{ cursor: 'pointer', border: selected === url ? '2px solid limegreen' : '1px solid #444' }}
                >
                  <Box component="img" src={url} alt="sticker" loading="lazy" sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'contain', background: '#111' }} />
                  <CardActions>
                    <Button fullWidth size="small" variant="contained" onClick={() => setSelected(url)}>Use sticker</Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Card>
  );
}



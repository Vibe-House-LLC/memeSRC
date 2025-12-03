import React, { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { UserContext } from '../UserContext';

type FormState = {
  cid: string;
  season: string;
  episode: string;
  fps: string;
  startFrame: string;
};

const defaultState: FormState = {
  cid: '',
  season: '',
  episode: '',
  fps: '10',
  startFrame: '1',
};

export default function AdminEpisodeCollageLauncher() {
  const { user } = useContext(UserContext);
  const isAdmin = Boolean(user?.['cognito:groups']?.includes('admins'));
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(defaultState);

  const isFormValid = useMemo(() => {
    return Boolean(form.cid.trim() && form.season.trim() && form.episode.trim());
  }, [form.cid, form.season, form.episode]);

  const handleChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleLaunch = () => {
    const cid = form.cid.trim();
    const season = form.season.trim();
    const episode = form.episode.trim();
    const fps = parseFloat(form.fps);
    const startFrame = parseInt(form.startFrame, 10);

    if (!cid || !season || !episode) return;

    const searchParams = new URLSearchParams();
    if (Number.isFinite(fps) && fps > 0) searchParams.set('fps', String(fps));
    if (Number.isFinite(startFrame) && startFrame > 0) searchParams.set('startFrame', String(startFrame));

    const queryString = searchParams.toString();
    const target = queryString
      ? `/episode-collage/${cid}/${season}/${episode}?${queryString}`
      : `/episode-collage/${cid}/${season}/${episode}`;

    navigate(target);
  };

  if (!isAdmin) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="warning">Admin access required.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Episode Collage Builder
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Enter a CID, season, and episode to generate 6-panel (2x3) collages spaced 5 seconds apart. FPS and start frame
        can be customized.
      </Typography>

      <Paper sx={{ p: 3, mt: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField label="CID" value={form.cid} onChange={handleChange('cid')} fullWidth required />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField label="Season" value={form.season} onChange={handleChange('season')} fullWidth required />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField label="Episode" value={form.episode} onChange={handleChange('episode')} fullWidth required />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField label="FPS" value={form.fps} onChange={handleChange('fps')} fullWidth />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              label="Start Frame"
              value={form.startFrame}
              onChange={handleChange('startFrame')}
              fullWidth
            />
          </Grid>
        </Grid>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mt={3} alignItems={{ sm: 'center' }}>
          <Button variant="contained" disabled={!isFormValid} onClick={handleLaunch}>
            Launch collage generator
          </Button>
          <Button variant="text" onClick={() => setForm(defaultState)}>
            Reset
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}

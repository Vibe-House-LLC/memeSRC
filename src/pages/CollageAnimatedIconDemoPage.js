import React, { useState } from 'react';
import { Box, Stack, Typography, Paper, Button } from '@mui/material';
import CollageAnimatedIcon from '../components/animated/CollageAnimatedIcon';

export default function CollageAnimatedIconDemoPage(){
  const [paused, setPaused] = useState(false);

  return (
    <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ p: 4, maxWidth: 800, width: '100%' }}>
        <Stack spacing={3} alignItems="center">
          <Typography variant="h4" align="center">
            Collage Animated Icon Demo
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center">
            A compact animated collage icon you can reuse across the site.
          </Typography>

          <Stack direction="row" spacing={4} alignItems="center" justifyContent="center">
            <Stack spacing={1} alignItems="center">
              <CollageAnimatedIcon size={48} paused={paused} />
              <Typography variant="caption">48px</Typography>
            </Stack>
            <Stack spacing={1} alignItems="center">
              <CollageAnimatedIcon size={64} paused={paused} />
              <Typography variant="caption">64px</Typography>
            </Stack>
            <Stack spacing={1} alignItems="center">
              <CollageAnimatedIcon size={88} paused={paused} />
              <Typography variant="caption">88px</Typography>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={() => setPaused(p => !p)}>
              {paused ? 'Resume' : 'Pause'}
            </Button>
          </Stack>

          <Typography variant="body2" color="text.secondary" align="center">
            Respects system reduced motion settings and pauses when the tab is hidden.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}



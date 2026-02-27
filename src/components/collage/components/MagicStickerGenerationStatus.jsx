import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, LinearProgress, Typography } from '@mui/material';

const TYPICAL_MIN_SECONDS = 15;
const TYPICAL_MAX_SECONDS = 20;
const TARGET_PROGRESS_SECONDS = 18;
const MAX_PROGRESS_PERCENT = 95;

const getProgressPercent = (elapsedMs) => {
  const progress = (elapsedMs / (TARGET_PROGRESS_SECONDS * 1000)) * MAX_PROGRESS_PERCENT;
  return Math.max(0, Math.min(MAX_PROGRESS_PERCENT, progress));
};

const getStatusText = (elapsedSeconds) => {
  if (elapsedSeconds < 8) return 'Preparing your sticker...';
  if (elapsedSeconds < 16) return 'Generating and removing the background...';
  return 'Finishing up...';
};

export default function MagicStickerGenerationStatus({ active = false, sx }) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!active) {
      setElapsedMs(0);
      return undefined;
    }

    const startedAt = Date.now();
    setElapsedMs(0);
    const intervalId = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [active]);

  if (!active) return null;

  const elapsedSeconds = Math.floor(elapsedMs / 1000);

  return (
    <Box sx={{ mt: 1.5, ...(sx || {}) }}>
      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.75 }}>
        {getStatusText(elapsedSeconds)}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={getProgressPercent(elapsedMs)}
        sx={{
          height: 8,
          borderRadius: 999,
        }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
        Usually takes about {TYPICAL_MIN_SECONDS}-{TYPICAL_MAX_SECONDS} seconds. Elapsed: {elapsedSeconds}s.
      </Typography>
    </Box>
  );
}

MagicStickerGenerationStatus.propTypes = {
  active: PropTypes.bool,
  sx: PropTypes.object,
};

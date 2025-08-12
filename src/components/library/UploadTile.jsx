import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { Box, Stack, Typography } from '@mui/material';
import { Add } from '@mui/icons-material';

export default function UploadTile({ onFiles, disabled }) {
  const inputRef = useRef(null);
  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label="Upload image to library"
      onClick={() => !disabled && inputRef.current?.click()}
      sx={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px dashed', borderColor: 'rgba(255,255,255,0.2)', bgcolor: 'rgba(255,255,255,0.02)', cursor: disabled ? 'default' : 'pointer',
        borderRadius: 1,
        transition: 'all 0.2s ease-in-out',
        '&:hover': { borderColor: disabled ? 'rgba(255,255,255,0.2)' : '#8b5cc7', bgcolor: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(139,92,199,0.12)' }
      }}
    >
      <Stack spacing={0.5} alignItems="center" justifyContent="center">
        <Add sx={{ color: 'rgba(255,255,255,0.8)' }} />
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
          Upload
        </Typography>
      </Stack>
      <input type="file" accept="image/*" multiple ref={inputRef} onChange={(e) => {
        const files = Array.from(e.target.files || []);
        if (files.length) onFiles(files);
        if (e.target) e.target.value = null;
      }} style={{ display: 'none' }} />
    </Box>
  );
}

UploadTile.propTypes = {
  onFiles: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};
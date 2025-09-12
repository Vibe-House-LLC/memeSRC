import React, { useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';

export default function UploadSection({ onFiles, disabled }) {
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFiles = useCallback((fileList) => {
    const files = Array.from(fileList || []);
    if (files.length && typeof onFiles === 'function') onFiles(files);
  }, [onFiles]);

  return (
    <Box
      sx={{
        width: '100%',
        p: { xs: 2.5, sm: 3 },
        borderRadius: 2,
        border: '2px dashed',
        borderColor: isDragOver ? '#8b5cc7' : 'rgba(255,255,255,0.25)',
        bgcolor: isDragOver ? 'rgba(139,92,199,0.08)' : 'rgba(255,255,255,0.02)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 1,
        minHeight: { xs: 120, sm: 140 },
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.15s ease-in-out',
        '&:hover': {
          borderColor: disabled ? 'rgba(255,255,255,0.25)' : '#8b5cc7',
          bgcolor: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(139,92,199,0.06)'
        }
      }}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (disabled) return;
        handleFiles(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
      aria-label="Upload images to your library"
      onClick={() => { if (!disabled) inputRef.current?.click(); }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <UploadIcon sx={{ opacity: 0.8 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
        Upload images
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.72 }}>
        Drag & drop, or click to select files
      </Typography>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          handleFiles(e.target.files);
          if (e.target) e.target.value = null;
        }}
        style={{ display: 'none' }}
      />
    </Box>
  );
}

UploadSection.propTypes = {
  onFiles: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

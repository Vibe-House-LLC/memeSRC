import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
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
        border: '1px dashed', borderColor: 'divider', bgcolor: 'background.paper', cursor: disabled ? 'default' : 'pointer',
        '&:hover': { borderColor: disabled ? 'divider' : 'primary.main', bgcolor: disabled ? 'background.paper' : 'action.hover' }
      }}
    >
      <Add sx={{ color: 'text.secondary' }} />
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
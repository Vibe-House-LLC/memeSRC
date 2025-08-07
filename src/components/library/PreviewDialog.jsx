import React from 'react';
import PropTypes from 'prop-types';
import { Box, Dialog, IconButton, Typography, useMediaQuery } from '@mui/material';
import { Delete } from '@mui/icons-material';

export default function PreviewDialog({ open, onClose, imageUrl, onDelete, titleId }) {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby={titleId} maxWidth={false} fullScreen={isMobile} fullWidth={!isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3, maxWidth: isMobile ? '100%' : '90vw', maxHeight: isMobile ? '100%' : '90vh', margin: isMobile ? 0 : 2, bgcolor: '#0f0f10' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: isMobile ? 2 : 3, borderBottom: '1px solid', borderColor: 'rgba(255,255,255,0.12)', position: 'sticky', top: 0, zIndex: 1, bgcolor: '#0f0f10' }}>
        <Typography id={titleId} variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Image Preview</Typography>
        {onDelete && (
          <IconButton onClick={onDelete} aria-label="Delete image" sx={{ color: '#ff5252', bgcolor: 'rgba(255,82,82,0.1)', '&:hover': { bgcolor: 'rgba(255,82,82,0.2)' } }}>
            <Delete />
          </IconButton>
        )}
      </Box>
      <Box sx={{ p: isMobile ? 1.5 : 3, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#111214' }}>
        {imageUrl && (<img src={imageUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: isMobile ? 'calc(100vh - 160px)' : 'calc(90vh - 160px)', objectFit: 'contain', borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} />)}
      </Box>
    </Dialog>
  );
}

PreviewDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  imageUrl: PropTypes.string,
  onDelete: PropTypes.func,
  titleId: PropTypes.string,
};
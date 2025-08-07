import React from 'react';
import PropTypes from 'prop-types';
import { Box, Dialog, IconButton, Typography, useMediaQuery } from '@mui/material';
import { Delete } from '@mui/icons-material';

export default function PreviewDialog({ open, onClose, imageUrl, onDelete, titleId }) {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby={titleId} maxWidth={false} fullScreen={isMobile} fullWidth={!isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3, maxWidth: isMobile ? '100%' : '90vw', maxHeight: isMobile ? '100%' : '90vh', margin: isMobile ? 0 : 2 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: isMobile ? 2 : 3, borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, zIndex: 1 }}>
        <Typography id={titleId} variant={isMobile ? 'h6' : 'h5'}>Image Preview</Typography>
        <IconButton onClick={onDelete} aria-label="Delete image" color="error"><Delete /></IconButton>
      </Box>
      <Box sx={{ p: isMobile ? 1.5 : 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {imageUrl && (<img src={imageUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />)}
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
import React from 'react';
import PropTypes from 'prop-types';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function ExportDialog({ open, onClose, finalImage }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2 }}>
        Collage Preview
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {finalImage ? (
          <img 
            src={finalImage} 
            alt="Final Collage Preview" 
            style={{ width: '100%', height: 'auto', display: 'block' }} 
          />
        ) : (
          <p>No image generated yet.</p> // Or some loading indicator
        )}
      </DialogContent>
    </Dialog>
  );
}

ExportDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  finalImage: PropTypes.string, // Base64 Data URL
};

ExportDialog.defaultProps = {
  finalImage: null,
}; 
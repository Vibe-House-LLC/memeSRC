import React from 'react';
import PropTypes from 'prop-types';
import { Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import ImageLibrary from './ImageLibrary';

export default function ImageLibraryDialog({ open, onClose, onSelect, refreshTrigger }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Image Library
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <ImageLibrary onSelect={onSelect} refreshTrigger={refreshTrigger} />
      </DialogContent>
    </Dialog>
  );
}

ImageLibraryDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func,
  refreshTrigger: PropTypes.any,
};

ImageLibraryDialog.defaultProps = {
  onSelect: null,
  refreshTrigger: null,
};

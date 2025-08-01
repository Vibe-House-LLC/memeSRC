import React from 'react';
import PropTypes from 'prop-types';
import { Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import MyLibrary from './MyLibrary';

export default function MyLibraryDialog({ open, onClose, onSelect, refreshTrigger }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        My Library
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <MyLibrary onSelect={onSelect} refreshTrigger={refreshTrigger} />
      </DialogContent>
    </Dialog>
  );
}

MyLibraryDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func,
  refreshTrigger: PropTypes.any,
};

MyLibraryDialog.defaultProps = {
  onSelect: null,
  refreshTrigger: null,
};

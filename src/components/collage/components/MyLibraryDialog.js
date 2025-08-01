import React from 'react';
import PropTypes from 'prop-types';
import { Dialog, DialogContent, DialogTitle, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MyLibrary from './MyLibrary';

const MyLibraryDialog = ({ open, onClose, onSelect, refreshTrigger }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={isMobile}
    >
      <DialogTitle>My Library</DialogTitle>
      <DialogContent dividers>
        <MyLibrary
          onSelect={(images) => {
            if (onSelect) onSelect(images);
            onClose();
          }}
          refreshTrigger={refreshTrigger}
        />
      </DialogContent>
    </Dialog>
  );
};

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

export default MyLibraryDialog;

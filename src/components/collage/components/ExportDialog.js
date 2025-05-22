import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import CollageResultView from './CollageResultView';

export default function ExportDialog({ open, onClose, finalImage }) {
  const theme = useTheme();

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
          margin: 2,
        }
      }}
    >
      {/* Header */}
      <DialogTitle 
        sx={{ 
          m: 0, 
          p: 3,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}20)`,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h5" component="h2" fontWeight="bold">
              Collage Preview
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Your collage is ready to download and share
            </Typography>
          </Box>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              color: theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ p: 3 }}>
        <CollageResultView 
          finalImage={finalImage}
          onBackToEdit={onClose}
          showBackButton={true}
          layout="horizontal"
        />
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
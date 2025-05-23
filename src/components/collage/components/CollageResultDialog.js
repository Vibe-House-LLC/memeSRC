/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Backdrop,
  Fade,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';

export default function CollageResultDialog({ open, onClose, finalImage }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Touch/swipe state for gesture handling
  const [touchStart, setTouchStart] = useState({ y: 0, time: 0 });
  const [touchEnd, setTouchEnd] = useState({ y: 0, time: 0 });

  // Show snackbar message
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Close snackbar
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Handle backdrop/outside click - close dialog
  const handleBackdropClick = () => {
    onClose();
  };

  // Handle touch start for swipe detection
  const handleTouchStart = (e) => {
    setTouchStart({
      y: e.touches[0].clientY,
      time: Date.now()
    });
  };

  // Handle touch move for swipe detection
  const handleTouchMove = (e) => {
    setTouchEnd({
      y: e.touches[0].clientY,
      time: Date.now()
    });
  };

  // Handle touch end - check for swipe gesture
  const handleTouchEnd = () => {
    if (!touchStart.y || !touchEnd.y) return;

    const distance = touchStart.y - touchEnd.y;
    const timeDiff = touchEnd.time - touchStart.time;
    const velocity = Math.abs(distance) / timeDiff;

    // Check if it's a swipe (minimum distance and velocity)
    const minSwipeDistance = 50;
    const minSwipeVelocity = 0.3;

    if (Math.abs(distance) > minSwipeDistance && velocity > minSwipeVelocity) {
      // It's a swipe up or down
      onClose();
    }

    // Reset touch state
    setTouchStart({ y: 0, time: 0 });
    setTouchEnd({ y: 0, time: 0 });
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        fullScreen={isMobile}
        TransitionComponent={Fade}
        transitionDuration={300}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 3,
            bgcolor: 'transparent',
            boxShadow: 'none',
            overflow: 'hidden',
            maxHeight: isMobile ? '100vh' : '95vh',
            maxWidth: isMobile ? '100%' : '90vw',
            margin: isMobile ? 0 : 2,
          }
        }}
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 300,
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)', // Safari support
          }
        }}
        onClick={handleBackdropClick}
      >
        <DialogContent 
          sx={{ 
            p: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
          onClick={handleBackdropClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close Button */}
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: isMobile ? 16 : 24,
              right: isMobile ? 16 : 24,
              zIndex: 1000,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.2s ease-in-out',
              width: 44,
              height: 44,
            }}
          >
            <CloseIcon />
          </IconButton>

          {/* Main Content Container */}
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              p: isMobile ? 2 : 4,
              position: 'relative',
            }}
          >
            {/* Image Container */}
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                maxWidth: '100%',
                height: isMobile 
                  ? 'calc(100vh - 150px)' 
                  : 'calc(95vh - 150px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                backgroundColor: 'transparent',
                cursor: 'default',
              }}
              onClick={handleBackdropClick} // Allow clicking container area to close dialog
              aria-label="Image container - tap outside image to close"
            >
              {finalImage && (
                <img
                  src={finalImage}
                  alt="Generated Collage"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    display: 'block',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    pointerEvents: 'auto',
                    outline: 'none',
                    objectFit: 'contain',
                  }}
                  onClick={(e) => e.stopPropagation()} // Only stop propagation on the image itself
                  onContextMenu={(e) => {
                    // Allow right-click/long-press context menu for saving
                    e.stopPropagation();
                  }}
                />
              )}
            </Box>

            {/* Instructions */}
            <Box
              sx={{
                mt: 2,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                px: 3,
                py: 1.5,
                borderRadius: 2,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center',
                maxWidth: '90%',
              }}
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on instructions
            >
              <Typography
                variant="body2"
                sx={{
                  fontSize: isMobile ? '0.875rem' : '0.9rem',
                  fontWeight: 500,
                  lineHeight: 1.3,
                }}
              >
                {isMobile 
                  ? 'Hold image to save'
                  : 'Right-click image to save'
                }
              </Typography>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

CollageResultDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  finalImage: PropTypes.string,
};

CollageResultDialog.defaultProps = {
  finalImage: null,
}; 
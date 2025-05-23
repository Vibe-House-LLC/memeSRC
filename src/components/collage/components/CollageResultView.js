import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  Snackbar,
  useTheme,
  useMediaQuery,
  Divider,
  Paper
} from '@mui/material';
import {
  Download as DownloadIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  Error as ErrorIcon,
  Edit as EditIcon
} from '@mui/icons-material';

/* global ClipboardItem */

export default function CollageResultView({ 
  finalImage, 
  onBackToEdit, 
  showBackButton = true,
  layout = 'horizontal' // 'horizontal', 'vertical', or 'responsive'
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [clipboardSupported, setClipboardSupported] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Check clipboard support on mount
  React.useEffect(() => {
    const checkClipboardSupport = () => {
      const isSupported = !!(
        navigator.clipboard && 
        navigator.clipboard.write && 
        typeof ClipboardItem !== 'undefined'
      );
      setClipboardSupported(isSupported);
    };
    
    checkClipboardSupport();
  }, []);

  // Show snackbar message
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Close snackbar
  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Download image
  const handleDownload = useCallback(async () => {
    if (!finalImage) return;
    
    setIsDownloading(true);
    try {
      // Create download link
      const link = document.createElement('a');
      link.href = finalImage;
      link.download = `memeSRC-collage-${new Date().getTime()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSnackbar('Collage downloaded successfully!', 'success');
    } catch (error) {
      console.error('Download failed:', error);
      showSnackbar('Failed to download image. Please try again.', 'error');
    }
    setIsDownloading(false);
  }, [finalImage]);

  // Copy image to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    if (!finalImage) return;
    
    setIsCopying(true);
    try {
      // Check if the Clipboard API is available and supports write operations
      if (!navigator.clipboard || !navigator.clipboard.write) {
        throw new Error('Clipboard API not supported');
      }

      // Check if ClipboardItem is available
      if (typeof ClipboardItem === 'undefined') {
        throw new Error('ClipboardItem not supported');
      }

      // Convert base64 to blob
      const response = await fetch(finalImage);
      if (!response.ok) {
        throw new Error('Failed to fetch image data');
      }
      
      const blob = await response.blob();
      
      // Verify blob type - ensure it's an image
      if (!blob.type.startsWith('image/')) {
        throw new Error('Invalid image format');
      }

      // Check if the browser can handle this specific blob type
      const clipboardItem = new ClipboardItem({
        [blob.type]: blob
      });

      // Write to clipboard
      await navigator.clipboard.write([clipboardItem]);
      
      showSnackbar('Collage copied to clipboard!', 'success');
    } catch (error) {
      console.error('Copy failed:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to copy to clipboard.';
      
      if (error.message.includes('not supported')) {
        errorMessage = 'Clipboard copying not supported in this browser. Try downloading instead.';
      } else if (error.message.includes('permission')) {
        errorMessage = 'Permission denied to access clipboard. Please allow clipboard access and try again.';
      } else if (error.name === 'NotAllowedError') {
        errorMessage = 'Clipboard access not allowed. Please check browser permissions.';
      } else if (error.name === 'SecurityError') {
        errorMessage = 'Clipboard access blocked for security reasons. Try downloading instead.';
      } else {
        errorMessage = 'Failed to copy image. Try downloading or right-clicking to copy.';
      }
      
      showSnackbar(errorMessage, 'error');
    }
    setIsCopying(false);
  }, [finalImage]);

  // Share image (Web Share API if available)
  const handleShare = useCallback(async () => {
    if (!finalImage) return;
    
    try {
      if (navigator.share && navigator.canShare) {
        // Convert base64 to blob for sharing
        const response = await fetch(finalImage);
        const blob = await response.blob();
        const file = new File([blob], `memeSRC-collage-${Date.now()}.png`, { type: blob.type });
        
        await navigator.share({
          title: 'My memeSRC Collage',
          text: 'Check out this collage I created with memeSRC!',
          files: [file]
        });
        
        showSnackbar('Collage shared successfully!', 'success');
      } else {
        // Fallback: copy link or show share options
        showSnackbar('Sharing not available. Try downloading or copying instead.', 'info');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        showSnackbar('Failed to share image.', 'error');
      }
    }
  }, [finalImage]);


  // Make layout responsive: horizontal on desktop, vertical on mobile (unless forced)
  const isVertical = layout === 'vertical' || (layout !== 'horizontal' && isMobile);

  if (!finalImage) {
    return (
      <Box 
        sx={{ 
          p: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          minHeight: 300,
          justifyContent: 'center'
        }}
      >
        <ErrorIcon sx={{ fontSize: 64, color: theme.palette.text.secondary }} />
        <Typography variant="h6" color="text.secondary">
          No image generated yet
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Go back to the editor and click "Generate & Preview" to create your collage.
        </Typography>
        {showBackButton && onBackToEdit && (
          <Button
            variant="contained"
            onClick={onBackToEdit}
            startIcon={<EditIcon />}
            sx={{ mt: 2, borderRadius: 2 }}
          >
            Back to Editor
          </Button>
        )}
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: isVertical ? 'column' : 'row', 
        gap: isVertical ? 2 : 3,
        alignItems: isVertical ? 'center' : 'flex-start',
        width: '100%'
      }}>
        {/* Image Preview */}
        <Box 
          sx={{ 
            flex: isVertical ? 'none' : 1,
            width: isVertical ? '100%' : 'auto',
            maxWidth: isVertical ? (isMobile ? '100%' : '600px') : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: isVertical ? (isMobile ? 200 : 300) : 400,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 1,
              borderRadius: 2,
              width: '100%',
              maxWidth: isVertical ? '100%' : 'none',
              maxHeight: isVertical ? (isMobile ? '50vh' : '60vh') : '80vh',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img 
              src={finalImage} 
              alt="Generated Collage" 
              style={{ 
                width: '100%', 
                height: 'auto', 
                display: 'block',
                borderRadius: theme.shape.borderRadius,
                maxHeight: isVertical ? (isMobile ? '50vh' : '60vh') : '80vh',
                objectFit: 'contain',
              }} 
            />
          </Paper>
        </Box>

        {/* Actions Panel */}
        <Box 
          sx={{ 
            width: isVertical ? '100%' : 320,
            minWidth: isVertical ? 'auto' : 300,
            maxWidth: isVertical ? (isMobile ? '100%' : '600px') : 320,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            flex: isVertical ? 'none' : '0 0 auto',
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: isVertical ? 'center' : 'left' }}>
            <Typography variant={isMobile ? "h6" : "h5"} component="h2" fontWeight="bold" gutterBottom>
              🎨 Your Collage is Ready!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Download, share, or copy your creation
            </Typography>
          </Box>



          {/* Quick Actions */}
          <Paper variant="outlined" sx={{ p: isMobile ? 1.5 : 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Quick Actions
            </Typography>
            <Stack spacing={isMobile ? 1 : 1.5} direction={isMobile && isVertical ? 'row' : 'column'}>
              <Button
                variant="contained"
                startIcon={isDownloading ? <CircularProgress size={16} /> : <DownloadIcon />}
                onClick={handleDownload}
                disabled={isDownloading}
                fullWidth={!isMobile || !isVertical}
                size={isMobile ? "medium" : "large"}
                sx={{ borderRadius: 2, flex: isMobile && isVertical ? 1 : 'none' }}
              >
                {isDownloading ? 'Downloading...' : 'Download'}
              </Button>
              
              {clipboardSupported && (
                <Button
                  variant="contained"
                  startIcon={isCopying ? <CircularProgress size={16} /> : <CopyIcon />}
                  onClick={handleCopyToClipboard}
                  disabled={isCopying}
                  fullWidth={!isMobile || !isVertical}
                  size={isMobile ? "medium" : "large"}
                  sx={{ borderRadius: 2, flex: isMobile && isVertical ? 1 : 'none' }}
                >
                  {isCopying ? 'Copying...' : (isMobile && isVertical ? 'Copy' : 'Copy to Clipboard')}
                </Button>
              )}
              
              {navigator.share && (
                <Button
                  variant="contained"
                  startIcon={<ShareIcon />}
                  onClick={handleShare}
                  fullWidth={!isMobile || !isVertical}
                  size={isMobile ? "medium" : "large"}
                  sx={{ borderRadius: 2, flex: isMobile && isVertical ? 1 : 'none' }}
                >
                  Share
                </Button>
              )}
            </Stack>
          </Paper>

          {/* Tips */}
          <Alert 
            severity="info" 
            sx={{ borderRadius: 2 }}
          >
            <Typography variant="body2">
              <strong>Pro tip:</strong> Right-click the image to save or copy directly to your clipboard!
            </Typography>
          </Alert>

          {showBackButton && onBackToEdit && (
            <>
              <Divider sx={{ my: 1 }} />
              
              {/* Back to Editor */}
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Want to make changes?
                </Typography>
                <Button
                  variant="contained"
                  onClick={onBackToEdit}
                  fullWidth
                  startIcon={<EditIcon />}
                  sx={{ borderRadius: 2 }}
                  color="secondary"
                >
                  Back to Editor
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Box>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
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

CollageResultView.propTypes = {
  finalImage: PropTypes.string, // Base64 Data URL
  onBackToEdit: PropTypes.func,
  showBackButton: PropTypes.bool,
  layout: PropTypes.oneOf(['horizontal', 'vertical', 'responsive']),
};

CollageResultView.defaultProps = {
  finalImage: null,
  onBackToEdit: null,
  showBackButton: true,
  layout: 'horizontal',
}; 
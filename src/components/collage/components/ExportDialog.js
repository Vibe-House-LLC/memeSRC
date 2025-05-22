import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Button,
  Typography,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Tooltip,
  Snackbar,
  useTheme,
  useMediaQuery,
  Divider,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';

export default function ExportDialog({ open, onClose, finalImage }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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
      // Convert base64 to blob
      const response = await fetch(finalImage);
      const blob = await response.blob();
      
      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      showSnackbar('Collage copied to clipboard!', 'success');
    } catch (error) {
      console.error('Copy failed:', error);
      showSnackbar('Failed to copy to clipboard. Try downloading instead.', 'error');
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

  // Calculate image dimensions for display
  const getImageInfo = () => {
    if (!finalImage) return null;
    
    const img = new Image();
    img.src = finalImage;
    
    return {
      width: img.naturalWidth || 'Unknown',
      height: img.naturalHeight || 'Unknown',
      size: finalImage.length ? `${(finalImage.length * 0.75 / 1024).toFixed(1)} KB` : 'Unknown'
    };
  };

  const imageInfo = getImageInfo();

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh',
            margin: isMobile ? 1 : 2,
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
                🎨 Your Collage is Ready!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Download, share, or copy your creation
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
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
          {finalImage ? (
            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%' }}>
              {/* Image Preview */}
              <Box 
                sx={{ 
                  flex: 1,
                  p: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.palette.background.default,
                  minHeight: isMobile ? 300 : 400,
                }}
              >
                <Paper
                  elevation={3}
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    maxWidth: '100%',
                    maxHeight: '100%',
                    overflow: 'hidden',
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
                    }} 
                  />
                </Paper>
              </Box>

              {/* Actions Panel */}
              <Box 
                sx={{ 
                  width: isMobile ? '100%' : 320,
                  p: 3,
                  borderLeft: isMobile ? 'none' : `1px solid ${theme.palette.divider}`,
                  borderTop: isMobile ? `1px solid ${theme.palette.divider}` : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {/* Image Info */}
                {imageInfo && (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <InfoIcon fontSize="small" color="primary" />
                      Image Details
                    </Typography>
                    <Stack spacing={1}>
                      <Chip 
                        label={`${imageInfo.width} × ${imageInfo.height} px`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip 
                        label={`~${imageInfo.size}`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip 
                        label="PNG Format"
                        size="small"
                        variant="outlined"
                      />
                    </Stack>
                  </Paper>
                )}

                {/* Quick Actions */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Quick Actions
                  </Typography>
                  <Stack spacing={1.5}>
                    <Button
                      variant="contained"
                      startIcon={isDownloading ? <CircularProgress size={16} /> : <DownloadIcon />}
                      onClick={handleDownload}
                      disabled={isDownloading}
                      fullWidth
                      size="large"
                      sx={{ borderRadius: 2 }}
                    >
                      {isDownloading ? 'Downloading...' : 'Download'}
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={isCopying ? <CircularProgress size={16} /> : <CopyIcon />}
                      onClick={handleCopyToClipboard}
                      disabled={isCopying}
                      fullWidth
                      sx={{ borderRadius: 2 }}
                    >
                      {isCopying ? 'Copying...' : 'Copy to Clipboard'}
                    </Button>
                    
                    {navigator.share && (
                      <Button
                        variant="outlined"
                        startIcon={<ShareIcon />}
                        onClick={handleShare}
                        fullWidth
                        sx={{ borderRadius: 2 }}
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
                  icon={<InfoIcon />}
                >
                  <Typography variant="body2">
                    <strong>Pro tip:</strong> Right-click the image to save or copy directly to your clipboard!
                  </Typography>
                </Alert>

                <Divider sx={{ my: 1 }} />

                {/* Additional Actions */}
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Want to make changes?
                  </Typography>
                  <Button
                    variant="text"
                    onClick={onClose}
                    fullWidth
                    sx={{ borderRadius: 2, justifyContent: 'flex-start' }}
                  >
                    ← Back to Editor
                  </Button>
                </Box>
              </Box>
            </Box>
          ) : (
            // No image state
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
              <Button
                variant="contained"
                onClick={onClose}
                sx={{ mt: 2, borderRadius: 2 }}
              >
                Back to Editor
              </Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>

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

ExportDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  finalImage: PropTypes.string, // Base64 Data URL
};

ExportDialog.defaultProps = {
  finalImage: null,
}; 
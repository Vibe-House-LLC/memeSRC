import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  CircularProgress,
  Typography,
  useMediaQuery,
  Fab,
  IconButton,
  AppBar,
  Toolbar,
  Tooltip,
  Stack,
  Paper
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { 
  ArrowBack,
  Close, 
  DeleteOutline, 
  UploadFile,
  Check,
  Done
} from '@mui/icons-material';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  convertToPixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import '../styles/CropStyles.css'; // Import custom crop styles

// Helper to get initial crop based on aspect ratio
function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
  // Calculate maximum possible crop size that fits within the image while maintaining aspect ratio
  let cropWidth;
  let cropHeight;
  
  if (mediaWidth / mediaHeight > aspect) {
    // Image is wider than the target aspect ratio, so height is the constraint
    cropHeight = 100; // Use 100% of height
    cropWidth = (cropHeight * aspect * mediaHeight) / mediaWidth; // Calculate width percentage
  } else {
    // Image is taller than the target aspect ratio, so width is the constraint
    cropWidth = 100; // Use 100% of width
    cropHeight = (cropWidth / aspect * mediaWidth) / mediaHeight; // Calculate height percentage
  }
  
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: cropWidth,
        height: cropHeight,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

export default function ImageCropModal({
  open,
  onClose,
  imageSrc,
  aspectRatio, // Expecting a number (width / height)
  onCropComplete,
  onReplaceRequest, // New prop for requesting replacement
  onRemoveRequest, // New prop for requesting removal
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [imgLoadError, setImgLoadError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef(null);
  const previewCanvasRef = useRef(null); // For showing a preview, if desired

  useEffect(() => {
    // Reset state when dialog opens or image changes
    if (open) {
      setCrop(undefined); // Reset crop area
      setCompletedCrop(null);
      setImgLoadError(false);
      setIsProcessing(false);
    }
  }, [open, imageSrc]);

  const onImageLoad = (e) => {
    setImgLoadError(false);
    const { width, height } = e.currentTarget;
    // Set initial crop area centered with the correct aspect ratio
    if (aspectRatio) {
        setCrop(centerAspectCrop(width, height, aspectRatio));
        // Also set completed crop initially to enable cropping immediately
        setCompletedCrop(convertToPixelCrop(
            centerAspectCrop(width, height, aspectRatio),
            width,
            height
        ));
    }
  };

  const onImageError = () => {
    setImgLoadError(true);
    console.error("Error loading image for cropping.");
  };

  const handleCrop = async () => {
    if (!completedCrop || !imgRef.current || isProcessing) {
      console.warn('Crop data or image ref missing, or already processing.');
      return;
    }

    setIsProcessing(true);
    const image = imgRef.current;
    const canvas = document.createElement('canvas'); // Use an offscreen canvas
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = Math.floor(completedCrop.width * scaleX);
    canvas.height = Math.floor(completedCrop.height * scaleY);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No 2d context');
    }

    const pixelRatio = window.devicePixelRatio || 1;

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';

    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;

    // Move canvas origin to the center of the canvas to rotate/scale around center.
    ctx.translate(canvas.width / 2 / pixelRatio, canvas.height / 2 / pixelRatio);
    // Uncomment below if rotation/scale is needed
    // ctx.rotate(rotate * Math.PI / 180)
    // ctx.scale(scale, scale)
    ctx.translate(-canvas.width / 2 / pixelRatio, -canvas.height / 2 / pixelRatio);

    ctx.drawImage(
      image,
      cropX,
      cropY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width / pixelRatio,
      canvas.height / pixelRatio,
    );

    // Convert canvas to base64
    canvas.toBlob((blob) => {
        if (!blob) {
            console.error('Canvas is empty');
            setIsProcessing(false);
            return;
          }
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result;
            onCropComplete(base64data);
            setIsProcessing(false);
            onClose(); // Close modal after successful crop
        };
        reader.readAsDataURL(blob);
    }, 'image/png');
  };

  return (
    <Dialog
      open={open}
      onClose={isProcessing ? undefined : onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ 
        sx: { 
          height: isMobile ? '100%' : '90vh',
          bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : undefined
        } 
      }}
    >
      {isMobile ? (
        <AppBar position="sticky" color="default" elevation={1} sx={{ bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : undefined }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={onClose}
              disabled={isProcessing}
              aria-label="back"
            >
              <ArrowBack />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Crop Image
            </Typography>
            <Tooltip title="Remove Image">
              <IconButton
                color="error"
                onClick={onRemoveRequest}
                disabled={isProcessing}
                aria-label="remove image"
              >
                <DeleteOutline />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
      ) : (
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Crop Image</Typography>
          <Tooltip title="Remove Image">
            <IconButton
              color="error"
              onClick={onRemoveRequest}
              disabled={isProcessing}
              aria-label="remove image"
            >
              <DeleteOutline />
            </IconButton>
          </Tooltip>
        </DialogTitle>
      )}
      
      <DialogContent 
        dividers={!isMobile} 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          p: isMobile ? 0 : 2,
          pb: isMobile ? 0 : 2, // Remove bottom padding on mobile for control bar
          position: 'relative'
        }}
      >
        {imgLoadError && (
          <Typography color="error" align="center" sx={{ my: 2 }}>
            Failed to load image. Please try a different one.
          </Typography>
        )}
        {!imgLoadError && imageSrc && (
          <Box sx={{ 
            flexGrow: 1, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            overflow: 'hidden', 
            background: theme.palette.mode === 'dark' ? '#333' : '#eee',
            height: '100%' 
          }}>
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              className={theme.palette.mode === 'dark' ? 'dark-crop-theme' : ''}
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={imageSrc}
                style={{ 
                  maxHeight: isMobile ? 'calc(100vh - 160px)' : '70vh', 
                  maxWidth: '100%', 
                  objectFit: 'contain' 
                }}
                onLoad={onImageLoad}
                onError={onImageError}
              />
            </ReactCrop>
          </Box>
        )}
        
        {/* Mobile bottom control bar */}
        {isMobile && (
          <Paper 
            elevation={3} 
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1,
              borderRadius: 0,
              bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : undefined
            }}
          >
            <Stack 
              direction="row" 
              sx={{
                width: '100%',
                height: '72px',
                justifyContent: 'space-around',
                alignItems: 'center',
                px: 2
              }}
            >
              <Button
                color="inherit"
                onClick={onClose}
                disabled={isProcessing}
                startIcon={<ArrowBack />}
                sx={{ 
                  height: '48px',
                  color: theme.palette.mode === 'dark' ? theme.palette.grey[300] : undefined
                }}
              >
                Back
              </Button>
              
              <Button
                color="primary"
                onClick={onReplaceRequest}
                disabled={isProcessing}
                startIcon={<UploadFile />}
                variant="outlined"
                sx={{ 
                  height: '48px',
                  color: theme.palette.mode === 'dark' ? theme.palette.primary.light : undefined
                }}
              >
                Upload
              </Button>
              
              <Button
                color="primary"
                variant="contained"
                onClick={handleCrop}
                disabled={!completedCrop || imgLoadError || isProcessing}
                startIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> : <Done />}
                sx={{ 
                  height: '48px',
                  color: theme.palette.mode === 'dark' ? '#fff' : undefined,
                  bgcolor: theme.palette.mode === 'dark' ? 'primary.dark' : undefined,
                  '&.Mui-disabled': {
                    bgcolor: theme.palette.mode === 'dark' ? 'action.disabledBackground' : undefined,
                  }
                }}
              >
                Done
              </Button>
            </Stack>
          </Paper>
        )}
      </DialogContent>
      
      {!isMobile && (
        <DialogActions sx={{ 
          px: 3, 
          py: 2,
          bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : undefined,
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <Button 
            onClick={onClose} 
            color="inherit" 
            disabled={isProcessing}
            variant="outlined"
            startIcon={<ArrowBack />}
            sx={{ 
              minWidth: '100px',
              color: theme.palette.mode === 'dark' ? theme.palette.grey[300] : undefined
            }}
          >
            Back
          </Button>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              onClick={onReplaceRequest}
              color="primary"
              variant="outlined"
              disabled={isProcessing}
              startIcon={<UploadFile />}
              sx={{ 
                minWidth: '120px',
                color: theme.palette.mode === 'dark' ? theme.palette.primary.light : undefined
              }}
            >
              Upload
            </Button>
            <Button
              onClick={handleCrop}
              color="primary"
              variant="contained"
              disabled={!completedCrop || imgLoadError || isProcessing}
              startIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> : <Done />}
              sx={{ 
                minWidth: '100px',
                color: theme.palette.mode === 'dark' ? '#fff' : undefined,
                bgcolor: theme.palette.mode === 'dark' ? 'primary.dark' : undefined,
                '&.Mui-disabled': {
                  bgcolor: theme.palette.mode === 'dark' ? 'action.disabledBackground' : undefined,
                }
              }}
            >
              Done
            </Button>
          </Box>
        </DialogActions>
      )}
    </Dialog>
  );
}

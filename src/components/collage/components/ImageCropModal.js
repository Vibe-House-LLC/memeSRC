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
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  convertToPixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// Helper to get initial crop based on aspect ratio
function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90, // Start with 90% width crop centered
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
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { height: isMobile ? '100%' : '90vh' } }}
    >
      <DialogTitle>Crop Image</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', p: isMobile ? 1 : 2 }}>
        {imgLoadError && (
          <Typography color="error" align="center" sx={{ my: 2 }}>
            Failed to load image. Please try a different one.
          </Typography>
        )}
        {!imgLoadError && imageSrc && (
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', background: theme.palette.mode === 'dark' ? '#222' : '#eee' }}>
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              // minWidth={100} // Optional: set min crop dimensions
              // minHeight={100}
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={imageSrc}
                style={{ maxHeight: '70vh', maxWidth: '100%', objectFit: 'contain' }}
                onLoad={onImageLoad}
                onError={onImageError}
              />
            </ReactCrop>
          </Box>
        )}
        {/* Optional Preview Canvas
        {!!completedCrop && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <canvas
              ref={previewCanvasRef}
              style={{
                border: '1px solid black',
                objectFit: 'contain',
                width: completedCrop.width,
                height: completedCrop.height,
                maxWidth: 150, // Limit preview size
                maxHeight: 150 * (1 / aspectRatio)
              }}
            />
          </Box>
        )} */}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary" disabled={isProcessing}>
          Cancel
        </Button>
        <Button
          onClick={handleCrop}
          color="primary"
          variant="contained"
          disabled={!completedCrop || imgLoadError || isProcessing}
        >
          {isProcessing ? <CircularProgress size={24} color="inherit" /> : 'Crop'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

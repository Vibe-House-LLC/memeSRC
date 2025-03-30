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
  IconButton,
  AppBar,
  Toolbar,
  Tooltip,
  Stack,
  Paper,
  Slider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { 
  ArrowBack,
  DeleteOutline, 
  UploadFile,
  Done,
  ZoomIn,
  ZoomOut
} from '@mui/icons-material';
import '../styles/CropStyles.css'; // Import custom crop styles

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
  const [zoom, setZoom] = useState(1); // Zoom level
  const [position, setPosition] = useState({ x: 0, y: 0 }); // Image position
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgLoadError, setImgLoadError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });
  const imgRef = useRef(null);
  const cropContainerRef = useRef(null);
  const cropFrameRef = useRef(null);

  // Calculate fixed crop frame dimensions based on aspect ratio
  const frameWidth = isMobile ? 280 : 350;
  const frameHeight = aspectRatio ? frameWidth / aspectRatio : frameWidth;
  
  // Mobile bottom bar height - use this for layout calculations
  const mobileBottomBarHeight = 72;

  useEffect(() => {
    // Reset state when dialog opens or image changes
    if (open) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setImgLoadError(false);
      setIsProcessing(false);
    }
  }, [open, imageSrc]);

  // Add a new effect that will reset the image reference when imageSrc changes
  useEffect(() => {
    if (imgRef.current && imageSrc) {
      // Force reload the image by setting src
      imgRef.current.src = imageSrc;
    }
  }, [imageSrc]);

  const onImageLoad = (e) => {
    setImgLoadError(false);
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImgDimensions({ width: naturalWidth, height: naturalHeight });
    
    // Center the image initially
    centerImage(naturalWidth, naturalHeight);
  };

  const centerImage = (imgWidth, imgHeight) => {
    if (!cropContainerRef.current) return;
    
    const containerRect = cropContainerRef.current.getBoundingClientRect();
    
    // Scale the image to fit within the container while maintaining aspect ratio
    let scale = 1;
    if (imgWidth > containerRect.width || imgHeight > containerRect.height) {
      const widthRatio = containerRect.width / imgWidth;
      const heightRatio = containerRect.height / imgHeight;
      scale = Math.min(widthRatio, heightRatio) * 0.9; // Scale to 90% of container
    }
    
    setZoom(scale);
    
    // Center the image
    const scaledWidth = imgWidth * scale;
    const scaledHeight = imgHeight * scale;
    
    setPosition({
      x: (containerRect.width - scaledWidth) / 2,
      y: (containerRect.height - scaledHeight) / 2
    });
  };

  const onImageError = () => {
    setImgLoadError(true);
    console.error("Error loading image for cropping. Image source:", imageSrc);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    setPosition({
      x: newX,
      y: newY
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleZoomChange = (_, newValue) => {
    if (!cropContainerRef.current || !cropFrameRef.current) return;
    
    const containerRect = cropContainerRef.current.getBoundingClientRect();
    const frameRect = cropFrameRef.current.getBoundingClientRect();
    
    // Get crop frame center relative to container
    const frameCenterX = frameRect.left - containerRect.left + frameRect.width / 2;
    const frameCenterY = frameRect.top - containerRect.top + frameRect.height / 2;
    
    // Calculate where this point is on the image at current zoom
    const imageX = (frameCenterX - position.x) / zoom;
    const imageY = (frameCenterY - position.y) / zoom;
    
    // Apply new zoom value
    const zoomRatio = newValue / zoom;
    setZoom(newValue);
    
    // Calculate new position
    setPosition({
      x: frameCenterX - imageX * newValue,
      y: frameCenterY - imageY * newValue
    });
  };

  const handleCrop = async () => {
    if (!imgRef.current || !cropFrameRef.current || isProcessing) {
      console.warn('Image ref or crop frame missing, or already processing.');
      return;
    }

    setIsProcessing(true);
    
    try {
      const image = imgRef.current;
      const canvas = document.createElement('canvas');
      const frameRect = cropFrameRef.current.getBoundingClientRect();
      const imgRect = imgRef.current.getBoundingClientRect();
      
      // Calculate the portion of the image visible in the crop frame
      const visibleLeft = (frameRect.left - imgRect.left) / zoom;
      const visibleTop = (frameRect.top - imgRect.top) / zoom;
      
      // Set canvas dimensions to match the crop frame size
      canvas.width = frameWidth;
      canvas.height = frameHeight;
      
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('No 2d context');
      }
      
      ctx.drawImage(
        image,
        visibleLeft,
        visibleTop,
        frameWidth / zoom,
        frameHeight / zoom,
        0,
        0,
        frameWidth,
        frameHeight
      );
      
      // Convert canvas to blob
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
          onClose();
        };
        reader.readAsDataURL(blob);
      }, 'image/png');
    } catch (error) {
      console.error('Error during image crop:', error);
      setIsProcessing(false);
    }
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
              Adjust Image
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
          <Typography variant="h6">Adjust Image</Typography>
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
          p: 0,
          position: 'relative',
          overflow: 'hidden'
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
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            background: 'black',
            height: '100%',
            width: '100%',
            position: 'relative',
          }}>
            {/* Crop area container */}
            <Box 
              ref={cropContainerRef}
              sx={{
                position: 'relative',
                width: '100%',
                height: isMobile ? `calc(100vh - 220px - ${mobileBottomBarHeight}px)` : 'calc(90vh - 200px)',
                overflow: 'hidden',
                userSelect: 'none',
                touchAction: 'none'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Image with zoom and position */}
              <img
                ref={imgRef}
                alt="Crop"
                src={imageSrc}
                style={{ 
                  position: 'absolute',
                  transformOrigin: '0 0',
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                  maxWidth: 'none',
                  cursor: isDragging ? 'grabbing' : 'grab'
                }}
                onLoad={onImageLoad}
                onError={onImageError}
                draggable={false}
              />
              
              {/* Fixed crop frame with overlay */}
              <Box
                ref={cropFrameRef}
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: `${frameWidth}px`,
                  height: `${frameHeight}px`,
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: '0 0 0 2000px rgba(0, 0, 0, 0.5)',
                  pointerEvents: 'none',
                  zIndex: 10
                }}
              />
            </Box>
            
            {/* Zoom slider control */}
            <Box sx={{ 
              position: 'relative',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 20,
              py: 1.5,
              bgcolor: 'background.paper',
              borderTop: '1px solid',
              borderColor: 'divider',
              mb: isMobile ? `${mobileBottomBarHeight}px` : 0, // Add bottom margin on mobile to avoid overlap
            }}>
              <Box sx={{ 
                width: '90%', 
                maxWidth: '400px',
                display: 'flex',
                alignItems: 'center',
              }}>
                <ZoomOut color="primary" sx={{ mr: 1 }} />
                <Slider
                  value={zoom}
                  onChange={handleZoomChange}
                  min={0.1}
                  max={5}
                  step={0.01}
                  color="primary"
                  aria-label="Zoom"
                  sx={{ 
                    '& .MuiSlider-thumb': {
                      width: 16,
                      height: 16
                    },
                    '& .MuiSlider-track': {
                      height: 6
                    },
                    '& .MuiSlider-rail': {
                      height: 6
                    }
                  }}
                />
                <ZoomIn color="primary" sx={{ ml: 1 }} />
              </Box>
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                Drag to position image
              </Typography>
            </Box>
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
              zIndex: 30, // Increase z-index to ensure it's on top
              borderRadius: 0,
              bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : undefined
            }}
          >
            <Stack 
              direction="row" 
              sx={{
                width: '100%',
                height: `${mobileBottomBarHeight}px`,
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
                disabled={imgLoadError || isProcessing}
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
              disabled={imgLoadError || isProcessing}
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

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Slider,
  Stack,
  Tooltip,
  Typography,
  CircularProgress
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  RotateLeft,
  RotateRight,
  Replay,
  AspectRatio,
  Check,
  Close,
  Save
} from '@mui/icons-material';

// Import fabric directly for our custom blob handling
import { fabric } from 'fabric';

// Import only the functions that are actually exported from FabricImageEditor
import {
  initCanvas,
  loadImageToCanvas,
  zoomCanvas,
  rotateImage,
  resetImage,
  generateCroppedImage,
  enableImageZoom,
  addKeyboardShortcuts
} from '../utils/FabricImageEditor';

/**
 * PanelImageEditor - A component for editing images for collage panels
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the editor dialog is open
 * @param {function} props.onClose - Function to call when closing the dialog
 * @param {string} props.imageUrl - URL of the image to edit
 * @param {number} props.panelId - ID of the panel being edited
 * @param {number} props.aspectRatio - Aspect ratio of the panel
 * @param {function} props.onSave - Function to call when saving the edited image
 */
const PanelImageEditor = ({ 
  open, 
  onClose, 
  imageUrl, 
  panelId = null, 
  aspectRatio = 1, 
  onSave 
}) => {
  const theme = useTheme();
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const loadTimeoutRef = useRef(null);
  const isMountedRef = useRef(true); // Track if component is mounted
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  // Add a counter state to force re-renders when needed
  const [renderCounter, setRenderCounter] = useState(0);
  
  // Create a force re-render function
  const forceUpdate = useCallback(() => {
    if (isMountedRef.current) {
      setRenderCounter(prev => prev + 1);
    }
  }, []);
  
  // Set isMounted to false when component unmounts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Safe state update functions
  const safeSetImageLoaded = useCallback((value) => {
    if (isMountedRef.current) {
      setImageLoaded(value);
    }
  }, []);
  
  const safeSetError = useCallback((value) => {
    if (isMountedRef.current) {
      setError(value);
    }
  }, []);
  
  // Initialize the Fabric.js canvas when the component mounts or dialog opens
  useEffect(() => {
    console.log('Canvas initialization effect triggered', { open, canvasRef: !!canvasRef.current });
    
    if (open && canvasRef.current) {
      try {
        // Dispose of previous canvas if it exists
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        }
        
        // Create a new canvas
        console.log('Initializing Fabric canvas');
        fabricCanvasRef.current = initCanvas(canvasRef.current);
        console.log('Canvas initialized successfully', { fabricCanvas: !!fabricCanvasRef.current });
        
        // Set canvas as ready
        setCanvasReady(true);
        
        // Force a re-render after canvas initialization
        forceUpdate();
        
        // If dialog is open but no image URL is provided, show an error
        if (!imageUrl) {
          console.warn('Dialog opened but no image URL provided');
          safeSetError("No image provided");
          safeSetImageLoaded(true); // Set to true to avoid loading state
        } else {
          // Now that canvas is initialized, trigger image loading
          console.log('Canvas ready, will load image:', imageUrl);
          // We'll handle the actual loading in the image loading effect
        }
      } catch (err) {
        console.error('Error initializing canvas:', err);
        safeSetError("Failed to initialize image editor");
        setCanvasReady(false);
      }
    } else {
      // If dialog is closed or canvas ref is not available, set canvas as not ready
      setCanvasReady(false);
    }
    
    // Clean up
    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
      
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
      
      safeSetImageLoaded(false);
      setCanvasReady(false);
    };
  }, [open, forceUpdate, imageUrl, safeSetError, safeSetImageLoaded]);
  
  // Track when canvas is ready for image loading
  const [canvasReady, setCanvasReady] = useState(false);
  
  // Update canvasReady state when fabricCanvas is initialized
  useEffect(() => {
    const hasFabricCanvas = !!fabricCanvasRef.current;
    console.log('Checking canvas ready state:', { hasFabricCanvas });
    setCanvasReady(hasFabricCanvas);
  }, [renderCounter]);
  
  // Load image when URL changes and canvas is ready
  useEffect(() => {
    console.log('Image loading effect triggered', { 
      open, 
      hasImageUrl: !!imageUrl, 
      hasFabricCanvas: !!fabricCanvasRef.current,
      canvasReady,
      imageUrl
    });
    
    let cleanupFunction = () => {}; // Initialize with empty function
    let imageLoadTimeout = null;

    // Only proceed if dialog is open, we have an image URL, and the canvas is ready
    if (open && imageUrl && fabricCanvasRef.current && canvasReady) {
      // Check if imageUrl is a valid URL or data URL or blob URL
      const isValidUrl = (url) => {
        try {
          return url.startsWith('data:') || url.startsWith('blob:') || Boolean(new URL(url));
        } catch (e) {
          return false;
        }
      };
      
      if (!isValidUrl(imageUrl)) {
        console.error('Invalid image URL format:', imageUrl);
        safeSetError("Invalid image URL format");
        safeSetImageLoaded(true); // Set to true to avoid loading state
        // Don't return here, continue to the cleanup function
      } else {
        safeSetImageLoaded(false);
        safeSetError(null);
        
        // Set a global timeout for the entire image loading process
        imageLoadTimeout = setTimeout(() => {
          if (!imageLoaded && isMountedRef.current) {
            console.warn('Image loading timed out after 15 seconds');
            safeSetError("Image loading timed out. Please try again.");
            safeSetImageLoaded(true);
            forceUpdate();
          }
        }, 15000); // 15 second timeout for the entire process
        
        // Log the image URL being loaded
        console.log('Loading image into Fabric editor:', imageUrl);
        
        // SIMPLIFIED APPROACH: Use a single method for all URL types
        // Create a new image element
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Important for CORS
        
        img.onload = () => {
          console.log('Image loaded successfully', { 
            width: img.width, 
            height: img.height,
            imageUrl
          });
          
          try {
            // Clear the canvas
            fabricCanvasRef.current.clear();
            
            // Set canvas dimensions based on aspect ratio
            let canvasWidth = 600;
            let canvasHeight = Math.round(canvasWidth / aspectRatio);
            
            // If height would be too tall, adjust width instead
            if (canvasHeight > 600) {
              canvasHeight = 600;
              canvasWidth = Math.round(canvasHeight * aspectRatio);
            }
            
            fabricCanvasRef.current.setWidth(canvasWidth);
            fabricCanvasRef.current.setHeight(canvasHeight);
            
            // Create crop guide
            const cropGuide = new fabric.Rect({
              width: canvasWidth,
              height: canvasHeight,
              fill: 'transparent',
              stroke: '#2196F3',
              strokeWidth: 2,
              strokeDashArray: [5, 5],
              selectable: false,
              evented: false,
              originX: 'center',
              originY: 'center',
              left: canvasWidth / 2,
              top: canvasHeight / 2
            });
            
            // Add the crop guide
            fabricCanvasRef.current.add(cropGuide);
            
            // Create a fabric image from the loaded image
            const fabricImage = new fabric.Image(img);
            
            // Scale the image to fit within the canvas
            const scale = Math.min(
              canvasWidth / img.width,
              canvasHeight / img.height
            ) * 0.9; // Add a little padding
            
            fabricImage.set({
              scaleX: scale,
              scaleY: scale,
              originX: 'center',
              originY: 'center',
              left: canvasWidth / 2,
              top: canvasHeight / 2
            });
            
            // Add the image to the canvas
            fabricCanvasRef.current.add(fabricImage);
            fabricCanvasRef.current.setActiveObject(fabricImage);
            fabricCanvasRef.current.renderAll();
            
            // Update state
            console.log('Image successfully loaded into canvas');
            safeSetImageLoaded(true);
            forceUpdate();
            
            // Set up image manipulation
            try {
              // Enable zoom with mouse wheel
              enableImageZoom(fabricCanvasRef.current);
              
              // Add keyboard shortcuts
              const cleanupKeyboardShortcuts = addKeyboardShortcuts(fabricCanvasRef.current);
              
              // Listen for object modifications to update UI state
              fabricCanvasRef.current.on('object:modified', (e) => {
                if (e.target && e.target.type === 'image') {
                  setZoom(e.target.scaleX * 100 || 100);
                  setRotation(e.target.angle || 0);
                  // Force update to ensure UI reflects changes
                  forceUpdate();
                }
              });
              
              // Listen for object scaling to update zoom level
              fabricCanvasRef.current.on('object:scaling', (e) => {
                if (e.target && e.target.type === 'image') {
                  setZoom(e.target.scaleX * 100 || 100);
                }
              });
              
              // Listen for object rotating to update rotation angle
              fabricCanvasRef.current.on('object:rotating', (e) => {
                if (e.target && e.target.type === 'image') {
                  setRotation(e.target.angle || 0);
                }
              });
              
              // Update the cleanup function
              cleanupFunction = () => {
                // Clean up keyboard shortcuts
                if (typeof cleanupKeyboardShortcuts === 'function') {
                  cleanupKeyboardShortcuts();
                }
                
                if (loadTimeoutRef.current) {
                  clearTimeout(loadTimeoutRef.current);
                  loadTimeoutRef.current = null;
                }
              };
            } catch (err) {
              console.error('Error setting up image manipulation:', err);
              safeSetImageLoaded(true);
              forceUpdate();
            }
          } catch (err) {
            console.error('Error creating fabric image:', err);
            safeSetError("Failed to create image. Please try again.");
            safeSetImageLoaded(true);
            forceUpdate();
          }
        };
        
        img.onerror = (err) => {
          console.error('Error loading image:', err);
          safeSetError("Failed to load image. The file may be corrupted or inaccessible.");
          safeSetImageLoaded(true);
          forceUpdate();
        };
        
        // Set a backup timeout in case onload doesn't trigger
        loadTimeoutRef.current = setTimeout(() => {
          if (!imageLoaded && isMountedRef.current) {
            console.log('Backup timeout triggered - forcing image loaded state');
            safeSetImageLoaded(true);
            forceUpdate();
          }
        }, 5000); // 5 second backup
        
        console.log('Setting image src to:', imageUrl);
        img.src = imageUrl;
      }
    }

    // Always return a consistent cleanup function
    return () => {
      if (typeof cleanupFunction === 'function') {
        cleanupFunction();
      }
      
      if (imageLoadTimeout) {
        clearTimeout(imageLoadTimeout);
      }
      
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [imageUrl, aspectRatio, open, forceUpdate, safeSetImageLoaded, safeSetError, imageLoaded, canvasReady]);
  
  // Add a check to verify image is loaded after component renders
  useEffect(() => {
    console.log('Image verification effect triggered', { 
      open, 
      hasFabricCanvas: !!fabricCanvasRef.current,
      imageLoaded
    });
    
    if (open && fabricCanvasRef.current) {
      // Check if canvas has objects but UI doesn't reflect that
      const hasObjects = fabricCanvasRef.current.getObjects().length > 0;
      const hasImage = fabricCanvasRef.current.getObjects().some(obj => obj.type === 'image');
      
      console.log('Canvas object check', { hasObjects, hasImage, imageLoaded });
      
      if (hasImage && !imageLoaded) {
        console.log('Image found in canvas but not marked as loaded - updating state');
        safeSetImageLoaded(true);
      }
    }
  }, [open, imageLoaded, renderCounter, safeSetImageLoaded]);
  
  // Add a debug effect to log when all conditions are met for image loading
  useEffect(() => {
    if (open && imageUrl && canvasReady && fabricCanvasRef.current) {
      console.log('All conditions met for image loading', {
        open,
        hasImageUrl: !!imageUrl,
        canvasReady,
        hasFabricCanvas: !!fabricCanvasRef.current
      });
    }
  }, [open, imageUrl, canvasReady]);
  
  // Handle zoom changes
  const handleZoomChange = (newZoom) => {
    setZoom(newZoom);
    if (fabricCanvasRef.current) {
      zoomCanvas(fabricCanvasRef.current, newZoom / 100);
    }
  };
  
  // Handle rotation
  const handleRotate = (angle) => {
    const newRotation = (rotation + angle) % 360;
    setRotation(newRotation);
    if (fabricCanvasRef.current) {
      rotateImage(fabricCanvasRef.current, angle);
    }
  };
  
  // Handle reset
  const handleReset = () => {
    setZoom(100);
    setRotation(0);
    if (fabricCanvasRef.current) {
      resetImage(fabricCanvasRef.current);
    }
  };
  
  // Handle save
  const handleSave = async () => {
    if (!fabricCanvasRef.current || !imageLoaded) {
      console.error('Cannot save: Canvas not initialized or image not loaded');
      return;
    }
    
    setIsSaving(true);
    
    try {
      console.log('Generating cropped image...', { panelId, aspectRatio });
      
      // Get the active object (should be the image)
      const activeObject = fabricCanvasRef.current.getActiveObject();
      const image = fabricCanvasRef.current.getObjects().find(obj => obj.type === 'image');
      
      if (!image) {
        throw new Error('No image found on canvas');
      }
      
      // Make sure the image is the active object
      if (!activeObject || activeObject.type !== 'image') {
        console.log('Setting image as active object before saving');
        fabricCanvasRef.current.setActiveObject(image);
        fabricCanvasRef.current.renderAll();
      }
      
      // Use the utility function to generate the cropped image
      const croppedImageUrl = await generateCroppedImage(
        fabricCanvasRef.current,
        aspectRatio
      );
      
      if (!croppedImageUrl) {
        throw new Error('Failed to generate cropped image URL');
      }
      
      console.log('Cropped image generated successfully', { 
        panelId, 
        hasUrl: !!croppedImageUrl,
        urlPreview: `${croppedImageUrl.substring(0, 50)}...` 
      });
      
      // Call onSave with the panelId and croppedImageUrl
      if (typeof onSave === 'function') {
        // Ensure panelId is passed correctly, even if it's 0
        // Note: In JavaScript, 0 is falsy, so we need to check explicitly
        if (panelId !== undefined && panelId !== null) {
          console.log(`Calling onSave with panelId: ${panelId}`);
          onSave(panelId, croppedImageUrl);
        } else {
          console.error('No panelId available for saving');
          onSave(null, croppedImageUrl);
        }
      } else {
        console.error('onSave is not a function');
      }
      
      onClose();
    } catch (err) {
      console.error('Error saving image:', err);
      safeSetError("Failed to save image. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Dialog
      open={open}
      onClose={() => !isSaving && onClose()}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          maxHeight: 700,
          display: 'flex',
          flexDirection: 'column'
        }
      }}
      TransitionProps={{
        onEntered: () => {
          // This ensures the canvas is initialized after the dialog is fully open
          console.log('Dialog fully opened, canvas ref:', !!canvasRef.current);
          if (canvasRef.current && !fabricCanvasRef.current) {
            console.log('Initializing canvas after dialog transition');
            try {
              fabricCanvasRef.current = initCanvas(canvasRef.current);
              setCanvasReady(true);
              forceUpdate();
            } catch (err) {
              console.error('Error initializing canvas after transition:', err);
            }
          }
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Edit Image</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton edge="end" color="inherit" onClick={onClose} disabled={isSaving}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
          borderRadius: 1,
          position: 'relative',
          overflow: 'hidden'
        }}>
          {!imageLoaded && (
            <Box sx={{ 
              position: 'absolute', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: 2
            }}>
              <CircularProgress />
              <Typography variant="body2">Loading image...</Typography>
            </Box>
          )}
          
          {error && (
            <Box sx={{ 
              position: 'absolute', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: 2,
              color: 'error.main'
            }}>
              <Typography variant="body1" color="error">
                {error}
              </Typography>
              <Button 
                variant="outlined" 
                color="error" 
                onClick={() => onClose()}
                startIcon={<Close />}
              >
                Close Editor
              </Button>
            </Box>
          )}
          
          <canvas 
            ref={canvasRef} 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%',
              visibility: imageLoaded ? 'visible' : 'hidden' 
            }} 
          />
        </Box>
        
        <Box sx={{ mt: 2, p: 2, borderTop: '1px solid #eee' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" sx={{ mr: 2, minWidth: 70 }}>Zoom: {zoom}%</Typography>
            <Tooltip title="Zoom Out">
              <IconButton size="small" onClick={() => handleZoomChange(Math.max(50, zoom - 10))}>
                <ZoomOut />
              </IconButton>
            </Tooltip>
            
            <Slider
              value={zoom}
              min={50}
              max={200}
              step={5}
              onChange={(_, newValue) => handleZoomChange(newValue)}
              sx={{ mx: 1, flexGrow: 1 }}
              disabled={!imageLoaded || !!error}
            />
            
            <Tooltip title="Zoom In">
              <IconButton size="small" onClick={() => handleZoomChange(Math.min(200, zoom + 10))}>
                <ZoomIn />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ mr: 2, minWidth: 70 }}>Rotation: {rotation}°</Typography>
              
              <Tooltip title="Rotate Left">
                <IconButton size="small" onClick={() => handleRotate(-90)} disabled={!imageLoaded || !!error}>
                  <RotateLeft />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Rotate Right">
                <IconButton size="small" onClick={() => handleRotate(90)} disabled={!imageLoaded || !!error}>
                  <RotateRight />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Tooltip title="Reset Image">
              <IconButton color="primary" onClick={handleReset} disabled={!imageLoaded || !!error}>
                <Replay />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          color="primary" 
          variant="contained" 
          disabled={!imageLoaded || isSaving || !!error}
          startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <Save />}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PanelImageEditor; 
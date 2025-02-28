/**
 * FabricImageEditor.js
 * Utilities for handling image editing with Fabric.js for the collage panel images
 */
import { fabric } from 'fabric';

/**
 * Initialize a new Fabric.js canvas
 * @param {HTMLCanvasElement} canvasElement - The canvas DOM element to use
 * @returns {fabric.Canvas} - The initialized Fabric.js canvas instance
 */
export const initCanvas = (canvasElement) => {
  // Create Fabric canvas with selection disabled (we only want to manipulate the image)
  const canvas = new fabric.Canvas(canvasElement, {
    preserveObjectStacking: true,
    selection: false,
    uniformScaling: true,
    imageSmoothingEnabled: true
  });
  
  // Set reasonable dimensions
  canvas.setWidth(600);
  canvas.setHeight(600);
  
  return canvas;
};

/**
 * Load an image to the canvas with proper positioning and sizing
 * @param {fabric.Canvas} canvas - The Fabric.js canvas instance
 * @param {string} imageUrl - URL of the image to load
 * @param {number} aspectRatio - Target aspect ratio (width/height)
 * @returns {Promise} - Promise that resolves when the image is loaded
 */
export const loadImageToCanvas = (canvas, imageUrl, aspectRatio) => {
  return new Promise((resolve, reject) => {
    if (!canvas) {
      reject(new Error("Canvas is not initialized"));
      return;
    }
    
    // Clear existing canvas content
    canvas.clear();
    
    // Set canvas dimensions based on aspect ratio
    let canvasWidth = 600;
    let canvasHeight = Math.round(canvasWidth / aspectRatio);
    
    // If height would be too tall, adjust width instead
    if (canvasHeight > 600) {
      canvasHeight = 600;
      canvasWidth = Math.round(canvasHeight * aspectRatio);
    }
    
    canvas.setWidth(canvasWidth);
    canvas.setHeight(canvasHeight);
    
    // Create crop guide (visible rectangle that shows the crop area)
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
      right: canvasHeight / 2
    });
    
    // Add the crop guide first
    canvas.add(cropGuide);
    
    // Create a timeout in case the image load takes too long
    const timeoutId = setTimeout(() => {
      // Don't reject, but log a warning
    }, 10000); // 10 second timeout
    
    // Load the image with error handling
    try {
      fabric.Image.fromURL(
        imageUrl,
        (img) => {
          clearTimeout(timeoutId);
          
          if (!img) {
            reject(new Error("Failed to create fabric image"));
            return;
          }
          
          // Calculate scale to fit image within canvas
          const imgWidth = img.width;
          const imgHeight = img.height;
          
          if (imgWidth === 0 || imgHeight === 0) {
            reject(new Error("Invalid image dimensions"));
            return;
          }
          
          // Calculate scale to fit image within canvas
          const scaleX = canvasWidth / imgWidth;
          const scaleY = canvasHeight / imgHeight;
          const scale = Math.max(scaleX, scaleY) * 1.1; // Make it slightly larger than needed
          
          // Store original scale for future reference
          img._originalScale = scale;
          
          // Apply scale and center the image
          img.set({
            scaleX: scale,
            scaleY: scale,
            originX: 'center',
            originY: 'center',
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            lockUniScaling: true, // Keep aspect ratio when scaling
            centeredScaling: true,
            centeredRotation: true,
          });
          
          // Make this the only selectable object
          img.setControlsVisibility({
            mt: false, 
            mb: false, 
            ml: false, 
            mr: false,
            bl: false,
            br: false,
            tl: false,
            tr: false,
            mtr: true // Keep rotation control
          });
          
          // Add image to canvas (after crop guide, so it appears on top)
          canvas.add(img);
          canvas.setActiveObject(img);
          
          // Center and refresh canvas
          canvas.renderAll();
          
          resolve(img);
        },
        (err) => {
          clearTimeout(timeoutId);
          reject(err);
        },
        {
          crossOrigin: 'Anonymous'
        }
      );
    } catch (err) {
      clearTimeout(timeoutId);
      reject(err);
    }
  });
};

/**
 * Zoom the canvas image
 * @param {fabric.Canvas} canvas - The Fabric.js canvas
 * @param {number} zoomFactor - Zoom factor to apply (1 = 100%)
 */
export const zoomCanvas = (canvas, zoomFactor) => {
  if (!canvas) {
    return;
  }
  
  const img = canvas.getActiveObject();
  if (!img || img.type !== 'image') {
    return;
  }
  
  // Get original scale
  const originalScale = img._originalScale || 1;
  
  // Apply zoom
  img.set({
    scaleX: originalScale * zoomFactor,
    scaleY: originalScale * zoomFactor
  });
  
  // Update canvas
  img.setCoords();
  canvas.renderAll();
};

/**
 * Enable image zoom with mouse wheel
 * @param {fabric.Canvas} canvas - The Fabric.js canvas
 */
export const enableImageZoom = (canvas) => {
  if (!canvas) {
    return;
  }
  
  canvas.on('mouse:wheel', (opt) => {
    const img = canvas.getActiveObject();
    if (!img || img.type !== 'image') return;
    
    const delta = opt.e.deltaY;
    let zoom = img.scaleX;
    
    // Determine zoom direction and apply a zoom factor
    if (delta > 0) {
      zoom = Math.max(0.5, zoom - 0.05); // Zoom out
    } else {
      zoom = Math.min(3, zoom + 0.05); // Zoom in
    }
    
    // Apply the new scale
    img.set({
      scaleX: zoom,
      scaleY: zoom
    });
    
    // Update canvas
    img.setCoords();
    canvas.renderAll();
    
    // Prevent page scrolling
    opt.e.preventDefault();
    opt.e.stopPropagation();
  });
};

/**
 * Rotate the image on the canvas
 * @param {fabric.Canvas} canvas - The Fabric.js canvas
 * @param {number} angleIncrement - Angle increment to rotate by
 */
export const rotateImage = (canvas, angleIncrement) => {
  const img = canvas.getActiveObject();
  if (!img || img.type !== 'image') return;
  
  // Get current angle
  const currentAngle = img.angle || 0;
  
  // Apply new angle
  img.set({ angle: currentAngle + angleIncrement });
  
  // Update canvas
  img.setCoords();
  canvas.renderAll();
};

/**
 * Add keyboard shortcuts for image manipulation
 * @param {fabric.Canvas} canvas - The Fabric.js canvas
 */
export const addKeyboardShortcuts = (canvas) => {
  const handler = (e) => {
    // Only process if the canvas is visible and has an active object
    const img = canvas.getActiveObject();
    if (!img || img.type !== 'image') return;
    
    // Skip if user is in an input field
    if (e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    const moveAmount = 10; // Pixels to move per arrow key press
    let handled = true;
    
    switch (e.key) {
      case 'ArrowUp':
        img.set({ top: img.top - moveAmount });
        break;
      case 'ArrowDown':
        img.set({ top: img.top + moveAmount });
        break;
      case 'ArrowLeft':
        img.set({ left: img.left - moveAmount });
        break;
      case 'ArrowRight':
        img.set({ left: img.left + moveAmount });
        break;
      case 'r':
        rotateImage(canvas, 90); // Rotate right
        break;
      case 'R':
        rotateImage(canvas, -90); // Rotate left
        break;
      case '0':
        resetImage(canvas); // Reset image
        break;
      case '+':
      case '=':
        zoomCanvas(canvas, (img.scaleX + 0.1) / (img._originalScale || 1)); // Zoom in
        break;
      case '-':
        zoomCanvas(canvas, (img.scaleX - 0.1) / (img._originalScale || 1)); // Zoom out
        break;
      default:
        handled = false;
        break;
    }
    
    if (handled) {
      e.preventDefault();
      img.setCoords();
      canvas.renderAll();
    }
  };
  
  // Add the keyboard event listener
  document.addEventListener('keydown', handler);
  
  // Return a cleanup function to remove the listener
  canvas._keyboardHandler = handler;
  
  // Cleanup function for removing event listener
  return () => {
    document.removeEventListener('keydown', canvas._keyboardHandler);
  };
};

/**
 * Reset the image to its original position and scale
 * @param {fabric.Canvas} canvas - The Fabric.js canvas
 */
export const resetImage = (canvas) => {
  const img = canvas.getActiveObject();
  if (!img || img.type !== 'image') return;
  
  // Reset image position to center
  const canvasWidth = canvas.getWidth();
  const canvasHeight = canvas.getHeight();
  
  // Calculate scale to fit image within canvas
  const imgWidth = img.width;
  const imgHeight = img.height;
  const scaleX = canvasWidth / imgWidth;
  const scaleY = canvasHeight / imgHeight;
  const scale = Math.max(scaleX, scaleY) * 1.1; // Make it slightly larger than needed
  
  // Store original scale for future reference
  img._originalScale = scale;
  
  // Reset all properties
  img.set({
    left: canvasWidth / 2,
    top: canvasHeight / 2,
    scaleX: scale,
    scaleY: scale,
    angle: 0
  });
  
  // Update canvas
  img.setCoords();
  canvas.renderAll();
};

/**
 * Generate a cropped image from the canvas based on the aspect ratio
 * @param {fabric.Canvas} canvas - The Fabric.js canvas instance
 * @param {number} aspectRatio - Aspect ratio of the panel
 * @returns {string} - Data URL of the cropped image
 */
export const generateCroppedImage = (canvas, aspectRatio) => {
  return new Promise((resolve, reject) => {
    try {
      console.log('Starting to generate cropped image with aspect ratio:', aspectRatio);
      const objects = canvas.getObjects();
      
      if (objects.length === 0) {
        reject(new Error("No objects found on canvas"));
        return;
      }
      
      // Find the image object
      const img = objects.find(obj => obj.type === 'image');
      if (!img) {
        reject(new Error("No image found on canvas"));
        return;
      }
      
      // Make sure the image is the active object
      canvas.setActiveObject(img);
      
      // Create a temporary canvas to render the cropped image
      const tempCanvas = document.createElement('canvas');
      const canvasWidth = canvas.getWidth();
      const canvasHeight = canvas.getHeight();
      
      console.log('Canvas dimensions:', { canvasWidth, canvasHeight });
      
      // Set temporary canvas dimensions
      tempCanvas.width = canvasWidth;
      tempCanvas.height = canvasHeight;
      
      // Create temporary fabric canvas
      const tempFabricCanvas = new fabric.StaticCanvas(tempCanvas);
      tempFabricCanvas.setWidth(canvasWidth);
      tempFabricCanvas.setHeight(canvasHeight);
      
      // Clone the image for rendering
      img.clone(clonedImg => {
        // Add only the image to the temporary canvas
        tempFabricCanvas.add(clonedImg);
        tempFabricCanvas.renderAll();
        
        // Convert to data URL
        const dataUrl = tempFabricCanvas.toDataURL({
          format: 'png',
          quality: 1,
          width: canvasWidth,
          height: canvasHeight
        });
        
        console.log('Generated data URL successfully');
        
        // Dispose temporary canvas
        tempFabricCanvas.dispose();
        
        resolve(dataUrl);
      });
    } catch (err) {
      console.error('Error generating cropped image:', err);
      reject(err);
    }
  });
};

// Export all functions
export default {
  initCanvas,
  loadImageToCanvas,
  zoomCanvas,
  rotateImage,
  resetImage,
  generateCroppedImage,
  enableImageZoom,
  addKeyboardShortcuts
}; 
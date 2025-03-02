import { renderTemplateToCanvas } from './CanvasLayoutRenderer';
import { sanitizePanelImageMapping, createPanelToImageUrlMapping } from './PanelMappingUtils';

/**
 * Service for collage generation
 */

const getBorderThicknessValue = (borderThickness, borderThicknessOptions) => {
  return borderThicknessOptions.find(
    option => option.label.toLowerCase() === borderThickness.toLowerCase()
  )?.value ?? 4; // Default to 4 if not found
};

/**
 * Generate a collage from the selected images, template, etc.
 * @param {Object} options - Options for collage generation
 * @returns {Promise<string>} - Promise resolving to the data URL of the generated collage
 */
export const generateCollage = async ({
  selectedTemplate,
  selectedAspectRatio,
  panelCount,
  selectedImages,
  panelImageMapping,
  borderThickness,
  borderColor = '#FFFFFF', // Default to white if not provided
  borderThicknessOptions,
  theme
}) => {
  try {
    // Sanitize the panel mapping
    const cleanMapping = sanitizePanelImageMapping(panelImageMapping, selectedImages, panelCount);
    
    // Get the numeric border thickness value
    const borderThicknessValue = getBorderThicknessValue(borderThickness, borderThicknessOptions);
    
    // Call the canvas renderer to create the collage
    const { width, height, canvasRef, dataUrl, panelRegions } = await renderCollage({
      selectedTemplate,
      selectedAspectRatio,
      borderThicknessValue,
      panelCount,
      theme
    });
    
    if (!canvasRef.current || !panelRegions || panelRegions.length === 0) {
      throw new Error('Failed to create canvas or panel regions');
    }
    
    // Get the canvas context
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    // Draw the images onto the canvas
    await drawImagesToCanvas({
      ctx,
      width,
      height, 
      panelRegions, 
      selectedImages, 
      cleanMapping,
      borderThicknessValue,
      borderColor,
      theme
    });
    
    // Return the data URL
    return canvasRef.current.toDataURL('image/png');
  } catch (error) {
    console.error('Error generating collage:', error);
    throw error;
  }
};

/**
 * Render the collage layout to a canvas
 */
const renderCollage = async ({
  selectedTemplate,
  selectedAspectRatio,
  borderThicknessValue,
  panelCount,
  theme
}) => {
  // Create canvas regions for the collage
  const panelRegions = [];
  const canvasRef = { current: document.createElement('canvas') };
  
  // Promise to capture panel regions
  await new Promise(resolve => {
    const setRenderedImage = () => {};
    const setPanelRegions = (regions) => {
      panelRegions.push(...regions);
      resolve();
    };
    
    renderTemplateToCanvas({
      selectedTemplate,
      selectedAspectRatio,
      panelCount,
      theme,
      canvasRef,
      setPanelRegions,
      setRenderedImage,
      borderThickness: borderThicknessValue
    });
  });
  
  return { 
    width: canvasRef.current.width, 
    height: canvasRef.current.height,
    canvasRef,
    panelRegions 
  };
};

/**
 * Draw images onto the collage canvas
 */
const drawImagesToCanvas = async ({
  ctx,
  width,
  height,
  panelRegions,
  selectedImages,
  cleanMapping,
  borderThicknessValue,
  borderColor = '#FFFFFF', // Default to white if not provided
  theme
}) => {
  if (selectedImages.length === 0) return;
  
  // Create a mapping from panel ID to image URL
  const panelToImageUrl = createPanelToImageUrlMapping(cleanMapping, selectedImages, panelRegions);
  
  // Clear the canvas
  ctx.clearRect(0, 0, width, height);
  
  // Set background color
  ctx.fillStyle = theme.palette.mode === 'dark' ? '#121212' : '#f5f5f5';
  ctx.fillRect(0, 0, width, height);
  
  // Collection of promises for loading images
  const imageLoadPromises = [];
  
  // Draw each panel with its assigned image
  panelRegions.forEach(panel => {
    // Ensure panel has a valid ID
    if (!panel.id) return;
    
    const imageUrl = panelToImageUrl[panel.id];
    
    if (imageUrl) {
      const promise = new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          // Draw the image within its panel region
          ctx.save();
          ctx.beginPath();
          ctx.rect(panel.x, panel.y, panel.width, panel.height);
          ctx.clip();
          
          // Calculate dimensions to maintain aspect ratio while filling the panel
          const imgAspect = img.width / img.height;
          const panelAspect = panel.width / panel.height;
          
          let drawWidth = 0;
          let drawHeight = 0;
          let drawX = 0;
          let drawY = 0;
          
          if (imgAspect > panelAspect) {
            // Image is wider than panel (proportionally)
            drawHeight = panel.height;
            drawWidth = drawHeight * imgAspect;
            drawX = panel.x + (panel.width - drawWidth) / 2;
            drawY = panel.y;
          } else {
            // Image is taller than panel (proportionally)
            drawWidth = panel.width;
            drawHeight = drawWidth / imgAspect;
            drawX = panel.x;
            drawY = panel.y + (panel.height - drawHeight) / 2;
          }
          
          // Draw the image scaled to fill the panel
          ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
          ctx.restore();
          
          // Draw panel border if needed
          if (borderThicknessValue > 0) {
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = borderThicknessValue;
            ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);
          }
          
          resolve();
        };
        
        img.onerror = () => {
          console.error(`Failed to load image: ${imageUrl}`);
          // Draw placeholder for failed image
          ctx.save();
          ctx.fillStyle = '#FF6B6B';
          ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
          ctx.restore();
          resolve(); // Still resolve so we don't block other images
        };
        
        img.src = imageUrl;
      });
      
      imageLoadPromises.push(promise);
    } else {
      // No image assigned, draw placeholder
      ctx.fillStyle = '#808080';
      ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
      
      // Draw panel border if needed
      if (borderThicknessValue > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderThicknessValue;
        ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);
      }
    }
  });
  
  // Wait for all images to load and render
  await Promise.all(imageLoadPromises);
}; 
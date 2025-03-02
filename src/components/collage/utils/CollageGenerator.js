import { renderTemplateToCanvas } from './CanvasLayoutRenderer';
import { sanitizePanelImageMapping, createPanelToImageUrlMapping } from './PanelMappingUtils';

/**
 * Service for collage generation
 */

const getBorderThicknessValue = (borderThickness, borderThicknessOptions) => {
  // If borderThickness is already a number, return it directly
  if (typeof borderThickness === 'number') {
    return borderThickness;
  }
  
  // If it's a string that can be parsed as a number, return the parsed value
  if (typeof borderThickness === 'string' && !isNaN(parseFloat(borderThickness))) {
    return parseFloat(borderThickness);
  }
  
  // Try to find by label in the options
  const matchingOption = borderThicknessOptions.find(
    option => option.label.toLowerCase() === borderThickness.toLowerCase()
  );
  
  if (matchingOption) {
    return matchingOption.value;
  }
  
  // If no match found, try to find 'medium' as fallback
  const mediumOption = borderThicknessOptions.find(
    option => option.label.toLowerCase() === 'medium'
  );
  
  if (mediumOption) {
    console.log(`Border thickness '${borderThickness}' not found, using 'medium' instead`);
    return mediumOption.value;
  }
  
  // Absolute fallback
  console.log(`No matching border thickness found for '${borderThickness}', using default`);
  return 50; // Default to a sensible medium value if all else fails
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
      borderColor,
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
  borderColor = '#FFFFFF', // Add default border color
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
      borderThickness: borderThicknessValue,
      borderColor: borderColor // Pass border color to rendering function
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
  
  // Draw placeholders for all panels first
  panelRegions.forEach(panel => {
    if (!panel.id) return;
    
    // Draw grey placeholder for all panels
    ctx.fillStyle = '#808080';
    ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
  });
  
  // Draw initial borders - this ensures borders are visible even if images fail to load
  if (borderThicknessValue > 0) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderThicknessValue;
    
    // Calculate the unique grid lines (rows and columns) from panel positions
    const horizontalLines = new Set();
    const verticalLines = new Set();
    
    // Find all unique grid lines from panel positions
    panelRegions.forEach(panel => {
      if (!panel.id) return;
      
      // Top and bottom edges
      horizontalLines.add(panel.y);
      horizontalLines.add(panel.y + panel.height);
      
      // Left and right edges
      verticalLines.add(panel.x);
      verticalLines.add(panel.x + panel.width);
    });
    
    // Convert sets to sorted arrays
    const hLines = Array.from(horizontalLines).sort((a, b) => a - b);
    const vLines = Array.from(verticalLines).sort((a, b) => a - b);
    
    // Draw all horizontal grid lines with proper alignment
    hLines.forEach(y => {
      let drawY = y;
      
      // Adjust position to ensure consistent visual thickness
      if (y === hLines[0]) {
        // Top edge: move inward by half border thickness
        drawY = y + borderThicknessValue / 2;
      } else if (y === hLines[hLines.length - 1]) {
        // Bottom edge: move inward by half border thickness
        drawY = y - borderThicknessValue / 2;
      }
      
      ctx.beginPath();
      ctx.moveTo(vLines[0], drawY);
      ctx.lineTo(vLines[vLines.length - 1], drawY);
      ctx.stroke();
    });
    
    // Draw all vertical grid lines with proper alignment
    vLines.forEach(x => {
      let drawX = x;
      
      // Adjust position to ensure consistent visual thickness
      if (x === vLines[0]) {
        // Left edge: move inward by half border thickness
        drawX = x + borderThicknessValue / 2;
      } else if (x === vLines[vLines.length - 1]) {
        // Right edge: move inward by half border thickness
        drawX = x - borderThicknessValue / 2;
      }
      
      ctx.beginPath();
      ctx.moveTo(drawX, hLines[0]);
      ctx.lineTo(drawX, hLines[hLines.length - 1]);
      ctx.stroke();
    });
  }
  
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
    }
  });
  
  // Wait for all images to load and render
  await Promise.all(imageLoadPromises);
  
  // Final border pass to ensure borders are on top of all images
  if (borderThicknessValue > 0) {
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderThicknessValue;
    
    // Calculate the unique grid lines (rows and columns) from panel positions
    const horizontalLines = new Set();
    const verticalLines = new Set();
    
    // Find all unique grid lines from panel positions
    panelRegions.forEach(panel => {
      if (!panel.id) return;
      
      // Top and bottom edges
      horizontalLines.add(panel.y);
      horizontalLines.add(panel.y + panel.height);
      
      // Left and right edges
      verticalLines.add(panel.x);
      verticalLines.add(panel.x + panel.width);
    });
    
    // Convert sets to sorted arrays
    const hLines = Array.from(horizontalLines).sort((a, b) => a - b);
    const vLines = Array.from(verticalLines).sort((a, b) => a - b);
    
    // Draw all horizontal grid lines with proper alignment
    hLines.forEach(y => {
      let drawY = y;
      
      // Adjust position to ensure consistent visual thickness
      if (y === hLines[0]) {
        // Top edge: move inward by half border thickness
        drawY = y + borderThicknessValue / 2;
      } else if (y === hLines[hLines.length - 1]) {
        // Bottom edge: move inward by half border thickness
        drawY = y - borderThicknessValue / 2;
      }
      
      ctx.beginPath();
      ctx.moveTo(vLines[0], drawY);
      ctx.lineTo(vLines[vLines.length - 1], drawY);
      ctx.stroke();
    });
    
    // Draw all vertical grid lines with proper alignment
    vLines.forEach(x => {
      let drawX = x;
      
      // Adjust position to ensure consistent visual thickness
      if (x === vLines[0]) {
        // Left edge: move inward by half border thickness
        drawX = x + borderThicknessValue / 2;
      } else if (x === vLines[vLines.length - 1]) {
        // Right edge: move inward by half border thickness
        drawX = x - borderThicknessValue / 2;
      }
      
      ctx.beginPath();
      ctx.moveTo(drawX, hLines[0]);
      ctx.lineTo(drawX, hLines[hLines.length - 1]);
      ctx.stroke();
    });
  }
}; 
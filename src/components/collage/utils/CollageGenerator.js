import { renderTemplateToCanvas } from './CanvasLayoutRenderer';
import { sanitizePanelImageMapping, createPanelToImageUrlMapping } from './PanelMappingUtils';

/**
 * Service for collage generation
 */

/**
 * Draw an upload icon in the center of an empty panel
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} panel - Panel region
 * @param {string} color - Color of the icon (used only for the plus sign)
 */
const drawUploadIcon = (ctx, panel, color = '#FFFFFF') => {
  const { x, y, width, height, consistentIconSize } = panel;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  
  // Save the current state
  ctx.save();
  
  // Use the consistent icon size if provided, otherwise calculate it based on the panel
  let iconSize;
  
  if (consistentIconSize !== undefined) {
    iconSize = consistentIconSize;
  } else {
    // Size the icon proportionally to the panel, but cap the maximum size
    // to 8% of the largest panel dimension (reduced from 10%)
    const maxSize = Math.max(width, height) * 0.08;
    const calculatedSize = Math.min(width, height) * 0.15; // Reduced from 0.18
    iconSize = Math.min(calculatedSize, maxSize);
  }
  
  // Draw a solid blue circle
  ctx.fillStyle = '#3b82f6'; // Bright blue color
  ctx.beginPath();
  ctx.arc(centerX, centerY, iconSize, 0, Math.PI * 2);
  ctx.fill();
  
  // Add white border around the circle
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(2, iconSize * 0.08); // Proportional white border
  ctx.beginPath();
  ctx.arc(centerX, centerY, iconSize, 0, Math.PI * 2);
  ctx.stroke();
  
  // Set style for the plus sign
  ctx.strokeStyle = '#FFFFFF'; // Always white plus sign for good contrast
  
  // Draw a heavy plus sign (smaller than before)
  const plusSize = iconSize * 0.45; // Smaller plus (was 0.6)
  const lineWidth = Math.max(2, iconSize * 0.12); // Thicker line for better visibility
  
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round'; // Rounded ends for better appearance
  
  // Horizontal line of plus
  ctx.beginPath();
  ctx.moveTo(centerX - plusSize, centerY);
  ctx.lineTo(centerX + plusSize, centerY);
  ctx.stroke();
  
  // Vertical line of plus
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - plusSize);
  ctx.lineTo(centerX, centerY + plusSize);
  ctx.stroke();
  
  // Restore the canvas state
  ctx.restore();
};

/**
 * Get the border thickness value, adjusted for panel count
 * @param {string|number} borderThickness - The border thickness label or value
 * @param {Array} borderThicknessOptions - Options for border thickness
 * @param {number} panelCount - Number of panels in the collage
 * @returns {number} - The adjusted border thickness value
 */
const getBorderThicknessValue = (borderThickness, borderThicknessOptions, panelCount = 2) => {
  console.log(`[DEBUG] getBorderThicknessValue - Initial borderThickness: ${borderThickness}, panelCount: ${panelCount}`);
  
  let rawThickness;
  
  // If borderThickness is already a number, return it directly
  if (typeof borderThickness === 'number') {
    console.log(`[DEBUG] borderThickness is a number: ${borderThickness}`);
    rawThickness = borderThickness;
  }
  // If it's a string that can be parsed as a number, return the parsed value
  else if (typeof borderThickness === 'string' && !Number.isNaN(parseFloat(borderThickness))) {
    rawThickness = parseFloat(borderThickness);
    console.log(`[DEBUG] borderThickness parsed from string: ${rawThickness}`);
  }
  // Try to find by label in the options
  else {
    // Log the available options for debugging
    console.log(`[DEBUG] Available borderThicknessOptions:`, 
      borderThicknessOptions.map(opt => `${opt.label}: ${opt.value}`).join(', '));
    
    const matchingOption = borderThicknessOptions.find(
      option => option.label.toLowerCase() === borderThickness.toLowerCase()
    );
    
    if (matchingOption) {
      rawThickness = matchingOption.value;
      console.log(`[DEBUG] Found matching option: ${matchingOption.label} = ${rawThickness}`);
    }
    // If no match found, try to find 'medium' as fallback
    else {
      const mediumOption = borderThicknessOptions.find(
        option => option.label.toLowerCase() === 'medium'
      );
      
      if (mediumOption) {
        console.log(`[DEBUG] Border thickness '${borderThickness}' not found, using 'medium' instead`);
        rawThickness = mediumOption.value;
      }
      else {
        // Absolute fallback
        console.log(`[DEBUG] No matching border thickness found for '${borderThickness}', using default`);
        rawThickness = 30; // Default to a sensible medium value if all else fails
      }
    }
  }
  
  // Get adjusted thickness
  const adjustedThickness = adjustForPanelCount(rawThickness, panelCount);
  console.log(`[DEBUG] Raw thickness: ${rawThickness}, After panel count adjustment: ${adjustedThickness} (panelCount: ${panelCount})`);
  
  return adjustedThickness;
};

/**
 * Adjust border thickness based on panel count
 * Scales down thickness significantly as panel count increases
 * @param {number} thickness - Original thickness value
 * @param {number} panelCount - Number of panels in the collage
 * @returns {number} - Adjusted thickness value
 */
const adjustForPanelCount = (thickness, panelCount) => {
  console.log(`[DEBUG] adjustForPanelCount - Original thickness: ${thickness}, panelCount: ${panelCount}`);
  
  if (panelCount <= 2) {
    console.log(`[DEBUG] No adjustment needed for panel count ${panelCount}`);
    return thickness; // No adjustment for 1-2 panels
  }
  
  // Apply a more aggressive scaling for more panels to ensure borders don't overwhelm the design
  let scaleFactor;
  
  switch (panelCount) {
    case 3:
      scaleFactor = 0.7; // 70% of original thickness for 3 panels
      break;
    case 4:
      scaleFactor = 0.6; // 60% of original thickness for 4 panels
      break;
    case 5:
      scaleFactor = 0.5; // 50% of original thickness for 5 panels
      break;
    default:
      scaleFactor = 0.4; // 40% of original thickness for 6+ panels (very aggressive reduction)
      break;
  }
  
  console.log(`[DEBUG] Using scale factor: ${scaleFactor} for panel count: ${panelCount}`);
  
  // Ensure minimum thickness of 1 pixel
  const adjusted = Math.max(1, Math.round(thickness * scaleFactor));
  console.log(`[DEBUG] Final adjusted thickness: ${adjusted} (original: ${thickness}, scale: ${scaleFactor})`);
  return adjusted;
};

/**
 * Finds the dimensions of the smallest panel in the layout
 * @param {Array} panelRegions - Array of panel region objects
 * @returns {Object} - Object containing the minimum width and height
 */
const findSmallestPanelDimensions = (panelRegions) => {
  if (!panelRegions || panelRegions.length === 0) {
    return { minWidth: 100, minHeight: 100 }; // Default fallback
  }
  
  // Find the smallest panel dimensions
  let minWidth = Infinity;
  let minHeight = Infinity;
  
  panelRegions.forEach(panel => {
    if (panel.width < minWidth) minWidth = panel.width;
    if (panel.height < minHeight) minHeight = panel.height;
  });
  
  return { minWidth, minHeight };
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
  console.log(`[DEBUG] generateCollage - panelCount: ${panelCount}, borderThickness: ${borderThickness}`);
  console.log(`[DEBUG] borderThicknessOptions:`, borderThicknessOptions);
  
  try {
    // Sanitize the panel mapping
    const cleanMapping = sanitizePanelImageMapping(panelImageMapping, selectedImages, panelCount);
    
    // Get the numeric border thickness value
    const borderThicknessValue = getBorderThicknessValue(borderThickness, borderThicknessOptions, panelCount);
    console.log(`[DEBUG] After getBorderThicknessValue - borderThicknessValue: ${borderThicknessValue}`);
    
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
      theme,
      panelCount
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
  console.log(`[DEBUG] renderCollage - borderThicknessValue: ${borderThicknessValue}, panelCount: ${panelCount}`);
  
  // Create canvas regions for the collage
  const panelRegions = [];
  const canvasRef = { current: document.createElement('canvas') };
  
  // Adjust border thickness based on panel count
  const adjustedBorderThickness = adjustForPanelCount(borderThicknessValue, panelCount);
  console.log(`[DEBUG] renderCollage - adjustedBorderThickness: ${adjustedBorderThickness} (original: ${borderThicknessValue})`);
  
  // Promise to capture panel regions
  await new Promise(resolve => {
    const setRenderedImage = () => {};
    const setPanelRegions = (regions) => {
      panelRegions.push(...regions);
      resolve();
    };
    
    console.log(`[DEBUG] About to call renderTemplateToCanvas with borderThickness: ${adjustedBorderThickness}`);
    renderTemplateToCanvas({
      selectedTemplate,
      selectedAspectRatio,
      panelCount,
      theme,
      canvasRef,
      setPanelRegions,
      setRenderedImage,
      borderThickness: adjustedBorderThickness,
      borderColor
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
  theme,
  panelCount
}) => {
  console.log(`[DEBUG] drawImagesToCanvas - borderThicknessValue: ${borderThicknessValue}, borderColor: ${borderColor}, panelCount: ${panelCount}`);
  
  if (selectedImages.length === 0) return;
  
  // Ensure border thickness is properly adjusted for panel count
  const adjustedBorderThickness = adjustForPanelCount(borderThicknessValue, panelCount);
  console.log(`[DEBUG] drawImagesToCanvas - adjustedBorderThickness: ${adjustedBorderThickness} (original: ${borderThicknessValue})`);
  
  // Create a mapping from panel ID to image URL
  const panelToImageUrl = createPanelToImageUrlMapping(cleanMapping, selectedImages, panelRegions);
  
  // Clear the canvas
  ctx.clearRect(0, 0, width, height);
  
  // Set background color
  ctx.fillStyle = theme.palette.mode === 'dark' ? '#121212' : '#f5f5f5';
  ctx.fillRect(0, 0, width, height);
  
  // Find the smallest panel dimensions for consistent icon sizing
  const { minWidth, minHeight } = findSmallestPanelDimensions(panelRegions);
  
  // Draw placeholders for all panels first
  panelRegions.forEach(panel => {
    if (!panel.id) return;
    
    // Draw grey placeholder for all panels
    ctx.fillStyle = '#808080';
    ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
    
    // Check if this panel has an image assigned in the mapping
    const hasImage = panelToImageUrl[panel.id] !== undefined;
    
    // Draw upload icon if panel is empty
    if (!hasImage) {
      // Use either white or dark gray based on theme to ensure visibility
      const iconColor = theme.palette.mode === 'dark' ? '#FFFFFF' : '#555555';
      
      // Calculate consistent icon size based on the smallest panel dimensions
      const maxConsistentSize = Math.max(minWidth, minHeight) * 0.08;
      const calculatedConsistentSize = Math.min(minWidth, minHeight) * 0.15;
      const consistentIconSize = Math.min(calculatedConsistentSize, maxConsistentSize);
      
      // Keep original panel position but use consistent size
      drawUploadIcon(ctx, {
        x: panel.x, 
        y: panel.y,
        width: panel.width,
        height: panel.height,
        consistentIconSize
      }, iconColor);
    }
  });
  
  // We'll skip the initial border pass and only draw borders once at the end
  
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
  if (adjustedBorderThickness > 0) {
    console.log(`[DEBUG] Drawing final borders with thickness: ${adjustedBorderThickness}, color: ${borderColor}`);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = adjustedBorderThickness;
    
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
        drawY = y + adjustedBorderThickness / 2;
      } else if (y === hLines[hLines.length - 1]) {
        // Bottom edge: move inward by half border thickness
        drawY = y - adjustedBorderThickness / 2;
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
        drawX = x + adjustedBorderThickness / 2;
      } else if (x === vLines[vLines.length - 1]) {
        // Right edge: move inward by half border thickness
        drawX = x - adjustedBorderThickness / 2;
      }
      
      ctx.beginPath();
      ctx.moveTo(drawX, hLines[0]);
      ctx.lineTo(drawX, hLines[hLines.length - 1]);
      ctx.stroke();
    });
  }
}; 
import { aspectRatioPresets, getLayoutsForPanelCount } from "../config/CollageConfig";
import { getAspectRatioCategory } from "../config/layouts/LayoutUtils";

// Debug flag - set to false in production
const DEBUG_MODE = false;

// Helper debug logger function that only logs when DEBUG_MODE is true
const debugLog = (...args) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};

// Helper for warnings that should still show in production
const debugWarn = (...args) => {
  if (DEBUG_MODE) {
    console.warn(...args);
  } else if (args[0] && args[0].includes('critical')) {
    // Allow critical warnings to show even in production
    console.warn(...args);
  }
};

// Helper for errors that should always show
const logError = (...args) => {
  console.error(...args);
};

/**
 * Get the aspect ratio value from the presets
 * @param {string} selectedAspectRatio - The ID of the selected aspect ratio
 * @returns {number} The aspect ratio value
 */
export const getAspectRatioValue = (selectedAspectRatio) => {
  const aspectRatioPreset = aspectRatioPresets.find(preset => preset.id === selectedAspectRatio);
  return aspectRatioPreset ? aspectRatioPreset.value : 1; // Default to 1 (square) if not found
};

/**
 * Calculate canvas dimensions based on the selected aspect ratio
 * @param {string} selectedAspectRatio - The ID of the selected aspect ratio
 * @returns {Object} The width and height of the canvas
 */
export const calculateCanvasDimensions = (selectedAspectRatio) => {
  const aspectRatio = getAspectRatioValue(selectedAspectRatio);
  const maxSize = 1500; // Max size for longest dimension
  
  let width;
  let height;
  
  if (aspectRatio >= 1) {
    // Landscape or square
    width = maxSize;
    height = maxSize / aspectRatio;
  } else {
    // Portrait
    height = maxSize;
    width = maxSize * aspectRatio;
  }
  
  return { width: Math.round(width), height: Math.round(height) };
};

/**
 * Helper function to parse grid template strings like "1fr 2fr" into [1, 2]
 * @param {string} template - The grid template string
 * @returns {Array} Array of parsed values
 */
const parseGridTemplate = (template) => {
  if (!template) return [1];
  
  // Handle "repeat(N, 1fr)" format
  const repeatMatch = template.match(/repeat\((\d+),\s*([^)]+)\)/);
  if (repeatMatch) {
    const count = parseInt(repeatMatch[1], 10);
    const value = parseValue(repeatMatch[2].trim());
    return Array(count).fill(value);
  }
  
  // Handle "1fr 2fr" format
  return template.split(' ').map(parseValue);
};

/**
 * Helper to parse values like "1fr" into 1
 * @param {string} value - The value to parse
 * @returns {number} The parsed value
 */
const parseValue = (value) => {
  const frMatch = value.match(/(\d+)fr/);
  if (frMatch) {
    return parseInt(frMatch[1], 10);
  }
  return 1; // Default to 1 for unsupported formats
};

/**
 * Helper function to create a default grid layout when getLayoutConfig is missing
 * @param {number} count - The panel count
 * @param {string} selectedAspectRatio - The ID of the selected aspect ratio
 * @returns {Object} The layout configuration
 */
const createDefaultGridLayout = (count, selectedAspectRatio) => {
  // Determine grid dimensions based on panel count
  let columns;
  let rows;
  
  switch(count) {
    case 1:
      columns = 1; rows = 1;
      break;
    case 2:
      columns = 2; rows = 1;
      break;
    case 3:
      columns = 3; rows = 1;
      break;
    case 4:
      columns = 2; rows = 2;
      break;
    case 5:
      if (getAspectRatioValue(selectedAspectRatio) >= 1) { // Landscape or square
        columns = Math.ceil(count/2); rows = 2;
      } else { // Portrait
        columns = 2; rows = Math.ceil(count/2);
      }
      break;
    default:
      // Generic grid for any other counts
      columns = Math.ceil(Math.sqrt(count));
      rows = Math.ceil(count / columns);
      break;
  }
  
  return {
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gridTemplateAreas: null,
    items: Array(count).fill({ gridArea: null })
  };
};

/**
 * Create layout configuration based on template ID
 * @param {string} templateId - The ID of the template
 * @param {number} count - The panel count
 * @returns {Object} The layout configuration
 */
const createLayoutConfigFromId = (templateId, count) => {
  // Two panel layouts
  if (count === 2) {
    switch(templateId) {
      case 'split-horizontal':
        return {
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr',
          gridTemplateAreas: null,
          items: Array(2).fill({ gridArea: null })
        };
      case 'split-vertical':
        return {
          gridTemplateColumns: '1fr',
          gridTemplateRows: '1fr 1fr',
          gridTemplateAreas: null,
          items: Array(2).fill({ gridArea: null })
        };
      case 'two-thirds-one-third-h':
      case 'wide-left-narrow-right':
        return {
          gridTemplateColumns: '2fr 1fr',
          gridTemplateRows: '1fr',
          gridTemplateAreas: null,
          items: Array(2).fill({ gridArea: null })
        };
      case 'one-third-two-thirds-h':
      case 'narrow-left-wide-right':
        return {
          gridTemplateColumns: '1fr 2fr',
          gridTemplateRows: '1fr',
          gridTemplateAreas: null,
          items: Array(2).fill({ gridArea: null })
        };
      case 'two-thirds-one-third-v':
      case 'wide-top-narrow-bottom':
        return {
          gridTemplateColumns: '1fr',
          gridTemplateRows: '2fr 1fr',
          gridTemplateAreas: null,
          items: Array(2).fill({ gridArea: null })
        };
      case 'one-third-two-thirds-v':
      case 'wide-bottom-narrow-top':
        return {
          gridTemplateColumns: '1fr',
          gridTemplateRows: '1fr 2fr',
          gridTemplateAreas: null,
          items: Array(2).fill({ gridArea: null })
        };
      case 'wide-75-25-split':
        return {
          gridTemplateColumns: '3fr 1fr',
          gridTemplateRows: '1fr',
          gridTemplateAreas: null,
          items: Array(2).fill({ gridArea: null })
        };
      case 'tall-75-25-split':
        return {
          gridTemplateColumns: '1fr',
          gridTemplateRows: '3fr 1fr',
          gridTemplateAreas: null,
          items: Array(2).fill({ gridArea: null })
        };
      case 'top-tall-bottom-short':
        return {
          gridTemplateColumns: '1fr',
          gridTemplateRows: '2fr 1fr',
          gridTemplateAreas: null,
          items: Array(2).fill({ gridArea: null })
        };
      case 'top-short-bottom-tall':
        return {
          gridTemplateColumns: '1fr',
          gridTemplateRows: '1fr 2fr',
          gridTemplateAreas: null,
          items: Array(2).fill({ gridArea: null })
        };
      case 'left-wide-right-narrow':
        return {
          gridTemplateColumns: '2fr 1fr',
          gridTemplateRows: '1fr',
          gridTemplateAreas: null,
          items: Array(2).fill({ gridArea: null })
        };
      case 'left-narrow-right-wide':
        return {
          gridTemplateColumns: '1fr 2fr',
          gridTemplateRows: '1fr',
          gridTemplateAreas: null,
          items: Array(2).fill({ gridArea: null })
        };
      default:
        break;
    }
  }
  
  // Three panel layouts
  if (count === 3) {
    switch(templateId) {
      case 'main-with-two-bottom':
        return {
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '2fr 1fr',
          gridTemplateAreas: '"main main" "left right"',
          areas: ['main', 'left', 'right']
        };
      case '3-columns':
        return {
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: '1fr',
          gridTemplateAreas: null,
          items: Array(3).fill({ gridArea: null })
        };
      case '3-rows':
        return {
          gridTemplateColumns: '1fr',
          gridTemplateRows: 'repeat(3, 1fr)',
          gridTemplateAreas: null,
          items: Array(3).fill({ gridArea: null })
        };
      case 'center-feature-wide':
        return {
          gridTemplateColumns: '1fr 2fr 1fr',
          gridTemplateRows: '1fr',
          gridTemplateAreas: '"left main right"',
          areas: ['left', 'main', 'right']
        };
      case 'side-stack-wide':
      case 'main-with-two-right':
        return {
          gridTemplateColumns: '2fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gridTemplateAreas: '"main top" "main bottom"',
          areas: ['main', 'top', 'bottom']
        };
      case 'center-feature-tall':
        return {
          gridTemplateColumns: '1fr',
          gridTemplateRows: '1fr 2fr 1fr',
          gridTemplateAreas: '"top" "main" "bottom"',
          areas: ['top', 'main', 'bottom']
        };
      case 'two-and-one-tall':
        return {
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gridTemplateAreas: '"left right" "bottom bottom"',
          areas: ['left', 'right', 'bottom']
        };
      default:
        break;
    }
  }
  
  // Four panel layouts
  if (count === 4) {
    switch(templateId) {
      case 'grid-2x2':
        return {
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
          gridTemplateAreas: null,
          items: Array(4).fill({ gridArea: null })
        };
      case 'big-and-3-bottom':
        return {
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: '2fr 1fr',
          gridTemplateAreas: '"main main main" "left middle right"',
          areas: ['main', 'left', 'middle', 'right']
        };
      case 'big-and-3-right':
        return {
          gridTemplateColumns: '2fr 1fr',
          gridTemplateRows: '1fr 1fr 1fr',
          gridTemplateAreas: '"main top" "main middle" "main bottom"',
          areas: ['main', 'top', 'middle', 'bottom']
        };
      case '4-columns':
        return {
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: '1fr',
          gridTemplateAreas: null,
          items: Array(4).fill({ gridArea: null })
        };
      case '4-rows':
        return {
          gridTemplateColumns: '1fr',
          gridTemplateRows: 'repeat(4, 1fr)',
          gridTemplateAreas: null,
          items: Array(4).fill({ gridArea: null })
        };
      case 'left-feature-with-3-right':
        return {
          gridTemplateColumns: '2fr 1fr',
          gridTemplateRows: 'repeat(3, 1fr)',
          gridTemplateAreas: '"main top" "main middle" "main bottom"',
          areas: ['main', 'top', 'middle', 'bottom']
        };
      case 'right-feature-with-3-left':
        return {
          gridTemplateColumns: '1fr 2fr',
          gridTemplateRows: 'repeat(3, 1fr)',
          gridTemplateAreas: '"top main" "middle main" "bottom main"',
          areas: ['top', 'middle', 'bottom', 'main']
        };
      case 'top-feature-with-3-bottom':
        return {
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: '2fr 1fr',
          gridTemplateAreas: '"main main main" "left middle right"',
          areas: ['main', 'left', 'middle', 'right']
        };
      case 'bottom-feature-with-3-top':
        return {
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: '1fr 2fr',
          gridTemplateAreas: '"left middle right" "main main main"',
          areas: ['left', 'middle', 'right', 'main']
        };
      case 'split-bottom-feature-tall':
        return {
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr 2fr',
          gridTemplateAreas: '"top-left top-right" "bottom-left bottom-right" "bottom bottom"',
          areas: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
        };
      default:
        break;
    }
  }
  
  // Five panel layouts
  if (count === 5) {
    switch(templateId) {
      case 'featured-top-with-4-below':
        return {
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: '2fr 1fr',
          gridTemplateAreas: '"main main main main" "one two three four"',
          areas: ['main', 'one', 'two', 'three', 'four']
        };
      case 'featured-left-with-4-right':
      case 'featured-left-with-grid':
        return {
          gridTemplateColumns: '2fr 1fr 1fr',
          gridTemplateRows: 'repeat(2, 1fr)',
          gridTemplateAreas: '"main top-left top-right" "main bottom-left bottom-right"',
          areas: ['main', 'top-left', 'top-right', 'bottom-left', 'bottom-right']
        };
      case 'featured-center-with-4-corners':
        return {
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          gridTemplateAreas: '"top-left . top-right" ". main ." "bottom-left . bottom-right"',
          areas: ['top-left', 'top-right', 'main', 'bottom-left', 'bottom-right']
        };
      case '5-columns':
        return {
          gridTemplateColumns: 'repeat(5, 1fr)',
          gridTemplateRows: '1fr',
          gridTemplateAreas: null,
          items: Array(5).fill({ gridArea: null })
        };
      case '5-rows':
        return {
          gridTemplateColumns: '1fr',
          gridTemplateRows: 'repeat(5, 1fr)',
          gridTemplateAreas: null,
          items: Array(5).fill({ gridArea: null })
        };
      case 'asymmetric-5':
        return {
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
          gridTemplateAreas: '"top-left top-middle top-right" "bottom-left bottom-left bottom-right"',
          areas: ['top-left', 'top-middle', 'top-right', 'bottom-left', 'bottom-right']
        };
      case 'split-5-panels':
        return {
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          gridTemplateAreas: '"top-left top-right" "middle-left middle-right" "bottom bottom"',
          areas: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom']
        };
      case 'vertical-asymmetric-5':
        return {
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          gridTemplateAreas: '"top-left top-right" "middle middle" "bottom-left bottom-right"',
          areas: ['top-left', 'top-right', 'middle', 'bottom-left', 'bottom-right']
        };
      case 'tall-mosaic':
        return {
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridTemplateRows: 'repeat(4, 1fr)',
          gridTemplateAreas: 
            '"top top" ' +
            '"middle-left middle-right" ' +
            '"middle-left middle-right" ' +
            '"bottom-left bottom-right"',
          areas: ['top', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
        };
      case 'wide-mosaic':
        return {
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          gridTemplateAreas: 
            '"left-top left-top right-top right-top" ' +
            '"left-middle left-middle right-top right-top" ' +
            '"left-bottom right-bottom right-bottom right-bottom"',
          areas: ['left-top', 'left-middle', 'left-bottom', 'right-top', 'right-bottom']
        };
      case 'featured-bottom-with-4-top':
        return {
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: '1fr 2fr',
          gridTemplateAreas: '"one two three four" "main main main main"',
          areas: ['one', 'two', 'three', 'four', 'main']
        };
      default:
        break;
    }
  }
  
  // Fall back to default grid layout if no specific layout found
  debugWarn(`Template ID '${templateId}' not found in direct mapping, using default grid layout. This ID should be added to createLayoutConfigFromId function.`);
  return createDefaultGridLayout(count);
};

/**
 * Render the template to a canvas (either offscreen or regular)
 * @param {Object} params - The parameters
 * @param {Object} params.selectedTemplate - The selected template
 * @param {string} params.selectedAspectRatio - The ID of the selected aspect ratio
 * @param {number} params.panelCount - The panel count
 * @param {Object} params.theme - The theme object
 * @param {React.RefObject} params.canvasRef - The canvas reference
 * @param {function} params.setPanelRegions - Function to set panel regions
 * @param {function} params.setRenderedImage - Function to set rendered image
 * @param {number} params.borderThickness - The border thickness
 * @param {string} params.borderColor - The border color
 * @param {Array} params.selectedImages - Array of selected images
 * @param {Object} params.panelImageMapping - Object mapping panels to images
 */
export const renderTemplateToCanvas = ({
  selectedTemplate,
  selectedAspectRatio,
  panelCount,
  theme,
  canvasRef,
  setPanelRegions,
  setRenderedImage,
  borderThickness = 4,
  borderColor = '#FFFFFF', // Add default border color
  selectedImages = [],
  panelImageMapping = {}
}) => {
  debugLog("renderTemplateToCanvas called with border thickness:", borderThickness);
  debugLog("Panel image mapping:", panelImageMapping);
  
  // Check if we have a valid template
  if (!selectedTemplate) {
    logError('No template selected for rendering');
    return;
  }
  
  const { width, height } = calculateCanvasDimensions(selectedAspectRatio);
  
  let canvas;
  let ctx;
  
  // SIMPLIFIED: Prefer using regular canvas directly when available
  if (canvasRef && canvasRef.current) {
    canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext('2d');
  } else {
    // Only use OffscreenCanvas as fallback
    try {
      canvas = new OffscreenCanvas(width, height);
      ctx = canvas.getContext('2d');
    } catch (error) {
      logError("No canvas available for rendering");
      return;
    }
  }
  
  // Clear the canvas with a dark or light background based on theme
  ctx.fillStyle = theme.palette.mode === 'dark' ? '#121212' : '#f5f5f5';
  ctx.fillRect(0, 0, width, height);
  
  // Get layout configuration based on the template
  let layoutConfig;
  
  try {
    // Use simple approach to get layout config
    if (selectedTemplate.getLayoutConfig && typeof selectedTemplate.getLayoutConfig === 'function') {
      layoutConfig = selectedTemplate.getLayoutConfig();
    } else if (selectedTemplate.id) {
      layoutConfig = createLayoutConfigFromId(selectedTemplate.id, panelCount);
    } else {
      layoutConfig = createDefaultGridLayout(panelCount, selectedAspectRatio);
    }
  } catch (error) {
    logError('Error determining layout configuration:', error);
    // Create a simple default layout as fallback
    layoutConfig = createDefaultGridLayout(panelCount, selectedAspectRatio);
  }
  
  if (!layoutConfig) {
    logError('No layout configuration found for the selected template');
    // Use default grid as absolute fallback
    layoutConfig = createDefaultGridLayout(panelCount, selectedAspectRatio);
  }
  
  try {
    // Draw the layout panels
    const newPanelRegions = [];
    
    // Simplified: Parse grid templates directly for layout
    const columns = parseGridTemplate(layoutConfig.gridTemplateColumns);
    const rows = parseGridTemplate(layoutConfig.gridTemplateRows);
    
    // Calculate cell dimensions
    const totalColumnFr = columns.reduce((sum, val) => sum + val, 0);
    const totalRowFr = rows.reduce((sum, val) => sum + val, 0);
    
    const cellWidths = columns.map(fr => (fr / totalColumnFr) * width);
    const cellHeights = rows.map(fr => (fr / totalRowFr) * height);
    
    // Set styles for the border
    ctx.strokeStyle = borderColor || 'white'; // Use provided border color or default to white
    ctx.lineWidth = borderThickness;
    ctx.fillStyle = '#808080'; // Grey placeholder for panels
    
    const shouldDrawBorder = borderThickness > 0;
    
    // Calculate grid positions
    const rowPositions = [];
    let currentY = 0;
    rows.forEach((_, index) => {
      rowPositions[index] = currentY;
      currentY += cellHeights[index];
    });
    
    const colPositions = [];
    let currentX = 0;
    columns.forEach((_, index) => {
      colPositions[index] = currentX;
      currentX += cellWidths[index];
    });
    
    // Simple grid renderer - draw each panel in order
    let panelIndex = 0;
    
    // Step 1: Draw all panels without borders first
    for (let row = 0; row < rows.length && panelIndex < panelCount; row += 1) {
      for (let col = 0; col < columns.length && panelIndex < panelCount; col += 1) {
        const x = colPositions[col];
        const y = rowPositions[row];
        const width = cellWidths[col];
        const height = cellHeights[row];
        
        // Draw panel placeholder
        ctx.fillRect(x, y, width, height);
        
        // Store panel region
        newPanelRegions.push({
          id: panelIndex,
          name: `panel-${panelIndex}`,
          x,
          y,
          width,
          height
        });
        
        panelIndex += 1;
      }
    }
    
    // Step 2: Draw grid lines directly (not panel borders) to avoid doubling inner borders
    if (shouldDrawBorder && borderThickness > 0) {
      // Calculate all grid line positions
      const horizontalLines = new Set();
      const verticalLines = new Set();
      
      // Add outer canvas border positions
      horizontalLines.add(0); // Top edge
      horizontalLines.add(height); // Bottom edge
      verticalLines.add(0); // Left edge
      verticalLines.add(width); // Right edge
      
      // Add interior grid lines from row and column positions
      rowPositions.forEach((pos, index) => {
        if (index > 0) horizontalLines.add(pos);
      });
      
      colPositions.forEach((pos, index) => {
        if (index > 0) verticalLines.add(pos);
      });
      
      // Convert to sorted arrays
      const sortedHLines = Array.from(horizontalLines).sort((a, b) => a - b);
      const sortedVLines = Array.from(verticalLines).sort((a, b) => a - b);
      
      // Draw all horizontal grid lines with proper alignment
      sortedHLines.forEach(y => {
        let drawY = y;
        
        // Adjust the position to ensure equal visual thickness
        if (y === 0) {
          // Top edge: move inward by half border thickness
          drawY = borderThickness / 2;
        } else if (y === height) {
          // Bottom edge: move inward by half border thickness
          drawY = height - borderThickness / 2;
        }
        
        ctx.beginPath();
        ctx.moveTo(0, drawY);
        ctx.lineTo(width, drawY);
        ctx.stroke();
      });
      
      // Draw all vertical grid lines with proper alignment
      sortedVLines.forEach(x => {
        let drawX = x;
        
        // Adjust the position to ensure equal visual thickness
        if (x === 0) {
          // Left edge: move inward by half border thickness
          drawX = borderThickness / 2;
        } else if (x === width) {
          // Right edge: move inward by half border thickness
          drawX = width - borderThickness / 2;
        }
        
        ctx.beginPath();
        ctx.moveTo(drawX, 0);
        ctx.lineTo(drawX, height);
        ctx.stroke();
      });
    }
    
    // Generate initial canvas image without waiting for images to load
    if (canvas instanceof OffscreenCanvas) {
      canvas.convertToBlob({ type: 'image/png' })
        .then(blob => {
          const url = URL.createObjectURL(blob);
          setRenderedImage(url);
        })
        .catch(err => {
          logError('Error converting canvas to blob:', err);
          if (canvasRef && canvasRef.current) {
            setRenderedImage(canvasRef.current.toDataURL('image/png'));
          }
        });
    } else {
      try {
        setRenderedImage(canvas.toDataURL('image/png'));
      } catch (err) {
        logError('Error converting canvas to data URL:', err);
      }
    }
    
    // Step 3: Now load and draw images
    const imageLoadPromises = [];
    
    newPanelRegions.forEach(panel => {
      const panelId = panel.id;
      const imageIndex = panelImageMapping[panelId];
      
      if (typeof imageIndex === 'number' && 
          imageIndex >= 0 && 
          imageIndex < selectedImages.length) {
        
        // Get image URL
        const imageItem = selectedImages[imageIndex];
        const imageUrl = typeof imageItem === 'object' && imageItem !== null 
          ? (imageItem.url || imageItem.imageUrl || imageItem) 
          : imageItem;
          
        // Load the image
        const imgPromise = new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            // Calculate scaling to fit panel
            const imgAspect = img.width / img.height;
            const panelAspect = panel.width / panel.height;
            
            let drawWidth;
            let drawHeight;
            let offsetX = 0; 
            let offsetY = 0;
            
            if (imgAspect > panelAspect) {
              // Image is wider
              drawHeight = panel.height;
              drawWidth = panel.height * imgAspect;
              offsetX = (panel.width - drawWidth) / 2;
            } else {
              // Image is taller
              drawWidth = panel.width;
              drawHeight = panel.width / imgAspect;
              offsetY = (panel.height - drawHeight) / 2;
            }
            
            // Draw the image
            ctx.save();
            ctx.beginPath();
            ctx.rect(panel.x, panel.y, panel.width, panel.height);
            ctx.clip();
            ctx.drawImage(img, panel.x + offsetX, panel.y + offsetY, drawWidth, drawHeight);
            ctx.restore();
            
            resolve();
          };
          
          // Handle image loading errors
          img.onerror = () => {
            logError(`Failed to load image for panel ${panelId}`);
            
            // Redraw with error indicator
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';  // Red with opacity
            ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
            ctx.fillStyle = '#808080';  // Reset fill color
            
            resolve();
          };
          
          // Set image source - with special handling for base64
          if (imageUrl && imageUrl.startsWith('data:image')) {
            img.src = imageUrl;
          } else if (imageUrl) {
            // Add cache busting for regular URLs
            img.src = imageUrl.includes('?') ? imageUrl : `${imageUrl}?t=${Date.now()}`;
            if (!imageUrl.startsWith('blob:')) {
              img.crossOrigin = 'anonymous';
            }
          } else {
            resolve(); // No valid URL, just resolve
          }
        });
        
        imageLoadPromises.push(imgPromise);
      }
    });
    
    // After all images are loaded, draw final borders
    Promise.all(imageLoadPromises).then(() => {
      // Final border pass after all images are drawn
      if (shouldDrawBorder && borderThickness > 0) {
        ctx.strokeStyle = borderColor || 'white';
        ctx.lineWidth = borderThickness;
        
        // Calculate all grid line positions
        const horizontalLines = new Set();
        const verticalLines = new Set();
        
        // Add outer canvas border positions
        horizontalLines.add(0); // Top edge
        horizontalLines.add(height); // Bottom edge
        verticalLines.add(0); // Left edge
        verticalLines.add(width); // Right edge
        
        // Add interior grid lines from row and column positions
        rowPositions.forEach((pos, index) => {
          if (index > 0) horizontalLines.add(pos);
        });
        
        colPositions.forEach((pos, index) => {
          if (index > 0) verticalLines.add(pos);
        });
        
        // Convert to sorted arrays
        const sortedHLines = Array.from(horizontalLines).sort((a, b) => a - b);
        const sortedVLines = Array.from(verticalLines).sort((a, b) => a - b);
        
        // Draw all horizontal grid lines with proper alignment
        sortedHLines.forEach(y => {
          let drawY = y;
          
          // Adjust the position to ensure equal visual thickness
          if (y === 0) {
            // Top edge: move inward by half border thickness
            drawY = borderThickness / 2;
          } else if (y === height) {
            // Bottom edge: move inward by half border thickness
            drawY = height - borderThickness / 2;
          }
          
          ctx.beginPath();
          ctx.moveTo(0, drawY);
          ctx.lineTo(width, drawY);
          ctx.stroke();
        });
        
        // Draw all vertical grid lines with proper alignment
        sortedVLines.forEach(x => {
          let drawX = x;
          
          // Adjust the position to ensure equal visual thickness
          if (x === 0) {
            // Left edge: move inward by half border thickness
            drawX = borderThickness / 2;
          } else if (x === width) {
            // Right edge: move inward by half border thickness
            drawX = width - borderThickness / 2;
          }
          
          ctx.beginPath();
          ctx.moveTo(drawX, 0);
          ctx.lineTo(drawX, height);
          ctx.stroke();
        });
      }
      
      // Update the final image
      if (canvas instanceof OffscreenCanvas) {
        canvas.convertToBlob({ type: 'image/png' })
          .then(blob => {
            const url = URL.createObjectURL(blob);
            setRenderedImage(url);
          })
          .catch(err => {
            logError('Error converting canvas to blob:', err);
            if (canvasRef && canvasRef.current) {
              setRenderedImage(canvasRef.current.toDataURL('image/png'));
            }
          });
      } else {
        try {
          setRenderedImage(canvas.toDataURL('image/png'));
        } catch (err) {
          logError('Error converting canvas to data URL:', err);
        }
      }
    });
    
    // Update panel regions state
    setPanelRegions(newPanelRegions);
  } catch (error) {
    logError('Error during template rendering:', error);
    
    // Provide a basic fallback
    if (canvas) {
      ctx.fillStyle = '#ccc';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#555';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Error rendering template', width/2, height/2);
      
      try {
        if (canvas instanceof OffscreenCanvas) {
          canvas.convertToBlob({ type: 'image/png' })
            .then(blob => {
              const url = URL.createObjectURL(blob);
              setRenderedImage(url);
            })
            .catch(() => {
              if (canvasRef && canvasRef.current) {
                setRenderedImage(canvasRef.current.toDataURL('image/png'));
              }
            });
        } else {
          setRenderedImage(canvas.toDataURL('image/png'));
        }
      } catch (err) {
        logError('Error generating fallback image:', err);
      }
    }
  }
}; 
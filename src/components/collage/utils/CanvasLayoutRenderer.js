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
 * @param {Array} params.displayImageUrls - Array of display image URLs
 * @param {Object} params.panelImageMapping - Object mapping panels to images
 */
export const renderTemplateToCanvas = async ({
  selectedTemplate,
  selectedAspectRatio,
  panelCount,
  theme,
  canvasRef,
  setPanelRegions,
  setRenderedImage,
  borderThickness = 4,
  borderColor = '#FFFFFF', // Add default border color
  displayImageUrls = [],
  panelImageMapping = {}
}) => {
  console.log(`[RENDERER DEBUG] renderTemplateToCanvas received borderThickness: ${borderThickness}, panelCount: ${panelCount}, borderColor: ${borderColor}`);
  debugLog("renderTemplateToCanvas called with border thickness:", borderThickness);
  debugLog("renderTemplateToCanvas called with border color:", borderColor);
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
    
    // Save the border settings for later
    const shouldDrawBorder = borderThickness > 0;
    ctx.fillStyle = '#808080'; // Grey placeholder for panels
    
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
    
    // Create panel regions based on the layout configuration
    let panelIndex = 0;
    
    // Check if we have grid template areas defined for complex layouts
    if (layoutConfig.gridTemplateAreas && layoutConfig.areas && layoutConfig.areas.length > 0) {
      debugLog("Using grid template areas for complex layout", layoutConfig.gridTemplateAreas);
      
      // Parse the grid template areas - handle different string formats
      let gridAreasMatrix = [];
      const areasString = layoutConfig.gridTemplateAreas.trim();
      
      // Reset matrix for fresh parsing
      console.log("Original grid template areas string:", areasString);
      
      // Enhanced parsing of grid template areas with better format handling
      try {
        // Fix the parsing of grid template areas formatted as quoted strings
        if (areasString.includes('"')) {
          // Extract each quoted group using regex to properly split multi-row templates
          const matches = areasString.match(/"([^"]+)"/g) || [];
          
          if (matches.length > 0) {
            gridAreasMatrix = matches.map(quotedRow => {
              // Remove quotes and split by whitespace
              return quotedRow
                .replace(/"/g, '')
                .trim()
                .split(/\s+/)
                .filter(Boolean);
            });
            
            console.log("Parsed grid areas matrix from quotes:", gridAreasMatrix);
          } else {
            // Fallback if regex failed
            gridAreasMatrix = [areasString.replace(/"/g, '').trim().split(/\s+/).filter(Boolean)];
          }
        } else if (areasString.includes('\n')) {
          // Format with newlines only
          gridAreasMatrix = areasString
            .split('\n')
            .map(row => row.trim().split(/\s+/).filter(Boolean))
            .filter(row => row.length > 0);
        } else {
          // Single line format without quotes
          gridAreasMatrix = [areasString.trim().split(/\s+/).filter(Boolean)];
        }
        
        // Add validation to ensure we have a valid matrix
        if (gridAreasMatrix.length === 0 || gridAreasMatrix.some(row => row.length === 0)) {
          console.warn('Empty grid areas matrix after parsing, falling back to simple format');
          // Fallback to simplest parsing
          gridAreasMatrix = [areasString.replace(/"/g, '').trim().split(/\s+/)];
        }
      } catch (error) {
        console.error('Error parsing grid template areas:', error);
        // Fallback to simpler parsing as a last resort
        gridAreasMatrix = [areasString.replace(/["\n]/g, ' ').trim().split(/\s+/).filter(Boolean)];
      }
      
      console.log("Grid areas matrix after parsing:", JSON.stringify(gridAreasMatrix));
      
      // Validate that the grid areas matrix has the expected structure
      const rowCount = gridAreasMatrix.length;
      const colCount = Math.max(...gridAreasMatrix.map(row => row.length));
      
      console.log(`Grid dimensions: ${rowCount} rows × ${colCount} columns`);
      
      // Create a map of area name to panel region
      const areaToRegionMap = {};
      const allAreas = new Set(); // Track all unique areas found in the matrix

      // First pass: determine the boundaries of each named area
      gridAreasMatrix.forEach((row, rowIndex) => {
        row.forEach((areaName, colIndex) => {
          if (areaName !== '.' && areaName !== '') { // Skip empty cells
            allAreas.add(areaName); // Add to set of all areas
            
            if (!areaToRegionMap[areaName]) {
              areaToRegionMap[areaName] = {
                minRow: rowIndex,
                maxRow: rowIndex,
                minCol: colIndex,
                maxCol: colIndex
              };
            } else {
              // Update boundaries for this area
              areaToRegionMap[areaName].minRow = Math.min(areaToRegionMap[areaName].minRow, rowIndex);
              areaToRegionMap[areaName].maxRow = Math.max(areaToRegionMap[areaName].maxRow, rowIndex);
              areaToRegionMap[areaName].minCol = Math.min(areaToRegionMap[areaName].minCol, colIndex);
              areaToRegionMap[areaName].maxCol = Math.max(areaToRegionMap[areaName].maxCol, colIndex);
            }
          }
        });
      });
      
      debugLog("Area to region map:", areaToRegionMap);
      debugLog("All areas found in matrix:", [...allAreas]);

      // Check if we have areas in the grid template that aren't in the areas array
      // This might indicate a mismatch in the template definition
      const missingAreas = [];
      allAreas.forEach(area => {
        if (!layoutConfig.areas.includes(area)) {
          missingAreas.push(area);
        }
      });
      
      if (missingAreas.length > 0) {
        debugWarn(`Found areas in grid template that aren't in the areas array: ${missingAreas.join(', ')}`);
        // If we have extra areas in the template, add them to the areas array to ensure we create all needed panels
        // Only do this if the total doesn't exceed panelCount
        if (layoutConfig.areas.length + missingAreas.length <= panelCount) {
          debugLog(`Adding missing areas to the areas array: ${missingAreas.join(', ')}`);
          layoutConfig.areas = [...layoutConfig.areas, ...missingAreas];
        }
      }
      
      // Create a special fallback order if needed - use all areas from the matrix
      // in case the areas array is missing or incomplete
      const fallbackOrder = [...allAreas];
      
      // Second pass: create panel regions using either template areas or fallback
      // Important: Process areas in the same order they're specified in the template's areas array
      // This ensures image mappings work correctly
      const createdPanels = new Set();
      
      // Use areas specified in the template, or fall back to all areas found in the matrix
      const areasToProcess = layoutConfig.areas.length > 0 ? layoutConfig.areas : fallbackOrder;
      
      areasToProcess.forEach((areaName, index) => {
        if (index >= panelCount) return; // Don't create more panels than needed
        
        const region = areaToRegionMap[areaName];
        if (!region) {
          debugWarn(`Area '${areaName}' not found in grid template areas`);
          return;
        }
        
        try {
          // Calculate the panel's dimensions and position
          const x = colPositions[region.minCol];
          const y = rowPositions[region.minRow];
          
          // Debug the positions and ranges for this panel
          console.log(`Panel '${areaName}' grid position:`, {
            rowRange: [region.minRow, region.maxRow],
            colRange: [region.minCol, region.maxCol],
            rowPos: rowPositions.slice(region.minRow, region.maxRow + 1),
            colPos: colPositions.slice(region.minCol, region.maxCol + 1),
            cellWidths: cellWidths.slice(region.minCol, region.maxCol + 1),
            cellHeights: cellHeights.slice(region.minRow, region.maxRow + 1)
          });
          
          // If any positions or dimensions are missing, use safe fallbacks
          const fallbackX = typeof colPositions[0] === 'number' ? colPositions[0] : 0;
          const fallbackY = typeof rowPositions[0] === 'number' ? rowPositions[0] : 0;
          const fixedX = typeof x === 'number' ? x : fallbackX;
          const fixedY = typeof y === 'number' ? y : fallbackY;
          
          // Log a warning if we had to use fallbacks
          if (x === undefined || y === undefined) {
            console.warn(`Position undefined for panel '${areaName}', using fallback position x=${fixedX}, y=${fixedY}`);
          }
          
          // Calculate width differently - first ensure we have valid column positions
          let panelWidth = 0;
          if (region.minCol < colPositions.length && region.maxCol < colPositions.length) {
            if (region.maxCol > region.minCol) {
              // Start with the position difference
              panelWidth = colPositions[region.maxCol] - colPositions[region.minCol];
              // Add the width of the last cell
              panelWidth += cellWidths[region.maxCol];
            } else {
              // Just use the width of a single cell
              panelWidth = cellWidths[region.minCol];
            }
          } else {
            // Fallback: use a percentage of the total width
            panelWidth = width / colCount;
          }
          
          // Calculate height similarly
          let panelHeight = 0;
          if (region.minRow < rowPositions.length && region.maxRow < rowPositions.length) {
            if (region.maxRow > region.minRow) {
              // Start with the position difference
              panelHeight = rowPositions[region.maxRow] - rowPositions[region.minRow];
              // Add the height of the last cell
              panelHeight += cellHeights[region.maxRow];
            } else {
              // Just use the height of a single cell
              panelHeight = cellHeights[region.minRow];
            }
          } else {
            // Fallback: use a percentage of the total height
            panelHeight = height / rowCount;
          }
          
          // Ensure the panel has valid dimensions
          if (!Number.isFinite(fixedX) || !Number.isFinite(fixedY) || !Number.isFinite(panelWidth) || !Number.isFinite(panelHeight) || 
              panelWidth <= 0 || panelHeight <= 0) {
            debugWarn(`Invalid panel dimensions for area '${areaName}':`, 
              { x: fixedX, y: fixedY, width: panelWidth, height: panelHeight });
            return;
          }
          
          // Draw panel placeholder - Make sure to use grey color for all panels
          ctx.fillStyle = '#808080'; // Ensure consistent grey color for placeholders
          ctx.fillRect(fixedX, fixedY, panelWidth, panelHeight);
          
          // Use consistent panel IDs based on index in the areas array
          // This ensures that panel IDs match what the template and UI expect
          const panelId = index;
          
          // Store panel region
          newPanelRegions.push({
            id: panelId,
            name: areaName,
            x: fixedX,
            y: fixedY,
            width: panelWidth,
            height: panelHeight
          });
          
          createdPanels.add(areaName);
          panelIndex = Math.max(panelIndex, index + 1);
        } catch (error) {
          console.error(`Error creating panel for area '${areaName}':`, error);
        }
      });
      
      // Diagnostic information
      debugLog(`Created ${newPanelRegions.length} panels out of expected ${panelCount}`);
      if (newPanelRegions.length < panelCount) {
        debugWarn(`Missing ${panelCount - newPanelRegions.length} panels in the layout`);
      }
      
      // Log warning if areas defined in the matrix weren't used
      Object.keys(areaToRegionMap).forEach(areaName => {
        if (!createdPanels.has(areaName) && areaName !== '.') {
          debugWarn(`Area '${areaName}' defined in grid template but not used in panel creation`);
        }
      });
    } else {
      // Use simple grid layout for templates without grid areas
      debugLog("Using simple grid layout with columns and rows");
      
      // Step 1: Draw all panels without borders first
      for (let row = 0; row < rows.length && panelIndex < panelCount; row += 1) {
        for (let col = 0; col < columns.length && panelIndex < panelCount; col += 1) {
          try {
            const x = colPositions[col];
            const y = rowPositions[row];
            const width = cellWidths[col];
            const height = cellHeights[row];
            
            // Ensure the panel has valid dimensions
            if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height) || 
                width <= 0 || height <= 0) {
              debugWarn(`Invalid panel dimensions at grid position [${row}][${col}]:`, 
                { x, y, width, height });
              return;
            }
            
            // Draw panel placeholder with consistent color
            ctx.fillStyle = '#808080'; // Ensure consistent grey color for placeholders
            ctx.fillRect(x, y, width, height);
            
            // Store panel region
            const panel = {
              id: panelIndex,
              name: `panel-${panelIndex}`,
              x,
              y,
              width,
              height
            };
            
            newPanelRegions.push(panel);
            
            panelIndex += 1;
          } catch (error) {
            console.error(`Error creating panel at grid position [${row}][${col}]:`, error);
          }
        }
      }
    }
    
    // Find the smallest panel dimensions after all panels are created
    const { minWidth, minHeight } = findSmallestPanelDimensions(newPanelRegions);
    
    // Draw upload icons after determining consistent size based on smallest panel
    newPanelRegions.forEach(panel => {
      // Check if this panel has an image assigned
      const hasImage = panelImageMapping && 
                       Object.prototype.hasOwnProperty.call(panelImageMapping, panel.id) && 
                       typeof panelImageMapping[panel.id] === 'number';
      
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
    
    // Set styles for the border - we'll only draw borders once after all images are loaded
    if (shouldDrawBorder) {
      console.log(`[RENDERER DEBUG] Setting border properties: color=${borderColor}, thickness=${borderThickness}`);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderThickness;
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
          imageIndex < displayImageUrls.length) {
        
        // Get image URL
        const imageUrl = displayImageUrls[imageIndex];
          
        // Load the image
        const imgPromise = new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous'; // Allow loading from different origins
          
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
          if (imageUrl && typeof imageUrl === 'string') {
            if (imageUrl.startsWith('data:image')) {
              img.src = imageUrl;
            } else {
              // Add cache busting for regular URLs
              img.src = imageUrl.includes('?') ? imageUrl : `${imageUrl}?t=${Date.now()}`;
              if (!imageUrl.startsWith('blob:')) {
                img.crossOrigin = 'anonymous';
              }
            }
          } else {
            resolve(); // No valid URL, just resolve
          }
        });
        
        imageLoadPromises.push(imgPromise);
      }
    });
    
    // After all images are loaded, draw final borders
    await Promise.all(imageLoadPromises).then(() => {
      // Final border pass after all images are drawn
      if (shouldDrawBorder && borderThickness > 0) {
        console.log(`[RENDERER DEBUG] Drawing final borders with thickness: ${borderThickness}, color: ${borderColor}`);
        
        // NEW APPROACH: Draw borders around each panel directly instead of grid lines
        // This ensures complex layouts with spanning areas are rendered correctly
        
        // Ensure we use the correct border color and thickness
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderThickness;

        // First identify all unique edges to avoid double-drawing borders
        const edges = new Map(); // Map of edge key to edge object
        
        // Helper to create a unique key for an edge - with better error checking
        const getEdgeKey = (x1, y1, x2, y2) => {
          // Ensure all inputs are valid numbers
          if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) {
            console.error('Invalid coordinates for edge key:', { x1, y1, x2, y2 });
            return 'invalid-edge'; // Return a placeholder to avoid crashes
          }
          
          // Normalize coordinates to ensure the same edge from either direction has the same key
          const [minX, maxX] = x1 < x2 ? [x1, x2] : [x2, x1];
          const [minY, maxY] = y1 < y2 ? [y1, y2] : [y2, y1];
          
          return `${minX.toFixed(2)}-${minY.toFixed(2)}-${maxX.toFixed(2)}-${maxY.toFixed(2)}`;
        };
        
        // Collect all panel edges
        newPanelRegions.forEach(panel => {
          // Ensure valid coordinates before creating edges
          if (!panel || typeof panel.x !== 'number' || typeof panel.y !== 'number' || 
              typeof panel.width !== 'number' || typeof panel.height !== 'number') {
            console.error('Invalid panel region:', panel);
            return; // Skip this panel
          }
          
          // Use safe calculation and verify values
          const x = panel.x;
          const y = panel.y;
          const right = x + panel.width;
          const bottom = y + panel.height;
          
          // Add edges only if coordinates are valid (defensive programming)
          if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(right) && Number.isFinite(bottom)) {
            try {
              // Top edge
              edges.set(getEdgeKey(x, y, right, y), { x1: x, y1: y, x2: right, y2: y });
              // Right edge
              edges.set(getEdgeKey(right, y, right, bottom), { x1: right, y1: y, x2: right, y2: bottom });
              // Bottom edge
              edges.set(getEdgeKey(x, bottom, right, bottom), { x1: x, y1: bottom, x2: right, y2: bottom });
              // Left edge
              edges.set(getEdgeKey(x, y, x, bottom), { x1: x, y1: y, x2: x, y2: bottom });
            } catch (e) {
              console.error('Error adding edge:', e, panel);
            }
          } else {
            console.error('Invalid panel coordinates:', panel);
          }
        });
        
        // Draw each unique edge once with proper offset
        edges.forEach((edge, key) => {
          if (key === 'invalid-edge' || !edge || 
              !Number.isFinite(edge.x1) || !Number.isFinite(edge.y1) || 
              !Number.isFinite(edge.x2) || !Number.isFinite(edge.y2)) {
            return; // Skip invalid edges
          }
          
          const offset = borderThickness / 2;
          let { x1, y1, x2, y2 } = edge;
          
          // If it's an outer edge, adjust it inward
          if (Math.abs(x1) < 0.01) x1 = offset;
          if (Math.abs(y1) < 0.01) y1 = offset;
          if (Math.abs(x2 - width) < 0.01) x2 = width - offset;
          if (Math.abs(y2 - height) < 0.01) y2 = height - offset;
          
          try {
            // Draw the line
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          } catch (e) {
            console.error('Error drawing edge:', e, edge);
          }
        });
        
        try {
          // Draw the outer canvas border with proper thickness
          ctx.strokeRect(
            borderThickness / 2, 
            borderThickness / 2, 
            width - borderThickness, 
            height - borderThickness
          );
        } catch (e) {
          console.error('Error drawing outer border:', e);
        }
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
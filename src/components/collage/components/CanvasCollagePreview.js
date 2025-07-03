import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Box, IconButton, Typography, TextField, Slider, FormControl, InputLabel, Select, MenuItem, Button, Tabs, Tab } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Add, OpenWith, Check, Edit, FormatColorText, Close, FormatSize, BorderOuter, FormatBold, FontDownload } from '@mui/icons-material';
import { layoutDefinitions } from '../config/layouts';
import fonts from '../../../utils/fonts';

/**
 * Helper function to get border pixel size based on percentage and component width
 */
const getBorderPixelSize = (borderThickness, componentWidth = 400) => {
  if (typeof borderThickness === 'number') {
    return Math.round((borderThickness / 100) * componentWidth);
  }
  return 0;
};

/**
 * Helper function to create layout config from template
 */
const createLayoutConfig = (template, panelCount) => {
  if (!template) return null;
  
  console.log("Creating layout config for template:", template);
  
  try {
    // Look up the original layout in the layout definitions
    const panelCountKey = Math.max(2, Math.min(panelCount, 5));
    const categories = layoutDefinitions[panelCountKey];
    
    // Search for the layout in all categories (wide, tall, square)
    if (categories) {
      const foundLayout = Object.keys(categories).reduce((result, category) => {
        if (result) return result; // Already found a layout
        
        const layouts = categories[category];
        const originalLayout = layouts.find(l => l.id === template.id);
        
        if (originalLayout && typeof originalLayout.getLayoutConfig === 'function') {
          return originalLayout;
        }
        
        return null;
      }, null);
      
      if (foundLayout) {
        console.log("Found layout, getting config:", foundLayout);
        return foundLayout.getLayoutConfig();
      }
    }
    
    console.log("No layout found, using default grid");
    // Fallback to a basic grid layout in case of error
    return {
      gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(panelCount))}, 1fr)`,
      gridTemplateRows: `repeat(${Math.ceil(panelCount / Math.ceil(Math.sqrt(panelCount)))}, 1fr)`,
      gridTemplateAreas: null,
      items: Array(panelCount).fill({ gridArea: null })
    };
  } catch (error) {
    console.error("Error creating layout config:", error, template);
    // Fallback to a basic grid layout in case of error
    return {
      gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(panelCount))}, 1fr)`,
      gridTemplateRows: `repeat(${Math.ceil(panelCount / Math.ceil(Math.sqrt(panelCount)))}, 1fr)`,
      gridTemplateAreas: null,
      items: Array(panelCount).fill({ gridArea: null })
    };
  }
};

/**
 * Helper function to parse CSS grid template areas string
 */
const parseGridTemplateAreas = (gridTemplateAreas) => {
  if (!gridTemplateAreas) return {};
  
  const areas = {};
  
  // Split by quotes to get individual rows
  // Handle both 'row1' 'row2' and "row1" "row2" formats
  const cleanString = gridTemplateAreas.trim();
  let rows;
  
  if (cleanString.includes('" "')) {
    // Format: "main main" "left right"
    rows = cleanString.split('" "').map(row => 
      row.replace(/"/g, '').trim().split(/\s+/)
    );
  } else if (cleanString.includes("' '")) {
    // Format: 'main main' 'left right'
    rows = cleanString.split("' '").map(row => 
      row.replace(/'/g, '').trim().split(/\s+/)
    );
  } else {
    // Single row or space-separated format
    rows = [cleanString.replace(/['"]/g, '').trim().split(/\s+/)];
  }
  
  // Find the bounds of each named area
  rows.forEach((row, rowIndex) => {
    row.forEach((areaName, colIndex) => {
      if (areaName !== '.' && areaName !== '') {
        if (!areas[areaName]) {
          areas[areaName] = {
            rowStart: rowIndex,
            rowEnd: rowIndex,
            colStart: colIndex,
            colEnd: colIndex
          };
        } else {
          // Extend the area bounds
          areas[areaName].rowStart = Math.min(areas[areaName].rowStart, rowIndex);
          areas[areaName].rowEnd = Math.max(areas[areaName].rowEnd, rowIndex);
          areas[areaName].colStart = Math.min(areas[areaName].colStart, colIndex);
          areas[areaName].colEnd = Math.max(areas[areaName].colEnd, colIndex);
        }
      }
    });
  });
  
  return areas;
};

/**
 * Helper function to parse CSS grid template and convert to panel rectangles
 */
const parseGridToRects = (layoutConfig, containerWidth, containerHeight, panelCount, borderPixels) => {
  const rects = [];
  
  // Calculate the available space (subtract borders)
  const totalPadding = borderPixels * 2;
  const availableWidth = containerWidth - totalPadding;
  const availableHeight = containerHeight - totalPadding;
  
  // Parse grid template columns/rows to get exact dimensions and track sizes
  let columns = 1;
  let rows = 1;
  let columnSizes = [1]; // Default: single column taking full width
  let rowSizes = [1];    // Default: single row taking full height
  
  // Parse columns
  if (layoutConfig.gridTemplateColumns) {
    if (layoutConfig.gridTemplateColumns.includes('repeat(')) {
      const repeatMatch = layoutConfig.gridTemplateColumns.match(/repeat\((\d+),/);
      if (repeatMatch) {
        columns = parseInt(repeatMatch[1], 10);
        columnSizes = Array(columns).fill(1); // All equal size
      }
    } else {
      // Parse individual fr units like "2fr 1fr" or "1fr 1fr 1fr"
      const frMatches = layoutConfig.gridTemplateColumns.match(/(\d*\.?\d*)fr/g);
      if (frMatches) {
        columns = frMatches.length;
        columnSizes = frMatches.map(match => {
          const value = match.replace('fr', '');
          return value === '' ? 1 : parseFloat(value);
        });
      }
    }
  }
  
  // Parse rows
  if (layoutConfig.gridTemplateRows) {
    if (layoutConfig.gridTemplateRows.includes('repeat(')) {
      const repeatMatch = layoutConfig.gridTemplateRows.match(/repeat\((\d+),/);
      if (repeatMatch) {
        rows = parseInt(repeatMatch[1], 10);
        rowSizes = Array(rows).fill(1); // All equal size
      }
    } else {
      // Parse individual fr units like "2fr 1fr" or "1fr 1fr 1fr"
      const frMatches = layoutConfig.gridTemplateRows.match(/(\d*\.?\d*)fr/g);
      if (frMatches) {
        rows = frMatches.length;
        rowSizes = frMatches.map(match => {
          const value = match.replace('fr', '');
          return value === '' ? 1 : parseFloat(value);
        });
      }
    }
  }
  
  // Calculate total fractional units
  const totalColumnFr = columnSizes.reduce((sum, size) => sum + size, 0);
  const totalRowFr = rowSizes.reduce((sum, size) => sum + size, 0);
  
  // Calculate gaps - only between panels, not at edges
  const horizontalGaps = Math.max(0, columns - 1) * borderPixels;
  const verticalGaps = Math.max(0, rows - 1) * borderPixels;
  
  // Calculate base unit sizes
  const columnFrUnit = (availableWidth - horizontalGaps) / totalColumnFr;
  const rowFrUnit = (availableHeight - verticalGaps) / totalRowFr;
  
  // Helper function to calculate cumulative position and size for a cell
  const getCellDimensions = (col, row) => {
    // Calculate X position: sum of all previous column widths + gaps
    let x = borderPixels;
    for (let c = 0; c < col; c += 1) {
      x += columnSizes[c] * columnFrUnit + borderPixels;
    }
    
    // Calculate Y position: sum of all previous row heights + gaps  
    let y = borderPixels;
    for (let r = 0; r < row; r += 1) {
      y += rowSizes[r] * rowFrUnit + borderPixels;
    }
    
    // Calculate current cell dimensions
    const width = columnSizes[col] * columnFrUnit;
    const height = rowSizes[row] * rowFrUnit;
    
    return { x, y, width, height };
  };

  if (layoutConfig.areas && layoutConfig.areas.length > 0 && layoutConfig.gridTemplateAreas) {
    // Use grid template areas - need to parse the actual grid areas
    const gridAreas = parseGridTemplateAreas(layoutConfig.gridTemplateAreas);
    
    layoutConfig.areas.slice(0, panelCount).forEach((areaName, index) => {
      const areaInfo = gridAreas[areaName];
      if (areaInfo) {
        // Calculate position and size based on grid area bounds
        let x = borderPixels;
        let y = borderPixels;
        let width = 0;
        let height = 0;
        
                 // Calculate X position and width
         for (let c = 0; c < areaInfo.colStart; c += 1) {
           x += columnSizes[c] * columnFrUnit + borderPixels;
         }
         for (let c = areaInfo.colStart; c <= areaInfo.colEnd; c += 1) {
           width += columnSizes[c] * columnFrUnit;
         }
         // Add gaps between columns within the area
         if (areaInfo.colEnd > areaInfo.colStart) {
           width += (areaInfo.colEnd - areaInfo.colStart) * borderPixels;
         }
         
         // Calculate Y position and height
         for (let r = 0; r < areaInfo.rowStart; r += 1) {
           y += rowSizes[r] * rowFrUnit + borderPixels;
         }
         for (let r = areaInfo.rowStart; r <= areaInfo.rowEnd; r += 1) {
           height += rowSizes[r] * rowFrUnit;
         }
         // Add gaps between rows within the area
         if (areaInfo.rowEnd > areaInfo.rowStart) {
           height += (areaInfo.rowEnd - areaInfo.rowStart) * borderPixels;
         }
        
        rects.push({
          x,
          y,
          width,
          height,
          panelId: `panel-${index + 1}`,
          index
        });
      }
    });
  } else {
    // Use items array or simple grid
    for (let i = 0; i < panelCount; i += 1) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const { x, y, width, height } = getCellDimensions(col, row);
      
      rects.push({
        x,
        y,
        width,
        height,
        panelId: `panel-${i + 1}`,
        index: i
      });
    }
  }
  
  return rects;
};

/**
 * Canvas-based Collage Preview Component
 */
const CanvasCollagePreview = ({
  selectedTemplate,
  selectedAspectRatio,
  panelCount,
  images = [],
  onPanelClick,
  onMenuOpen,
  aspectRatioValue = 1,
  panelImageMapping = {},
  borderThickness = 0,
  borderColor = '#000000',
  panelTransforms = {},
  updatePanelTransform,
  panelTexts = {},
  updatePanelText,
  lastUsedTextSettings = {},
}) => {
  const theme = useTheme();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [componentWidth, setComponentWidth] = useState(400);
  const [componentHeight, setComponentHeight] = useState(400);
  const [loadedImages, setLoadedImages] = useState({});
  const [panelRects, setPanelRects] = useState([]);
  const [hoveredPanel, setHoveredPanel] = useState(null);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [isTransformMode, setIsTransformMode] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [textEditingPanel, setTextEditingPanel] = useState(null);
  const [activeTextSetting, setActiveTextSetting] = useState(null);
  const [touchStartDistance, setTouchStartDistance] = useState(null);
  const [touchStartScale, setTouchStartScale] = useState(1);
  const textFieldRefs = useRef({});

  // Get layout configuration
  const layoutConfig = useMemo(() => {
    return selectedTemplate ? createLayoutConfig(selectedTemplate, panelCount) : null;
  }, [selectedTemplate, panelCount]);

  // Calculate border pixels
  const borderPixels = getBorderPixelSize(borderThickness, componentWidth);

  // Load images when they change
  useEffect(() => {
    const loadImage = (src, key) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve({ key, img });
        img.onerror = () => resolve({ key, img: null });
        
        if (typeof src === 'string') {
          img.src = src;
        } else if (src && typeof src === 'object') {
          img.src = src.displayUrl || src.originalUrl || '';
        }
      });
    };

    const loadAllImages = async () => {
      const imagePromises = images.map((imageData, index) => 
        loadImage(imageData, index)
      );
      
      const results = await Promise.all(imagePromises);
      const newLoadedImages = {};
      
      results.forEach(({ key, img }) => {
        if (img) {
          newLoadedImages[key] = img;
        }
      });
      
      setLoadedImages(newLoadedImages);
      

    };

    if (images.length > 0) {
      loadAllImages();
    }
  }, [images, panelRects, updatePanelText, panelTexts, lastUsedTextSettings]);

  // Update component dimensions and panel rectangles
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = rect.width || 400;
        const height = width / aspectRatioValue;
        
        setComponentWidth(width);
        setComponentHeight(height);
        
        if (layoutConfig) {
          const rects = parseGridToRects(layoutConfig, width, height, panelCount, borderPixels);
          setPanelRects(rects);
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [aspectRatioValue, layoutConfig, panelCount, borderPixels]);

  // Draw the canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size with device pixel ratio for crisp rendering
    canvas.width = componentWidth * dpr;
    canvas.height = componentHeight * dpr;
    canvas.style.width = `${componentWidth}px`;
    canvas.style.height = `${componentHeight}px`;
    
    // Scale context to match device pixel ratio
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.clearRect(0, 0, componentWidth, componentHeight);
    
    // Draw background (border color if borders are enabled)
    if (borderPixels > 0) {
      ctx.fillStyle = borderColor;
      ctx.fillRect(0, 0, componentWidth, componentHeight);
    }
    
    // Draw panels
    panelRects.forEach((rect) => {
      const { x, y, width, height, panelId, index } = rect;
      const imageIndex = panelImageMapping[panelId];
      const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
      const transform = panelTransforms[panelId] || { scale: 1, positionX: 0, positionY: 0 };
      const isHovered = hoveredPanel === index;
      const isSelected = selectedPanel === index;
      const isInTransformMode = isTransformMode[panelId];
      const panelText = panelTexts[panelId] || {};
      
      // Draw panel background
      ctx.fillStyle = hasImage 
        ? (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')
        : 'rgba(0,0,0,0.3)';
      ctx.fillRect(x, y, width, height);
      
      // Note: Hover effects are now handled by CSS overlays, not canvas drawing
      // This ensures they don't interfere with collage generation
      
      if (hasImage) {
        const img = loadedImages[imageIndex];
        if (img) {
          ctx.save();
          
          // Clip to panel bounds
          ctx.beginPath();
          ctx.rect(x, y, width, height);
          ctx.clip();
          
          // Calculate initial scale to cover the panel (like object-fit: cover)
          const imageAspectRatio = img.naturalWidth / img.naturalHeight;
          const panelAspectRatio = width / height;
          
          let initialScale;
          if (imageAspectRatio > panelAspectRatio) {
            // Image is wider than panel, scale to fit height
            initialScale = height / img.naturalHeight;
          } else {
            // Image is taller than panel, scale to fit width  
            initialScale = width / img.naturalWidth;
          }
          
          // Apply user transform on top of initial scale
          const finalScale = initialScale * transform.scale;
          const scaledWidth = img.naturalWidth * finalScale;
          const scaledHeight = img.naturalHeight * finalScale;
          
          // Calculate centering offset (for initial positioning)
          const centerOffsetX = (width - scaledWidth) / 2;
          const centerOffsetY = (height - scaledHeight) / 2;
          
          // Apply user position offset on top of centering
          const finalOffsetX = centerOffsetX + transform.positionX;
          const finalOffsetY = centerOffsetY + transform.positionY;
          
          // Draw image with transforms
          ctx.drawImage(
            img,
            x + finalOffsetX,
            y + finalOffsetY,
            scaledWidth,
            scaledHeight
          );
          
          ctx.restore();
        }
      } else {
        // Draw add icon for empty panels
        const iconSize = Math.min(width, height) * 0.3;
        const iconX = x + (width - iconSize) / 2;
        const iconY = y + (height - iconSize) / 2;
        
        // Draw add icon background circle
        ctx.fillStyle = '#2196F3';
        ctx.beginPath();
        ctx.arc(iconX + iconSize/2, iconY + iconSize/2, iconSize/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw plus sign
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        // Horizontal line
        ctx.moveTo(iconX + iconSize * 0.25, iconY + iconSize/2);
        ctx.lineTo(iconX + iconSize * 0.75, iconY + iconSize/2);
        // Vertical line
        ctx.moveTo(iconX + iconSize/2, iconY + iconSize * 0.25);
        ctx.lineTo(iconX + iconSize/2, iconY + iconSize * 0.75);
        ctx.stroke();
      }
      
      // Draw text at the bottom of the panel
      if (panelText.content && panelText.content.trim()) {
        ctx.save();
        
        // Clip text to panel boundaries to prevent overflow into adjacent frames
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.clip();
        
        // Set text properties (use last used settings as defaults)
        const fontSize = panelText.fontSize || lastUsedTextSettings.fontSize || 26;
        const fontWeight = panelText.fontWeight || lastUsedTextSettings.fontWeight || '700';
        const fontFamily = panelText.fontFamily || lastUsedTextSettings.fontFamily || 'Arial';
        const textColor = panelText.color || lastUsedTextSettings.color || '#ffffff';
        const strokeWidth = panelText.strokeWidth || lastUsedTextSettings.strokeWidth || 2;
        
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        // Set stroke properties
        ctx.strokeStyle = '#000000'; // Black stroke for contrast
        ctx.lineWidth = strokeWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        // Add text shadow for better readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.shadowBlur = 3;
        
        // Calculate available text area (with padding on sides and bottom)
        const textPadding = 10;
        const maxTextWidth = width - (textPadding * 2);
        const textX = x + width / 2;
        const textY = y + height - textPadding;
        const lineHeight = fontSize * 1.2;
        
        // Helper function to wrap text with aggressive character-level fallback
        const wrapText = (text, maxWidth) => {
          const lines = [];
          const manualLines = text.split('\n'); // Handle manual line breaks first
          
          manualLines.forEach(line => {
            if (ctx.measureText(line).width <= maxWidth) {
              // Line fits within width
              lines.push(line);
            } else {
              // Line needs to be wrapped
              const words = line.split(' ');
              let currentLine = '';
              
              words.forEach(word => {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const testWidth = ctx.measureText(testLine).width;
                
                if (testWidth <= maxWidth) {
                  currentLine = testLine;
                } else if (currentLine) {
                  // Current line is full, start a new line
                  lines.push(currentLine);
                  currentLine = word;
                  
                  // Check if the single word is still too long
                  if (ctx.measureText(word).width > maxWidth) {
                    // Break the word character by character
                    let charLine = '';
                    for (let i = 0; i < word.length; i += 1) {
                      const testChar = charLine + word[i];
                      if (ctx.measureText(testChar).width <= maxWidth) {
                        charLine = testChar;
                      } else {
                        if (charLine) {
                          lines.push(charLine);
                        }
                        charLine = word[i];
                      }
                    }
                    if (charLine) {
                      lines.push(charLine);
                    }
                    currentLine = '';
                  }
                } else {
                  // Single word is too long, break it character by character
                  let charLine = '';
                  for (let i = 0; i < word.length; i += 1) {
                    const testChar = charLine + word[i];
                    if (ctx.measureText(testChar).width <= maxWidth) {
                      charLine = testChar;
                    } else {
                      if (charLine) {
                        lines.push(charLine);
                      }
                      charLine = word[i];
                    }
                  }
                  if (charLine) {
                    lines.push(charLine);
                  }
                }
              });
              
              // Add the last line if it has content
              if (currentLine) {
                lines.push(currentLine);
              }
            }
          });
          
          return lines;
        };
        
        // Get wrapped lines
        const wrappedLines = wrapText(panelText.content, maxTextWidth);
        
        // Draw each line
        wrappedLines.forEach((line, lineIndex) => {
          const lineY = textY - (wrappedLines.length - 1 - lineIndex) * lineHeight;
          
          // Draw stroke first if stroke width > 0
          if (strokeWidth > 0) {
            ctx.strokeText(line, textX, lineY);
          }
          
          // Then draw the fill text on top
          ctx.fillText(line, textX, lineY);
        });
        
        ctx.restore();
      }
    });
  }, [
    componentWidth, 
    componentHeight, 
    panelRects, 
    loadedImages, 
    panelImageMapping, 
    panelTransforms, 
    borderPixels, 
    borderColor, 
    selectedPanel, 
    isTransformMode,
    panelTexts,
    theme.palette.mode
  ]);

  // Redraw canvas when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Focus text field when caption editor opens
  useEffect(() => {
    if (textEditingPanel && activeTextSetting === 'content') {
      // Small delay to ensure the text field is rendered
      setTimeout(() => {
        // Find the text field for the specific panel
        const textField = textFieldRefs.current[textEditingPanel];
        if (textField) {
          // Try multiple ways to find the input element
          let inputElement = textField.querySelector('textarea') || 
                            textField.querySelector('input') ||
                            textField.querySelector('[role="textbox"]');
          
          // If MUI structure, try going through the input base
          if (!inputElement) {
            const inputBase = textField.querySelector('.MuiInputBase-input');
            if (inputBase) {
              inputElement = inputBase;
            }
          }
          
          if (inputElement) {
            // Focus the element
            inputElement.focus();
            
            // Position cursor at the end of existing text
            const textLength = inputElement.value.length;
            
            // Use setTimeout to ensure focus is complete before setting selection
            setTimeout(() => {
              inputElement.setSelectionRange(textLength, textLength);
              
              // For mobile: additional steps to ensure keyboard appears
              if ('ontouchstart' in window) {
                inputElement.click();
                // Double-check cursor position on mobile
                setTimeout(() => {
                  inputElement.setSelectionRange(textLength, textLength);
                }, 100);
              }
            }, 50);
          }
        }
      }, 300); // Even longer delay to ensure complete rendering
    }
  }, [textEditingPanel, activeTextSetting]);

  // Handle cursor positioning when text field auto-focuses
  useEffect(() => {
    if (textEditingPanel && activeTextSetting === 'content') {
      setTimeout(() => {
        const textField = textFieldRefs.current[textEditingPanel];
        if (textField) {
          // Find the actual input element and position cursor at end
          const inputElement = textField.querySelector('textarea') || 
                              textField.querySelector('input') ||
                              textField.querySelector('.MuiInputBase-input');
          
          if (inputElement && document.activeElement === inputElement) {
            const textLength = inputElement.value.length;
            inputElement.setSelectionRange(textLength, textLength);
          }
        }
      }, 100);
    }
  }, [textEditingPanel, activeTextSetting, panelTexts]);

  // Handle mouse events
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Find which panel is under the mouse
    const hoveredPanelIndex = panelRects.findIndex(panel => 
      x >= panel.x && x <= panel.x + panel.width &&
      y >= panel.y && y <= panel.y + panel.height
    );
    
    if (hoveredPanelIndex !== hoveredPanel) {
      setHoveredPanel(hoveredPanelIndex >= 0 ? hoveredPanelIndex : null);
      canvas.style.cursor = hoveredPanelIndex >= 0 ? 'pointer' : 'default';
    }
    
    // Handle dragging for transform mode
    if (isDragging && selectedPanel !== null) {
      const panel = panelRects[selectedPanel];
      if (panel && isTransformMode[panel.panelId]) {
        const deltaX = x - dragStart.x;
        const deltaY = y - dragStart.y;
        
        const currentTransform = panelTransforms[panel.panelId] || { scale: 1, positionX: 0, positionY: 0 };
        const imageIndex = panelImageMapping[panel.panelId];
        const img = loadedImages[imageIndex];
        
        if (img && updatePanelTransform) {
          // Calculate the same scaling and positioning logic as in drawCanvas
          const imageAspectRatio = img.naturalWidth / img.naturalHeight;
          const panelAspectRatio = panel.width / panel.height;
          
          let initialScale;
          if (imageAspectRatio > panelAspectRatio) {
            // Image is wider than panel, scale to fit height
            initialScale = panel.height / img.naturalHeight;
          } else {
            // Image is taller than panel, scale to fit width  
            initialScale = panel.width / img.naturalWidth;
          }
          
          // Apply user transform on top of initial scale
          const finalScale = initialScale * currentTransform.scale;
          const scaledWidth = img.naturalWidth * finalScale;
          const scaledHeight = img.naturalHeight * finalScale;
          
          // Calculate centering offset (for initial positioning)
          const centerOffsetX = (panel.width - scaledWidth) / 2;
          const centerOffsetY = (panel.height - scaledHeight) / 2;
          
          // Calculate proposed new positions
          const newPositionX = currentTransform.positionX + deltaX;
          const newPositionY = currentTransform.positionY + deltaY;
          
          // Calculate the final image bounds with new position
          const finalOffsetX = centerOffsetX + newPositionX;
          const finalOffsetY = centerOffsetY + newPositionY;
          
          // Calculate bounds to prevent white space (image must always cover the panel)
          let minPositionX;
          let maxPositionX;
          let minPositionY;
          let maxPositionY;
          
          if (scaledWidth > panel.width) {
            // Image is wider than panel - can move horizontally but not show white space
            // When image is wider, centerOffsetX is negative
            maxPositionX = -centerOffsetX; // Left edge of image at left edge of panel
            minPositionX = panel.width - scaledWidth - centerOffsetX; // Right edge of image at right edge of panel
          } else {
            // Image is narrower than or equal to panel - center it and don't allow horizontal movement
            minPositionX = 0;
            maxPositionX = 0;
          }
          
          if (scaledHeight > panel.height) {
            // Image is taller than panel - can move vertically but not show white space
            // When image is taller, centerOffsetY is negative
            maxPositionY = -centerOffsetY; // Top edge of image at top edge of panel
            minPositionY = panel.height - scaledHeight - centerOffsetY; // Bottom edge of image at bottom edge of panel
          } else {
            // Image is shorter than or equal to panel - center it and don't allow vertical movement
            minPositionY = 0;
            maxPositionY = 0;
          }
          
          // Clamp the positions to prevent white space
          const clampedPositionX = Math.max(minPositionX, Math.min(maxPositionX, newPositionX));
          const clampedPositionY = Math.max(minPositionY, Math.min(maxPositionY, newPositionY));
          
          updatePanelTransform(panel.panelId, {
            ...currentTransform,
            positionX: clampedPositionX,
            positionY: clampedPositionY
          });
        }
        
        setDragStart({ x, y });
      }
    }
  }, [panelRects, hoveredPanel, isDragging, selectedPanel, dragStart, isTransformMode, panelTransforms, updatePanelTransform]);

  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clickedPanelIndex = panelRects.findIndex(panel => 
      x >= panel.x && x <= panel.x + panel.width &&
      y >= panel.y && y <= panel.y + panel.height
    );
    
    if (clickedPanelIndex >= 0) {
      const clickedPanel = panelRects[clickedPanelIndex];
      
      // If a caption editor is open and this is not the panel being edited, ignore the click
      if (textEditingPanel !== null && textEditingPanel !== clickedPanel.panelId) {
        return;
      }
      
      setSelectedPanel(clickedPanelIndex);
      
      // Check if this panel is in transform mode
      if (isTransformMode[clickedPanel.panelId]) {
        setIsDragging(true);
        setDragStart({ x, y });
      } else if (onPanelClick) {
        // Regular panel click
        onPanelClick(clickedPanel.index, clickedPanel.panelId);
      }
    }
  }, [panelRects, isTransformMode, onPanelClick, textEditingPanel]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Clear hover state when mouse leaves canvas
    setHoveredPanel(null);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  }, []);

  const handleWheel = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;
    
    // Find which panel is under the cursor
    const hoveredPanelIndex = panelRects.findIndex(panel => 
      cursorX >= panel.x && cursorX <= panel.x + panel.width &&
      cursorY >= panel.y && cursorY <= panel.y + panel.height
    );
    
    // Only proceed with zoom if cursor is over a panel with an image AND this specific panel has transform mode enabled
    if (hoveredPanelIndex >= 0) {
      const panel = panelRects[hoveredPanelIndex];
      const imageIndex = panelImageMapping[panel.panelId];
      const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
      
      if (hasImage && isTransformMode[panel.panelId]) {
        // Prevent page scrolling only when actually zooming an image in transform mode
        e.preventDefault();
        e.stopPropagation();
        // Auto-select this panel for zoom operation
        if (selectedPanel !== hoveredPanelIndex) {
          setSelectedPanel(hoveredPanelIndex);
        }
        
        const scaleChange = e.deltaY > 0 ? 0.9 : 1.1;
        const currentTransform = panelTransforms[panel.panelId] || { scale: 1, positionX: 0, positionY: 0 };
        const img = loadedImages[imageIndex];
        
        if (img && updatePanelTransform) {
          // Calculate cursor position relative to the panel
          const panelCursorX = cursorX - panel.x;
          const panelCursorY = cursorY - panel.y;
          
          // Calculate the minimum scale needed to cover the panel (same as initial scale logic)
          const imageAspectRatio = img.naturalWidth / img.naturalHeight;
          const panelAspectRatio = panel.width / panel.height;
          
          let minScale;
          if (imageAspectRatio > panelAspectRatio) {
            // Image is wider than panel, scale to fit height
            minScale = 1; // The initial scale already fits height, so 1x user scale is minimum
          } else {
            // Image is taller than panel, scale to fit width  
            minScale = 1; // The initial scale already fits width, so 1x user scale is minimum
          }
          
          const proposedScale = currentTransform.scale * scaleChange;
          const newScale = Math.max(minScale, Math.min(5, proposedScale));
          
          // Calculate initial scale and current image dimensions
          const initialScale = imageAspectRatio > panelAspectRatio 
            ? panel.height / img.naturalHeight 
            : panel.width / img.naturalWidth;
          const currentFinalScale = initialScale * currentTransform.scale;
          const newFinalScale = initialScale * newScale;
          const currentScaledWidth = img.naturalWidth * currentFinalScale;
          const currentScaledHeight = img.naturalHeight * currentFinalScale;
          const newScaledWidth = img.naturalWidth * newFinalScale;
          const newScaledHeight = img.naturalHeight * newFinalScale;
          
          // Calculate current center offsets
          const currentCenterOffsetX = (panel.width - currentScaledWidth) / 2;
          const currentCenterOffsetY = (panel.height - currentScaledHeight) / 2;
          const newCenterOffsetX = (panel.width - newScaledWidth) / 2;
          const newCenterOffsetY = (panel.height - newScaledHeight) / 2;
          
          // Calculate the point on the image that corresponds to the cursor position (before scaling)
          const currentImageX = currentCenterOffsetX + currentTransform.positionX;
          const currentImageY = currentCenterOffsetY + currentTransform.positionY;
          const pointOnImageX = (panelCursorX - currentImageX) / currentFinalScale;
          const pointOnImageY = (panelCursorY - currentImageY) / currentFinalScale;
          
          // Calculate new position so the same point on the image stays under the cursor
          const newImageX = panelCursorX - (pointOnImageX * newFinalScale);
          const newImageY = panelCursorY - (pointOnImageY * newFinalScale);
          const newPositionX = newImageX - newCenterOffsetX;
          const newPositionY = newImageY - newCenterOffsetY;
          
          // Calculate bounds to prevent white space and clamp the new position
          let minPositionX;
          let maxPositionX;
          let minPositionY;
          let maxPositionY;
          
          if (newScaledWidth > panel.width) {
            maxPositionX = -newCenterOffsetX;
            minPositionX = panel.width - newScaledWidth - newCenterOffsetX;
          } else {
            minPositionX = 0;
            maxPositionX = 0;
          }
          
          if (newScaledHeight > panel.height) {
            maxPositionY = -newCenterOffsetY;
            minPositionY = panel.height - newScaledHeight - newCenterOffsetY;
          } else {
            minPositionY = 0;
            maxPositionY = 0;
          }
          
          const clampedPositionX = Math.max(minPositionX, Math.min(maxPositionX, newPositionX));
          const clampedPositionY = Math.max(minPositionY, Math.min(maxPositionY, newPositionY));
          
          updatePanelTransform(panel.panelId, {
            ...currentTransform,
            scale: newScale,
            positionX: clampedPositionX,
            positionY: clampedPositionY
          });
        }
      }
    }
  }, [panelRects, panelImageMapping, loadedImages, selectedPanel, panelTransforms, updatePanelTransform, setSelectedPanel, isTransformMode]);

  // Helper function to get distance between two touch points
  const getTouchDistance = useCallback((touches) => {
    if (touches.length < 2) return 0;
    
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Helper function to get center point between two touches
  const getTouchCenter = useCallback((touches) => {
    if (touches.length < 2) return { x: touches[0].clientX, y: touches[0].clientY };
    
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  }, []);

  // Touch event handlers
  const handleTouchStart = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const touches = Array.from(e.touches);
    
    if (touches.length === 1) {
      // Single touch - handle like mouse down
      const touch = touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      const clickedPanelIndex = panelRects.findIndex(panel => 
        x >= panel.x && x <= panel.x + panel.width &&
        y >= panel.y && y <= panel.y + panel.height
      );
      
      if (clickedPanelIndex >= 0) {
        const clickedPanel = panelRects[clickedPanelIndex];
        const imageIndex = panelImageMapping[clickedPanel.panelId];
        const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
        
        // If a caption editor is open and this is not the panel being edited, allow normal scrolling
        if (textEditingPanel !== null && textEditingPanel !== clickedPanel.panelId) {
          // Don't preventDefault - allow normal page scrolling
          return;
        }
        
        setSelectedPanel(clickedPanelIndex);
        
        // Check if this specific panel is in transform mode
        if (hasImage && isTransformMode[clickedPanel.panelId]) {
          // Prevent page scrolling only when touching an image in transform mode
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
          setDragStart({ x, y });
        } else {
          // Allow normal touch behavior for panels not in transform mode
          if (anyPanelInTransformMode) {
            // If any panel is in transform mode, we need to manually allow scrolling
            // Don't preventDefault here to allow normal page scrolling
          }
          if (onPanelClick) {
            // Regular panel click
            onPanelClick(clickedPanel.index, clickedPanel.panelId);
          }
        }
      } else if (textEditingPanel !== null) {
        // When touched outside any panel and caption editor is open, explicitly allow normal scrolling
        // Don't preventDefault - allow normal page scrolling when caption editor is open
      }
    } else if (touches.length === 2 && selectedPanel !== null) {
      // Two touches - prepare for pinch zoom
      const panel = panelRects[selectedPanel];
      const imageIndex = panelImageMapping[panel.panelId];
      const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
      
      if (panel && hasImage && isTransformMode[panel.panelId]) {
        // Only prevent page scrolling when performing pinch zoom on a panel in transform mode
        e.preventDefault();
        e.stopPropagation();
        const distance = getTouchDistance(touches);
        const currentTransform = panelTransforms[panel.panelId] || { scale: 1, positionX: 0, positionY: 0 };
        
        setTouchStartDistance(distance);
        setTouchStartScale(currentTransform.scale);
        setIsDragging(false); // Stop any ongoing drag
      }
    }
  }, [panelRects, isTransformMode, onPanelClick, selectedPanel, panelTransforms, panelImageMapping, loadedImages, getTouchDistance, textEditingPanel]);

  const handleTouchMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const touches = Array.from(e.touches);
    
    if (touches.length === 1 && isDragging && selectedPanel !== null) {
      // Single touch drag
      const panel = panelRects[selectedPanel];
      const imageIndex = panelImageMapping[panel.panelId];
      const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
      
      if (panel && hasImage && isTransformMode[panel.panelId]) {
        // Prevent page scrolling only when dragging an image in transform mode
        e.preventDefault();
        e.stopPropagation();
        const touch = touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        const deltaX = x - dragStart.x;
        const deltaY = y - dragStart.y;
        
        const currentTransform = panelTransforms[panel.panelId] || { scale: 1, positionX: 0, positionY: 0 };
        const img = loadedImages[imageIndex];
        
        if (img && updatePanelTransform) {
          // Same positioning logic as mouse drag
          const imageAspectRatio = img.naturalWidth / img.naturalHeight;
          const panelAspectRatio = panel.width / panel.height;
          
          let initialScale;
          if (imageAspectRatio > panelAspectRatio) {
            initialScale = panel.height / img.naturalHeight;
          } else {
            initialScale = panel.width / img.naturalWidth;
          }
          
          const finalScale = initialScale * currentTransform.scale;
          const scaledWidth = img.naturalWidth * finalScale;
          const scaledHeight = img.naturalHeight * finalScale;
          
          const centerOffsetX = (panel.width - scaledWidth) / 2;
          const centerOffsetY = (panel.height - scaledHeight) / 2;
          
          const newPositionX = currentTransform.positionX + deltaX;
          const newPositionY = currentTransform.positionY + deltaY;
          
          // Calculate bounds to prevent white space
          let minPositionX;
          let maxPositionX;
          let minPositionY;
          let maxPositionY;
          
          if (scaledWidth > panel.width) {
            maxPositionX = -centerOffsetX;
            minPositionX = panel.width - scaledWidth - centerOffsetX;
          } else {
            minPositionX = 0;
            maxPositionX = 0;
          }
          
          if (scaledHeight > panel.height) {
            maxPositionY = -centerOffsetY;
            minPositionY = panel.height - scaledHeight - centerOffsetY;
          } else {
            minPositionY = 0;
            maxPositionY = 0;
          }
          
          const clampedPositionX = Math.max(minPositionX, Math.min(maxPositionX, newPositionX));
          const clampedPositionY = Math.max(minPositionY, Math.min(maxPositionY, newPositionY));
          
          updatePanelTransform(panel.panelId, {
            ...currentTransform,
            positionX: clampedPositionX,
            positionY: clampedPositionY
          });
        }
        
        setDragStart({ x, y });
      }
    } else if (touches.length === 2 && selectedPanel !== null && touchStartDistance !== null) {
      // Two-finger pinch zoom
      const panel = panelRects[selectedPanel];
      const imageIndex = panelImageMapping[panel.panelId];
      const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
      
      if (panel && hasImage && isTransformMode[panel.panelId]) {
        // Only prevent page scrolling when performing pinch zoom on a panel in transform mode
        e.preventDefault();
        e.stopPropagation();
        const currentDistance = getTouchDistance(touches);
        const scaleRatio = currentDistance / touchStartDistance;
        const newScale = touchStartScale * scaleRatio;
        
        // Get the center point of the pinch gesture
        const pinchCenter = getTouchCenter(touches);
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const pinchCenterX = pinchCenter.x - rect.left;
        const pinchCenterY = pinchCenter.y - rect.top;
        
        // Calculate pinch center position relative to the panel
        const panelPinchX = pinchCenterX - panel.x;
        const panelPinchY = pinchCenterY - panel.y;
        
        const currentTransform = panelTransforms[panel.panelId] || { scale: 1, positionX: 0, positionY: 0 };
        const img = loadedImages[imageIndex];
        
        if (img && updatePanelTransform) {
          // Calculate minimum scale (same logic as wheel handler)
          const imageAspectRatio = img.naturalWidth / img.naturalHeight;
          const panelAspectRatio = panel.width / panel.height;
          
          const minScale = 1;
          const clampedScale = Math.max(minScale, Math.min(5, newScale));
          
          // Calculate initial scale and current image dimensions
          const initialScale = imageAspectRatio > panelAspectRatio 
            ? panel.height / img.naturalHeight 
            : panel.width / img.naturalWidth;
          const currentFinalScale = initialScale * currentTransform.scale;
          const newFinalScale = initialScale * clampedScale;
          const currentScaledWidth = img.naturalWidth * currentFinalScale;
          const currentScaledHeight = img.naturalHeight * currentFinalScale;
          const newScaledWidth = img.naturalWidth * newFinalScale;
          const newScaledHeight = img.naturalHeight * newFinalScale;
          
          // Calculate current center offsets
          const currentCenterOffsetX = (panel.width - currentScaledWidth) / 2;
          const currentCenterOffsetY = (panel.height - currentScaledHeight) / 2;
          const newCenterOffsetX = (panel.width - newScaledWidth) / 2;
          const newCenterOffsetY = (panel.height - newScaledHeight) / 2;
          
          // Calculate the point on the image that corresponds to the pinch center (before scaling)
          const currentImageX = currentCenterOffsetX + currentTransform.positionX;
          const currentImageY = currentCenterOffsetY + currentTransform.positionY;
          const pointOnImageX = (panelPinchX - currentImageX) / currentFinalScale;
          const pointOnImageY = (panelPinchY - currentImageY) / currentFinalScale;
          
          // Calculate new position so the same point on the image stays under the pinch center
          const newImageX = panelPinchX - (pointOnImageX * newFinalScale);
          const newImageY = panelPinchY - (pointOnImageY * newFinalScale);
          const newPositionX = newImageX - newCenterOffsetX;
          const newPositionY = newImageY - newCenterOffsetY;
          
          // Calculate bounds to prevent white space and clamp the new position
          let minPositionX;
          let maxPositionX;
          let minPositionY;
          let maxPositionY;
          
          if (newScaledWidth > panel.width) {
            maxPositionX = -newCenterOffsetX;
            minPositionX = panel.width - newScaledWidth - newCenterOffsetX;
          } else {
            minPositionX = 0;
            maxPositionX = 0;
          }
          
          if (newScaledHeight > panel.height) {
            maxPositionY = -newCenterOffsetY;
            minPositionY = panel.height - newScaledHeight - newCenterOffsetY;
          } else {
            minPositionY = 0;
            maxPositionY = 0;
          }
          
          const clampedPositionX = Math.max(minPositionX, Math.min(maxPositionX, newPositionX));
          const clampedPositionY = Math.max(minPositionY, Math.min(maxPositionY, newPositionY));
          
          updatePanelTransform(panel.panelId, {
            ...currentTransform,
            scale: clampedScale,
            positionX: clampedPositionX,
            positionY: clampedPositionY
          });
        }
      }
    }
  }, [isDragging, selectedPanel, panelRects, isTransformMode, dragStart, panelTransforms, panelImageMapping, loadedImages, updatePanelTransform, touchStartDistance, touchStartScale, getTouchDistance, getTouchCenter]);

  const handleTouchEnd = useCallback((e) => {
    setIsDragging(false);
    setTouchStartDistance(null);
    setTouchStartScale(1);
  }, []);

  // Toggle transform mode for a panel
  const toggleTransformMode = useCallback((panelId) => {
    setIsTransformMode(prev => ({
      ...prev,
      [panelId]: !prev[panelId]
    }));
  }, []);

  // Get final canvas for export
  const getCanvasBlob = useCallback(() => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.toBlob(resolve, 'image/png');
      } else {
        resolve(null);
      }
    });
  }, []);

  // Expose the getCanvasBlob function to parent components
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.getCanvasBlob = getCanvasBlob;
    }
  }, [getCanvasBlob]);







  // Handle text editing
  const handleTextEdit = useCallback((panelId, event) => {
    const isOpening = textEditingPanel !== panelId;
    setTextEditingPanel(textEditingPanel === panelId ? null : panelId);
    
    // Always set to content tab when opening
    if (isOpening) {
      setActiveTextSetting('content');
      
      // Auto-scroll to show the caption editor after it opens
      setTimeout(() => {
        const panel = panelRects.find(p => p.panelId === panelId);
        if (panel && containerRef.current) {
          const container = containerRef.current;
          const containerRect = container.getBoundingClientRect();
          
          // Calculate the bottom position of the expanded editor
          const editorHeight = 185; // Moderate height estimate for expanded editor
          const editorBottom = panel.y + panel.height + editorHeight;
          
          // Account for mobile keyboard - it typically takes up 250-350px on mobile devices
          const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          const keyboardHeight = isMobileDevice ? 300 : 0; // Conservative estimate for mobile keyboard
          const extraPadding = isMobileDevice ? 55 : 43; // Moderate padding for comfortable viewing
          const availableHeight = containerRect.height - keyboardHeight;
          
          // Only scroll if a significant portion of the editor would be cut off
          const cutoffAmount = editorBottom - availableHeight;
          const significantCutoff = 40; // Moderate threshold for scrolling sensitivity
          
          if (cutoffAmount > significantCutoff) {
            // Calculate scroll needed to show the editor comfortably above the keyboard
            const scrollNeeded = cutoffAmount + extraPadding;
            
            // Allow more generous scrolling for caption editor
            if (scrollNeeded > 0) {
              window.scrollTo({
                top: window.scrollY + scrollNeeded,
                behavior: 'smooth'
              });
            }
          }
        }
      }, 100); // Small delay to ensure editor is rendered
    }
  }, [textEditingPanel, panelRects]);

  const handleTextClose = useCallback(() => {
    setTextEditingPanel(null);
    setActiveTextSetting(null);
  }, []);

  const handleTextChange = useCallback((panelId, property, value) => {
    if (updatePanelText) {
      const currentText = panelTexts[panelId] || {};
      updatePanelText(panelId, {
        ...currentText,
        [property]: value
      });
    }
  }, [panelTexts, updatePanelText]);

  if (!selectedTemplate || !layoutConfig) {
    return (
      <Box 
        sx={{
          width: '100%', 
          paddingBottom: `${(1 / aspectRatioValue) * 100}%`, 
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          borderRadius: 1,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Select a template to preview collage
          </Typography>
        </Box>
      </Box>
    );
  }

  // Check if any panel has transform mode enabled for dynamic touch behavior
  const anyPanelInTransformMode = Object.values(isTransformMode).some(enabled => enabled);
  
  // Allow scrolling when caption editor is open or no panels are in transform mode
  const shouldAllowScrolling = textEditingPanel !== null || !anyPanelInTransformMode;

  return (
    <Box ref={containerRef} sx={{ position: 'relative', width: '100%', overflow: 'visible' }}>
      <canvas
        ref={canvasRef}
        data-testid="canvas-collage-preview"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          border: `1px solid ${theme.palette.divider}`,
          touchAction: shouldAllowScrolling ? 'auto' : 'none', // Allow scrolling when caption editor is open
        }}
      />
      
      {/* Control panels positioned over canvas */}
      {panelRects.map((rect) => {
        const { panelId, index } = rect;
        const imageIndex = panelImageMapping[panelId];
        const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
        const isInTransformMode = isTransformMode[panelId];
        
        // Calculate responsive dimensions based on panel size with mobile-friendly minimums
        const minPanelSize = Math.min(rect.width, rect.height);
        const isMobileSize = minPanelSize < 200; // Detect mobile-sized panels
        
        // Use larger minimums for mobile touch targets
        const collapsedHeight = Math.max(isMobileSize ? 28 : 24, Math.min(40, minPanelSize * 0.15));
        const sidePadding = Math.max(isMobileSize ? 6 : 4, Math.min(12, rect.width * 0.02));
        const tabSize = Math.max(isMobileSize ? 28 : 22, Math.min(32, minPanelSize * 0.12)); // Slightly smaller but still touch-friendly
        const fontSize = Math.max(isMobileSize ? 11 : 10, Math.min(14, minPanelSize * 0.08));
        const borderRadius = Math.max(3, Math.min(8, minPanelSize * 0.02));
        
        // Calculate dynamic expanded height based on content needs
        const tabRowHeight = tabSize + (isMobileSize ? 12 : 8); // Tab height + margin
        const contentAreaHeight = isMobileSize ? 80 : 65; // More space for content (text field, sliders, etc.)
        const containerPadding = (isMobileSize ? 12 : 8); // Top/bottom padding
        const expandedHeight = Math.max(
          tabRowHeight + contentAreaHeight + containerPadding,
          isMobileSize ? 120 : 100 // Ensure minimum usable height
        );
        
        return (
          <Box key={`controls-${panelId}`}>
            {/* Transform control button */}
            {hasImage && (textEditingPanel === null || textEditingPanel === panelId) && (
              <IconButton
                size="small"
                onClick={() => toggleTransformMode(panelId)}
                sx={{
                  position: 'absolute',
                  top: rect.y + 8,
                  left: rect.x + rect.width - 48, // Simplified positioning
                  width: 40,
                  height: 40,
                  backgroundColor: isInTransformMode ? '#4CAF50' : '#2196F3',
                  color: '#ffffff',
                  border: '2px solid #ffffff',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  '&:hover': {
                    backgroundColor: isInTransformMode ? '#388E3C' : '#1976D2',
                    transform: 'scale(1.1)',
                  },
                  zIndex: 12, // Higher than caption overlay to ensure interactivity
                }}
              >
                {isInTransformMode ? <Check sx={{ fontSize: 20 }} /> : <OpenWith sx={{ fontSize: 16 }} />}
              </IconButton>
            )}
            
            {/* Caption editing area - show when not in transform mode and has image, and no other panel is being edited */}
            {!isTransformMode?.[panelId] && hasImage && (textEditingPanel === null || textEditingPanel === panelId) && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: textEditingPanel === panelId ? rect.y + rect.height : rect.y + rect.height - collapsedHeight,
                    // When collapsed: frame-specific positioning, when expanded: canvas-wide positioning
                    left: textEditingPanel === panelId ? sidePadding : rect.x + sidePadding,
                    // When collapsed: frame-specific width, when expanded: canvas-wide width
                    width: textEditingPanel === panelId ? componentWidth - (sidePadding * 2) : rect.width - (sidePadding * 2),
                    height: textEditingPanel === panelId ? 'auto' : collapsedHeight,
                    zIndex: 20, // Above everything else including transform buttons
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    borderRadius: `${borderRadius}px`,
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    transition: 'all 0.3s ease-in-out', // Smooth expand/collapse
                    overflow: 'hidden',
                  }}
                >
                                  {/* Collapsed state - show clickable area to expand */}
                  {textEditingPanel !== panelId && (
                    <Box
                      onClick={(e) => {
                        handleTextEdit(panelId, e);
                      }}
                      sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        },
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: panelTexts[panelId]?.content ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                          fontSize: `${fontSize}px`,
                          textAlign: 'center',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                          px: 1,
                        }}
                      >
                        {panelTexts[panelId]?.content || 'Add Captions'}
                      </Typography>
                    </Box>
                  )}

                  {/* Expanded editing controls - only show when this panel is being edited */}
                  {textEditingPanel === panelId && (
                    <Box sx={{ p: Math.max(isMobileSize ? 0.5 : 0.375, Math.min(0.75, sidePadding)), pt: 0 }}>
                      {/* Setting tabs - always visible */}
                      <Tabs
                        value={activeTextSetting ? ['content', 'fontSize', 'strokeWidth', 'fontWeight', 'fontFamily', 'color'].indexOf(activeTextSetting) : false}
                        onChange={(event, newValue) => {
                          const settings = ['content', 'fontSize', 'strokeWidth', 'fontWeight', 'fontFamily', 'color'];
                          const newSetting = settings[newValue];
                          // Toggle behavior: if clicking the same tab, deselect it
                          setActiveTextSetting(activeTextSetting === newSetting ? null : newSetting);
                        }}
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                        sx={{
                          mb: Math.max(isMobileSize ? 0.5 : 0.375, Math.min(0.75, sidePadding * 0.75)),
                          '& .MuiTab-root': {
                            minHeight: 36, // Make tabs shorter
                          },
                        }}
                      >
                        <Tab
                          icon={<Edit />}
                          iconPosition="start"
                          label="Text"
                          title="Edit Text"
                        />
                        <Tab
                          icon={<FormatSize />}
                          iconPosition="start"
                          label="Size"
                          title="Font Size"
                        />
                        <Tab
                          icon={<BorderOuter />}
                          iconPosition="start"
                          label="Stroke"
                          title="Stroke Width"
                        />
                        <Tab
                          icon={<FormatBold />}
                          iconPosition="start"
                          label="Weight"
                          title="Font Weight"
                        />
                        <Tab
                          icon={<FontDownload />}
                          iconPosition="start"
                          label="Font"
                          title="Font Family"
                        />
                        <Tab
                          icon={<FormatColorText />}
                          iconPosition="start"
                          label="Color"
                          title="Text Color"
                        />
                      </Tabs>

                      {/* Active setting panel - appears below the tabs */}
                      {activeTextSetting === 'content' && (
                        <Box sx={{ mb: 0.5, px: 0.75, py: 0.25, bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }}>
                          <TextField
                            fullWidth
                            multiline
                            rows={isMobileSize ? 2 : 3} // Fixed rows for consistent sizing
                            size="small"
                            placeholder="Add Captions"
                            value={panelTexts[panelId]?.content || ''}
                            onChange={(e) => handleTextChange(panelId, 'content', e.target.value)}
                            inputRef={(el) => {
                              if (el) {
                                textFieldRefs.current[panelId] = el;
                              }
                            }}
                            autoFocus={textEditingPanel === panelId && activeTextSetting === 'content'}
                            sx={{
                              '& .MuiInputBase-root': {
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: '#ffffff',
                                fontSize: `${fontSize}px`,
                              },
                              '& .MuiInputBase-input': {
                                textAlign: 'center',
                                padding: `${Math.max(4, Math.min(8, sidePadding))}px`,
                                color: '#ffffff',
                                '&::placeholder': {
                                  color: 'rgba(255, 255, 255, 0.5)',
                                  opacity: 1,
                                },
                              },
                              '& .MuiOutlinedInput-notchedOutline': {
                                border: 'none',
                              },
                            }}
                          />
                        </Box>
                      )}
                    
                    {activeTextSetting === 'fontSize' && (
                      <Box sx={{ mb: 0.5, px: 0.75, py: 0.25, bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }}>
                        <Typography gutterBottom variant="caption" sx={{ fontSize: `${fontSize * 0.9}px`, mb: 0.375, color: '#ffffff' }}>
                          Size: {panelTexts[panelId]?.fontSize || lastUsedTextSettings.fontSize || 26}px
                        </Typography>
                        <Slider
                          value={panelTexts[panelId]?.fontSize || lastUsedTextSettings.fontSize || 26}
                          onChange={(e, value) => handleTextChange(panelId, 'fontSize', value)}
                          min={8}
                          max={72}
                          step={1}
                          size="small"
                          sx={{ 
                            height: Math.max(isMobileSize ? 8 : 6, Math.min(12, fontSize * 0.8)),
                            color: '#ffffff',
                            '& .MuiSlider-track': {
                              height: Math.max(isMobileSize ? 4 : 3, Math.min(6, fontSize * 0.4)),
                            },
                            '& .MuiSlider-rail': {
                              height: Math.max(isMobileSize ? 4 : 3, Math.min(6, fontSize * 0.4)),
                              color: 'rgba(255, 255, 255, 0.3)',
                            },
                            '& .MuiSlider-thumb': {
                              height: Math.max(isMobileSize ? 16 : 12, Math.min(22, fontSize * 1.2)),
                              width: Math.max(isMobileSize ? 16 : 12, Math.min(22, fontSize * 1.2)),
                              color: '#ffffff',
                              '&:before': {
                                boxShadow: '0 2px 4px 0 rgb(0 0 0 / 20%)'
                              },
                              '&:hover, &.Mui-focusVisible': {
                                boxShadow: '0px 0px 0px 6px rgb(255 255 255 / 16%)'
                              }
                            }
                          }}
                        />
                      </Box>
                    )}
                    
                    {activeTextSetting === 'strokeWidth' && (
                      <Box sx={{ mb: 0.5, px: 0.75, py: 0.25, bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }}>
                        <Typography gutterBottom variant="caption" sx={{ fontSize: `${fontSize * 0.9}px`, mb: 0.375, color: '#ffffff' }}>
                          Stroke: {panelTexts[panelId]?.strokeWidth || lastUsedTextSettings.strokeWidth || 2}px
                        </Typography>
                        <Slider
                          value={panelTexts[panelId]?.strokeWidth || lastUsedTextSettings.strokeWidth || 2}
                          onChange={(e, value) => handleTextChange(panelId, 'strokeWidth', value)}
                          min={0}
                          max={10}
                          step={0.5}
                          size="small"
                          sx={{ 
                            height: Math.max(isMobileSize ? 8 : 6, Math.min(12, fontSize * 0.8)),
                            color: '#ffffff',
                            '& .MuiSlider-track': {
                              height: Math.max(isMobileSize ? 4 : 3, Math.min(6, fontSize * 0.4)),
                            },
                            '& .MuiSlider-rail': {
                              height: Math.max(isMobileSize ? 4 : 3, Math.min(6, fontSize * 0.4)),
                              color: 'rgba(255, 255, 255, 0.3)',
                            },
                            '& .MuiSlider-thumb': {
                              height: Math.max(isMobileSize ? 16 : 12, Math.min(22, fontSize * 1.2)),
                              width: Math.max(isMobileSize ? 16 : 12, Math.min(22, fontSize * 1.2)),
                              color: '#ffffff',
                              '&:before': {
                                boxShadow: '0 2px 4px 0 rgb(0 0 0 / 20%)'
                              },
                              '&:hover, &.Mui-focusVisible': {
                                boxShadow: '0px 0px 0px 6px rgb(255 255 255 / 16%)'
                              }
                            }
                          }}
                        />
                      </Box>
                    )}
                    
                    {activeTextSetting === 'fontWeight' && (
                      <Box sx={{ mb: 0.5, px: 0.75, py: 0.25, bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }}>
                        <FormControl fullWidth size="small">
                          <Select
                            value={panelTexts[panelId]?.fontWeight || lastUsedTextSettings.fontWeight || '700'}
                            onChange={(e) => handleTextChange(panelId, 'fontWeight', e.target.value)}
                            displayEmpty
                            sx={{ 
                              '& .MuiSelect-select': { 
                                py: Math.max(0.25, Math.min(0.5, sidePadding * 0.5)), 
                                color: '#ffffff',
                                fontSize: `${fontSize}px`,
                                '&:focus': {
                                  backgroundColor: 'transparent',
                                }
                              },
                              '& .MuiOutlinedInput-notchedOutline': {
                                border: 'none',
                              },
                              '& .MuiSvgIcon-root': {
                                color: '#ffffff',
                              }
                            }}
                            MenuProps={{
                              PaperProps: {
                                sx: { 
                                  bgcolor: 'rgba(0, 0, 0, 0.9)',
                                  '& .MuiMenuItem-root': {
                                    color: '#ffffff',
                                    fontSize: `${fontSize}px`,
                                  }
                                }
                              }
                            }}
                          >
                            <MenuItem value="normal">Normal</MenuItem>
                            <MenuItem value="bold">Bold</MenuItem>
                            <MenuItem value="lighter">Light</MenuItem>
                            <MenuItem value="400">400</MenuItem>
                            <MenuItem value="500">500</MenuItem>
                            <MenuItem value="600">600</MenuItem>
                            <MenuItem value="700">700</MenuItem>
                            <MenuItem value="800">800</MenuItem>
                            <MenuItem value="900">900</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    )}
                    
                    {activeTextSetting === 'fontFamily' && (
                      <Box sx={{ mb: 0.5, px: 0.75, py: 0.25, bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }}>
                        <FormControl fullWidth size="small">
                          <Select
                            value={panelTexts[panelId]?.fontFamily || lastUsedTextSettings.fontFamily || 'Arial'}
                            onChange={(e) => handleTextChange(panelId, 'fontFamily', e.target.value)}
                            displayEmpty
                            sx={{ 
                              '& .MuiSelect-select': { 
                                py: Math.max(0.25, Math.min(0.5, sidePadding * 0.5)), 
                                color: '#ffffff',
                                fontSize: `${fontSize}px`,
                                '&:focus': {
                                  backgroundColor: 'transparent',
                                }
                              },
                              '& .MuiOutlinedInput-notchedOutline': {
                                border: 'none',
                              },
                              '& .MuiSvgIcon-root': {
                                color: '#ffffff',
                              }
                            }}
                            MenuProps={{
                              PaperProps: {
                                sx: { 
                                  maxHeight: Math.max(120, Math.min(200, expandedHeight * 0.8)),
                                  bgcolor: 'rgba(0, 0, 0, 0.9)',
                                  '& .MuiMenuItem-root': {
                                    color: '#ffffff',
                                    fontSize: `${fontSize}px`,
                                  }
                                }
                              }
                            }}
                          >
                            {fonts.map((font) => (
                              <MenuItem key={font} value={font}>
                                {font}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                    )}
                    
                    {activeTextSetting === 'color' && (
                      <Box sx={{ mb: 0.5, px: 0.75, py: 0.25, bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', gap: Math.max(0.125, Math.min(0.25, sidePadding * 0.25)), flexWrap: 'wrap', mb: 0.375 }}>
                          {['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'].map((color) => (
                            <Button
                              key={color}
                              onClick={() => handleTextChange(panelId, 'color', color)}
                              sx={{
                                width: Math.max(isMobileSize ? 18 : 16, Math.min(22, fontSize * 1.1)),
                                height: Math.max(isMobileSize ? 18 : 16, Math.min(22, fontSize * 1.1)),
                                minWidth: Math.max(isMobileSize ? 18 : 16, Math.min(22, fontSize * 1.1)),
                                p: 0,
                                backgroundColor: color,
                                border: (panelTexts[panelId]?.color || lastUsedTextSettings.color || '#ffffff') === color ? '2px solid #2196F3' : '1px solid #ccc',
                                '&:hover': {
                                  backgroundColor: color,
                                  opacity: 0.8,
                                }
                              }}
                            />
                          ))}
                        </Box>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="#ffffff"
                          value={panelTexts[panelId]?.color || lastUsedTextSettings.color || '#ffffff'}
                          onChange={(e) => handleTextChange(panelId, 'color', e.target.value)}
                          sx={{ 
                            '& .MuiInputBase-input': { 
                              py: Math.max(0.25, Math.min(0.5, sidePadding * 0.5)), 
                              fontSize: `${fontSize * 0.8}px`,
                              color: '#ffffff',
                            },
                            '& .MuiInputBase-root': {
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                              border: 'none',
                            },
                          }}
                        />
                      </Box>
                    )}
                    
                    {/* Done button at the bottom */}
                    <Box sx={{ mt: Math.max(isMobileSize ? 0.75 : 0.5, Math.min(1, sidePadding)), px: 0.5 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={handleTextClose}
                        sx={{
                          height: Math.max(isMobileSize ? 36 : 32, Math.min(44, fontSize * 2.2)),
                          backgroundColor: '#4CAF50', // Green color
                          color: '#ffffff',
                          fontSize: `${fontSize}px`,
                          fontWeight: '600',
                          textTransform: 'none',
                          borderRadius: `${borderRadius}px`,
                          border: 'none',
                          boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
                          '&:hover': {
                            backgroundColor: '#45a049',
                            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)',
                            transform: 'translateY(-1px)',
                          },
                          '&:active': {
                            transform: 'translateY(0)',
                            boxShadow: '0 2px 6px rgba(76, 175, 80, 0.3)',
                          },
                          transition: 'all 0.2s ease-in-out',
                        }}
                      >
                        Done
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            )}
            

          </Box>
        );
      })}

      {/* Hover overlays - positioned over canvas panels */}
      {panelRects.map((rect, index) => {
        const { panelId } = rect;
        const imageIndex = panelImageMapping[panelId];
        const hasImage = imageIndex !== undefined && loadedImages[imageIndex];
        const isHovered = hoveredPanel === index;
        const isInTransformMode = isTransformMode[panelId];
        
        // Only show hover overlay when actually hovered and not in transform mode
        if (!isHovered || isInTransformMode) return null;
        
        return (
          <Box
            key={`hover-overlay-${panelId}`}
            sx={{
              position: 'absolute',
              top: rect.y,
              left: rect.x,
              width: rect.width,
              height: rect.height,
              backgroundColor: hasImage 
                ? 'rgba(0, 0, 0, 0.1)' // Light overlay for images
                : 'rgba(0, 0, 0, 0.4)', // Darker overlay for empty panels
              pointerEvents: 'none', // Don't interfere with mouse events
              transition: 'backgroundColor 0.2s ease-in-out',
              zIndex: 5, // Above canvas, below control buttons
            }}
          />
        );
      })}


    </Box>
  );
};

export default CanvasCollagePreview; 
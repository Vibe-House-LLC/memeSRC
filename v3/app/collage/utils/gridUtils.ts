/**
 * Helper function to parse grid templates (e.g., "repeat(2, 1fr)" or "1fr 2fr")
 */
export const parseGridTemplate = (template: string): number[] => {
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
 */
export const parseValue = (value: string): number => {
  const frMatch = value.match(/(\d+)fr/);
  if (frMatch) {
    return parseInt(frMatch[1], 10);
  }
  return 1; // Default to 1 for unsupported formats
};

/**
 * Helper to parse grid areas from a gridTemplateAreas string
 */
export const parseGridAreas = (areasTemplate: string): string[][] => {
  return areasTemplate
    .split('"')
    .filter(str => str.trim().length > 0)
    .map(row => row.trim().split(/\s+/));
};

/**
 * Helper to find a named area's position in the grid
 */
export const findAreaPosition = (
  areaName: string, 
  gridAreas: string[][], 
  gridColumns: number[], 
  gridRows: number[],
  cellWidths: number[],
  cellHeights: number[]
) => {
  let startRow = -1, startCol = -1, endRow = -1, endCol = -1;
  
  // Find area boundaries
  for (let row = 0; row < gridAreas.length; row+=1) {
    for (let col = 0; col < gridAreas[row].length; col+=1) {
      if (gridAreas[row][col] === areaName) {
        if (startRow === -1) {
          startRow = row;
          startCol = col;
        }
        endRow = row;
        endCol = Math.max(endCol, col);
      }
    }
  }
  
  if (startRow === -1) return null; // Area not found
  
  // Calculate position and size
  const x = cellWidths.slice(0, startCol).reduce((sum, w) => sum + w, 0);
  const y = cellHeights.slice(0, startRow).reduce((sum, h) => sum + h, 0);
  const width = cellWidths.slice(startCol, endCol + 1).reduce((sum, w) => sum + w, 0);
  const height = cellHeights.slice(startRow, endRow + 1).reduce((sum, h) => sum + h, 0);
  
  return { x, y, width, height };
};

/**
 * Utility for drawing an image within a cell while maintaining aspect ratio
 */
export const drawImageInCell = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cellX: number,
  cellY: number,
  cellWidth: number,
  cellHeight: number,
  borderThickness: number,
  borderColor: string
) => {
  // Calculate scaling to fit image in cell while maintaining aspect ratio
  const aspectRatio = img.width / img.height;
  let drawWidth = cellWidth;
  let drawHeight = cellHeight;
  
  if (aspectRatio > 1) {
    // Landscape image
    drawHeight = drawWidth / aspectRatio;
    if (drawHeight < cellHeight) {
      // Center vertically
      const centerY = cellY + (cellHeight - drawHeight) / 2;
      ctx.drawImage(img, cellX, centerY, drawWidth, drawHeight);
      
      // Draw border
      if (borderThickness > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderThickness;
        ctx.strokeRect(cellX, centerY, drawWidth, drawHeight);
      }
    } else {
      // Scale to fit height
      drawWidth = cellHeight * aspectRatio;
      drawHeight = cellHeight;
      const centerX = cellX + (cellWidth - drawWidth) / 2;
      ctx.drawImage(img, centerX, cellY, drawWidth, drawHeight);
      
      // Draw border
      if (borderThickness > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderThickness;
        ctx.strokeRect(centerX, cellY, drawWidth, drawHeight);
      }
    }
  } else {
    // Portrait image
    drawWidth = drawHeight * aspectRatio;
    if (drawWidth < cellWidth) {
      // Center horizontally
      const centerX = cellX + (cellWidth - drawWidth) / 2;
      ctx.drawImage(img, centerX, cellY, drawWidth, drawHeight);
      
      // Draw border
      if (borderThickness > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderThickness;
        ctx.strokeRect(centerX, cellY, drawWidth, drawHeight);
      }
    } else {
      // Scale to fit width
      drawWidth = cellWidth;
      drawHeight = cellWidth / aspectRatio;
      const centerY = cellY + (cellHeight - drawHeight) / 2;
      ctx.drawImage(img, cellX, centerY, drawWidth, drawHeight);
      
      // Draw border
      if (borderThickness > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderThickness;
        ctx.strokeRect(cellX, centerY, drawWidth, drawHeight);
      }
    }
  }
}; 
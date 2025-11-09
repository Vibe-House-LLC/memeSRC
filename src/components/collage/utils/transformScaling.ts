// Transform scaling utilities for cross-device project loading

export interface PanelTransform {
  scale: number;
  positionX: number;
  positionY: number;
}

export interface ScalingContext {
  savedCanvasWidth?: number;
  savedCanvasHeight?: number;
  savedPanelDimensions?: Record<string, { width: number; height: number }>;
  currentCanvasWidth: number;
  currentCanvasHeight: number;
  currentPanelDimensions: Record<string, { width: number; height: number }>;
}

/**
 * Scale transforms from saved dimensions to current dimensions.
 * 
 * Strategy:
 * 1. Panel-first: If both saved and current panel dimensions exist, scale per-panel (most accurate)
 * 2. Canvas fallback: If panel dims unavailable, scale based on canvas size (less accurate but works)
 * 3. No-op: If source dimensions missing, return null (use transforms as-is)
 * 
 * @param transforms - Original transforms to scale
 * @param context - Saved and current dimensions
 * @returns Scaled transforms, or null if no scaling needed/possible
 */
export function scaleTransforms(
  transforms: Record<string, any>,
  context: ScalingContext
): Record<string, PanelTransform> | null {
  if (!transforms || typeof transforms !== 'object') {
    return null;
  }

  const {
    savedCanvasWidth,
    savedCanvasHeight,
    savedPanelDimensions,
    currentCanvasWidth,
    currentCanvasHeight,
    currentPanelDimensions,
  } = context;

  // Strategy 1: Panel-first scaling (most accurate)
  if (savedPanelDimensions && currentPanelDimensions && Object.keys(savedPanelDimensions).length > 0) {
    const scaled: Record<string, PanelTransform> = {};
    let anyScaled = false;

    Object.entries(transforms).forEach(([panelId, transform]) => {
      const savedDims = savedPanelDimensions[panelId];
      const currentDims = currentPanelDimensions[panelId];

      if (!savedDims || !currentDims || !transform || typeof transform !== 'object') {
        // Keep original transform if dimensions missing
        scaled[panelId] = transform as PanelTransform;
        return;
      }

      const { width: savedWidth, height: savedHeight } = savedDims;
      const { width: currentWidth, height: currentHeight } = currentDims;

      if (!savedWidth || !savedHeight || !currentWidth || !currentHeight) {
        scaled[panelId] = transform as PanelTransform;
        return;
      }

      const scaleX = currentWidth / savedWidth;
      const scaleY = currentHeight / savedHeight;

      // Only scale if dimensions actually changed
      if (Math.abs(scaleX - 1) < 0.0001 && Math.abs(scaleY - 1) < 0.0001) {
        scaled[panelId] = transform as PanelTransform;
        return;
      }

      anyScaled = true;
      scaled[panelId] = {
        scale: (transform as any).scale || 1,
        positionX: ((transform as any).positionX || 0) * scaleX,
        positionY: ((transform as any).positionY || 0) * scaleY,
      };
    });

    return anyScaled ? scaled : null;
  }

  // Strategy 2: Canvas-based scaling (fallback)
  if (savedCanvasWidth && savedCanvasHeight && currentCanvasWidth && currentCanvasHeight) {
    const scaleX = currentCanvasWidth / savedCanvasWidth;
    const scaleY = currentCanvasHeight / savedCanvasHeight;

    // Only scale if canvas size actually changed
    if (Math.abs(scaleX - 1) < 0.0001 && Math.abs(scaleY - 1) < 0.0001) {
      return null;
    }

    const scaled: Record<string, PanelTransform> = {};

    Object.entries(transforms).forEach(([panelId, transform]) => {
      if (!transform || typeof transform !== 'object') {
        scaled[panelId] = transform as PanelTransform;
        return;
      }

      scaled[panelId] = {
        scale: (transform as any).scale || 1,
        positionX: ((transform as any).positionX || 0) * scaleX,
        positionY: ((transform as any).positionY || 0) * scaleY,
      };
    });

    return scaled;
  }

  // Strategy 3: No scaling possible
  return null;
}

/**
 * Check if transforms need scaling based on dimension changes.
 * Useful for determining if scaling should be attempted.
 */
export function needsScaling(context: ScalingContext): boolean {
  const {
    savedCanvasWidth,
    savedCanvasHeight,
    savedPanelDimensions,
    currentCanvasWidth,
    currentCanvasHeight,
    currentPanelDimensions,
  } = context;

  // Check panel-level changes
  if (savedPanelDimensions && currentPanelDimensions) {
    for (const panelId of Object.keys(savedPanelDimensions)) {
      const saved = savedPanelDimensions[panelId];
      const current = currentPanelDimensions[panelId];
      
      if (!saved || !current) continue;
      
      const scaleX = current.width / saved.width;
      const scaleY = current.height / saved.height;
      
      if (Math.abs(scaleX - 1) >= 0.0001 || Math.abs(scaleY - 1) >= 0.0001) {
        return true;
      }
    }
    return false;
  }

  // Check canvas-level changes
  if (savedCanvasWidth && savedCanvasHeight && currentCanvasWidth && currentCanvasHeight) {
    const scaleX = currentCanvasWidth / savedCanvasWidth;
    const scaleY = currentCanvasHeight / savedCanvasHeight;
    
    return Math.abs(scaleX - 1) >= 0.0001 || Math.abs(scaleY - 1) >= 0.0001;
  }

  return false;
}


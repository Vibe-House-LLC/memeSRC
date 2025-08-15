import {
  getLayoutsForPanelCount,
  createAutoLayout,
  layoutStyles,
  recommendedLayouts
} from './layouts';

// Aspect ratio presets
export const aspectRatioPresets = [
  { id: 'square', name: 'Square', value: 1 },
  { id: 'portrait', name: 'Portrait', value: 0.8 },
  { id: 'ratio-2-3', name: '2:3', value: 2/3 },
  { id: 'story', name: 'Instagram Story', value: 0.5625 },
  { id: 'classic', name: 'Classic', value: 1.33 },
  { id: 'ratio-3-2', name: '3:2', value: 1.5 },
  { id: 'landscape', name: 'Landscape', value: 1.78 }
];


/**
 * Main exported layoutTemplates array with Auto Layout and dynamic templates for 2-5 panels
 */
export const layoutTemplates = [
  // Auto Layout - handles cases automatically
  {
    id: 'autoLayout',
    name: 'Auto Layout',
    panels: 5,
    arrangement: 'auto',
    minImages: 2,
    maxImages: 5,
    renderPreview: (aspectRatio, theme, imageCount = 0) =>
      createAutoLayout(Math.max(2, imageCount || 2), aspectRatio, theme, aspectRatioPresets)
  },
  
  // Dynamic templates for each panel count (2-5)
  ...Array.from({ length: 4 }, (_, i) => i + 2).map(panelCount => ({
    id: `dynamic-${panelCount}-panel`,
    name: `${panelCount} Panel Templates`,
    panels: panelCount,
    arrangement: 'dynamic',
    minImages: panelCount,
    maxImages: panelCount,
    renderPreview: (aspectRatio, theme, imageCount = 0) => {
      const actualImageCount = imageCount || panelCount;
      const closestAspectRatio = aspectRatioPresets.find(preset => preset.value === aspectRatio) ||
                                aspectRatioPresets.find(preset => preset.id === 'square');
      const aspectRatioId = closestAspectRatio?.id || 'square';
      
      // Forward to our layout module system
      const layouts = getLayoutsForPanelCount(panelCount, aspectRatioId);
      if (layouts.length > 0) {
        return layouts[0].renderPreview(aspectRatio, theme, actualImageCount);
      }
      
      // Should never reach here as our layout system is comprehensive
      return createAutoLayout(actualImageCount, aspectRatio, theme, aspectRatioPresets);
    }
  }))
];

// Re-export the getLayoutsForPanelCount function for external use
export { getLayoutsForPanelCount };

// Re-export the layoutStyles and recommendedLayouts for use in UI components
export { layoutStyles, recommendedLayouts }; 
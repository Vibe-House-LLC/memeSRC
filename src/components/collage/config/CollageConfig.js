import React from 'react';
import { 
  layoutDefinitions, 
  getLayoutsForPanelCount, 
  createAutoLayout,
  layoutStyles,
  recommendedLayouts
} from './layouts';

// Aspect ratio presets
export const aspectRatioPresets = [
  { id: 'square', name: 'Square', value: 1 },
  { id: 'portrait', name: 'Portrait', value: 0.8 },
  { id: 'story', name: 'Instagram Story', value: 0.5625 },
  { id: 'classic', name: 'Classic', value: 1.33 },
  { id: 'landscape', name: 'Landscape', value: 1.78 },
  { id: 'custom', name: 'Custom', value: 'custom' }
];

// Simple Panel component
const SimplePanel = ({ filled, theme }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      backgroundColor: filled 
        ? (theme?.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.3)' : 'rgba(25, 118, 210, 0.1)')
        : (theme?.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'white'),
      border: `1px solid ${theme?.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)'}`,
      borderRadius: '4px',
      boxSizing: 'border-box',
    }}
  />
);

// Grid container style
const getBaseGridStyle = (theme) => ({
  width: '100%',
  height: '100%',
  display: 'grid',
  gap: '4px',
  padding: '4px',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
  borderRadius: theme.shape.borderRadius,
  transition: 'all 0.3s ease',
  boxSizing: 'border-box',
});

// Shared render function for all layouts
const renderLayoutGrid = (layoutConfig, theme, imageCount) => {
  return (
    <div
      style={{
        ...getBaseGridStyle(theme),
        gridTemplateColumns: layoutConfig.gridTemplateColumns,
        gridTemplateRows: layoutConfig.gridTemplateRows,
        gridTemplateAreas: layoutConfig.gridTemplateAreas,
      }}
    >
      {layoutConfig.areas 
        ? layoutConfig.areas.map((area, index) => (
            <div key={index} style={{ gridArea: area }}>
              <SimplePanel theme={theme} filled={imageCount > index} />
            </div>
          ))
        : layoutConfig.items.map((item, index) => (
            <div key={index} style={item}>
              <SimplePanel theme={theme} filled={imageCount > index} />
            </div>
          ))
      }
    </div>
  );
};

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
    renderPreview: (aspectRatio, theme, imageCount = 0) => {
      return createAutoLayout(Math.max(2, imageCount || 2), aspectRatio, theme, aspectRatioPresets);
    }
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
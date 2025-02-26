import React from 'react';

// Simple Panel component
export const SimplePanel = ({ filled, theme }) => (
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
export const getBaseGridStyle = (theme) => ({
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
export const renderLayoutGrid = (layoutConfig, theme, imageCount) => {
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
 * Helper function to determine aspect ratio category
 */
export const getAspectRatioCategory = (aspectRatioId) => {
  // Group aspect ratios into three categories
  const wideAspects = ['landscape', 'classic'];
  const tallAspects = ['portrait', 'story'];
  const squareAspects = ['square', 'custom'];
  
  if (wideAspects.includes(aspectRatioId)) return 'wide';
  if (tallAspects.includes(aspectRatioId)) return 'tall';
  return 'square';
}; 
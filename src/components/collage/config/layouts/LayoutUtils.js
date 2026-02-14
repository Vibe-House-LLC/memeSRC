import React from 'react';
import PropTypes from 'prop-types';

// Simple Panel component
export const SimplePanel = ({ filled, theme }) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      backgroundColor: filled 
        ? (theme?.palette.mode === 'dark' ? 'rgba(245, 245, 245, 0.16)' : 'rgba(245, 245, 245, 0.3)')
        : (theme?.palette.mode === 'dark' ? 'rgba(245, 245, 245, 0.08)' : 'rgba(16, 18, 20, 0.06)'),
      border: `1px solid ${theme?.palette.mode === 'dark' ? 'rgba(245, 245, 245, 0.58)' : 'rgba(16, 18, 20, 0.34)'}`,
      borderRadius: '4px',
      boxSizing: 'border-box',
    }}
  />
);

SimplePanel.propTypes = {
  filled: PropTypes.bool,
  theme: PropTypes.shape({
    palette: PropTypes.shape({
      mode: PropTypes.string,
    }),
  }),
};

// Grid container style
export const getBaseGridStyle = (theme) => ({
  width: '100%',
  height: '100%',
  display: 'grid',
  gap: '4px',
  padding: '4px',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(245, 245, 245, 0.08)' : 'rgba(16, 18, 20, 0.05)',
  borderRadius: theme.shape.borderRadius,
  transition: 'all 0.3s ease',
  boxSizing: 'border-box',
});

// Shared render function for all layouts
export const renderLayoutGrid = (layoutConfig, theme, imageCount) => (
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
        ))}
  </div>
);

/**
 * Helper function to determine aspect ratio category
 */
export const getAspectRatioCategory = (aspectRatioId, customAspectRatioValue = null) => {
  // Group aspect ratios into three categories
  const wideAspects = ['landscape', 'classic', 'ratio-3-2'];
  const tallAspects = ['portrait', 'story', 'ratio-2-3'];

  if (aspectRatioId === 'custom') {
    const customRatio = Number(customAspectRatioValue);
    if (Number.isFinite(customRatio) && customRatio > 0) {
      if (customRatio > 1) return 'wide';
      if (customRatio < 1) return 'tall';
    }
    return 'square';
  }

  if (wideAspects.includes(aspectRatioId)) return 'wide';
  if (tallAspects.includes(aspectRatioId)) return 'tall';
  return 'square';
}; 

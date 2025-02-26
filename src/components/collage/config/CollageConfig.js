import React from 'react';

// Aspect ratio presets
export const aspectRatioPresets = [
  { id: 'square', name: 'Square (1:1)', value: 1 },
  { id: 'portrait', name: 'Portrait (4:5)', value: 0.8 },
  { id: 'landscape', name: 'Landscape (16:9)', value: 1.78 },
  { id: 'story', name: 'Instagram Story (9:16)', value: 0.5625 },
  { id: 'facebook', name: 'Facebook Post (1.91:1)', value: 1.91 },
  { id: 'widescreen', name: 'Widescreen (2:1)', value: 2 },
  { id: 'pinterest', name: 'Pinterest (2:3)', value: 0.667 },
  { id: 'custom', name: 'Custom', value: 'custom' }
];

// Simple Panel component to replace SVGPanel
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

// Common grid container style properties
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
      {layoutConfig.items.map((item, index) => (
        <div key={index} style={item}>
          <SimplePanel theme={theme} filled={imageCount > index} />
        </div>
      ))}
    </div>
  );
};

// Helper to create simple grid layout configurations
const createSimpleGridConfig = (columns, rows, itemCount) => ({
  gridTemplateColumns: typeof columns === 'number' ? `repeat(${columns}, 1fr)` : columns,
  gridTemplateRows: typeof rows === 'number' ? `repeat(${rows}, 1fr)` : rows,
  gridAreas: null,
  items: Array(itemCount).fill({ gridArea: null })
});

// Layout templates
export const layoutTemplates = [
  {
    id: 'adaptiveGrid',
    name: 'Adaptive Grid',
    panels: 9,
    arrangement: 'adaptive',
    minImages: 2,
    maxImages: 9,
    renderPreview: (aspectRatio, theme, imageCount = 0) => {
      // Layout configurations organized by image count
      const layoutConfigs = {
        2: createSimpleGridConfig('1fr 1fr', '1fr', 2),
        3: createSimpleGridConfig('1fr 1fr 1fr', '1fr', 3),
        4: createSimpleGridConfig('1fr 1fr', '1fr 1fr', 4),
        5: {
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gridTemplateAreas: `
            "one one two"
            "three four five"
          `,
          items: [
            { gridArea: 'one' },
            { gridArea: 'two' },
            { gridArea: 'three' },
            { gridArea: 'four' },
            { gridArea: 'five' }
          ]
        },
        6: createSimpleGridConfig('1fr 1fr 1fr', '1fr 1fr', 6),
        7: {
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr 1fr',
          gridTemplateAreas: `
            "one one two two"
            "three four five six"
            "three seven seven six"
          `,
          items: [
            { gridArea: 'one' },
            { gridArea: 'two' },
            { gridArea: 'three' },
            { gridArea: 'four' },
            { gridArea: 'five' },
            { gridArea: 'six' },
            { gridArea: 'seven' }
          ]
        },
        8: {
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr 1fr',
          gridTemplateAreas: `
            "one one two two"
            "three four five six"
            "seven seven eight eight"
          `,
          items: [
            { gridArea: 'one' },
            { gridArea: 'two' },
            { gridArea: 'three' },
            { gridArea: 'four' },
            { gridArea: 'five' },
            { gridArea: 'six' },
            { gridArea: 'seven' },
            { gridArea: 'eight' }
          ]
        },
        9: createSimpleGridConfig('1fr 1fr 1fr', '1fr 1fr 1fr', 9)
      };
      
      // Get layout config for current image count or fallback to a default layout
      const layoutConfig = layoutConfigs[imageCount] || {
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gridAreas: null,
        items: Array(Math.min(4, imageCount)).fill({ gridArea: null })
      };
      
      return renderLayoutGrid(layoutConfig, theme, imageCount);
    }
  },
  {
    id: 'mosaicLayout',
    name: 'Mosaic',
    panels: 9,
    arrangement: 'mosaic',
    minImages: 2,
    maxImages: 6, // Limit to 6 images as per user request
    renderPreview: (aspectRatio, theme, imageCount = 0) => {
      // Layout configurations organized by image count
      const layoutConfigs = {
        2: createSimpleGridConfig('1fr 1fr', '1fr', 2),
        3: {
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gridAreas: null,
          items: [
            { gridRow: 'span 2' },
            { gridArea: null },
            { gridArea: null }
          ]
        },
        4: {
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr 1fr',
          gridTemplateAreas: `
            "main main right1"
            "main main right2"
            "bottom bottom bottom"
          `,
          items: [
            { gridArea: 'main' },
            { gridArea: 'right1' },
            { gridArea: 'right2' },
            { gridArea: 'bottom' }
          ]
        },
        5: {
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gridTemplateAreas: `
            "main main right1"
            "bottom1 bottom2 right2"
          `,
          items: [
            { gridArea: 'main' },
            { gridArea: 'right1' },
            { gridArea: 'right2' },
            { gridArea: 'bottom1' },
            { gridArea: 'bottom2' }
          ]
        },
        6: {
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr 1fr',
          gridTemplateAreas: `
            "main main right1"
            "main main right2"
            "bottom1 bottom2 bottom3"
          `,
          items: [
            { gridArea: 'main' },
            { gridArea: 'right1' },
            { gridArea: 'right2' },
            { gridArea: 'bottom1' },
            { gridArea: 'bottom2' },
            { gridArea: 'bottom3' }
          ]
        }
      };
      
      // Get layout config for current image count or fallback to the 2-image layout
      const layoutConfig = layoutConfigs[imageCount] || layoutConfigs[2];
      
      return renderLayoutGrid(layoutConfig, theme, imageCount);
    }
  },
  {
    id: 'spotlightLayout',
    name: 'Spotlight',
    panels: 9,
    arrangement: 'spotlight',
    minImages: 2,
    maxImages: 7, // Only allow up to 7 images
    renderPreview: (aspectRatio, theme, imageCount = 0) => {
      // Layout configurations organized by image count
      const layoutConfigs = {
        2: {
          gridTemplateColumns: '1fr',
          gridTemplateRows: '2fr 1fr',
          gridAreas: null,
          items: [
            { gridArea: null },
            { gridArea: null }
          ]
        },
        3: {
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '2fr 1fr',
          gridAreas: null,
          items: [
            { gridColumn: 'span 2' },
            { gridArea: null },
            { gridArea: null }
          ]
        },
        4: {
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: '2fr 1fr',
          gridAreas: null,
          items: [
            { gridColumn: 'span 3' },
            { gridArea: null },
            { gridArea: null },
            { gridArea: null }
          ]
        },
        5: {
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr 1fr',
          gridTemplateAreas: `
            "featured featured featured side1"
            "featured featured featured side2"
            "side3 side4 side5 side5"
          `,
          items: [
            { gridArea: 'featured' },
            { gridArea: 'side1' },
            { gridArea: 'side2' },
            { gridArea: 'side3' },
            { gridArea: 'side4' },
            { gridArea: 'side5' }
          ]
        },
        6: {
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr 1fr',
          gridTemplateAreas: `
            "featured featured side1 side2"
            "featured featured side3 side4"
            "featured featured side5 side6"
          `,
          items: [
            { gridArea: 'featured' },
            { gridArea: 'side1' },
            { gridArea: 'side2' },
            { gridArea: 'side3' },
            { gridArea: 'side4' },
            { gridArea: 'side5' },
            { gridArea: 'side6' }
          ]
        },
        7: {
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr 1fr',
          gridTemplateAreas: `
            "featured featured side1 side2"
            "featured featured side3 side4"
            "side5 side6 side7 side7"
          `,
          items: [
            { gridArea: 'featured' },
            { gridArea: 'side1' },
            { gridArea: 'side2' },
            { gridArea: 'side3' },
            { gridArea: 'side4' },
            { gridArea: 'side5' },
            { gridArea: 'side6' },
            { gridArea: 'side7' }
          ]
        }
      };
      
      // Get layout config for current image count or fallback to the 2-image layout
      const layoutConfig = layoutConfigs[imageCount] || layoutConfigs[2];
      
      return renderLayoutGrid(layoutConfig, theme, imageCount);
    }
  },
  {
    id: 'magazineLayout',
    name: 'Magazine',
    panels: 9,
    arrangement: 'magazine',
    minImages: 2,
    maxImages: 6, // Limit to 6 images as per user request
    renderPreview: (aspectRatio, theme, imageCount = 0) => {
      // Layout configurations organized by image count
      const layoutConfigs = {
        2: {
          gridTemplateColumns: '1.5fr 1fr',
          gridTemplateRows: '1fr',
          gridAreas: null,
          items: [
            { gridArea: null },
            { gridArea: null }
          ]
        },
        3: {
          gridTemplateColumns: '2fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gridAreas: null,
          items: [
            { gridArea: null },
            { gridRow: 'span 2' },
            { gridArea: null }
          ]
        },
        4: {
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr 1fr',
          gridTemplateAreas: `
            "main main side1"
            "main main side1"
            "side2 side3 side1"
          `,
          items: [
            { gridArea: 'main' },
            { gridArea: 'side1' },
            { gridArea: 'side2' },
            { gridArea: 'side3' }
          ]
        },
        // Consolidated 5 and 6 image layouts since they're identical
        5: {
          gridTemplateColumns: '1fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr 1fr',
          gridTemplateAreas: `
            "featured featured side1"
            "featured featured side2"
            "side3 side4 side5"
          `,
          items: [
            { gridArea: 'featured' },
            { gridArea: 'side1' },
            { gridArea: 'side2' },
            { gridArea: 'side3' },
            { gridArea: 'side4' },
            { gridArea: 'side5' }
          ]
        }
      };
      
      // Get layout config for current image count or fallback to the 2-image layout
      // For 6 images, use the 5-image layout
      const layoutConfig = layoutConfigs[imageCount === 6 ? 5 : imageCount] || layoutConfigs[2];
      
      return renderLayoutGrid(layoutConfig, theme, imageCount);
    }
  },
  {
    id: 'grid2x2',
    name: 'Grid 2×2',
    panels: 4,
    arrangement: 'grid',
    rows: 2,
    columns: 2,
    minImages: 4,
    maxImages: 4,
    renderPreview: (aspectRatio, theme, imageCount = 0) => {
      const layoutConfig = createSimpleGridConfig(2, 2, 4);
      return renderLayoutGrid(layoutConfig, theme, imageCount);
    }
  },
  {
    id: 'vertical3',
    name: 'Vertical Stack',
    panels: 3,
    arrangement: 'vertical',
    minImages: 3,
    maxImages: 3,
    renderPreview: (aspectRatio, theme, imageCount = 0) => {
      const layoutConfig = {
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr 1fr 1fr',
        gridAreas: null,
        items: Array(3).fill({ gridArea: null })
      };
      return renderLayoutGrid(layoutConfig, theme, imageCount);
    }
  },
  {
    id: 'horizontal3',
    name: 'Horizontal Row',
    panels: 3,
    arrangement: 'horizontal',
    minImages: 3,
    maxImages: 3,
    renderPreview: (aspectRatio, theme, imageCount = 0) => {
      const layoutConfig = {
        gridTemplateColumns: '1fr 1fr 1fr',
        gridTemplateRows: '1fr',
        gridAreas: null,
        items: Array(3).fill({ gridArea: null })
      };
      return renderLayoutGrid(layoutConfig, theme, imageCount);
    }
  },
  {
    id: 'splitVertical',
    name: 'Split Vertical',
    panels: 2,
    arrangement: 'custom',
    customLayout: 'splitVertical',
    minImages: 2,
    maxImages: 2,
    renderPreview: (aspectRatio, theme, imageCount = 0) => {
      const layoutConfig = {
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr 1fr',
        gridAreas: null,
        items: Array(2).fill({ gridArea: null })
      };
      return renderLayoutGrid(layoutConfig, theme, imageCount);
    }
  },
]; 
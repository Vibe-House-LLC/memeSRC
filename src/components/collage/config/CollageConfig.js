import React from 'react';

// Aspect ratio presets
export const aspectRatioPresets = [
  { id: 'landscape', name: 'Landscape (16:9)', value: 1.78 },
  { id: 'classic', name: 'Classic (4:3)', value: 1.33 },
  { id: 'square', name: 'Square (1:1)', value: 1 },
  { id: 'portrait', name: 'Portrait (4:5)', value: 0.8 },
  { id: 'story', name: 'Instagram Story (9:16)', value: 0.5625 },
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

// Simplified layout generator functions
const generateGridLayout = (columns, rows, name, aspectPreference, uniformity = 10) => ({
  id: `grid-${columns}x${rows}`,
  name,
  panels: columns * rows,
  aspectRatioPreference: aspectPreference,
  uniformity,
  getLayoutConfig: () => ({
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gridTemplateAreas: null,
    items: Array(columns * rows).fill({ gridArea: null })
  })
});

const generateColumnsLayout = (count, aspectPreference = ['landscape', 'classic']) => ({
  id: `${count}-columns`,
  name: `${count} Columns`,
  panels: count,
  aspectRatioPreference: aspectPreference,
  uniformity: 10,
  getLayoutConfig: () => ({
    gridTemplateColumns: `repeat(${count}, 1fr)`,
    gridTemplateRows: '1fr',
    gridTemplateAreas: null,
    items: Array(count).fill({ gridArea: null })
  })
});

const generateRowsLayout = (count, aspectPreference = ['portrait', 'story']) => ({
  id: `${count}-rows`,
  name: `${count} Rows`,
  panels: count,
  aspectRatioPreference: aspectPreference,
  uniformity: 10,
  getLayoutConfig: () => ({
    gridTemplateColumns: '1fr',
    gridTemplateRows: `repeat(${count}, 1fr)`,
    gridTemplateAreas: null,
    items: Array(count).fill({ gridArea: null })
  })
});

// Create basic layouts programmatically 
const createBasicLayouts = () => {
  const layouts = {};
  
  // Create layouts for panel counts 2-9
  for (let count = 2; count <= 9; count += 1) {
    layouts[count] = [];
    
    // Only add rows and columns layout for counts where they make sense
    if (count !== 2) { // Removing redundant layouts for 2-panel
      if (count <= 4) {
        // For 3 and 4 panels, add rows layout first (as requested)
        layouts[count].push(generateRowsLayout(count));
        layouts[count].push(generateColumnsLayout(count));
      }
    }
    
    // Add grid layouts where they make sense
    if (count === 4) layouts[count].push(generateGridLayout(2, 2, 'Grid 2×2', ['square']));
    if (count === 6) {
      layouts[count].push(generateGridLayout(2, 3, 'Grid 2×3', ['portrait', 'square']));
      layouts[count].push(generateGridLayout(3, 2, 'Grid 3×2', ['landscape', 'classic']));
    }
    if (count === 9) layouts[count].push(generateGridLayout(3, 3, 'Grid 3×3', ['square']));
  }
  
  // === PANEL COUNT 2 ===
  // Simplified 2-panel layouts - just keep the most descriptive ones
  layouts[2] = [
    {
      id: 'split-horizontal',
      name: 'Split Horizontal',
      panels: 2,
      aspectRatioPreference: ['landscape', 'classic'],
      uniformity: 10,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    },
    {
      id: 'split-vertical',
      name: 'Split Vertical',
      panels: 2,
      aspectRatioPreference: ['portrait', 'square', 'story'],
      uniformity: 10,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr 1fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    }
  ];
  
  // === PANEL COUNT 3 ===
  // Note: 3 rows is already added first in the loop above
  layouts[3].push(
    {
      id: 'main-with-two-bottom',
      name: 'Feature Top',
      panels: 3,
      aspectRatioPreference: ['landscape', 'classic', 'square'],
      uniformity: 7,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '2fr 1fr',
        gridTemplateAreas: '"main main" "left right"',
        areas: ['main', 'left', 'right']
      })
    },
    {
      id: 'main-with-two-right',
      name: 'Feature Left',
      panels: 3,
      aspectRatioPreference: ['square', 'portrait'],
      uniformity: 7,
      getLayoutConfig: () => ({
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gridTemplateAreas: '"main top" "main bottom"',
        areas: ['main', 'top', 'bottom']
      })
    }
  );
  
  // === PANEL COUNT 4 ===
  // Note: 4 rows is already added first in the loop above
  layouts[4].push(
    {
      id: 'big-and-3-bottom',
      name: 'Feature Top',
      panels: 4,
      aspectRatioPreference: ['landscape', 'classic', 'square'],
      uniformity: 7,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 1fr 1fr',
        gridTemplateRows: '2fr 1fr',
        gridTemplateAreas: '"main main main" "left middle right"',
        areas: ['main', 'left', 'middle', 'right']
      })
    },
    {
      id: 'big-and-3-right',
      name: 'Feature Left',
      panels: 4,
      aspectRatioPreference: ['square', 'portrait'],
      uniformity: 7,
      getLayoutConfig: () => ({
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '1fr 1fr 1fr',
        gridTemplateAreas: '"main top" "main middle" "main bottom"',
        areas: ['main', 'top', 'middle', 'bottom']
      })
    }
  );
  
  // === PANEL COUNT 5 ===
  layouts[5] = [
    // Redesigned 5-panel layouts that fill the container without overlap
    {
      id: '5-rows',
      name: '5 Rows',
      panels: 5,
      aspectRatioPreference: ['portrait', 'story'],
      uniformity: 10,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(5, 1fr)',
        gridTemplateAreas: null,
        items: Array(5).fill({ gridArea: null })
      })
    },
    {
      id: '5-columns',
      name: '5 Columns',
      panels: 5,
      aspectRatioPreference: ['landscape', 'classic'],
      uniformity: 10,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(5, 1fr)',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(5).fill({ gridArea: null })
      })
    },
    {
      id: 'featured-top-with-4-below',
      name: 'Feature Top with 4 Below',
      panels: 5,
      aspectRatioPreference: ['landscape', 'classic'],
      uniformity: 7,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: '2fr 1fr',
        gridTemplateAreas: '"main main main main" "one two three four"',
        areas: ['main', 'one', 'two', 'three', 'four']
      })
    },
    {
      id: 'featured-left-with-4-right',
      name: 'Feature Left with 4 Right',
      panels: 5,
      aspectRatioPreference: ['square', 'portrait'],
      uniformity: 7,
      getLayoutConfig: () => ({
        gridTemplateColumns: '2fr 1fr 1fr',
        gridTemplateRows: 'repeat(2, 1fr)',
        gridTemplateAreas: '"main top-left top-right" "main bottom-left bottom-right"',
        areas: ['main', 'top-left', 'top-right', 'bottom-left', 'bottom-right']
      })
    }
  ];
  
  // === PANEL COUNT 6 ===
  layouts[6] = [
    {
      id: '6-rows',
      name: '6 Rows',
      panels: 6,
      aspectRatioPreference: ['portrait', 'story'],
      uniformity: 10,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(6, 1fr)',
        gridTemplateAreas: null,
        items: Array(6).fill({ gridArea: null })
      })
    },
    {
      id: '6-columns',
      name: '6 Columns',
      panels: 6,
      aspectRatioPreference: ['landscape', 'classic'],
      uniformity: 10,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(6, 1fr)',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(6).fill({ gridArea: null })
      })
    },
    {
      id: 'grid-2x3',
      name: 'Grid 2×3',
      panels: 6,
      aspectRatioPreference: ['portrait', 'square'],
      uniformity: 10,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        gridTemplateAreas: null,
        items: Array(6).fill({ gridArea: null })
      })
    },
    {
      id: 'grid-3x2',
      name: 'Grid 3×2',
      panels: 6,
      aspectRatioPreference: ['landscape', 'classic'],
      uniformity: 10,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gridTemplateAreas: null,
        items: Array(6).fill({ gridArea: null })
      })
    },
    {
      id: 'feature-with-5-below',
      name: 'Feature Top with 5 Below',
      panels: 6,
      aspectRatioPreference: ['landscape', 'classic'],
      uniformity: 7,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(5, 1fr)',
        gridTemplateRows: '2fr 1fr',
        gridTemplateAreas: '"main main main main main" "one two three four five"',
        areas: ['main', 'one', 'two', 'three', 'four', 'five']
      })
    }
  ];
  
  // === PANEL COUNT 7 ===
  layouts[7] = [
    {
      id: '7-rows',
      name: '7 Rows',
      panels: 7,
      aspectRatioPreference: ['portrait', 'story'],
      uniformity: 10,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(7, 1fr)',
        gridTemplateAreas: null,
        items: Array(7).fill({ gridArea: null })
      })
    },
    {
      id: '7-columns',
      name: '7 Columns',
      panels: 7,
      aspectRatioPreference: ['landscape', 'classic'],
      uniformity: 10,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(7, 1fr)',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(7).fill({ gridArea: null })
      })
    },
    {
      id: 'feature-top-6-below',
      name: 'Feature Top/6 Below',
      panels: 7,
      aspectRatioPreference: ['landscape', 'classic'],
      uniformity: 7,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(6, 1fr)',
        gridTemplateRows: '2fr 1fr',
        gridTemplateAreas: '"main main main main main main" "one two three four five six"',
        areas: ['main', 'one', 'two', 'three', 'four', 'five', 'six']
      })
    },
    {
      id: 'feature-left-6-right',
      name: 'Feature Left/6 Right',
      panels: 7,
      aspectRatioPreference: ['square', 'portrait'],
      uniformity: 7,
      getLayoutConfig: () => ({
        gridTemplateColumns: '2fr 1fr 1fr',
        gridTemplateRows: 'repeat(3, 1fr)',
        gridTemplateAreas: '"main top-left top-right" "main middle-left middle-right" "main bottom-left bottom-right"',
        areas: ['main', 'top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
      })
    },
    {
      id: 'triple-row-7',
      name: 'Triple Row (3-2-2)',
      panels: 7,
      aspectRatioPreference: ['landscape', 'square'],
      uniformity: 8,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(6, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        gridTemplateAreas: '"top1 top1 top2 top2 top3 top3" "mid1 mid1 mid1 mid2 mid2 mid2" "bot1 bot1 bot1 bot2 bot2 bot2"',
        areas: ['top1', 'top2', 'top3', 'mid1', 'mid2', 'bot1', 'bot2']
      })
    }
  ];
  
  // === PANEL COUNT 8 ===
  layouts[8] = [
    {
      id: '8-rows',
      name: '8 Rows',
      panels: 8,
      aspectRatioPreference: ['portrait', 'story'],
      uniformity: 10,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(8, 1fr)',
        gridTemplateAreas: null,
        items: Array(8).fill({ gridArea: null })
      })
    },
    {
      id: '8-columns',
      name: '8 Columns',
      panels: 8,
      aspectRatioPreference: ['landscape', 'classic'],
      uniformity: 10,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(8, 1fr)',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(8).fill({ gridArea: null })
      })
    },
    {
      id: 'grid-4x2',
      name: 'Grid 4×2',
      panels: 8,
      aspectRatioPreference: ['landscape', 'classic'],
      uniformity: 10,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gridTemplateAreas: null,
        items: Array(8).fill({ gridArea: null })
      })
    },
    {
      id: 'grid-2x4',
      name: 'Grid 2×4',
      panels: 8,
      aspectRatioPreference: ['portrait', 'story'],
      uniformity: 10,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(4, 1fr)',
        gridTemplateAreas: null,
        items: Array(8).fill({ gridArea: null })
      })
    },
    {
      id: 'double-feature-8',
      name: 'Double Feature',
      panels: 8,
      aspectRatioPreference: ['landscape', 'square'],
      uniformity: 6,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: '2fr 2fr 1fr',
        gridTemplateAreas: '"feature1 feature1 feature2 feature2" "feature1 feature1 feature2 feature2" "small1 small2 small3 small4"',
        areas: ['feature1', 'feature2', 'small1', 'small2', 'small3', 'small4', 'small5', 'small6']
      })
    },
    {
      id: 'comic-layout-8',
      name: 'Comic Layout',
      panels: 8,
      aspectRatioPreference: ['landscape', 'square'],
      uniformity: 5,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'repeat(4, 1fr)',
        gridTemplateAreas: '"top1 top1 top2 top2" "mid1 mid2 mid2 mid3" "bot1 bot1 bot2 bot3" "bot1 bot1 bot4 bot4"',
        areas: ['top1', 'top2', 'mid1', 'mid2', 'mid3', 'bot1', 'bot2', 'bot3']
      })
    }
  ];
  
  // === PANEL COUNT 9 ===
  layouts[9] = [
    {
      id: '9-rows',
      name: '9 Rows',
      panels: 9,
      aspectRatioPreference: ['portrait', 'story'],
      uniformity: 10,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(9, 1fr)',
        gridTemplateAreas: null,
        items: Array(9).fill({ gridArea: null })
      })
    },
    {
      id: '9-columns',
      name: '9 Columns',
      panels: 9,
      aspectRatioPreference: ['landscape', 'classic'],
      uniformity: 10,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(9, 1fr)',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(9).fill({ gridArea: null })
      })
    },
    {
      id: 'grid-3x3',
      name: 'Grid 3×3',
      panels: 9,
      aspectRatioPreference: ['square'],
      uniformity: 10,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        gridTemplateAreas: null,
        items: Array(9).fill({ gridArea: null })
      })
    },
    {
      id: 'comic-layout-9',
      name: 'Comic Layout',
      panels: 9,
      aspectRatioPreference: ['landscape', 'square'],
      uniformity: 5,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'repeat(4, 1fr)',
        gridTemplateAreas: '"top1 top1 top2 top3" "mid1 mid1 mid2 mid3" "mid4 mid5 mid5 mid6" "bot1 bot2 bot3 bot3"',
        areas: ['top1', 'top2', 'top3', 'mid1', 'mid2', 'mid3', 'mid4', 'mid5', 'mid6']
      })
    }
  ];
  
  return layouts;
};

// Create layout definitions programmatically
const layoutDefinitions = createBasicLayouts();

/**
 * Simplified function to calculate how well a layout matches the current aspect ratio
 */
const calculateAspectRatioMatch = (layout, aspectRatioId) => {
  // Direct preference match gets highest score
  if (layout.aspectRatioPreference.includes(aspectRatioId)) {
    return 10;
  }
  
  // Group aspect ratios by orientation
  const verticalAspects = ['portrait', 'story'];
  const horizontalAspects = ['landscape', 'classic'];
  const neutralAspects = ['square', 'custom'];
  
  const isVerticalLayout = layout.aspectRatioPreference.some(p => verticalAspects.includes(p));
  const isHorizontalLayout = layout.aspectRatioPreference.some(p => horizontalAspects.includes(p));
  const isNeutralLayout = layout.aspectRatioPreference.some(p => neutralAspects.includes(p));
  
  const isVerticalAspect = verticalAspects.includes(aspectRatioId);
  const isHorizontalAspect = horizontalAspects.includes(aspectRatioId);
  
  // Same orientation match
  if ((isVerticalLayout && isVerticalAspect) || (isHorizontalLayout && isHorizontalAspect)) {
    return 8;
  }
  
  // Neutral layouts work with any aspect ratio
  if (isNeutralLayout) {
    return 6;
  }
  
  // Opposite orientations get lowest score
  if ((isVerticalLayout && isHorizontalAspect) || (isHorizontalLayout && isVerticalAspect)) {
    return 2;
  }
  
  return 5; // Default score
};

/**
 * Gets prioritized layout templates based on panel count and aspect ratio
 */
const getPrioritizedLayouts = (panelCount, aspectRatioId) => {
  const panelLayouts = layoutDefinitions[panelCount] || [];
  
  return panelLayouts
    .map(layout => {
      const aspectRatioScore = calculateAspectRatioMatch(layout, aspectRatioId);
      const uniformityScore = layout.uniformity || 5;
      const combinedScore = (uniformityScore * 0.6) + (aspectRatioScore * 0.4);
      
      return { ...layout, score: combinedScore };
    })
    .sort((a, b) => b.score - a.score);
};

// Create an auto layout function
const createAutoLayout = (imageCount, aspectRatio, theme) => {
  const closestAspectRatio = aspectRatioPresets.find(preset => preset.value === aspectRatio) || 
                            aspectRatioPresets.find(preset => preset.id === 'square');
  const aspectRatioId = closestAspectRatio?.id || 'square';
  
  const prioritizedLayouts = getPrioritizedLayouts(imageCount, aspectRatioId);
  
  if (prioritizedLayouts.length > 0) {
    const bestLayout = prioritizedLayouts[0];
    const layoutConfig = bestLayout.getLayoutConfig();
    return renderLayoutGrid(layoutConfig, theme, imageCount);
  }
  
  // Fallback to basic grid
  const columns = Math.ceil(Math.sqrt(imageCount));
  const rows = Math.ceil(imageCount / columns);
  
  const layoutConfig = {
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gridTemplateAreas: null,
    items: Array(imageCount).fill({ gridArea: null })
  };
  
  return renderLayoutGrid(layoutConfig, theme, imageCount);
};

/**
 * Main exported layoutTemplates array - drastically simplified
 */
export const layoutTemplates = [
  // Auto Layout - handles most cases automatically
  {
    id: 'autoLayout',
    name: 'Auto Layout',
    panels: 9,
    arrangement: 'auto',
    minImages: 1,
    maxImages: 9,
    renderPreview: (aspectRatio, theme, imageCount = 0) => {
      return createAutoLayout(imageCount || 1, aspectRatio, theme);
    }
  },
  
  // Dynamic templates for each panel count
  ...Array.from({ length: 8 }, (_, i) => i + 2).map(panelCount => ({
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
      
      const prioritizedLayouts = getPrioritizedLayouts(panelCount, aspectRatioId);
      
      if (prioritizedLayouts.length > 0) {
        const bestLayout = prioritizedLayouts[0];
        const layoutConfig = bestLayout.getLayoutConfig();
        return renderLayoutGrid(layoutConfig, theme, actualImageCount);
      }
      
      // Fallback
      const columns = Math.ceil(Math.sqrt(panelCount));
      const rows = Math.ceil(panelCount / columns);
      
      const layoutConfig = {
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gridTemplateAreas: null,
        items: Array(panelCount).fill({ gridArea: null })
      };
      
      return renderLayoutGrid(layoutConfig, theme, actualImageCount);
    }
  }))
];

/**
 * Gets all available templates for a specific panel count + aspect ratio combination
 */
export const getLayoutsForPanelCount = (panelCount, aspectRatioId = 'square') => {
  const prioritizedLayouts = getPrioritizedLayouts(panelCount, aspectRatioId);
  
  return prioritizedLayouts.map(layout => ({
    id: layout.id,
    name: layout.name,
    panels: layout.panels,
    arrangement: 'custom',
    minImages: layout.panels,
    maxImages: layout.panels,
    renderPreview: (aspectRatio, theme, imageCount = 0) => {
      const layoutConfig = layout.getLayoutConfig();
      return renderLayoutGrid(layoutConfig, theme, imageCount || layout.panels);
    }
  }));
}; 
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
      // Calculate the optimal grid layout based on image count
      let columns;
      let rows;
      
      switch(imageCount) {
        case 2:
          columns = 2;
          rows = 1;
          break;
        case 3:
          columns = 3;
          rows = 1;
          break;
        case 4:
          columns = 2;
          rows = 2;
          break;
        case 5:
          columns = 3;
          rows = 2;
          break;
        case 6:
          columns = 3;
          rows = 2;
          break;
        case 7:
          columns = 4; // Adjust to 4 columns to avoid empty cells
          rows = 2;
          break;
        case 8:
          columns = 4; // Adjust to 4 columns to avoid empty cells
          rows = 2;
          break;
        case 9:
          columns = 3;
          rows = 3;
          break;
        default:
          columns = 2;
          rows = 2;
      }
      
      // Generate special layout for 5, 7, or 8 images
      if (imageCount === 5) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateAreas: `
                "one one two"
                "three four five"
              `,
              gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: '4px',
              padding: '4px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: theme.shape.borderRadius,
              transition: 'all 0.3s ease',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ gridArea: 'one' }}>
              <SimplePanel theme={theme} filled={imageCount > 0} />
            </div>
            <div style={{ gridArea: 'two' }}>
              <SimplePanel theme={theme} filled={imageCount > 1} />
            </div>
            <div style={{ gridArea: 'three' }}>
              <SimplePanel theme={theme} filled={imageCount > 2} />
            </div>
            <div style={{ gridArea: 'four' }}>
              <SimplePanel theme={theme} filled={imageCount > 3} />
            </div>
            <div style={{ gridArea: 'five' }}>
              <SimplePanel theme={theme} filled={imageCount > 4} />
            </div>
          </div>
        );
      }
      
      if (imageCount === 7) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateAreas: `
                "one one two two"
                "three four five six"
                "three seven seven six"
              `,
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
              gap: '4px',
              padding: '4px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: theme.shape.borderRadius,
              transition: 'all 0.3s ease',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ gridArea: 'one' }}>
              <SimplePanel theme={theme} filled={imageCount > 0} />
            </div>
            <div style={{ gridArea: 'two' }}>
              <SimplePanel theme={theme} filled={imageCount > 1} />
            </div>
            <div style={{ gridArea: 'three' }}>
              <SimplePanel theme={theme} filled={imageCount > 2} />
            </div>
            <div style={{ gridArea: 'four' }}>
              <SimplePanel theme={theme} filled={imageCount > 3} />
            </div>
            <div style={{ gridArea: 'five' }}>
              <SimplePanel theme={theme} filled={imageCount > 4} />
            </div>
            <div style={{ gridArea: 'six' }}>
              <SimplePanel theme={theme} filled={imageCount > 5} />
            </div>
            <div style={{ gridArea: 'seven' }}>
              <SimplePanel theme={theme} filled={imageCount > 6} />
            </div>
          </div>
        );
      }
      
      if (imageCount === 8) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateAreas: `
                "one one two two"
                "three four five six"
                "seven seven eight eight"
              `,
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
              gap: '4px',
              padding: '4px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: theme.shape.borderRadius,
              transition: 'all 0.3s ease',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ gridArea: 'one' }}>
              <SimplePanel theme={theme} filled={imageCount > 0} />
            </div>
            <div style={{ gridArea: 'two' }}>
              <SimplePanel theme={theme} filled={imageCount > 1} />
            </div>
            <div style={{ gridArea: 'three' }}>
              <SimplePanel theme={theme} filled={imageCount > 2} />
            </div>
            <div style={{ gridArea: 'four' }}>
              <SimplePanel theme={theme} filled={imageCount > 3} />
            </div>
            <div style={{ gridArea: 'five' }}>
              <SimplePanel theme={theme} filled={imageCount > 4} />
            </div>
            <div style={{ gridArea: 'six' }}>
              <SimplePanel theme={theme} filled={imageCount > 5} />
            </div>
            <div style={{ gridArea: 'seven' }}>
              <SimplePanel theme={theme} filled={imageCount > 6} />
            </div>
            <div style={{ gridArea: 'eight' }}>
              <SimplePanel theme={theme} filled={imageCount > 7} />
            </div>
          </div>
        );
      }
      
      // Standard grid layout for other image counts
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gap: '4px',
            padding: '4px',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            borderRadius: theme.shape.borderRadius,
            transition: 'all 0.3s ease',
            boxSizing: 'border-box',
          }}
        >
          {Array.from({ length: imageCount }, (_, i) => (
            <SimplePanel key={i} theme={theme} filled={imageCount > i} />
          ))}
        </div>
      );
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
      if (imageCount === 2) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px',
              padding: '4px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: theme.shape.borderRadius,
              boxSizing: 'border-box',
            }}
          >
            <SimplePanel theme={theme} filled={imageCount > 0} />
            <SimplePanel theme={theme} filled={imageCount > 1} />
          </div>
        );
      }
      
      if (imageCount === 3) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: '4px',
              padding: '4px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: theme.shape.borderRadius,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ gridRow: 'span 2' }}>
              <SimplePanel theme={theme} filled={imageCount > 0} />
            </div>
            <SimplePanel theme={theme} filled={imageCount > 1} />
            <SimplePanel theme={theme} filled={imageCount > 2} />
          </div>
        );
      }
      
      if (imageCount === 4) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateAreas: `
                "main main right1"
                "main main right2"
                "bottom bottom bottom"
              `,
              gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
              gap: '4px',
              padding: '4px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: theme.shape.borderRadius,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ gridArea: 'main' }}>
              <SimplePanel theme={theme} filled={imageCount > 0} />
            </div>
            <div style={{ gridArea: 'right1' }}>
              <SimplePanel theme={theme} filled={imageCount > 1} />
            </div>
            <div style={{ gridArea: 'right2' }}>
              <SimplePanel theme={theme} filled={imageCount > 2} />
            </div>
            <div style={{ gridArea: 'bottom' }}>
              <SimplePanel theme={theme} filled={imageCount > 3} />
            </div>
          </div>
        );
      }
      
      // For 5 images
      if (imageCount === 5) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateAreas: `
                "main main right1"
                "bottom1 bottom2 right2"
              `,
              gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: '4px',
              padding: '4px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: theme.shape.borderRadius,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ gridArea: 'main' }}>
              <SimplePanel theme={theme} filled={imageCount > 0} />
            </div>
            <div style={{ gridArea: 'right1' }}>
              <SimplePanel theme={theme} filled={imageCount > 1} />
            </div>
            <div style={{ gridArea: 'right2' }}>
              <SimplePanel theme={theme} filled={imageCount > 2} />
            </div>
            <div style={{ gridArea: 'bottom1' }}>
              <SimplePanel theme={theme} filled={imageCount > 3} />
            </div>
            <div style={{ gridArea: 'bottom2' }}>
              <SimplePanel theme={theme} filled={imageCount > 4} />
            </div>
          </div>
        );
      }
      
      // For 6 images
      if (imageCount === 6) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateAreas: `
                "main main right1"
                "main main right2"
                "bottom1 bottom2 bottom3"
              `,
              gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
              gap: '4px',
              padding: '4px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: theme.shape.borderRadius,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ gridArea: 'main' }}>
              <SimplePanel theme={theme} filled={imageCount > 0} />
            </div>
            <div style={{ gridArea: 'right1' }}>
              <SimplePanel theme={theme} filled={imageCount > 1} />
            </div>
            <div style={{ gridArea: 'right2' }}>
              <SimplePanel theme={theme} filled={imageCount > 2} />
            </div>
            <div style={{ gridArea: 'bottom1' }}>
              <SimplePanel theme={theme} filled={imageCount > 3} />
            </div>
            <div style={{ gridArea: 'bottom2' }}>
              <SimplePanel theme={theme} filled={imageCount > 4} />
            </div>
            <div style={{ gridArea: 'bottom3' }}>
              <SimplePanel theme={theme} filled={imageCount > 5} />
            </div>
          </div>
        );
      }
      
      // Default to the 2-image layout if something goes wrong
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            padding: '4px',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            borderRadius: theme.shape.borderRadius,
            boxSizing: 'border-box',
          }}
        >
          <SimplePanel theme={theme} filled={imageCount > 0} />
          <SimplePanel theme={theme} filled={imageCount > 1} />
        </div>
      );
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
      // For 2 images, a simple vertical split with first image taking 2/3 of the space
      if (imageCount === 2) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateRows: '2fr 1fr',
              gap: '4px',
              padding: '4px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: theme.shape.borderRadius,
              boxSizing: 'border-box',
            }}
          >
            <SimplePanel theme={theme} filled={imageCount > 0} />
            <SimplePanel theme={theme} filled={imageCount > 1} />
          </div>
        );
      }
      
      // For 3 images, make the first image take up the full width on top
      if (imageCount === 3) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateRows: '2fr 1fr',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px',
              padding: '4px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: theme.shape.borderRadius,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ gridColumn: 'span 2' }}>
              <SimplePanel theme={theme} filled={imageCount > 0} />
            </div>
            <SimplePanel theme={theme} filled={imageCount > 1} />
            <SimplePanel theme={theme} filled={imageCount > 2} />
          </div>
        );
      }
      
      // For 4 images, T-shaped layout
      if (imageCount === 4) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateRows: '2fr 1fr',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '4px',
              padding: '4px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: theme.shape.borderRadius,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ gridColumn: 'span 3' }}>
              <SimplePanel theme={theme} filled={imageCount > 0} />
            </div>
            <SimplePanel theme={theme} filled={imageCount > 1} />
            <SimplePanel theme={theme} filled={imageCount > 2} />
            <SimplePanel theme={theme} filled={imageCount > 3} />
          </div>
        );
      }
      
      // For 5+ images, create a layout with a featured image and a grid
      if (imageCount === 5) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateAreas: `
                "featured featured featured side1"
                "featured featured featured side2"
                "side3 side4 side5 side5"
              `,
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
              gap: '4px',
              padding: '4px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: theme.shape.borderRadius,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ gridArea: 'featured' }}>
              <SimplePanel theme={theme} filled={imageCount > 0} />
            </div>
            <div style={{ gridArea: 'side1' }}>
              <SimplePanel theme={theme} filled={imageCount > 1} />
            </div>
            <div style={{ gridArea: 'side2' }}>
              <SimplePanel theme={theme} filled={imageCount > 2} />
            </div>
            <div style={{ gridArea: 'side3' }}>
              <SimplePanel theme={theme} filled={imageCount > 3} />
            </div>
            <div style={{ gridArea: 'side4' }}>
              <SimplePanel theme={theme} filled={imageCount > 4} />
            </div>
            <div style={{ gridArea: 'side5' }}>
              <SimplePanel theme={theme} filled />
            </div>
          </div>
        );
      }
      
      // For 6 images
      if (imageCount === 6) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateAreas: `
                "featured featured side1 side2"
                "featured featured side3 side4"
                "featured featured side5 side6"
              `,
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
              gap: '4px',
              padding: '4px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: theme.shape.borderRadius,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ gridArea: 'featured' }}>
              <SimplePanel theme={theme} filled={imageCount > 0} />
            </div>
            <div style={{ gridArea: 'side1' }}>
              <SimplePanel theme={theme} filled={imageCount > 1} />
            </div>
            <div style={{ gridArea: 'side2' }}>
              <SimplePanel theme={theme} filled={imageCount > 2} />
            </div>
            <div style={{ gridArea: 'side3' }}>
              <SimplePanel theme={theme} filled={imageCount > 3} />
            </div>
            <div style={{ gridArea: 'side4' }}>
              <SimplePanel theme={theme} filled={imageCount > 4} />
            </div>
            <div style={{ gridArea: 'side5' }}>
              <SimplePanel theme={theme} filled={imageCount > 5} />
            </div>
            <div style={{ gridArea: 'side6' }}>
              <SimplePanel theme={theme} filled />
            </div>
          </div>
        );
      }
      
      // For 7 images
      if (imageCount === 7) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateAreas: `
                "featured featured side1 side2"
                "featured featured side3 side4"
                "side5 side6 side7 side7"
              `,
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
              gap: '4px',
              padding: '4px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: theme.shape.borderRadius,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ gridArea: 'featured' }}>
              <SimplePanel theme={theme} filled={imageCount > 0} />
            </div>
            <div style={{ gridArea: 'side1' }}>
              <SimplePanel theme={theme} filled={imageCount > 1} />
            </div>
            <div style={{ gridArea: 'side2' }}>
              <SimplePanel theme={theme} filled={imageCount > 2} />
            </div>
            <div style={{ gridArea: 'side3' }}>
              <SimplePanel theme={theme} filled={imageCount > 3} />
            </div>
            <div style={{ gridArea: 'side4' }}>
              <SimplePanel theme={theme} filled={imageCount > 4} />
            </div>
            <div style={{ gridArea: 'side5' }}>
              <SimplePanel theme={theme} filled={imageCount > 5} />
            </div>
            <div style={{ gridArea: 'side6' }}>
              <SimplePanel theme={theme} filled={imageCount > 6} />
            </div>
            <div style={{ gridArea: 'side7' }}>
              <SimplePanel theme={theme} filled />
            </div>
          </div>
        );
      }
      
      // Default layout - no longer used but kept as fallback
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            gridTemplateColumns: '3fr 2fr',
            gap: '4px',
            padding: '4px',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            borderRadius: theme.shape.borderRadius,
            boxSizing: 'border-box',
          }}
        >
          {/* Featured image */}
          <SimplePanel theme={theme} filled={imageCount > 0} />
          
          {/* Grid of smaller images */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gridTemplateRows: 'repeat(3, 1fr)',
              gap: '4px',
            }}
          >
            <SimplePanel theme={theme} filled={imageCount > 1} />
            <SimplePanel theme={theme} filled={imageCount > 2} />
            <SimplePanel theme={theme} filled={imageCount > 3} />
            <SimplePanel theme={theme} filled={imageCount > 4} />
            <SimplePanel theme={theme} filled={imageCount > 5} />
            <SimplePanel theme={theme} filled={imageCount > 6} />
          </div>
        </div>
      );
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
      // For 2 images, a stylish split layout
      if (imageCount === 2) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr',
              gap: '4px',
              padding: '4px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: theme.shape.borderRadius,
              boxSizing: 'border-box',
            }}
          >
            <SimplePanel theme={theme} filled={imageCount > 0} />
            <SimplePanel theme={theme} filled={imageCount > 1} />
          </div>
        );
      }
      
      // For 3 images, offset grid layout
      if (imageCount === 3) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: '4px',
              padding: '4px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: theme.shape.borderRadius,
              boxSizing: 'border-box',
            }}
          >
            <SimplePanel theme={theme} filled={imageCount > 0} />
            <div style={{ gridRow: 'span 2' }}>
              <SimplePanel theme={theme} filled={imageCount > 1} />
            </div>
            <SimplePanel theme={theme} filled={imageCount > 2} />
          </div>
        );
      }
      
      // For 4 images, magazine spread
      if (imageCount === 4) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateAreas: `
                "main main side1"
                "main main side1"
                "side2 side3 side1"
              `,
              gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
              gap: '4px',
              padding: '4px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: theme.shape.borderRadius,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ gridArea: 'main' }}>
              <SimplePanel theme={theme} filled={imageCount > 0} />
            </div>
            <div style={{ gridArea: 'side1' }}>
              <SimplePanel theme={theme} filled={imageCount > 1} />
            </div>
            <div style={{ gridArea: 'side2' }}>
              <SimplePanel theme={theme} filled={imageCount > 2} />
            </div>
            <div style={{ gridArea: 'side3' }}>
              <SimplePanel theme={theme} filled={imageCount > 3} />
            </div>
          </div>
        );
      }
      
      // For 5 images, magazine layout
      if (imageCount === 5) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateAreas: `
                "featured featured side1"
                "featured featured side2"
                "side3 side4 side5"
              `,
              gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
              gap: '4px',
              padding: '4px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: theme.shape.borderRadius,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ gridArea: 'featured' }}>
              <SimplePanel theme={theme} filled={imageCount > 0} />
            </div>
            <div style={{ gridArea: 'side1' }}>
              <SimplePanel theme={theme} filled={imageCount > 1} />
            </div>
            <div style={{ gridArea: 'side2' }}>
              <SimplePanel theme={theme} filled={imageCount > 2} />
            </div>
            <div style={{ gridArea: 'side3' }}>
              <SimplePanel theme={theme} filled={imageCount > 3} />
            </div>
            <div style={{ gridArea: 'side4' }}>
              <SimplePanel theme={theme} filled={imageCount > 4} />
            </div>
            <div style={{ gridArea: 'side5' }}>
              <SimplePanel theme={theme} filled={imageCount > 4} />
            </div>
          </div>
        );
      }
      
      // For 6 images, magazine layout
      if (imageCount === 6) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              gridTemplateAreas: `
                "featured featured side1"
                "featured featured side2"
                "side3 side4 side5"
              `,
              gridTemplateColumns: '1fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr 1fr',
              gap: '4px',
              padding: '4px',
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: theme.shape.borderRadius,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ gridArea: 'featured' }}>
              <SimplePanel theme={theme} filled={imageCount > 0} />
            </div>
            <div style={{ gridArea: 'side1' }}>
              <SimplePanel theme={theme} filled={imageCount > 1} />
            </div>
            <div style={{ gridArea: 'side2' }}>
              <SimplePanel theme={theme} filled={imageCount > 2} />
            </div>
            <div style={{ gridArea: 'side3' }}>
              <SimplePanel theme={theme} filled={imageCount > 3} />
            </div>
            <div style={{ gridArea: 'side4' }}>
              <SimplePanel theme={theme} filled={imageCount > 4} />
            </div>
            <div style={{ gridArea: 'side5' }}>
              <SimplePanel theme={theme} filled={imageCount > 5} />
            </div>
          </div>
        );
      }
      
      // Default to the 2-image layout if something goes wrong
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr',
            gap: '4px',
            padding: '4px',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            borderRadius: theme.shape.borderRadius,
            boxSizing: 'border-box',
          }}
        >
          <SimplePanel theme={theme} filled={imageCount > 0} />
          <SimplePanel theme={theme} filled={imageCount > 1} />
        </div>
      );
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
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: '4px',
            padding: '4px',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            borderRadius: theme.shape.borderRadius,
            transition: 'all 0.3s ease',
            boxSizing: 'border-box',
          }}
        >
          <SimplePanel theme={theme} filled={imageCount > 0} />
          <SimplePanel theme={theme} filled={imageCount > 1} />
          <SimplePanel theme={theme} filled={imageCount > 2} />
          <SimplePanel theme={theme} filled={imageCount > 3} />
        </div>
      );
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
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            gridTemplateRows: '1fr 1fr 1fr',
            gap: '4px',
            padding: '4px',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            borderRadius: theme.shape.borderRadius,
            transition: 'all 0.3s ease',
            boxSizing: 'border-box',
          }}
        >
          <SimplePanel theme={theme} filled={imageCount > 0} />
          <SimplePanel theme={theme} filled={imageCount > 1} />
          <SimplePanel theme={theme} filled={imageCount > 2} />
        </div>
      );
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
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '4px',
            padding: '4px',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            borderRadius: theme.shape.borderRadius,
            transition: 'all 0.3s ease',
            boxSizing: 'border-box',
          }}
        >
          <SimplePanel theme={theme} filled={imageCount > 0} />
          <SimplePanel theme={theme} filled={imageCount > 1} />
          <SimplePanel theme={theme} filled={imageCount > 2} />
        </div>
      );
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
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            gridTemplateRows: '1fr 1fr',
            gap: '4px',
            padding: '4px',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
            borderRadius: theme.shape.borderRadius,
            transition: 'all 0.3s ease',
            boxSizing: 'border-box',
          }}
        >
          <SimplePanel theme={theme} filled={imageCount > 0} />
          <SimplePanel theme={theme} filled={imageCount > 1} />
        </div>
      );
    }
  },
]; 
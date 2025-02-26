/* eslint-disable import/extensions, import/no-unresolved */
import twoPanelLayouts from './TwoPanelLayouts';
import threePanelLayouts from './ThreePanelLayouts';
import fourPanelLayouts from './FourPanelLayouts';
import fivePanelLayouts from './FivePanelLayouts';
import { getAspectRatioCategory, renderLayoutGrid } from './LayoutUtils';
/* eslint-enable import/extensions, import/no-unresolved */

/**
 * Layout style categories organized in order of priority
 */
export const layoutStyles = [
  {
    id: 'grid',
    name: 'Grid',
    description: 'Simple grid layouts with equal-sized panels'
  },
  {
    id: 'feature',
    name: 'Feature',
    description: 'Layouts with one panel larger than others'
  },
  {
    id: 'stack',
    name: 'Stack',
    description: 'Layouts with stacked panels in rows or columns'
  },
  {
    id: 'mosaic',
    name: 'Mosaic',
    description: 'Creative arrangements with varying panel sizes'
  }
];

/**
 * Combined layout definitions organized by panel count
 */
export const layoutDefinitions = {
  2: twoPanelLayouts,
  3: threePanelLayouts,
  4: fourPanelLayouts,
  5: fivePanelLayouts
};

/**
 * Style mapping for layouts
 * Maps layout IDs to their style category for organization
 */
export const layoutStyleMapping = {
  // 2-panel layouts
  'split-horizontal': 'grid',
  'split-vertical': 'grid',
  'wide-left-narrow-right': 'feature',
  'narrow-left-wide-right': 'feature',
  'top-tall-bottom-short': 'feature',
  'top-short-bottom-tall': 'feature',
  
  // 3-panel layouts
  'main-with-two-bottom': 'feature',
  'main-with-two-right': 'feature',
  '3-columns': 'stack',
  '3-rows': 'stack',
  'center-feature-wide': 'feature',
  'center-feature-tall': 'feature',
  'side-stack-wide': 'feature',
  'two-and-one-tall': 'stack',
  'two-and-one-square': 'stack',
  'triptych': 'feature',
  
  // 4-panel layouts
  'grid-2x2': 'grid',
  'big-and-3-bottom': 'feature',
  'big-and-3-right': 'feature',
  '4-columns': 'stack',
  '4-rows': 'stack',
  'left-feature-with-3-right': 'feature',
  'top-feature-with-3-bottom': 'feature',
  'panoramic-strips': 'stack',
  'split-bottom-feature-tall': 'feature',
  
  // 5-panel layouts
  'featured-top-with-4-below': 'feature',
  'featured-left-with-4-right': 'feature',
  '5-columns': 'stack',
  '5-rows': 'stack',
  'asymmetric-5': 'mosaic',
  'featured-left-with-grid': 'feature',
  'vertical-asymmetric-5': 'mosaic',
  'wide-mosaic': 'mosaic',
  'tall-mosaic': 'mosaic',
  'featured-bottom-with-4-top': 'feature'
};

/**
 * List of recommended layout IDs for each panel count
 * These will be prioritized in the UI
 */
export const recommendedLayouts = {
  2: ['split-horizontal', 'split-vertical', 'wide-left-narrow-right'],
  3: ['main-with-two-bottom', 'main-with-two-right', '3-columns'],
  4: ['grid-2x2', 'big-and-3-bottom', 'big-and-3-right'],
  5: ['featured-top-with-4-below', 'featured-left-with-4-right', '5-columns']
};

/**
 * Gets layout templates based on panel count and aspect ratio
 */
export const getLayoutsForPanelCount = (panelCount, aspectRatioId = 'square') => {
  // Ensure panel count is in the supported range (2-5)
  // Enforce minimum panel count of 2
  const adjustedPanelCount = Math.max(2, Math.min(panelCount, 5));
  
  const category = getAspectRatioCategory(aspectRatioId);
  const layouts = layoutDefinitions[adjustedPanelCount][category] || [];
  
  // Convert layouts to the full template format
  const mappedLayouts = layouts.map(layout => ({
    id: layout.id,
    name: layout.name,
    panels: layout.panels,
    arrangement: 'custom',
    minImages: layout.panels,
    maxImages: layout.panels,
    style: layoutStyleMapping[layout.id] || 'grid',
    recommended: recommendedLayouts[adjustedPanelCount]?.includes(layout.id) || false,
    renderPreview: (aspectRatio, theme, imageCount = 0) => {
      const layoutConfig = layout.getLayoutConfig();
      return renderLayoutGrid(layoutConfig, theme, imageCount || layout.panels);
    }
  }));
  
  // Sort layouts: first by recommended status, then by style priority
  return mappedLayouts.sort((a, b) => {
    // First sort by recommended status
    if (a.recommended && !b.recommended) return -1;
    if (!a.recommended && b.recommended) return 1;
    
    // Then sort by style category priority (based on layoutStyles order)
    const aStyleIndex = layoutStyles.findIndex(style => style.id === a.style);
    const bStyleIndex = layoutStyles.findIndex(style => style.id === b.style);
    
    return aStyleIndex - bStyleIndex;
  });
};

/**
 * Creates an auto layout based on image count and aspect ratio
 */
export const createAutoLayout = (imageCount, aspectRatio, theme, aspectRatioPresets) => {
  // Enforce minimum of 2 panels and maximum of 5
  const adjustedCount = Math.min(Math.max(imageCount, 2), 5);
  
  // Find closest aspect ratio preset
  const closestAspectRatio = aspectRatioPresets.find(preset => preset.value === aspectRatio) || 
                            aspectRatioPresets.find(preset => preset.id === 'square');
  const aspectRatioId = closestAspectRatio?.id || 'square';
  const category = getAspectRatioCategory(aspectRatioId);
  
  // Get the first (highest priority) layout for this panel count and aspect ratio category
  if (adjustedCount >= 2 && layoutDefinitions[adjustedCount]?.[category]?.length > 0) {
    const bestLayout = layoutDefinitions[adjustedCount][category][0];
    const layoutConfig = bestLayout.getLayoutConfig();
    return renderLayoutGrid(layoutConfig, theme, imageCount);
  }
  
  // Fallback to basic grid for unexpected panel counts (should never happen with our constraints)
  const columns = Math.ceil(Math.sqrt(adjustedCount));
  const rows = Math.ceil(adjustedCount / columns);
  
  const layoutConfig = {
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gridTemplateAreas: null,
    items: Array(adjustedCount).fill({ gridArea: null })
  };
  
  return renderLayoutGrid(layoutConfig, theme, imageCount);
}; 
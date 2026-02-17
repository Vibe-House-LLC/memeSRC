/* eslint-disable import/extensions, import/no-unresolved */
import onePanelLayouts from './OnePanelLayouts';
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
  1: onePanelLayouts,
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
  // 1-panel layouts
  'single-panel': 'grid',

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
  1: ['single-panel'],
  2: ['split-horizontal', 'split-vertical', 'two-thirds-one-third-h'],
  3: ['3-rows', 'main-with-two-bottom', '3-columns'],
  4: ['grid-2x2', 'big-and-3-bottom', '4-rows'],
  5: ['5-rows', 'featured-top-with-4-below', '5-columns']
};

const VERTICAL_LAYOUT_IDS = new Set([
  'split-vertical',
  'top-tall-bottom-short',
  'top-short-bottom-tall',
  'wide-top-narrow-bottom',
  'wide-bottom-narrow-top',
  'tall-75-25-split',
  'two-thirds-one-third-v',
  'one-third-two-thirds-v',
  '3-rows',
  'main-with-two-bottom',
  'center-feature-tall',
  'two-and-one-tall',
  'two-and-one-square',
  '4-rows',
  'big-and-3-bottom',
  'top-feature-with-3-bottom',
  '5-rows',
  'featured-top-with-4-below',
  'featured-bottom-with-4-top',
  'vertical-asymmetric-5',
  'tall-mosaic',
]);

const HORIZONTAL_LAYOUT_IDS = new Set([
  'split-horizontal',
  'wide-left-narrow-right',
  'narrow-left-wide-right',
  'left-wide-right-narrow',
  'left-narrow-right-wide',
  'wide-75-25-split',
  'two-thirds-one-third-h',
  'one-third-two-thirds-h',
  '3-columns',
  'main-with-two-right',
  'center-feature-wide',
  'side-stack-wide',
  'triptych',
  '4-columns',
  'big-and-3-right',
  'left-feature-with-3-right',
  '5-columns',
  'featured-left-with-4-right',
  'featured-left-with-grid',
  'wide-mosaic',
  'asymmetric-5',
]);

export const getLayoutDirection = (layoutId) => {
  if (!layoutId) return null;
  if (VERTICAL_LAYOUT_IDS.has(layoutId)) return 'vertical';
  if (HORIZONTAL_LAYOUT_IDS.has(layoutId)) return 'horizontal';
  return null;
};

const getPreferredDefaultLayoutId = (panelCount, category) => {
  const count = Math.max(1, Math.min(Number(panelCount) || 1, 5));
  if (count === 1) return 'single-panel';

  if (category === 'wide') {
    const horizontalDefaults = {
      2: 'split-horizontal',
      3: '3-columns',
      4: '4-columns',
      5: '5-columns',
    };
    return horizontalDefaults[count] || null;
  }

  const verticalDefaults = {
    2: 'split-vertical',
    3: '3-rows',
    4: '4-rows',
    5: '5-rows',
  };
  return verticalDefaults[count] || null;
};

/**
 * Gets layout templates based on panel count and aspect ratio
 */
export const getLayoutsForPanelCount = (panelCount, aspectRatioId = 'square', customAspectRatioValue = null) => {
  // Ensure panel count is in the supported range (1-5)
  const normalizedPanelCount = Number.isFinite(panelCount) ? panelCount : 1;
  const adjustedPanelCount = Math.max(1, Math.min(normalizedPanelCount, 5));
  
  const category = getAspectRatioCategory(aspectRatioId, customAspectRatioValue);
  const layouts = layoutDefinitions[adjustedPanelCount][category] || [];
  const preferredDefaultLayoutId = getPreferredDefaultLayoutId(adjustedPanelCount, category);
  const categoryRecommendedLayouts = {
    wide: {
      2: ['split-horizontal', 'wide-left-narrow-right', 'split-vertical'],
      3: ['3-columns', 'main-with-two-bottom', '3-rows'],
      4: ['4-columns', 'grid-2x2', 'big-and-3-bottom'],
      5: ['5-columns', 'featured-top-with-4-below', '5-rows'],
    },
    tall: {
      2: ['split-vertical', 'top-tall-bottom-short', 'split-horizontal'],
      3: ['3-rows', 'main-with-two-right', '3-columns'],
      4: ['4-rows', 'big-and-3-right', 'grid-2x2'],
      5: ['5-rows', 'featured-left-with-4-right', 'featured-bottom-with-4-top'],
    },
    square: {
      2: ['split-vertical', 'split-horizontal', 'two-thirds-one-third-v'],
      3: ['3-rows', 'main-with-two-bottom', '3-columns'],
      4: ['4-rows', 'grid-2x2', 'big-and-3-bottom'],
      5: ['5-rows', 'featured-top-with-4-below', '5-columns'],
    },
  };
  const recommendedForCategory = (
    categoryRecommendedLayouts[category]?.[adjustedPanelCount]
    || recommendedLayouts[adjustedPanelCount]
    || []
  );
  const recommendedRankMap = new Map(recommendedForCategory.map((layoutId, index) => [layoutId, index]));
  
  // Convert layouts to the full template format
  const mappedLayouts = layouts.map(layout => ({
    id: layout.id,
    name: layout.name,
    panels: layout.panels,
    arrangement: 'custom',
    minImages: layout.panels,
    maxImages: layout.panels,
    style: layoutStyleMapping[layout.id] || 'grid',
    recommended: recommendedRankMap.has(layout.id),
    // Add properties for panel aspect ratios and equality
    hasTallPanels: layout.hasTallPanels || false,
    hasWidePanels: layout.hasWidePanels || true, // Default to wide panels
    hasEqualPanels: layout.hasEqualPanels || 
      ['single-panel', 'grid-2x2', 'split-horizontal', 'split-vertical', '3-rows', '3-columns', '4-rows', '4-columns', '5-rows', '5-columns'].includes(layout.id),
    renderPreview: (aspectRatio, theme, imageCount = 0) => {
      const layoutConfig = layout.getLayoutConfig();
      return renderLayoutGrid(layoutConfig, theme, imageCount || layout.panels);
    }
  }));

  // Sort layouts with new priority system:
  // 1. Explicit default by aspect/category direction
  // 2. Category-specific recommendation rank
  // 3. Panels with wider aspect ratios
  // 4. Equal-sized panels as tiebreaker
  // 5. Style category
  return mappedLayouts.sort((a, b) => {
    if (preferredDefaultLayoutId) {
      if (a.id === preferredDefaultLayoutId && b.id !== preferredDefaultLayoutId) return -1;
      if (b.id === preferredDefaultLayoutId && a.id !== preferredDefaultLayoutId) return 1;
    }

    const aRecommendedRank = recommendedRankMap.has(a.id)
      ? recommendedRankMap.get(a.id)
      : Number.MAX_SAFE_INTEGER;
    const bRecommendedRank = recommendedRankMap.has(b.id)
      ? recommendedRankMap.get(b.id)
      : Number.MAX_SAFE_INTEGER;
    if (aRecommendedRank !== bRecommendedRank) {
      return aRecommendedRank - bRecommendedRank;
    }
    
    // Then prioritize layouts with wider panel aspect ratios  
    if (a.hasWidePanels && !b.hasWidePanels) return -1;
    if (!a.hasWidePanels && b.hasWidePanels) return 1;
    
    // Then prioritize layouts with more equal-sized panels
    if (a.hasEqualPanels && !b.hasEqualPanels) return -1;
    if (!a.hasEqualPanels && b.hasEqualPanels) return 1;
    
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
  // Enforce minimum of 1 panel and maximum of 5
  const normalizedImageCount = Number.isFinite(imageCount) ? imageCount : 1;
  const adjustedCount = Math.min(Math.max(normalizedImageCount, 1), 5);
  
  // Find closest aspect ratio preset
  const targetRatio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const validPresets = (aspectRatioPresets || []).filter((preset) => (
    preset?.id !== 'custom' && Number.isFinite(preset?.value) && preset.value > 0
  ));
  const closestAspectRatio = validPresets.reduce((closestPreset, preset) => {
    if (!closestPreset) return preset;
    const currentDistance = Math.abs(preset.value - targetRatio);
    const bestDistance = Math.abs(closestPreset.value - targetRatio);
    return currentDistance < bestDistance ? preset : closestPreset;
  }, validPresets[0] || null) || aspectRatioPresets.find(preset => preset.id === 'square');
  const aspectRatioId = closestAspectRatio?.id || 'square';
  
  const rankedLayouts = getLayoutsForPanelCount(
    adjustedCount,
    aspectRatioId,
    aspectRatioId === 'custom' ? targetRatio : null
  );
  if (rankedLayouts.length > 0) {
    return rankedLayouts[0].renderPreview(targetRatio, theme, imageCount);
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

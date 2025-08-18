import { Grid, Grid2X2, Grid3X3, Columns, Rows, LayoutGrid } from 'lucide-react';

// Define layout types for each panel count
export type Layout = 
  | TwoPanelLayout 
  | ThreePanelLayout 
  | FourPanelLayout 
  | FivePanelLayout
  | SimplePanelLayout;

export type SimplePanelLayout = '1x1';

export type TwoPanelLayout = 
  | 'split-horizontal' 
  | 'split-vertical' 
  | 'wide-left-narrow-right' 
  | 'narrow-left-wide-right'
  | 'wide-top-narrow-bottom'
  | 'narrow-top-wide-bottom';

export type ThreePanelLayout = 
  | '3-columns' 
  | '3-rows' 
  | 'main-with-two-bottom'
  | 'center-feature'
  | 'side-stack';

export type FourPanelLayout = 
  | 'grid-2x2' 
  | 'big-and-3-bottom' 
  | '4-columns'
  | 'left-feature-with-3-right';

export type FivePanelLayout = 
  | 'featured-top-with-4-below' 
  | '5-columns' 
  | 'asymmetric-5'
  | 'featured-left-with-grid'
  | 'wide-mosaic';

// Layout definition interface
export interface LayoutDefinition {
  id: string;
  name: string;
  icon: any;
  gridTemplateColumns: string;
  gridTemplateRows: string;
  gridTemplateAreas?: string | null;
  areas?: string[];
}

// Define layouts for different panel counts
export const layoutDefinitions: Record<string, LayoutDefinition> = {
  // Single panel layout
  '1x1': {
    id: '1x1',
    name: 'Single Image',
    icon: Grid,
    gridTemplateColumns: '1fr',
    gridTemplateRows: '1fr',
    gridTemplateAreas: null,
  },
  
  // Two panel layouts
  'split-horizontal': {
    id: 'split-horizontal',
    name: 'Split Horizontal',
    icon: Columns,
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '1fr',
    gridTemplateAreas: null,
  },
  'split-vertical': {
    id: 'split-vertical',
    name: 'Split Vertical',
    icon: Rows,
    gridTemplateColumns: '1fr',
    gridTemplateRows: '1fr 1fr',
    gridTemplateAreas: null,
  },
  'wide-left-narrow-right': {
    id: 'wide-left-narrow-right',
    name: 'Feature Left',
    icon: LayoutGrid,
    gridTemplateColumns: '2fr 1fr',
    gridTemplateRows: '1fr',
    gridTemplateAreas: null,
  },
  'narrow-left-wide-right': {
    id: 'narrow-left-wide-right',
    name: 'Feature Right',
    icon: LayoutGrid,
    gridTemplateColumns: '1fr 2fr',
    gridTemplateRows: '1fr',
    gridTemplateAreas: null,
  },
  'wide-top-narrow-bottom': {
    id: 'wide-top-narrow-bottom',
    name: 'Feature Top',
    icon: LayoutGrid,
    gridTemplateColumns: '1fr',
    gridTemplateRows: '2fr 1fr',
    gridTemplateAreas: null,
  },
  'narrow-top-wide-bottom': {
    id: 'narrow-top-wide-bottom',
    name: 'Feature Bottom',
    icon: LayoutGrid,
    gridTemplateColumns: '1fr',
    gridTemplateRows: '1fr 2fr',
    gridTemplateAreas: null,
  },
  
  // Three panel layouts
  '3-columns': {
    id: '3-columns',
    name: '3 Columns',
    icon: Columns,
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: '1fr',
    gridTemplateAreas: null,
  },
  '3-rows': {
    id: '3-rows',
    name: '3 Rows',
    icon: Rows,
    gridTemplateColumns: '1fr',
    gridTemplateRows: 'repeat(3, 1fr)',
    gridTemplateAreas: null,
  },
  'main-with-two-bottom': {
    id: 'main-with-two-bottom',
    name: 'Feature Top',
    icon: LayoutGrid,
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '2fr 1fr',
    gridTemplateAreas: '"main main" "left right"',
    areas: ['main', 'left', 'right']
  },
  'center-feature': {
    id: 'center-feature',
    name: 'Center Feature',
    icon: LayoutGrid,
    gridTemplateColumns: '1fr 2fr 1fr',
    gridTemplateRows: '1fr',
    gridTemplateAreas: '"left main right"',
    areas: ['left', 'main', 'right']
  },
  'side-stack': {
    id: 'side-stack',
    name: 'Left + Side Stack',
    icon: LayoutGrid,
    gridTemplateColumns: '2fr 1fr',
    gridTemplateRows: '1fr 1fr',
    gridTemplateAreas: '"main top" "main bottom"',
    areas: ['main', 'top', 'bottom']
  },
  
  // Four panel layouts
  'grid-2x2': {
    id: 'grid-2x2',
    name: 'Grid 2×2',
    icon: Grid2X2,
    gridTemplateColumns: 'repeat(2, 1fr)',
    gridTemplateRows: 'repeat(2, 1fr)',
    gridTemplateAreas: null,
  },
  'big-and-3-bottom': {
    id: 'big-and-3-bottom',
    name: 'Feature Top',
    icon: LayoutGrid,
    gridTemplateColumns: '1fr 1fr 1fr',
    gridTemplateRows: '2fr 1fr',
    gridTemplateAreas: '"main main main" "left middle right"',
    areas: ['main', 'left', 'middle', 'right']
  },
  '4-columns': {
    id: '4-columns',
    name: '4 Columns',
    icon: Columns,
    gridTemplateColumns: 'repeat(4, 1fr)',
    gridTemplateRows: '1fr',
    gridTemplateAreas: null,
  },
  'left-feature-with-3-right': {
    id: 'left-feature-with-3-right',
    name: 'Feature Left + 3 Right',
    icon: LayoutGrid,
    gridTemplateColumns: '2fr 1fr',
    gridTemplateRows: 'repeat(3, 1fr)',
    gridTemplateAreas: '"main top" "main middle" "main bottom"',
    areas: ['main', 'top', 'middle', 'bottom']
  },
  
  // Five panel layouts
  'featured-top-with-4-below': {
    id: 'featured-top-with-4-below',
    name: 'Feature Top with 4 Below',
    icon: LayoutGrid,
    gridTemplateColumns: 'repeat(4, 1fr)',
    gridTemplateRows: '2fr 1fr',
    gridTemplateAreas: '"main main main main" "one two three four"',
    areas: ['main', 'one', 'two', 'three', 'four']
  },
  '5-columns': {
    id: '5-columns',
    name: '5 Columns',
    icon: Columns,
    gridTemplateColumns: 'repeat(5, 1fr)',
    gridTemplateRows: '1fr',
    gridTemplateAreas: null,
  },
  'asymmetric-5': {
    id: 'asymmetric-5',
    name: 'Asymmetric Grid',
    icon: LayoutGrid,
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(2, 1fr)',
    gridTemplateAreas: '"top-left top-middle top-right" "bottom-left bottom-left bottom-right"',
    areas: ['top-left', 'top-middle', 'top-right', 'bottom-left', 'bottom-right']
  },
  'featured-left-with-grid': {
    id: 'featured-left-with-grid',
    name: 'Feature Left with Grid',
    icon: LayoutGrid,
    gridTemplateColumns: '2fr 1fr 1fr',
    gridTemplateRows: 'repeat(2, 1fr)',
    gridTemplateAreas: '"main top-left top-right" "main bottom-left bottom-right"',
    areas: ['main', 'top-left', 'top-right', 'bottom-left', 'bottom-right']
  },
  'wide-mosaic': {
    id: 'wide-mosaic',
    name: 'Wide Mosaic',
    icon: LayoutGrid,
    gridTemplateColumns: 'repeat(4, 1fr)',
    gridTemplateRows: 'repeat(3, 1fr)',
    gridTemplateAreas: 
      '"left-top left-top right-top right-top" ' +
      '"left-middle left-middle right-top right-top" ' +
      '"left-bottom right-bottom right-bottom right-bottom"',
    areas: ['left-top', 'left-middle', 'left-bottom', 'right-top', 'right-bottom']
  },
};

// Get available layouts for current panel count
export const getLayoutsForPanelCount = (count: number): Layout[] => {
  switch(count) {
    case 1:
      return ['1x1'] as Layout[];
    case 2:
      return [
        'split-horizontal',
        'split-vertical',
        'wide-left-narrow-right',
        'narrow-left-wide-right',
        'wide-top-narrow-bottom',
        'narrow-top-wide-bottom'
      ] as Layout[];
    case 3:
      return [
        '3-columns',
        '3-rows',
        'main-with-two-bottom',
        'center-feature',
        'side-stack'
      ] as Layout[];
    case 4:
      return [
        'grid-2x2',
        'big-and-3-bottom',
        '4-columns',
        'left-feature-with-3-right'
      ] as Layout[];
    case 5:
      return [
        'featured-top-with-4-below',
        '5-columns',
        'asymmetric-5',
        'featured-left-with-grid',
        'wide-mosaic'
      ] as Layout[];
    default:
      return ['1x1'] as Layout[];
  }
}; 
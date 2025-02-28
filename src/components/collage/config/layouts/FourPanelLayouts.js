/**
 * Layout definitions for 4-panel layouts
 */

const fourPanelLayouts = {
  wide: [
    {
      id: 'grid-2x2',
      name: 'Grid 2×2',
      panels: 4,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gridTemplateAreas: null,
        items: Array(4).fill({ gridArea: null })
      })
    },
    {
      id: 'big-and-3-bottom',
      name: 'Feature Top',
      panels: 4,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 1fr 1fr',
        gridTemplateRows: '2fr 1fr',
        gridTemplateAreas: '"main main main" "left middle right"',
        areas: ['main', 'left', 'middle', 'right']
      })
    },
    {
      id: '4-columns',
      name: '4 Columns',
      panels: 4,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(4).fill({ gridArea: null })
      })
    },
    {
      id: 'left-feature-with-3-right',
      name: 'Feature Left + 3 Right',
      panels: 4,
      getLayoutConfig: () => ({
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: 'repeat(3, 1fr)',
        gridTemplateAreas: '"main top" "main middle" "main bottom"',
        areas: ['main', 'top', 'middle', 'bottom']
      })
    }
  ],
  tall: [
    {
      id: '4-rows',
      name: '4 Rows',
      panels: 4,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(4, 1fr)',
        gridTemplateAreas: null,
        items: Array(4).fill({ gridArea: null })
      })
    },
    {
      id: 'big-and-3-right',
      name: 'Feature Left',
      panels: 4,
      getLayoutConfig: () => ({
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '1fr 1fr 1fr',
        gridTemplateAreas: '"main top" "main middle" "main bottom"',
        areas: ['main', 'top', 'middle', 'bottom']
      })
    },
    {
      id: 'grid-2x2',
      name: 'Grid 2×2',
      panels: 4,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gridTemplateAreas: null,
        items: Array(4).fill({ gridArea: null })
      })
    },
    {
      id: 'top-feature-with-3-bottom',
      name: 'Feature Top + 3 Bottom',
      panels: 4,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 1fr 1fr',
        gridTemplateRows: '2fr 1fr',
        gridTemplateAreas: '"main main main" "left middle right"',
        areas: ['main', 'left', 'middle', 'right']
      })
    },
    {
      id: 'split-bottom-feature-tall',
      name: 'Two Top + Feature Bottom',
      panels: 4,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr 2fr',
        gridTemplateAreas: '"top-left top-right" "bottom-left bottom-right" "bottom bottom"',
        areas: ['top-left', 'top-right', 'bottom-left', 'bottom-right']
      })
    }
  ],
  square: [
    {
      id: 'grid-2x2',
      name: 'Grid 2×2',
      panels: 4,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gridTemplateAreas: null,
        items: Array(4).fill({ gridArea: null })
      })
    },
    {
      id: 'big-and-3-bottom',
      name: 'Feature Top',
      panels: 4,
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
      getLayoutConfig: () => ({
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '1fr 1fr 1fr',
        gridTemplateAreas: '"main top" "main middle" "main bottom"',
        areas: ['main', 'top', 'middle', 'bottom']
      })
    },
    {
      id: '4-rows',
      name: '4 Rows',
      panels: 4,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(4, 1fr)',
        gridTemplateAreas: null,
        items: Array(4).fill({ gridArea: null })
      })
    },
    {
      id: '4-columns',
      name: '4 Columns',
      panels: 4,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(4).fill({ gridArea: null })
      })
    }
  ]
};

export default fourPanelLayouts; 
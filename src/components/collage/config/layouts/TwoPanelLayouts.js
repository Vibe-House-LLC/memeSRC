/**
 * Layout definitions for 2-panel layouts
 */

const twoPanelLayouts = {
  wide: [
    {
      id: 'split-horizontal',
      name: 'Split Horizontal',
      panels: 2,
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
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr 1fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    },
    {
      id: 'wide-left-narrow-right',
      name: 'Feature Left',
      panels: 2,
      getLayoutConfig: () => ({
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    },
    {
      id: 'narrow-left-wide-right',
      name: 'Feature Right',
      panels: 2,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 2fr',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    }
  ],
  tall: [
    {
      id: 'split-vertical',
      name: 'Split Vertical',
      panels: 2,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr 1fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    },
    {
      id: 'split-horizontal',
      name: 'Split Horizontal',
      panels: 2,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    },
    {
      id: 'top-tall-bottom-short',
      name: 'Feature Top',
      panels: 2,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: '2fr 1fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    },
    {
      id: 'top-short-bottom-tall',
      name: 'Feature Bottom',
      panels: 2,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr 2fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    }
  ],
  square: [
    {
      id: 'split-horizontal',
      name: 'Split Horizontal',
      panels: 2,
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
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr 1fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    }
  ]
};

export default twoPanelLayouts; 
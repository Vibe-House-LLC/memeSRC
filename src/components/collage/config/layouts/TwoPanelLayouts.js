/**
 * Layout definitions for 2-panel layouts
 */

const twoPanelLayouts = {
  wide: [
    {
      id: 'split-horizontal',
      name: 'Split Horizontal',
      panels: 2,
      hasEqualPanels: true,
      hasWidePanels: true,
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
      hasEqualPanels: true,
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
      hasWidePanels: true,
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
      hasWidePanels: true,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 2fr',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    },
    {
      id: 'wide-top-narrow-bottom',
      name: 'Feature Top Wide',
      panels: 2,
      hasWidePanels: true,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: '2fr 1fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    },
    {
      id: 'wide-bottom-narrow-top',
      name: 'Feature Bottom Wide',
      panels: 2,
      hasWidePanels: true,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr 2fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    },
    {
      id: 'wide-75-25-split',
      name: '75/25 Split',
      panels: 2,
      hasWidePanels: true,
      getLayoutConfig: () => ({
        gridTemplateColumns: '3fr 1fr',
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
      hasEqualPanels: true,
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
      hasEqualPanels: true,
      hasWidePanels: true,
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
    },
    {
      id: 'left-wide-right-narrow',
      name: 'Left Wide',
      panels: 2,
      hasWidePanels: true,
      getLayoutConfig: () => ({
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    },
    {
      id: 'left-narrow-right-wide',
      name: 'Right Wide',
      panels: 2,
      hasWidePanels: true,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 2fr',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    },
    {
      id: 'tall-75-25-split',
      name: '75/25 Vertical Split',
      panels: 2,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: '3fr 1fr',
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
      hasEqualPanels: true,
      hasWidePanels: true,
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
      hasEqualPanels: true,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr 1fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    },
    {
      id: 'two-thirds-one-third-h',
      name: '2/3 - 1/3 Horizontal',
      panels: 2,
      hasWidePanels: true,
      getLayoutConfig: () => ({
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    },
    {
      id: 'one-third-two-thirds-h',
      name: '1/3 - 2/3 Horizontal',
      panels: 2,
      hasWidePanels: true,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 2fr',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    },
    {
      id: 'two-thirds-one-third-v',
      name: '2/3 - 1/3 Vertical',
      panels: 2,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: '2fr 1fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    },
    {
      id: 'one-third-two-thirds-v',
      name: '1/3 - 2/3 Vertical',
      panels: 2,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr 2fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      })
    }
  ]
};

export default twoPanelLayouts; 
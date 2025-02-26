/**
 * Layout definitions for 3-panel layouts
 */

const threePanelLayouts = {
  wide: [
    {
      id: 'main-with-two-bottom',
      name: 'Feature Top',
      panels: 3,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '2fr 1fr',
        gridTemplateAreas: '"main main" "left right"',
        areas: ['main', 'left', 'right']
      })
    },
    {
      id: '3-columns',
      name: '3 Columns',
      panels: 3,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(3).fill({ gridArea: null })
      })
    },
    {
      id: '3-rows',
      name: '3 Rows',
      panels: 3,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(3, 1fr)',
        gridTemplateAreas: null,
        items: Array(3).fill({ gridArea: null })
      })
    },
    {
      id: 'center-feature-wide',
      name: 'Center Feature',
      panels: 3,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 2fr 1fr',
        gridTemplateRows: '1fr',
        gridTemplateAreas: '"left main right"',
        areas: ['left', 'main', 'right']
      })
    },
    {
      id: 'side-stack-wide',
      name: 'Left + Side Stack',
      panels: 3, 
      getLayoutConfig: () => ({
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gridTemplateAreas: '"main top" "main bottom"',
        areas: ['main', 'top', 'bottom']
      })
    }
  ],
  tall: [
    {
      id: '3-rows',
      name: '3 Rows',
      panels: 3,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(3, 1fr)',
        gridTemplateAreas: null,
        items: Array(3).fill({ gridArea: null })
      })
    },
    {
      id: 'main-with-two-right',
      name: 'Feature Left',
      panels: 3,
      getLayoutConfig: () => ({
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gridTemplateAreas: '"main top" "main bottom"',
        areas: ['main', 'top', 'bottom']
      })
    },
    {
      id: '3-columns',
      name: '3 Columns',
      panels: 3,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(3).fill({ gridArea: null })
      })
    },
    {
      id: 'center-feature-tall',
      name: 'Center Feature',
      panels: 3,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr 2fr 1fr',
        gridTemplateAreas: '"top" "main" "bottom"',
        areas: ['top', 'main', 'bottom']
      })
    },
    {
      id: 'two-and-one-tall',
      name: 'Two Top + One Bottom',
      panels: 3,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gridTemplateAreas: '"left right" "bottom bottom"',
        areas: ['left', 'right', 'bottom']
      })
    }
  ],
  square: [
    {
      id: 'main-with-two-right',
      name: 'Feature Left',
      panels: 3,
      getLayoutConfig: () => ({
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gridTemplateAreas: '"main top" "main bottom"',
        areas: ['main', 'top', 'bottom']
      })
    },
    {
      id: 'main-with-two-bottom',
      name: 'Feature Top',
      panels: 3,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '2fr 1fr',
        gridTemplateAreas: '"main main" "left right"',
        areas: ['main', 'left', 'right']
      })
    },
    {
      id: '3-rows',
      name: '3 Rows',
      panels: 3,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(3, 1fr)',
        gridTemplateAreas: null,
        items: Array(3).fill({ gridArea: null })
      })
    },
    {
      id: 'two-and-one-square',
      name: 'Two Top + One Bottom',
      panels: 3,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gridTemplateAreas: '"left right" "bottom bottom"',
        areas: ['left', 'right', 'bottom']
      })
    },
    {
      id: 'triptych',
      name: 'Triptych',
      panels: 3,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 2fr 1fr',
        gridTemplateRows: '1fr',
        gridTemplateAreas: '"left main right"',
        areas: ['left', 'main', 'right']
      })
    }
  ]
};

export default threePanelLayouts; 
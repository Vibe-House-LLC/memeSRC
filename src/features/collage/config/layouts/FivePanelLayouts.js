/**
 * Layout definitions for 5-panel layouts
 */

const fivePanelLayouts = {
  wide: [
    {
      id: 'featured-top-with-4-below',
      name: 'Feature Top with 4 Below',
      panels: 5,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: '2fr 1fr',
        gridTemplateAreas: '"main main main main" "one two three four"',
        areas: ['main', 'one', 'two', 'three', 'four']
      })
    },
    {
      id: '5-columns',
      name: '5 Columns',
      panels: 5,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(5, 1fr)',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(5).fill({ gridArea: null })
      })
    },
    {
      id: 'asymmetric-5',
      name: 'Asymmetric Grid',
      panels: 5,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gridTemplateAreas: '"top-left top-middle top-right" "bottom-left bottom-left bottom-right"',
        areas: ['top-left', 'top-middle', 'top-right', 'bottom-left', 'bottom-right']
      })
    },
    {
      id: 'featured-left-with-grid',
      name: 'Feature Left with Grid',
      panels: 5,
      getLayoutConfig: () => ({
        gridTemplateColumns: '2fr 1fr 1fr',
        gridTemplateRows: 'repeat(2, 1fr)',
        gridTemplateAreas: '"main top-left top-right" "main bottom-left bottom-right"',
        areas: ['main', 'top-left', 'top-right', 'bottom-left', 'bottom-right']
      })
    },
    {
      id: 'wide-mosaic',
      name: 'Wide Mosaic',
      panels: 5,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        gridTemplateAreas: 
          '"left-top left-top right-top right-top" ' +
          '"left-middle left-middle right-top right-top" ' +
          '"left-bottom right-bottom right-bottom right-bottom"',
        areas: ['left-top', 'left-middle', 'left-bottom', 'right-top', 'right-bottom']
      })
    }
  ],
  tall: [
    {
      id: '5-rows',
      name: '5 Rows',
      panels: 5,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(5, 1fr)',
        gridTemplateAreas: null,
        items: Array(5).fill({ gridArea: null })
      })
    },
    {
      id: 'featured-left-with-4-right',
      name: 'Feature Left with 4 Right',
      panels: 5,
      getLayoutConfig: () => ({
        gridTemplateColumns: '2fr 1fr 1fr',
        gridTemplateRows: 'repeat(2, 1fr)',
        gridTemplateAreas: '"main top-left top-right" "main bottom-left bottom-right"',
        areas: ['main', 'top-left', 'top-right', 'bottom-left', 'bottom-right']
      })
    },
    {
      id: 'vertical-asymmetric-5',
      name: 'Vertical Asymmetric',
      panels: 5,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        gridTemplateAreas: '"top-left top-right" "middle middle" "bottom-left bottom-right"',
        areas: ['top-left', 'top-right', 'middle', 'bottom-left', 'bottom-right']
      })
    },
    {
      id: 'tall-mosaic',
      name: 'Tall Mosaic',
      panels: 5,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(4, 1fr)',
        gridTemplateAreas: 
          '"top top" ' +
          '"middle-left middle-right" ' +
          '"middle-left middle-right" ' +
          '"bottom-left bottom-right"',
        areas: ['top', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
      })
    },
    {
      id: 'featured-bottom-with-4-top',
      name: 'Feature Bottom with 4 Top',
      panels: 5,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: '1fr 2fr',
        gridTemplateAreas: '"one two three four" "main main main main"',
        areas: ['one', 'two', 'three', 'four', 'main']
      })
    }
  ],
  square: [
    {
      id: 'featured-left-with-4-right',
      name: 'Feature Left with 4 Right',
      panels: 5,
      getLayoutConfig: () => ({
        gridTemplateColumns: '2fr 1fr 1fr',
        gridTemplateRows: 'repeat(2, 1fr)',
        gridTemplateAreas: '"main top-left top-right" "main bottom-left bottom-right"',
        areas: ['main', 'top-left', 'top-right', 'bottom-left', 'bottom-right']
      })
    },
    {
      id: 'featured-top-with-4-below',
      name: 'Feature Top with 4 Below',
      panels: 5,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: '2fr 1fr',
        gridTemplateAreas: '"main main main main" "one two three four"',
        areas: ['main', 'one', 'two', 'three', 'four']
      })
    },
    {
      id: '5-rows',
      name: '5 Rows',
      panels: 5,
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
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(5, 1fr)',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(5).fill({ gridArea: null })
      })
    },
    {
      id: 'vertical-asymmetric-5',
      name: 'Vertical Asymmetric',
      panels: 5,
      getLayoutConfig: () => ({
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        gridTemplateAreas: '"top-left top-right" "middle middle" "bottom-left bottom-right"',
        areas: ['top-left', 'top-right', 'middle', 'bottom-left', 'bottom-right']
      })
    }
  ]
};

export default fivePanelLayouts; 
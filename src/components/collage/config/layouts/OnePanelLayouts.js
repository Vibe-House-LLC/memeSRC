/**
 * Layout definitions for 1-panel layouts
 */

const onePanelLayouts = {
  wide: [
    {
      id: 'simple-wide',
      name: 'Full Frame',
      panels: 1,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: [{ gridArea: null }]
      })
    },
    {
      id: 'centered-wide',
      name: 'Centered (3:2)',
      panels: 1,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 3fr 1fr',
        gridTemplateRows: '1fr',
        gridTemplateAreas: '". main ."',
        areas: ['main']
      })
    },
    {
      id: 'letterbox',
      name: 'Letterbox',
      panels: 1,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr 4fr 1fr',
        gridTemplateAreas: '". . ." ". main ." ". . ."',
        areas: ['main']
      })
    }
  ],
  tall: [
    {
      id: 'simple-tall',
      name: 'Full Frame',
      panels: 1,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: [{ gridArea: null }]
      })
    },
    {
      id: 'centered-tall',
      name: 'Centered (2:3)',
      panels: 1,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr 3fr 1fr',
        gridTemplateAreas: '". . ." ". main ." ". . ."',
        areas: ['main']
      })
    },
    {
      id: 'pillarbox',
      name: 'Pillarbox',
      panels: 1,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 4fr 1fr',
        gridTemplateRows: '1fr',
        gridTemplateAreas: '". main ."',
        areas: ['main']
      })
    }
  ],
  square: [
    {
      id: 'simple-square',
      name: 'Full Frame',
      panels: 1,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: [{ gridArea: null }]
      })
    },
    {
      id: 'framed-square',
      name: 'Framed',
      panels: 1,
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 6fr 1fr',
        gridTemplateRows: '1fr 6fr 1fr',
        gridTemplateAreas: '". . ." ". main ." ". . ."',
        areas: ['main']
      })
    },
    {
      id: 'circular-frame',
      name: 'Circular',
      panels: 1,
      // This will appear circular due to styling, but grid is still square
      getLayoutConfig: () => ({
        gridTemplateColumns: '1fr 4fr 1fr',
        gridTemplateRows: '1fr 4fr 1fr',
        gridTemplateAreas: '". . ." ". main ." ". . ."',
        areas: ['main'],
        borderRadius: '50%'
      })
    }
  ]
};

export default onePanelLayouts;

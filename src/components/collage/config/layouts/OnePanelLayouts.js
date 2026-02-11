/**
 * Layout definitions for 1-panel layouts
 */

const baseSinglePanelLayout = {
  id: 'single-panel',
  name: 'Single Panel',
  panels: 1,
  hasEqualPanels: true,
  getLayoutConfig: () => ({
    gridTemplateColumns: '1fr',
    gridTemplateRows: '1fr',
    gridTemplateAreas: null,
    items: [{ gridArea: null }],
  }),
};

const onePanelLayouts = {
  wide: [
    {
      ...baseSinglePanelLayout,
      hasWidePanels: true,
    },
  ],
  tall: [
    {
      ...baseSinglePanelLayout,
      hasTallPanels: true,
    },
  ],
  square: [
    {
      ...baseSinglePanelLayout,
    },
  ],
};

export default onePanelLayouts;

import {
  applyBorderDragDelta,
  detectBorderZonesFromPanelRects,
  findBorderZoneByEdgeId,
} from './borderZones';

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 960;
const BORDER_PIXELS = 10;

const createVerticalAsymmetricRects = (topSplitStart: number, bottomSplitStart: number) => {
  const interiorLeft = BORDER_PIXELS;
  const interiorTop = BORDER_PIXELS;
  const interiorRight = CANVAS_WIDTH - BORDER_PIXELS;
  const interiorBottom = CANVAS_HEIGHT - BORDER_PIXELS;
  const interiorWidth = interiorRight - interiorLeft;
  const interiorHeight = interiorBottom - interiorTop;
  const rowGap = BORDER_PIXELS;
  const rowHeight = (interiorHeight - (rowGap * 2)) / 3;

  const topY = interiorTop;
  const middleY = topY + rowHeight + rowGap;
  const bottomY = middleY + rowHeight + rowGap;

  const topRightX = topSplitStart + BORDER_PIXELS;
  const bottomRightX = bottomSplitStart + BORDER_PIXELS;

  return [
    {
      panelId: 'panel-1',
      index: 0,
      x: interiorLeft,
      y: topY,
      width: topSplitStart - interiorLeft,
      height: rowHeight,
    },
    {
      panelId: 'panel-2',
      index: 1,
      x: topRightX,
      y: topY,
      width: interiorRight - topRightX,
      height: rowHeight,
    },
    {
      panelId: 'panel-3',
      index: 2,
      x: interiorLeft,
      y: middleY,
      width: interiorWidth,
      height: rowHeight,
    },
    {
      panelId: 'panel-4',
      index: 3,
      x: interiorLeft,
      y: bottomY,
      width: bottomSplitStart - interiorLeft,
      height: rowHeight,
    },
    {
      panelId: 'panel-5',
      index: 4,
      x: bottomRightX,
      y: bottomY,
      width: interiorRight - bottomRightX,
      height: rowHeight,
    },
  ];
};

const detectVerticalZones = (panelRects: ReturnType<typeof createVerticalAsymmetricRects>) => (
  detectBorderZonesFromPanelRects({
    containerWidth: CANVAS_WIDTH,
    containerHeight: CANVAS_HEIGHT,
    borderPixels: BORDER_PIXELS,
    panelRects,
  }).filter((zone) => zone.type === 'vertical')
);

const createHorizontalSplitRects = (splitStart: number) => {
  const interiorLeft = BORDER_PIXELS;
  const interiorTop = BORDER_PIXELS;
  const interiorRight = CANVAS_WIDTH - BORDER_PIXELS;
  const interiorBottom = CANVAS_HEIGHT - BORDER_PIXELS;
  const splitEnd = splitStart + BORDER_PIXELS;
  const width = interiorRight - interiorLeft;

  return [
    {
      panelId: 'panel-1',
      index: 0,
      x: interiorLeft,
      y: interiorTop,
      width,
      height: splitStart - interiorTop,
    },
    {
      panelId: 'panel-2',
      index: 1,
      x: interiorLeft,
      y: splitEnd,
      width,
      height: interiorBottom - splitEnd,
    },
  ];
};

const detectHorizontalZones = (panelRects: ReturnType<typeof createHorizontalSplitRects>) => (
  detectBorderZonesFromPanelRects({
    containerWidth: CANVAS_WIDTH,
    containerHeight: CANVAS_HEIGHT,
    borderPixels: BORDER_PIXELS,
    panelRects,
  }).filter((zone) => zone.type === 'horizontal')
);

const getSplitStarts = (panelRects: ReturnType<typeof createVerticalAsymmetricRects>) => {
  const topLeft = panelRects.find((panel) => panel.panelId === 'panel-1');
  const bottomLeft = panelRects.find((panel) => panel.panelId === 'panel-4');
  return {
    top: Number(topLeft?.x || 0) + Number(topLeft?.width || 0),
    bottom: Number(bottomLeft?.x || 0) + Number(bottomLeft?.width || 0),
  };
};

const getHorizontalSplitStart = (panelRects: ReturnType<typeof createHorizontalSplitRects>) => {
  const top = panelRects.find((panel) => panel.panelId === 'panel-1');
  return Number(top?.y || 0) + Number(top?.height || 0);
};

const getVerticalCenterDelta = (
  panelRects: ReturnType<typeof createVerticalAsymmetricRects>,
  minPanelWidthPx: number,
) => {
  const left = panelRects.find((panel) => panel.panelId === 'panel-1');
  const right = panelRects.find((panel) => panel.panelId === 'panel-2');
  if (!left || !right) return 0;
  const minAllowedDelta = minPanelWidthPx - left.width;
  const maxAllowedDelta = right.width - minPanelWidthPx;
  return (minAllowedDelta + maxAllowedDelta) / 2;
};

const getHorizontalCenterDelta = (
  panelRects: ReturnType<typeof createHorizontalSplitRects>,
  minPanelHeightPx: number,
) => {
  const top = panelRects.find((panel) => panel.panelId === 'panel-1');
  const bottom = panelRects.find((panel) => panel.panelId === 'panel-2');
  if (!top || !bottom) return 0;
  const minAllowedDelta = minPanelHeightPx - top.height;
  const maxAllowedDelta = bottom.height - minPanelHeightPx;
  return (minAllowedDelta + maxAllowedDelta) / 2;
};

describe('borderZones disjoint drag behavior', () => {
  it('keeps two independent vertical handles before and after collinear alignment', () => {
    const preAligned = createVerticalAsymmetricRects(220, 340);
    const aligned = createVerticalAsymmetricRects(280, 280);

    const preZones = detectVerticalZones(preAligned);
    const alignedZones = detectVerticalZones(aligned);

    expect(preZones).toHaveLength(2);
    expect(alignedZones).toHaveLength(2);

    expect(findBorderZoneByEdgeId(preZones, 'v|panel-1|panel-2')).toBeTruthy();
    expect(findBorderZoneByEdgeId(preZones, 'v|panel-4|panel-5')).toBeTruthy();
    expect(findBorderZoneByEdgeId(alignedZones, 'v|panel-1|panel-2')).toBeTruthy();
    expect(findBorderZoneByEdgeId(alignedZones, 'v|panel-4|panel-5')).toBeTruthy();
  });

  it('keeps both disjoint handles while border gaps partially overlap', () => {
    const overlapStates = [
      createVerticalAsymmetricRects(280, 286),
      createVerticalAsymmetricRects(282, 286),
      createVerticalAsymmetricRects(284, 286),
      createVerticalAsymmetricRects(286, 286),
    ];

    overlapStates.forEach((panelRects) => {
      const zones = detectVerticalZones(panelRects);
      expect(zones).toHaveLength(2);
      expect(findBorderZoneByEdgeId(zones, 'v|panel-1|panel-2')).toBeTruthy();
      expect(findBorderZoneByEdgeId(zones, 'v|panel-4|panel-5')).toBeTruthy();
    });
  });

  it('dragging top split does not mutate bottom split geometry', () => {
    const initialRects = createVerticalAsymmetricRects(220, 340);
    const initialSplits = getSplitStarts(initialRects);
    const zones = detectVerticalZones(initialRects);
    const topZone = findBorderZoneByEdgeId(zones, 'v|panel-1|panel-2');

    const dragResult = applyBorderDragDelta({
      panelRects: initialRects,
      borderZone: topZone,
      deltaX: 32,
      deltaY: 0,
      minPanelWidthPx: 24,
      minPanelHeightPx: 24,
    });

    expect(dragResult.outcome).toBe('changed');
    expect(dragResult.changed).toBe(true);

    const nextSplits = getSplitStarts(dragResult.nextPanelRects);
    expect(nextSplits.top).toBeCloseTo(initialSplits.top + 32, 4);
    expect(nextSplits.bottom).toBeCloseTo(initialSplits.bottom, 4);
  });

  it('remains draggable through perfect alignment for the top split', () => {
    const initialRects = createVerticalAsymmetricRects(220, 340);
    const zones = detectVerticalZones(initialRects);
    const topZone = findBorderZoneByEdgeId(zones, 'v|panel-1|panel-2');

    const alignResult = applyBorderDragDelta({
      panelRects: initialRects,
      borderZone: topZone,
      deltaX: 120,
      deltaY: 0,
      minPanelWidthPx: 24,
      minPanelHeightPx: 24,
    });
    expect(alignResult.outcome).toBe('changed');

    const alignedZones = detectVerticalZones(alignResult.nextPanelRects);
    const alignedTopZone = findBorderZoneByEdgeId(alignedZones, 'v|panel-1|panel-2');
    expect(alignedTopZone).toBeTruthy();

    const passThroughResult = applyBorderDragDelta({
      panelRects: alignResult.nextPanelRects,
      borderZone: alignedTopZone,
      deltaX: 18,
      deltaY: 0,
      minPanelWidthPx: 24,
      minPanelHeightPx: 24,
    });
    expect(passThroughResult.outcome).toBe('changed');

    const splits = getSplitStarts(passThroughResult.nextPanelRects);
    expect(splits.top).toBeGreaterThan(splits.bottom);
  });

  it('stays operable across repeated drag cycles', () => {
    let rects = createVerticalAsymmetricRects(240, 320);

    for (let i = 0; i < 10; i += 1) {
      const zones = detectVerticalZones(rects);
      const topZone = findBorderZoneByEdgeId(zones, 'v|panel-1|panel-2');
      expect(topZone).toBeTruthy();

      const moveRight = applyBorderDragDelta({
        panelRects: rects,
        borderZone: topZone,
        deltaX: 14,
        deltaY: 0,
        minPanelWidthPx: 24,
        minPanelHeightPx: 24,
      });
      expect(moveRight.outcome).toBe('changed');
      rects = moveRight.nextPanelRects;

      const updatedZones = detectVerticalZones(rects);
      const updatedTopZone = findBorderZoneByEdgeId(updatedZones, 'v|panel-1|panel-2');
      expect(updatedTopZone).toBeTruthy();

      const moveLeft = applyBorderDragDelta({
        panelRects: rects,
        borderZone: updatedTopZone,
        deltaX: -14,
        deltaY: 0,
        minPanelWidthPx: 24,
        minPanelHeightPx: 24,
      });
      expect(moveLeft.outcome).toBe('changed');
      rects = moveLeft.nextPanelRects;
    }

    const finalZones = detectVerticalZones(rects);
    expect(findBorderZoneByEdgeId(finalZones, 'v|panel-1|panel-2')).toBeTruthy();
    expect(findBorderZoneByEdgeId(finalZones, 'v|panel-4|panel-5')).toBeTruthy();
  });

  it('does not center-snap when snap config is omitted', () => {
    const initialRects = createVerticalAsymmetricRects(220, 340);
    const zones = detectVerticalZones(initialRects);
    const topZone = findBorderZoneByEdgeId(zones, 'v|panel-1|panel-2');

    const dragResult = applyBorderDragDelta({
      panelRects: initialRects,
      borderZone: topZone,
      deltaX: 92,
      deltaY: 0,
      minPanelWidthPx: 24,
      minPanelHeightPx: 24,
    });

    expect(dragResult.outcome).toBe('changed');
    expect(dragResult.appliedDeltaX).toBeCloseTo(92, 4);
  });

  it('lightly snaps vertical borders to the center of their allowed range', () => {
    const minPanelWidthPx = 24;
    const initialRects = createVerticalAsymmetricRects(220, 340);
    const zones = detectVerticalZones(initialRects);
    const topZone = findBorderZoneByEdgeId(zones, 'v|panel-1|panel-2');
    const expectedCenterDelta = getVerticalCenterDelta(initialRects, minPanelWidthPx);
    const initialSplit = getSplitStarts(initialRects).top;

    const dragResult = applyBorderDragDelta({
      panelRects: initialRects,
      borderZone: topZone,
      deltaX: expectedCenterDelta - 3,
      deltaY: 0,
      minPanelWidthPx,
      minPanelHeightPx: 24,
      centerSnap: {
        enabled: true,
        thresholdPx: 4,
      },
    });

    expect(dragResult.outcome).toBe('changed');
    expect(dragResult.appliedDeltaX).toBeCloseTo(expectedCenterDelta, 4);
    expect(getSplitStarts(dragResult.nextPanelRects).top).toBeCloseTo(initialSplit + expectedCenterDelta, 4);
  });

  it('lightly snaps horizontal borders to the center of their allowed range', () => {
    const minPanelHeightPx = 24;
    const initialRects = createHorizontalSplitRects(300);
    const zones = detectHorizontalZones(initialRects);
    const splitZone = findBorderZoneByEdgeId(zones, 'h|panel-1|panel-2');
    const expectedCenterDelta = getHorizontalCenterDelta(initialRects, minPanelHeightPx);
    const initialSplit = getHorizontalSplitStart(initialRects);

    const dragResult = applyBorderDragDelta({
      panelRects: initialRects,
      borderZone: splitZone,
      deltaX: 0,
      deltaY: expectedCenterDelta - 2,
      minPanelWidthPx: 24,
      minPanelHeightPx,
      centerSnap: {
        enabled: true,
        thresholdPx: 3,
      },
    });

    expect(dragResult.outcome).toBe('changed');
    expect(dragResult.appliedDeltaY).toBeCloseTo(expectedCenterDelta, 4);
    expect(getHorizontalSplitStart(dragResult.nextPanelRects)).toBeCloseTo(initialSplit + expectedCenterDelta, 4);
  });

  it('flags center-snap no-op drags so callers can accumulate through the snap', () => {
    const centeredRects = createHorizontalSplitRects(475);
    const zones = detectHorizontalZones(centeredRects);
    const splitZone = findBorderZoneByEdgeId(zones, 'h|panel-1|panel-2');

    const dragResult = applyBorderDragDelta({
      panelRects: centeredRects,
      borderZone: splitZone,
      deltaX: 0,
      deltaY: 2,
      minPanelWidthPx: 24,
      minPanelHeightPx: 24,
      centerSnap: {
        enabled: true,
        thresholdPx: 3,
      },
    });

    expect(dragResult.outcome).toBe('noop');
    expect(dragResult.changed).toBe(false);
    expect(dragResult.snappedToCenter).toBe(true);
  });
});

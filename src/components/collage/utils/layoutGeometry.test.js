import {
  getPanelOrderIndex,
  isCustomLayoutCompatible,
  parseGridTemplateAreas,
  parseGridToRects,
} from './layoutGeometry';

describe('layoutGeometry utils', () => {
  it('parses grid template areas with quoted rows', () => {
    const areas = parseGridTemplateAreas('"left right" "left right"');

    expect(areas.left).toEqual({
      rowStart: 0,
      rowEnd: 1,
      colStart: 0,
      colEnd: 0,
    });
    expect(areas.right).toEqual({
      rowStart: 0,
      rowEnd: 1,
      colStart: 1,
      colEnd: 1,
    });
  });

  it('derives panel order index from explicit index and panel id', () => {
    expect(getPanelOrderIndex({ index: 4, panelId: 'panel-2' }, 0)).toBe(4);
    expect(getPanelOrderIndex({ panelId: 'panel-3' }, 0)).toBe(2);
    expect(getPanelOrderIndex({ panelId: 'bad' }, 9)).toBe(9);
  });

  it('builds panel rects from explicit panelRects and sorts by index', () => {
    const rects = parseGridToRects(
      {
        panelRects: [
          { panelId: 'panel-2', index: 1, x: 0.5, y: 0, width: 0.5, height: 1 },
          { panelId: 'panel-1', index: 0, x: 0, y: 0, width: 0.5, height: 1 },
        ],
      },
      100,
      100,
      2,
      0
    );

    expect(rects.map((rect) => rect.panelId)).toEqual(['panel-1', 'panel-2']);
    expect(rects[0]).toMatchObject({ x: 0, y: 0, width: 50, height: 100 });
    expect(rects[1]).toMatchObject({ x: 50, y: 0, width: 50, height: 100 });
  });

  it('respects limitSequentialToGridCells when requested', () => {
    const rects = parseGridToRects(
      {
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(1, 1fr)',
      },
      200,
      100,
      3,
      0,
      { limitSequentialToGridCells: true }
    );

    expect(rects).toHaveLength(2);
  });

  it('validates custom layout compatibility across panel rects and tracks', () => {
    expect(isCustomLayoutCompatible({ panelRects: [{}, {}] }, 2)).toBe(true);
    expect(isCustomLayoutCompatible({ gridTemplateColumns: 'repeat(2, 1fr)', gridTemplateRows: 'repeat(2, 1fr)' }, 4)).toBe(true);
    expect(isCustomLayoutCompatible({ gridTemplateColumns: 'repeat(1, 1fr)', gridTemplateRows: 'repeat(1, 1fr)' }, 2)).toBe(false);
  });
});

import { buildV2EditorImportSnapshot } from './importV2EditorToCollage';

describe('buildV2EditorImportSnapshot', () => {
  const baseImage = {
    imageRef: {
      url: 'https://example.com/base.jpg',
      metadata: { source: 'V2EditorPage' },
    },
    naturalWidth: 1200,
    naturalHeight: 600,
  };

  it('creates a single-panel custom snapshot with no borders', () => {
    const snapshot = buildV2EditorImportSnapshot({
      baseImage,
      canvasObjects: [],
      baseCanvasWidth: 400,
      baseCanvasHeight: 200,
    });

    expect(snapshot.panelCount).toBe(1);
    expect(snapshot.selectedAspectRatio).toBe('custom');
    expect(snapshot.customAspectRatio).toBeCloseTo(2);
    expect(snapshot.borderThickness).toBe('none');
    expect(snapshot.borderColor).toBe('#FFFFFF');
    expect(snapshot.images).toEqual([
      {
        url: 'https://example.com/base.jpg',
        metadata: { source: 'V2EditorPage' },
      },
    ]);
    expect(snapshot.panelImageMapping).toEqual({ 'panel-1': 0 });
    expect(snapshot.canvasWidth).toBe(400);
    expect(snapshot.canvasHeight).toBe(200);
    expect(snapshot.panelDimensions).toEqual({
      'panel-1': { width: 400, height: 200 },
    });
  });

  it('maps formatted text into a floating collage text layer', () => {
    const snapshot = buildV2EditorImportSnapshot({
      baseImage,
      canvasObjects: [
        {
          type: 'textbox',
          text: 'Hello world',
          fill: '#ffee00',
          stroke: '#111111',
          strokeWidth: 3,
          fontSize: 48,
          fontFamily: 'Impact',
          fontWeight: 700,
          fontStyle: 'italic',
          textAlign: 'center',
          angle: 15,
          width: 200,
          height: 60,
          scaleX: 1,
          scaleY: 1,
          getScaledWidth: () => 200,
          getScaledHeight: () => 60,
          getCenterPoint: () => ({ x: 200, y: 130 }),
        },
      ],
      layerRawText: {
        0: '<b>Hello</b> world',
      },
      whiteSpaceHeight: 20,
      baseCanvasWidth: 400,
      baseCanvasHeight: 200,
    });

    expect(snapshot.panelTexts).toHaveProperty('__text-layer__-v2-0');
    const layer = snapshot.panelTexts['__text-layer__-v2-0'] as Record<string, unknown>;
    expect(layer.rawContent).toBe('<b>Hello</b> world');
    expect(layer.content).toBe('Hello world');
    expect(layer.fontFamily).toBe('Impact');
    expect(layer.fontWeight).toBe(700);
    expect(layer.fontStyle).toBe('italic');
    expect(layer.color).toBe('#ffee00');
    expect(layer.strokeColor).toBe('#111111');
    expect(layer.textRotation).toBe(15);
    expect(layer.textAlign).toBe('center');
    expect(layer.zIndex).toBe(0);
    expect(layer.fontSize).toBeCloseTo(48);
    expect(layer.textBoxWidthPercent).toBeCloseTo(52.63, 1);
    expect(layer.textPositionX).toBeCloseTo(0, 4);
    expect(layer.textPositionY).toBeGreaterThan(0);
  });

  it('maps image overlays into collage stickers with preserved transforms', () => {
    const snapshot = buildV2EditorImportSnapshot({
      baseImage,
      canvasObjects: [
        {
          type: 'image',
          width: 100,
          height: 50,
          scaleX: 2,
          scaleY: 2,
          angle: 25,
          getScaledWidth: () => 200,
          getScaledHeight: () => 100,
          getCenterPoint: () => ({ x: 120, y: 80 }),
          getSrc: () => 'https://example.com/sticker.png',
          _element: {
            naturalWidth: 400,
            naturalHeight: 200,
            src: 'https://example.com/sticker.png',
          },
        },
      ],
      whiteSpaceHeight: 20,
      baseCanvasWidth: 400,
      baseCanvasHeight: 200,
    });

    expect(snapshot.stickers).toHaveLength(1);
    expect(snapshot.stickers?.[0]).toMatchObject({
      id: 'sticker-v2-0',
      url: 'https://example.com/sticker.png',
      thumbnailUrl: 'https://example.com/sticker.png',
      aspectRatio: 2,
      angleDeg: 25,
      zIndex: 0,
    });
    expect(snapshot.stickers?.[0].widthPercent).toBeCloseTo(50);
    expect(snapshot.stickers?.[0].xPercent).toBeCloseTo(5);
    expect(snapshot.stickers?.[0].yPercent).toBeCloseTo(5);
  });

  it('preserves fabric object order as overlay z-index values', () => {
    const snapshot = buildV2EditorImportSnapshot({
      baseImage,
      canvasObjects: [
        {
          type: 'image',
          width: 40,
          height: 40,
          scaleX: 1,
          scaleY: 1,
          getScaledWidth: () => 40,
          getScaledHeight: () => 40,
          getCenterPoint: () => ({ x: 40, y: 40 }),
          getSrc: () => 'https://example.com/sticker-a.png',
          _element: { naturalWidth: 40, naturalHeight: 40, src: 'https://example.com/sticker-a.png' },
        },
        {
          type: 'textbox',
          text: 'Middle',
          width: 120,
          height: 40,
          scaleX: 1,
          scaleY: 1,
          getScaledWidth: () => 120,
          getScaledHeight: () => 40,
          getCenterPoint: () => ({ x: 200, y: 100 }),
        },
        {
          type: 'image',
          width: 40,
          height: 20,
          scaleX: 1,
          scaleY: 1,
          getScaledWidth: () => 40,
          getScaledHeight: () => 20,
          getCenterPoint: () => ({ x: 300, y: 120 }),
          getSrc: () => 'https://example.com/sticker-b.png',
          _element: { naturalWidth: 40, naturalHeight: 20, src: 'https://example.com/sticker-b.png' },
        },
      ],
      baseCanvasWidth: 400,
      baseCanvasHeight: 200,
    });

    expect(snapshot.stickers?.map((sticker) => sticker.zIndex)).toEqual([0, 2]);
    expect(
      (snapshot.panelTexts['__text-layer__-v2-1'] as Record<string, unknown>).zIndex
    ).toBe(1);
  });

  it('removes legacy whitespace offset from imported overlay positions', () => {
    const withoutWhitespace = buildV2EditorImportSnapshot({
      baseImage,
      canvasObjects: [
        {
          type: 'image',
          width: 100,
          height: 50,
          scaleX: 1,
          scaleY: 1,
          getScaledWidth: () => 100,
          getScaledHeight: () => 50,
          getCenterPoint: () => ({ x: 100, y: 60 }),
          getSrc: () => 'https://example.com/sticker.png',
          _element: { naturalWidth: 100, naturalHeight: 50, src: 'https://example.com/sticker.png' },
        },
      ],
      baseCanvasWidth: 400,
      baseCanvasHeight: 200,
    });

    const withWhitespace = buildV2EditorImportSnapshot({
      baseImage,
      canvasObjects: [
        {
          type: 'image',
          width: 100,
          height: 50,
          scaleX: 1,
          scaleY: 1,
          getScaledWidth: () => 100,
          getScaledHeight: () => 50,
          getCenterPoint: () => ({ x: 100, y: 60 }),
          getSrc: () => 'https://example.com/sticker.png',
          _element: { naturalWidth: 100, naturalHeight: 50, src: 'https://example.com/sticker.png' },
        },
      ],
      whiteSpaceHeight: 20,
      baseCanvasWidth: 400,
      baseCanvasHeight: 200,
    });

    expect(withoutWhitespace.stickers?.[0].yPercent).toBeCloseTo(17.5);
    expect(withWhitespace.stickers?.[0].yPercent).toBeCloseTo(7.5);
  });
});

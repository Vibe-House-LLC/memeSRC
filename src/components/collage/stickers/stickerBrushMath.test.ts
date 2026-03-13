/// <reference types="jest" />
import { describe, expect, test } from '@jest/globals';
import {
  applyBrushStrokeToMaskData,
  clampTransformToViewport,
  createCenteredTransformForBounds,
  createOpaqueMaskData,
  getNonTransparentPixelBounds,
  isMaskDataPristine,
} from './stickerBrushMath';

describe('stickerBrushMath', () => {
  test('erase lowers alpha and marks mask as changed', () => {
    const data = createOpaqueMaskData(8, 8);
    const changedPixels = applyBrushStrokeToMaskData(data, 8, 8, {
      fromX: 4,
      fromY: 4,
      toX: 4,
      toY: 4,
      radius: 2,
      opacity: 0.5,
      mode: 'erase',
    });

    expect(changedPixels).toBeGreaterThan(0);
    expect(isMaskDataPristine(data)).toBe(false);
    expect(data[((4 * 8) + 4) * 4 + 3]).toBeLessThan(255);
  });

  test('restore returns erased pixels back to full opacity', () => {
    const data = createOpaqueMaskData(10, 10);

    applyBrushStrokeToMaskData(data, 10, 10, {
      fromX: 5,
      fromY: 5,
      toX: 5,
      toY: 5,
      radius: 2,
      opacity: 1,
      mode: 'erase',
    });

    applyBrushStrokeToMaskData(data, 10, 10, {
      fromX: 5,
      fromY: 5,
      toX: 5,
      toY: 5,
      radius: 2,
      opacity: 1,
      mode: 'restore',
    });

    expect(isMaskDataPristine(data)).toBe(true);
  });

  test('repeated restore does not overflow alpha', () => {
    const data = createOpaqueMaskData(6, 6);

    applyBrushStrokeToMaskData(data, 6, 6, {
      fromX: 2,
      fromY: 2,
      toX: 2,
      toY: 2,
      radius: 1.5,
      opacity: 1,
      mode: 'restore',
    });

    expect(isMaskDataPristine(data)).toBe(true);
    expect(data[((2 * 6) + 2) * 4 + 3]).toBe(255);
  });

  test('line strokes affect intermediate pixels', () => {
    const data = createOpaqueMaskData(12, 12);

    applyBrushStrokeToMaskData(data, 12, 12, {
      fromX: 2,
      fromY: 2,
      toX: 9,
      toY: 9,
      radius: 1.25,
      opacity: 0.35,
      mode: 'erase',
    });

    expect(data[((6 * 12) + 6) * 4 + 3]).toBeLessThan(255);
  });

  test('finds the tight bounds of visible pixels', () => {
    const width = 7;
    const height = 6;
    const data = new Uint8ClampedArray(width * height * 4);
    const setPixel = (x: number, y: number, alpha: number) => {
      const index = ((y * width) + x) * 4;
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 255;
      data[index + 3] = alpha;
    };

    setPixel(2, 1, 255);
    setPixel(4, 3, 180);
    setPixel(3, 2, 90);

    expect(getNonTransparentPixelBounds(data, width, height)).toEqual({
      x: 2,
      y: 1,
      width: 3,
      height: 3,
    });
  });

  test('returns null when all pixels are transparent', () => {
    const data = new Uint8ClampedArray(5 * 4 * 4);

    expect(getNonTransparentPixelBounds(data, 5, 4)).toBeNull();
  });

  test('bounds can be safely expanded without exceeding the canvas edges', () => {
    const width = 8;
    const height = 8;
    const data = new Uint8ClampedArray(width * height * 4);
    const setPixel = (x: number, y: number) => {
      const index = ((y * width) + x) * 4;
      data[index + 3] = 255;
    };

    setPixel(0, 1);
    setPixel(6, 7);

    const bounds = getNonTransparentPixelBounds(data, width, height);
    expect(bounds).toEqual({
      x: 0,
      y: 1,
      width: 7,
      height: 7,
    });
  });

  test('free-pan transform preserves offsets while still enforcing min scale', () => {
    expect(clampTransformToViewport({
      scale: 0.2,
      offsetX: 480,
      offsetY: -320,
    }, 400, 400, 200, 200, 0.5)).toEqual({
      scale: 0.5,
      offsetX: 480,
      offsetY: -320,
    });
  });

  test('center transform aligns visible bounds to viewport center', () => {
    expect(createCenteredTransformForBounds({
      bounds: {
        x: 20,
        y: 40,
        width: 60,
        height: 20,
      },
      viewportWidth: 200,
      viewportHeight: 160,
      scale: 2,
    })).toEqual({
      scale: 2,
      offsetX: 0,
      offsetY: -20,
    });
  });
});

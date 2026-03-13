/// <reference types="jest" />
import { describe, expect, test } from '@jest/globals';
import {
  applyBrushStrokeToMaskData,
  createOpaqueMaskData,
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
});

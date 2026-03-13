import { describe, expect, it } from '@jest/globals';
import type { CollageSnapshot } from '../../../types/collage';
import {
  appendImageToSnapshot,
  buildSingleImageSnapshot,
  resolveAutoAppliedCollageBorderThickness,
} from './snapshotEditing';

describe('snapshotEditing', () => {
  it('falls back to thin auto-applied borders when no saved preference exists', () => {
    window.localStorage.removeItem('meme-src-collage-border-thickness');

    expect(resolveAutoAppliedCollageBorderThickness('medium')).toBe('thin');
  });

  it('prefers the saved border thickness for auto-applied borders', () => {
    window.localStorage.setItem('meme-src-collage-border-thickness', 'thick');

    expect(resolveAutoAppliedCollageBorderThickness()).toBe('thick');
  });

  it('restores the default portrait two-panel layout when appending a second auto-sized image', () => {
    window.localStorage.removeItem('meme-src-collage-border-thickness');

    const firstImage = {
      url: 'https://example.com/first.jpg',
      subtitle: 'First caption',
      subtitleShowing: true,
    };
    const secondImage = {
      url: 'https://example.com/second.jpg',
      subtitle: 'Second caption',
      subtitleShowing: true,
    };

    const singleImageSnapshot = buildSingleImageSnapshot(firstImage, {
      customAspectRatio: 1.8,
      borderThickness: 0,
      singleImageAutoRestoreAspectRatioId: 'portrait',
      singleImageAutoRestoreBorderThickness: 'thin',
    });

    const { snapshot } = appendImageToSnapshot(singleImageSnapshot, secondImage);

    expect(snapshot.panelCount).toBe(2);
    expect(snapshot.selectedAspectRatio).toBe('portrait');
    expect(snapshot.selectedTemplateId).toBe('split-vertical');
    expect(snapshot.singleImageAutoRestoreAspectRatioId).toBeNull();
    expect(snapshot.borderThickness).toBe('thin');
    expect(snapshot.panelTransforms).toEqual({});
    expect(snapshot.panelTexts).toMatchObject({
      'panel-1': expect.objectContaining({ content: 'First caption', autoAssigned: true }),
      'panel-2': expect.objectContaining({ content: 'Second caption', autoAssigned: true }),
    });
  });

  it('preserves a manual custom size when appending a second image', () => {
    const manualSingleImageSnapshot: CollageSnapshot = {
      version: 1,
      images: [{ url: 'https://example.com/first.jpg' }],
      panelImageMapping: { 'panel-1': 0 },
      panelTransforms: { 'panel-1': { scale: 1.4 } },
      panelTexts: {},
      stickers: [],
      selectedTemplateId: 'single-panel',
      selectedAspectRatio: 'custom',
      customAspectRatio: 1.8,
      singleImageAutoRestoreAspectRatioId: null,
      singleImageAutoRestoreBorderThickness: null,
      panelCount: 1,
      borderThickness: 0,
      borderColor: '#FFFFFF',
      customLayout: null,
    };

    const { snapshot } = appendImageToSnapshot(manualSingleImageSnapshot, {
      url: 'https://example.com/second.jpg',
    });

    expect(snapshot.panelCount).toBe(2);
    expect(snapshot.selectedAspectRatio).toBe('custom');
    expect(snapshot.customAspectRatio).toBe(1.8);
    expect(snapshot.selectedTemplateId).toBe('split-horizontal');
    expect(snapshot.borderThickness).toBe(0);
  });

  it('preserves an explicit multi-panel layout when appending into empty slots', () => {
    const multiPanelSnapshot: CollageSnapshot = {
      version: 1,
      images: [{ url: 'https://example.com/first.jpg' }],
      panelImageMapping: { 'panel-1': 0 },
      panelTransforms: { 'panel-1': { scale: 1.2 } },
      panelTexts: {},
      stickers: [],
      selectedTemplateId: '3-rows',
      selectedAspectRatio: 'portrait',
      customAspectRatio: 0.75,
      singleImageAutoRestoreAspectRatioId: null,
      singleImageAutoRestoreBorderThickness: null,
      panelCount: 3,
      borderThickness: 0,
      borderColor: '#FFFFFF',
      customLayout: {
        panelRects: [
          { panelId: 'panel-1', x: 0, y: 0, width: 1, height: 0.33 },
          { panelId: 'panel-2', x: 0, y: 0.33, width: 1, height: 0.33 },
          { panelId: 'panel-3', x: 0, y: 0.66, width: 1, height: 0.34 },
        ],
      },
    };

    const { snapshot } = appendImageToSnapshot(multiPanelSnapshot, {
      url: 'https://example.com/second.jpg',
    });

    expect(snapshot.panelCount).toBe(3);
    expect(snapshot.selectedAspectRatio).toBe('portrait');
    expect(snapshot.selectedTemplateId).toBe('3-rows');
    expect(snapshot.panelImageMapping).toEqual({
      'panel-1': 0,
      'panel-2': 1,
    });
    expect(snapshot.panelTransforms).toEqual(multiPanelSnapshot.panelTransforms);
    expect(snapshot.customLayout).toEqual(multiPanelSnapshot.customLayout);
  });
});

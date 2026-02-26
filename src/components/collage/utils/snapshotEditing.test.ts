import { appendImageToSnapshot } from './snapshotEditing';

describe('snapshotEditing appendImageToSnapshot', () => {
  it('preserves seeded defaults when creating a new collage', () => {
    const seededSnapshot = {
      version: 1,
      images: [],
      panelImageMapping: {},
      panelTransforms: {},
      panelTexts: {},
      selectedTemplateId: null,
      selectedAspectRatio: 'landscape',
      panelCount: 2,
      borderThickness: 'thicc',
      borderColor: '#123456',
    };

    const { snapshot, addedIndex } = appendImageToSnapshot(seededSnapshot, { url: 'data:,frame' });

    expect(addedIndex).toBe(0);
    expect(snapshot.panelCount).toBe(2);
    expect(snapshot.selectedAspectRatio).toBe('landscape');
    expect(snapshot.borderThickness).toBe('thicc');
    expect(snapshot.borderColor).toBe('#123456');
    expect(snapshot.panelImageMapping).toEqual({ 'panel-1': 0 });
  });

  it('still expands panel count when there are no empty panels', () => {
    const baseSnapshot = {
      version: 1,
      images: [{ url: 'data:,1' }, { url: 'data:,2' }],
      panelImageMapping: { 'panel-1': 0, 'panel-2': 1 },
      panelTransforms: {},
      panelTexts: {},
      selectedTemplateId: null,
      selectedAspectRatio: 'portrait',
      panelCount: 2,
      borderThickness: 'medium',
      borderColor: '#FFFFFF',
    };

    const { snapshot } = appendImageToSnapshot(baseSnapshot, { url: 'data:,3' });

    expect(snapshot.panelCount).toBe(3);
    expect(snapshot.panelImageMapping['panel-3']).toBe(2);
  });
});

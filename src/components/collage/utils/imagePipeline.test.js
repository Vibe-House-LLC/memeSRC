import { createBlobUrlTracker, isBlobUrl, revokeImageObjectUrls } from './imagePipeline';

describe('imagePipeline utilities', () => {
  it('detects blob URLs', () => {
    expect(isBlobUrl('blob:abc')).toBe(true);
    expect(isBlobUrl('https://example.com')).toBe(false);
    expect(isBlobUrl(undefined)).toBe(false);
  });

  it('tracks and revokes blob URLs', () => {
    const originalRevoke = URL.revokeObjectURL;
    const revokeSpy = jest.fn();
    URL.revokeObjectURL = revokeSpy;

    const tracker = createBlobUrlTracker();
    tracker.track('blob:one');
    tracker.track('https://example.com/two');
    tracker.track('blob:three');

    expect(tracker.values()).toEqual(['blob:one', 'blob:three']);

    tracker.revokeAll();
    expect(revokeSpy).toHaveBeenCalledTimes(2);
    expect(revokeSpy).toHaveBeenCalledWith('blob:one');
    expect(revokeSpy).toHaveBeenCalledWith('blob:three');

    URL.revokeObjectURL = originalRevoke;
  });

  it('revokes image object URLs only for blob refs', () => {
    const originalRevoke = URL.revokeObjectURL;
    const revokeSpy = jest.fn();
    URL.revokeObjectURL = revokeSpy;

    revokeImageObjectUrls({
      originalUrl: 'blob:original',
      displayUrl: 'https://example.com/display.jpg',
    });

    expect(revokeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith('blob:original');

    URL.revokeObjectURL = originalRevoke;
  });
});

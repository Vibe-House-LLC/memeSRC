import { getLineStartX, getTextBlockLeft, normalizeTextAlign } from './textLayout';

describe('textLayout utils', () => {
  it('normalizes unsupported alignments to center', () => {
    expect(normalizeTextAlign('left')).toBe('left');
    expect(normalizeTextAlign('right')).toBe('right');
    expect(normalizeTextAlign('middle')).toBe('center');
    expect(normalizeTextAlign(undefined)).toBe('center');
  });

  it('computes line start x for each alignment', () => {
    expect(getLineStartX('left', 100, 40)).toBe(100);
    expect(getLineStartX('right', 100, 40)).toBe(60);
    expect(getLineStartX('center', 100, 40)).toBe(80);
  });

  it('computes text block left for each alignment', () => {
    expect(getTextBlockLeft('left', 100, 40)).toBe(100);
    expect(getTextBlockLeft('right', 100, 40)).toBe(60);
    expect(getTextBlockLeft('center', 100, 40)).toBe(80);
  });
});

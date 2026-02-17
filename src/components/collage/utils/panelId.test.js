import { parsePanelIndexFromId } from './panelId';

describe('parsePanelIndexFromId', () => {
  it('parses valid panel IDs to zero-based indices', () => {
    expect(parsePanelIndexFromId('panel-1')).toBe(0);
    expect(parsePanelIndexFromId('panel-12')).toBe(11);
  });

  it('returns null for invalid IDs', () => {
    expect(parsePanelIndexFromId('panel-0')).toBeNull();
    expect(parsePanelIndexFromId('panel--1')).toBeNull();
    expect(parsePanelIndexFromId('panel-a')).toBeNull();
    expect(parsePanelIndexFromId('bad-1')).toBeNull();
    expect(parsePanelIndexFromId(42)).toBeNull();
    expect(parsePanelIndexFromId(null)).toBeNull();
  });
});

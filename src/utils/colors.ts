export type CssColorString = string;

const NAMED_COLOR_MAP: Record<string, CssColorString> = {
  black: '#000000',
  white: '#ffffff',
  transparent: 'rgba(0, 0, 0, 0)',
};

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const FUNCTIONAL_COLOR_PATTERN = /^(?:rgb|rgba|hsl|hsla|color)\(/i;
const RGB_FUNCTION_PATTERN = /^rgba?\((.+)\)$/i;

export function normalizeColorValue(value?: string | null): CssColorString | undefined {
  if (typeof value === 'undefined' || value === null) {
    return undefined;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return undefined;
  }

  if (HEX_COLOR_PATTERN.test(trimmed) || FUNCTIONAL_COLOR_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const mapped = NAMED_COLOR_MAP[trimmed.toLowerCase()];
  if (mapped) {
    return mapped;
  }

  return undefined;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const expandHexChannel = (value: string) => value + value;

const parseHexColor = (value: string): RgbColor | undefined => {
  if (!HEX_COLOR_PATTERN.test(value)) {
    return undefined;
  }

  const normalized = value.replace('#', '');
  if (normalized.length === 3 || normalized.length === 4) {
    const r = parseInt(expandHexChannel(normalized[0]), 16);
    const g = parseInt(expandHexChannel(normalized[1]), 16);
    const b = parseInt(expandHexChannel(normalized[2]), 16);
    const a = normalized.length === 4 ? parseInt(expandHexChannel(normalized[3]), 16) : 255;
    return { r, g, b, a };
  }

  if (normalized.length === 6 || normalized.length === 8) {
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const a = normalized.length === 8 ? parseInt(normalized.slice(6, 8), 16) : 255;
    return { r, g, b, a };
  }

  return undefined;
};

const parseRgbComponent = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.endsWith('%')) {
    const percentage = Number.parseFloat(trimmed.slice(0, -1));
    if (!Number.isFinite(percentage)) return undefined;
    return clamp(Math.round((percentage / 100) * 255), 0, 255);
  }

  const numeric = Number.parseFloat(trimmed);
  if (!Number.isFinite(numeric)) return undefined;
  return clamp(Math.round(numeric), 0, 255);
};

const parseAlphaComponent = (value: string | undefined): number => {
  if (typeof value === 'undefined') return 1;
  const trimmed = value.trim();
  if (!trimmed) return 1;
  if (trimmed.endsWith('%')) {
    const percentage = Number.parseFloat(trimmed.slice(0, -1));
    if (!Number.isFinite(percentage)) return 1;
    return clamp(percentage / 100, 0, 1);
  }
  const numeric = Number.parseFloat(trimmed);
  if (!Number.isFinite(numeric)) return 1;
  return clamp(numeric, 0, 1);
};

const parseRgbColor = (value: string): RgbColor | undefined => {
  const match = value.match(RGB_FUNCTION_PATTERN);
  if (!match) return undefined;

  const components = match[1]?.split(',');
  if (!components || components.length < 3) return undefined;

  const r = parseRgbComponent(components[0]);
  const g = parseRgbComponent(components[1]);
  const b = parseRgbComponent(components[2]);
  if (typeof r !== 'number' || typeof g !== 'number' || typeof b !== 'number') {
    return undefined;
  }

  const a = components.length >= 4 ? parseAlphaComponent(components[3]) * 255 : 255;
  return { r, g, b, a };
};

const srgbToLinear = (channel: number): number => {
  const normalized = channel / 255;
  if (normalized <= 0.04045) {
    return normalized / 12.92;
  }
  return Math.pow((normalized + 0.055) / 1.055, 2.4);
};

export function getRelativeLuminance(value?: string | null): number | undefined {
  const candidate = normalizeColorValue(value) ?? value ?? undefined;
  if (!candidate) return undefined;

  const rgb = parseHexColor(candidate) ?? parseRgbColor(candidate);
  if (!rgb) return undefined;

  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function isColorNearBlack(value?: string | null, threshold = 0.08): boolean {
  const luminance = getRelativeLuminance(value);
  if (typeof luminance !== 'number') {
    return false;
  }
  return luminance <= threshold;
}

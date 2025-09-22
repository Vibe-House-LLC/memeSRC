export type CssColorString = string;

const NAMED_COLOR_MAP: Record<string, CssColorString> = {
  black: '#000000',
  white: '#ffffff',
  transparent: 'rgba(0, 0, 0, 0)',
};

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const FUNCTIONAL_COLOR_PATTERN = /^(?:rgb|rgba|hsl|hsla|color)\(/i;

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

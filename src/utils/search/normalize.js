// Minimal, dependency-free normalization for search
// - Lowercase
// - Unicode NFD + strip common combining marks
// - Light folding of fancy quotes/dashes
// - Collapse whitespace

export function normalizeString(input) {
  if (input == null) return '';
  const str = String(input);
  let out = str;
  try {
    out = out.normalize('NFD');
  } catch (_) {
    // ignore if normalize is unavailable
  }
  out = out
    .replace(/[\u0300-\u036f]/g, '') // remove combining marks
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'") // single quotes -> '
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"') // double quotes -> "
    .replace(/[\u2013\u2014\u2212]/g, '-') // dashes -> -
    .toLowerCase()
    .replace(/\s+/g, ' ') // collapse spaces
    .trim();
  return out;
}

export function includesNormalized(haystack, needle) {
  const h = normalizeString(haystack);
  const n = normalizeString(needle);
  if (!n) return true;
  return h.includes(n);
}


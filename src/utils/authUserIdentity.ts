const INVALID_STRING_VALUES = new Set(['undefined', 'null']);

export const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const lowerCased = trimmed.toLowerCase();
  if (INVALID_STRING_VALUES.has(lowerCased)) {
    return undefined;
  }

  return trimmed;
};

export const pickFirstValidString = (...values: unknown[]): string | undefined => {
  for (const candidate of values) {
    const normalized = normalizeOptionalString(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
};

export const sanitizeStringRecord = <T extends Record<string, unknown>>(record?: T | null): Partial<T> => {
  if (!record) {
    return {};
  }

  const entries = Object.entries(record as Record<string, unknown>);
  if (!entries.length) {
    return {};
  }

  const sanitized: Record<string, unknown> = {};

  entries.forEach(([key, rawValue]) => {
    if (rawValue === undefined || rawValue === null) {
      return;
    }

    if (typeof rawValue === 'string') {
      const normalized = normalizeOptionalString(rawValue);
      if (!normalized) {
        return;
      }
      sanitized[key] = normalized;
      return;
    }

    sanitized[key] = rawValue;
  });

  return sanitized as Partial<T>;
};


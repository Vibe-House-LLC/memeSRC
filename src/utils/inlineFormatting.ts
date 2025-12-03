export type InlineStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

export type InlineStyleRange = {
  start: number;
  end: number;
  style: InlineStyle;
};

export const INLINE_TAG_ORDER = ['bold', 'italic', 'underline'] as const;

export const STYLE_TO_TAG: Record<Exclude<keyof InlineStyle, 'underline'> | 'underline', string> = {
  bold: 'b',
  italic: 'i',
  underline: 'u',
};

export const SELECTION_CACHE_TTL_MS = 15000;

const normalizeStyle = (style: InlineStyle = {}): Required<InlineStyle> => ({
  bold: Boolean(style.bold),
  italic: Boolean(style.italic),
  underline: Boolean(style.underline),
});

const mergeAdjacentRanges = (ranges: InlineStyleRange[]): InlineStyleRange[] => {
  if (!ranges.length) return [];

  const merged: InlineStyleRange[] = [];
  ranges.forEach((range) => {
    const safeStyle = normalizeStyle(range.style);
    if (merged.length === 0) {
      merged.push({ ...range, style: safeStyle });
      return;
    }

    const last = merged[merged.length - 1];
    const lastStyle = normalizeStyle(last.style);

    if (
      last.end === range.start &&
      lastStyle.bold === safeStyle.bold &&
      lastStyle.italic === safeStyle.italic &&
      lastStyle.underline === safeStyle.underline
    ) {
      last.end = range.end;
    } else {
      merged.push({ ...range, style: safeStyle });
    }
  });

  return merged;
};

export const parseFormattedText = (
  rawText = '',
): { cleanText: string; ranges: InlineStyleRange[] } => {
  const tagRegex = /<\/?(b|i|u)>/gi;
  const styleCounts: Record<string, number> = { b: 0, i: 0, u: 0 };
  const segments: { text: string; style: InlineStyle }[] = [];
  let cleanText = '';
  let cursor = 0;

  const buildStyle = (): InlineStyle => ({
    bold: styleCounts.b > 0,
    italic: styleCounts.i > 0,
    underline: styleCounts.u > 0,
  });

  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(rawText)) !== null) {
    const textChunk = rawText.slice(cursor, match.index);
    if (textChunk.length > 0) {
      segments.push({ text: textChunk, style: buildStyle() });
      cleanText += textChunk;
    }

    const tagKey = match[1]?.toLowerCase();
    const isClosing = match[0].startsWith('</');
    if (tagKey && typeof styleCounts[tagKey] === 'number') {
      const delta = isClosing ? -1 : 1;
      styleCounts[tagKey] = Math.max(0, styleCounts[tagKey] + delta);
    }

    cursor = match.index + match[0].length;
  }

  const tail = rawText.slice(cursor);
  if (tail.length > 0) {
    segments.push({ text: tail, style: buildStyle() });
    cleanText += tail;
  }

  let pointer = 0;
  const ranges = segments
    .filter((segment) => segment.text.length > 0)
    .map((segment) => {
      const start = pointer;
      const end = start + segment.text.length;
      pointer = end;
      return { start, end, style: normalizeStyle(segment.style) };
    });

  return { cleanText, ranges: mergeAdjacentRanges(ranges) };
};

export const buildIndexMaps = (
  rawText = '',
): { rawToPlain: number[]; plainToRaw: number[] } => {
  const rawToPlain = new Array(rawText.length + 1).fill(0);
  const plainToRaw: number[] = [];
  let plainIndex = 0;
  let rawIndex = 0;

  while (rawIndex < rawText.length) {
    const char = rawText[rawIndex];
    rawToPlain[rawIndex] = plainIndex;

    if (char === '<') {
      const closingIdx = rawText.indexOf('>', rawIndex);
      if (closingIdx !== -1) {
        for (let i = rawIndex + 1; i <= closingIdx; i += 1) {
          rawToPlain[i] = plainIndex;
        }
        rawIndex = closingIdx + 1;
        continue;
      }
    }

    plainToRaw[plainIndex] = rawIndex;
    plainIndex += 1;
    rawIndex += 1;
  }

  rawToPlain[rawText.length] = plainIndex;
  plainToRaw[plainIndex] = rawText.length;

  return { rawToPlain, plainToRaw };
};

export const resolveSelectionBounds = (
  ranges: InlineStyleRange[],
  textLength: number,
  rawStart = 0,
  rawEnd = 0,
  rawToPlain: number[] = [],
): { start: number; end: number } => {
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
  const safeStart = clamp(rawStart ?? 0, 0, rawToPlain.length - 1);
  const safeEnd = clamp(rawEnd ?? safeStart, 0, rawToPlain.length - 1);

  const plainStart = clamp(rawToPlain[safeStart] ?? 0, 0, textLength);
  const plainEnd = clamp(rawToPlain[safeEnd] ?? plainStart, 0, textLength);

  if (plainStart !== plainEnd) {
    return { start: Math.min(plainStart, plainEnd), end: Math.max(plainStart, plainEnd) };
  }

  if (!ranges.length) {
    return { start: 0, end: 0 };
  }

  const caret = Math.min(plainStart, textLength);
  const activeRange = ranges.find((range) => caret >= range.start && caret < range.end);
  if (activeRange) {
    return { start: activeRange.start, end: activeRange.end };
  }

  const lastRange = ranges[ranges.length - 1];
  if (textLength > 0) {
    return { start: lastRange.start, end: lastRange.end };
  }

  return { start: 0, end: 0 };
};

export const toggleStyleInRanges = (
  ranges: InlineStyleRange[],
  selectionStart: number,
  selectionEnd: number,
  styleKey: keyof InlineStyle,
): InlineStyleRange[] => {
  if (!ranges.length || selectionEnd <= selectionStart) {
    return ranges;
  }

  const overlapping = ranges.filter(
    (range) => range.end > selectionStart && range.start < selectionEnd,
  );
  const isFullyActive =
    overlapping.length > 0 && overlapping.every((range) => normalizeStyle(range.style)[styleKey]);
  const targetValue = !isFullyActive;

  const nextRanges: InlineStyleRange[] = [];

  ranges.forEach((range) => {
    const { start, end } = range;
    const safeStyle = normalizeStyle(range.style);

    if (end <= selectionStart || start >= selectionEnd) {
      nextRanges.push({ ...range, style: safeStyle });
      return;
    }

    if (start < selectionStart) {
      nextRanges.push({ start, end: selectionStart, style: safeStyle });
    }

    const middleStart = Math.max(start, selectionStart);
    const middleEnd = Math.min(end, selectionEnd);
    nextRanges.push({
      start: middleStart,
      end: middleEnd,
      style: { ...safeStyle, [styleKey]: targetValue },
    });

    if (end > selectionEnd) {
      nextRanges.push({ start: selectionEnd, end, style: safeStyle });
    }
  });

  return mergeAdjacentRanges(nextRanges);
};

export const getActiveFormatsFromRanges = (
  ranges: InlineStyleRange[],
  selectionStart: number,
  selectionEnd: number,
): string[] => {
  if (!ranges.length || selectionEnd <= selectionStart) {
    return [];
  }

  const overlapping = ranges.filter(
    (range) => range.end > selectionStart && range.start < selectionEnd,
  );

  if (!overlapping.length) {
    return [];
  }

  return INLINE_TAG_ORDER.filter((key) =>
    overlapping.every((range) => normalizeStyle(range.style)[key]),
  );
};

export const serializeRangesToMarkup = (
  text = '',
  ranges: InlineStyleRange[] = [],
): string => {
  if (text.length === 0) {
    return '';
  }

  let output = '';
  let activeStyle: Required<InlineStyle> = { bold: false, italic: false, underline: false };
  let rangeIndex = 0;

  for (let i = 0; i < text.length; i += 1) {
    while (rangeIndex < ranges.length && ranges[rangeIndex].end <= i) {
      rangeIndex += 1;
    }

    const currentRange = ranges[rangeIndex] || { style: activeStyle };
    const nextStyle = normalizeStyle(currentRange.style);

    for (let j = INLINE_TAG_ORDER.length - 1; j >= 0; j -= 1) {
      const key = INLINE_TAG_ORDER[j];
      if (activeStyle[key] && !nextStyle[key]) {
        output += `</${STYLE_TO_TAG[key]}>`;
      }
    }

    for (let j = 0; j < INLINE_TAG_ORDER.length; j += 1) {
      const key = INLINE_TAG_ORDER[j];
      if (!activeStyle[key] && nextStyle[key]) {
        output += `<${STYLE_TO_TAG[key]}>`;
      }
    }

    output += text[i];
    activeStyle = nextStyle;
  }

  for (let i = INLINE_TAG_ORDER.length - 1; i >= 0; i -= 1) {
    const key = INLINE_TAG_ORDER[i];
    if (activeStyle[key]) {
      output += `</${STYLE_TO_TAG[key]}>`;
    }
  }

  return output;
};

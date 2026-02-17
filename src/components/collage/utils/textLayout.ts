export type TextAlign = 'left' | 'center' | 'right';

export const normalizeTextAlign = (value: unknown): TextAlign => {
  if (value === 'left' || value === 'center' || value === 'right') return value;
  return 'center';
};

export const getLineStartX = (textAlign: unknown, anchorX: number, lineWidth: number): number => {
  const align = normalizeTextAlign(textAlign);
  if (align === 'left') return anchorX;
  if (align === 'right') return anchorX - lineWidth;
  return anchorX - (lineWidth / 2);
};

export const getTextBlockLeft = (textAlign: unknown, anchorX: number, blockWidth: number): number => {
  const align = normalizeTextAlign(textAlign);
  if (align === 'left') return anchorX;
  if (align === 'right') return anchorX - blockWidth;
  return anchorX - (blockWidth / 2);
};

import React from 'react';
import Box from '@mui/material/Box';
import type { BoxProps } from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

export interface BaseFrostedProps extends Omit<BoxProps, 'border'> {
  color?: string; // base color before opacity is applied
  opacity?: number; // 0..1
  blur?: number; // px
  rounded?: number; // border radius in px
  withBorder?: boolean; // show subtle border
}

// Frosted glass surface wrapper for use atop imagery/gradients.
// Applies backdrop blur and a translucent background color.
export const BaseFrosted = React.forwardRef<HTMLDivElement, BaseFrostedProps>(
  (
    {
      color = '#000',
      opacity = 0.8,
      blur = 12,
      rounded = 12,
      withBorder = true,
      sx,
      children,
      ...rest
    },
    ref
  ) => {
    const bg = alpha(color, Math.max(0, Math.min(opacity, 1)));
    return (
      <Box
        ref={ref}
        sx={{
          backgroundColor: bg,
          backdropFilter: `blur(${blur}px)`,
          WebkitBackdropFilter: `blur(${blur}px)`,
          borderRadius: `${rounded}px`,
          border: withBorder ? '1px solid rgba(255,255,255,0.2)' : 'none',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          ...sx,
        }}
        {...rest}
      >
        {children}
      </Box>
    );
  }
);

BaseFrosted.displayName = 'BaseFrosted';

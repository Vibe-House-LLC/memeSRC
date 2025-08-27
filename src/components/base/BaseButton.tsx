import React from 'react';
import MuiButton, { ButtonProps as MuiButtonProps } from '@mui/material/Button';
import { alpha } from '@mui/material/styles';

export type ButtonTone = 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'danger';

export interface BaseButtonProps extends Omit<MuiButtonProps, 'color'> {
  tone?: ButtonTone;
  frosted?: boolean;
  surface?: 'dark' | 'light';
  frostOpacity?: number; // 0..1
  rounded?: number; // px radius
  frostBlur?: number; // px blur strength
}

// A minimal, consistent button wrapper.
// Defaults: contained, medium, primary; accepts start/end icons and other MUI props.
export const BaseButton = React.forwardRef<HTMLButtonElement, BaseButtonProps>(
  (
    { tone = 'primary', variant = 'contained', size = 'medium', children, sx, frosted = false, surface = 'dark', frostOpacity = 0.9, rounded = 16, frostBlur = 5, ...rest },
    ref
  ) => {
    const color: MuiButtonProps['color'] =
      tone === 'danger' ? 'error' : tone === 'neutral' ? 'inherit' : (tone as MuiButtonProps['color']);

    // Align heights with MUI TextField defaults for better form-row alignment
    const heightBySize: Record<NonNullable<MuiButtonProps['size']>, number> = {
      small: 40, // TextField small ~40px
      medium: 56, // TextField medium ~56px
      large: 64, // approximate large control height
    } as const;
    const controlHeight = heightBySize[size ?? 'medium'] ?? 56;

    // Frosted styling when enabled
    const bgBase = surface === 'dark' ? '#000' : '#fff';
    const textColor = surface === 'dark' ? '#fff' : '#111';
    const borderColor = surface === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
    const hoverBg = alpha(bgBase, Math.max(0, Math.min(1, frostOpacity + 0.05)));
    const frostedSx = frosted
      ? {
          color: textColor,
          backgroundColor: alpha(bgBase, Math.max(0, Math.min(1, frostOpacity))),
          backdropFilter: `blur(${frostBlur}px)`,
          WebkitBackdropFilter: `blur(${frostBlur}px)`,
          border: `1px solid ${borderColor}`,
          borderRadius: rounded,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          '&:hover': { backgroundColor: hoverBg },
        }
      : undefined;

    return (
      <MuiButton
        ref={ref}
        variant={variant}
        size={size}
        color={color}
        sx={{ height: controlHeight, minHeight: controlHeight, py: 0, ...(frostedSx as object), ...sx }}
        {...rest}
      >
        {children}
      </MuiButton>
    );
  }
);

BaseButton.displayName = 'BaseButton';

import React from 'react';
import MuiButton, { ButtonProps as MuiButtonProps } from '@mui/material/Button';

export type ButtonTone = 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'danger';

export interface BaseButtonProps extends Omit<MuiButtonProps, 'color'> {
  tone?: ButtonTone;
}

// A minimal, consistent button wrapper.
// Defaults: contained, medium, primary; accepts start/end icons and other MUI props.
export const BaseButton = React.forwardRef<HTMLButtonElement, BaseButtonProps>(
  ({ tone = 'primary', variant = 'contained', size = 'medium', children, sx, ...rest }, ref) => {
    const color: MuiButtonProps['color'] =
      tone === 'danger' ? 'error' : tone === 'neutral' ? 'inherit' : (tone as MuiButtonProps['color']);

    // Align heights with MUI TextField defaults for better form-row alignment
    const heightBySize: Record<NonNullable<MuiButtonProps['size']>, number> = {
      small: 40, // TextField small ~40px
      medium: 56, // TextField medium ~56px
      large: 64, // approximate large control height
    } as const;
    const controlHeight = heightBySize[size ?? 'medium'] ?? 56;

    return (
      <MuiButton
        ref={ref}
        variant={variant}
        size={size}
        color={color}
        sx={{ height: controlHeight, minHeight: controlHeight, py: 0, ...sx }}
        {...rest}
      >
        {children}
      </MuiButton>
    );
  }
);

BaseButton.displayName = 'BaseButton';

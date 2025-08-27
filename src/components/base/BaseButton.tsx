import React from 'react';
import MuiButton, { ButtonProps as MuiButtonProps } from '@mui/material/Button';

export type ButtonTone = 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' | 'danger';

export interface BaseButtonProps extends Omit<MuiButtonProps, 'color'> {
  tone?: ButtonTone;
}

// A minimal, consistent button wrapper.
// Defaults: contained, medium, primary; accepts start/end icons and other MUI props.
export const BaseButton = React.forwardRef<HTMLButtonElement, BaseButtonProps>(
  ({ tone = 'primary', variant = 'contained', size = 'medium', children, ...rest }, ref) => {
    const color: MuiButtonProps['color'] =
      tone === 'danger' ? 'error' : tone === 'neutral' ? 'inherit' : (tone as MuiButtonProps['color']);

    return (
      <MuiButton ref={ref} variant={variant} size={size} color={color} {...rest}>
        {children}
      </MuiButton>
    );
  }
);

BaseButton.displayName = 'BaseButton';


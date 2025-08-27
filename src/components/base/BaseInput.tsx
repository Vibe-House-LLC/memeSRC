import React from 'react';
import TextField, { TextFieldProps } from '@mui/material/TextField';

export interface BaseInputProps extends Omit<TextFieldProps, 'variant' | 'size'> {
  size?: 'small' | 'medium';
  fullWidth?: boolean;
}

// Standard text input built on MUI TextField.
// Defaults: outlined, small, fullWidth.
export const BaseInput = React.forwardRef<HTMLInputElement, BaseInputProps>(
  ({ size = 'small', fullWidth = true, ...rest }, ref) => {
    return <TextField inputRef={ref} variant="outlined" size={size} fullWidth={fullWidth} {...rest} />;
  }
);

BaseInput.displayName = 'BaseInput';


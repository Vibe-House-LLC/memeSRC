import React from 'react';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { TextFieldProps } from '@mui/material/TextField';

export type BaseSelectOption = { label: string; value: string | number };

export interface BaseSelectProps
  extends Omit<TextFieldProps, 'select' | 'children' | 'variant' | 'size' | 'onChange' | 'value'> {
  options: BaseSelectOption[];
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  size?: 'small' | 'medium';
}

// Simple select built on TextField select for consistent label/assistive text.
export const BaseSelect = React.forwardRef<HTMLInputElement, BaseSelectProps>(
  ({ options, value, onChange, size = 'small', fullWidth = true, helperText, ...rest }, ref) => {
    return (
      <TextField
        inputRef={ref}
        select
        variant="outlined"
        size={size}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value as string)}
        fullWidth={fullWidth}
        helperText={helperText}
        {...rest}
      >
        {options.map((opt) => (
          <MenuItem key={String(opt.value)} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }
);

BaseSelect.displayName = 'BaseSelect';


import React from 'react';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { TextFieldProps } from '@mui/material/TextField';
import Box from '@mui/material/Box';

export type BaseSelectOption = { label: string; value: string | number; prefix?: React.ReactNode };

export interface BaseSelectProps
  extends Omit<TextFieldProps, 'select' | 'children' | 'variant' | 'size' | 'onChange' | 'value'> {
  options: BaseSelectOption[];
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  size?: 'small' | 'medium';
  renderValue?: (value: string | number, option?: BaseSelectOption) => React.ReactNode;
}

// Simple select built on TextField select for consistent label/assistive text.
export const BaseSelect = React.forwardRef<HTMLInputElement, BaseSelectProps>(
  (
    { options, value, onChange, size = 'small', fullWidth = true, helperText, renderValue, ...rest },
    ref
  ) => {
    const { SelectProps: selectProps, ...restProps } = rest as TextFieldProps;

    const renderSelected = (selected: unknown) => {
      const v = (selected as string | number) ?? '';
      const opt = options.find((o) => o.value === v);
      if (renderValue) return renderValue(v, opt);
      if (!opt) return '';
      return (
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
          {opt.prefix ? <Box component="span">{opt.prefix}</Box> : null}
          <Box component="span">{opt.label}</Box>
        </Box>
      );
    };

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
        SelectProps={{
          renderValue: renderSelected,
          ...(selectProps || {}),
        }}
        {...restProps}
      >
        {options.map((opt) => (
          <MenuItem key={String(opt.value)} value={opt.value}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              {opt.prefix ? <Box component="span">{opt.prefix}</Box> : null}
              <Box component="span">{opt.label}</Box>
            </Box>
          </MenuItem>
        ))}
      </TextField>
    );
  }
);

BaseSelect.displayName = 'BaseSelect';

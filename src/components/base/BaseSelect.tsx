import React from 'react';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { TextFieldProps } from '@mui/material/TextField';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

export type BaseSelectOption = { label: string; value: string | number; prefix?: React.ReactNode };

export interface BaseSelectProps
  extends Omit<TextFieldProps, 'select' | 'children' | 'variant' | 'size' | 'onChange' | 'value'> {
  options: BaseSelectOption[];
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  size?: 'small' | 'medium';
  renderValue?: (value: string | number, option?: BaseSelectOption) => React.ReactNode;
  frosted?: boolean;
  surface?: 'dark' | 'light';
  frostOpacity?: number; // 0..1
  rounded?: number; // px radius when frosted
  frostBlur?: number; // px blur strength
}

// Simple select built on TextField select for consistent label/assistive text.
export const BaseSelect = React.forwardRef<HTMLInputElement, BaseSelectProps>(
  (
    { options, value, onChange, size = 'small', fullWidth = true, helperText, renderValue, frosted = false, surface = 'dark', frostOpacity = 0.9, rounded = 16, frostBlur = 5, ...rest },
    ref
  ) => {
    const { SelectProps: selectProps, sx, ...restProps } = rest as TextFieldProps;

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

    const bgBase = surface === 'dark' ? '#000' : '#fff';
    const textColor = surface === 'dark' ? '#fff' : '#111';
    const borderColor = surface === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
    const hoverBorder = surface === 'dark' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
    const focusBorder = surface === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
    const frostedSx = frosted
      ? {
          '& .MuiOutlinedInput-root': {
            backgroundColor: alpha(bgBase, Math.max(0, Math.min(1, frostOpacity))),
            backdropFilter: `blur(${frostBlur}px)`,
            WebkitBackdropFilter: `blur(${frostBlur}px)`,
            borderRadius: rounded,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            '& fieldset': { border: `1px solid ${borderColor}` },
            '&:hover fieldset': { borderColor: hoverBorder },
            '&.Mui-focused fieldset': { borderColor: focusBorder },
          },
          '& .MuiInputLabel-root': {
            color: surface === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)',
            '&.Mui-focused': { color: textColor },
          },
          '& .MuiInputBase-input': { color: textColor },
          '& .MuiSvgIcon-root': { color: textColor },
        }
      : undefined;

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
        sx={{ ...(frostedSx as object), ...(sx as object) }}
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

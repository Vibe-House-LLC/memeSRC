import React from 'react';
import TextField, { TextFieldProps } from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

export interface BaseInputProps extends Omit<TextFieldProps, 'variant' | 'size'> {
  size?: 'small' | 'medium';
  fullWidth?: boolean;
  frosted?: boolean;
  surface?: 'dark' | 'light';
  frostOpacity?: number; // 0..1
  rounded?: number; // px radius when frosted
  leadingIcon?: React.ReactNode; // dimmed icon/emoji before text
  allowClear?: boolean; // show clear button at end
  onClear?: () => void; // handler for clear
  frostBlur?: number; // px blur strength
}

// Standard text input built on MUI TextField.
// Defaults: outlined, small, fullWidth.
export const BaseInput = React.forwardRef<HTMLInputElement, BaseInputProps>(
  (
    {
      size = 'small',
      fullWidth = true,
      frosted = false,
      surface = 'dark',
      frostOpacity = 0.9,
      rounded = 16,
      leadingIcon,
      allowClear = false,
      onClear,
      frostBlur = 5,
      ...rest
    },
    ref
  ) => {
    const { sx, InputProps: inputPropsOriginal, ...other } = rest as TextFieldProps;

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
          '& .MuiInputBase-input': { color: textColor },
          '& .MuiInputLabel-root': {
            color: surface === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.7)',
            '&.Mui-focused': { color: textColor },
          },
          '& .MuiSvgIcon-root': { color: textColor },
          '& .MuiInputAdornment-root': { color: textColor, opacity: 0.75 },
        }
      : undefined;

    // Compose adornments
    const existingStart = inputPropsOriginal?.startAdornment ?? null;
    const existingEnd = inputPropsOriginal?.endAdornment ?? null;
    const adornmentColor = surface === 'dark' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.6)';
    const startAdornment = leadingIcon ? (
      <InputAdornment position="start" sx={{ color: adornmentColor }}>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', fontSize: '1.1em' }}>{leadingIcon}</Box>
      </InputAdornment>
    ) : (
      existingStart as React.ReactNode
    );
    const showClear = Boolean(allowClear && (other as any).value && String((other as any).value).length > 0);
    const clearButton = showClear ? (
      <IconButton
        size="small"
        aria-label="Clear"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClear?.();
        }}
        sx={{ color: adornmentColor }}
      >
        <CloseRoundedIcon fontSize="small" />
      </IconButton>
    ) : null;
    const endAdornment = (
      <InputAdornment position="end">
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          {existingEnd}
          {clearButton}
        </Box>
      </InputAdornment>
    );

    return (
      <TextField
        inputRef={ref}
        variant="outlined"
        size={size}
        fullWidth={fullWidth}
        sx={{ ...(frostedSx as object), ...(sx as object) }}
        InputProps={{
          ...inputPropsOriginal,
          startAdornment,
          endAdornment,
        }}
        {...other}
      />
    );
  }
);

BaseInput.displayName = 'BaseInput';

import React from 'react';
import Switch, { SwitchProps } from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

export interface BaseSwitchProps extends Omit<SwitchProps, 'onChange' | 'checked'> {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const BaseSwitch = React.forwardRef<HTMLButtonElement, BaseSwitchProps>(
  ({ label, checked, onChange, ...rest }, ref) => {
    const control = (
      <Switch
        inputRef={ref as any}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        {...rest}
      />
    );
    return label ? <FormControlLabel control={control} label={label} /> : control;
  }
);

BaseSwitch.displayName = 'BaseSwitch';


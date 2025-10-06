// @mui
import { GlobalStyles as MUIGlobalStyles } from '@mui/material';

// ----------------------------------------------------------------------

export default function GlobalStyles() {
  const inputGlobalStyles = (
    <MUIGlobalStyles
      styles={{
        '*': {
          boxSizing: 'border-box',
        },
        html: {
          margin: 0,
          padding: 0,
          width: '100%',
          minHeight: '100%',
          WebkitOverflowScrolling: 'touch',
        },
        body: {
          margin: 0,
          padding: 0,
          width: '100%',
          minHeight: '100%',
          backgroundColor: '#000000',
        },
        '#root': {
          width: '100%',
          minHeight: '100%',
        },
        input: {
          '&[type=number]': {
            MozAppearance: 'textfield',
            '&::-webkit-outer-spin-button': {
              margin: 0,
              WebkitAppearance: 'none',
            },
            '&::-webkit-inner-spin-button': {
              margin: 0,
              WebkitAppearance: 'none',
            },
          },
        },
        img: {
          display: 'block',
          maxWidth: '100%',
        },
        ul: {
          margin: 0,
          padding: 0,
        },
        '@keyframes pulse': {
          '0%, 100%': {
            opacity: 0.4,
          },
          '50%': {
            opacity: 0.8,
          },
        },
      }}
    />
  );

  return inputGlobalStyles;
}

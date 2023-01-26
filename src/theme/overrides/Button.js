import { alpha } from '@mui/material/styles';

// ----------------------------------------------------------------------

export default function Button(theme) {
  return {
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: theme.palette.grey[700],
          '&:hover': {
            boxShadow: 'none',
            backgroundColor: theme.palette.grey[600],
          },
        },
        sizeLarge: {
          height: 55,
          paddingLeft: 25,
          paddingRight: 25,
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
          fontSize: '1.3em',
          borderRadius: '8px', 
          fontWeight: '900',
        },
        containedInherit: {
          color: theme.palette.grey[800],
          boxShadow: theme.customShadows.card,
          '&:hover': {
            backgroundColor: theme.palette.grey[400],
          },
        },
        containedPrimary: {
          boxShadow: theme.customShadows.card,
        },
        containedSecondary: {
          backgroundColor: theme.palette.primary.main,
          boxShadow: theme.customShadows.secondary,
          '&:hover': {
            backgroundColor: theme.palette.primary.dark,
          },
        },
        outlinedInherit: {
          border: `1px solid ${alpha(theme.palette.grey[500], 0.32)}`,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        },
        textInherit: {
          backgroundColor: 'rgb(0, 0, 0, 0)',
          '&:hover': {
            backgroundColor: 'none',
          },
        },
      },
    },
  };
}

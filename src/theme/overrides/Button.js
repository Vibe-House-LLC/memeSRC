import { alpha } from '@mui/material/styles';

// ----------------------------------------------------------------------

export default function Button(theme) {
  return {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
        },
        sizeLarge: {
          height: 48,
          paddingLeft: 24,
          paddingRight: 24,
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
          fontSize: '1rem',
        },
        containedPrimary: {
          color: theme.palette.primary.contrastText,
          backgroundColor: theme.palette.primary.main,
          '&:hover': {
            backgroundColor: theme.palette.primary.dark,
            boxShadow: 'none',
          },
        },
        containedSecondary: {
          color: theme.palette.secondary.contrastText,
          backgroundColor: theme.palette.secondary.main,
          '&:hover': {
            backgroundColor: theme.palette.secondary.dark,
            boxShadow: 'none',
          },
        },
        containedError: {
          backgroundColor: theme.palette.error.dark,
          '&:hover': {
            backgroundColor: theme.palette.error.main,
            boxShadow: 'none',
          },
        },
        outlinedInherit: {
          border: `1px solid ${alpha(theme.palette.grey[500], 0.32)}`,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        },
      },
    },
  };
}

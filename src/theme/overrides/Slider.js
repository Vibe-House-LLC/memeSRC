import { alpha } from '@mui/material/styles';

// ----------------------------------------------------------------------

export default function Slider(theme) {

  // TODO: Fix thumb shadow color on dragging: https://mui.com/material-ui/api/slider/#css
  return {
    MuiSlider: {
      styleOverrides: {
        root: {
          color: theme.palette.grey[700],
          outlineColor: theme.palette.grey[700],
        },
        thumb: {
          '&:hover': {
            boxShadow: `0px 0px 0px 8px ${alpha(theme.palette.grey[700], 0.32)}`
          },
        },
      },
    },
  };
}

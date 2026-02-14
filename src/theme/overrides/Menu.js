import { alpha } from '@mui/material/styles';

export default function Menu(theme) {
  const isDarkMode = theme.palette.mode === 'dark';
  const menuBackground = isDarkMode
    ? `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(
        theme.palette.background.default,
        0.94
      )} 100%)`
    : alpha(theme.palette.background.paper, 0.98);

  return {
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: theme.shape.borderRadius * 2,
          border: `1px solid ${alpha(theme.palette.divider, 0.88)}`,
          background: menuBackground,
          boxShadow: isDarkMode
            ? `0 16px 34px ${alpha(theme.palette.common.black, 0.5)}`
            : `0 16px 34px ${alpha(theme.palette.common.black, 0.18)}`,
          backdropFilter: 'blur(12px)',
          minWidth: 200,
          overflow: 'hidden',
        },
        list: {
          paddingTop: theme.spacing(0.7),
          paddingBottom: theme.spacing(0.7),
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          margin: theme.spacing(0.25, 0.6),
          borderRadius: theme.shape.borderRadius + 6,
          minHeight: 36,
          paddingTop: theme.spacing(0.85),
          paddingBottom: theme.spacing(0.85),
          paddingLeft: theme.spacing(1.2),
          paddingRight: theme.spacing(1.2),
          gap: theme.spacing(1),
          fontWeight: 600,
          fontSize: '0.88rem',
          lineHeight: 1.2,
          transition: theme.transitions.create(['background-color', 'color'], {
            duration: theme.transitions.duration.shorter,
          }),
          '& .MuiListItemIcon-root': {
            minWidth: 30,
            color: alpha(theme.palette.text.primary, 0.76),
          },
          '& .MuiListItemText-primary': {
            fontWeight: 600,
            fontSize: '0.88rem',
            lineHeight: 1.2,
          },
          '& .MuiListItemText-secondary': {
            fontSize: '0.74rem',
            lineHeight: 1.25,
            color: alpha(theme.palette.text.secondary, 0.95),
          },
          '&:hover': {
            backgroundColor: alpha(theme.palette.action.active, isDarkMode ? 0.28 : 0.08),
          },
          '&.Mui-disabled': {
            opacity: 0.45,
          },
        },
      },
    },
  };
}

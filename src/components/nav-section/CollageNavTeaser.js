import { NavLink, useLocation } from 'react-router-dom';
import { Box, ListItemText } from '@mui/material';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { StyledNavItem, StyledNavItemIcon } from './styles';

export default function CollageNavTeaser() {
  const { pathname } = useLocation();
  const isActive = pathname === '/collage' || pathname.startsWith('/projects');
  return (
    <StyledNavItem
      className={isActive ? 'active' : undefined}
      component={NavLink}
      to="/collage"
      sx={{
        '&.active': {
          color: 'text.primary',
          bgcolor: 'action.selected',
          fontWeight: 'fontWeightBold',
        },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'none',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <StyledNavItemIcon>
          <PhotoLibraryIcon />
        </StyledNavItemIcon>
        <ListItemText sx={{ fontSize: 16 }} disableTypography primary="collage" />
      </Box>
    </StyledNavItem>
  );
}

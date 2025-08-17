import { Link } from 'react-router-dom';
import { Box, ListItemText } from '@mui/material';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { StyledNavItem, StyledNavItemIcon } from './styles';

export default function CollageNavTeaser() {
  return (
    <StyledNavItem
      component={Link}
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
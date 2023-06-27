import PropTypes from 'prop-types';
import { NavLink as RouterLink } from 'react-router-dom';
// @mui
import { Box, List, ListItemText } from '@mui/material';
//
import { useContext, useEffect } from 'react';
import { StyledNavItem, StyledNavItemIcon } from './styles';
import { UserContext } from '../../UserContext';

// ----------------------------------------------------------------------

NavSection.propTypes = {
  data: PropTypes.array,
};

export default function NavSection({ data = [], ...other }) {
  const { user } = useContext(UserContext)
  useEffect(() => {
    console.log(user)
  }, [user])
  return (
    <>
      {
        !user?.['cognito:groups']?.includes('admins') && <Box {...other}>
          <List disablePadding sx={{ p: 1 }}>
            {data.filter(item => item.adminOnly === false).map((item) => (
              <NavItem key={item.title} item={item} />
            ))}
          </List>
        </Box>
      }
      {
        user && user['cognito:groups']?.includes('admins') && <Box {...other}>
          <List disablePadding sx={{ p: 1 }}>
            {data.map((item) => (
              <NavItem key={item.title} item={item} />
            ))}
          </List>
        </Box>
      }
    </>
  );
}

// ----------------------------------------------------------------------

NavItem.propTypes = {
  item: PropTypes.object,
};

function NavItem({ item }) {
  const { title, path, icon, info } = item;

  return (
    <StyledNavItem
      component={RouterLink}
      to={path}
      sx={{
        '&.active': {
          color: 'text.primary',
          bgcolor: 'action.selected',
          fontWeight: 'fontWeightBold',
        },
      }}
    >
      <StyledNavItemIcon>{icon && icon}</StyledNavItemIcon>

      <ListItemText disableTypography primary={title} />

      {info && info}
    </StyledNavItem>
  );
}

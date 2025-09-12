import PropTypes from 'prop-types';
import { NavLink as RouterLink, useLocation } from 'react-router-dom';
// @mui
import { Box, List, ListItemText, Typography, Chip } from '@mui/material';
//
import { Fragment, useContext } from 'react';
import { StyledNavItem, StyledNavItemIcon } from './styles';
import { UserContext } from '../../UserContext';
import CollageNavTeaser from './CollageNavTeaser';

// ----------------------------------------------------------------------

NavSection.propTypes = {
  data: PropTypes.array,
};

export default function NavSection({ data = [], ...other }) {
  const { user } = useContext(UserContext);

  return (
    <>
      {!user?.['cognito:groups']?.includes('admins') && (
        <Box {...other}>
          <List disablePadding sx={{ p: 1 }}>
            {data
              .filter((section) => section.adminOnly === false)
              // Hide the Personal section entirely when logged out
              .filter((section) => (user ? true : section.sectionTitle !== 'Personal'))
              .map((section, index) => (
              <Fragment key={section.sectionTitle}>
                <Typography variant='subtitle2' color='gray' fontWeight={700} pl={2} mb={2} mt={index > 0 ? 4 : 0}>
                  {section.sectionTitle}
                </Typography>
                {section.items.map(item => (
                  <NavItem key={item.title} item={item} />
                ))}
              </Fragment>
            ))}
          </List>
        </Box>
      )}
      {user && user['cognito:groups']?.includes('admins') && (
        <Box {...other}>
          <List disablePadding sx={{ p: 1 }}>
            {data.map((section, index) => (
              <Fragment key={section.sectionTitle}>
                <Typography variant='subtitle2' color='gray' fontWeight={700} pl={2} mb={2} mt={index > 0 ? 4 : 0}>
                  {section.sectionTitle}
                </Typography>
                {section.items.map(item => (
                  <NavItem key={item.title} item={item} />
                ))}
              </Fragment>
            ))}
          </List>
        </Box>
      )}
    </>
  );
}

// ----------------------------------------------------------------------

NavItem.propTypes = {
  item: PropTypes.object,
};

function NavItem({ item }) {
  const { title, path, icon, info, chipText, chipColor, externalLink } = item;
  const location = useLocation();
  const pathname = location?.pathname || '';

  const isActiveCustom = (() => {
    if (title === 'search') return pathname === '/' || pathname.startsWith('/search');
    if (title === 'collage') return pathname === '/collage' || pathname.startsWith('/projects');
    if (title === 'Favorites') return pathname.startsWith('/favorites');
    if (title === 'Library') return pathname.startsWith('/library');
    return false;
  })();

  // Use special teaser for collage tool
  if (title === 'collage') {
    return <CollageNavTeaser />;
  }

  return (
    <>
      {!externalLink && (
        <StyledNavItem
          className={isActiveCustom ? 'active' : undefined}
          component={RouterLink}
          to={path}
          sx={{
            '&.active': {
              color: 'text.primary',
              bgcolor: 'action.selected',
              fontWeight: 'fontWeightBold',
            },
            display: 'flex',
            alignItems: 'center',
            justifyContent: chipText ? 'none' : 'space-between',  // Ensure even spacing
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <StyledNavItemIcon>{icon && icon}</StyledNavItemIcon>
            <ListItemText sx={{ fontSize: 16 }} disableTypography primary={title} />
          </Box>
          {chipText && (
            <Chip
              label={chipText}
              color={chipColor}
              size="small"
              sx={{
                fontWeight: 'bold',
                mx: '10px'
              }}
            />
          )}
          {info && info}
        </StyledNavItem>
      )}
      {externalLink && (
        <StyledNavItem
          onClick={() => {
            window.open(path, '_blank');
          }}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            '&.active': {
              color: 'text.primary',
              bgcolor: 'action.selected',
              fontWeight: 'fontWeightBold',
            },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',  // Ensure even spacing
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <StyledNavItemIcon>{icon && icon}</StyledNavItemIcon>
            <ListItemText sx={{ fontSize: 16 }} disableTypography primary={title} />
          </Box>
          {chipText && (
            <Chip
              label={chipText}
              color={chipColor}
              size="small"
              sx={{
                fontWeight: 'bold',
                mx: '10px'
              }}
            />
          )}
          {info && info}
        </StyledNavItem>
      )}
    </>
  );
}

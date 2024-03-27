import PropTypes from 'prop-types';
import { Link, NavLink as RouterLink } from 'react-router-dom';
// @mui
import { Box, List, ListItemText, Typography } from '@mui/material';
//
import { Fragment, useContext, useEffect } from 'react';
import { StyledNavItem, StyledNavItemIcon } from './styles';
import { UserContext } from '../../UserContext';

// ----------------------------------------------------------------------

NavSection.propTypes = {
  data: PropTypes.array,
};

export default function NavSection({ data = [], ...other }) {
  const { user } = useContext(UserContext)
  // useEffect(() => {
  //   console.log(user)
  // }, [user])
  return (
    <>
      {
        !user?.['cognito:groups']?.includes('admins') && <Box {...other}>
          <List disablePadding sx={{ p: 1 }}>
            {data.filter(item => item.adminOnly === false).map((section, index) => (
              <Fragment key={section.sectionTitle}>
                <Typography variant='subtitle2' color='gray' fontWeight={700} pl={2} mb={1} mt={index > 0 ? 4 : 0}>
                  {section.sectionTitle}
                </Typography>
                {
                  section.items.map(item =>
                    <NavItem externalLink={item.externalLink} key={item.title} item={item} />
                  )
                }
              </Fragment>
            ))}
          </List>
        </Box>
      }
      {
        user && user['cognito:groups']?.includes('admins') && <Box {...other}>
          <List disablePadding sx={{ p: 1 }}>
            {data.map((section, index) => (
              <Fragment key={section.sectionTitle}>
                <Typography variant='subtitle2' color='gray' fontWeight={700} pl={2} mb={1} mt={index > 0 ? 4 : 0}>
                  {section.sectionTitle}
                </Typography>
                {
                  section.items.map(item =>
                    <NavItem externalLink={item.externalLink} key={item.title} item={item} />
                  )
                }
              </Fragment>
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
    <>
      {item.externalLink === false &&
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

          <ListItemText sx={{fontSize:18}} disableTypography primary={title} />

          {info && info}
        </StyledNavItem>
      }
      {item.externalLink === true &&
        <StyledNavItem
          onClick={() => {window.open(path, '_blank');}}
          target='_blank'
          rel="noopener noreferrer"
          sx={{
            '&.active': {
              color: 'text.primary',
              bgcolor: 'action.selected',
              fontWeight: 'fontWeightBold',
            },
          }}
        >
          <StyledNavItemIcon>{icon && icon}</StyledNavItemIcon>

          <ListItemText sx={{fontSize:18}} disableTypography primary={title} />

          {info && info}
        </StyledNavItem>
      }
    </>
  );
}

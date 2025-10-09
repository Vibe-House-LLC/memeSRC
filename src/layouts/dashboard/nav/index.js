import PropTypes from 'prop-types';
import { useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// @mui
import { alpha } from '@mui/material/styles';
import { 
  Box, 
  Link, 
  Typography,
  Stack, 
  Chip, 
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  ListSubheader
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
//
import navConfig from './config';

import { UserContext } from '../../../UserContext';
import { formatReleaseDisplay } from '../../../utils/githubReleases';

const NAV_WIDTH = 320;

Nav.propTypes = {
  anchorEl: PropTypes.object,
  onClose: PropTypes.func,
};

export default function Nav({ anchorEl, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const handleNavigate = (path, externalLink) => {
    if (externalLink) {
      window.open(path, '_blank');
      onClose();
    } else {
      // Close menu first, then navigate with a small delay to ensure clean state
      onClose();
      setTimeout(() => {
        navigate(path);
      }, 0);
    }
  };

  // Check if user is admin - cognito:groups is directly on user object
  const isAdmin = user?.['cognito:groups']?.includes('admins') || false;

  // Filter sections based on admin status
  const visibleSections = navConfig.filter(section => 
    !section.adminOnly || (section.adminOnly && isAdmin)
  );

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      // Force Menu to close cleanly and fully unmount when closed
      disablePortal={false}
      keepMounted={false}
      transitionDuration={200}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      PaperProps={{
        sx: (theme) => ({
          width: NAV_WIDTH,
          maxHeight: 'calc(100vh - 96px)',
          bgcolor: '#0a0a0a',
          backgroundImage: 'none',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          border: 'none',
          borderRadius: 3,
          mt: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }),
      }}
      MenuListProps={{
        sx: { 
          py: 0,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
        },
      }}
      // Use location pathname as key to force clean re-render on navigation
      key={location.pathname}
    >
      {/* Auth Actions for non-logged-in users */}
      {!user && (
        <Box sx={{ px: 3, py: 2, bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
          <Stack spacing={1}>
            <Link href='/signup' underline='none'>
              <Box sx={{
                py: 1.5,
                px: 2,
                bgcolor: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: 2,
                textAlign: 'center',
                transition: 'all 0.2s',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'rgba(139, 92, 246, 0.25)',
                  borderColor: 'rgba(139, 92, 246, 0.5)',
                },
              }}>
                <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600 }}>
                  Create Account
                </Typography>
              </Box>
            </Link>
            <Link href='/login' underline='none'>
              <Box sx={{
                py: 1.5,
                px: 2,
                bgcolor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                textAlign: 'center',
                transition: 'all 0.2s',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.06)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                },
              }}>
                <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 600 }}>
                  Sign In
                </Typography>
              </Box>
            </Link>
          </Stack>
        </Box>
      )}

      {/* Navigation Sections */}
      <Box sx={{ 
        flex: 1,
        overflowY: 'auto',
        pt: 0,
        pb: 1.5,
        px: 2,
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          bgcolor: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '10px',
          '&:hover': {
            bgcolor: 'rgba(255, 255, 255, 0.15)',
          },
        },
      }}>
        {visibleSections.map((section, sectionIndex) => (
          <Box key={section.sectionTitle} sx={{ mb: sectionIndex < visibleSections.length - 1 ? 2.5 : 0 }}>
            <ListSubheader
              sx={{
                bgcolor: '#0a0a0a',
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                pt: 1.5,
                pb: 1,
                px: 1.5,
                mb: 0.5,
                lineHeight: 1.3,
                position: 'sticky',
                top: 0,
                zIndex: 1,
              }}
            >
              {section.sectionTitle}
            </ListSubheader>
            {section.items.map((item) => {
              // Custom active state logic for certain routes
              const isActive = (() => {
                const pathname = location.pathname;
                if (item.title === 'search') return pathname === '/' || pathname.startsWith('/search');
                if (item.title === 'collage') return pathname === '/collage' || pathname.startsWith('/projects');
                if (item.title === 'Favorites') return pathname.startsWith('/favorites');
                if (item.title === 'Library') return pathname.startsWith('/library');
                return pathname === item.path;
              })();
              return (
                <MenuItem
                  key={item.title}
                  onClick={() => handleNavigate(item.path, item.externalLink)}
                  selected={isActive}
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    mx: 0,
                    my: 0.5,
                    borderRadius: 2,
                    minHeight: '44px',
                    bgcolor: isActive
                      ? 'rgba(139, 92, 246, 0.12)'
                      : 'transparent',
                    border: 'none',
                    color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                    fontWeight: isActive ? 600 : 500,
                    transition: 'background-color 0s, color 0s',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': isActive ? {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '3px',
                      height: '60%',
                      bgcolor: '#8b5cf6',
                      borderRadius: '0 2px 2px 0',
                    } : {},
                    '&:hover': {
                      bgcolor: isActive
                        ? 'rgba(139, 92, 246, 0.18)'
                        : 'rgba(255, 255, 255, 0.04)',
                      color: '#fff',
                    },
                    '&.Mui-selected': {
                      bgcolor: 'rgba(139, 92, 246, 0.12)',
                      '&:hover': {
                        bgcolor: 'rgba(139, 92, 246, 0.18)',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: 'inherit',
                      opacity: isActive ? 1 : 0.7,
                      transition: 'none',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    primaryTypographyProps={{
                      sx: {
                        textTransform: 'capitalize',
                        fontSize: '0.875rem',
                        fontWeight: 'inherit',
                        lineHeight: 1.2,
                        color: 'inherit',
                      },
                    }}
                  />
                  {item.externalLink && (
                    <OpenInNew 
                      fontSize="small" 
                      sx={{ 
                        ml: 0.5, 
                        opacity: 0.4, 
                        fontSize: '0.875rem',
                        transition: 'none',
                      }} 
                    />
                  )}
                  {item.chipText && (
                    <Chip
                      label={item.chipText}
                      size="small"
                      sx={{
                        ml: 1,
                        height: 20,
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        bgcolor: 'rgba(139, 92, 246, 0.15)',
                        color: '#a78bfa',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        '& .MuiChip-label': {
                          px: 1,
                        },
                      }}
                    />
                  )}
                </MenuItem>
              );
            })}
          </Box>
        ))}
      </Box>

      {/* Version at bottom */}
      <Box sx={{ 
        px: 3, 
        py: 2, 
        bgcolor: 'rgba(255, 255, 255, 0.02)',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <Chip
          label={process.env.REACT_APP_USER_BRANCH === 'beta' 
            ? formatReleaseDisplay(`v${process.env.REACT_APP_VERSION}`)
            : `${formatReleaseDisplay(`v${process.env.REACT_APP_VERSION}`)}-${process.env.REACT_APP_USER_BRANCH}`}
          size="small"
          clickable
          aria-label="View releases and version notes"
          onClick={() => handleNavigate('/releases', false)}
          sx={{
            height: 22,
            px: 1.25,
            borderRadius: 1.5,
            fontWeight: 600,
            fontSize: '0.7rem',
            letterSpacing: 0.5,
            bgcolor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'rgba(255, 255, 255, 0.7)',
            '& .MuiChip-label': {
              px: 0,
            },
            '&:hover': {
              bgcolor: 'rgba(255, 255, 255, 0.08)',
              borderColor: 'rgba(255, 255, 255, 0.2)',
            },
          }}
        />
      </Box>
    </Menu>
  );

}

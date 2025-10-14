import { useState, useContext, useEffect } from 'react';
// @mui
import { alpha } from '@mui/material/styles';
import { Box, Divider, Typography, Stack, MenuItem, Avatar, IconButton, Popover, Switch, CircularProgress } from '@mui/material';
import { AutoFixHigh, Person } from '@mui/icons-material';
// mocks_
import { useNavigate, useLocation } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import { UserContext } from '../../../UserContext';
import { getShowsWithFavorites } from '../../../utils/fetchShowsRevised';
import { safeRemoveItem, writeJSON } from '../../../utils/storage';

// ----------------------------------------------------------------------


// ----------------------------------------------------------------------

export default function AccountPopover() {
  const userDetails = useContext(UserContext);


  const [open, setOpen] = useState(null);


  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setOpen(null);
  }, [location.pathname]);

  const handleOpen = (event) => {
    setOpen(event.currentTarget);
  };

  const handleClose = () => {
    setOpen(null);
  };

  const userGroups = userDetails?.user?.['cognito:groups'];
  const isAdmin = Array.isArray(userGroups) && userGroups.includes('admins');
  const isFeedVisible = userDetails?.showFeed !== false;
  const isPro = userDetails?.user?.userDetails?.magicSubscription === 'true';
  const username = userDetails?.user?.userDetails?.username || userDetails?.user?.userDetails?.email || userDetails?.user?.username || 'U';
  const avatarLetter = username.charAt(0).toUpperCase();
  const isLoadingProfile = Boolean(userDetails?.isUserLoading);

  const handleShowFeedToggle = (event, checked) => {
    event.stopPropagation();
    if (typeof userDetails?.setShowFeed === 'function') {
      userDetails.setShowFeed(checked);
    }
  };

  const showFeedToggle = !isAdmin ? null : (
    <>
      <Divider sx={{ borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.08)', my: 0 }} />
      <MenuItem disableRipple sx={{ cursor: 'default', '&:hover': { bgcolor: 'transparent !important' } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
          <Typography variant="body2" sx={{ fontWeight: 500, color: 'rgba(255, 255, 255, 0.7)' }}>
            Show feed
          </Typography>
          <Switch
            edge="end"
            size="small"
            checked={isFeedVisible}
            onChange={handleShowFeedToggle}
            inputProps={{ 'aria-label': 'toggle feed visibility' }}
          />
        </Stack>
      </MenuItem>
    </>
  );


  const logout = () => {
    Auth.signOut().then(() => {
      userDetails?.setUser(null);
      safeRemoveItem('memeSRCUserDetails')
      console.log('USER GONE')
      userDetails?.setDefaultShow('_universal')
      getShowsWithFavorites().then(loadedShows => {
        writeJSON('memeSRCShows', loadedShows)
        userDetails?.setShows(loadedShows)
      })
    }).catch((err) => {
      alert(err)
    }).finally(() => {
      navigate('/login')
    })
  }


  const loadingSpinner = (
    <CircularProgress
      size={18}
      thickness={5}
      sx={{
        color: 'rgba(255, 255, 255, 0.88)',
      }}
    />
  );

  const accountButton = userDetails?.user ? (
    <IconButton
      onClick={handleOpen}
      aria-label="account options"
      sx={{
        p: 0.5,
        width: 44,
        height: 44,
        ...(open && {
          '&:before': {
            zIndex: 1,
            content: "''",
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            position: 'absolute',
            bgcolor: (theme) => alpha(theme.palette.grey[900], 0.8),
          },
        }),
      }}
    >
      <Avatar
        {...(userDetails?.user?.profilePhoto && { src: userDetails?.user?.profilePhoto })}
        alt={username}
        sx={{
          width: 36,
          height: 36,
          bgcolor: 'primary.main',
          fontSize: '1rem',
          fontWeight: 600,
          border: (theme) => (isPro
            ? `2px solid ${theme.palette.primary.main}`
            : `2px solid ${alpha(theme.palette.common.white, 0.2)}`),
        }}
      >
        {isLoadingProfile ? loadingSpinner : avatarLetter}
      </Avatar>
    </IconButton>
  ) : (
    <IconButton
      onClick={handleOpen}
      aria-label="account options"
      sx={{
        p: 0.5,
        width: 44,
        height: 44,
        ...(open && {
          '&:before': {
            zIndex: 1,
            content: "''",
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            position: 'absolute',
            bgcolor: (theme) => alpha(theme.palette.grey[900], 0.8),
          },
        }),
      }}
    >
      <Avatar
        alt="Guest"
        sx={{
          width: 36,
          height: 36,
          bgcolor: 'grey.600',
          fontSize: '1rem',
          fontWeight: 600,
          border: (theme) => `2px solid ${alpha(theme.palette.common.white, 0.2)}`,
        }}
      >
        {isLoadingProfile ? loadingSpinner : null}
      </Avatar>
    </IconButton>
  );

  return (
    <>
      {accountButton}

      {open &&
        <Popover
          open={Boolean(open)}
          anchorEl={open}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            sx: (theme) => ({
              p: 0,
              mt: 1.5,
              ml: 0.75,
              width: 240,
              bgcolor: '#0a0a0a',
              backgroundImage: 'none',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9)',
              border: '1px solid',
              borderColor: alpha(theme.palette.common.white, 0.26),
              borderRadius: 3,
              '& .MuiMenuItem-root': {
                typography: 'body2',
                borderRadius: 2,
                py: 1.25,
                px: 2,
                mx: 1,
                my: 0.5,
                color: 'rgba(255, 255, 255, 0.7)',
                transition: 'background-color 0.2s, color 0.2s',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.04)',
                  color: '#fff',
                },
              },
            }),
          }}
        >
          {userDetails?.user ?
            <>
              <Box sx={{ py: 2, px: 3, bgcolor: 'rgba(255, 255, 255, 0.02)' }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontWeight: 600,
                    color: '#fff',
                  }}
                  noWrap
                >
                  <Person sx={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.7)' }} />
                  {userDetails?.user?.username}
                </Typography>
              </Box>

              <Divider sx={{ borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.08)', my: 0 }} />

              <MenuItem disableRipple sx={{ cursor: 'default', '&:hover': { bgcolor: 'transparent !important' } }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontWeight: 700,
                    width: '100%',
                  }}
                >
                  <AutoFixHigh sx={{ fontSize: 20 }} />
                  <span style={{ fontSize: '1.1em' }}>{userDetails?.user?.userDetails?.credits || 0}</span> credits
                </Typography>
              </MenuItem>

              {userDetails?.user && (
                <>
                  <Divider sx={{ borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.08)', my: 0 }} />
                  <MenuItem onClick={() => { handleClose(); navigate('/account'); }}>
                    Manage Account
                  </MenuItem>
                  {isAdmin && showFeedToggle}
                </>
              )}

              <Divider sx={{ borderStyle: 'dashed', borderColor: 'rgba(255, 255, 255, 0.08)', my: 0 }} />
              <MenuItem onClick={logout}>
                Logout
              </MenuItem>
            </>
            :
            <>
              <Stack sx={{ py: 1.5, px: 0.5 }}>
                <MenuItem onClick={() => navigate('/login')}>
                  Log In
                </MenuItem>
                <MenuItem onClick={() => navigate('/signup')}>
                  Create Account
                </MenuItem>
              </Stack>
              {isAdmin && showFeedToggle}
            </>
          }
        </Popover>
      }
    </>
  );
}

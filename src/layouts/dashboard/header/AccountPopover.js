import { useState, useContext } from 'react';
// @mui
import { alpha } from '@mui/material/styles';
import { Box, Divider, Typography, Stack, MenuItem, Avatar, IconButton, Popover, Switch } from '@mui/material';
import { AutoFixHigh, Person } from '@mui/icons-material';
// mocks_
import { useNavigate } from 'react-router-dom';
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

  const handleOpen = (event) => {
    setOpen(event.currentTarget);
  };

  const handleClose = () => {
    setOpen(null);
  };

  const userGroups = userDetails?.user?.['cognito:groups'];
  const isAdmin = Array.isArray(userGroups) && userGroups.includes('admins');
  const isFeedVisible = userDetails?.showFeed !== false;

  const handleShowFeedToggle = (event, checked) => {
    event.stopPropagation();
    if (typeof userDetails?.setShowFeed === 'function') {
      userDetails.setShowFeed(checked);
    }
  };

  const showFeedToggle = !isAdmin ? null : (
    <>
      <Divider sx={{ borderStyle: 'dashed', my: 0.5 }} />
      <MenuItem disableRipple sx={{ cursor: 'default' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
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


  return (
    <>
      {userDetails?.user &&
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
            src={userDetails?.user?.profilePhoto || '/assets/images/avatars/avatar_default.jpg'}
            alt="photoURL"
            sx={{ 
              width: 36, 
              height: 36 
            }} 
          />
        </IconButton>
      }

      {!(userDetails?.user) &&
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
          <Avatar alt="photoURL" sx={{ width: 35, height: 35 }} />
        </IconButton>
      }

      <Popover
        open={Boolean(open)}
        anchorEl={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            p: 0,
            mt: 1.5,
            ml: 0.75,
            width: 220,
            '& .MuiMenuItem-root': {
              typography: 'body2',
              borderRadius: 0.75,
              py: 1,
              px: 2,
            },
          },
        }}
      >
        {userDetails?.user ?
          <>
            <Box sx={{ py: 2, px: 2.5 }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontWeight: 'medium'
                }} 
                noWrap
              >
                <Person sx={{ fontSize: 20 }} />
                {userDetails?.user?.username}
              </Typography>
            </Box>

            <Divider sx={{ borderStyle: 'dashed', my: 0.5 }} />
            
            <MenuItem>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'success.main',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontWeight: 'bold',
                  width: '100%'
                }} 
              >
                <AutoFixHigh sx={{ fontSize: 20 }} />
                <span style={{ fontSize: '1.1em' }}>{userDetails?.user?.userDetails?.credits || 0}</span> credits
              </Typography>
            </MenuItem>

            {userDetails?.user && (
              <>
                <Divider sx={{ borderStyle: 'dashed', my: 0.5 }} />
                <MenuItem onClick={() => { navigate('/account'); handleClose(); }}>
                  Manage Account
                </MenuItem>
                {isAdmin && showFeedToggle}
              </>
            )}

            <Divider sx={{ borderStyle: 'dashed', my: 0.5 }} />
            <MenuItem onClick={logout}>
              Logout
            </MenuItem>
          </>
          :
          <>
            <Stack sx={{ py: 1 }}>
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
    </>
  );
}

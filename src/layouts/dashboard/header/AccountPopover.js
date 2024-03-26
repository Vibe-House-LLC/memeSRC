import { useState, useContext, useEffect } from 'react';
// @mui
import { alpha } from '@mui/material/styles';
import { Box, Divider, Typography, Stack, MenuItem, Avatar, IconButton, Popover, CircularProgress } from '@mui/material';
// mocks_
import { useNavigate } from 'react-router-dom';
import { API, Auth } from 'aws-amplify';
import { UserContext } from '../../../UserContext';
import account from '../../../_mock/account';
import { useSubscribeDialog } from '../../../contexts/useSubscribeDialog';

// ----------------------------------------------------------------------

const MENU_OPTIONS = [
  // {
  //   label: 'Home',
  //   icon: 'eva:home-fill',
  // },
  // {
  //   label: 'Profile',
  //   icon: 'eva:person-fill',
  // },
  // {
  //   label: 'Settings',
  //   icon: 'eva:settings-2-fill',
  // },
];

// ----------------------------------------------------------------------

export default function AccountPopover() {
  const userDetails = useContext(UserContext);

  const { openSubscriptionDialog } = useSubscribeDialog();

  const [open, setOpen] = useState(null);

  const [loadingCustomerPortal, setLoadingCustomerPortal] = useState(false);

  const navigate = useNavigate();

  const handleOpen = (event) => {
    setOpen(event.currentTarget);
  };

  const handleClose = () => {
    setOpen(null);
  };

  const logIntoCustomerPortal = () => {
    API.post('publicapi', '/user/update/getPortalLink', {
      body: {
        currentUrl: window.location.href
      }
    }).then(results => {
      console.log(results)
      window.location.href = results
    }).catch(error => {
      console.log(error.response)
    })
  }

  const logout = () => {
    Auth.signOut().then(() => {
      window.localStorage.removeItem('memeSRCUserInfo')
      userDetails?.setUser(null);
      navigate('/login')
    }).catch((err) => {
      alert(err)
    })
  }

  const handleSubscribe = () => {
    setOpen()
    openSubscriptionDialog();
  }

  return (
    <>
      {userDetails?.user &&
        <IconButton
          onClick={handleOpen}
          sx={{
            p: 0,
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
          <Avatar src={account.photoURL} alt="photoURL" sx={{ width: 35, height: 35 }} />
        </IconButton>
      }

      {!(userDetails?.user) &&
        <IconButton
          onClick={handleOpen}
          sx={{
            p: 0,
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
            width: 180,
            '& .MuiMenuItem-root': {
              typography: 'body2',
              borderRadius: 0.75,
            },
          },
        }}
      >
        {userDetails?.user ?
          <>
            <Box sx={{ my: 1.5, px: 2.5 }}>
              <Typography variant="subtitle2" noWrap>
                {userDetails?.user?.username}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                {userDetails?.user?.attributes?.email}
              </Typography>
            </Box>

            {/* <Divider sx={{ borderStyle: 'dashed' }} /> */}

            {/* <Stack sx={{ p: 1 }}>
              {MENU_OPTIONS.map((option) => (
                <MenuItem key={option.label} onClick={handleClose}>
                  {option.label}
                </MenuItem>
              ))}
            </Stack> */}

            {userDetails?.user &&
              <>
                {userDetails?.user?.magicSubscription === 'true' ?
                  <>
                    <MenuItem onClick={logIntoCustomerPortal} sx={{ m: 1 }}>
                      <Stack direction='row' alignItems='center'>
                        {loadingCustomerPortal ? <><CircularProgress color='success' size={15} sx={{ mr: 1 }} /> Please Wait...</> : 'Manage Subscription'}
                      </Stack>
                    </MenuItem>
                  </>
                  :
                  <>
                    <MenuItem onClick={handleSubscribe} sx={{ m: 1, color: theme => theme.palette.success.main }}>
                      Subscribe to Pro
                    </MenuItem>
                  </>
                }
              </>
            }

            <Divider sx={{ borderStyle: 'dashed' }} />

            <MenuItem onClick={logout} sx={{ m: 1 }}>
              Logout
            </MenuItem>
          </>
          :
          <>
            <Stack sx={{ p: 1 }}>
              <MenuItem onClick={() => {
                navigate('/login')
              }}>
                Log In
              </MenuItem>
              <MenuItem onClick={() => {
                navigate('/signup')
              }}>
                Create Account
              </MenuItem>
            </Stack>
          </>
        }
      </Popover>
    </>
  );
}

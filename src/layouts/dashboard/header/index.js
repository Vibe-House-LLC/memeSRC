import PropTypes from 'prop-types';
import { useState, useEffect, useContext, useRef, useCallback } from 'react';
// @mui
import { css, styled, useTheme } from '@mui/material/styles';
import {
  Box,
  Stack,
  AppBar,
  Toolbar,
  Link,
  IconButton,
  Grid,
  Typography,
  Slide,
  Chip,
  Popover,
  Tooltip,
  Button,
  Card,
  Fab,
} from '@mui/material';
import { AutoFixHighRounded, Close, Verified } from '@mui/icons-material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SupervisedUserCircleIcon from '@mui/icons-material/SupervisedUserCircle';
// utils
import { useLocation, useNavigate } from "react-router-dom";
import { LoadingButton } from '@mui/lab';
import { API } from 'aws-amplify';
import { bgBlur } from '../../../utils/cssStyles';
// components
import Iconify from '../../../components/iconify';
import Logo from "../../../components/logo/Logo";
//
import Searchbar from './Searchbar';
import AccountPopover from './AccountPopover';
import LanguagePopover from './LanguagePopover';
import NotificationsPopover from './NotificationsPopover';
import { ColorModeContext } from '../../../theme';
import { UserContext } from '../../../UserContext';
import { SnackbarContext } from '../../../SnackbarContext';

// ----------------------------------------------------------------------

const NAV_WIDTH = 280;

const HEADER_MOBILE = 45;

const HEADER_DESKTOP = 45;

const StyledRoot = styled(AppBar)(({ theme }) => ({
  ...bgBlur({ color: theme.palette.background.default }),
  boxShadow: 'none',
  overflow: 'hidden', // This line will hide the slide in/out animation outside the AppBar
}));

const StyledToolbar = styled(Toolbar)(({ theme }) => ({

}));

// ----------------------------------------------------------------------

Header.propTypes = {
  onOpenNav: PropTypes.func,
};

export default function Header({ onOpenNav }) {

  const navigate = useNavigate();

  const buttonRef = useRef(null);

  const { user, setUser } = useContext(UserContext);

  const theme = useTheme();

  const colorMode = useContext(ColorModeContext);

  const location = useLocation();

  const [showLogo, setShowLogo] = useState(false);

  const [showNav, setShowNav] = useState(false);

  const [earlyAccessLoading, setEarlyAccessLoading] = useState(false);

  const [earlyAccessComplete, setEarlyAccessComplete] = useState(false);
  const [earlyAccessDisabled, setEarlyAccessDisabled] = useState(false);
  const [loadingSubscriptionUrl, setLoadingSubscriptionUrl] = useState(false);

  const { setOpen, setMessage, setSeverity } = useContext(SnackbarContext)

  const containerRef = useRef(null);

  const [anchorEl, setAnchorEl] = useState(null);

  const renderLogo = () => (
    <Grid
      container
      direction="row"
      justifyContent="left"
      alignItems="center"
    >
      <Link
        onClick={() => {
          navigate('/')
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
          ml: 1,
          cursor: 'pointer',
          color: 'inherit',
          '&:hover': {
            textDecoration: 'none',
          },
        }}
      >
        <Logo />
        <Typography component='h6' variant='h6' sx={{ color: '#FFFFFF', textShadow: '1px 1px 3px rgba(0, 0, 0, 0.30);', marginLeft: '6px', display: 'inline' }}>
          memeSRC
        </Typography>
      </Link>
    </Grid>
  );

  const handleScroll = useCallback(() => {
    const currentScrollPos = window.pageYOffset;

    // Show the logo if the user has scrolled down 1/3 of the view height, and it hasn't been shown yet
    if (currentScrollPos > window.innerHeight / 3 && !showLogo) {
      setShowLogo(true);
    } else if (currentScrollPos <= window.innerHeight / 3 && showLogo) {
      // Delay the hiding of the logo by 200 milliseconds
      setTimeout(() => {
        setShowLogo(false);
      }, 200);
    }
  }, [showLogo]);

  useEffect(() => {
    if (location.pathname === '/') {
      window.addEventListener('scroll', handleScroll);
      setShowNav(true);
    } else if (location.pathname !== '/') {
      setShowNav(true);
    } else {
      setShowNav(false);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname, handleScroll, user]);

  // useEffect(() => {
  //   console.log(user);
  // }, [user])

  const earlyAccessSubmit = () => {
    buttonRef.current.blur();
    setEarlyAccessLoading(true);
    console.log('submitting')
    API.get('publicapi', '/user/update/earlyAccess').then(response => {
      console.log(response)
      setEarlyAccessComplete(true);
      setEarlyAccessLoading(false);
      setEarlyAccessDisabled(true);
    }).catch(err => console.log(err))
  }

  const buySubscription = () => {
    setLoadingSubscriptionUrl(true)
    API.post('publicapi', '/user/update/getCheckoutSession', {
      body: {
        currentUrl: window.location.href
      }
    }).then(results => {
      console.log(results)
      setLoadingSubscriptionUrl(false)
      window.location.href = results
    }).catch(error => {
      console.log(error.response)
      setLoadingSubscriptionUrl(false)
    })
  }



  const cancelSubscription = () => {
    setLoadingSubscriptionUrl(true)
    API.post('publicapi', '/user/update/cancelSubscription').then(results => {
      console.log(results)
      setLoadingSubscriptionUrl(false)
      setMessage('Your subscription has been cancelled.')
      setSeverity('success')
      setOpen(true)
      setUser({...user, userDetails: { ...user.userDetails, magicSubscription: null }})
    }).catch(error => {
      console.log(error.response)
      setLoadingSubscriptionUrl(false)
      setMessage('Something went wrong.')
      setSeverity('error')
      setOpen(true)
    })
  }


  return (
    <>
      <StyledRoot>
        <StyledToolbar sx={{ position: 'relative', minHeight: { xs: 45, md: '45px !important' } }} ref={containerRef}>
          <IconButton
            onClick={onOpenNav}
            sx={{
              color: 'text.primary',
            }}
            size="large"
          >
            <Iconify icon="ic:round-menu" />
          </IconButton>

          {/* <Searchbar /> */}
          <Box sx={{ flexGrow: 1 }} />
          {location.pathname === '/' ? (
            <Slide direction="up" container={containerRef.current} exit in={showLogo} mountOnEnter>
              {renderLogo()}
            </Slide>
          ) : (
            renderLogo()
          )}

          <Stack
            direction="row"
            alignItems="center"
            spacing={{
              xs: 2,
            }}
          >
            {/* <NotificationsPopover /> */}
            <>
              <Chip
                onClick={(event) => {
                  setAnchorEl(event.currentTarget);
                }}
                icon={<AutoFixHighRounded />}
                // We should probably handle this a little better, but I left this so that we can later make changes. Currently a credit balance of 0 will show Early Access.
                // However, everyone starts with 0 I believe, so this will likely just change to showing credits if early access is turned on.
                label={
                  user?.userDetails?.earlyAccessStatus || user?.userDetails?.credits > 0
                    ? user?.userDetails?.credits
                      ? user?.userDetails?.credits
                      : 'Magic'
                    : 'Magic'
                }
                size="small"
                color="success"
                sx={{
                  '& .MuiChip-label': {
                    fontWeight: 'bold',
                  },
                }}
              />
              <AccountPopover />
            </>
          </Stack>
        </StyledToolbar>
      </StyledRoot>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => {
          setAnchorEl(null);
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center', // Change 'left' to 'center'
        }}
        transformOrigin={{
          vertical: 'top', // Add this line to position the top corner at the bottom center
          horizontal: 'center', // Add this line to position the top corner at the bottom center
        }}
        // This is how you can change the background of the popover
        PaperProps={{
          sx: {
            backgroundColor: 'black',
            borderRadius: '15px',
            padding: '7px'
          }
        }}
      >
        <Fab
          color="secondary"
          aria-label="close"
          onClick={() => setAnchorEl(null)}
          sx={{
            position: 'absolute',
            top: theme.spacing(1),
            right: theme.spacing(1),
            backgroundColor: '#222',
            '&:hover': {
              backgroundColor: '#333',
            },
          }}
        >
          <Close />
        </Fab>
        <Box
          m={3}
          mx={5}
          sx={{
            maxWidth: '400px',
          }}
        >
          <Stack justifyContent="center" spacing={3}>
            <Stack direction="row" color="#54d62c" alignItems="center" justifyContent="left" spacing={1}>
              <AutoFixHighRounded fontSize="large" />
              <Typography variant="h3">Magic Tools</Typography>
            </Stack>

            <Typography variant="h3">
              A new suite of generative editing tools and features are coming soon!
            </Typography>

            <Typography variant="subtitle1" fontWeight="bold" lineHeight={2} textAlign="left" px={2}>
              <ul>
                <li>
                  Magic Eraser{' '}
                  <Chip
                    color="success"
                    size="small"
                    label="Early Access"
                    sx={{ marginLeft: '5px', opacity: 0.7 }}
                    variant="outlined"
                  />
                </li>
                <li>
                  Magic Fill{' '}
                  <Chip size="small" label="Planned" sx={{ marginLeft: '5px', opacity: 0.5 }} variant="outlined" />
                </li>
                <li>
                  Magic Expander{' '}
                  <Chip size="small" label="Planned" sx={{ marginLeft: '5px', opacity: 0.5 }} variant="outlined" />
                </li>
                <li>
                  Magic Isolator{' '}
                  <Chip size="small" label="Planned" sx={{ marginLeft: '5px', opacity: 0.5 }} variant="outlined" />
                </li>
              </ul>
            </Typography>
            {(user?.userDetails?.earlyAccessStatus === 'approved' || true) ?
              <Stack direction='row' alignItems='center'>
                <Verified sx={{ mr: 1 }} color='success' />
                <Typography variant="h6" sx={{ color: theme => theme.palette.success.main }}>
                  You have been approved for early access!
                </Typography>
              </Stack>
              :
              <Typography variant="body1"> We're opening an Early Access program for users who would like to help us test these features as they're
                developed.
              </Typography>
            }
          </Stack>
        </Box>
        <Box width="100%" px={2} pb={2} pt={1}>
          {/* TODO: Remove the " || true" from here. Just here for visualizing purposes. */}
          {(user?.userDetails?.earlyAccessStatus === 'approved' || true) ?
            <>
              {user?.userDetails?.magicSubscription === 'true' ?
                <LoadingButton loading={loadingSubscriptionUrl} onClick={cancelSubscription} variant='contained' size='large' fullWidth>
                  Cancel Subscription
                </LoadingButton>
                :
                <LoadingButton loading={loadingSubscriptionUrl} onClick={buySubscription} variant='contained' size='large' fullWidth sx={{
                backgroundColor: (theme) => theme.palette.success.main,
                color: (theme) => theme.palette.common.black,
                '&:hover': {
                  ...(!loadingSubscriptionUrl && {
                    backgroundColor: (theme) => theme.palette.success.dark,
                    color: (theme) => theme.palette.common.black
                  })
                }
              }}>
                Choose Plan
              </LoadingButton>
              }
            </>
            :
            <LoadingButton
              onClick={(event) => {
                if (user) {
                  earlyAccessSubmit();
                } else {
                  navigate('/signup')
                }
              }}
              loading={earlyAccessLoading}
              disabled={user?.userDetails?.earlyAccessStatus || earlyAccessLoading || earlyAccessDisabled || earlyAccessComplete}
              variant="contained"
              startIcon={<SupervisedUserCircleIcon />}
              size="large"
              fullWidth
              sx={css`
            font-size: 18px;
            background-color: #54d62c;
            color: black;
    
            ${!(earlyAccessLoading || earlyAccessDisabled) ? `@media (hover: hover) and (pointer: fine) {
              /* Apply hover style only on non-mobile devices */
              &:hover {
                background-color: #96f176;
                color: black;
              }
            }` : ''}
          `}
              onBlur={() => {
                // Blur the button when it loses focus
                buttonRef.current.blur();
              }}
              ref={buttonRef}
            >
              {earlyAccessComplete ? (
                `You're on the list!`
              ) : (
                <>
                  {user?.userDetails?.earlyAccessStatus && user?.userDetails?.earlyAccessStatus !== null
                    ? `You're on the list!`
                    : 'Request Access'}
                </>
              )}
            </LoadingButton>
          }
          {/* <Typography
              variant="caption"
              align="center"
              sx={{ display: 'block', marginTop: theme.spacing(1), cursor: 'pointer', color: '#999' }}
              onClick={() => setAnchorEl(null)}
            >
              Dismiss
            </Typography> */}
        </Box>
      </Popover>
    </>
  );
}

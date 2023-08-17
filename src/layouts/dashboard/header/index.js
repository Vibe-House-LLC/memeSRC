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
  Divider,
  Alert,
} from '@mui/material';
import { Add, ArrowCircleUpRounded, ArrowUpward, ArrowUpwardRounded, AutoFixHighRounded, Check, Close, HdrPlusTwoTone, InfoRounded, MonetizationOnRounded, NewReleasesRounded, UpgradeRounded, Verified } from '@mui/icons-material';
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
import { MagicPopupContext } from '../../../MagicPopupContext';

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
  const { magicToolsPopoverAnchorEl, setMagicToolsPopoverAnchorEl } = useContext(MagicPopupContext)
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const location = useLocation();
  const [showLogo, setShowLogo] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const { setOpen, setMessage, setSeverity } = useContext(SnackbarContext)
  const containerRef = useRef(null);
  const [magicAlertOpen, setMagicAlertOpen] = useState(false);

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

  useEffect(() => {
    const hasDismissed = window.localStorage.getItem('earlyAccessInviteAlertDismissed')
    if (user?.userDetails?.earlyAccessStatus === 'invited' && !hasDismissed) {
      setMagicAlertOpen(true)
    }
  }, [user])

  const handleEarlyAccessDismiss = () => {
    window.localStorage.setItem('earlyAccessInviteAlertDismissed', 'true')
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
            {user &&
              <NotificationsPopover />
            }
            <>
              <Chip
                onClick={(event) => {
                  setMagicToolsPopoverAnchorEl(event.currentTarget);
                }}
                id="magicChip"
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
        open={magicAlertOpen}
        anchorEl={document.getElementById('magicChip')}
        onClose={() => {
          setMagicAlertOpen(false)
          handleEarlyAccessDismiss()
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        sx={{
          minWidth: 400,
          marginTop: 1.5,
          '.MuiBackdrop-root': {
            backgroundColor: "rgba(0, 0, 0, 0.7)" // You can adjust the opacity to make it darker or lighter
          },
          '.MuiAlert-action': {
            pt: 0
          }
        }}
      >
        {/* <Alert
          variant='filled'
          onClose={() => {
            setMagicAlertOpen(false)
          }}
          sx={{
            backgroundColor: (theme) => theme.palette.grey[900],
            color: 'rgb(84 214 44)'
          }}
          action={
            <Stack direction='row' alignItems='center' spacing={2}>
              <Button
                variant='text'
                size='small'
                sx={{
                  backgroundColor: 'rgb(84 214 44)',
                  color: 'black'
                }}
                onClick={() => {

                  setMagicAlertOpen(false)
                  setMagicToolsPopoverAnchorEl(document.getElementById('magicChip'));
                }}
              >
                View
              </Button>
              <IconButton size='small'>
                <Close />
              </IconButton>
            </Stack>
          }
        >
          You've been invited to Magic Tools early access
        </Alert> */}

        <Stack direction='row' p={1} spacing={2} alignItems='center'>
          <Check sx={{ color: 'rgb(84 214 44)' }} />
          <Typography variant='body1' color='rgb(84 214 44)'>
            You've been invited to Magic Tools early access!
          </Typography>
          <Button
            variant='text'
            size='small'
            sx={{
              backgroundColor: 'rgb(84 214 44)',
              color: 'black',
              ':hover': {
                backgroundColor: 'rgb(118 214 108)'
              }
            }}
            onClick={() => {
              handleEarlyAccessDismiss()
              setMagicAlertOpen(false)
              setMagicToolsPopoverAnchorEl(document.getElementById('magicChip'));
            }}
          >
            View
          </Button>
          <IconButton
            size='small'
            onClick={() => {
              handleEarlyAccessDismiss()
              setMagicAlertOpen(false)
            }}
          >
            <Close />
          </IconButton>
        </Stack>
      </Popover>
    </>
  );
}

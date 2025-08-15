import PropTypes from 'prop-types';
import { useState, useEffect, useContext, useRef, useCallback } from 'react';
// @mui
import { styled } from '@mui/material/styles';
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
  Button,
  Card,
  Popper,
  Badge,
  Slide as MuiSlide,
} from '@mui/material';
import { AutoFixHighRounded, Check, Close, LocalPoliceRounded } from '@mui/icons-material';
// utils
import { useLocation, useNavigate } from "react-router-dom";
import { bgBlur } from '../../../utils/cssStyles';
// components
import Iconify from '../../../components/iconify';
import Logo from "../../../components/logo";
//
import AccountPopover from './AccountPopover';
import { UserContext } from '../../../UserContext';
import { MagicPopupContext } from '../../../MagicPopupContext';
import { SubscribeDialogContext } from '../../../contexts/SubscribeDialog';
import { CURRENT_SALE } from '../../../constants/sales';
import { SnowEffect } from '../../../components/CountdownTimer';

// ----------------------------------------------------------------------

const StyledRoot = styled(AppBar)(({ theme }) => ({
  ...bgBlur({ color: theme.palette.background.default }),
  boxShadow: 'none',
  overflow: 'hidden', // This line will hide the slide in/out animation outside the AppBar
}));

const StyledToolbar = styled(Toolbar)({});

// ----------------------------------------------------------------------

Header.propTypes = {
  onOpenNav: PropTypes.func,
};

export default function Header({ onOpenNav }) {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { setMagicToolsPopoverAnchorEl } = useContext(MagicPopupContext)
  const location = useLocation();
  const [showLogo, setShowLogo] = useState(false);
  const containerRef = useRef(null);
  const [magicAlertOpen, setMagicAlertOpen] = useState(false);
  const { openSubscriptionDialog } = useContext(SubscribeDialogContext);
  const [proChipEl, setProChipEl] = useState(null);
  const [showProTip, setShowProTip] = useState(false);

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
          cursor: 'pointer',
          color: 'inherit',
          '&:hover': {
            textDecoration: 'none',
          },
        }}
      >
        <Logo />
        <Typography component='h6' variant='h6' sx={{ color: '#FFFFFF', textShadow: '1px 1px 3px rgba(0, 0, 0, 0.30);', marginLeft: '4px', display: 'inline' }}>
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

  useEffect(() => {
    if (!CURRENT_SALE.isActive || 
        location.pathname !== '/' || 
        user?.userDetails?.subscriptionStatus === 'active') {
      setShowProTip(false);
      return undefined;
    }

    // Show tooltip after a short delay
    const timer = setTimeout(() => {
      setShowProTip(true);
    }, 1000);

    // Hide tooltip after 7 seconds
    const hideTimer = setTimeout(() => {
      setShowProTip(false);
    }, 7000);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, [location.pathname, user?.userDetails?.subscriptionStatus]);

  return (
    <>
      <StyledRoot>
      <StyledToolbar sx={{ position: 'relative', minHeight: { xs: 45, md: '45px !important' } }} ref={containerRef}>
          <IconButton
            onClick={onOpenNav}
            aria-label="open navigation"
            sx={{
              color: 'text.primary',
              ml: -1,
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
            <>
              {user?.userDetails?.subscriptionStatus === 'active' ? (
                <Chip
                  onClick={(event) => {
                    setMagicToolsPopoverAnchorEl(event.currentTarget);
                  }}
                  id="magicChip"
                  icon={<AutoFixHighRounded />}
                  label={
                    user?.userDetails?.earlyAccessStatus || user?.userDetails?.credits > 0
                      ? user?.userDetails?.credits
                        ? user?.userDetails?.credits
                        : 'Magic'
                      : 'Magic'
                  }
                  size="small"
                  sx={{
                    background: 'linear-gradient(45deg, #3d2459 30%, #6b42a1 90%)',
                    border: '1px solid #8b5cc7',
                    boxShadow: '0 0 20px rgba(107,66,161,0.5)',
                    '& .MuiChip-label': {
                      fontWeight: 'bold',
                      color: '#fff',
                    },
                    '& .MuiChip-icon': {
                      color: '#fff',
                    },
                    '&:hover': {
                      background: 'linear-gradient(45deg, #472a69 30%, #7b4cb8 90%)',
                      boxShadow: '0 0 25px rgba(107,66,161,0.6)',
                    },
                  }}
                />
              ) : (
                <Chip
                  onClick={() => {
                    setShowProTip(false);
                    openSubscriptionDialog(location.pathname);
                  }}
                  icon={<LocalPoliceRounded />}
                  label={CURRENT_SALE.isActive ? `Pro (${CURRENT_SALE.discountPercent}% off)` : 'Pro'}
                  color='default'
                  id='proChip'
                  sx={{
                    fontWeight: 'bold',
                    color: '#fff',
                    background: 'linear-gradient(45deg, #3d2459 30%, #6b42a1 90%)',
                    border: '1px solid #8b5cc7',
                    boxShadow: '0 0 20px rgba(107, 66, 161, 0.4)',
                    '& .MuiChip-icon': { color: '#fff' },
                  }}
                />
              )}
              {(user?.userDetails?.subscriptionStatus !== 'active' && showProTip) && (
                <>
                  <Chip
                    onClick={() => {
                      setShowProTip(false);
                      openSubscriptionDialog(location.pathname);
                    }}
                    icon={<LocalPoliceRounded />}
                    label={CURRENT_SALE.isActive ? `Pro (${CURRENT_SALE.discountPercent}% off!)` : 'Pro'}
                    id='proChipLucas'
                    sx={{ position: 'absolute', top: 4, left: '45%', boxShadow: '0 0 25px rgba(107,66,161,0.6)', background: 'linear-gradient(45deg, #472a69 30%, #7b4cb8 90%)', border: '1px solid #8b5cc7', color: 'white', '& .MuiChip-icon': { color: '#fff' }, }}
                  />
                  <MuiSlide in={showProTip} timeout={300}>
                    <Box sx={{ position: 'absolute', top: 50, left: '26%', color: '#fff', display: 'inline-flex', alignItems: 'center', background: 'linear-gradient(90deg, rgba(61,36,89,0.8) 0%, rgba(107,66,161,0.6) 100%)', borderRadius: 2, p: 1.5, gap: 1.5, border: '1px solid #8b5cc7', boxShadow: '0 4px 30px rgba(107,66,161,0.5)' }}>
                      <Check sx={{ color: '#4caf50', fontSize: 18 }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Pro is <b>{CURRENT_SALE.discountPercent}% off</b> today only!
                      </Typography>
                      <Button variant="contained" size="small" sx={{ ml: 1, borderRadius: 2, background: 'linear-gradient(45deg, #3d2459 30%, #6b42a1 90%)', border: '1px solid #8b5cc7', boxShadow: '0 3px 10px rgba(107,66,161,0.5)' }} onClick={() => {
                        setShowProTip(false);
                        openSubscriptionDialog(location.pathname);
                      }}>
                        Upgrade
                      </Button>
                      <IconButton size="small" onClick={() => setShowProTip(false)} sx={{ ml: 1 }}>
                        <Close fontSize="small" />
                      </IconButton>
                    </Box>
                  </MuiSlide>
                </>
              )}
            </>

            <AccountPopover />
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
            aria-label='dismiss early access'
            onClick={() => {
              handleEarlyAccessDismiss()
              setMagicAlertOpen(false)
            }}
          >
            <Close />
          </IconButton>
        </Stack>
      </Popover>
      <Popper
        open={showProTip && CURRENT_SALE.isActive}
        anchorEl={proChipEl}
        placement="bottom"
        transition
      >
        {({ TransitionProps }) => (
          <MuiSlide {...TransitionProps} direction="down">
            <Card
              onClick={(e) => {
                // Prevent card click when clicking close button
                if (e.target.closest('.close-button')) {
                  e.stopPropagation();
                  setShowProTip(false);
                  return;
                }
                setShowProTip(false);
                openSubscriptionDialog(location.pathname);
              }}
              sx={{
                position: 'relative',
                p: 1.5,
                pr: 5,
                mt: 1.5,
                maxWidth: 260,
                background: 'linear-gradient(45deg, #2f1c47 30%, #4a2d71 90%)',
                border: '1px solid #6b42a1',
                boxShadow: '0 0 20px rgba(107,66,161,0.3)',
                cursor: 'pointer',
                overflow: 'hidden',
                borderRadius: 2,
              }}
            >
              <IconButton
                className="close-button"
                size="small"
                aria-label="close"
                sx={{
                  position: 'absolute',
                  right: 4,
                  top: 4,
                  color: '#b794f4',
                  padding: '2px',
                  '&:hover': {
                    color: '#fff',
                  },
                }}
              >
                <Close fontSize="small" />
              </IconButton>
              <SnowEffect />
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  position: 'relative',
                  pl: 1 
                }}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}
                  >
                    <Logo 
                      color="white"
                      sx={{ 
                        width: 38,
                        height: 38,
                        position: 'relative',
                        left: -3,
                        objectFit: 'contain',
                        padding: 0,
                        margin: 0,
                        display: 'block'
                      }} 
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography
                    fontWeight={800}
                    color="#fff"
                    textAlign="center"
                    sx={{
                      fontSize: 18,
                      textShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      background: 'linear-gradient(45deg, #fff 30%, #e0e0ff 90%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      position: 'relative',
                      mb: 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                    }}
                  >
                    {CURRENT_SALE.name}!
                  </Typography>
                  <Typography 
                    variant="body2"
                    sx={{
                      color: '#b794f4',
                      textAlign: 'center',
                      fontSize: 13,
                      fontWeight: 500,
                      lineHeight: 1.3,
                      mb: 0.5,
                    }}
                  >
                    <Box component="span" sx={{ color: '#fff', fontWeight: 700 }}>
                      {CURRENT_SALE.discountPercent}% off
                    </Box>
                    {' first '}
                    {CURRENT_SALE.monthsDuration}{' mo!'}
                  </Typography>
                </Box>
              </Stack>
            </Card>
          </MuiSlide>
        )}
      </Popper>
    </>
  );
}

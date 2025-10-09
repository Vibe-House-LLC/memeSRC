import PropTypes from 'prop-types';
import { useState, useEffect, useContext } from 'react';
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
import { safeGetItem, safeSetItem } from '../../../utils/storage';
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

// Detect if running in Electron
const isElectron = () => typeof window !== 'undefined' && window.process && window.process.type;

const StyledRoot = styled(AppBar)(({ theme }) => ({
  backgroundColor: '#000000',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  boxShadow: 'none',
  color: '#fff',
  position: 'static',
  // Desktop App - Make header draggable and sticky (Electron only)
  ...(isElectron() && {
    WebkitAppRegion: 'drag',
    position: 'sticky',
    top: 0,
    zIndex: theme.zIndex.appBar + 1,
  }),
  [theme.breakpoints.down('sm')]: {
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.65)',
    // Keep static on mobile for Electron
    ...(isElectron() && {
      position: 'static',
    }),
  },
  [theme.breakpoints.up('md')]: {
    // Only apply sticky on web, Electron handles it above
    ...(!isElectron() && {
      position: 'sticky',
      top: -1,
      zIndex: theme.zIndex.appBar + 1,
    }),
  },
}));

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  backgroundColor: '#000000',
  // Default minimum height for web
  minHeight: '45px !important',
  [theme.breakpoints.up('md')]: {
    minHeight: '45px !important',
  },
  // Desktop App - Add left padding to clear traffic light buttons (Electron only)
  // Traffic lights are at y: 20, ~16px tall, center at ~28px
  // Need 56px total height (28px * 2) to center content with traffic lights
  ...(isElectron() && {
    paddingLeft: '80px !important',
    WebkitAppRegion: 'drag',
    minHeight: '56px !important',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    paddingTop: '0 !important',
    paddingBottom: '0 !important',
  }),
}));

// ----------------------------------------------------------------------

Header.propTypes = {
  onOpenNav: PropTypes.func,
};

export default function Header({ onOpenNav }) {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { setMagicToolsPopoverAnchorEl } = useContext(MagicPopupContext)
  const location = useLocation();
  const [magicAlertOpen, setMagicAlertOpen] = useState(false);
  const { openSubscriptionDialog } = useContext(SubscribeDialogContext);
  const [proChipEl, setProChipEl] = useState(null);
  const [showProTip, setShowProTip] = useState(false);
  
  // Electron-specific styles for making elements clickable (not draggable)
  const electronNoDragStyle = isElectron() ? { WebkitAppRegion: 'no-drag' } : {};

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
          // Desktop App - Make logo clickable (not draggable)
          ...electronNoDragStyle,
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

  useEffect(() => {
    const hasDismissed = safeGetItem('earlyAccessInviteAlertDismissed')
    if (user?.userDetails?.earlyAccessStatus === 'invited' && !hasDismissed) {
      setMagicAlertOpen(true)
    }
  }, [user])

  const handleEarlyAccessDismiss = () => {
    safeSetItem('earlyAccessInviteAlertDismissed', 'true')
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
        <StyledToolbar sx={{ position: 'relative' }}>
          <IconButton
            onClick={(event) => onOpenNav(event)}
            aria-label="open navigation"
            sx={{
              color: 'text.primary',
              ml: -1,
              // Desktop App - Make button clickable (not draggable)
              ...electronNoDragStyle,
            }}
            size="large"
          >
            <Iconify icon="ic:round-menu" />
          </IconButton>

          {/* <Searchbar /> */}
          <Box sx={{ flexGrow: 1 }} />
          {renderLogo()}

          <Stack
            direction="row"
            alignItems="center"
            spacing={{
              xs: 2,
            }}
            sx={{
              // Desktop App - Make all interactive elements in this stack clickable
              ...electronNoDragStyle,
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
                <Badge ref={setProChipEl}>
                  {CURRENT_SALE.isActive ? (
                    <Box sx={{ position: 'relative' }}>
                      <SnowEffect />
                      <Chip
                        onClick={() => {
                          setShowProTip(false);
                          openSubscriptionDialog();
                        }}
                        icon={<LocalPoliceRounded />}
                        label={CURRENT_SALE.isActive ? `Pro (${CURRENT_SALE.discountPercent}% off)` : 'Pro'}
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
                    </Box>
                  ) : (
                    <Chip
                      onClick={() => {
                        setShowProTip(false);
                        openSubscriptionDialog();
                      }}
                      icon={<LocalPoliceRounded />}
                      label={CURRENT_SALE.isActive ? `Pro (${CURRENT_SALE.discountPercent}% off!)` : 'Pro'}
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
                  )}
                </Badge>
              )}
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
                openSubscriptionDialog();
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

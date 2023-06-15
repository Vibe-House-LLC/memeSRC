import PropTypes from 'prop-types';
import { useState, useEffect, useContext, useRef, useCallback } from 'react';
// @mui
import { styled, useTheme } from '@mui/material/styles';
import { Box, Stack, AppBar, Toolbar, Link, IconButton, Grid, Typography, Slide, Chip, Popover, Tooltip } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
// utils
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
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

// ----------------------------------------------------------------------

const NAV_WIDTH = 280;

const HEADER_MOBILE = 48;

const HEADER_DESKTOP = 48;

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

  const { user } = useContext(UserContext);

  const theme = useTheme();

  const colorMode = useContext(ColorModeContext);

  const location = useLocation();

  const [showLogo, setShowLogo] = useState(false);

  const [showNav, setShowNav] = useState(false);

  const containerRef = useRef(null);

  const renderLogo = () => (
    <Grid
      container
      direction="row"
      justifyContent="center"
      alignItems="center"
    >
      <Link
        to="/"
        component={RouterLink}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
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
    if (location.pathname === '/' && user) {
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

  return (
    <>
      {showNav &&
        <StyledRoot>
          <StyledToolbar sx={{ position: 'relative', minHeight: { xs: 45, md: '45px !important' } }} ref={containerRef}>
            {location.pathname.startsWith('/dashboard/') && <IconButton
              onClick={onOpenNav}
              sx={{
                mr: 1,
                color: 'text.primary',
              }}
              size='large'
            >
              <Iconify icon="ic:round-menu" />
            </IconButton>}
            {user && <Box sx={{ width: '145px', height: '1px' }} />}

            {/* <Searchbar /> */}
            <Box sx={{ flexGrow: 1 }} />
            {location.pathname === '/'
              ?

              <Slide direction="up" container={containerRef.current} exit in={showLogo} mountOnEnter>

                {renderLogo()}
              </Slide>
              : renderLogo()
            }

            <Stack
              direction="row"
              alignItems="center"
              spacing={{
                xs: 2
              }}
            >
              {/* <NotificationsPopover /> */}
              {user &&
                <>
                  <Chip
                    icon={<AccountBalanceWalletIcon />}
                    label={user.userDetails.credits}
                    size="small"
                    color="success"
                    sx={{
                      "& .MuiChip-label": {
                        fontWeight: 'bold',
                      },
                    }}
                  />
                  <AccountPopover />
                </>
              }
            </Stack>
          </StyledToolbar>
        </StyledRoot>
      }
    </>
  );
}

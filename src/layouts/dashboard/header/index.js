import PropTypes from 'prop-types';
import { useState, useEffect, useContext, useRef, useCallback } from 'react';
// @mui
import { styled, useTheme } from '@mui/material/styles';
import { Box, Stack, AppBar, Toolbar, Link, IconButton, Grid, Typography, Slide } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
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

  const theme = useTheme();

  const colorMode = useContext(ColorModeContext);

  const location = useLocation();

  const [showLogo, setShowLogo] = useState(false);

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
    if (location.pathname === '/') {
      window.addEventListener('scroll', handleScroll);
    }
  
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname, handleScroll]);


  return (
    <StyledRoot>
      <StyledToolbar sx={{ position: 'relative', minHeight: {xs: 56, md: '56px !important'} }} ref={containerRef}>
        <IconButton
          onClick={onOpenNav}
          sx={{
            mr: 1,
            color: 'text.primary',
          }}
        >
          <Iconify icon="eva:menu-2-fill" />
        </IconButton>

        <Searchbar />
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
            xs: 0.5
          }}
        >
          <NotificationsPopover />
          <AccountPopover />
        </Stack>
      </StyledToolbar>
    </StyledRoot>
  );
}

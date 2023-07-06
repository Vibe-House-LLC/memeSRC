import PropTypes from 'prop-types';
import { useState, useEffect, useContext, useRef, useCallback } from 'react';
// @mui
import { styled, useTheme } from '@mui/material/styles';
import { Box, Stack, AppBar, Toolbar, Link, IconButton, Grid, Typography, Slide, Chip, Popover, Tooltip, Button } from '@mui/material';
import { AutoFixHighRounded } from '@mui/icons-material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
// utils
import { useLocation, useNavigate } from "react-router-dom";
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

  const { user } = useContext(UserContext);

  const theme = useTheme();

  const colorMode = useContext(ColorModeContext);

  const location = useLocation();

  const [showLogo, setShowLogo] = useState(false);

  const [showNav, setShowNav] = useState(false);

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

  return (
    <>
      <StyledRoot>
        <StyledToolbar sx={{ position: 'relative', minHeight: { xs: 45, md: '45px !important' } }} ref={containerRef}>
          <IconButton
            onClick={onOpenNav}
            sx={{
              color: 'text.primary',
            }}
            size='large'
          >
            <Iconify icon="ic:round-menu" />
          </IconButton>

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
            <>
              {user &&
                <Chip
                  onClick={!user.userDetails.earlyAccessStatus ? (event) => {
                    setAnchorEl(event.currentTarget)
                  } : null}
                  icon={<AutoFixHighRounded />}
                  // We should probably handle this a little better, but I left this so that we can later make changes. Currently a credit balance of 0 will show Early Access.
                  // However, everyone starts with 0 I believe, so this will likely just change to showing credits if early access is turned on.
                  label={user.userDetails.earlyAccessStatus ? user.userDetails.credits ? user.userDetails.credits : 'Early Access' : 'Early Access'}
                  size="small"
                  color="success"
                  sx={{
                    "& .MuiChip-label": {
                      fontWeight: 'bold',
                    },
                  }}
                />
              }
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
          horizontal: 'right', // Add this line to position the top corner at the bottom center
        }}
      >
        <Box m={3} mx={5}>
          <Stack justifyContent='center' spacing={3}>
            <Stack direction='row' color='#54d62c' alignItems='center' justifyContent='center' spacing={1}>
              <AutoFixHighRounded fontSize='large' />
              <Typography variant='h5'>
                Magic Tools
              </Typography>
            </Stack>

            <Typography variant='body1' fontWeight='bold' lineHeight={2} textAlign='left'>
              <ul>
                <li>Magic Eraser Tool</li>
                <li>More to be announced</li>
              </ul>
            </Typography>
            
          </Stack>
          
        </Box>

        <Button variant='contained'  size='large' sx={{mx: 2, mb: 2, mt: 1, backgroundColor: '#54d62c', color: 'black', '&:hover': { backgroundColor: '#96f176', color: 'black' }}}>
              Join Waiting List
            </Button>
      </Popover>
    </>
  );
}

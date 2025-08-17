import PropTypes from 'prop-types';
import { useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// @mui
import { styled, alpha } from '@mui/material/styles';
import { Box, Link, Drawer, Typography, Stack, Chip, Divider } from '@mui/material';
// components
import Logo from '../../../components/logo';
import Scrollbar from '../../../components/scrollbar';
import NavSection from '../../../components/nav-section';
//
import navConfig from './config';

import { UserContext } from '../../../UserContext';
import { formatReleaseDisplay } from '../../../utils/githubReleases';

const NAV_WIDTH = 280;

const StyledAccount = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(2, 2.5),
  borderRadius: Number(theme.shape.borderRadius) * 1.5,
  backgroundColor: alpha(theme.palette.grey[500], 0.12),
}));

Nav.propTypes = {
  openNav: PropTypes.bool,
  onCloseNav: PropTypes.func,
};

export default function Nav({ openNav, onCloseNav }) {
  useLocation();
  const navigate = useNavigate();
  const userDetails = useContext(UserContext)

  // useEffect(() => {
  //   if (openNav) {
  //     onCloseNav();
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [openNav]);

  const renderContent = (
    <Scrollbar
      sx={{
        height: 1,
        '& .simplebar-content': { height: 1, display: 'flex', flexDirection: 'column' },
      }}
    >
      <Box sx={{ px: 2.5, py: 3, display: 'inline-flex' }}>
        <Stack direction='row'>
          <Link onClick={() => { navigate('/') }}>
            <Logo />
          </Link>
          <Chip
            label={process.env.REACT_APP_USER_BRANCH === 'beta' 
              ? formatReleaseDisplay(`v${process.env.REACT_APP_VERSION}`)
              : `${formatReleaseDisplay(`v${process.env.REACT_APP_VERSION}`)}-${process.env.REACT_APP_USER_BRANCH}`}
            size="small"
            clickable
            aria-label="View releases and version notes"
            onClick={() => { navigate('/releases'); }}
            variant="outlined"
            sx={{
              ml: 1,
              height: 22,
              px: 1,
              borderRadius: 1.5,
              fontWeight: 'bold',
              letterSpacing: 0.25,
              borderColor: 'primary.main',
              '& .MuiChip-label': {
                px: 0.75,
                background: 'linear-gradient(135deg, #F0E6FF 0%, #D4A5FF 50%, #9B59CC 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              },
              '&:hover': {
                bgcolor: 'primary.main',
              },
            }}
          />
        </Stack>
      </Box>

      <Box sx={{ mb: 5, mx: 2.5 }}>
          {!userDetails.user &&
            <StyledAccount>
              <>
                <Box width='100%'>
                  <Link href='/signup' underline='none'>
                    <Typography variant="subtitle1" textAlign='center' sx={{ color: 'text.primary' }}>
                      Create Account
                    </Typography>
                  </Link>
                  <Divider sx={{ my: 2 }} />
                  <Link href='/login' underline='none'>
                    <Typography variant="subtitle1" textAlign='center' sx={{ color: 'text.primary' }}>
                      Sign In
                    </Typography>
                  </Link>
                </Box>
              </>
            </StyledAccount>
          }
      </Box>

      <NavSection sx={{ paddingBottom: 8 }} data={navConfig} />

      <Box sx={{ flexGrow: 1 }} />

      {/* <Box sx={{ px: 2.5, pb: 3, mt: 10 }}>
        <Stack alignItems="center" spacing={3} sx={{ pt: 5, borderRadius: 2, position: 'relative' }}>
          <Box
            component="img"
            src="/assets/illustrations/illustration_avatar.png"
            alt="illustration avatar"
            sx={{ width: 100, position: 'absolute', top: -50 }}
          />

          <Box sx={{ textAlign: 'center' }}>
            <Typography gutterBottom variant="h6">
              Get more?
            </Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              From only $69
            </Typography>
          </Box>

          <Button href="https://material-ui.com/store/items/minimal-dashboard/" target="_blank" variant="contained">
            Upgrade to Pro
          </Button>
        </Stack>
      </Box> */}
    </Scrollbar>
  );

  return (
    <Box
      component="nav"
      sx={{
        flexShrink: { lg: 0 },
      }}
    >
      <Drawer
        open={openNav}
        onClose={onCloseNav}
        variant="temporary"
        ModalProps={{
          keepMounted: true,
        }}
        PaperProps={{
          sx: { width: NAV_WIDTH },
        }}
      >
        {renderContent}
      </Drawer>
    </Box>
  );

}

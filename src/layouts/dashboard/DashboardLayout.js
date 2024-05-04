import { useState, useEffect, useContext, useRef } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { styled, keyframes } from '@mui/material/styles';
import { Box, Typography, useMediaQuery, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import HomePageBannerAd from '../../ads/HomePageBannerAd';
import Header from './header';
import Nav from './nav';
import { UserContext } from '../../UserContext';
import { useSubscribeDialog } from '../../contexts/useSubscribeDialog';

const StyledRoot = styled('div')(({ theme, adSpaceHeight }) => ({
  display: 'flex',
  minHeight: '100%',
  overflow: 'hidden',
  paddingTop: adSpaceHeight,
}));

const Main = styled('div')(({ theme, isRootPath }) => ({
  flexGrow: 1,
  width: '100%',
  paddingTop: isRootPath ? 0 : theme.spacing(6),
  paddingBottom: isRootPath ? 0 : theme.spacing(10),
  [theme.breakpoints.up('lg')]: {
    paddingTop: isRootPath ? 0 : theme.spacing(8),
  },
}));

const shimmerAnimation = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

const AdSpace = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  width: '100%',
  minWidth: '250px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: theme.palette.common.white,
  position: 'fixed',
  top: 0,
  left: 0,
  zIndex: theme.zIndex.appBar + 1,
  cursor: 'pointer',
  padding: theme.spacing(2, 4),
  overflow: 'hidden',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: `linear-gradient(
      110deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.2) 50%,
      rgba(255, 255, 255, 0) 100%
    )`,
    transform: 'translateX(-100%)',
    animation: `${shimmerAnimation} 3s infinite`,
  },
}));

// Custom styled dialog components
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiPaper-root': {
    backgroundColor: theme.palette.grey[900],
    color: theme.palette.common.white,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[5],
    maxWidth: '750px',
    width: '100%',
  },
}));

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  minHeight: '55px',
  backgroundColor: theme.palette.grey[800],
  padding: theme.spacing(2),
  '& .MuiTypography-root': {
    fontWeight: 'bold',
    marginLeft: theme.spacing(2),
  },
  '&::before': {
    content: '""',
    backgroundImage: `url('/assets/memeSRC-white.svg')`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'contain',
    marginRight: theme.spacing(2),
    width: '50px',
    height: '50px',
    opacity: 0.9,
  },
}));

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  color: theme.palette.common.white,
  backgroundColor: theme.palette.grey[900],
  // padding: theme.spacing(4),
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center', // Ensures content is vertically centered
  '& .MuiTypography-root': {
    marginTop: theme.spacing(2),
  },
}));

const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  backgroundColor: theme.palette.grey[900],
  justifyContent: 'center',
  paddingBottom: theme.spacing(3),
  '& .MuiButton-root': {
    // margin: theme.spacing(0, 2),
    width: '120px',
  },
  '& .MuiButton-contained': {
    color: theme.palette.primary.contrastText,
    backgroundColor: theme.palette.primary.main, // Primary button color matching the banner
  },
  '& .MuiButton-outlined': {
    color: theme.palette.primary.main, // Text color matching the banner primary color
    borderColor: theme.palette.primary.main, // Border color matching the banner primary color
    '&:hover': {
      backgroundColor: theme.palette.primary.dark, // Darker shade on hover for better visibility
    },
  },
}));

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const { seriesId } = useParams();
  const location = useLocation();
  const isRootPath = location.pathname === '/' || seriesId || location.pathname === '/pro';
  const [adSpaceHeight, setAdSpaceHeight] = useState(0);
  const [isAdDismissed, setIsAdDismissed] = useState(false);
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const adSpaceRef = useRef(null);
  const { openSubscriptionDialog } = useSubscribeDialog();
  const { user } = useContext(UserContext);
  const isMd = useMediaQuery(theme => theme.breakpoints.up('md'));

  const titleSubtitlePairs = [
    {
      title: 'Get memeSRC Pro!',
      subtitle: 'Or don\'t. I don\'t care.',
    },
    {
      title: 'Get Pro. Be a Hero.',
      subtitle: 'Or stay basic I guess.',
    },
    {
      title: 'Unlock memeSRC Pro!',
      subtitle: "Or forget you ever saw this.",
    },
    {
      title: "Pro is for pros.",
      subtitle: "But don't let that stop you.",
    },
    {
      title: "Upgrade to Pro.",
      subtitle: "You know you want to.",
    }
  ];

  const [selectedTitleSubtitle, setSelectedTitleSubtitle] = useState(null);

  useEffect(() => {
    // Close navigation bar whenever the route changes
    setOpen(false);
  }, [location]);

  useEffect(() => {
    const updateAdSpaceHeight = () => {
      if (adSpaceRef.current) {
        setAdSpaceHeight(adSpaceRef.current.offsetHeight);
      } else {
        setAdSpaceHeight(0);
      }
    };

    updateAdSpaceHeight();
    window.addEventListener('resize', updateAdSpaceHeight);

    return () => {
      window.removeEventListener('resize', updateAdSpaceHeight);
    };
  }, [user?.userDetails?.magicSubscription, selectedTitleSubtitle, isAdDismissed]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * titleSubtitlePairs.length);
    setSelectedTitleSubtitle(titleSubtitlePairs[randomIndex]);
  }, []);

  const handleDismissBanner = () => {
    setDismissDialogOpen(true);
  };

  const handleConfirmDismiss = () => {
    setDismissDialogOpen(false);
    setIsAdDismissed(true);
  };

  const handleCancelDismiss = () => {
    setDismissDialogOpen(false);
  };

  return (
    <>
      {/* {user?.userDetails?.magicSubscription !== 'true' && !isAdDismissed && (
        <AdSpace ref={adSpaceRef} onClick={openSubscriptionDialog}>
          <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
            <Box display="flex" alignItems="center">
              <img
                src="/assets/memeSRC-white.svg"
                alt="memeSRC logo"
                style={{ height: 32, marginRight: 16 }}
              />
            </Box>
            <Box flexGrow={1} textAlign="left">
              {isMd ? (
                <>
                  <Typography variant="subtitle1" component="span" fontWeight={700} style={{ whiteSpace: 'normal' }}>
                    {selectedTitleSubtitle?.title}
                  </Typography>
                  <Typography variant="body2" component="span" color="rgba(255, 255, 255, 0.8)" ml={1} style={{ whiteSpace: 'normal' }}>
                    {selectedTitleSubtitle?.subtitle}
                  </Typography>
                  <Typography variant="caption" component="span" color="rgba(255, 255, 255, 0.9)" ml={1} style={{ whiteSpace: 'normal' }}>
                    Unlock perks like no ads, pro support, early access features, and more magic credits!
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="h6" component="div" fontWeight={700} style={{ whiteSpace: 'normal' }}>
                    {selectedTitleSubtitle?.title}
                  </Typography>
                  <Typography variant="subtitle2" component="div" color="rgba(255, 255, 255, 0.8)" style={{ whiteSpace: 'normal' }}>
                    {selectedTitleSubtitle?.subtitle}
                  </Typography>
                </>
              )}
            </Box>
            <Box
              component="button"
              display="flex"
              alignItems="center"
              justifyContent="center"
              minWidth={40}
              minHeight={40}
              bgcolor="transparent"
              border="none"
              color="white"
              fontSize={24}
              cursor="pointer"
              position="relative"
              zIndex={1}
              onClick={(e) => {
                e.stopPropagation();
                handleDismissBanner();
              }}
            >
              &times;
            </Box>
          </Box>
        </AdSpace>
      )} */}
      <StyledDialog open={dismissDialogOpen} onClose={handleCancelDismiss}>
        <StyledDialogTitle>Will you reconsider?</StyledDialogTitle>
        <StyledDialogContent>
          <Typography variant="body1" align="center">
            Remove ads, support the site, and more with <b>memeSRC&nbsp;Pro.</b>
          </Typography>
        </StyledDialogContent>
        <StyledDialogActions>
          <Button
            onClick={handleConfirmDismiss}
            variant="outlined" // Maintained as outlined, but now will match the banner colors
            color="primary" // Ensures the color theme is consistent with the primary palette
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              borderColor: 'rgba(255, 255, 255, 0.5)',
              backgroundColor: 'transparent'
            }}
          >
            Dismiss
          </Button>
          <Button
            onClick={() => {
              handleCancelDismiss();
              openSubscriptionDialog();
            }}
            variant="contained" // Use the primary style for the dismiss button for visual consistency
          >
            Learn more
          </Button>
        </StyledDialogActions>
      </StyledDialog>
      <StyledRoot adSpaceHeight={adSpaceHeight}>
        <Header onOpenNav={() => setOpen(true)} adSpaceHeight={adSpaceHeight} />
        <Nav openNav={open} onCloseNav={() => setOpen(false)} />
        <Main isRootPath={isRootPath}>
          <Outlet />
        </Main>
      </StyledRoot>
    </>
  );
}
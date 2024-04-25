import { useState, useEffect, useContext, useRef } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { styled, keyframes } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
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

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const { seriesId } = useParams();
  const location = useLocation();
  const isRootPath = location.pathname === '/' || seriesId || location.pathname === '/pro';
  const [adSpaceHeight, setAdSpaceHeight] = useState(0);
  const adSpaceRef = useRef(null);

  const { openSubscriptionDialog } = useSubscribeDialog();

  const { user } = useContext(UserContext);

  const titleSubtitlePairs = [
    {
      title: 'Get memeSRC Pro!',
      subtitle: 'Or don\'t. I don\'t care.',
    },
    {
      title: 'Get Pro. Be a Hero.',
      subtitle: 'Or stay basic I guess. Your choice.',
    },
    {
      title: 'Unlock memeSRC Pro!',
      subtitle: "Or forget you ever saw this.",
    },
    {
      title: "Pro is for pros.",
      subtitle: "But don't let that stop you.",
    },
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
  }, [user?.userDetails?.magicSubscription, selectedTitleSubtitle]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * titleSubtitlePairs.length);
    setSelectedTitleSubtitle(titleSubtitlePairs[randomIndex]);
  }, []);

  return (
    <>
      {user?.userDetails?.magicSubscription !== 'true' && (
        <AdSpace ref={adSpaceRef} onClick={openSubscriptionDialog}>
          <Box display="flex" alignItems="center">
            <img
              src="/assets/memeSRC-white.svg"
              alt="memeSRC logo"
              style={{ height: 32, marginRight: 16 }}
            />
            <Box>
              <Typography variant="h6" component="span" fontWeight={700} style={{ whiteSpace: 'normal' }}>
                {selectedTitleSubtitle?.title}
              </Typography>
              <Typography variant="subtitle1" component="span" color="rgba(255, 255, 255, 0.8)" ml={1} style={{ whiteSpace: 'normal' }}>
                {selectedTitleSubtitle?.subtitle}
              </Typography>
              <Typography variant="body2" component="span" color="rgba(255, 255, 255, 0.9)" ml={1} style={{ whiteSpace: 'normal' }}>
                Unlock perks like no ads, pro support, early access features, and more magic credits!
              </Typography>
            </Box>
          </Box>
        </AdSpace>
      )}
      <StyledRoot theme={null} adSpaceHeight={adSpaceHeight}>
        <Header onOpenNav={() => setOpen(true)} adSpaceHeight={adSpaceHeight} />
        <Nav openNav={open} onCloseNav={() => setOpen(false)} />
        <Main theme={null} isRootPath={isRootPath}>
          <Outlet />
        </Main>
      </StyledRoot>
    </>
  );
}

import { useState, useEffect } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { styled, keyframes } from '@mui/material/styles';
import { Box, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import Header from './header';
import Nav from './nav';

const StyledRoot = styled('div')(({ theme }) => ({
  display: 'flex',
  minHeight: '100%',
  overflow: 'hidden',
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

  useEffect(() => {
    // Close navigation bar whenever the route changes
    setOpen(false);
  }, [location]);

  return (
    <>
      <StyledRoot>
        <Header onOpenNav={() => setOpen(true)} />
        <Nav openNav={open} onCloseNav={() => setOpen(false)} />
        <Main isRootPath={isRootPath}>
          <Outlet />
        </Main>
      </StyledRoot>
    </>
  );
}

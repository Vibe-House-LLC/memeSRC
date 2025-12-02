import { useState, useEffect, useContext } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';

import Header from './header';
import Nav from './nav';
import { AdFreeDecemberDialog } from '../../components/AdFreeDecemberDialog';
import { UserContext } from '../../UserContext';
import { safeGetItem, safeSetItem } from '../../utils/storage';

const AD_FREE_DECEMBER_DIALOG_DISMISSED_KEY = 'adFreeDecemberDialog2025Dismissed';

export default function DashboardLayout() {
  const [navAnchorEl, setNavAnchorEl] = useState(null);
  const location = useLocation();
  const { user } = useContext(UserContext);
  const [showAdFreeDialog, setShowAdFreeDialog] = useState(() => {
    const dismissed = safeGetItem(AD_FREE_DECEMBER_DIALOG_DISMISSED_KEY);
    return dismissed !== 'true';
  });

  useEffect(() => {
    // Close navigation menu whenever the route changes
    setNavAnchorEl(null);
  }, [location.pathname]); // Use pathname specifically for more reliable tracking

  useEffect(() => {
    // Check if we should show the ad-free dialog
    const dismissed = safeGetItem(AD_FREE_DECEMBER_DIALOG_DISMISSED_KEY) === 'true';

    if (dismissed) {
      return;
    }

    // Don't show to pro users
    const currentUser = user;
    const isPro = currentUser && typeof currentUser === 'object' && currentUser.userDetails?.magicSubscription === 'true';
    if (isPro) {
      setShowAdFreeDialog(false);
      return;
    }

    // Only show in December 2025
    const now = new Date();
    const isDecember2025 = now.getMonth() === 11 && now.getFullYear() === 2025;

    if (isDecember2025 && !dismissed) {
      // Show dialog after a short delay to avoid jarring experience
      const timer = setTimeout(() => {
        setShowAdFreeDialog(true);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      setShowAdFreeDialog(false);
    }
  }, [user]);

  const handleCloseNav = () => {
    setNavAnchorEl(null);
  };

  const handleCloseAdFreeDialog = () => {
    setShowAdFreeDialog(false);
    safeSetItem(AD_FREE_DECEMBER_DIALOG_DISMISSED_KEY, 'true');
  };

  return (
    <>
      <Header onOpenNav={(event) => setNavAnchorEl(event.currentTarget)} />
      <Nav anchorEl={navAnchorEl} onClose={handleCloseNav} />
      <Box component="main" sx={{ width: '100%' }}>
        <Outlet />
      </Box>
      <AdFreeDecemberDialog open={showAdFreeDialog} onClose={handleCloseAdFreeDialog} />
    </>
  );
}

import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';

import Header from './header';
import Nav from './nav';


export default function DashboardLayout() {
  const [navAnchorEl, setNavAnchorEl] = useState(null);
  const location = useLocation();

  useEffect(() => {
    // Close navigation menu whenever the route changes
    setNavAnchorEl(null);
  }, [location.pathname]); // Use pathname specifically for more reliable tracking

  const handleCloseNav = () => {
    setNavAnchorEl(null);
  };

  return (
    <>
      <Header onOpenNav={(event) => setNavAnchorEl(event.currentTarget)} />
      <Nav anchorEl={navAnchorEl} onClose={handleCloseNav} />
      <Box component="main" sx={{ width: '100%' }}>
        <Outlet />
      </Box>
    </>
  );
}

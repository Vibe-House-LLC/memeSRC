import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';

import Header from './header';
import Nav from './nav';


export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Close navigation bar whenever the route changes
    setOpen(false);
  }, [location]);

  return (
    <>
      <Header onOpenNav={() => setOpen(true)} />
      <Nav openNav={open} onCloseNav={() => setOpen(false)} />
      <Box component="main" sx={{ width: '100%' }}>
        <Outlet />
      </Box>
    </>
  );
}

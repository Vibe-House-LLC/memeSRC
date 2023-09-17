import { useState, useEffect } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import Header from './header';
import Nav from './nav';

const StyledRoot = styled('div')({
  display: 'flex',
  minHeight: '100%',
  overflow: 'hidden',
});

const Main = styled('div')(({ theme, isRootPath }) => ({
  flexGrow: 1,
  width: '100%',
  paddingTop: isRootPath ? 0 : theme.spacing(6),
  paddingBottom: isRootPath ? 0 : theme.spacing(10),
  [theme.breakpoints.up('lg')]: {
    paddingTop: isRootPath ? 0 : theme.spacing(8),
  },
}));

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const { seriesId } = useParams();
  const location = useLocation();
  const isRootPath = location.pathname === '/' || seriesId;

  useEffect(() => {
    // Close navigation bar whenever the route changes
    setOpen(false);
  }, [location]);

  return (
    <StyledRoot>
      <Header onOpenNav={() => setOpen(true)} />
      <Nav openNav={open} onCloseNav={() => setOpen(false)} />
      <Main isRootPath={isRootPath}>
        <Outlet />
      </Main>
    </StyledRoot>
  );
}

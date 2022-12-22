import { Outlet, Link } from 'react-router-dom';
// @mui
import { styled } from '@mui/material/styles';
import { Button } from '@mui/material';
// components
import Logo from '../../components/logo';

// ----------------------------------------------------------------------

const StyledHeader = styled('header')(({ theme }) => ({
  top: 0,
  left: 0,
  lineHeight: 0,
  width: '100%',
  position: 'absolute',
  padding: theme.spacing(3, 3, 0),
  display: 'flex',
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(5, 5, 0),
  },
}));

// ----------------------------------------------------------------------

export default function SimpleLayout() {
  return (
    <>
      <StyledHeader>
        <Logo color="white"/>
        <Link to="/dashboard" style={{ marginLeft: 'auto', textDecoration: 'none' }}>
          <Button variant="contained" color="primary">Dashboard</Button>
        </Link>
      </StyledHeader>

      <Outlet />
    </>
  );
}

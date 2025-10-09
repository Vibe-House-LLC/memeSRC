import { Outlet, Link } from 'react-router-dom';
// @mui
import { styled } from '@mui/material/styles';
import { IconButton } from '@mui/material';
import { SettingsSuggest } from '@mui/icons-material';
// components
import Logo from '../../components/logo';

// ----------------------------------------------------------------------

// Detect if running in Electron
const isElectron = () => typeof window !== 'undefined' && window.process && window.process.type;

const StyledHeader = styled('header')(({ theme }) => ({
  top: 0,
  left: 0,
  lineHeight: 0,
  width: '100%',
  position: 'absolute',
  padding: theme.spacing(3, 3, 0),
  display: 'flex',
  // Desktop App - Make header draggable and add traffic light clearance (Electron only)
  // Traffic lights are at y: 20, ~16px tall, center at ~28px
  // Need 56px total height to vertically center content with traffic lights
  ...(isElectron() && {
    WebkitAppRegion: 'drag',
    paddingLeft: '80px !important',
    minHeight: '56px',
    height: '56px',
    alignItems: 'center',
    paddingTop: '0 !important',
    paddingBottom: '0 !important',
  }),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(5, 5, 0),
    ...(isElectron() && {
      paddingLeft: '80px !important',
      paddingTop: '0 !important',
    }),
  },
}));

// ----------------------------------------------------------------------

export default function SimpleLayout() {
  const electronStyles = isElectron() ? { WebkitAppRegion: 'no-drag' } : {};
  
  return (
    <>
      <StyledHeader>
        <Logo color="white" sx={electronStyles}/>
        <Link to="/dashboard" style={{ marginLeft: 'auto', textDecoration: 'none', ...electronStyles }}>
          <IconButton variant="contained" style={{color: "white"}}><SettingsSuggest /></IconButton>
        </Link>
      </StyledHeader>

      <Outlet />
    </>
  );
}

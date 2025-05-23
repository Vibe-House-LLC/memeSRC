import { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Chip, 
  useMediaQuery,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  alpha
} from '@mui/material';
import { useTheme, styled } from '@mui/material/styles';
import ScienceIcon from '@mui/icons-material/Science';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { UserContext } from '../../UserContext';

const StyledCollageNavItem = styled(ListItemButton)(({ theme, isActive }) => ({
  ...theme.typography.body2,
  minHeight: 72,
  position: 'relative',
  textTransform: 'capitalize',
  borderRadius: theme.shape.borderRadius * 2,
  marginBottom: theme.spacing(1),
  padding: theme.spacing(1.5, 2),
  background: isActive 
    ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
    : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  border: '1px solid rgba(255, 165, 0, 0.3)',
  boxShadow: '0 4px 16px rgba(255, 165, 0, 0.1)',
  color: '#fff',
  '&:hover': {
    background: 'linear-gradient(135deg, #2a2a3e 0%, #26314e 50%, #1f4470 100%)',
    borderColor: 'rgba(255, 165, 0, 0.5)',
    boxShadow: '0 6px 20px rgba(255, 165, 0, 0.15)',
    transform: 'translateY(-1px)',
  },
  transition: theme.transitions.create(['background', 'transform', 'box-shadow'], {
    duration: theme.transitions.duration.short,
  }),
}));

const StyledNavItemIcon = styled(ListItemIcon)({
  width: 24,
  height: 24,
  color: '#ff9800',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 'unset',
  marginRight: 12,
});

export default function CollageNavTeaser() {
  const theme = useTheme();
  const location = useLocation();
  const { user } = useContext(UserContext);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const isActive = location.pathname === '/collage';
  const authorized = (user?.userDetails?.magicSubscription === "true" || user?.['cognito:groups']?.includes('admins'));

  return (
    <StyledCollageNavItem
      component={Link}
      to="/collage"
      isActive={isActive}
      sx={{
        '&.active': {
          background: 'linear-gradient(135deg, #2a2a3e 0%, #26314e 50%, #1f4470 100%)',
          borderColor: 'rgba(255, 165, 0, 0.6)',
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <StyledNavItemIcon>
          <DashboardIcon sx={{ fontSize: 20 }} />
        </StyledNavItemIcon>
        
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="subtitle2" sx={{ 
              fontWeight: 700, 
              color: '#fff',
              fontSize: '0.9rem'
            }}>
              Collage Tool
            </Typography>
            <Chip 
              label="NEW" 
              size="small" 
              sx={{ 
                backgroundColor: '#ff9800',
                color: '#000',
                fontWeight: 'bold',
                fontSize: '0.65rem',
                height: 18,
                minWidth: 32,
                '& .MuiChip-label': {
                  padding: '0 4px'
                }
              }} 
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ScienceIcon sx={{ 
              fontSize: 14, 
              color: 'rgba(255, 152, 0, 0.8)'
            }} />
            <Typography variant="caption" sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.7rem',
              lineHeight: 1.2
            }}>
              Early access feature
            </Typography>
          </Box>
        </Box>
      </Box>
    </StyledCollageNavItem>
  );
} 
import { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ScienceIcon from '@mui/icons-material/Science';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { UserContext } from '../../UserContext';
import { StyledNavItem, StyledNavItemIcon } from './styles';

// Utility function to hash username for localStorage (same as in CollagePageLegacy)
const hashString = (str) => {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = ((hash * 33) - hash) + char;
    hash = Math.imul(hash, 1); // Convert to 32bit integer
  }
  return Math.abs(hash).toString();
};

// Utility functions for localStorage preference management (same as in CollagePageLegacy)
const getCollagePreferenceKey = (user) => {
  if (!user?.userDetails?.email) return 'memeSRC-collage-preference-anonymous';
  const hashedUsername = hashString(user.userDetails.email);
  return `memeSRC-collage-preference-${hashedUsername}`;
};

const getCollagePreference = (user) => {
  const key = getCollagePreferenceKey(user);
  return localStorage.getItem(key) || 'new'; // Default to new version
};

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
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255, 165, 0, 0.05), rgba(255, 165, 0, 0.08), rgba(255, 165, 0, 0.05), transparent)',
    animation: 'shimmer 4.5s ease-in-out infinite',
    zIndex: 1,
  },
  '@keyframes shimmer': {
    '0%': {
      left: '-100%',
    },
    '100%': {
      left: '100%',
    },
  },
  '&:hover': {
    background: 'linear-gradient(135deg, #2a2a3e 0%, #26314e 50%, #1f4470 100%)',
    borderColor: 'rgba(255, 165, 0, 0.5)',
    boxShadow: '0 6px 20px rgba(255, 165, 0, 0.15)',
    transform: 'translateY(-1px)',
  },
  transition: theme.transitions.create(['background', 'transform', 'box-shadow'], {
    duration: theme.transitions.duration.short,
  }),
  '& > *': {
    position: 'relative',
    zIndex: 2,
  },
}));

const StyledTeaserNavItemIcon = styled(ListItemIcon)({
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
  const location = useLocation();
  const { user } = useContext(UserContext);
  const isActive = location.pathname === '/collage';
  
  // Check if user prefers legacy collage tool
  const collagePreference = getCollagePreference(user);
  const prefersLegacy = collagePreference === 'legacy';

  // If user prefers legacy version, show normal nav item
  if (prefersLegacy) {
    return (
      <StyledNavItem
        component={Link}
        to="/collage"
        sx={{
          '&.active': {
            color: 'text.primary',
            bgcolor: 'action.selected',
            fontWeight: 'fontWeightBold',
          },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'none',  // Ensure even spacing like other nav items with chips
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <StyledNavItemIcon>
            <PhotoLibraryIcon />
          </StyledNavItemIcon>
          <ListItemText sx={{ fontSize: 16 }} disableTypography primary="collage" />
        </Box>
        <Chip
          label="NEW"
          color="info"
          size="small"
          sx={{
            fontWeight: 'bold',
            mx: '10px'
          }}
        />
      </StyledNavItem>
    );
  }

  // Otherwise, show fancy teaser
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
        <StyledTeaserNavItemIcon>
          <DashboardIcon sx={{ fontSize: 20 }} />
        </StyledTeaserNavItemIcon>
        
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
              label="BETA" 
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
              fontSize: '0.9rem',
              lineHeight: 1.2
            }}>
              Massive Update!
            </Typography>
          </Box>
        </Box>
      </Box>
    </StyledCollageNavItem>
  );
} 
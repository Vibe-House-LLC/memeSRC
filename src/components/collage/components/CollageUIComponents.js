import React from 'react';
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Paper,
  Typography
} from "@mui/material";

/**
 * Header component for the collage page
 */
export const PageHeader = ({ icon: Icon, title, isMobile }) => {
  return (
    <Typography variant="h3" gutterBottom sx={{ 
      display: 'flex', 
      alignItems: 'center',
      fontWeight: '700', 
      mb: isMobile ? 1.5 : 2.5,
      pl: isMobile ? 1 : 0,
      color: '#fff',
      fontSize: isMobile ? '2.2rem' : '2.5rem',
      textShadow: '0px 2px 4px rgba(0,0,0,0.15)'
    }}>
      <Icon sx={{ mr: 2, color: 'inherit', fontSize: 40 }} /> {title}
    </Typography>
  );
};

/**
 * Section heading with icon
 */
export const SectionHeading = ({ icon: Icon, title, sx = {} }) => {
  const theme = useTheme();
  
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center',
      mb: 1.25,
      paddingLeft: theme.spacing(0.5),
      paddingRight: theme.spacing(0.5),
      ...sx
    }}>
      <Icon sx={{ 
        mr: 1.5, 
        color: '#fff', 
        fontSize: '1.3rem' 
      }} />
      <Typography variant="h5" fontWeight={600} sx={{ color: '#fff' }}>
        {title}
      </Typography>
    </Box>
  );
};

/**
 * Standard paper container for sections
 */
export const SectionPaper = ({ children, sx = {} }) => {
  const theme = useTheme();
  
  return (
    <Paper
      variant="outlined"
      elevation={0}
      sx={{
        p: 2,
        height: '100%',
        borderRadius: 2,
        backgroundColor: theme.palette.mode === 'dark' 
          ? theme.palette.background.paper 
          : theme.palette.grey[50],
        overflowX: 'auto',
        ...sx
      }}
    >
      {children}
    </Paper>
  );
}; 
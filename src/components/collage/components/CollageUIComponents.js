import React from 'react';
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Typography
} from "@mui/material";

/**
 * Header component for the collage page
 */
export const PageHeader = ({ icon: Icon, title, isMobile }) => (
    <Box>
      <Typography variant="h3" gutterBottom sx={{ 
        display: 'flex', 
        alignItems: 'center',
        fontWeight: '700', 
        mb: isMobile ? 0.75 : 1.5,
        pl: isMobile ? 1 : 0,
        color: '#fff',
        fontSize: isMobile ? '2.2rem' : '2.5rem',
        textShadow: '0px 2px 4px rgba(0,0,0,0.15)'
      }}>
        <Icon sx={{ mr: 2, color: 'inherit', fontSize: 40 }} /> {title}
      </Typography>
      <Typography variant="subtitle1" sx={{ 
        color: 'text.secondary',
        mb: isMobile ? 2 : 2.5,
        pl: isMobile ? 1 : 5,
        maxWidth: '85%'
      }}>
        Merge images together to create multi-panel memes
      </Typography>
    </Box>
  );

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
        fontSize: '1.3rem' 
      }} />
      <Typography variant="h5" fontWeight={600}>
        {title}
      </Typography>
    </Box>
  );
}; 
import React from 'react';
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Grid,
  Typography,
  Container,
  Button
} from "@mui/material";
import { Settings, PhotoLibrary } from "@mui/icons-material";

import CollageSettingsStep from "../steps/CollageSettingsStep";
import CollageImagesStep from "../steps/CollageImagesStep";
import { SectionHeading } from './CollageUIComponents';

/**
 * Main container for the collage page content
 */
export const MainContainer = ({ children, isMobile, isMediumScreen }) => {
  return (
    <Box component="main" sx={{ 
      flexGrow: 1,
      pb: 6,
      width: '100%',
      overflowX: 'hidden'
    }}>
      <Container 
        maxWidth={isMediumScreen ? "xl" : "lg"} 
        sx={{ 
          pt: isMobile ? 2 : 3,
          px: isMobile ? 2 : 3,
          width: '100%'
        }}
        disableGutters={isMobile}
      >
        {children}
      </Container>
    </Box>
  );
};

/**
 * Paper container for the main content
 */
export const ContentPaper = ({ children, isMobile, sx = {} }) => {
  return (
    <Box sx={{ 
      width: '100%',
      ...sx
    }}>
      {children}
    </Box>
  );
};

/**
 * Unified layout for the collage tool that adapts to all screen sizes
 */
export const CollageLayout = ({ settingsStepProps, imagesStepProps, isMobile }) => {
  // Added console logging for debugging
  console.log("CollageLayout received props:", {
    settingsStepProps: {
      hasTemplate: !!settingsStepProps.selectedTemplate,
      hasAspectRatio: !!settingsStepProps.selectedAspectRatio,
      panelCount: settingsStepProps.panelCount,
      borderThickness: settingsStepProps.borderThickness
    },
    imagesStepProps: {
      hasTemplate: !!imagesStepProps.selectedTemplate,
      hasAspectRatio: !!imagesStepProps.selectedAspectRatio,
      imageCount: imagesStepProps.selectedImages.length,
      panelCount: imagesStepProps.panelCount
    }
  });
  
  return (
    <Grid container spacing={isMobile ? 2 : 3} sx={{ width: '100%', margin: 0 }}>
      {/* Settings Section */}
      <Grid item xs={12} md={6}>
        <Box sx={{ mb: isMobile ? 2 : 0 }}>
          <Typography variant="h6" sx={{ 
            display: 'flex', 
            alignItems: 'center',
            mb: 1
          }}>
            <Settings sx={{ mr: 1 }} /> Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Merge images together to create multi-panel memes
          </Typography>
          
          <CollageSettingsStep 
            {...settingsStepProps}
          />
        </Box>
      </Grid>
      
      {/* Images Section */}
      <Grid item xs={12} md={6}>
        <Box>
          <SectionHeading icon={PhotoLibrary} title="Images" />
          <CollageImagesStep {...imagesStepProps} />
        </Box>
      </Grid>
    </Grid>
  );
};

/**
 * Component for displaying the final collage result
 */
export const CollageResult = ({ finalImage, setFinalImage, isMobile, isMediumScreen, isLoading = false }) => {
  const theme = useTheme();
  
  return (
    <Box sx={{ 
      mt: 3,
      width: '100%',
      backgroundColor: theme.palette.common.black,
      borderRadius: 2,
      border: '1px solid rgba(255, 255, 255, 0.2)',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
    }}>
      {/* Image container - No extra wrappers */}
      <img 
        src={finalImage} 
        alt="Final Collage" 
        style={{ 
          width: '100%', 
          display: 'block',
          opacity: isLoading ? 0.7 : 1
        }} 
      />
      
      {/* Button container - Only "Create New" option */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center',
        gap: 2,
        p: 2,
        borderTop: '1px solid rgba(255, 255, 255, 0.15)',
        backgroundColor: 'rgba(0, 0, 0, 0.8)'
      }}>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={() => setFinalImage(null)}
          disabled={isLoading}
        >
          Create New Collage
        </Button>
      </Box>
    </Box>
  );
}; 
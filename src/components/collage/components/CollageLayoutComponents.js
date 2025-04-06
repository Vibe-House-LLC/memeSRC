import React, { useState } from 'react';
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Grid,
  Typography,
  Container,
  Button
} from "@mui/material";
import { Settings, PhotoLibrary, Launch as ExportIcon } from "@mui/icons-material";

import CollageSettingsStep from "../steps/CollageSettingsStep";
import CollageImagesStep from "../steps/CollageImagesStep";
import { SectionHeading } from './CollageUIComponents';
import ExportDialog from './ExportDialog';

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
export const CollageLayout = ({ settingsStepProps, imagesStepProps, finalImage, setFinalImage, isMobile }) => {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const handleOpenExportDialog = () => {
    setIsExportDialogOpen(true);
  };

  const handleCloseExportDialog = () => {
    setIsExportDialogOpen(false);
  };

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
    },
    hasFinalImage: !!finalImage
  });
  
  return (
    <>
      <Grid container spacing={isMobile ? 2 : 3} sx={{ width: '100%', margin: 0 }}>
        {/* Settings Section */}
        <Grid item xs={12} md={6}>
          <CollageSettingsStep 
            {...settingsStepProps}
          />
        </Grid>
        
        {/* Images Section */}
        <Grid item xs={12} md={6}>
          <Box>
            <SectionHeading icon={PhotoLibrary} title="Images" />
            <CollageImagesStep 
              {...imagesStepProps} 
              setFinalImage={setFinalImage}
              handleOpenExportDialog={handleOpenExportDialog}
            />
          </Box>
        </Grid>
      </Grid>

      <ExportDialog 
        open={isExportDialogOpen} 
        onClose={handleCloseExportDialog} 
        finalImage={finalImage} 
      />
    </>
  );
};

import React, { useState, useRef } from 'react';
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Grid,
  Typography,
  Container,
  Button,
  Stack,
  Divider,
  useMediaQuery
} from "@mui/material";
import { Settings, PhotoLibrary, Launch as ExportIcon, ArrowBack, KeyboardArrowDown } from "@mui/icons-material";

import CollageSettingsStep from "../steps/CollageSettingsStep";
import CollageImagesStep from "../steps/CollageImagesStep";
import BulkUploadSection from "./BulkUploadSection";
import { SectionHeading } from './CollageUIComponents';
import ExportDialog from './ExportDialog';

/**
 * Main container for the collage page content
 */
export const MainContainer = ({ children, isMobile, isMediumScreen }) => {
  return (
    <Box component="main" sx={{ 
      flexGrow: 1,
      pb: isMobile ? 3 : 6,
      width: '100%',
      overflowX: 'hidden',
      minHeight: '100vh',
      bgcolor: 'background.default'
    }}>
      <Container 
        maxWidth={isMediumScreen ? "xl" : "lg"} 
        sx={{ 
          pt: isMobile ? 1 : 3,
          px: isMobile ? 1 : 3,
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
      bgcolor: isMobile ? 'transparent' : 'background.paper',
      borderRadius: isMobile ? 0 : 2,
      overflow: 'hidden',
      ...sx
    }}>
      {children}
    </Box>
  );
};

/**
 * Unified layout for the collage tool that adapts to all screen sizes
 */
export const CollageLayout = ({ settingsStepProps, imagesStepProps, finalImage, setFinalImage, isMobile, onBackToEdit }) => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  
  // Ref for scrolling to settings on mobile
  const settingsRef = useRef(null);

  const handleOpenExportDialog = () => {
    setIsExportDialogOpen(true);
  };

  const handleCloseExportDialog = () => {
    setIsExportDialogOpen(false);
  };

  // Check if user has added at least one image
  const hasImages = imagesStepProps.selectedImages && imagesStepProps.selectedImages.length > 0;

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
    hasFinalImage: !!finalImage,
    hasImages: hasImages
  });
  
  return (
    <>
      {/* Bulk Upload Section - Full Width at Top */}
      <Box sx={{ 
        width: isMobile ? 'calc(100% - 16px)' : '100%', // Subtract margin space on mobile
        mb: 2,
        bgcolor: 'background.paper',
        borderRadius: 2,
        p: isMobile ? 2 : 3,
        mx: isMobile ? 1 : 0, // Add horizontal margins on mobile only
        border: 1,
        borderColor: 'divider'
      }}>
        <BulkUploadSection
          selectedImages={imagesStepProps.selectedImages}
          addMultipleImages={imagesStepProps.addMultipleImages}
          panelImageMapping={imagesStepProps.panelImageMapping}
          updatePanelImageMapping={imagesStepProps.updatePanelImageMapping}
          panelCount={imagesStepProps.panelCount}
          selectedTemplate={imagesStepProps.selectedTemplate}
          setPanelCount={settingsStepProps.setPanelCount}
        />
      </Box>

      {/* Main Content Layout */}
      <Box sx={{ width: '100%' }}>
        {!hasImages ? (
          // No images: Clean empty state, let the bulk uploader speak for itself
          null
        ) : isMobile ? (
          // Mobile: Stack vertically with better spacing and visual hierarchy
          <Stack spacing={3} sx={{ p: 2, px: 1 }}>
            {/* Settings Section First on Mobile */}
            <Box ref={settingsRef}>
              <CollageSettingsStep 
                {...settingsStepProps}
              />
            </Box>

            {/* Images Section */}
            <Box>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                mb: 2,
                pb: 1,
                borderBottom: 1,
                borderColor: 'divider'
              }} />
              <CollageImagesStep 
                {...imagesStepProps} 
                setFinalImage={setFinalImage}
                handleOpenExportDialog={handleOpenExportDialog}
              />
            </Box>
          </Stack>
        ) : (
          // Desktop/Tablet: Keep side-by-side layout but improve spacing
          <Box sx={{ 
            pb: isTablet ? 1 : 1.5,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            width: '100%'
          }}>
            {/* Settings Section */}
            <Box sx={{ 
              flex: { xs: 'none', md: '1 1 0' },
              width: { xs: '100%', md: '50%' },
              bgcolor: 'background.paper',
              borderRadius: 2,
              p: 3,
              border: 1,
              borderColor: 'divider'
            }}>
              {/* <SectionHeading icon={Settings} title="Settings" /> */}
              <CollageSettingsStep 
                {...settingsStepProps}
              />
            </Box>
            
            {/* Images Section */}
            <Box sx={{ 
              flex: { xs: 'none', md: '1 1 0' },
              width: { xs: '100%', md: '50%' },
              bgcolor: 'background.paper',
              borderRadius: 2,
              p: 3,
              border: 1,
              borderColor: 'divider'
            }}>
              <SectionHeading icon={PhotoLibrary} title="Your Collage" />
              <CollageImagesStep 
                {...imagesStepProps} 
                setFinalImage={setFinalImage}
                handleOpenExportDialog={handleOpenExportDialog}
              />
            </Box>
          </Box>
        )}
      </Box>

      <ExportDialog 
        open={isExportDialogOpen} 
        onClose={handleCloseExportDialog} 
        finalImage={finalImage} 
      />
    </>
  );
};

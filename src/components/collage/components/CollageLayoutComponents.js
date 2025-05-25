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
  useMediaQuery,
  Collapse,
  Paper,
  IconButton
} from "@mui/material";
import { Settings, PhotoLibrary, Launch as ExportIcon, ArrowBack, KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";

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
 * Collapsible Settings Section for Mobile
 */
const CollapsibleSettingsSection = ({ settingsStepProps, isMobile }) => {
  const theme = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleToggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  if (!isMobile) {
    return null; // Only render on mobile
  }

  return (
    <Paper
      elevation={1}
      sx={{
        mb: 2,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        overflow: 'hidden'
      }}
    >
      {/* Collapsible Header */}
      <Box
        onClick={handleToggleSettings}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          cursor: 'pointer',
          bgcolor: 'background.paper',
          borderBottom: isSettingsOpen ? 1 : 0,
          borderColor: 'divider',
          '&:hover': {
            bgcolor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(0, 0, 0, 0.02)'
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Settings sx={{ 
            mr: 1.5, 
            color: theme.palette.primary.main,
            fontSize: '1.5rem' 
          }} />
          <Typography 
            variant="h6" 
            fontWeight={600}
            sx={{ color: 'text.primary' }}
          >
            Collage Settings
          </Typography>
        </Box>
        
        <IconButton
          size="small"
          sx={{
            transition: 'transform 0.2s ease',
            transform: isSettingsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            color: 'text.secondary'
          }}
        >
          <KeyboardArrowDown />
        </IconButton>
      </Box>

      {/* Collapsible Content */}
      <Collapse in={isSettingsOpen} timeout="auto" unmountOnExit>
        <Box sx={{ p: 2, pt: 1 }}>
          <CollageSettingsStep {...settingsStepProps} />
        </Box>
      </Collapse>
    </Paper>
  );
};

/**
 * Unified layout for the collage tool that adapts to all screen sizes
 */
export const CollageLayout = ({ settingsStepProps, imagesStepProps, finalImage, setFinalImage, isMobile, onBackToEdit }) => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

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
    hasImages
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
          removeImage={imagesStepProps.removeImage}
        />
      </Box>

      {/* Main Content Layout */}
      <Box sx={{ width: '100%' }}>
        {!hasImages ? (
          // No images: Clean empty state, let the bulk uploader speak for itself
          null
        ) : isMobile ? (
          // Mobile: Stack vertically with collapsible settings
          <Stack spacing={2} sx={{ p: 2, px: 1 }}>
            {/* Collapsible Settings Section for Mobile */}
            <CollapsibleSettingsSection settingsStepProps={settingsStepProps} isMobile={isMobile} />

            {/* Images Section */}
            <Box sx={{ 
              width: '100%',
              overflow: 'hidden',
              '& #collage-preview-container': {
                width: '100% !important',
                maxWidth: '100% !important'
              }
            }}>
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
              <Box sx={{ 
                width: '100%',
                overflow: 'hidden',
                '& #collage-preview-container': {
                  width: '100% !important',
                  maxWidth: '100% !important'
                }
              }}>
                <CollageImagesStep 
                  {...imagesStepProps} 
                  setFinalImage={setFinalImage}
                  handleOpenExportDialog={handleOpenExportDialog}
                />
              </Box>
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

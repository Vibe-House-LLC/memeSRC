import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Container,
  Stack,
  useMediaQuery,
} from "@mui/material";
import { Settings, PhotoLibrary } from "@mui/icons-material";

import CollageSettingsStep from "../steps/CollageSettingsStep";
import CollageImagesStep from "../steps/CollageImagesStep";
import BulkUploadSection from "./BulkUploadSection";
import { SectionHeading } from './CollageUIComponents';
import DisclosureCard from './DisclosureCard';

const DEBUG_MODE = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (() => {
  try { return localStorage.getItem('meme-src-collage-debug') === '1'; } catch { return false; }
})();
const debugLog = (...args) => { if (DEBUG_MODE) console.log(...args); };

/**
 * Main container for the collage page content
 */
export const MainContainer = ({ children, isMobile, isMediumScreen }) => 
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
;

MainContainer.propTypes = {
  children: PropTypes.node.isRequired,
  isMobile: PropTypes.bool.isRequired,
  isMediumScreen: PropTypes.bool.isRequired,
};

/**
 * Paper container for the main content
 */
export const ContentPaper = ({ children, isMobile, sx = {} }) => 
    <Box sx={{ 
      width: '100%',
      bgcolor: isMobile ? 'transparent' : 'background.paper',
      borderRadius: isMobile ? 0 : 2,
      overflow: 'hidden',
      ...sx
    }}>
      {children}
    </Box>
;

ContentPaper.propTypes = {
  children: PropTypes.node.isRequired,
  isMobile: PropTypes.bool.isRequired,
  sx: PropTypes.object,
};

/**
 * Collapsible Settings Section for Mobile
 */
const CollapsibleSettingsSection = ({
  settingsStepProps,
  isMobile,
  settingsOpen,
  setSettingsOpen,
  settingsRef,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = settingsOpen !== undefined ? settingsOpen : internalOpen;

  if (!isMobile) {
    return null; // Only render on mobile
  }

  const handleSettingsToggle = (open) => {
    if (setSettingsOpen) {
      setSettingsOpen(open);
    } else {
      setInternalOpen(open);
    }
  };

  return (
    <Box ref={settingsRef}>
      <DisclosureCard
        title={isOpen ? "Hide Settings" : "Open Settings"}
        icon={Settings}
        defaultOpen={false}
        isMobile={isMobile}
        open={isOpen}
        onToggle={handleSettingsToggle}
        sx={{ mb: 2 }}
        contentSx={{ pt: 1 }}
      >
        <CollageSettingsStep {...settingsStepProps} />
      </DisclosureCard>
    </Box>
  );
};

CollapsibleSettingsSection.propTypes = {
  settingsStepProps: PropTypes.shape({
    selectedAspectRatio: PropTypes.string,
    selectedTemplate: PropTypes.object,
    panelCount: PropTypes.number.isRequired,
    borderThickness: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    setBorderThickness: PropTypes.func,
    setPanelCount: PropTypes.func.isRequired,
    setSelectedAspectRatio: PropTypes.func.isRequired,
    setSelectedTemplate: PropTypes.func.isRequired,
  }).isRequired,
  isMobile: PropTypes.bool.isRequired,
  settingsOpen: PropTypes.bool,
  setSettingsOpen: PropTypes.func,
  settingsRef: PropTypes.object,
};

/**
 * Unified layout for the collage tool that adapts to all screen sizes
 */
export const CollageLayout = ({
  settingsStepProps,
  imagesStepProps,
  finalImage,
  setFinalImage,
  isMobile,
  settingsOpen,
  setSettingsOpen,
  settingsRef,
}) => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const handleOpenExportDialog = () => {
    // CollageImagesStep handles the export dialog
  };

  // Check if user has added at least one image
  const hasImages = imagesStepProps.selectedImages && imagesStepProps.selectedImages.length > 0;

  debugLog("CollageLayout received props:", {
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
      {/* Main Content Layout */}
      <Box sx={{ width: '100%' }}>
        {!hasImages ? (
          // No images: Show bulk uploader with proper padding (clean starting point like legacy)
          <Box sx={{ p: isMobile ? 2 : 0, px: isMobile ? 1 : 0 }}>
            <BulkUploadSection
              selectedImages={imagesStepProps.selectedImages}
              addMultipleImages={imagesStepProps.addMultipleImages}
              panelImageMapping={imagesStepProps.panelImageMapping}
              updatePanelImageMapping={imagesStepProps.updatePanelImageMapping}
              panelCount={imagesStepProps.panelCount}
              selectedTemplate={imagesStepProps.selectedTemplate}
              setPanelCount={settingsStepProps.setPanelCount}
              removeImage={imagesStepProps.removeImage}
              replaceImage={imagesStepProps.replaceImage}
              bulkUploadSectionOpen={imagesStepProps.bulkUploadSectionOpen}
              onBulkUploadSectionToggle={imagesStepProps.onBulkUploadSectionToggle}
              onStartFromScratch={imagesStepProps.onStartFromScratch}
              libraryRefreshTrigger={imagesStepProps.libraryRefreshTrigger}
              initialLibrarySelectedKeys={Array.isArray(imagesStepProps?.libraryDialogConfig?.preselectKeys) ? imagesStepProps.libraryDialogConfig.preselectKeys : []}
            />
          </Box>
        ) : isMobile ? (
          // Mobile: Stack vertically with tighter spacing, NO BulkUploadSection after images are added
          <Stack spacing={1.5} sx={{ p: 1.5, px: 1 }}>
            {/* Collapsible Settings Section for Mobile */}
            <CollapsibleSettingsSection
              settingsStepProps={settingsStepProps}
              isMobile={isMobile}
              settingsOpen={settingsOpen}
              setSettingsOpen={setSettingsOpen}
              settingsRef={settingsRef}
            />

            {/* Images Section */}
            <Box sx={{ 
              width: '100%',
              overflow: 'visible', // Allow caption editor to overflow
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
          // Desktop/Tablet: Keep side-by-side layout, NO BulkUploadSection after images are added
          <Box sx={{ 
            pb: isTablet ? 1 : 1.5,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            width: '100%'
          }}>
            {/* Settings Section */}
            <Box ref={settingsRef} sx={{
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
                overflow: 'visible', // Allow caption editor to overflow
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
    </>
  );
};

CollageLayout.propTypes = {
  settingsStepProps: PropTypes.shape({
    selectedAspectRatio: PropTypes.string,
    selectedTemplate: PropTypes.object,
    panelCount: PropTypes.number.isRequired,
    borderThickness: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    setBorderThickness: PropTypes.func,
    setPanelCount: PropTypes.func.isRequired,
    setSelectedAspectRatio: PropTypes.func.isRequired,
    setSelectedTemplate: PropTypes.func.isRequired,
  }).isRequired,
  imagesStepProps: PropTypes.shape({
    selectedImages: PropTypes.array.isRequired,
    selectedTemplate: PropTypes.object,
    selectedAspectRatio: PropTypes.string,
    panelCount: PropTypes.number.isRequired,
    panelImageMapping: PropTypes.object.isRequired,
    addMultipleImages: PropTypes.func.isRequired,
    updatePanelImageMapping: PropTypes.func.isRequired,
    removeImage: PropTypes.func.isRequired,
    replaceImage: PropTypes.func.isRequired,
    bulkUploadSectionOpen: PropTypes.bool.isRequired,
    onBulkUploadSectionToggle: PropTypes.func.isRequired,
    onStartFromScratch: PropTypes.func,
    libraryRefreshTrigger: PropTypes.number,
  }).isRequired,
  finalImage: PropTypes.string,
  setFinalImage: PropTypes.func.isRequired,
  isMobile: PropTypes.bool.isRequired,
  onBackToEdit: PropTypes.func,
  settingsOpen: PropTypes.bool,
  setSettingsOpen: PropTypes.func,
  settingsRef: PropTypes.object,
};

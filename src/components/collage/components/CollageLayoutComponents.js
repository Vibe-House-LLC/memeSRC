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
import ExportDialog from './ExportDialog';
import DisclosureCard from './DisclosureCard';

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
const CollapsibleSettingsSection = ({ settingsStepProps, isMobile }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (!isMobile) {
    return null; // Only render on mobile
  }

  const handleSettingsToggle = (open) => {
    setIsSettingsOpen(open);
  };

  return (
    <DisclosureCard
      title={isSettingsOpen ? "Hide Settings" : "Open Settings"}
      icon={Settings}
      defaultOpen={false}
      isMobile={isMobile}
      onToggle={handleSettingsToggle}
      sx={{ mb: 2 }}
      contentSx={{ pt: 1 }}
    >
      <CollageSettingsStep {...settingsStepProps} />
    </DisclosureCard>
  );
};

CollapsibleSettingsSection.propTypes = {
  settingsStepProps: PropTypes.shape({
    selectedAspectRatio: PropTypes.number,
    selectedTemplate: PropTypes.object,
    panelCount: PropTypes.number.isRequired,
    borderThickness: PropTypes.number,
    setBorderThickness: PropTypes.func,
    setPanelCount: PropTypes.func.isRequired,
    onAspectRatioChange: PropTypes.func.isRequired,
    onTemplateChange: PropTypes.func.isRequired,
  }).isRequired,
  isMobile: PropTypes.bool.isRequired,
};

/**
 * Unified layout for the collage tool that adapts to all screen sizes
 */
export const CollageLayout = ({ settingsStepProps, imagesStepProps, finalImage, setFinalImage, isMobile }) => {
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
      {/* Main Content Layout */}
      <Box sx={{ width: '100%' }}>
        {!hasImages ? (
          // No images: Show bulk uploader with proper padding
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
            />
          </Box>
        ) : isMobile ? (
          // Mobile: Stack vertically with tighter spacing for all sections
          <Stack spacing={1.5} sx={{ p: 1.5, px: 1 }}>
            {/* Bulk Upload Section */}
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
            />

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
          <>
            {/* Bulk Upload Section - Full Width at Top for Desktop */}
            <Box sx={{ 
              width: '100%',
              mb: 2,
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
                replaceImage={imagesStepProps.replaceImage}
                bulkUploadSectionOpen={imagesStepProps.bulkUploadSectionOpen}
                onBulkUploadSectionToggle={imagesStepProps.onBulkUploadSectionToggle}
              />
            </Box>

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
          </>
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

CollageLayout.propTypes = {
  settingsStepProps: PropTypes.shape({
    selectedAspectRatio: PropTypes.number,
    selectedTemplate: PropTypes.object,
    panelCount: PropTypes.number.isRequired,
    borderThickness: PropTypes.number,
    setBorderThickness: PropTypes.func,
    setPanelCount: PropTypes.func.isRequired,
    onAspectRatioChange: PropTypes.func.isRequired,
    onTemplateChange: PropTypes.func.isRequired,
  }).isRequired,
  imagesStepProps: PropTypes.shape({
    selectedImages: PropTypes.array.isRequired,
    selectedTemplate: PropTypes.object,
    selectedAspectRatio: PropTypes.number,
    panelCount: PropTypes.number.isRequired,
    panelImageMapping: PropTypes.object.isRequired,
    addMultipleImages: PropTypes.func.isRequired,
    updatePanelImageMapping: PropTypes.func.isRequired,
    removeImage: PropTypes.func.isRequired,
    replaceImage: PropTypes.func.isRequired,
    bulkUploadSectionOpen: PropTypes.bool.isRequired,
    onBulkUploadSectionToggle: PropTypes.func.isRequired,
  }).isRequired,
  finalImage: PropTypes.string,
  setFinalImage: PropTypes.func.isRequired,
  isMobile: PropTypes.bool.isRequired,
  onBackToEdit: PropTypes.func,
};

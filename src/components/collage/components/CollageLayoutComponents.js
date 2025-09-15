import React from 'react';
import PropTypes from 'prop-types';
import { useTheme, alpha } from "@mui/material/styles";
import {
  Box,
  ButtonBase,
  Container,
  Stack,
  useMediaQuery,
  Typography,
} from "@mui/material";
import { Settings, PhotoLibrary, ArrowBack, DeleteForever, Save as SaveIcon, Close, InfoOutlined } from "@mui/icons-material";
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import CollageSettingsStep from "../steps/CollageSettingsStep";
import CollageImagesStep from "../steps/CollageImagesStep";
import BulkUploadSection from "./BulkUploadSection";
import { SectionHeading } from './CollageUIComponents';
// (DisclosureCard removed from mobile; using compact controls instead)

const DEBUG_MODE = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (() => {
  try { return localStorage.getItem('meme-src-collage-debug') === '1'; } catch { return false; }
})();
const debugLog = (...args) => { if (DEBUG_MODE) console.log(...args); };

const EDIT_TIP_STORAGE_KEY = 'memeSRC-collage-edit-tip-hidden';

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
 * Compact controls bar for mobile: Back, Save, Generate, Settings
 */
const MobileControlsBar = ({
  onBack,
  onGenerate,
  onReset,
  canGenerate,
  isGenerating,
  onToggleSettings,
  settingsOpen,
  showBack,
  showSettings = true,
  settingsRef,
}) => {
  return (
    <Box ref={settingsRef} sx={{ mb: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
        {showBack && (
          <Tooltip title="Back to Library" placement="top">
            <span>
              <IconButton aria-label="Back to Library" size="medium" onClick={onBack} sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
                <ArrowBack />
              </IconButton>
            </span>
          </Tooltip>
        )}

        {!showBack && onReset && (
          <Tooltip title="Start Over" placement="top">
            <span>
              <IconButton aria-label="Start Over" size="medium" onClick={onReset} color="error" sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
                <DeleteForever />
              </IconButton>
            </span>
          </Tooltip>
        )}

        <Button
          variant="contained"
          onClick={onGenerate}
          disabled={isGenerating || !canGenerate}
          startIcon={<SaveIcon />}
          sx={{
            flex: 1,
            minHeight: 44,
            fontWeight: 700,
            textTransform: 'none',
            background: 'linear-gradient(45deg, #6b42a1 0%, #7b4cb8 50%, #8b5cc7 100%)',
            border: '1px solid #8b5cc7',
            color: '#fff',
            '&:hover': { background: 'linear-gradient(45deg, #5e3992 0%, #6b42a1 50%, #7b4cb8 100%)' }
          }}
        >
          {isGenerating ? 'Generating Meme...' : 'Generate Meme'}
        </Button>

        {showSettings && (
          <Tooltip title={settingsOpen ? 'Hide Settings' : 'Show Settings'} placement="top">
            <span>
              <IconButton
                aria-label={settingsOpen ? 'Hide Settings' : 'Show Settings'}
                size="medium"
                onClick={onToggleSettings}
                sx={{ bgcolor: 'background.paper', border: 1, borderColor: settingsOpen ? 'primary.main' : 'divider' }}
              >
                <Settings />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Stack>
    </Box>
  );
};

MobileControlsBar.propTypes = {
  onBack: PropTypes.func,
  onGenerate: PropTypes.func,
  onReset: PropTypes.func,
  canGenerate: PropTypes.bool,
  isGenerating: PropTypes.bool,
  onToggleSettings: PropTypes.func,
  settingsOpen: PropTypes.bool,
  showBack: PropTypes.bool,
  showSettings: PropTypes.bool,
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
  onViewChange,
  onLibrarySelectionChange,
  onLibraryActionsReady,
  // New: optional controls for the mobile controls bar
  onBack,
  onGenerate,
  onReset,
  canGenerate,
  isGenerating,
}) => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const [editTipCollapsed, setEditTipCollapsed] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(EDIT_TIP_STORAGE_KEY) === '1';
    } catch (_) {
      return false;
    }
  });
  const handleCollapseEditTip = React.useCallback(() => {
    setEditTipCollapsed(true);
    try { localStorage.setItem(EDIT_TIP_STORAGE_KEY, '1'); } catch (_) { /* ignore */ }
  }, []);
  const handleExpandEditTip = React.useCallback(() => {
    setEditTipCollapsed(false);
    try { localStorage.removeItem(EDIT_TIP_STORAGE_KEY); } catch (_) { /* ignore */ }
  }, []);
  const selectedImageCount = Array.isArray(imagesStepProps?.selectedImages) ? imagesStepProps.selectedImages.length : 0;
  const shouldShowEditTip = !editTipCollapsed && selectedImageCount > 0;
  const shouldShowCollapsedTip = editTipCollapsed && selectedImageCount > 0;
  const isTouchDevice = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    return ('ontouchstart' in window) ||
      (typeof navigator !== 'undefined' && (navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0));
  }, []);
  const editVerb = isTouchDevice ? 'Tap' : 'Click';
  const renderEditTipCard = React.useCallback((sxOverrides = {}) => {
    if (!shouldShowEditTip) return null;
    return (
      <Box
        sx={{
          position: 'relative',
          borderRadius: 2,
          border: `1px solid ${alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.35 : 0.2)}`,
          backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.06),
          px: 2,
          py: { xs: 1.5, sm: 1.75 },
          pr: { xs: 3.5, sm: 2.5 },
          ...sxOverrides,
        }}
      >
        <IconButton
          size="small"
          aria-label="Collapse tips"
          onClick={handleCollapseEditTip}
          sx={{ position: 'absolute', top: 8, right: 8, color: 'primary.main' }}
        >
          <Close fontSize="small" />
        </IconButton>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <InfoOutlined sx={{ fontSize: 24, color: 'primary.main', mt: 0.25, flexShrink: 0 }} />
          <Box sx={{ pr: 2 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              Editing Tips
            </Typography>
            <Box
              component="ol"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
                pl: 2.5,
                mt: 0.75,
                mb: 0,
                color: 'text.secondary',
              }}
            >
              <Typography component="li" variant="body2">
                {`${editVerb} images & text to edit.`}
              </Typography>
              <Typography component="li" variant="body2">
                {`${editVerb} `}
                <Box component="span" sx={{ fontWeight: 700 }}>Generate Meme</Box>
                {' to finish.'}
              </Typography>
            </Box>
          </Box>
        </Stack>
      </Box>
    );
  }, [shouldShowEditTip, theme, editVerb, handleCollapseEditTip]);
  const renderCollapsedEditTip = React.useCallback((sxOverrides = {}) => {
    if (!shouldShowCollapsedTip) return null;
    const collapsedBg = theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.05)
      : alpha(theme.palette.grey[400], 0.05);
    const collapsedBorder = `1px solid ${theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.1)
      : alpha(theme.palette.grey[400], 0.12)}`;
    const collapsedTextColor = theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.5)
      : alpha(theme.palette.text.secondary, 0.7);
    const hoverBg = theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.08)
      : alpha(theme.palette.grey[400], 0.08);
    const hoverBorder = theme.palette.mode === 'dark'
      ? alpha(theme.palette.common.white, 0.16)
      : alpha(theme.palette.grey[400], 0.18);
    return (
      <ButtonBase
        onClick={handleExpandEditTip}
        aria-label="Show editing tips"
        sx={{
          width: '100%',
          textAlign: 'left',
          borderRadius: 2,
          ...sxOverrides,
          '&:hover .collapsed-tip-container': {
            backgroundColor: hoverBg,
            borderColor: `1px solid ${hoverBorder}`,
          },
        }}
      >
        <Box
          className="collapsed-tip-container"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 0.85,
            borderRadius: 2,
            border: collapsedBorder,
            backgroundColor: collapsedBg,
            px: 1.2,
            py: 0.6,
            width: '100%',
          }}
        >
          <Stack direction="row" spacing={0.7} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
            <InfoOutlined sx={{ fontSize: 19, color: collapsedTextColor, flexShrink: 0 }} />
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: collapsedTextColor, letterSpacing: 0.05, textTransform: 'none', whiteSpace: 'nowrap' }}
            >
              Editing Tips
            </Typography>
          </Stack>
          <Button
            size="small"
            variant="text"
            color="inherit"
            onClick={handleExpandEditTip}
            aria-label="Show editing tips"
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              color: collapsedTextColor,
              textDecoration: 'underline',
              px: 0.25,
              minWidth: 'auto',
              fontSize: '0.8rem',
              pointerEvents: 'none',
            }}
          >
            Show
          </Button>
        </Box>
      </ButtonBase>
    );
  }, [handleExpandEditTip, shouldShowCollapsedTip, theme]);
  const handleOpenExportDialog = () => {
    // CollageImagesStep handles the export dialog
  };

  // Check if user has added at least one image
  const hasImages = imagesStepProps.selectedImages && imagesStepProps.selectedImages.length > 0;

  // Notify parent about current view (editor vs library)
  React.useEffect(() => {
    if (typeof onViewChange === 'function') {
      onViewChange(hasImages ? 'editor' : 'library');
    }
  }, [hasImages, onViewChange]);

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
          <Box sx={{
            pt: isMobile ? 0.25 : 0,
            pb: isMobile ? 2 : 0,
            px: isMobile ? 1 : 0
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
              onStartFromScratch={imagesStepProps.onStartFromScratch}
              libraryRefreshTrigger={imagesStepProps.libraryRefreshTrigger}
              onLibrarySelectionChange={onLibrarySelectionChange}
              onLibraryActionsReady={onLibraryActionsReady}
            />
          </Box>
        ) : isMobile ? (
          // Mobile: Stack vertically with tighter spacing, NO BulkUploadSection after images are added
          <Stack spacing={2} sx={{ p: 1.5, px: 1 }}>
            {renderEditTipCard()}
            {renderCollapsedEditTip()}
            {/* Compact Controls Bar for Mobile */}
            <MobileControlsBar
              onBack={onBack}
              onGenerate={onGenerate}
              onReset={onReset}
              canGenerate={Boolean(canGenerate)}
              isGenerating={Boolean(isGenerating)}
              onToggleSettings={() => setSettingsOpen?.(!settingsOpen)}
              settingsOpen={Boolean(settingsOpen)}
              showBack={Boolean(onBack)}
              settingsRef={settingsRef}
            />

            {/* Collapsible mobile settings panel below controls (open state handled by parent) */}
            {settingsOpen && (
              <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, p: 1 }}>
                <CollageSettingsStep {...settingsStepProps} />
              </Box>
            )}

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
              {renderEditTipCard({ mt: 1, mb: 2 })}
              {renderCollapsedEditTip({ mt: 1, mb: 2 })}
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
  onViewChange: PropTypes.func,
  onLibrarySelectionChange: PropTypes.func,
  onLibraryActionsReady: PropTypes.func,
  // New controls props
  onBack: PropTypes.func,
  onGenerate: PropTypes.func,
  onReset: PropTypes.func,
  canGenerate: PropTypes.bool,
  isGenerating: PropTypes.bool,
};

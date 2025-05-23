import { useContext, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery, Box, Container, Typography, Button, Slide } from "@mui/material";
import { Dashboard, Save } from "@mui/icons-material";
import { UserContext } from "../UserContext";
import { useSubscribeDialog } from "../contexts/useSubscribeDialog";
import { aspectRatioPresets, layoutTemplates } from "../components/collage/config/CollageConfig";
import UpgradeMessage from "../components/collage/components/UpgradeMessage";
import WelcomeMessage from "../components/collage/components/WelcomeMessage";
import { CollageLayout } from "../components/collage/components/CollageLayoutComponents";
import { useCollageState } from "../components/collage/hooks/useCollageState";
import EarlyAccessFeedback from "../components/collage/components/EarlyAccessFeedback";
import CollageResultDialog from "../components/collage/components/CollageResultDialog";

const DEBUG_MODE = process.env.NODE_ENV === 'development';
const debugLog = (...args) => { if (DEBUG_MODE) console.log(...args); };

// Development utility - make resetWelcome available globally for testing
if (DEBUG_MODE && typeof window !== 'undefined') {
  window.resetCollageWelcome = () => {
    localStorage.removeItem('memeSRC-collage-v2.7-welcome-seen');
    console.log('Collage welcome screen reset - refresh page to see welcome again');
  };
}

/**
 * Helper function to crop canvas by removing pixels from edges
 */
const cropCanvas = (originalCanvas, cropAmount = 10) => {
  const croppedCanvas = document.createElement('canvas');
  const ctx = croppedCanvas.getContext('2d');
  
  // Calculate new dimensions (remove cropAmount pixels from each edge)
  const newWidth = Math.max(1, originalCanvas.width - (cropAmount * 2));
  const newHeight = Math.max(1, originalCanvas.height - (cropAmount * 2));
  
  croppedCanvas.width = newWidth;
  croppedCanvas.height = newHeight;
  
  // Draw the cropped portion of the original canvas
  ctx.drawImage(
    originalCanvas,
    cropAmount, cropAmount, newWidth, newHeight, // Source coordinates and dimensions
    0, 0, newWidth, newHeight // Destination coordinates and dimensions
  );
  
  return croppedCanvas;
};

/**
 * Helper function to get numeric border thickness percentage value from string/option
 */
const getBorderThicknessValue = (borderThickness, options) => {
  // If it's already a number, return it as percentage
  if (typeof borderThickness === 'number') {
    return borderThickness;
  }
  
  // Find matching option by label (case insensitive)
  const normalizedLabel = String(borderThickness).toLowerCase();
  const option = options.find(opt => 
    String(opt.label).toLowerCase() === normalizedLabel
  );
  
  // Return the percentage value if found, otherwise default to 2 (medium)
  return option ? option.value : 2;
};

export default function CollagePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();
  const authorized = (user?.userDetails?.magicSubscription === "true" || user?.['cognito:groups']?.includes('admins'));
  
  // State to control the result dialog
  const [showResultDialog, setShowResultDialog] = useState(false);
  
  // State to control button animation
  const [showAnimatedButton, setShowAnimatedButton] = useState(false);
  
  // State to control welcome screen for existing Pro users
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(() => {
    // Only show for authorized users who haven't seen the v2.7 welcome yet
    if (!authorized) return false;
    const hasSeenWelcome = localStorage.getItem('memeSRC-collage-v2.7-welcome-seen');
    debugLog(`[WELCOME DEBUG] authorized=${authorized}, hasSeenWelcome=${hasSeenWelcome}, showWelcome=${!hasSeenWelcome}`);
    return !hasSeenWelcome;
  });

  const {
    selectedImages, 
    panelImageMapping,
    panelTransforms,
    selectedTemplate,
    setSelectedTemplate,
    selectedAspectRatio,
    setSelectedAspectRatio,
    panelCount,
    setPanelCount,
    finalImage,
    setFinalImage,
    isCreatingCollage,
    setIsCreatingCollage,
    borderThickness,
    setBorderThickness,
    borderColor,
    setBorderColor,
    addImage,
    removeImage,
    updateImage,
    replaceImage,
    clearImages,
    updatePanelImageMapping,
    updatePanelTransform,
  } = useCollageState();

  // Check if all panels have images assigned (same logic as CollageImagesStep)
  const mappedPanels = Object.keys(panelImageMapping || {}).length;
  const allPanelsHaveImages = mappedPanels === panelCount && 
    Object.values(panelImageMapping || {}).every(imageIndex => 
      imageIndex !== undefined && 
      imageIndex !== null && 
      selectedImages[imageIndex]
    );

  const borderThicknessOptions = [
    { label: "None", value: 0 },        // 0%
    { label: "Thin", value: 0.5 },      // 0.5%
    { label: "Medium", value: 1.5 },    // 1.5%
    { label: "Thicc", value: 4 },       // 4%
    { label: "Thiccer", value: 7 },     // 7%
    { label: "XTRA THICC", value: 12 }, // 12%
    { label: "UNGODLY CHONK'D", value: 20 } // 20%
  ];

  // Get numeric border thickness value
  const borderThicknessValue = getBorderThicknessValue(borderThickness, borderThicknessOptions);

  // Log changes to border color and thickness
  useEffect(() => {
    debugLog(`[PAGE DEBUG] Border settings: color=${borderColor}, thickness=${borderThickness} (${borderThicknessValue}%)`);
  }, [borderColor, borderThickness, borderThicknessValue]);

  // Animate button in with delay when ready
  useEffect(() => {
    if (allPanelsHaveImages && !showResultDialog && !showWelcomeScreen) {
      const timer = setTimeout(() => {
        setShowAnimatedButton(true);
      }, 800); // 800ms delay for dramatic effect
      
      return () => clearTimeout(timer);
    }
    
    setShowAnimatedButton(false);
    return () => {}; // Return empty cleanup function for consistency
  }, [allPanelsHaveImages, showResultDialog, showWelcomeScreen]);

  // Handler to go back to edit mode
  const handleBackToEdit = () => {
    setShowResultDialog(false);
  };

  // Handler to continue from welcome screen
  const handleContinueFromWelcome = () => {
    debugLog('[WELCOME DEBUG] User clicked continue, marking welcome as seen');
    localStorage.setItem('memeSRC-collage-v2.7-welcome-seen', 'true');
    setShowWelcomeScreen(false);
    
    // Smooth scroll to top of the page
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Handler for floating button - triggers collage generation
  const handleFloatingButtonClick = async () => {
    debugLog('Floating button: Generating collage...');
    setIsCreatingCollage(true);
    
    const collagePreviewElement = document.querySelector('[data-testid="dynamic-collage-preview-root"]');

    if (!collagePreviewElement) {
      console.error('Collage preview element not found.');
      setIsCreatingCollage(false);
      return;
    }

    // Temporarily hide control icons by adding a CSS class
    collagePreviewElement.classList.add('export-mode');

    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      
      const canvas = await html2canvas(collagePreviewElement, {
        useCORS: true,
        allowTaint: true,
        logging: DEBUG_MODE,
        scale: window.devicePixelRatio * 2,
        onclone: (clonedDoc) => {
          try {
            const root = clonedDoc.querySelector('[data-testid="dynamic-collage-preview-root"]');
            if (!root) return;

            root.querySelectorAll('img').forEach((img) => {
              const computed = clonedDoc.defaultView.getComputedStyle(img);
              if (computed.getPropertyValue('object-fit') !== 'cover') return;

              const src = img.getAttribute('src');
              if (!src) return;

              const replacement = clonedDoc.createElement('div');
              replacement.style.width = '100%';
              replacement.style.height = '100%';
              replacement.style.backgroundImage = `url('${src}')`;
              replacement.style.backgroundSize = 'cover';
              replacement.style.backgroundPosition = 'center center';
              replacement.style.backgroundRepeat = 'no-repeat';

              const transform = computed.getPropertyValue('transform');
              if (transform && transform !== 'none') {
                replacement.style.transform = transform;
              }

              img.parentNode.replaceChild(replacement, img);
            });
          } catch (cloneErr) {
            console.error('onclone processing failed', cloneErr);
          }
        },
      });
      
      const croppedCanvas = cropCanvas(canvas);
      croppedCanvas.toBlob((blob) => {
        setFinalImage(blob);
        setShowResultDialog(true);
        debugLog("Floating button: Collage generated, cropped, and inline result shown.");
      }, 'image/png');

    } catch (err) {
      console.error('Error generating collage:', err);
    } finally {
      collagePreviewElement.classList.remove('export-mode');
      setIsCreatingCollage(false);
    }
  };

  // Props for settings step (selectedImages length might be useful for UI feedback)
  const settingsStepProps = {
    selectedImageCount: selectedImages.length, // Pass count instead of full array
    selectedTemplate,
    setSelectedTemplate,
    selectedAspectRatio,
    setSelectedAspectRatio,
    panelCount,
    setPanelCount,
    aspectRatioPresets,
    layoutTemplates,
    borderThickness,
    setBorderThickness,
    borderColor,
    setBorderColor,
    borderThicknessOptions
  };

  // Handler for when collage is generated - show inline result
  const handleCollageGenerated = () => {
    setShowResultDialog(true);
  };

  // Props for images step (pass the correct state and actions)
  const imagesStepProps = {
    selectedImages, // Pass the array of objects [{ originalUrl, displayUrl }, ...]
    panelImageMapping,
    panelTransforms,
    updatePanelImageMapping,
    updatePanelTransform,
    panelCount,
    selectedTemplate,
    selectedAspectRatio,
    borderThickness: borderThicknessValue, // Pass the numeric value
    borderColor,
    borderThicknessOptions,
    // Actions
    addImage,
    removeImage,
    updateImage,
    replaceImage,
    clearImages,
    // Custom handler for showing inline result
    onCollageGenerated: handleCollageGenerated,
  };

  // Log mapping changes for debugging
  useEffect(() => {
    if (DEBUG_MODE) {
      debugLog("CollagePage state update:", {
        imageCount: selectedImages.length,
        mappingKeys: Object.keys(panelImageMapping),
        transformKeys: Object.keys(panelTransforms),
        borderThickness,
        borderThicknessValue,
        borderColor,
        aspectRatio: selectedAspectRatio,
      });
    }
  }, [panelImageMapping, selectedImages, borderThickness, borderThicknessValue, borderColor, selectedAspectRatio, panelTransforms]);

  return (
    <>
      <Helmet><title>Collage Tool - Editor - memeSRC</title></Helmet>

      {!authorized ? (
        <UpgradeMessage openSubscriptionDialog={openSubscriptionDialog} previewImage="/assets/images/products/collage-tool.png" />
      ) : showWelcomeScreen ? (
        <WelcomeMessage 
          onContinue={handleContinueFromWelcome} 
          previewImage="/assets/images/products/collage-tool.png" 
        />
      ) : (
        <Box component="main" sx={{ 
          flexGrow: 1,
          pb: !showResultDialog && !showWelcomeScreen && allPanelsHaveImages ? 10 : (isMobile ? 3 : 6),
          width: '100%',
          overflowX: 'hidden',
          minHeight: '100vh',
          bgcolor: 'background.default'
        }}>
          <Container 
            maxWidth="xl" 
            sx={{ 
              pt: isMobile ? 1 : 3,
              px: isMobile ? 1 : 3,
              width: '100%'
            }}
            disableGutters={isMobile}
          >
            {/* Page Header */}
            <Box sx={{ mb: isMobile ? 2 : 3 }}>
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
                <Dashboard sx={{ mr: 2, color: 'inherit', fontSize: 40 }} /> 
                Collage Tool
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

            <EarlyAccessFeedback />

            <CollageLayout
              settingsStepProps={settingsStepProps}
              imagesStepProps={imagesStepProps}
              finalImage={finalImage}
              setFinalImage={setFinalImage}
              isMobile={isMobile}
              onBackToEdit={handleBackToEdit}
            />

            {/* Bottom Action Bar */}
            {!showResultDialog && !showWelcomeScreen && allPanelsHaveImages && (
              <Slide direction="up" in={showAnimatedButton} timeout={600}>
                <Box
                  sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    bgcolor: 'background.paper',
                    borderTop: 1,
                    borderColor: 'divider',
                    p: isMobile ? 2 : 3,
                    boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
                    backdropFilter: 'blur(20px)',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <Button
                    variant="contained"
                    onClick={handleFloatingButtonClick}
                    disabled={isCreatingCollage}
                    fullWidth={isMobile}
                    size="large"
                    startIcon={<Save />}
                    sx={{
                      py: 2,
                      px: isMobile ? 3 : 6,
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      textTransform: 'none',
                      borderRadius: 3,
                      background: 'linear-gradient(45deg, #3d2459 30%, #6b42a1 90%)',
                      border: '1px solid #8b5cc7',
                      boxShadow: '0 6px 20px rgba(107, 66, 161, 0.4)',
                      color: '#fff',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      maxWidth: isMobile ? 'none' : '400px',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #472a69 30%, #7b4cb8 90%)',
                        boxShadow: '0 8px 25px rgba(107, 66, 161, 0.6)',
                        transform: 'translateY(-2px) scale(1.02)',
                      },
                      '&:active': {
                        transform: 'translateY(0) scale(0.98)',
                      },
                      '&:disabled': {
                        background: 'linear-gradient(45deg, #757575 30%, #9E9E9E 90%)',
                        color: 'rgba(255, 255, 255, 0.7)',
                        boxShadow: 'none',
                        transform: 'none',
                      },
                      // Add subtle pulse animation when ready
                      '@keyframes pulse': {
                        '0%': {
                          boxShadow: '0 6px 20px rgba(107, 66, 161, 0.4)',
                        },
                        '50%': {
                          boxShadow: '0 6px 25px rgba(107, 66, 161, 0.7)',
                        },
                        '100%': {
                          boxShadow: '0 6px 20px rgba(107, 66, 161, 0.4)',
                        },
                      },
                      animation: !isCreatingCollage ? 'pulse 2s ease-in-out infinite' : 'none',
                    }}
                    aria-label="Create and save collage"
                  >
                    {isCreatingCollage ? 'Generating Collage...' : 'Generate Collage'}
                  </Button>
                </Box>
              </Slide>
            )}
          </Container>

          {/* Collage Result Dialog */}
          <CollageResultDialog
            open={showResultDialog}
            onClose={() => setShowResultDialog(false)}
            finalImage={finalImage}
          />
        </Box>
      )}
    </>
  );
}

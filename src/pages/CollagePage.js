import { useContext, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery, Box, Container, Typography, Button, Slide, Chip } from "@mui/material";
import { Dashboard, Save } from "@mui/icons-material";
import { useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from "../UserContext";
import { useSubscribeDialog } from "../contexts/useSubscribeDialog";
import { useCollector } from "../contexts/CollectorContext";
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

// Utility function to hash username for localStorage (needed for auto-forwarding)
const hashString = (str) => {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = ((hash * 33) - hash) + char;
    hash = Math.imul(hash, 1); // Convert to 32bit integer
  }
  return Math.abs(hash).toString();
};

// Utility functions for localStorage preference management (needed for auto-forwarding)
const getCollagePreferenceKey = (user) => {
  if (!user?.userDetails?.email) return 'memeSRC-collage-preference-anonymous';
  const hashedUsername = hashString(user.userDetails.email);
  return `memeSRC-collage-preference-${hashedUsername}`;
};

const getCollagePreference = (user) => {
  const key = getCollagePreferenceKey(user);
  return localStorage.getItem(key) || 'new'; // Default to new version
};

export default function CollagePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();
  const { clearAll } = useCollector();
  const authorized = (user?.userDetails?.magicSubscription === "true" || user?.['cognito:groups']?.includes('admins'));
  
  const navigate = useNavigate();
  const location = useLocation();
  
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



  // Note: BulkUploadSection is now completely hidden when images are present
  // No need for collapse state management since it's not shown after initial upload

  const {
    selectedImages, 
    panelImageMapping,
    panelTransforms,
    panelTexts,
    lastUsedTextSettings,
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
    addMultipleImages,
    removeImage,
    updateImage,
    replaceImage,
    clearImages,
    updatePanelImageMapping,
    updatePanelTransform,
    updatePanelText,
  } = useCollageState();

  // Check if all panels have images assigned (same logic as CollageImagesStep)
  const mappedPanels = Object.keys(panelImageMapping || {}).length;
  const allPanelsHaveImages = mappedPanels === panelCount && 
    Object.values(panelImageMapping || {}).every(imageIndex => 
      imageIndex !== undefined && 
      imageIndex !== null && 
      selectedImages[imageIndex]
    );

  // Check if user has added at least one image or wants to start from scratch
  const hasImages = selectedImages && selectedImages.length > 0;

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
    if (hasImages && allPanelsHaveImages && !showResultDialog && !showWelcomeScreen) {
      const timer = setTimeout(() => {
        setShowAnimatedButton(true);
      }, 800); // 800ms delay for dramatic effect
      
      return () => clearTimeout(timer);
    }
    
    setShowAnimatedButton(false);
    return undefined; // Consistent return for all code paths
  }, [hasImages, allPanelsHaveImages, showResultDialog, showWelcomeScreen]);



  // Auto-forwarding logic based on user preference
  useEffect(() => {
    if (authorized && user) {
      const preference = getCollagePreference(user);
      const searchParams = new URLSearchParams(location.search);
      const isForced = searchParams.get('force') === 'new';
      
      // Only auto-forward if not forced to new version
      if (preference === 'legacy' && !isForced && !showWelcomeScreen) {
        navigate('/collage-legacy');
      }
    }
  }, [user, navigate, location.search, authorized, showWelcomeScreen]);

  // Handle images passed from collector
  useEffect(() => {
    if (location.state?.fromCollector && location.state?.images) {
      debugLog('Loading images from collector:', location.state.images);
      
      // Transform images to the expected format, preserving subtitle data
      const transformedImages = location.state.images.map(item => {
        if (typeof item === 'string') {
          return item; // Already a URL
        }
        // Return the complete item with subtitle data preserved
        return {
          originalUrl: item.originalUrl || item.displayUrl || item,
          displayUrl: item.displayUrl || item.originalUrl || item,
          subtitle: item.subtitle || '',
          subtitleUserEdited: item.subtitleUserEdited || false,
          metadata: item.metadata || {}
        };
      });
      
      debugLog('Transformed collector images with subtitle data:', transformedImages);
      addMultipleImages(transformedImages);
      
      // Auto-assign images to panels like bulk upload does
      setTimeout(() => {
        // First adjust panel count if needed to accommodate all images
        const desiredPanelCount = Math.min(transformedImages.length, 5); // Max 5 panels supported
        if (transformedImages.length > panelCount && setPanelCount) {
          setPanelCount(desiredPanelCount);
          debugLog(`Adjusted panel count to ${desiredPanelCount} for ${transformedImages.length} images`);
        }
        
        // Then assign images to panels using the updated panel count
        const newMapping = {};
        const imagesToAssign = Math.min(transformedImages.length, desiredPanelCount);
        
        for (let i = 0; i < imagesToAssign; i += 1) {
          const panelId = selectedTemplate?.layout?.panels?.[i]?.id || `panel-${i + 1}`;
          newMapping[panelId] = i;
        }
        
        debugLog('Auto-assigning collector images to panels:', newMapping);
        updatePanelImageMapping(newMapping);
      }, 100); // Small delay to ensure images are added first
      
      // Clear the navigation state to prevent re-loading on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, addMultipleImages, navigate, location.pathname, panelCount, selectedTemplate, updatePanelImageMapping, setPanelCount]);

  // Note: BulkUploadSection auto-collapse logic removed since section is now hidden when images are present

  // Handler to go back to edit mode
  const handleBackToEdit = () => {
    setShowResultDialog(false);
  };

  // Handler to continue from welcome screen
  const handleContinueFromWelcome = () => {
    debugLog('[WELCOME DEBUG] User clicked continue, marking welcome as seen');
    localStorage.setItem('memeSRC-collage-v2.7-welcome-seen', 'true');
    setShowWelcomeScreen(false);
    
    // Use requestAnimationFrame to ensure the DOM has updated before scrolling
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }, 100); // Small delay to ensure the UI transition has started
    });
  };

  // Handler for floating button - triggers collage generation
  const handleFloatingButtonClick = async () => {
    debugLog('Floating button: Generating collage...');
    setIsCreatingCollage(true);
    
    // Find the canvas element instead of the HTML element
    const canvasElement = document.querySelector('[data-testid="canvas-collage-preview"]');

    if (!canvasElement) {
      console.error('Canvas collage preview element not found.');
      setIsCreatingCollage(false);
      return;
    }

    try {
      // Get the canvas blob directly - no need for html2canvas
      if (canvasElement.getCanvasBlob) {
        const blob = await canvasElement.getCanvasBlob();
        if (blob) {
          setFinalImage(blob);
          setShowResultDialog(true);
          debugLog("Floating button: Collage generated directly from canvas.");
          
          // Clear the collector since the collage has been successfully generated
          clearAll();
        } else {
          console.error('Failed to generate canvas blob.');
        }
      } else {
        // Fallback: use canvas toBlob method directly
        canvasElement.toBlob((blob) => {
          if (blob) {
            setFinalImage(blob);
            setShowResultDialog(true);
            debugLog("Floating button: Collage generated directly from canvas (fallback method).");
            
            // Clear the collector since the collage has been successfully generated
            clearAll();
          } else {
            console.error('Failed to generate canvas blob using fallback method.');
          }
        }, 'image/png');
      }
    } catch (err) {
      console.error('Error generating collage:', err);
    } finally {
      setIsCreatingCollage(false);
    }
  };

  // Helper function to convert aspect ratio string to number
  const getAspectRatioValue = (aspectRatio) => {
    if (typeof aspectRatio === 'number') return aspectRatio;
    
    // If it's a string like "16:9", convert to decimal
    if (typeof aspectRatio === 'string' && aspectRatio.includes(':')) {
      const [width, height] = aspectRatio.split(':').map(Number);
      return width / height;
    }
    
    // Find in presets if it's a preset name
    const preset = aspectRatioPresets.find(p => 
      p.label === aspectRatio || p.value === aspectRatio
    );
    
    return preset ? preset.value : parseFloat(aspectRatio) || 1;
  };

  // Props for settings step (selectedImages length might be useful for UI feedback)
  const settingsStepProps = {
    selectedImageCount: selectedImages.length, // Pass count instead of full array
    selectedTemplate,
    setSelectedTemplate,
    selectedAspectRatio: getAspectRatioValue(selectedAspectRatio),
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

  // Handler for starting from scratch without images
  const handleStartFromScratch = () => {
    debugLog('Starting from scratch - user chose to continue without images');
    // Add a placeholder to trigger showing the collage interface
    addMultipleImages(['__START_FROM_SCRATCH__']);
    // Scroll to top to show the collage interface
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Props for images step (pass the correct state and actions)
  const imagesStepProps = {
    selectedImages, // Pass the array of objects [{ originalUrl, displayUrl, subtitle?, subtitleUserEdited?, metadata? }, ...]
    panelImageMapping,
    panelTransforms,
    panelTexts,
    lastUsedTextSettings,
    updatePanelImageMapping,
    updatePanelTransform,
    updatePanelText,
    panelCount,
    selectedTemplate,
    selectedAspectRatio: getAspectRatioValue(selectedAspectRatio),
    borderThickness: borderThicknessValue, // Pass the numeric value
    borderColor,
    borderThicknessOptions,
    // Actions
    addImage,
    addMultipleImages,
    removeImage,
    updateImage,
    replaceImage,
    clearImages,
    // Custom handler for showing inline result
    onCollageGenerated: handleCollageGenerated,
    // BulkUploadSection state (kept for compatibility, though section is hidden when images present)
    bulkUploadSectionOpen: true, // Always true since we don't manage collapse state anymore
    onBulkUploadSectionToggle: () => {}, // No-op since BulkUploadSection is hidden when images are present
    onStartFromScratch: handleStartFromScratch, // Handler for starting without images
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
          pb: !showResultDialog && !showWelcomeScreen && hasImages && allPanelsHaveImages ? 8 : (isMobile ? 2 : 4),
          width: '100%',
          overflowX: 'hidden',
          minHeight: '100vh',
          bgcolor: 'background.default'
        }}>
          <Container 
            maxWidth="xl" 
            sx={{ 
              pt: isMobile ? 1 : 1.5,
              px: isMobile ? 1 : 2,
              width: '100%'
            }}
            disableGutters={isMobile}
          >
            {/* Page Header */}
            <Box sx={{ mb: isMobile ? 1 : 1.5 }}>
              <Typography variant="h3" gutterBottom sx={{ 
                display: 'flex', 
                alignItems: 'center',
                fontWeight: '700', 
                mb: isMobile ? 0.5 : 0.75,
                pl: isMobile ? 0.5 : 0,
                ml: isMobile ? 0 : -0.5,
                color: '#fff',
                fontSize: isMobile ? '2.2rem' : '2.5rem',
                textShadow: '0px 2px 4px rgba(0,0,0,0.15)'
              }}>
                <Dashboard sx={{ mr: 2, color: 'inherit', fontSize: 40 }} /> 
                Collage Tool
              </Typography>
              <Typography variant="subtitle1" sx={{ 
                color: 'text.secondary',
                mb: isMobile ? 2 : 1.5,
                pl: isMobile ? 1 : 0,
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
            {!showResultDialog && !showWelcomeScreen && hasImages && allPanelsHaveImages && (
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
                    p: isMobile ? 1.5 : 2,
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
                      py: 1.5,
                      px: isMobile ? 2.5 : 5,
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

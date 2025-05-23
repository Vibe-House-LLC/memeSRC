import { useContext, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery, Box, Container, Typography } from "@mui/material";
import { Dashboard } from "@mui/icons-material";
import { UserContext } from "../UserContext";
import { useSubscribeDialog } from "../contexts/useSubscribeDialog";
import { aspectRatioPresets, layoutTemplates } from "../components/collage/config/CollageConfig";
import UpgradeMessage from "../components/collage/components/UpgradeMessage";
import { CollageLayout } from "../components/collage/components/CollageLayoutComponents";
import { useCollageState } from "../components/collage/hooks/useCollageState";

const DEBUG_MODE = process.env.NODE_ENV === 'development';
const debugLog = (...args) => { if (DEBUG_MODE) console.log(...args); };

/**
 * Helper function to get numeric border thickness value from string/option
 */
const getBorderThicknessValue = (borderThickness, options) => {
  // If it's already a number, return it
  if (typeof borderThickness === 'number') {
    return borderThickness;
  }
  
  // Find matching option by label (case insensitive)
  const normalizedLabel = String(borderThickness).toLowerCase();
  const option = options.find(opt => 
    String(opt.label).toLowerCase() === normalizedLabel
  );
  
  // Return the value if found, otherwise default to 6 (thin)
  return option ? option.value : 6;
};

export default function CollagePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();
  const authorized = (user?.userDetails?.magicSubscription === "true" || user?.['cognito:groups']?.includes('admins'));
  
  // State to track if we're showing the result inline
  const [showInlineResult, setShowInlineResult] = useState(false);

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

  const borderThicknessOptions = [
    { label: "None", value: 0 }, { label: "Thin", value: 6 }, { label: "Medium", value: 16 },
    { label: "Thicc", value: 40 }, { label: "Thiccer", value: 80 }, { label: "XTRA THICC", value: 120 }
  ];

  // Get numeric border thickness value
  const borderThicknessValue = getBorderThicknessValue(borderThickness, borderThicknessOptions);

  // Log changes to border color and thickness
  useEffect(() => {
    debugLog(`[PAGE DEBUG] Border settings: color=${borderColor}, thickness=${borderThickness} (${borderThicknessValue}px)`);
  }, [borderColor, borderThickness, borderThicknessValue]);

  // Handler to go back to edit mode
  const handleBackToEdit = () => {
    setShowInlineResult(false);
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
    setShowInlineResult(true);
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
      ) : (
        <Box component="main" sx={{ 
          flexGrow: 1,
          pb: isMobile ? 3 : 6,
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
                {showInlineResult ? "Collage Result" : "Collage Tool"}
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

            <CollageLayout
              settingsStepProps={settingsStepProps}
              imagesStepProps={imagesStepProps}
              finalImage={finalImage}
              setFinalImage={setFinalImage}
              isMobile={isMobile}
              showInlineResult={showInlineResult}
              onBackToEdit={handleBackToEdit}
            />
          </Container>
        </Box>
      )}
    </>
  );
}

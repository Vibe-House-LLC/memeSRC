import { useContext, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import { Dashboard } from "@mui/icons-material";
import { UserContext } from "../UserContext";
import { useSubscribeDialog } from "../contexts/useSubscribeDialog";
import { aspectRatioPresets, layoutTemplates } from "../components/collage/config/CollageConfig";
import UpgradeMessage from "../components/collage/components/UpgradeMessage";
import { PageHeader } from "../components/collage/components/CollageUIComponents";
import { MainContainer, ContentPaper, CollageLayout } from "../components/collage/components/CollageLayoutComponents";
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
  
  // Return the value if found, otherwise default to 16 (medium)
  return option ? option.value : 16;
};

export default function CollagePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();
  const authorized = (user?.userDetails?.magicSubscription === "true" || user?.['cognito:groups']?.includes('admins'));

  const {
    selectedImages, 
    panelImageMapping,
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

  // Props for images step (pass the correct state and actions)
  const imagesStepProps = {
    selectedImages, // Pass the array of objects [{ originalUrl, displayUrl }, ...]
    panelImageMapping,
    updatePanelImageMapping,
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
  };

  // Log mapping changes for debugging
  useEffect(() => {
    if (DEBUG_MODE) {
      debugLog("CollagePage state update:", {
        imageCount: selectedImages.length,
        mappingKeys: Object.keys(panelImageMapping),
        borderThickness,
        borderThicknessValue,
        borderColor,
        aspectRatio: selectedAspectRatio,
      });
    }
  }, [panelImageMapping, selectedImages, borderThickness, borderThicknessValue, borderColor, selectedAspectRatio]);

  return (
    <>
      <Helmet><title>Collage Tool - Editor - memeSRC</title></Helmet>

      {!authorized ? (
        <UpgradeMessage openSubscriptionDialog={openSubscriptionDialog} previewImage="/assets/images/products/collage-tool.png" />
      ) : (
        <MainContainer isMobile={isMobile} isMediumScreen={isMediumScreen}>
          <PageHeader icon={Dashboard} title="Collage Tool" isMobile={isMobile} />
          <ContentPaper isMobile={isMobile}>
            <CollageLayout
              settingsStepProps={settingsStepProps}
              imagesStepProps={imagesStepProps} // Pass updated props
              isMobile={isMobile}
            />
          </ContentPaper>
        </MainContainer>
      )}
    </>
  );
}

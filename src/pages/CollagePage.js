// ===== FILE: /Users/davis/Projects/Vibe-House-LLC/memeSRC/src/pages/CollagePage.js =====

import { useContext, useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import { Dashboard } from "@mui/icons-material";

import { UserContext } from "../UserContext";
import { useSubscribeDialog } from "../contexts/useSubscribeDialog";
import { aspectRatioPresets, layoutTemplates, getLayoutsForPanelCount } from "../components/collage/config/CollageConfig";
import CollageImagesStep from "../components/collage/steps/CollageImagesStep";
import CollageSettingsStep from "../components/collage/steps/CollageSettingsStep";
import UpgradeMessage from "../components/collage/components/UpgradeMessage";
import { PageHeader } from "../components/collage/components/CollageUIComponents";
import { MainContainer, ContentPaper, CollageLayout, CollageResult } from "../components/collage/components/CollageLayoutComponents";
// Removed unused CanvasLayoutRenderer imports here
import { generateCollage } from "../components/collage/utils/CollageGenerator";
// Removed unused PanelMappingUtils import
import { useCollageState } from "../components/collage/hooks/useCollageState";

const DEBUG_MODE = process.env.NODE_ENV === 'development';
const debugLog = (...args) => { if (DEBUG_MODE) console.log(...args); };
const logError = (...args) => { console.error(...args); };

export default function CollagePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();
  const authorized = (user?.userDetails?.magicSubscription === "true" || user?.['cognito:groups']?.includes('admins'));

  const {
    selectedImages, // Now [{ originalUrl, displayUrl }, ...]
    panelImageMapping, // Still { panelId: imageIndex }
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
    addImage, // Adds new object
    removeImage, // Removes object
    updateImage, // Updates ONLY displayUrl
    replaceImage, // <-- NEW: Updates BOTH urls
    clearImages, // Clears objects
    updatePanelImageMapping, // Updates mapping
  } = useCollageState();

  const borderThicknessOptions = [
    { label: "None", value: 0 }, { label: "Thin", value: 6 }, { label: "Medium", value: 16 },
    { label: "Thicc", value: 40 }, { label: "Thiccer", value: 80 }, { label: "XTRA THICC", value: 120 }
  ];

  // Removed getCompatibleTemplates and related useEffect - logic is in useCollageState

  const handleCreateCollage = async () => {
    setIsCreatingCollage(true);
    try {
      debugLog(`[PAGE DEBUG] Creating collage...`);

      if (!selectedTemplate || !selectedAspectRatio || !panelImageMapping) {
        throw new Error("Missing required data for collage generation.");
      }

      // Extract display URLs for the generator
      const displayImageUrls = selectedImages.map(imgObj => imgObj.displayUrl);

      const dataUrl = await generateCollage({
        selectedTemplate,
        selectedAspectRatio,
        // panelCount is still useful for generator logic potentially
        panelCount: selectedTemplate?.layout?.panels?.length || panelCount,
        displayImageUrls, // <-- Pass only display URLs
        panelImageMapping, // Pass the mapping { panelId: imageIndex }
        borderThickness,
        borderColor,
        borderThicknessOptions,
        theme
      });

      setFinalImage(dataUrl);
    } catch (error) {
      logError('Error generating collage:', error);
       // TODO: Show user-friendly error message
    } finally {
      setIsCreatingCollage(false);
    }
  };

  // Log changes to border color
  useEffect(() => {
    debugLog(`[PAGE DEBUG] Border color changed to: ${borderColor}`);
  }, [borderColor]);


  // Props for settings step (selectedImages length might be useful for UI feedback)
  const settingsStepProps = {
    selectedImageCount: selectedImages.length, // Pass count instead of full array
    selectedTemplate,
    setSelectedTemplate,
    selectedAspectRatio,
    setSelectedAspectRatio,
    panelCount,
    setPanelCount,
    handleNext: handleCreateCollage,
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
    borderThickness,
    borderColor,
    borderThicknessOptions,
    // Actions
    addImage,
    removeImage,
    updateImage, // For crop result
    replaceImage, // For upload replacement
    clearImages,
    // Other
    handleNext: handleCreateCollage
  };

  // Log mapping changes for debugging
  useEffect(() => {
    if (DEBUG_MODE) {
      debugLog("CollagePage state update:", {
        imageCount: selectedImages.length,
        mappingKeys: Object.keys(panelImageMapping),
        // Uncomment to log full data (can be large)
        // selectedImagesData: selectedImages,
        // panelMappingData: panelImageMapping,
      });
    }
  }, [panelImageMapping, selectedImages]);

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
            {finalImage && (
              <CollageResult
                finalImage={finalImage}
                setFinalImage={setFinalImage}
                isMobile={isMobile}
                isMediumScreen={isMediumScreen}
                isLoading={isCreatingCollage}
              />
            )}
          </ContentPaper>
        </MainContainer>
      )}
    </>
  );
}

import { useContext, useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery } from "@mui/material";
import { Dashboard } from "@mui/icons-material";

import { UserContext } from "../UserContext";
import { useSubscribeDialog } from "../contexts/useSubscribeDialog";

// Import configuration
import { aspectRatioPresets, layoutTemplates, getLayoutsForPanelCount } from "../components/collage/config/CollageConfig";

// Import components from steps
import CollageImagesStep from "../components/collage/steps/CollageImagesStep";
import CollageSettingsStep from "../components/collage/steps/CollageSettingsStep";
import UpgradeMessage from "../components/collage/components/UpgradeMessage";

// Import UI components
import { PageHeader } from "../components/collage/components/CollageUIComponents";
import { 
  MainContainer, 
  ContentPaper, 
  CollageLayout,
  CollageResult 
} from "../components/collage/components/CollageLayoutComponents";

// Import utilities for collage generation
import { 
  calculateCanvasDimensions, 
  getAspectRatioValue
} from "../components/collage/utils/CanvasLayoutRenderer";

// Import the new collage generation service
import { generateCollage } from "../components/collage/utils/CollageGenerator";

// Import the panel mapping utilities
import { sanitizePanelImageMapping } from "../components/collage/utils/PanelMappingUtils";

// Import state management custom hook
import { useCollageState } from "../components/collage/hooks/useCollageState";

// Debug flag - only enable in development mode
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Collage page component - provides UI for creating collages
export default function CollagePage() {
  // Access theme for responsiveness and custom styling
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.down('md'));
  
  // User authentication and subscription context
  const { user } = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();
  
  // Determine if user is authorized to use the collage tool
  const authorized = (user?.userDetails?.magicSubscription === "true" || user?.['cognito:groups']?.includes('admins'));
  
  // Use our custom hook to manage collage state
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
    clearImages,
    updatePanelImageMapping,
  } = useCollageState();
  
  // Define border thickness options
  const borderThicknessOptions = [
    { label: "None", value: 0 },
    { label: "Thin", value: 20 },
    { label: "Medium", value: 50 },
    { label: "Thicc", value: 90 },
    { label: "Thiccer", value: 140 },
    { label: "XTRA THICC", value: 200 }
  ];

  // Get layouts compatible with the current panel count and aspect ratio
  const getCompatibleTemplates = () => {
    // Get all templates for the current panel count
    const panelTemplates = getLayoutsForPanelCount(panelCount);
    
    // Filter by aspect ratio compatibility
    const aspectRatioCategory = getAspectRatioPreset(selectedAspectRatio)?.category || 'any';
    
    const compatibleTemplates = panelTemplates.filter(template => {
      // Template is compatible if it has no aspect ratio constraint or matches the current one
      return !template.aspectRatioCategory || template.aspectRatioCategory === aspectRatioCategory || template.aspectRatioCategory === 'any';
    });
    
    // Sort by priority (lower number = higher priority)
    return compatibleTemplates.sort((a, b) => {
      if (a.priority !== undefined && b.priority !== undefined) {
        return a.priority - b.priority;
      }
      return 0;
    });
  };

  // Helper function to get the aspect ratio preset from its ID
  const getAspectRatioPreset = (id) => {
    return aspectRatioPresets.find(preset => preset.id === id);
  };

  // Select the most suitable template when panel count or aspect ratio changes
  useEffect(() => {
    const compatibleTemplates = getCompatibleTemplates();
    
    // If no template is selected or the current one isn't compatible, select the first one
    if (!selectedTemplate || 
        selectedTemplate.minImages > panelCount || 
        selectedTemplate.maxImages < panelCount) {
      
      if (compatibleTemplates.length > 0) {
        // Select the first (highest priority) compatible template
        setSelectedTemplate(compatibleTemplates[0]);
      } else {
        setSelectedTemplate(null);
      }
    }
  }, [panelCount, selectedAspectRatio, selectedTemplate]);

  // Submit the collage for creation
  const handleCreateCollage = async () => {
    setIsCreatingCollage(true);
    
    try {
      // Use the collage generator service
      const dataUrl = await generateCollage({
        selectedTemplate,
        selectedAspectRatio,
        panelCount,
        selectedImages,
        panelImageMapping,
        borderThickness,
        borderColor,
        borderThicknessOptions,
        theme
      });
      
      setFinalImage(dataUrl);
    } catch (error) {
      console.error('Error generating collage:', error);
    } finally {
      setIsCreatingCollage(false);
    }
  };

  // Props for the settings step component
  const settingsStepProps = {
    selectedImages,
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
  
  // Props for the images step component
  const imagesStepProps = {
    selectedImages,
    addImage,
    removeImage,
    updateImage,
    clearImages,
    panelImageMapping,
    updatePanelImageMapping,
    panelCount,
    selectedTemplate,
    selectedAspectRatio,
    borderThickness,
    borderColor,
    borderThicknessOptions,
    handleNext: handleCreateCollage
  };

  // Log the panel mapping for debugging
  useEffect(() => {
    if (DEBUG_MODE) {
      console.log("CollagePage panel mapping updated:", {
        mappingKeys: Object.keys(panelImageMapping),
        imageCount: selectedImages.length
      });
    }
  }, [panelImageMapping, selectedImages.length]);

  return (
    <>
      <Helmet>
        <title>Collage Tool - Editor - memeSRC</title>
      </Helmet>

      {!authorized ? (
        <UpgradeMessage 
          openSubscriptionDialog={openSubscriptionDialog} 
          previewImage="/assets/images/products/collage-tool.png"
        />
      ) : (
        <MainContainer isMobile={isMobile} isMediumScreen={isMediumScreen}>
          <PageHeader icon={Dashboard} title="Collage Tool" isMobile={isMobile} />
          
          <ContentPaper isMobile={isMobile}>
            <CollageLayout 
              settingsStepProps={settingsStepProps} 
              imagesStepProps={imagesStepProps} 
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

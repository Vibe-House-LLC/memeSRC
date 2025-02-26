import { useContext, useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useTheme } from "@mui/material/styles";
import { LoadingButton } from "@mui/lab";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Stack,
  useMediaQuery
} from "@mui/material";
import { 
  Settings,
  PhotoLibrary,
  Dashboard
} from "@mui/icons-material";

import BasePage from "./BasePage";
import { UserContext } from "../UserContext";
import { useSubscribeDialog } from "../contexts/useSubscribeDialog";

// Import styled components
import { PageContainer } from "../components/collage/styled/CollageStyled";

// Import configuration
import { aspectRatioPresets, layoutTemplates, getLayoutsForPanelCount } from "../components/collage/config/CollageConfig";

// Import step components
import CollageImagesStep from "../components/collage/steps/CollageImagesStep";
import CollageSettingsStep from "../components/collage/steps/CollageSettingsStep";
import CollagePanelsStep from "../components/collage/steps/CollagePanelsStep";

// Import navigation component
import CollageStepperNavigation from "../components/collage/navigation/CollageStepperNavigation";

export default function CollagePage() {
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('square');
  const [panelCount, setPanelCount] = useState(2); // Default panel count: 2
  const [activeStep, setActiveStep] = useState(0);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();

  const authorized = (user?.userDetails?.magicSubscription === "true" || user?.['cognito:groups']?.includes('admins'));

  // Steps definition for the guided workflow - reordered with Settings first
  const steps = [
    {
      label: 'Layout',
      description: 'Set panels, aspect ratio and template',
      icon: <Settings />
    },
    {
      label: 'Select Images',
      description: 'Choose up to 9 images',
      icon: <PhotoLibrary />
    },
    {
      label: 'Arrange',
      description: 'Position your images',
      icon: <Dashboard />
    }
  ];

  // Enhanced function to get compatible templates based on panel count and aspect ratio
  const getCompatibleTemplates = () => {
    // Use getLayoutsForPanelCount which handles prioritization based on aspect ratio
    if (typeof getLayoutsForPanelCount === 'function') {
      return getLayoutsForPanelCount(panelCount, selectedAspectRatio);
    }
    
    // If the function isn't available, fallback to basic filtering
    // First find templates that can handle the panel count
    const panelCompatible = layoutTemplates.filter(template => 
      template.minImages <= panelCount && template.maxImages >= panelCount
    );
    
    // Then sort by their suitability for the current aspect ratio
    // This is a simplified version of what getLayoutsForPanelCount does
    return panelCompatible.sort((a, b) => {
      // Auto layouts should be prioritized
      if (a.arrangement === 'auto') return -1;
      if (b.arrangement === 'auto') return 1;
      
      // Check if template has preferred aspect ratios
      const aPreference = a.aspectRatioPreference || [];
      const bPreference = b.aspectRatioPreference || [];
      
      const aHasPreference = aPreference.includes(selectedAspectRatio);
      const bHasPreference = bPreference.includes(selectedAspectRatio);
      
      // Prioritize templates that match the current aspect ratio
      if (aHasPreference && !bHasPreference) return -1;
      if (!aHasPreference && bHasPreference) return 1;
      
      return 0;
    });
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
  const handleCreateCollage = () => {
    console.log("Would create collage with:", {
      images: selectedImages,
      template: selectedTemplate,
      aspectRatio: selectedAspectRatio,
      panelCount
    });
    // Future implementation would use these values to create the collage
  };

  // Handle next step navigation
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  // Handle previous step navigation
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // Render the main page content with steppers
  const renderGuidedCollageCreator = () => {
    const compatibleTemplates = getCompatibleTemplates();
    
    // Show step content based on active step
    const getStepContent = (step) => {
      switch (step) {
        case 0:
          return (
            <CollageSettingsStep 
              selectedImages={selectedImages}
              selectedTemplate={selectedTemplate}
              setSelectedTemplate={setSelectedTemplate}
              selectedAspectRatio={selectedAspectRatio}
              setSelectedAspectRatio={setSelectedAspectRatio}
              panelCount={panelCount}
              setPanelCount={setPanelCount}
              handleNext={handleNext}
              aspectRatioPresets={aspectRatioPresets}
              layoutTemplates={layoutTemplates}
            />
          );
        case 1:
          return (
            <CollageImagesStep 
              selectedImages={selectedImages} 
              setSelectedImages={setSelectedImages}
              panelCount={panelCount}
              handleBack={handleBack} 
              handleNext={handleNext} 
            />
          );
        case 2:
          return (
            <CollagePanelsStep 
              handleBack={handleBack}
              handleCreateCollage={handleCreateCollage}
              selectedTemplate={selectedTemplate}
            />
          );
        default:
          return 'Unknown step';
      }
    };
    
    return (
      <Box sx={{ 
        maxWidth: '1200px', 
        mx: 'auto', 
        px: isMobile ? 1 : 3, 
        pt: isMobile ? 2 : 4 
      }}>
        <Paper 
          elevation={isMobile ? 0 : 1} 
          sx={{ 
            p: isMobile ? 1 : 3,
            borderRadius: 2,
            backgroundColor: theme.palette.background.default
          }}
        >
          <CollageStepperNavigation
            steps={steps}
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            selectedImages={selectedImages}
            selectedTemplate={selectedTemplate}
            compatibleTemplates={compatibleTemplates}
            panelCount={panelCount}
          >
            {getStepContent(activeStep)}
          </CollageStepperNavigation>
        </Paper>
      </Box>
    );
  };

  // Render subscription page with a cleaner design
  const renderSubscriptionPage = () => {
    return (
      <Grid container height="100%" justifyContent="center" alignItems="center" mt={4}>
        <Grid item xs={12} sm={10} md={8} lg={5}>
          <Paper 
            elevation={1} 
            sx={{ 
              p: isMobile ? 3 : 4, 
              borderRadius: 2, 
              textAlign: 'center',
              background: theme.palette.mode === 'dark' 
                ? 'linear-gradient(145deg, rgba(30,30,35,1) 0%, rgba(20,20,25,1) 100%)' 
                : 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)'
            }}
          >
            <Stack spacing={3} justifyContent="center">
              <img
                src="/assets/memeSRC-white.svg"
                alt="memeSRC logo"
                style={{ height: 48, margin: '0 auto' }}
              />
              <Typography variant="h4" textAlign="center" fontWeight="500">
                Collage Tool
              </Typography>
              <Typography 
                variant="body1" 
                textAlign="center" 
                color="text.secondary"
                sx={{ maxWidth: '400px', mx: 'auto' }}
              >
                While in Early Access, the Collage Tool is only available for memeSRC Pro subscribers.
              </Typography>
              <LoadingButton
                onClick={openSubscriptionDialog}
                variant="contained"
                size="large"
                sx={{ 
                  mt: 2, 
                  fontSize: 16, 
                  maxWidth: 200, 
                  mx: 'auto',
                  py: 1.2,
                  borderRadius: 2,
                  boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)'
                }}
              >
                Upgrade to Pro
              </LoadingButton>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  return (
    <BasePage
      pageTitle="Create a collage"
      breadcrumbLinks={[
        { name: "Edit", path: "/edit" },
        { name: "Collage Tool" },
      ]}
    >
      <Helmet>
        <title>Collage Tool - Editor - memeSRC</title>
      </Helmet>

      {!authorized ? renderSubscriptionPage() : renderGuidedCollageCreator()}
    </BasePage>
  );
}
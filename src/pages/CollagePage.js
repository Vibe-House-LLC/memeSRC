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
  Button,
  useMediaQuery,
  Divider,
  Container
} from "@mui/material";
import { 
  Settings,
  PhotoLibrary,
  Save,
  Dashboard
} from "@mui/icons-material";

import { UserContext } from "../UserContext";
import { useSubscribeDialog } from "../contexts/useSubscribeDialog";

// Import styled components
import { PageContainer } from "../components/collage/styled/CollageStyled";

// Import configuration
import { aspectRatioPresets, layoutTemplates, getLayoutsForPanelCount } from "../components/collage/config/CollageConfig";

// Import components from steps
import CollageImagesStep from "../components/collage/steps/CollageImagesStep";
import CollageSettingsStep from "../components/collage/steps/CollageSettingsStep";

export default function CollagePage() {
  const [selectedImages, setSelectedImages] = useState([]);
  const [panelImageMapping, setPanelImageMapping] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('portrait');
  const [panelCount, setPanelCount] = useState(2); // Default panel count of 2
  const [finalImage, setFinalImage] = useState(null);
  const [isCreatingCollage, setIsCreatingCollage] = useState(false);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.up('md')); // Added check for medium screens
  const { user } = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();

  const authorized = (user?.userDetails?.magicSubscription === "true" || user?.['cognito:groups']?.includes('admins'));

  // Enhanced function to get compatible templates based on panel count and aspect ratio
  const getCompatibleTemplates = () => {
    // Use getLayoutsForPanelCount which handles prioritization based on aspect ratio
    if (typeof getLayoutsForPanelCount === 'function') {
      // Ensure minimum panel count of 2 and maximum of 5
      const adjustedPanelCount = Math.max(2, Math.min(panelCount, 5));
      return getLayoutsForPanelCount(adjustedPanelCount, selectedAspectRatio);
    }
    
    // If the function isn't available, fallback to basic filtering
    // First find templates that can handle the panel count
    // Ensure minimum panel count of 2 and maximum of 5
    const adjustedPanelCount = Math.max(2, Math.min(panelCount, 5));
    const panelCompatible = layoutTemplates.filter(template => 
      template.minImages <= adjustedPanelCount && template.maxImages >= adjustedPanelCount
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
    setIsCreatingCollage(true);
    
    // Simulate creating the collage (would be replaced with actual implementation)
    setTimeout(() => {
      // In a real implementation, this would be where we generate the final collage
      console.log("Creating collage with:", {
        images: selectedImages,
        template: selectedTemplate,
        aspectRatio: selectedAspectRatio,
        panelCount,
        panelImageMapping
      });
      
      // Placeholder for setting the final image - would be replaced with actual image generation
      setFinalImage("https://placeholder.com/collage.jpg");
      setIsCreatingCollage(false);
    }, 1500);
  };

  // Render the main page content as a single page
  const renderSinglePageCollageCreator = () => {
    const compatibleTemplates = getCompatibleTemplates();
    
    return (
      <Box component="main" sx={{ 
        flexGrow: 1,
        pb: 6,
        width: '100%',
        overflowX: 'hidden' // Prevent horizontal scrolling
      }}>
        <Container 
          maxWidth={isMediumScreen ? "xl" : "lg"} 
          sx={{ 
            pt: isMobile ? 2 : 3,
            px: isMobile ? 2 : 3, // Adjusted horizontal padding on mobile
            width: '100%'
          }}
          disableGutters={isMobile} // Disable container gutters on mobile
        >
          <Typography variant="h4" gutterBottom sx={{ 
            display: 'flex', 
            alignItems: 'center',
            fontWeight: '500', 
            mb: isMobile ? 1 : 2,
            pl: isMobile ? 1 : 0
          }}>
            <Dashboard sx={{ mr: 1.5, color: 'text.primary' }} /> Collage Tool
          </Typography>
        
          <Paper 
            elevation={isMobile ? 0 : 1} 
            sx={{ 
              p: isMobile ? 0 : 2,
              pb: isMobile ? 0 : 2, // No bottom padding on mobile
              borderRadius: isMobile ? 0 : 2,
              backgroundColor: theme.palette.background.default,
              border: isMobile ? 'none' : undefined,
              width: '100%', // Ensure paper takes full width
              maxWidth: '100%', // Prevent overflow
              boxSizing: 'border-box' // Include padding in width calculation
            }}
          >
            {/* On mobile, render a single continuous flow */}
            {isMobile ? (
              <>
                {/* Settings */}
                <Box sx={{ 
                  px: 1, 
                  pb: 1,
                  width: '100%',
                  maxWidth: '100vw', // Ensure content doesn't exceed viewport width
                  overflowX: 'hidden' // Hide horizontal overflow
                }}>
                  <Box sx={{ 
                    width: '100%', 
                    overflowX: 'hidden',
                    position: 'relative',
                    mx: -1, // Negative margin for overflow control
                    px: 1 // Padding to offset negative margin
                  }}>
                    <CollageSettingsStep 
                      selectedImages={selectedImages}
                      selectedTemplate={selectedTemplate}
                      setSelectedTemplate={setSelectedTemplate}
                      selectedAspectRatio={selectedAspectRatio}
                      setSelectedAspectRatio={setSelectedAspectRatio}
                      panelCount={panelCount}
                      setPanelCount={setPanelCount}
                      aspectRatioPresets={aspectRatioPresets}
                      layoutTemplates={layoutTemplates}
                    />
                  </Box>
                </Box>

                {/* Images - Add a styled section heading to match other subsections */}
                <Box sx={{ 
                  px: 1, 
                  pb: 2,
                  width: '100%',
                  maxWidth: '100vw', // Ensure content doesn't exceed viewport width
                  overflowX: 'hidden' // Hide horizontal overflow
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    mb: 1
                  }}>
                    <PhotoLibrary sx={{ mr: 1, color: 'text.secondary', fontSize: '1.1rem' }} />
                    <Typography variant="body1" fontWeight={500}>
                      Images
                    </Typography>
                  </Box>
                  
                  <CollageImagesStep 
                    selectedImages={selectedImages} 
                    setSelectedImages={setSelectedImages}
                    panelCount={panelCount}
                    selectedTemplate={selectedTemplate}
                    selectedAspectRatio={selectedAspectRatio}
                    panelImageMapping={panelImageMapping}
                    setPanelImageMapping={setPanelImageMapping}
                  />
                
                  <Divider sx={{ my: 1 }} />
                  
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    mt: 1
                  }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      startIcon={<Save />}
                      onClick={handleCreateCollage}
                      disabled={!selectedTemplate || selectedImages.length === 0 || isCreatingCollage}
                      sx={{ 
                        py: 1.5, 
                        px: 4, 
                        borderRadius: 2,
                        fontWeight: '500',
                      }}
                    >
                      {isCreatingCollage ? "Creating..." : "Create Collage"}
                    </Button>
                    
                    {!selectedTemplate && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        Please select a layout template first.
                      </Typography>
                    )}
                    
                    {selectedTemplate && selectedImages.length === 0 && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        Please add at least one image.
                      </Typography>
                    )}
                  </Box>
                </Box>
              </>
            ) : (
              <>
                {/* For larger screens, use a grid layout */}
                <Grid container spacing={3} sx={{ width: '100%', margin: 0 }}>
                  {/* Settings Section */}
                  <Grid item xs={12} md={5} lg={4}>
                    <Paper
                      variant="outlined"
                      elevation={0}
                      sx={{
                        p: 2,
                        height: '100%',
                        borderRadius: 2,
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? theme.palette.background.paper 
                          : theme.palette.grey[50],
                        overflowX: 'hidden' // Prevent horizontal scrolling
                      }}
                    >
                      <Typography variant="h6" gutterBottom sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        mb: 1
                      }}>
                        <Settings sx={{ mr: 1, color: 'text.secondary' }} /> Settings
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        Select your preferred aspect ratio, number of panels, and layout template.
                      </Typography>
                      
                      <Box sx={{ 
                        width: '100%', 
                        overflowX: 'hidden',
                        position: 'relative',
                        mx: -1, // Negative margin for overflow control
                        px: 1, // Padding to offset negative margin
                        // Desktop specific styling
                        [theme.breakpoints.up('sm')]: {
                          mx: -1.5,
                          px: 1.5
                        }
                      }}>
                        <CollageSettingsStep 
                          selectedImages={selectedImages}
                          selectedTemplate={selectedTemplate}
                          setSelectedTemplate={setSelectedTemplate}
                          selectedAspectRatio={selectedAspectRatio}
                          setSelectedAspectRatio={setSelectedAspectRatio}
                          panelCount={panelCount}
                          setPanelCount={setPanelCount}
                          aspectRatioPresets={aspectRatioPresets}
                          layoutTemplates={layoutTemplates}
                        />
                      </Box>
                    </Paper>
                  </Grid>
                  
                  {/* Images Section */}
                  <Grid item xs={12} md={7} lg={8}>
                    <Paper
                      variant="outlined"
                      elevation={0}
                      sx={{
                        p: 2,
                        height: '100%',
                        borderRadius: 2,
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? theme.palette.background.paper 
                          : theme.palette.grey[50],
                        overflowX: 'hidden' // Prevent horizontal scrolling
                      }}
                    >
                      <Typography variant="h6" gutterBottom sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        mb: 1
                      }}>
                        <PhotoLibrary sx={{ mr: 1, color: 'text.secondary' }} /> Images
                      </Typography>
                      
                      <CollageImagesStep 
                        selectedImages={selectedImages} 
                        setSelectedImages={setSelectedImages}
                        panelCount={panelCount}
                        selectedTemplate={selectedTemplate}
                        selectedAspectRatio={selectedAspectRatio}
                        panelImageMapping={panelImageMapping}
                        setPanelImageMapping={setPanelImageMapping}
                      />
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        mt: 2
                      }}>
                        <Button
                          variant="contained"
                          color="primary"
                          size="large"
                          startIcon={<Save />}
                          onClick={handleCreateCollage}
                          disabled={!selectedTemplate || selectedImages.length === 0 || isCreatingCollage}
                          sx={{ 
                            py: 1.5, 
                            px: 4, 
                            borderRadius: 2,
                            fontWeight: '500',
                          }}
                        >
                          {isCreatingCollage ? "Creating..." : "Create Collage"}
                        </Button>
                        
                        {!selectedTemplate && (
                          <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                            Please select a layout template first.
                          </Typography>
                        )}
                        
                        {selectedTemplate && selectedImages.length === 0 && (
                          <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                            Please add at least one image.
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </>
            )}

            {/* Display Final Collage if available */}
            {finalImage && (
              <Box sx={{ 
                mt: 2, // Standardized margin top
                pb: 3,  // Standardized padding bottom
                width: '100%',
                overflowX: 'hidden' // Prevent horizontal scrolling
              }}>
                <Divider sx={{ mb: 3 }}> {/* Standardized margin */}
                  <Paper
                    elevation={3}
                    sx={{ 
                      px: 3, 
                      py: 1, 
                      borderRadius: 5,
                      backgroundColor: theme.palette.success.main,
                      color: '#fff'
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 500 }}>
                      Your Collage Is Ready!
                    </Typography>
                  </Paper>
                </Divider>
                
                <Paper 
                  elevation={isMobile ? 1 : 3}
                  sx={{ 
                    p: isMobile ? 2 : 3, 
                    maxWidth: isMediumScreen ? '900px' : '700px', // Increased max width for larger screens
                    mx: 'auto', 
                    bgcolor: theme.palette.background.paper,
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.success.main}`,
                    boxShadow: `0 0 20px ${theme.palette.mode === 'dark' ? 'rgba(0,200,83,0.2)' : 'rgba(0,200,83,0.1)'}`
                  }}
                >
                  <img 
                    src={finalImage} 
                    alt="Final Collage" 
                    style={{ width: '100%', borderRadius: theme.shape.borderRadius, marginBottom: 16 }} 
                  />
                  <Box sx={{ 
                    mt: 2, 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: 2,
                    flexWrap: 'wrap'
                  }}>
                    <Button 
                      variant="contained" 
                      color="primary"
                      startIcon={<Box component="span" sx={{ fontSize: 18 }}>📥</Box>}
                    >
                      Download Collage
                    </Button>
                    <Button 
                      variant="outlined" 
                      color="primary" 
                      onClick={() => setFinalImage(null)}
                    >
                      Create New Collage
                    </Button>
                  </Box>
                </Paper>
              </Box>
            )}
          </Paper>
        </Container>
      </Box>
    );
  };

  // Render subscription page with a cleaner design
  const renderSubscriptionPage = () => {
    return (
      <Box component="main" sx={{ 
        flexGrow: 1,
        pb: isMobile ? 6 : 8,
        width: '100%',
        overflowX: 'hidden' // Prevent horizontal scrolling
      }}>
        <Container maxWidth="lg" sx={{
          pt: isMobile ? 3 : 4,
          width: '100%'
        }}>
          <Typography variant="h4" gutterBottom sx={{ 
            display: 'flex', 
            alignItems: 'center',
            fontWeight: '500', 
            mb: isMobile ? 1.5 : 2,
            pl: isMobile ? 1 : 0,
            justifyContent: 'center'
          }}>
            <Dashboard sx={{ mr: 1.5, color: 'text.primary' }} /> Collage Tool
          </Typography>
          
          <Grid container height="100%" justifyContent="center" alignItems="center" mt={isMobile ? 2 : 3}>
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
                <Stack spacing={isMobile ? 2 : 3} justifyContent="center">
                  <img
                    src="/assets/memeSRC-white.svg"
                    alt="memeSRC logo"
                    style={{ height: 48, margin: '0 auto' }}
                  />
                  <Typography variant="h6" textAlign="center" fontWeight="500">
                    Pro Feature
                  </Typography>
                  <Typography 
                    variant="body1" 
                    textAlign="center" 
                    color="text.secondary"
                    sx={{ maxWidth: '400px', mx: 'auto' }}
                  >
                    The Collage Tool is available exclusively for memeSRC Pro subscribers.
                  </Typography>
                  <Button
                    onClick={openSubscriptionDialog}
                    variant="contained"
                    size="large"
                    sx={{ 
                      mt: 2, 
                      fontSize: 16, 
                      maxWidth: 200, 
                      mx: 'auto',
                      py: 1.2,
                      borderRadius: 2
                    }}
                  >
                    Upgrade to Pro
                  </Button>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    );
  };

  return (
    <>
      <Helmet>
        <title>Collage Tool - Editor - memeSRC</title>
      </Helmet>

      {!authorized ? renderSubscriptionPage() : renderSinglePageCollageCreator()}
    </>
  );
}
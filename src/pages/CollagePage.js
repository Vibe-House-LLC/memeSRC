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
import UpgradeMessage from "../components/collage/components/UpgradeMessage";

// Import new utilities for collage generation
import { 
  calculateCanvasDimensions, 
  renderTemplateToCanvas, 
  getAspectRatioValue
} from "../components/collage/utils/CanvasLayoutRenderer";

// Utility function to ensure panel mapping is valid
const sanitizePanelImageMapping = (mapping, imageArray, panelCount) => {
  if (!mapping || typeof mapping !== 'object') return {};
  
  // Create a clean mapping object with only valid entries
  const cleanMapping = {};
  
  Object.entries(mapping).forEach(([panelId, imageIndex]) => {
    // Convert panelId to number if it's a string number
    // Use Number.isNaN or alternative approach to avoid eslint error
    const numericPanelId = !Number.isNaN(Number(panelId)) ? Number(panelId) : panelId;
    
    // Only keep mapping if image index is valid
    if (imageIndex !== undefined && 
        imageIndex >= 0 && 
        imageIndex < imageArray.length && 
        imageArray[imageIndex]) {
      cleanMapping[numericPanelId] = imageIndex;
    }
  });
  
  return cleanMapping;
};

export default function CollagePage() {
  const [selectedImages, setSelectedImages] = useState([]);
  const [panelImageMapping, setPanelImageMapping] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('portrait');
  const [panelCount, setPanelCount] = useState(2); // Default panel count of 2
  const [finalImage, setFinalImage] = useState(null);
  const [isCreatingCollage, setIsCreatingCollage] = useState(false);
  const [borderThickness, setBorderThickness] = useState('medium'); // Default border thickness
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.up('md')); // Added check for medium screens
  const { user } = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();

  const authorized = (user?.userDetails?.magicSubscription === "true" || user?.['cognito:groups']?.includes('admins'));

  const borderThicknessOptions = [
    { label: 'None', value: 0 },
    { label: 'Thin', value: 12 },
    { label: 'Medium', value: 24 },
    { label: 'Thick', value: 40 },
    { label: 'Extra Thicc', value: 60 }
  ];

  // Add this new function to CollagePage.js
  const handlePanelClick = (panelId) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const imageUrl = URL.createObjectURL(file);
        
        // Find if there's already an image for this panel
        const existingMappingIndex = panelImageMapping[panelId];
        
        // If this panel already has an image, replace it in the selectedImages array
        if (existingMappingIndex !== undefined && selectedImages[existingMappingIndex]) {
          // Create a new array with the replaced image
          const newSelectedImages = [...selectedImages];
          newSelectedImages[existingMappingIndex] = imageUrl;
          setSelectedImages(newSelectedImages);
        } else {
          // Add the new image to selectedImages
          const newImageIndex = selectedImages.length;
          setSelectedImages([...selectedImages, imageUrl]);
          
          // Update the panel mapping
          setPanelImageMapping({
            ...panelImageMapping,
            [panelId]: newImageIndex
          });
        }
        
        // Force a re-render by updating a dependent state value
        if (selectedTemplate) {
          // This is a hack to force a re-render of the template
          setSelectedTemplate({...selectedTemplate});
        }
      }
    };
    fileInput.click();
  };

  // Clean up ObjectURLs when component unmounts or when images are replaced
  useEffect(() => {
    return () => {
      selectedImages.forEach(url => {
        if (url && typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

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
    
    // Sanitize the panel mapping before proceeding
    const cleanMapping = sanitizePanelImageMapping(panelImageMapping, selectedImages, panelCount);
    
    // Create an offscreen canvas for collage generation
    const generateCollage = async () => {
      try {
        // Calculate canvas dimensions based on aspect ratio
        const { width, height } = calculateCanvasDimensions(selectedAspectRatio);
        
        // Create a temporary canvas for rendering
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const ctx = tempCanvas.getContext('2d');
        
        if (!ctx) {
          console.error('Failed to get canvas context');
          setIsCreatingCollage(false);
          return;
        }
        
        // Collection of promises for loading images
        const imageLoadPromises = [];
        const panelRegions = [];
        
        // Get the numeric border thickness value
        const borderThicknessValue = borderThicknessOptions.find(
          option => option.label.toLowerCase() === borderThickness.toLowerCase()
        )?.value ?? 4; // Use nullish coalescing to default to 4 if not found
        
        // Call the renderTemplateToCanvas function manually
        await new Promise(resolve => {
          // Set up functions to receive rendering results
          const setRenderedImage = () => {}; // We don't need this for final render
          const setPanelRegions = (regions) => {
            panelRegions.push(...regions);
            resolve();
          };
          
          // Render the template to our canvas
          renderTemplateToCanvas({
            selectedTemplate,
            selectedAspectRatio,
            panelCount,
            theme,
            canvasRef: { current: tempCanvas },
            setPanelRegions,
            setRenderedImage,
            borderThickness: borderThicknessValue,
            selectedImages,
            panelImageMapping: cleanMapping
          });
        });
        
        // Load all selected images and draw them onto the canvas
        if (selectedImages.length > 0) {
          // Create a mapping from panel ID to image URL
          const panelToImageUrl = {};
          
          // Use panelImageMapping if available, otherwise assign sequentially
          if (cleanMapping && Object.keys(cleanMapping).length > 0) {
            // Use the existing mapping - panel ID to image index
            Object.entries(cleanMapping).forEach(([panelId, imageIndex]) => {
              if (selectedImages[imageIndex]) {
                panelToImageUrl[panelId] = selectedImages[imageIndex].url || selectedImages[imageIndex];
              }
            });
          } else {
            // Assign images sequentially to panels
            panelRegions.forEach((panel, index) => {
              if (index < selectedImages.length && selectedImages[index]) {
                panelToImageUrl[panel.id] = selectedImages[index].url || selectedImages[index];
              }
            });
          }
          
          // Clear the canvas before drawing images
          ctx.clearRect(0, 0, width, height);
          
          // Set background color
          ctx.fillStyle = theme.palette.mode === 'dark' ? '#121212' : '#f5f5f5';
          ctx.fillRect(0, 0, width, height);
          
          // Draw each panel with its assigned image
          panelRegions.forEach(panel => {
            // Ensure panel has a valid ID
            if (!panel.id) {
              return; // Skip panels without IDs
            }
            
            const imageUrl = panelToImageUrl[panel.id];
            
            if (imageUrl) {
              const promise = new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                  // Draw the image within its panel region
                  ctx.save();
                  ctx.beginPath();
                  ctx.rect(panel.x, panel.y, panel.width, panel.height);
                  ctx.clip();
                  
                  // Calculate dimensions to maintain aspect ratio while filling the panel
                  const imgAspect = img.width / img.height;
                  const panelAspect = panel.width / panel.height;
                  
                  let drawWidth = 0;
                  let drawHeight = 0;
                  let drawX = 0;
                  let drawY = 0;
                  
                  if (imgAspect > panelAspect) {
                    // Image is wider than panel (proportionally)
                    drawHeight = panel.height;
                    drawWidth = drawHeight * imgAspect;
                    drawX = panel.x + (panel.width - drawWidth) / 2;
                    drawY = panel.y;
                  } else {
                    // Image is taller than panel (proportionally)
                    drawWidth = panel.width;
                    drawHeight = drawWidth / imgAspect;
                    drawX = panel.x;
                    drawY = panel.y + (panel.height - drawHeight) / 2;
                  }
                  
                  // Draw the image scaled to fill the panel
                  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                  ctx.restore();
                  
                  // Draw panel border if needed
                  if (borderThicknessValue > 0) {
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = borderThicknessValue;
                    ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);
                  }
                  
                  resolve();
                };
                
                img.onerror = () => {
                  console.error(`Failed to load image: ${imageUrl}`);
                  // Draw placeholder for failed image
                  ctx.save();
                  ctx.fillStyle = '#FF6B6B';
                  ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
                  ctx.restore();
                  resolve(); // Still resolve so we don't block other images
                };
                
                img.src = imageUrl;
              });
              
              imageLoadPromises.push(promise);
            } else {
              // No image assigned, draw placeholder
              ctx.fillStyle = '#808080';
              ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
              
              // Draw panel border if needed
              if (borderThicknessValue > 0) {
                ctx.strokeStyle = 'white';
                ctx.lineWidth = borderThicknessValue;
                ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);
              }
            }
          });
          
          // Wait for all images to load and render
          await Promise.all(imageLoadPromises);
        }
        
        // Convert the canvas to a data URL and set it as the final image
        const dataUrl = tempCanvas.toDataURL('image/png');
        setFinalImage(dataUrl);
        setIsCreatingCollage(false);
        
      } catch (error) {
        console.error('Error generating collage:', error);
        setIsCreatingCollage(false);
      }
    };
    
    // Start the collage generation process
    generateCollage();
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
          <Typography variant="h3" gutterBottom sx={{ 
            display: 'flex', 
            alignItems: 'center',
            fontWeight: '700', 
            mb: isMobile ? 1.5 : 2.5,
            pl: isMobile ? 1 : 0,
            color: '#fff',
            fontSize: isMobile ? '2.2rem' : '2.5rem',
            textShadow: '0px 2px 4px rgba(0,0,0,0.15)'
          }}>
            <Dashboard sx={{ mr: 2, color: 'inherit', fontSize: 40 }} /> Collage Tool
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
                  overflowX: 'auto' // Changed from 'hidden' to 'auto' to allow scrolling indicators
                }}>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    mb: 1.5,
                    px: 0.5
                  }}>
                    Merge images together to create multi-panel memes
                  </Typography>
                  
                  <Box sx={{ 
                    width: '100%', 
                    overflowX: 'auto', // Changed from 'hidden' to 'auto' to allow scrolling indicators
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
                      borderThickness={borderThickness}
                      setBorderThickness={setBorderThickness}
                      borderThicknessOptions={borderThicknessOptions}
                    />
                  </Box>
                </Box>

                {/* Images - Add a styled section heading to match other subsections */}
                <Box sx={{ 
                  px: 1, 
                  pb: 2,
                  width: '100%',
                  maxWidth: '100vw', // Ensure content doesn't exceed viewport width
                  overflowX: 'auto' // Changed from 'hidden' to 'auto' to allow scrolling indicators
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    mb: 1.25,
                    paddingLeft: theme.spacing(0.5),
                    paddingRight: theme.spacing(0.5),
                  }}>
                    <PhotoLibrary sx={{ 
                      mr: 1.5, 
                      color: '#fff', 
                      fontSize: '1.3rem' 
                    }} />
                    <Typography variant="h5" fontWeight={600} sx={{ color: '#fff' }}>
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
                    borderThickness={borderThickness}
                    borderThicknessOptions={borderThicknessOptions}
                    onPanelClick={handlePanelClick}
                  />
                
                  <Divider sx={{ my: 1 }} />
                </Box>
              </>
            ) : (
              <>
                {/* For larger screens, use a grid layout */}
                <Grid container spacing={3} sx={{ width: '100%', margin: 0 }}>
                  {/* Settings Section */}
                  <Grid item xs={12} md={6} lg={6}>
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
                        overflowX: 'auto' // Changed from 'hidden' to 'auto' to allow scrolling indicators
                      }}
                    >
                      <Typography variant="h6" gutterBottom sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        mb: 1
                      }}>
                        <Settings sx={{ mr: 1, color: 'text.secondary' }} /> Settings
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
                        Merge images together to create multi-panel memes
                      </Typography>
                      
                      <Box sx={{ 
                        width: '100%', 
                        overflowX: 'auto', // Changed from 'hidden' to 'auto' to allow scrolling indicators
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
                          borderThickness={borderThickness}
                          setBorderThickness={setBorderThickness}
                          borderThicknessOptions={borderThicknessOptions}
                        />
                      </Box>
                    </Paper>
                  </Grid>
                  
                  {/* Images Section */}
                  <Grid item xs={12} md={6} lg={6}>
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
                        overflowX: 'auto' // Changed from 'hidden' to 'auto' to allow scrolling indicators
                      }}
                    >
                      <Typography variant="h5" gutterBottom sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        mb: 1.25,
                        fontWeight: 600,
                        color: '#fff'
                      }}>
                        <PhotoLibrary sx={{ mr: 1.5, color: '#fff', fontSize: '1.3rem' }} /> Images
                      </Typography>
                      
                      <CollageImagesStep 
                        selectedImages={selectedImages} 
                        setSelectedImages={setSelectedImages}
                        panelCount={panelCount}
                        selectedTemplate={selectedTemplate}
                        selectedAspectRatio={selectedAspectRatio}
                        panelImageMapping={panelImageMapping}
                        setPanelImageMapping={setPanelImageMapping}
                        borderThickness={borderThickness}
                        borderThicknessOptions={borderThicknessOptions}
                        onPanelClick={handlePanelClick}
                      />
                      
                      <Divider sx={{ my: 2 }} />
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
        renderSinglePageCollageCreator()
      )}
    </>
  );
}

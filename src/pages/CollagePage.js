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
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from "@mui/material";
import { 
  Settings,
  PhotoLibrary,
  Save,
  Dashboard,
  Close,
  AspectRatio
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

// Import new panel image editor component
import PanelImageEditor from "../components/collage/components/PanelImageEditor";

// Import new utilities for collage generation
import { 
  calculateCanvasDimensions, 
  renderTemplateToCanvas, 
  getAspectRatioValue
} from "../components/collage/utils/CanvasLayoutRenderer";

// Utility function to ensure panel mapping is valid
const sanitizePanelImageMapping = (imageArray, selectedImages, panelCount) => {
  console.log('Sanitizing panel mapping', { 
    imageArrayLength: imageArray.length, 
    selectedImagesLength: selectedImages.length, 
    panelCount 
  });
  
  // Create a map object with correct panel to image mappings
  const panelToImageMap = {};
  
  // Map each panel image to its index
  imageArray.forEach((img, index) => {
    // Check if img exists and panelId is defined (including 0)
    if (img && img.panelId !== undefined) {
      console.log(`Mapping panel ${img.panelId} to image index ${index}`);
      panelToImageMap[img.panelId] = index;
    }
  });
  
  console.log('Final panel to image mapping:', panelToImageMap);
  return panelToImageMap;
};

// Simple Image Preview Dialog Component
const ImagePreviewDialog = ({ open, imageUrl, aspectRatio, onClose, onCropClick }) => {
  const theme = useTheme();
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          backgroundColor: theme.palette.background.paper
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: `1px solid ${theme.palette.divider}`
      }}>
        <Typography variant="h6">Image Preview</Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 2, textAlign: 'center' }}>
        <Box sx={{ 
          position: 'relative',
          width: '100%',
          height: 'auto',
          maxHeight: '60vh',
          overflow: 'hidden',
          my: 2,
          borderRadius: 1,
          border: `1px solid ${theme.palette.divider}`
        }}>
          <img 
            src={imageUrl} 
            alt="Preview" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '60vh',
              objectFit: 'contain'
            }} 
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Click "Crop Image" to proceed to the image editor where you can crop, zoom, and rotate your image.
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={onCropClick} 
          variant="contained" 
          color="primary"
          startIcon={<AspectRatio />}
        >
          Crop Image
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default function CollagePage() {
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('portrait');
  const [panelCount, setPanelCount] = useState(2); // Default panel count of 2
  const [finalImage, setFinalImage] = useState(null);
  const [isCreatingCollage, setIsCreatingCollage] = useState(false);
  const [borderThickness, setBorderThickness] = useState('medium'); // Default border thickness
  
  // Add new state variables for the image editor
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [currentPanelId, setCurrentPanelId] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);
  const [currentPanelAspectRatio, setCurrentPanelAspectRatio] = useState(1);
  
  // Add new state for image preview dialog
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.up('md')); // Added check for medium screens
  const { user } = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();

  const authorized = (user?.userDetails?.magicSubscription === "true" || user?.['cognito:groups']?.includes('admins'));

  const borderThicknessOptions = [
    { label: 'None', value: 0 },
    { label: 'Thin', value: 2 },
    { label: 'Medium', value: 4 },
    { label: 'Thick', value: 8 },
    { label: 'Extra Thicc', value: 12 }
  ];

  // Select the most suitable template when panel count or aspect ratio changes
  useEffect(() => {
    const compatibleTemplates = getCompatibleTemplates();
    
    // If no template is selected or the current one isn't compatible, select the first one
    if (!selectedTemplate || 
        selectedTemplate.minImages > panelCount || 
        selectedTemplate.maxImages < panelCount) {
      
      if (compatibleTemplates.length > 0) {
        // Select the first (highest priority) compatible template
        
        // Create a template with regions
        const newTemplate = {
          ...compatibleTemplates[0],
          // Add regions based on panel count (these will be just placeholders until renderTemplateToCanvas creates the actual regions)
          regions: Array.from({ length: panelCount }, (_, i) => ({
            id: i,
            name: `panel-${i}`,
            x: 0,
            y: 0,
            width: 100,
            height: 100
          }))
        };
        
        setSelectedTemplate(newTemplate);
      } else {
        setSelectedTemplate(null);
      }
    }
  }, [panelCount, selectedAspectRatio]);
  
  // Find the handlePanelClick function and update it
  const handlePanelClick = (panelId) => {
    // Check if we have a selected template
    if (!selectedTemplate) {
      // Consider showing a user-friendly notification here
      return;
    }
    
    // Ensure that the template has regions defined
    if (!selectedTemplate.regions || !Array.isArray(selectedTemplate.regions)) {
      
      // Create placeholder regions if none exist
      if (selectedTemplate && !selectedTemplate.regions) {
        const placeholderRegions = Array.from({ length: panelCount }, (_, i) => ({
          id: i,
          name: `panel-${i}`,
          x: 0,
          y: 0,
          width: 100,
          height: 100
        }));
        
        // Update the template with placeholder regions
        setSelectedTemplate({
          ...selectedTemplate,
          regions: placeholderRegions
        });
        
        // Since we just updated the template, we need to return and let the
        // effect take place before continuing
        return;
      }
      
      return;
    }
    
    // Parse panelId to number if it's a string
    const numericPanelId = typeof panelId === 'string' ? parseInt(panelId, 10) : panelId;
    
    // Find the target panel from the template
    const targetPanel = selectedTemplate.regions.find(region => region.id === numericPanelId);
    if (!targetPanel) {
      return;
    }
    
    // Calculate aspect ratio
    const aspectRatio = targetPanel.width / targetPanel.height;
    
    // Check if we already have an image for this panel
    const existingImageIndex = selectedImages.findIndex(img => img.panelId === numericPanelId);
    
    if (existingImageIndex !== -1) {
      // We already have an image for this panel, open the editor directly
      setCurrentPanelId(numericPanelId);
      setCurrentImageUrl(selectedImages[existingImageIndex].imageUrl);
      setCurrentPanelAspectRatio(aspectRatio);
      setImageEditorOpen(true);
    } else {
      // We need to get an image first
      
      // Create a file input element
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      
      // Handle file selection
      fileInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          
          // Create a URL for the selected image
          const imageUrl = URL.createObjectURL(file);
          
          // Set state for preview dialog
          setCurrentPanelId(numericPanelId);
          setCurrentPanelAspectRatio(aspectRatio);
          setPreviewImageUrl(imageUrl);
          setImagePreviewOpen(true);
        }
      };
      
      // Trigger the file selection dialog
      fileInput.click();
    }
  };
  
  // Add a new function to handle the transition from preview to editor
  const handleCropImageClick = () => {
    // Close the preview dialog
    setImagePreviewOpen(false);
    
    // Set the current image URL from the preview
    setCurrentImageUrl(previewImageUrl);
    
    // Open the editor dialog
    setTimeout(() => {
      setImageEditorOpen(true);
    }, 50);
  };
  
  // Update the handleSaveEditedImage function
  const handleSaveEditedImage = (panelId, editedImageUrl) => {
    console.log('Saving edited image', { panelId, editedImageUrl: `${editedImageUrl.substring(0, 50)}...` });
    
    // Use the passed panelId instead of relying on currentPanelId
    // Important: Check if panelId is undefined or null, not just truthy/falsy
    // because panelId can be 0 which is falsy but valid
    const targetPanelId = panelId !== undefined && panelId !== null ? panelId : currentPanelId;
    
    if (targetPanelId === undefined || targetPanelId === null) {
      console.error('No panel ID provided for saving edited image');
      return;
    }
    
    // Find the index of the selected panel in selectedImages
    const existingImageIndex = selectedImages.findIndex(img => img.panelId === targetPanelId);
    
    // Check if we should update or add a new image
    if (existingImageIndex !== -1) {
      // Create a copy of the current selectedImages array
      const updatedImages = [...selectedImages];
      
      // Get the old image URL to revoke it later
      const oldImageUrl = updatedImages[existingImageIndex].imageUrl;
      
      // Update the image at the existing index
      updatedImages[existingImageIndex] = {
        ...updatedImages[existingImageIndex],
        imageUrl: editedImageUrl
      };
      
      // Update state
      setSelectedImages(updatedImages);
      
      // Revoke old object URL to free up memory
      if (oldImageUrl && oldImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldImageUrl);
      }
    } else {
      // Add a new image to the array
      setSelectedImages([
        ...selectedImages,
        { panelId: targetPanelId, imageUrl: editedImageUrl }
      ]);
    }
    
    // Close the editor
    setImageEditorOpen(false);
    
    // Clear current panel state
    setCurrentPanelId(null);
    setCurrentImageUrl(null);
    setCurrentPanelAspectRatio(1);
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

  // Add an effect to handle initial template selection
  useEffect(() => {
    // If no template is selected yet, select one on component mount
    if (!selectedTemplate) {
      const compatibleTemplates = getCompatibleTemplates();
      
      if (compatibleTemplates.length > 0) {
        // Create a template with regions
        const initialTemplate = {
          ...compatibleTemplates[0],
          // Add regions based on panel count
          regions: Array.from({ length: panelCount }, (_, i) => ({
            id: i,
            name: `panel-${i}`,
            x: 0,
            y: 0,
            width: 100,
            height: 100
          }))
        };
        
        setSelectedTemplate(initialTemplate);
      }
    }
  }, [panelCount, selectedTemplate]); // Include panelCount in dependencies

  // Submit the collage for creation
  const handleCreateCollage = () => {
    setIsCreatingCollage(true);
    
    // Log the selected images before sanitizing
    console.log('Selected images before sanitizing:', selectedImages);
    
    // Sanitize the panel mapping before proceeding
    const cleanMapping = sanitizePanelImageMapping(selectedImages, selectedImages, panelCount);
    
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
        
        console.log('About to draw layout with border thickness:', borderThicknessValue, 'Type:', typeof borderThicknessValue, 'Will draw borders:', borderThicknessValue > 0);
        
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
            console.log('Using clean mapping:', cleanMapping);
            Object.entries(cleanMapping).forEach(([panelId, imageIndex]) => {
              // Convert panelId to number if it's a string
              const numericPanelId = typeof panelId === 'string' ? parseInt(panelId, 10) : panelId;
              console.log(`Mapping panel ${numericPanelId} to image at index ${imageIndex}:`, selectedImages[imageIndex]);
              
              // Check if the image exists at the specified index
              if (selectedImages[imageIndex]) {
                panelToImageUrl[numericPanelId] = selectedImages[imageIndex].imageUrl;
              }
            });
          } else {
            // Assign images sequentially to panels
            console.log('No clean mapping available, assigning sequentially');
            panelRegions.forEach((panel, index) => {
              // Ensure panel.id is treated as a number
              const numericPanelId = typeof panel.id === 'string' ? parseInt(panel.id, 10) : panel.id;
              console.log(`Sequential mapping: panel ${numericPanelId} to image at index ${index}:`, index < selectedImages.length ? selectedImages[index] : 'No image');
              
              if (index < selectedImages.length && selectedImages[index]) {
                panelToImageUrl[numericPanelId] = selectedImages[index].imageUrl;
              }
            });
          }
          
          console.log('Final panel to image URL mapping:', panelToImageUrl);
          
          // Clear the canvas before drawing images
          ctx.clearRect(0, 0, width, height);
          
          // Set background color
          ctx.fillStyle = theme.palette.mode === 'dark' ? '#121212' : '#f5f5f5';
          ctx.fillRect(0, 0, width, height);
          
          // Draw each panel with its assigned image
          panelRegions.forEach(panel => {
            // Ensure panel has a valid ID (including 0)
            if (panel.id !== undefined && panel.id !== null) {
              // Convert panel.id to number if it's a string
              const numericPanelId = typeof panel.id === 'string' ? parseInt(panel.id, 10) : panel.id;
              const imageUrl = panelToImageUrl[numericPanelId];
              
              console.log(`Drawing panel ${numericPanelId} with image URL:`, imageUrl ? `${imageUrl.substring(0, 30)}...` : 'No image');
              
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

            {/* Add the ImagePreviewDialog component */}
            <ImagePreviewDialog
              open={imagePreviewOpen}
              imageUrl={previewImageUrl}
              aspectRatio={currentPanelAspectRatio}
              onClose={() => {
                setImagePreviewOpen(false);
                // Revoke the object URL to free up memory
                if (previewImageUrl && previewImageUrl.startsWith('blob:')) {
                  URL.revokeObjectURL(previewImageUrl);
                }
                setPreviewImageUrl(null);
              }}
              onCropClick={handleCropImageClick}
            />

            {/* Add the PanelImageEditor component */}
            {imageEditorOpen && currentPanelId !== null && currentImageUrl && (
              <PanelImageEditor
                open={imageEditorOpen}
                imageUrl={currentImageUrl}
                aspectRatio={currentPanelAspectRatio}
                panelId={currentPanelId}
                onClose={() => {
                  setImageEditorOpen(false);
                }}
                onSave={handleSaveEditedImage}
              />
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
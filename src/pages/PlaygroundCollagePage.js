import React, { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery, Box, Typography, Select, MenuItem, FormControl, InputLabel, Button, Grid, Paper, IconButton, Menu } from "@mui/material";
import { Dashboard, AddPhotoAlternate, MoreVert, Add } from "@mui/icons-material";

import { aspectRatioPresets, getLayoutsForPanelCount } from "../components/collage/config/CollageConfig";
import { MainContainer, ContentPaper } from "../components/collage/components/CollageLayoutComponents";
import { PageHeader } from "../components/collage/components/CollageUIComponents";
import { layoutDefinitions } from "../components/collage/config/layouts"; // Import the layout definitions directly

// Helper function to create a layout config based on the template type
const createLayoutConfig = (template, panelCount) => {
  if (!template) return null;
  
  console.log("Creating layout config for template:", template.id, "panel count:", panelCount);
  
  try {
    // Look up the original layout in the layout definitions
    const panelCountKey = Math.max(2, Math.min(panelCount, 5)); // Ensure valid range
    const categories = layoutDefinitions[panelCountKey];
    
    // Search for the layout in all categories (wide, tall, square)
    if (categories) {
      // Use find or some to iterate through category keys
      const foundLayout = Object.keys(categories).reduce((result, category) => {
        if (result) return result; // Already found a layout
        
        const layouts = categories[category];
        const originalLayout = layouts.find(l => l.id === template.id);
        
        if (originalLayout && typeof originalLayout.getLayoutConfig === 'function') {
          console.log(`Found original layout in ${category} category`);
          return originalLayout;
        }
        
        return null;
      }, null);
      
      if (foundLayout) {
        const config = foundLayout.getLayoutConfig();
        return config;
      }
    }
    
    console.warn(`Couldn't find original layout definition for ${template.id}, falling back to default grid`);
    // Fallback to a basic grid layout in case of error
    return {
      gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(panelCount))}, 1fr)`,
      gridTemplateRows: `repeat(${Math.ceil(panelCount / Math.ceil(Math.sqrt(panelCount)))}, 1fr)`,
      gridTemplateAreas: null,
      items: Array(panelCount).fill({ gridArea: null })
    };
  } catch (error) {
    console.error("Error creating layout config:", error, template);
    // Fallback to a basic grid layout in case of error
    return {
      gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(panelCount))}, 1fr)`,
      gridTemplateRows: `repeat(${Math.ceil(panelCount / Math.ceil(Math.sqrt(panelCount)))}, 1fr)`,
      gridTemplateAreas: null,
      items: Array(panelCount).fill({ gridArea: null })
    };
  }
};

// Playground Collage Page - Simplified version of CollageEditor for testing
export default function PlaygroundCollagePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.down('md'));

  // --- State ---
  const [panelCount, setPanelCount] = useState(4);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('square');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [layoutConfig, setLayoutConfig] = useState(null);
  const [images, setImages] = useState([]);
  const [activePanelIndex, setActivePanelIndex] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [activeMenuPanelIndex, setActiveMenuPanelIndex] = useState(null);
  const fileInputRef = React.createRef();
  const multiFileInputRef = React.createRef();

  // Get available layouts based on selected panel count and aspect ratio
  const availableLayouts = useMemo(() => {
    console.log("Getting layouts for", panelCount, selectedAspectRatio);
    const layouts = getLayoutsForPanelCount(panelCount, selectedAspectRatio);
    console.log("Available layouts:", layouts);
    
    // Log the structure of the first layout to help debug
    if (layouts.length > 0) {
      console.log("First layout structure:", {
        id: layouts[0].id,
        name: layouts[0].name,
        hasGetLayoutConfig: typeof layouts[0].getLayoutConfig === 'function',
        methods: Object.getOwnPropertyNames(layouts[0]).filter(prop => typeof layouts[0][prop] === 'function'),
        properties: Object.getOwnPropertyNames(layouts[0]).filter(prop => typeof layouts[0][prop] !== 'function')
      });
    }
    
    return layouts;
  }, [panelCount, selectedAspectRatio]);

  // Set initial template when available layouts change
  useEffect(() => {
    if (availableLayouts.length > 0 && (!selectedTemplate || 
        !availableLayouts.some(layout => layout.id === selectedTemplate.id))) {
      const newTemplate = availableLayouts[0];
      console.log("Setting new template:", newTemplate);
      setSelectedTemplate(newTemplate);
      
      // Generate layout config from template
      const config = createLayoutConfig(newTemplate, panelCount);
      setLayoutConfig(config);
    } else if (availableLayouts.length === 0) {
      console.log("No available layouts, clearing template and config.");
      setSelectedTemplate(null);
      setLayoutConfig(null);
    }
  }, [availableLayouts, selectedTemplate, panelCount]);

  // Update layoutConfig whenever selectedTemplate changes
  useEffect(() => {
    if (selectedTemplate) {
      // Generate layout config from template
      console.log("Generating config for template:", selectedTemplate);
      const config = createLayoutConfig(selectedTemplate, panelCount);
      console.log("Generated config:", config);
      setLayoutConfig(config);
    } else {
      setLayoutConfig(null);
    }
  }, [selectedTemplate, panelCount]);

  // Initialize images array when panel count changes
  useEffect(() => {
    // Only initialize the images array if it's empty or the panel count increased
    setImages(prevImages => {
      // If we have no images yet or resizing to larger panel count
      if (prevImages.length === 0 || panelCount > prevImages.length) {
        // Keep existing images and add nulls for new panels
        const newImages = [...prevImages];
        while (newImages.length < panelCount) {
          newImages.push(null);
        }
        return newImages;
      }
      // For panel count decrease, don't change anything here
      // (handleRemoveFrame already handles this)
      return prevImages;
    });
  }, [panelCount]);

  // Handle panel click to trigger file upload
  const handlePanelClick = (index) => {
    setActivePanelIndex(index);
    fileInputRef.current?.click();
  };

  // Open menu for a panel
  const handleMenuOpen = (event, index) => {
    event.stopPropagation(); // Prevent panel click
    setMenuAnchorEl(event.currentTarget);
    setActiveMenuPanelIndex(index);
  };

  // Close menu
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setActiveMenuPanelIndex(null);
  };

  // Handle replace image from menu
  const handleReplaceImage = () => {
    setActivePanelIndex(activeMenuPanelIndex);
    handleMenuClose();
    fileInputRef.current?.click();
  };

  // Handle clear image from menu (renamed from delete image)
  const handleClearImage = () => {
    if (activeMenuPanelIndex !== null) {
      setImages(prevImages => {
        const newImages = [...prevImages];
        newImages[activeMenuPanelIndex] = null;
        return newImages;
      });
    }
    handleMenuClose();
  };

  // Handle remove frame from collage
  const handleRemoveFrame = () => {
    if (activeMenuPanelIndex !== null && panelCount > 2) {
      // Reduce panel count
      setPanelCount(prevCount => prevCount - 1);
      
      // Remove image at the active index and shift subsequent images
      setImages(prevImages => {
        const newImages = [...prevImages];
        newImages.splice(activeMenuPanelIndex, 1);
        // Add null at the end to maintain the array length
        newImages.push(null);
        return newImages;
      });
    }
    handleMenuClose();
  };

  // Handle file selection for a single panel
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file && activePanelIndex !== null) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result;
        setImages(prevImages => {
          const newImages = [...prevImages];
          newImages[activePanelIndex] = imageUrl;
          return newImages;
        });
      };
      reader.readAsDataURL(file);
    }
    // Reset file input
    if (event.target) {
      event.target.value = null;
    }
  };

  // Handle multi-file selection
  const handleMultiFileChange = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Update panel count based on number of selected files
    const newPanelCount = Math.min(files.length, 5); // Limit to max 5 panels
    if (newPanelCount !== panelCount) {
      setPanelCount(newPanelCount);
    }
    
    // Create an array to store loaded images
    const newImages = Array(newPanelCount).fill(null);
    
    // Process each file
    Array.from(files).slice(0, newPanelCount).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result;
        setImages(prevImages => {
          const updatedImages = [...prevImages];
          updatedImages[index] = imageUrl;
          return updatedImages;
        });
      };
      reader.readAsDataURL(file);
    });
    
    // Reset file input
    if (event.target) {
      event.target.value = null;
    }
  };

  // Get the currently selected aspect ratio value
  const aspectRatioValue = useMemo(() => {
    const preset = aspectRatioPresets.find(p => p.id === selectedAspectRatio);
    return preset ? preset.value : 1; // Default to 1 if not found
  }, [selectedAspectRatio]);

  // Get grid configuration - safely handle layout config
  const getGridConfig = () => {
    // Default fallback grid configuration
    const defaultConfig = {
      gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(panelCount))}, 1fr)`,
      gridTemplateRows: `repeat(${Math.ceil(panelCount / Math.ceil(Math.sqrt(panelCount)))}, 1fr)`,
      gridTemplateAreas: null
    };

    // If no layout config exists, return the default
    if (!layoutConfig) {
      console.log("No layoutConfig, using default grid");
      return defaultConfig;
    }
    
    // Extract the relevant grid properties
    const gridConfig = {
      gridTemplateColumns: layoutConfig.gridTemplateColumns || defaultConfig.gridTemplateColumns,
      gridTemplateRows: layoutConfig.gridTemplateRows || defaultConfig.gridTemplateRows
    };
    
    // Only add gridTemplateAreas if it exists in the layout config
    if (layoutConfig.gridTemplateAreas) {
      gridConfig.gridTemplateAreas = layoutConfig.gridTemplateAreas;
    }
    
    console.log("Final grid config:", gridConfig);
    return gridConfig;
  };

  // Helper components for rendering images/add buttons
  const RenderImage = ({ index }) => (
    <>
      <img
        src={images[index]} 
        alt={`Panel ${index + 1}`} 
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover' 
        }} 
      />
            
      {/* FAB Menu Button (only shown when image exists) */}
      <IconButton 
        size="small" 
        sx={{ 
          position: 'absolute', 
          top: 5, 
          right: 5,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.7)' : 'rgba(33, 150, 243, 0.7)',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.9)' : 'rgba(33, 150, 243, 0.9)',
          },
        }}
        onClick={(e) => handleMenuOpen(e, index)}
      >
        <MoreVert fontSize="small" />
      </IconButton>
    </>
  );

  const RenderAddButton = ({ index }) => (
    <>
      <IconButton
        sx={{
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.7)' : 'rgba(33, 150, 243, 0.7)',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.9)' : 'rgba(33, 150, 243, 0.9)',
          },
        }}
      >
        <Add />
      </IconButton>
    </>
  );

  return (
    <>
      <Helmet><title>Collage Playground - memeSRC</title></Helmet>
      <MainContainer isMobile={isMobile} isMediumScreen={isMediumScreen}>
        <PageHeader icon={Dashboard} title="Collage Tool Playground" isMobile={isMobile} />
        <ContentPaper isMobile={isMobile}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>Test Collage Layouts</Typography>
            
            {/* Controls */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Number of Panels</InputLabel>
                  <Select
                    value={panelCount}
                    onChange={(e) => setPanelCount(e.target.value)}
                    label="Number of Panels"
                  >
                    <MenuItem value={2}>2 Panels</MenuItem>
                    <MenuItem value={3}>3 Panels</MenuItem>
                    <MenuItem value={4}>4 Panels</MenuItem>
                    <MenuItem value={5}>5 Panels</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Aspect Ratio</InputLabel>
                  <Select
                    value={selectedAspectRatio}
                    onChange={(e) => setSelectedAspectRatio(e.target.value)}
                    label="Aspect Ratio"
                  >
                    {aspectRatioPresets.map(preset => (
                      <MenuItem key={preset.id} value={preset.id}>
                        {preset.name} ({preset.value.toFixed(2)})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Layout</InputLabel>
                  <Select
                    value={selectedTemplate?.id || ''}
                    onChange={(e) => {
                      const template = availableLayouts.find(t => t.id === e.target.value);
                      setSelectedTemplate(template || null);
                    }}
                    label="Layout"
                    disabled={!availableLayouts.length}
                  >
                    {availableLayouts.map(layout => (
                      <MenuItem key={layout.id} value={layout.id}>
                        {layout.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Button 
                  variant="contained" 
                  startIcon={<AddPhotoAlternate />}
                  onClick={() => multiFileInputRef.current?.click()}
                  sx={{ mt: 1 }}
                >
                  Select Multiple Images
                </Button>
              </Grid>
            </Grid>
            
            {/* Hidden file inputs */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleFileChange}
            />
            <input
              type="file"
              multiple
              ref={multiFileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleMultiFileChange}
            />
            
            {/* Collage Preview */}
            {selectedTemplate && layoutConfig && (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  paddingBottom: `${(1 / aspectRatioValue) * 100}%`,
                  maxWidth: 800,
                  margin: '0 auto',
                  overflow: 'hidden',
                  backgroundColor: theme.palette.background.default,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'grid',
                    gap: 1,
                    padding: 1,
                    ...getGridConfig()
                  }}
                >
                  {/* Check if areas-based layout */}
                  {layoutConfig.areas && layoutConfig.areas.length > 0 ? (
                    // Render using grid areas
                    layoutConfig.areas.slice(0, panelCount).map((area, index) => (
                      <Box
                        key={`panel-area-${index}`}
                        sx={{
                          gridArea: area,
                          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          border: `1px dashed ${theme.palette.divider}`,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          position: 'relative',
                          '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                          },
                        }}
                        onClick={() => handlePanelClick(index)}
                      >
                        {images[index] ? <RenderImage index={index} /> : <RenderAddButton index={index} />}
                      </Box>
                    ))
                  ) : layoutConfig.items && layoutConfig.items.length > 0 ? (
                    // Render using items with potential gridArea properties
                    layoutConfig.items.slice(0, panelCount).map((item, index) => (
                      <Box
                        key={`panel-item-${index}`}
                        sx={{
                          ...(item.gridArea ? { gridArea: item.gridArea } : {}),
                          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          border: `1px dashed ${theme.palette.divider}`,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          position: 'relative',
                          '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                          },
                        }}
                        onClick={() => handlePanelClick(index)}
                      >
                        {images[index] ? <RenderImage index={index} /> : <RenderAddButton index={index} />}
                      </Box>
                    ))
                  ) : (
                    // Fallback to simple grid
                    Array.from({ length: panelCount }).map((_, index) => (
                      <Box
                        key={`panel-${index}`}
                        sx={{
                          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          border: `1px dashed ${theme.palette.divider}`,
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          position: 'relative',
                          '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                          },
                        }}
                        onClick={() => handlePanelClick(index)}
                      >
                        {images[index] ? <RenderImage index={index} /> : <RenderAddButton index={index} />}
                      </Box>
                    ))
                  )}
                </Box>
              </Box>
            )}
            
            {/* Panel options menu */}
            <Menu
              anchorEl={menuAnchorEl}
              open={Boolean(menuAnchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleReplaceImage}>Replace image</MenuItem>
              <MenuItem onClick={handleClearImage}>Clear image</MenuItem>
              <MenuItem 
                onClick={handleRemoveFrame} 
                disabled={panelCount <= 2}
              >
                Remove frame
              </MenuItem>
            </Menu>
            
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Click on "Select Multiple Images" to load several images at once, or click on any individual panel to upload a specific image.
              </Typography>
            </Box>
          </Box>
        </ContentPaper>
      </MainContainer>
    </>
  );
} 
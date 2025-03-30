import React, { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery, Box, Typography, Select, MenuItem, FormControl, InputLabel, Button, Grid, Paper } from "@mui/material";
import { Dashboard } from "@mui/icons-material";

import { aspectRatioPresets, getLayoutsForPanelCount } from "../components/collage/config/CollageConfig";
import { MainContainer, ContentPaper } from "../components/collage/components/CollageLayoutComponents";
import { PageHeader } from "../components/collage/components/CollageUIComponents";

// Helper function to create a layout config based on the template type
const createLayoutConfig = (template, panelCount) => {
  if (!template) return null;
  
  // Default grid layout as fallback
  const defaultConfig = {
    gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(panelCount))}, 1fr)`,
    gridTemplateRows: `repeat(${Math.ceil(Math.sqrt(panelCount))}, 1fr)`,
    gridTemplateAreas: null,
    items: Array(panelCount).fill({ gridArea: null })
  };
  
  // Based on layout id, create appropriate configuration
  switch(template.id) {
    // Grid layouts
    case 'grid-2x2':
      return {
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gridTemplateAreas: null,
        items: Array(4).fill({ gridArea: null })
      };
    
    // Column layouts
    case '4-columns':
      return {
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(4).fill({ gridArea: null })
      };
    
    // Row layouts
    case '4-rows':
      return {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(4, 1fr)',
        gridTemplateAreas: null,
        items: Array(4).fill({ gridArea: null })
      };
      
    // Feature layouts
    case 'big-and-3-bottom':
    case 'top-feature-with-3-bottom':
      return {
        gridTemplateColumns: '1fr 1fr 1fr',
        gridTemplateRows: '2fr 1fr',
        gridTemplateAreas: '"main main main" "left middle right"',
        areas: ['main', 'left', 'middle', 'right']
      };
      
    case 'big-and-3-right':
    case 'left-feature-with-3-right':
      return {
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '1fr 1fr 1fr',
        gridTemplateAreas: '"main top" "main middle" "main bottom"',
        areas: ['main', 'top', 'middle', 'bottom']
      };
      
    // 3-panel layouts
    case '3-columns':
      return {
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(3).fill({ gridArea: null })
      };
      
    case '3-rows':
      return {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(3, 1fr)',
        gridTemplateAreas: null,
        items: Array(3).fill({ gridArea: null })
      };
      
    case 'main-with-two-bottom':
      return {
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '2fr 1fr',
        gridTemplateAreas: '"main main" "left right"',
        areas: ['main', 'left', 'right']
      };
      
    // 2-panel layouts  
    case 'split-horizontal':
      return {
        gridTemplateColumns: 'repeat(2, 1fr)',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      };
      
    case 'split-vertical':
      return {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(2, 1fr)',
        gridTemplateAreas: null,
        items: Array(2).fill({ gridArea: null })
      };
      
    // 5-panel layouts 
    case '5-rows':
      return {
        gridTemplateColumns: '1fr',
        gridTemplateRows: 'repeat(5, 1fr)',
        gridTemplateAreas: null,
        items: Array(5).fill({ gridArea: null })
      };
      
    case '5-columns':
      return {
        gridTemplateColumns: 'repeat(5, 1fr)',
        gridTemplateRows: '1fr',
        gridTemplateAreas: null,
        items: Array(5).fill({ gridArea: null })
      };
      
    case 'featured-top-with-4-below':
      return {
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: '2fr 1fr',
        gridTemplateAreas: '"main main main main" "one two three four"',
        areas: ['main', 'one', 'two', 'three', 'four']
      };
      
    default:
      return defaultConfig;
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
  const fileInputRef = React.createRef();

  // Get available layouts based on selected panel count and aspect ratio
  const availableLayouts = useMemo(() => {
    console.log("Getting layouts for", panelCount, selectedAspectRatio);
    const layouts = getLayoutsForPanelCount(panelCount, selectedAspectRatio);
    console.log("Available layouts:", layouts);
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
    }
  }, [availableLayouts, selectedTemplate, panelCount]);

  // Update layoutConfig whenever selectedTemplate changes
  useEffect(() => {
    if (selectedTemplate) {
      // Generate layout config from template
      const config = createLayoutConfig(selectedTemplate, panelCount);
      console.log("Generated config:", config);
      setLayoutConfig(config);
    } else {
      setLayoutConfig(null);
    }
  }, [selectedTemplate, panelCount]);

  // Initialize images array when panel count changes
  useEffect(() => {
    setImages(Array(panelCount).fill(null));
  }, [panelCount]);

  // Handle panel click to trigger file upload
  const handlePanelClick = (index) => {
    setActivePanelIndex(index);
    fileInputRef.current?.click();
  };

  // Handle file selection
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

  // Get the currently selected aspect ratio value
  const aspectRatioValue = useMemo(() => {
    const preset = aspectRatioPresets.find(p => p.id === selectedAspectRatio);
    return preset ? preset.value : 1; // Default to 1 if not found
  }, [selectedAspectRatio]);

  // Get grid configuration - safely handle layout config
  const getGridConfig = () => {
    const defaultConfig = {
      gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(panelCount))}, 1fr)`,
      gridTemplateRows: `repeat(${Math.ceil(Math.sqrt(panelCount))}, 1fr)`,
      gridTemplateAreas: null
    };

    if (!layoutConfig) return defaultConfig;

    return {
      gridTemplateColumns: layoutConfig.gridTemplateColumns || defaultConfig.gridTemplateColumns,
      gridTemplateRows: layoutConfig.gridTemplateRows || defaultConfig.gridTemplateRows,
      gridTemplateAreas: layoutConfig.gridTemplateAreas || defaultConfig.gridTemplateAreas
    };
  };

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
            </Grid>
            
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleFileChange}
            />
            
            {/* Collage Preview */}
            {selectedTemplate && (
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
                  {layoutConfig && layoutConfig.areas ? (
                    // Render using grid areas
                    layoutConfig.areas.map((area, index) => (
                      <Box
                        key={`panel-${area}-${index}`}
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
                          '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                          },
                        }}
                        onClick={() => handlePanelClick(index)}
                      >
                        {images[index] ? (
                          <img 
                            src={images[index]} 
                            alt={`Panel ${index + 1}`} 
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'cover' 
                            }} 
                          />
                        ) : (
                          <Typography>Click to add image</Typography>
                        )}
                      </Box>
                    ))
                  ) : (
                    // Render using implicit grid
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
                          '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                          },
                        }}
                        onClick={() => handlePanelClick(index)}
                      >
                        {images[index] ? (
                          <img 
                            src={images[index]} 
                            alt={`Panel ${index + 1}`} 
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'cover' 
                            }} 
                          />
                        ) : (
                          <Typography>Click to add image</Typography>
                        )}
                      </Box>
                    ))
                  )}
                </Box>
              </Box>
            )}
            
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Click on any panel to upload an image. Test different layouts and aspect ratios.
              </Typography>
            </Box>
          </Box>
        </ContentPaper>
      </MainContainer>
    </>
  );
} 
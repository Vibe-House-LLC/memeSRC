import { useState } from "react";
import { useTheme, styled } from "@mui/material/styles";
import {
  Box,
  Button,
  Typography,
  Grid,
  Paper,
  Alert,
  Chip,
  Collapse
} from "@mui/material";
import {
  KeyboardArrowLeft,
  KeyboardArrowRight,
  AspectRatio,
  GridView,
  Check,
  Edit,
  ExpandLess,
  ExpandMore
} from "@mui/icons-material";

// Import styled components
import { TemplateCard } from "../styled/CollageStyled";

// Create a new styled component for aspect ratio cards
const AspectRatioCard = styled(Paper)(({ theme, selected }) => ({
  padding: theme.spacing(1.5),
  cursor: 'pointer',
  position: 'relative',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
  border: selected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
  '&:hover': {
    borderColor: selected ? theme.palette.primary.main : theme.palette.primary.light,
    boxShadow: theme.shadows[2]
  }
}));

// Create a new styled component for the action buttons container
const ActionButtonsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: theme.spacing(3),
}));

const CollageSettingsStep = ({ 
  selectedImages, 
  selectedTemplate, 
  setSelectedTemplate, 
  selectedAspectRatio, 
  setSelectedAspectRatio, 
  handleBack, 
  handleNext,
  aspectRatioPresets,
  layoutTemplates 
}) => {
  const [aspectRatioExpanded, setAspectRatioExpanded] = useState(true);
  const [layoutExpanded, setLayoutExpanded] = useState(true);
  const theme = useTheme();
  
  const imageCount = selectedImages.length;
  
  // Get aspect ratio value based on selected preset
  const getAspectRatioValue = () => {
    const preset = aspectRatioPresets.find(p => p.id === selectedAspectRatio);
    return preset ? preset.value : 1;
  };
  
  // Check if a template is compatible with the current number of images
  const isTemplateCompatible = (template) => {
    return template.minImages <= imageCount && template.maxImages >= imageCount;
  };

  // Get compatible templates based on image count
  const getCompatibleTemplates = () => {
    return layoutTemplates.filter(template => 
      template.minImages <= imageCount && template.maxImages >= imageCount
    );
  };
  
  // Handle aspect ratio change
  const handleSelectAspectRatio = (aspectRatioId) => {
    setSelectedAspectRatio(aspectRatioId);
    setAspectRatioExpanded(false);
    
    // If we have images and a template is already selected, auto-advance
    if (selectedImages.length > 0 && selectedTemplate) {
      setLayoutExpanded(true);
    }
  };
  
  // Handle template selection and collapse section
  const handleTemplateClick = (template) => {
    if (isTemplateCompatible(template)) {
      setSelectedTemplate(template);
      setLayoutExpanded(false);
      
      // Auto-advance to panels step if both settings are selected
      if (selectedAspectRatio && !aspectRatioExpanded) {
        setTimeout(() => {
          handleNext();
        }, 500); // Small delay to let the user see the selection before advancing
      }
    }
  };
  
  // Render aspect ratio preview
  const renderAspectRatioPreview = (preset) => {
    const { value, name } = preset;
    // For custom value, show a different preview
    if (value === 'custom') {
      return (
        <Box sx={{ 
          width: '100%', 
          height: 60, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: theme => `1px dashed ${theme.palette.divider}`,
          borderRadius: 1,
          mb: 1
        }}>
          <Typography variant="caption">Custom Size</Typography>
        </Box>
      );
    }
    
    // Calculate dimensions based on the aspect ratio value
    // Keep the height at a fixed value, and adjust width based on aspect ratio
    const maxHeight = 60;
    const maxWidth = 100; // 100% of the container
    
    let previewWidth;
    let previewHeight;
    
    if (value >= 1) {
      // Landscape or square orientation (wider than tall)
      previewHeight = maxHeight;
      previewWidth = maxHeight * value;
      
      // Constrain width if it exceeds container
      if (previewWidth > maxWidth) {
        previewWidth = maxWidth;
        previewHeight = previewWidth / value;
      }
    } else {
      // Portrait orientation (taller than wide)
      previewWidth = maxWidth;
      previewHeight = maxWidth / value;
      
      // Constrain height if it exceeds max height
      if (previewHeight > maxHeight) {
        previewHeight = maxHeight;
        previewWidth = previewHeight * value;
      }
    }
    
    return (
      <Box sx={{ 
        display: 'flex',
        alignItems: 'center', 
        justifyContent: 'center',
        height: maxHeight,
        width: '100%',
        mb: 1
      }}>
        <Box 
          sx={{ 
            width: `${previewWidth}px`,
            height: `${previewHeight}px`,
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            borderRadius: '2px',
            border: theme => `1px solid ${theme.palette.divider}`,
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Optional: Display aspect ratio value */}
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', opacity: 0.8 }}>
            {value === 1 ? '1:1' : value > 1 ? `${value.toFixed(1)}:1` : `1:${(1/value).toFixed(1)}`}
          </Typography>
        </Box>
      </Box>
    );
  };

  const compatibleTemplates = getCompatibleTemplates();
  const selectedAspectRatioObj = aspectRatioPresets.find(p => p.id === selectedAspectRatio);
  
  return (
    <>
      <Typography variant="body1" paragraph>
        Choose the aspect ratio and layout for your collage.
      </Typography>
      
      {/* Aspect Ratio Section */}
      <Paper 
        elevation={1} 
        sx={{ 
          mb: 3, 
          overflow: 'hidden',
          border: theme => `1px solid ${theme.palette.divider}`
        }}
      >
        <Box 
          sx={{ 
            p: 2, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'
          }}
          onClick={() => setAspectRatioExpanded(!aspectRatioExpanded)}
          style={{ cursor: 'pointer' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AspectRatio sx={{ mr: 1.5, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ mr: 1 }}>
              Aspect Ratio
            </Typography>
            {!aspectRatioExpanded && selectedAspectRatioObj && (
              <Chip 
                label={selectedAspectRatioObj.name} 
                size="small" 
                color="primary" 
                variant="outlined"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          <Box>
            {aspectRatioExpanded ? (
              <ExpandLess color="action" />
            ) : (
              <ExpandMore color="action" />
            )}
          </Box>
        </Box>
        
        <Collapse in={aspectRatioExpanded}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={1.5}>
              {aspectRatioPresets.map(preset => (
                <Grid item xs={6} sm={4} md={3} key={preset.id}>
                  <AspectRatioCard
                    selected={selectedAspectRatio === preset.id}
                    onClick={() => handleSelectAspectRatio(preset.id)}
                    elevation={selectedAspectRatio === preset.id ? 2 : 0}
                  >
                    {renderAspectRatioPreview(preset)}
                    <Typography variant="caption" align="center">
                      {preset.name}
                    </Typography>
                    
                    {selectedAspectRatio === preset.id && (
                      <Box 
                        sx={{ 
                          position: 'absolute', 
                          top: 8, 
                          right: 8, 
                          bgcolor: 'primary.main',
                          borderRadius: '50%',
                          width: 16,
                          height: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Check sx={{ fontSize: 12, color: 'white' }} />
                      </Box>
                    )}
                  </AspectRatioCard>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Collapse>
        
        {!aspectRatioExpanded && (
          <Box 
            sx={{ 
              p: 1.5, 
              display: 'flex', 
              justifyContent: 'flex-end',
              borderTop: theme => `1px solid ${theme.palette.divider}`
            }}
          >
            <Button 
              size="small" 
              startIcon={<Edit />}
              onClick={() => setAspectRatioExpanded(true)}
            >
              Change
            </Button>
          </Box>
        )}
      </Paper>
      
      {/* Layout Section */}
      <Paper 
        elevation={1} 
        sx={{ 
          mb: 3,
          overflow: 'hidden',
          border: theme => `1px solid ${theme.palette.divider}`
        }}
      >
        <Box 
          sx={{ 
            p: 2, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'
          }}
          onClick={() => setLayoutExpanded(!layoutExpanded)}
          style={{ cursor: 'pointer' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <GridView sx={{ mr: 1.5, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ mr: 1 }}>
              Layout
            </Typography>
            {!layoutExpanded && selectedTemplate && (
              <Chip 
                label={selectedTemplate.name} 
                size="small" 
                color="primary" 
                variant="outlined"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          <Box>
            {layoutExpanded ? (
              <ExpandLess color="action" />
            ) : (
              <ExpandMore color="action" />
            )}
          </Box>
        </Box>
        
        <Collapse in={layoutExpanded}>
          <Box sx={{ p: 2 }}>
            {compatibleTemplates.length === 0 ? (
              <Alert severity="info" sx={{ mb: 1 }}>
                No templates match the current number of images ({imageCount}). Try adding more images or removing some.
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {compatibleTemplates.map(template => {
                  const isSelected = selectedTemplate?.id === template.id;
                  const aspectRatioValue = getAspectRatioValue();
                  
                  return (
                    <Grid item xs={6} sm={4} md={3} key={template.id}>
                      <TemplateCard
                        selected={isSelected}
                        onClick={() => handleTemplateClick(template)}
                      >
                        <Box 
                          sx={{ 
                            position: 'relative',
                            '&:before': {
                              content: '""',
                              display: 'block',
                              paddingTop: `${100 / aspectRatioValue}%`,
                            }
                          }}
                        >
                          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                            {template.renderPreview(aspectRatioValue, theme, imageCount)}
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: isSelected ? 600 : 400
                            }}
                          >
                            {template.name}
                          </Typography>
                          <Chip 
                            size="small" 
                            label={`${template.minImages} image${template.minImages !== 1 ? 's' : ''}`}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                        {isSelected && (
                          <Box 
                            sx={{ 
                              position: 'absolute', 
                              top: 8, 
                              right: 8, 
                              bgcolor: 'primary.main',
                              borderRadius: '50%',
                              width: 24,
                              height: 24,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Check sx={{ fontSize: 18, color: 'white' }} />
                          </Box>
                        )}
                      </TemplateCard>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        </Collapse>
        
        {!layoutExpanded && (
          <Box 
            sx={{ 
              p: 1.5, 
              display: 'flex', 
              justifyContent: 'flex-end',
              borderTop: theme => `1px solid ${theme.palette.divider}`
            }}
          >
            <Button 
              size="small" 
              startIcon={<Edit />}
              onClick={() => setLayoutExpanded(true)}
            >
              Change
            </Button>
          </Box>
        )}
      </Paper>
      
      <ActionButtonsContainer>
        <Button onClick={handleBack} startIcon={<KeyboardArrowLeft />}>
          Back to Images
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          endIcon={<KeyboardArrowRight />}
          disabled={!selectedTemplate}
        >
          Continue to Panels
        </Button>
      </ActionButtonsContainer>
    </>
  );
};

export default CollageSettingsStep; 
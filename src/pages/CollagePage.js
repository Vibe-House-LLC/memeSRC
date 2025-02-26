import { useContext, useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useLocation } from 'react-router-dom'; 
import { useTheme, styled } from "@mui/material/styles";
import { LoadingButton } from "@mui/lab";
import {
  Box,
  Button,
  Typography,
  MenuItem,
  Grid,
  Stack,
  FormControl,
  Select,
  Paper,
  IconButton,
  Alert,
  Divider,
  Chip,
  Tooltip,
  Zoom,
  CircularProgress
} from "@mui/material";
import { 
  ArrowForward, 
  AddPhotoAlternate,
  Delete,
  Check,
  Info
} from "@mui/icons-material";
import BasePage from "./BasePage";
import { UserContext } from "../UserContext";
import { useSubscribeDialog } from "../contexts/useSubscribeDialog";

// Import styled components
import {
  PageContainer,
  TemplateCard,
  ImageDropzone,
  SelectedImagePreview,
  ImageThumb,
  ImageActions,
  ThumbImage,
  PreviewContainer
} from "../components/collage/styled/CollageStyled";

// Import configuration
import { aspectRatioPresets, layoutTemplates } from "../components/collage/config/CollageConfig";

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

export default function CollagePage() {
  const [selectedImages, setSelectedImages] = useState([]); // Array of selected image files/URLs
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('square');
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef(null);
  const dropzoneRef = useRef(null);
  const theme = useTheme();
  const { user } = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();
  const navigate = useNavigate();

  const authorized = (user?.userDetails?.magicSubscription === "true" || user?.['cognito:groups']?.includes('admins'));

  // Select a template if it's compatible with the current image count
  useEffect(() => {
    const imageCount = selectedImages.length;
    
    // If we already have a selected template, check if it's still valid
    if (selectedTemplate) {
      const isValid = 
        (selectedTemplate.minImages <= imageCount && 
         selectedTemplate.maxImages >= imageCount);
      
      // If not valid, set to null
      if (!isValid) {
        setSelectedTemplate(null);
      }
    } 
    // If no template is selected but we have images, try to find a compatible one
    else if (imageCount > 0) {
      const compatibleTemplates = layoutTemplates.filter(template => 
        template.minImages <= imageCount && template.maxImages >= imageCount
      );
      
      if (compatibleTemplates.length > 0) {
        // Select the first compatible template
        setSelectedTemplate(compatibleTemplates[0]);
      }
    }
  }, [selectedImages]);

  // Handle aspect ratio change
  const handleAspectRatioChange = (event) => {
    setSelectedAspectRatio(event.target.value);
  };

  // Get aspect ratio value based on selected preset
  const getAspectRatioValue = () => {
    const preset = aspectRatioPresets.find(p => p.id === selectedAspectRatio);
    return preset ? preset.value : 1;
  };

  // Handle image file selection
  const handleImageSelection = (event) => {
    const files = Array.from(event.target.files);
    processFiles(files);
  };

  // Process selected files
  const processFiles = (files) => {
    // Don't allow more than 9 images total
    const allowedFiles = files.slice(0, 9 - selectedImages.length);
    
    if (allowedFiles.length > 0) {
      setSelectedImages(prev => {
        const newSelection = [...prev];
        
        allowedFiles.forEach(file => {
          // Create object URLs for preview
          newSelection.push({
            file,
            url: URL.createObjectURL(file),
          });
        });
        
        return newSelection;
      });
    }
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  // Handle removing a selected image
  const handleRemoveImage = (index) => {
    setSelectedImages(prev => {
      const newImages = [...prev];
      
      // Revoke the object URL to prevent memory leaks
      if (newImages[index]?.url) {
        URL.revokeObjectURL(newImages[index].url);
      }
      
      newImages.splice(index, 1);
      return newImages;
    });
  };

  // Check if a template is compatible with the current number of images
  const isTemplateCompatible = (template) => {
    const imageCount = selectedImages.length;
    return template.minImages <= imageCount && template.maxImages >= imageCount;
  };

  // Get compatible templates based on image count
  const getCompatibleTemplates = () => {
    const imageCount = selectedImages.length;
    return layoutTemplates.filter(template => 
      template.minImages <= imageCount && template.maxImages >= imageCount
    );
  };

  // Handle drag events
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropzoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      processFiles(files);
    }
  };

  // Handle template selection
  const handleTemplateClick = (template) => {
    if (isTemplateCompatible(template)) {
      setSelectedTemplate(template);
    }
  };
  
  // Submit the collage for creation
  const handleCreateCollage = () => {
    console.log("Would create collage with:", {
      images: selectedImages,
      template: selectedTemplate,
      aspectRatio: selectedAspectRatio
    });
    // Future implementation would use these values to create the collage
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

  // Render the main page content
  const renderCollageCreator = () => {
    const aspectRatioValue = getAspectRatioValue();
    const imageCount = selectedImages.length;
    const compatibleTemplates = getCompatibleTemplates();
    
    return (
      <PageContainer>
        <Grid container spacing={4}>
          {/* Left side: Image Selection */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>
              Add Images
            </Typography>
            
            <ImageDropzone
              ref={dropzoneRef}
              isDragActive={isDragging}
              hasImages={imageCount > 0}
              onClick={() => fileInputRef.current.click()}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                type="file"
                multiple
                accept="image/*"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleImageSelection}
              />
              
              <AddPhotoAlternate sx={{ fontSize: 40, mb: 2, color: 'text.secondary' }} />
              
              <Typography variant="body1" gutterBottom textAlign="center">
                {isDragging ? "Drop images here" : "Drag and drop images here"}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" textAlign="center">
                or <Button size="small">Browse Files</Button>
              </Typography>
              
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
                Support JPG, PNG, GIF, BMP (max 9 images)
              </Typography>
            </ImageDropzone>
            
            {imageCount > 0 && (
              <Box mt={3}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1">
                    Selected Images ({imageCount}/9)
                  </Typography>
                  
                  {imageCount > 1 && (
                    <Button 
                      size="small" 
                      onClick={() => setSelectedImages([])}
                      color="error"
                      variant="text"
                    >
                      Clear All
                    </Button>
                  )}
                </Box>
                
                <SelectedImagePreview>
                  {selectedImages.map((image, index) => (
                    <ImageThumb key={index}>
                      <ThumbImage src={image.url} alt={`Image ${index + 1}`} />
                      <ImageActions className="image-actions">
                        <IconButton 
                          size="small" 
                          onClick={() => handleRemoveImage(index)}
                          sx={{ color: 'white' }}
                        >
                          <Delete />
                        </IconButton>
                      </ImageActions>
                    </ImageThumb>
                  ))}
                  
                  {imageCount < 9 && (
                    <ImageThumb 
                      sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        border: theme => `2px dashed ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`
                      }}
                      onClick={() => fileInputRef.current.click()}
                    >
                      <AddPhotoAlternate sx={{ color: 'text.secondary' }} />
                    </ImageThumb>
                  )}
                </SelectedImagePreview>
              </Box>
            )}
            
            <Box mt={4}>
              <Typography variant="h6" gutterBottom>
                Configure Output
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Aspect Ratio
              </Typography>
              
              <Grid container spacing={1.5} sx={{ mb: 3 }}>
                {aspectRatioPresets.map(preset => (
                  <Grid item xs={4} sm={4} key={preset.id}>
                    <AspectRatioCard
                      selected={selectedAspectRatio === preset.id}
                      onClick={() => setSelectedAspectRatio(preset.id)}
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
          </Grid>
          
          {/* Right side: Template Selection & Preview */}
          <Grid item xs={12} md={6}>
            <Box sx={{ position: 'sticky', top: 20 }}>
              <Typography variant="h6" gutterBottom>
                Choose Layout
                {imageCount === 0 && (
                  <Tooltip title="Add images first to see compatible layouts" arrow>
                    <Info fontSize="small" sx={{ ml: 1, verticalAlign: 'middle', opacity: 0.7 }} />
                  </Tooltip>
                )}
              </Typography>
              
              {imageCount === 0 ? (
                <Alert severity="info" sx={{ mb: 3 }}>
                  Add images first to see compatible layout options
                </Alert>
              ) : compatibleTemplates.length === 0 ? (
                <Alert severity="info" sx={{ mb: 3 }}>
                  No templates match the current number of images ({imageCount})
                </Alert>
              ) : (
                <>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    {compatibleTemplates.map(template => {
                      const isSelected = selectedTemplate?.id === template.id;
                      
                      return (
                        <Grid item xs={6} key={template.id}>
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
                  
                  {selectedTemplate && (
                    <Box sx={{ mt: 4 }}>
                      <Divider sx={{ mb: 3 }} />
                      <Typography variant="h6" gutterBottom>
                        Preview
                      </Typography>
                      
                      <Box 
                        sx={{ 
                          border: theme => `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                          padding: 1,
                          position: 'relative',
                          '&:before': {
                            content: '""',
                            display: 'block',
                            paddingTop: `${100 / aspectRatioValue}%`,
                          }
                        }}
                      >
                        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                          {selectedTemplate.renderPreview(aspectRatioValue, theme, imageCount)}
                        </Box>
                      </Box>
                      
                      <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        fullWidth
                        disabled={!selectedTemplate || imageCount < selectedTemplate.minImages}
                        onClick={handleCreateCollage}
                        sx={{ mt: 3 }}
                        endIcon={<ArrowForward />}
                      >
                        Create Collage
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </PageContainer>
    );
  };

  // Render subscription page
  const renderSubscriptionPage = () => {
    return (
      <Grid container height="100%" justifyContent="center" alignItems="center" mt={6}>
        <Grid item>
          <Stack spacing={3} justifyContent="center">
            <img
              src="/assets/memeSRC-white.svg"
              alt="memeSRC logo"
              style={{ height: 48, marginBottom: -15 }}
            />
            <Typography variant="h3" textAlign="center">
              memeSRC&nbsp;Collage Tool
            </Typography>
            <Typography variant="body" textAlign="center">
              While in Early Access, the Collage Tool is only available for memeSRC&nbsp;Pro subscribers.
            </Typography>
          </Stack>
          <center>
            <LoadingButton
              onClick={openSubscriptionDialog}
              variant="contained"
              size="large"
              sx={{ mt: 5, fontSize: 17 }}
            >
              Upgrade to Pro
            </LoadingButton>
          </center>
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

      {!authorized ? renderSubscriptionPage() : renderCollageCreator()}
    </BasePage>
  );
}
import { useRef, useState, useEffect } from "react";
import { Box, Button, Typography, IconButton, Fade, useMediaQuery, useTheme, Alert } from "@mui/material";
import { AddPhotoAlternate, Delete, KeyboardArrowRight, KeyboardArrowLeft, CloudUpload } from "@mui/icons-material";
import { styled } from "@mui/material/styles";

// Import styled components
import {
  ImageDropzone,
  SelectedImagePreview,
  ImageThumb,
  ImageActions,
  ThumbImage
} from "../styled/CollageStyled";

// Create a new styled component for the action buttons container
const ActionButtonsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: theme.spacing(3),
}));

const CollageImagesStep = ({ 
  selectedImages, 
  setSelectedImages,
  panelCount,
  handleBack, 
  handleNext 
}) => {
  const fileInputRef = useRef(null);
  const dropzoneRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const handleImageSelection = (event) => {
    event.preventDefault();
    if (event.target.files) {
      processFiles(event.target.files);
    }
  };
  
  const processFiles = (files) => {
    // Maximum number of images allowed based on panel count
    const maxImages = panelCount;
    const remainingSlots = maxImages - selectedImages.length;
    
    if (remainingSlots <= 0) {
      // Handle max images reached
      alert(`Maximum of ${panelCount} images allowed based on your panel selection`);
      return;
    }
    
    // Process only the number of files that can fit in the remaining slots
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    // Process each file
    const newImages = filesToProcess.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }));
    
    setSelectedImages([...selectedImages, ...newImages]);
  };
  
  // Cleanup URLs when component unmounts
  useEffect(() => {
    return () => {
      selectedImages.forEach(image => {
        if (image.url && image.url.startsWith('blob:')) {
          URL.revokeObjectURL(image.url);
        }
      });
    };
  }, [selectedImages]);
  
  const handleRemoveImage = (index) => {
    const newImages = [...selectedImages];
    
    // Cleanup URL
    if (newImages[index].url.startsWith('blob:')) {
      URL.revokeObjectURL(newImages[index].url);
    }
    
    // Remove the image
    newImages.splice(index, 1);
    setSelectedImages(newImages);
  };
  
  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    // Only set isDragging to false if we're leaving the dropzone
    // and not entering a child element
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };
  
  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <Box sx={{ pt: 2 }}>
      <Typography variant="body1" paragraph>
        Add up to <strong>{panelCount} images</strong> for your collage.
      </Typography>
      
      {selectedImages.length < panelCount ? (
        <ImageDropzone
          ref={dropzoneRef}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          isDragging={isDragging}
          onClick={handleBrowseClick}
          sx={{ mb: 3 }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelection}
            accept="image/*"
            multiple
            style={{ display: 'none' }}
          />
          <CloudUpload sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
          <Typography variant="h6">
            Drop images here or click to browse
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Supports JPG, PNG, WebP, and GIFs
          </Typography>
        </ImageDropzone>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          You've reached the maximum of {panelCount} images for your selected layout. 
          To add more, either remove some images or go back and increase the panel count.
        </Alert>
      )}
      
      {selectedImages.length > 0 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            {selectedImages.length} of {panelCount} images selected
          </Typography>
          <Box 
            sx={{ 
              display: 'grid', 
              gridTemplateColumns: { 
                xs: 'repeat(2, 1fr)', 
                sm: 'repeat(3, 1fr)', 
                md: 'repeat(4, 1fr)',
                lg: 'repeat(5, 1fr)'
              },
              gap: 2
            }}
          >
            {selectedImages.map((image, index) => (
              <Fade key={image.id} in timeout={300} style={{ transitionDelay: `${index * 50}ms` }}>
                <SelectedImagePreview>
                  <ImageThumb>
                    <ThumbImage src={image.url} alt={`Selected image ${index + 1}`} />
                  </ImageThumb>
                  <ImageActions>
                    <IconButton 
                      size="small" 
                      onClick={() => handleRemoveImage(index)}
                      aria-label="Remove image"
                    >
                      <Delete />
                    </IconButton>
                  </ImageActions>
                  <Typography variant="caption" noWrap sx={{ maxWidth: '100%', display: 'block' }}>
                    {image.name}
                  </Typography>
                </SelectedImagePreview>
              </Fade>
            ))}
          </Box>
        </Box>
      )}
      
      <ActionButtonsContainer>
        <Button
          onClick={handleBack}
          startIcon={<KeyboardArrowLeft />}
        >
          Back to Layout
        </Button>
      
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={selectedImages.length === 0}
          endIcon={<KeyboardArrowRight />}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1,
            boxShadow: selectedImages.length > 0 ? 4 : 0,
            transition: 'all 0.2s ease',
            '&:hover': {
              transform: selectedImages.length > 0 ? 'translateY(-2px)' : 'none',
              boxShadow: selectedImages.length > 0 ? 6 : 0
            }
          }}
        >
          Arrange Images
        </Button>
      </ActionButtonsContainer>
    </Box>
  );
};

export default CollageImagesStep; 
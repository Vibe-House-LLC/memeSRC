import { useRef, useState, useEffect } from "react";
import { Box, Button, Typography, IconButton, Fade, useMediaQuery, useTheme } from "@mui/material";
import { AddPhotoAlternate, Delete, KeyboardArrowRight, CloudUpload } from "@mui/icons-material";
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
    // Maximum of 9 images allowed
    const maxImages = 9;
    const remainingSlots = maxImages - selectedImages.length;
    
    if (remainingSlots <= 0) {
      // Handle max images reached
      alert("Maximum of 9 images allowed");
      return;
    }
    
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    filesToProcess.forEach(file => {
      if (!file.type.match('image.*')) {
        return; // Skip non-image files
      }
      
      const reader = new FileReader();
      
      reader.onload = (e) => {
        setSelectedImages(prevImages => [
          ...prevImages, 
          {
            src: e.target.result,
            file,
            name: file.name
          }
        ]);
      };
      
      reader.readAsDataURL(file);
    });
  };
  
  const handleRemoveImage = (index) => {
    setSelectedImages(prevImages => 
      prevImages.filter((_, i) => i !== index)
    );
  };
  
  // Enable automatic advancing to next step when images are selected
  useEffect(() => {
    if (selectedImages.length > 0 && !isMobile) {
      // Can auto-advance on desktop, but on mobile let user control the flow
      // Optional: could add a timeout here to auto-advance after a delay
    }
  }, [selectedImages, isMobile]);
  
  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set to false if we're leaving the dropzone itself, not its children
    if (e.currentTarget === e.target) {
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
    
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };
  
  return (
    <Fade in>
      <Box>
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          {/* Image upload area */}
          <ImageDropzone
            ref={dropzoneRef}
            isDragActive={isDragging}
            hasImages={selectedImages.length > 0}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              borderRadius: 2,
              transition: 'all 0.3s ease',
              transform: isDragging ? 'scale(1.01)' : 'scale(1)'
            }}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageSelection}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            
            <CloudUpload 
              color="primary" 
              sx={{ 
                fontSize: isMobile ? 40 : 64, 
                opacity: 0.7,
                mb: 2 
              }} 
            />
            
            <Typography 
              variant={isMobile ? "body1" : "h6"} 
              align="center" 
              color="textSecondary"
              sx={{ fontWeight: 500 }}
            >
              {isDragging ? "Drop images here" : "Drag and drop images here"}
            </Typography>
            
            <Typography 
              variant="body2" 
              align="center" 
              color="textSecondary" 
              sx={{ mt: 1, opacity: 0.7 }}
            >
              or click to browse
            </Typography>
            
            {selectedImages.length > 0 ? (
              <Typography 
                variant="caption" 
                color="primary" 
                sx={{ mt: 1, fontWeight: 'medium' }}
              >
                {selectedImages.length} {selectedImages.length === 1 ? 'image' : 'images'} selected
                {selectedImages.length < 9 && ` (${9 - selectedImages.length} more allowed)`}
              </Typography>
            ) : null}
          </ImageDropzone>
          
          {/* Preview of selected images */}
          {selectedImages.length > 0 && (
            <Box mt={4}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: 2, 
                  fontWeight: 500,
                  fontSize: isMobile ? '1.1rem' : '1.25rem' 
                }}
              >
                Selected Images
              </Typography>
              
              <SelectedImagePreview
                sx={{
                  gridTemplateColumns: isMobile 
                    ? 'repeat(auto-fill, minmax(80px, 1fr))' 
                    : 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: isMobile ? 1 : 2
                }}
              >
                {selectedImages.map((image, index) => (
                  <Fade key={index} in>
                    <ImageThumb>
                      <ThumbImage src={image.src} alt={`Selected ${index + 1}`} />
                      <ImageActions className="image-actions">
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(index);
                          }}
                          sx={{ 
                            color: 'white',
                            bgcolor: 'rgba(0,0,0,0.4)',
                            '&:hover': {
                              bgcolor: 'rgba(211, 47, 47, 0.8)'
                            }
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </ImageActions>
                    </ImageThumb>
                  </Fade>
                ))}
              </SelectedImagePreview>
            </Box>
          )}
          
          {/* Action buttons */}
          <ActionButtonsContainer>
            <Box /> {/* Empty box for flex spacing */}
            <Button
              variant="contained"
              color="primary"
              disabled={selectedImages.length === 0}
              onClick={handleNext}
              endIcon={<KeyboardArrowRight />}
              sx={{ 
                mt: 2,
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
              Continue
            </Button>
          </ActionButtonsContainer>
        </Box>
      </Box>
    </Fade>
  );
};

export default CollageImagesStep; 
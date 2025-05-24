import React, { useRef } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Grid, 
  IconButton, 
  useMediaQuery 
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { 
  CloudUpload, 
  Add, 
  Delete 
} from '@mui/icons-material';

const debugLog = (...args) => { console.log(...args); };

const BulkUploadSection = ({
  selectedImages,
  addMultipleImages,
  removeImage,
  panelImageMapping,
  updatePanelImageMapping,
  panelCount,
  selectedTemplate
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const bulkFileInputRef = useRef(null);

  // --- Handler for bulk file upload ---
  const handleBulkFileUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Helper function to load a single file and return a Promise with the data URL
    const loadFile = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    };

    debugLog(`Bulk uploading ${files.length} files...`);

    // Process all files
    Promise.all(files.map(loadFile))
      .then((imageUrls) => {
        debugLog(`Loaded ${imageUrls.length} files for bulk upload`);
        // Add all images at once
        addMultipleImages(imageUrls);
        
        // Auto-assign images to empty panels if available
        const assignedIndices = new Set(Object.values(panelImageMapping));
        const currentLength = selectedImages.length;
        const newMapping = { ...panelImageMapping };
        let newImageIndex = currentLength;
        let assignedCount = 0;

        // Find empty panels and assign images
        for (let panelIndex = 0; panelIndex < panelCount && assignedCount < imageUrls.length; panelIndex += 1) {
          const panelId = selectedTemplate?.layout?.panels?.[panelIndex]?.id || `panel-${panelIndex + 1}`;
          
          if (!newMapping[panelId]) {
            newMapping[panelId] = newImageIndex;
            newImageIndex += 1;
            assignedCount += 1;
          }
        }

        if (assignedCount > 0) {
          updatePanelImageMapping(newMapping);
          debugLog(`Auto-assigned ${assignedCount} images to empty panels`);
        }

        debugLog(`Added ${imageUrls.length} images. ${assignedCount} auto-assigned, ${imageUrls.length - assignedCount} available for manual assignment.`);
      })
      .catch((error) => {
        console.error("Error loading files:", error);
      });
    
    // Reset file input
    if (event.target) {
      event.target.value = null;
    }
  };

  // Helper function to get unassigned images
  const getUnassignedImages = () => {
    const assignedIndices = new Set(Object.values(panelImageMapping));
    return selectedImages
      .map((img, index) => ({ ...img, originalIndex: index }))
      .filter((img) => !assignedIndices.has(img.originalIndex));
  };

  // Helper function to assign an unassigned image to a panel
  const assignImageToPanel = (imageIndex, panelId) => {
    const newMapping = {
      ...panelImageMapping,
      [panelId]: imageIndex
    };
    updatePanelImageMapping(newMapping);
    debugLog(`Assigned image ${imageIndex} to panel ${panelId}`);
  };

  // Helper function to find the next empty panel
  const getNextEmptyPanel = () => {
    for (let panelIndex = 0; panelIndex < panelCount; panelIndex += 1) {
      const panelId = selectedTemplate?.layout?.panels?.[panelIndex]?.id || `panel-${panelIndex + 1}`;
      if (!panelImageMapping[panelId]) {
        return panelId;
      }
    }
    return null;
  };

  // Helper function to find the next empty panel excluding already processed ones
  const getNextEmptyPanelExcluding = (excludeMapping) => {
    for (let panelIndex = 0; panelIndex < panelCount; panelIndex += 1) {
      const panelId = selectedTemplate?.layout?.panels?.[panelIndex]?.id || `panel-${panelIndex + 1}`;
      if (!panelImageMapping[panelId] && !excludeMapping[panelId]) {
        return panelId;
      }
    }
    return null;
  };

  const unassignedImages = getUnassignedImages();

  return (
    <Box sx={{ 
      width: '100%',
      mb: 3,
      px: isMobile ? 1 : 0
    }}>
      {/* Bulk Upload Section */}
      <Box sx={{ 
        p: 3, 
        mb: unassignedImages.length > 0 ? 2 : 0, 
        borderRadius: 3,
        border: `2px dashed ${theme.palette.divider}`,
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: theme.palette.primary.main,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        }
      }}>
        <Box 
          onClick={() => bulkFileInputRef.current?.click()}
          sx={{ py: 2 }}
        >
          <CloudUpload sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#fff' }}>
            Add Images
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: '500px', mx: 'auto' }}>
            Click here or drag and drop to upload multiple images at once. They'll be automatically assigned to empty panels.
          </Typography>
          <Button 
            variant="contained" 
            size="large"
            startIcon={<Add />}
            onClick={(e) => {
              e.stopPropagation();
              bulkFileInputRef.current?.click();
            }}
            sx={{
              py: 1.5,
              px: 4,
              fontSize: '1.1rem',
              fontWeight: 600,
              borderRadius: 2
            }}
          >
            Upload Images
          </Button>
        </Box>
        
        {/* Hidden bulk file input */}
        <input
          type="file"
          ref={bulkFileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          multiple
          onChange={handleBulkFileUpload}
        />
      </Box>

      {/* Unassigned Images Section */}
      {unassignedImages.length > 0 && (
        <Box sx={{ 
          p: 3, 
          borderRadius: 3,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
          border: `1px solid ${theme.palette.divider}`
        }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#fff' }}>
            Available Images ({unassignedImages.length})
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Click on an image below, then click on an empty panel to assign it
          </Typography>
          
          <Grid container spacing={2}>
            {unassignedImages.map((img, displayIndex) => (
              <Grid item key={`unassigned-${img.originalIndex}`} xs={3} sm={2} md={1.5}>
                <Paper
                  elevation={3}
                  sx={{
                    position: 'relative',
                    aspectRatio: '1',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    borderRadius: 2,
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: theme.shadows[6],
                    }
                  }}
                  onClick={() => {
                    const nextEmptyPanel = getNextEmptyPanel();
                    if (nextEmptyPanel) {
                      assignImageToPanel(img.originalIndex, nextEmptyPanel);
                    } else {
                      debugLog('All panels are full. Replace an existing image by clicking on a panel.');
                    }
                  }}
                >
                  <img
                    src={img.displayUrl}
                    alt={`Unassigned ${displayIndex + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  
                  {/* Remove button */}
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(img.originalIndex);
                    }}
                    sx={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      color: 'error.main',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 1)',
                      },
                      width: 28,
                      height: 28,
                    }}
                  >
                    <Delete sx={{ fontSize: 18 }} />
                  </IconButton>
                </Paper>
              </Grid>
            ))}
          </Grid>
          
          {/* Quick assign button */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button
              variant="outlined"
              size="medium"
              startIcon={<Add />}
              onClick={() => {
                // Auto-assign as many unassigned images as possible
                const newMapping = { ...panelImageMapping };
                let assignedCount = 0;
                
                unassignedImages.forEach((img) => {
                  const nextEmptyPanel = getNextEmptyPanelExcluding(newMapping);
                  if (nextEmptyPanel) {
                    newMapping[nextEmptyPanel] = img.originalIndex;
                    assignedCount += 1;
                  }
                });
                
                if (assignedCount > 0) {
                  updatePanelImageMapping(newMapping);
                  debugLog(`Auto-assigned ${assignedCount} unassigned images`);
                }
              }}
              disabled={getNextEmptyPanel() === null}
              sx={{
                px: 3,
                py: 1,
                borderRadius: 2
              }}
            >
              Auto-assign to empty panels
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default BulkUploadSection; 
import React, { useRef } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  useMediaQuery 
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { 
  CloudUpload, 
  Add
} from '@mui/icons-material';

const debugLog = (...args) => { console.log(...args); };

const BulkUploadSection = ({
  selectedImages,
  addMultipleImages,
  panelImageMapping,
  updatePanelImageMapping,
  panelCount,
  selectedTemplate,
  setPanelCount // Add this prop to automatically adjust panel count
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
        
        // Find currently empty panels by checking existing mapping
        const emptyPanels = [];
        const assignedPanelIds = new Set(Object.keys(panelImageMapping));
        
        debugLog(`Current panel mapping:`, panelImageMapping);
        debugLog(`Assigned panel IDs:`, Array.from(assignedPanelIds));
        
        for (let panelIndex = 0; panelIndex < panelCount; panelIndex += 1) {
          const panelId = selectedTemplate?.layout?.panels?.[panelIndex]?.id || `panel-${panelIndex + 1}`;
          
          // Check if this panel is not assigned or assigned to undefined/null
          if (!assignedPanelIds.has(panelId) || panelImageMapping[panelId] === undefined || panelImageMapping[panelId] === null) {
            emptyPanels.push(panelId);
          }
        }
        
        const numEmptyPanels = emptyPanels.length;
        const numNewImages = imageUrls.length;
        
        debugLog(`Found ${numEmptyPanels} empty panels (${emptyPanels}) for ${numNewImages} new images`);
        
        // Calculate if we need to increase panel count
        let newPanelCount = panelCount;
        if (numNewImages > numEmptyPanels) {
          // Need more panels - increase by the difference
          const additionalPanelsNeeded = numNewImages - numEmptyPanels;
          newPanelCount = Math.min(panelCount + additionalPanelsNeeded, 12); // Max 12 panels
          
          if (setPanelCount && newPanelCount !== panelCount) {
            setPanelCount(newPanelCount);
            debugLog(`Increased panel count from ${panelCount} to ${newPanelCount} to accommodate new images`);
          }
        }
        
        // Create new mapping with assignments
        const newMapping = { ...panelImageMapping };
        const currentLength = selectedImages.length;
        let newImageIndex = currentLength;
        
        // First, fill existing empty panels
        for (let i = 0; i < Math.min(numEmptyPanels, numNewImages); i += 1) {
          newMapping[emptyPanels[i]] = newImageIndex;
          debugLog(`Assigning new image ${newImageIndex} to empty panel ${emptyPanels[i]}`);
          newImageIndex += 1;
        }
        
        // Then, assign remaining images to newly created panels (if any)
        if (numNewImages > numEmptyPanels) {
          for (let panelIndex = panelCount; panelIndex < newPanelCount && newImageIndex < currentLength + numNewImages; panelIndex += 1) {
            const panelId = selectedTemplate?.layout?.panels?.[panelIndex]?.id || `panel-${panelIndex + 1}`;
            newMapping[panelId] = newImageIndex;
            debugLog(`Assigning new image ${newImageIndex} to new panel ${panelId}`);
            newImageIndex += 1;
          }
        }

        debugLog(`Final mapping:`, newMapping);
        updatePanelImageMapping(newMapping);
        debugLog(`Assigned ${numNewImages} new images to panels`);
        
        // Scroll to collage preview after a short delay to ensure DOM updates
        setTimeout(() => {
          // Look for the collage preview section
          const collagePreview = document.querySelector('[data-testid="dynamic-collage-preview-root"]') || 
                               document.querySelector('.MuiBox-root:has([data-testid="dynamic-collage-preview-root"])') ||
                               document.querySelector('h5:contains("Your Collage")') ||
                               // Fallback to any element with "collage" in data attributes or class
                               document.querySelector('[class*="collage"], [data-*="collage"]');
          
          if (collagePreview) {
            const navBarHeight = 80; // Account for navigation bar height
            const elementTop = collagePreview.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementTop - navBarHeight;
            
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
            
            debugLog('Scrolled to collage preview');
          } else {
            // Fallback: scroll to a reasonable position down the page
            window.scrollTo({
              top: window.innerHeight * 0.6, // Scroll down about 60% of viewport
              behavior: 'smooth'
            });
            
            debugLog('Scrolled to fallback position (collage preview not found)');
          }
        }, 500); // 500ms delay to ensure DOM updates and panel count changes are applied
      })
      .catch((error) => {
        console.error("Error loading files:", error);
      });
    
    // Reset file input
    if (event.target) {
      event.target.value = null;
    }
  };

  return (
    <Box sx={{ 
      width: '100%',
      px: isMobile ? 1 : 0
    }}>
      {/* Bulk Upload Section */}
      <Box sx={{ 
        p: 3, 
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
            Upload Your Images
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: '500px', mx: 'auto' }}>
            Drag and drop or click to select multiple images for your collage
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
    </Box>
  );
};

export default BulkUploadSection; 
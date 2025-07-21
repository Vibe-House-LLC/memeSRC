import React, { useState, useRef } from 'react';
import { Menu, MenuItem, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { aspectRatioPresets } from '../config/CollageConfig';
import CanvasCollagePreview from './CanvasCollagePreview';

/**
 * Get the aspect ratio value from the presets
 * @param {string} selectedAspectRatio - The ID of the selected aspect ratio
 * @returns {number} The aspect ratio value
 */
const getAspectRatioValue = (selectedAspectRatio) => {
  const aspectRatioPreset = aspectRatioPresets.find(preset => preset.id === selectedAspectRatio);
  return aspectRatioPreset ? aspectRatioPreset.value : 1; // Default to 1 (square) if not found
};

/**
 * CollagePreview - A component for previewing and interacting with a collage
 * Wraps DynamicCollagePreview and adds panel interaction functionality
 */
const CollagePreview = ({
  selectedTemplate,
  selectedAspectRatio,
  panelCount,
  selectedImages,
  addImage,
  addMultipleImages,
  removeImage,
  updateImage,
  replaceImage,
  updatePanelImageMapping,
  panelImageMapping,
  onCropRequest,
  borderThickness = 0,
  borderColor = '#000000',
  panelTransforms,
  updatePanelTransform,
  panelTexts,
  updatePanelText,
  lastUsedTextSettings,
  isCreatingCollage = false,
}) => {
  const theme = useTheme();
  const fileInputRef = useRef(null);
  
  // State for menu
  const [menuPosition, setMenuPosition] = useState(null);
  const [activePanelIndex, setActivePanelIndex] = useState(null);
  const [activePanelId, setActivePanelId] = useState(null);

  // Get the aspect ratio value
  const aspectRatioValue = getAspectRatioValue(selectedAspectRatio);

  // Handle panel click to trigger file upload
  const handlePanelClick = (index, panelId) => {
    console.log(`Panel clicked: index=${index}, panelId=${panelId}`); // Debug log
    setActivePanelIndex(index);
    setActivePanelId(panelId);
    fileInputRef.current?.click();
  };

  // Open menu for a panel
  const handleMenuOpen = (event, index) => {
    event.stopPropagation(); // Prevent panel click
    
    // Store the mouse position instead of the element reference
    setMenuPosition({
      left: event.clientX - 2,
      top: event.clientY - 4,
    });
    
    setActivePanelIndex(index);
  };

  // Close menu
  const handleMenuClose = () => {
    setMenuPosition(null);
  };

  // Handle replace image from menu
  const handleReplaceImage = () => {
    if (activePanelIndex !== null) {
      // Get the panel ID for the active panel
      let panelId;
      try {
        const layoutPanel = selectedTemplate?.layout?.panels?.[activePanelIndex];
        const templatePanel = selectedTemplate?.panels?.[activePanelIndex];
        panelId = layoutPanel?.id || templatePanel?.id || `panel-${activePanelIndex + 1}`;
      } catch (error) {
        panelId = `panel-${activePanelIndex + 1}`;
      }
      
      // Set the active panel info for when file is selected
      setActivePanelId(panelId);
      
      // Trigger file input
      fileInputRef.current?.click();
    }
    
    // Close the menu
    handleMenuClose();
  };

  // Handle file selection for a panel
  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || activePanelIndex === null) return;

    // Helper function to load a single file and return a Promise with the data URL
    const loadFile = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    };

    // Debug selected template and active panel
    console.log("File upload for panel:", {
      activePanelIndex,
      fileCount: files.length,
      template: selectedTemplate,
      hasLayout: selectedTemplate && !!selectedTemplate.layout,
      hasPanels: selectedTemplate && selectedTemplate.layout && !!selectedTemplate.layout.panels,
      currentMapping: panelImageMapping
    });

    // Determine panel ID from template structure (same for both menu and direct clicks)
    let clickedPanelId;
    
    // Use the stored activePanelId if available
    if (activePanelId) {
      clickedPanelId = activePanelId;
      console.log(`Using stored activePanelId: ${clickedPanelId}`);
    } else {
      // Fallback: Try to get panel ID from template structure using activePanelIndex
      console.warn("activePanelId not set, falling back to index-based lookup");
      try {
        const layoutPanel = selectedTemplate?.layout?.panels?.[activePanelIndex];
        const templatePanel = selectedTemplate?.panels?.[activePanelIndex];
        clickedPanelId = layoutPanel?.id || templatePanel?.id || `panel-${activePanelIndex + 1}`;
        console.log(`Using fallback panel ID: ${clickedPanelId} for activePanelIndex: ${activePanelIndex}`);
      } catch (error) {
        console.error("Error getting fallback panel ID:", error);
        clickedPanelId = `panel-${activePanelIndex + 1}`;
      }
    }

    // Process all files
    Promise.all(files.map(loadFile))
      .then((imageUrls) => {
        console.log(`Loaded ${imageUrls.length} files for panel ${clickedPanelId}`);

        // Check if this is a replacement operation for the first file
        const existingImageIndex = panelImageMapping[clickedPanelId];
        console.log(`Panel ${clickedPanelId}: existingImageIndex=${existingImageIndex}`);
        
        if (existingImageIndex !== undefined && imageUrls.length === 1) {
          // If this panel already has an image and we're only uploading one file, replace it
          console.log(`Replacing image at index ${existingImageIndex} for panel ${clickedPanelId}`);
          replaceImage(existingImageIndex, imageUrls[0]);
        } else {
          // Otherwise, add all images sequentially
          const currentLength = selectedImages.length;
          console.log(`Adding ${imageUrls.length} new images starting at index ${currentLength}`);
          
          // Add all images at once
          addMultipleImages(imageUrls);
          
          // If this is a single file replacement, update the specific panel mapping
          if (imageUrls.length === 1) {
            const newMapping = {
              ...panelImageMapping,
              [clickedPanelId]: currentLength
            };
            console.log("Updated mapping for single image:", newMapping);
            updatePanelImageMapping(newMapping);
          } else {
            // For multiple files, don't auto-assign them to panels
            // Let the user manually assign them by clicking on panels
            console.log(`Added ${imageUrls.length} images. Users can now assign them to panels manually.`);
          }
        }
      })
      .catch((error) => {
        console.error("Error loading files:", error);
      });
    
    // Reset file input and active panel state
    setActivePanelIndex(null);
    setActivePanelId(null);
    if (event.target) {
      event.target.value = null;
    }
  };

  // Determine if the active panel has an image (for menu options)
  const hasActiveImage = () => {
    if (activePanelIndex === null) return false;
    
    // Get panel ID from template structure
    let panelId;
    try {
      const layoutPanel = selectedTemplate?.layout?.panels?.[activePanelIndex];
      const templatePanel = selectedTemplate?.panels?.[activePanelIndex];
      panelId = layoutPanel?.id || templatePanel?.id || `panel-${activePanelIndex + 1}`;
    } catch (error) {
      panelId = `panel-${activePanelIndex + 1}`;
    }
    
    // Check if this panel ID has an image mapping
    return panelImageMapping[panelId] !== undefined;
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <CanvasCollagePreview
        selectedTemplate={selectedTemplate}
        selectedAspectRatio={selectedAspectRatio}
        panelCount={panelCount}
        images={selectedImages}
        onPanelClick={handlePanelClick}
        onMenuOpen={handleMenuOpen}
        aspectRatioValue={aspectRatioValue}
        panelImageMapping={panelImageMapping}
        updatePanelImageMapping={updatePanelImageMapping}
        borderThickness={borderThickness}
        borderColor={borderColor}
        panelTransforms={panelTransforms}
        updatePanelTransform={updatePanelTransform}
        panelTexts={panelTexts}
        updatePanelText={updatePanelText}
        lastUsedTextSettings={lastUsedTextSettings}
        isGeneratingCollage={isCreatingCollage}
      />
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        multiple
        onChange={handleFileChange}
      />
      
      {/* Panel options menu */}
      <Menu
        open={Boolean(menuPosition)}
        onClose={handleMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={menuPosition || undefined}
      >
        <MenuItem onClick={handleReplaceImage}>Replace image</MenuItem>
      </Menu>
    </Box>
  );
};

export default CollagePreview; 
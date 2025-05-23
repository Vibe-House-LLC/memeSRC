import React, { useState, useRef } from 'react';
import { Menu, MenuItem, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { aspectRatioPresets } from '../config/CollageConfig';
import DynamicCollagePreview from './DynamicCollagePreview';

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
    const file = event.target.files?.[0];
    if (file && activePanelIndex !== null) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result;
        
        // Debug selected template and active panel
        console.log("File upload for panel:", {
          activePanelIndex,
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
          // (This fallback might be less reliable but kept for safety)
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
        
        // Check if this is a replacement operation (either from menu or direct click)
        const existingImageIndex = panelImageMapping[clickedPanelId];
        console.log(`Panel ${clickedPanelId}: existingImageIndex=${existingImageIndex}`);
        
        if (existingImageIndex !== undefined) {
          // If this panel already has an image, replace it
          console.log(`Replacing image at index ${existingImageIndex} for panel ${clickedPanelId}`);
          replaceImage(existingImageIndex, imageUrl);
        } else {
          // Otherwise, add a new image and then update the mapping
          const currentLength = selectedImages.length;
          console.log(`Adding new image at index ${currentLength} for panel ${clickedPanelId}`);
          
          // Add the image first
          addImage(imageUrl);
          
          // Now update the mapping with the index where we just added the image
          const newMapping = {
            ...panelImageMapping,
            [clickedPanelId]: currentLength
          };
          console.log("Updated mapping:", newMapping);
          updatePanelImageMapping(newMapping);
        }
      };
      reader.readAsDataURL(file);
    }
    
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
      <DynamicCollagePreview
        selectedTemplate={selectedTemplate}
        selectedAspectRatio={selectedAspectRatio}
        panelCount={panelCount}
        images={selectedImages}
        onPanelClick={handlePanelClick}
        onMenuOpen={handleMenuOpen}
        aspectRatioValue={aspectRatioValue}
        panelImageMapping={panelImageMapping}
        borderThickness={borderThickness}
        borderColor={borderColor}
        panelTransforms={panelTransforms}
        updatePanelTransform={updatePanelTransform}
      />
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
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
        <MenuItem onClick={() => alert("TODO: Clear Frame")}>Clear frame</MenuItem>
        <MenuItem onClick={() => alert("TODO: Rotate Image")}>Rotate image</MenuItem>
      </Menu>
    </Box>
  );
};

export default CollagePreview; 
/**
 * Utility functions for managing panel interactions in the collage editor
 */

/**
 * Handle click events on the preview image
 * @param {React.MouseEvent} event - The click event
 * @param {Object} params - Parameters required for handling the click
 * @param {Array} params.panelRegions - Array of panel regions
 * @param {function} params.setSelectedPanel - Function to set the selected panel
 * @param {function} params.handlePanelImageSelection - Function to handle panel image selection
 * @param {function} params.calculateCanvasDimensions - Function to calculate canvas dimensions
 * @param {string} params.selectedAspectRatio - The ID of the selected aspect ratio
 */
export const handlePreviewClick = (event, {
  panelRegions,
  setSelectedPanel,
  handlePanelImageSelection,
  calculateCanvasDimensions,
  selectedAspectRatio
}) => {
  // Get the click coordinates relative to the image
  const image = event.currentTarget;
  const rect = image.getBoundingClientRect();
  
  // Calculate click position as percentage of image dimensions
  const clickX = (event.clientX - rect.left) / rect.width;
  const clickY = (event.clientY - rect.top) / rect.height;
  
  // Convert to canvas coordinates
  const { width, height } = calculateCanvasDimensions(selectedAspectRatio);
  const canvasX = clickX * width;
  const canvasY = clickY * height;
  
  // Find which panel was clicked
  const clickedPanel = panelRegions.find(panel => 
    canvasX >= panel.x && 
    canvasX <= panel.x + panel.width && 
    canvasY >= panel.y && 
    canvasY <= panel.y + panel.height
  );
  
  if (clickedPanel) {
    console.log(`Clicked on panel ${clickedPanel.id}: ${clickedPanel.name}`);
    setSelectedPanel(clickedPanel);
    
    // Call the handler for panel image selection
    handlePanelImageSelection(clickedPanel);
  }
};

/**
 * Handle image selection for a specific panel
 * @param {Object} panel - The panel object
 * @param {Object} params - Parameters required for handling the selection
 * @param {Object} params.panelToImageMap - Current mapping of panels to images
 * @param {function} params.setPanelToImageMap - Function to update the panel-to-image mapping
 * @param {Array} params.selectedImages - Array of selected images
 * @param {number} params.panelCount - Number of panels
 * @returns {void}
 */
export const handlePanelImageSelection = (panel, {
  panelToImageMap,
  setPanelToImageMap,
  selectedImages,
  panelCount
}) => {
  // In a real implementation, you might open a modal or trigger a file selector
  // For now, we'll simulate selecting an image by using the next available one
  
  // If we already have an image mapped to this panel, select it
  const currentImageForPanel = panelToImageMap[panel.id];
  if (currentImageForPanel !== undefined) {
    alert(`Panel ${panel.id + 1} already has image ${currentImageForPanel + 1} assigned. You can remove it or select a different panel.`);
    return;
  }
  
  // Find available images (not yet assigned to panels)
  const assignedImageIndices = Object.values(panelToImageMap);
  const availableImages = selectedImages.filter((_, index) => !assignedImageIndices.includes(index));
  
  if (availableImages.length > 0) {
    // Get the index of the first available image in the original selectedImages array
    const availableImageIndex = selectedImages.findIndex(
      (img, idx) => !assignedImageIndices.includes(idx)
    );
    
    // Update the panel-to-image mapping
    setPanelToImageMap(prev => ({
      ...prev,
      [panel.id]: availableImageIndex
    }));
    
    console.log(`Assigned image ${availableImageIndex + 1} to panel ${panel.id + 1}`);
  } else if (selectedImages.length < panelCount) {
    // If we have fewer selected images than panels, prompt to select more
    alert(`Please select more images. You have ${selectedImages.length} selected but need up to ${panelCount}.`);
  } else {
    // All images are assigned, but we have more panels than images
    alert("All available images have been assigned to panels. Please select more images or rearrange existing ones.");
  }
};

/**
 * Clear image assignment for a panel
 * @param {number} panelId - The ID of the panel to clear
 * @param {function} setPanelToImageMap - Function to update the panel-to-image mapping
 */
export const clearPanelImage = (panelId, setPanelToImageMap) => {
  setPanelToImageMap(prev => {
    const updated = { ...prev };
    delete updated[panelId];
    return updated;
  });
}; 
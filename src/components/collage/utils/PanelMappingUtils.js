/**
 * Utility functions for handling panel-to-image mapping
 */

/**
 * Ensures panel mapping is valid
 * @param {Object} mapping - Object mapping panel IDs to image indices 
 * @param {Array} imageArray - Array of images to map from
 * @param {Number} panelCount - Number of panels in layout
 * @returns {Object} - Sanitized mapping with only valid entries
 */
export const sanitizePanelImageMapping = (mapping, imageArray, panelCount) => {
  if (!mapping || typeof mapping !== 'object') {
    console.log("Panel mapping is invalid or missing:", mapping);
    return {};
  }
  
  // Debug info about current mapping state
  console.log("Panel mapping before sanitization:", {
    mappingKeys: Object.keys(mapping),
    imageArrayLength: imageArray?.length || 0,
    panelCount
  });
  
  // Create a clean mapping object with only valid entries
  const cleanMapping = {};
  
  Object.entries(mapping).forEach(([panelId, imageIndex]) => {
    // Convert panelId to number if it's a string number
    const numericPanelId = !Number.isNaN(Number(panelId)) ? Number(panelId) : panelId;
    
    // Check if this mapping is valid
    const isValid = imageIndex !== undefined && 
                    imageIndex >= 0 && 
                    imageIndex < imageArray.length && 
                    imageArray[imageIndex];
    
    if (isValid) {
      cleanMapping[numericPanelId] = imageIndex;
    } else {
      console.log(`Invalid panel mapping: panel ${panelId} -> image ${imageIndex}`, {
        reason: !imageIndex && imageIndex !== 0 ? "No image index" : 
                imageIndex < 0 ? "Negative index" :
                imageIndex >= imageArray.length ? "Index out of bounds" :
                !imageArray[imageIndex] ? "Image not found at index" : "Unknown"
      });
    }
  });
  
  console.log("Sanitized panel mapping:", cleanMapping);
  return cleanMapping;
};

/**
 * Safely preserves panel image mapping when an image is updated or replaced
 * @param {Object} currentMapping - Current panel-to-image-index mapping
 * @param {Number} updatedImageIndex - Index of the image that was updated
 * @param {Array} selectedImages - Array of all selected images
 * @returns {Object} - Updated mapping with fixed indices if needed
 */
export const preserveMappingOnImageUpdate = (currentMapping, updatedImageIndex, selectedImages) => {
  if (!currentMapping || Object.keys(currentMapping).length === 0) {
    return currentMapping;
  }
  
  console.log("Preserving mapping for updated image at index:", updatedImageIndex, 
    "Current mapping:", currentMapping);
  
  // Create a deep copy of the mapping to avoid mutation issues
  const newMapping = JSON.parse(JSON.stringify(currentMapping));
  
  // Nothing needs to be done if the mapping already points to valid images
  return newMapping;
};

/**
 * Creates a mapping from panel IDs to image URLs
 * @param {Object} cleanMapping - Sanitized panel-to-image-index mapping
 * @param {Array} selectedImages - Array of image URLs
 * @param {Array} panelRegions - Array of panel region objects
 * @returns {Object} - Mapping from panel IDs to image URLs
 */
export const createPanelToImageUrlMapping = (cleanMapping, selectedImages, panelRegions) => {
  const panelToImageUrl = {};
  
  // Add debug logging
  console.log("Creating image URL mapping from:", {
    mappingEntries: Object.entries(cleanMapping || {}),
    imageCount: selectedImages?.length || 0,
    panelCount: panelRegions?.length || 0
  });
  
  try {
    // Use the existing mapping if available
    if (cleanMapping && Object.keys(cleanMapping).length > 0) {
      // Use the existing mapping - panel ID to image index
      Object.entries(cleanMapping).forEach(([panelId, imageIndex]) => {
        if (selectedImages[imageIndex]) {
          const imageItem = selectedImages[imageIndex];
          const imageUrl = typeof imageItem === 'object' && imageItem !== null 
            ? (imageItem.url || imageItem.imageUrl || imageItem) 
            : imageItem;
          
          if (imageUrl) {
            console.log(`Mapping panel ${panelId} to image ${imageIndex} with URL: ${typeof imageUrl === 'string' ? imageUrl.substring(0, 30) + '...' : '[object]'}`);
            panelToImageUrl[panelId] = imageUrl;
          } else {
            console.log(`Warning: No valid URL for image at index ${imageIndex} for panel ${panelId}`);
          }
        } else {
          console.log(`Warning: No image found at index ${imageIndex} for panel ${panelId}`);
        }
      });
    } else if (panelRegions && panelRegions.length > 0 && selectedImages && selectedImages.length > 0) {
      // Assign images sequentially to panels
      console.log("No mapping provided, creating sequential mapping");
      panelRegions.forEach((panel, index) => {
        if (index < selectedImages.length && selectedImages[index]) {
          const imageItem = selectedImages[index];
          const imageUrl = typeof imageItem === 'object' && imageItem !== null 
            ? (imageItem.url || imageItem.imageUrl || imageItem) 
            : imageItem;
          
          if (imageUrl) {
            console.log(`Sequential mapping: panel ${panel.id} to image ${index}`);
            panelToImageUrl[panel.id] = imageUrl;
          }
        }
      });
    } else {
      console.log("Insufficient data to create panel-to-image mapping");
    }
  } catch (error) {
    console.error("Error creating panel to image URL mapping:", error);
  }
  
  return panelToImageUrl;
}; 
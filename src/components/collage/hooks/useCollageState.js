import { useState, useEffect } from 'react';
import { getLayoutsForPanelCount } from '../config/CollageConfig';

/**
 * Custom hook to manage collage state
 */
export const useCollageState = () => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [panelImageMapping, setPanelImageMapping] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('portrait');
  const [panelCount, setPanelCount] = useState(2); // Default panel count of 2
  const [finalImage, setFinalImage] = useState(null);
  const [isCreatingCollage, setIsCreatingCollage] = useState(false);
  const [borderThickness, setBorderThickness] = useState('medium'); // Default border thickness

  // Initialize template on mount
  useEffect(() => {
    console.log("useCollageState initializing...");
    
    // Get compatible templates for initial panel count and aspect ratio
    const initialTemplates = getLayoutsForPanelCount(panelCount, selectedAspectRatio);
    
    console.log("Initial templates:", {
      count: initialTemplates.length,
      panelCount,
      aspectRatio: selectedAspectRatio
    });
    
    // Set the initial template if available
    if (initialTemplates.length > 0) {
      console.log("Setting initial template:", initialTemplates[0].id);
      setSelectedTemplate(initialTemplates[0]);
    } else {
      console.warn("No initial templates found!");
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Select the most suitable template when panel count or aspect ratio changes
  useEffect(() => {
    const compatibleTemplates = getLayoutsForPanelCount(panelCount, selectedAspectRatio);
    
    // If no template is selected or the current one isn't compatible, select the first one
    if (!selectedTemplate || 
        selectedTemplate.minImages > panelCount || 
        selectedTemplate.maxImages < panelCount) {
      
      if (compatibleTemplates.length > 0) {
        // Select the first (highest priority) compatible template
        setSelectedTemplate(compatibleTemplates[0]);
      } else {
        setSelectedTemplate(null);
      }
    }
  }, [panelCount, selectedAspectRatio, selectedTemplate]);

  // Clean up ObjectURLs when component unmounts or when images are replaced
  useEffect(() => {
    return () => {
      selectedImages.forEach(url => {
        if (url && typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [selectedImages]);

  /**
   * Add a new image to the collection
   * @param {string|Object} image - The image URL or object to add
   */
  const addImage = (image) => {
    setSelectedImages([...selectedImages, image]);
  };

  /**
   * Remove an image by index
   * @param {number} index - The index of the image to remove
   */
  const removeImage = (index) => {
    // Create a copy of the images array without the removed image
    const newImages = [...selectedImages];
    const removedImage = newImages.splice(index, 1)[0];
    
    // Clean up the object URL if it's a blob URL
    if (removedImage && typeof removedImage === 'string' && removedImage.startsWith('blob:')) {
      URL.revokeObjectURL(removedImage);
    }
    
    setSelectedImages(newImages);
    
    // Also update panel mapping to remove references to this image
    const newMapping = {};
    Object.entries(panelImageMapping).forEach(([panelId, mappedIndex]) => {
      if (mappedIndex === index) {
        // This panel was pointing to the removed image, so remove the mapping
        // (do nothing, which will remove it from newMapping)
      } else if (mappedIndex > index) {
        // This panel was pointing to an image after the removed one, so adjust the index
        newMapping[panelId] = mappedIndex - 1;
      } else {
        // This panel points to an image before the removed one, so keep it the same
        newMapping[panelId] = mappedIndex;
      }
    });
    
    setPanelImageMapping(newMapping);
  };

  /**
   * Update an image at a specific index
   * @param {number} index - The index of the image to update
   * @param {string|Object} newImage - The new image URL or object
   */
  const updateImage = (index, newImage) => {
    if (index >= 0 && index < selectedImages.length) {
      const oldImage = selectedImages[index];
      // Clean up the old image URL if it's a blob
      if (oldImage && typeof oldImage === 'string' && oldImage.startsWith('blob:')) {
        URL.revokeObjectURL(oldImage);
      }
      
      // Create a new array with the updated image
      const newImages = [...selectedImages];
      newImages[index] = newImage;
      setSelectedImages(newImages);
    }
  };

  /**
   * Clear all selected images
   */
  const clearImages = () => {
    // Clean up all blob URLs
    selectedImages.forEach(image => {
      if (image && typeof image === 'string' && image.startsWith('blob:')) {
        URL.revokeObjectURL(image);
      }
    });
    
    setSelectedImages([]);
    setPanelImageMapping({});
  };

  /**
   * Update the mapping between panels and images
   * @param {Object} newMapping - The new panel-to-image mapping
   */
  const updatePanelImageMapping = (newMapping) => {
    console.log("Updating panel image mapping:", {
      previous: Object.keys(panelImageMapping),
      new: Object.keys(newMapping),
      changes: Object.keys(newMapping).filter(key => 
        panelImageMapping[key] !== newMapping[key]
      )
    });
    
    setPanelImageMapping(newMapping);
  };

  return {
    // State
    selectedImages,
    panelImageMapping,
    selectedTemplate,
    setSelectedTemplate,
    selectedAspectRatio,
    setSelectedAspectRatio,
    panelCount,
    setPanelCount,
    finalImage,
    setFinalImage,
    isCreatingCollage,
    setIsCreatingCollage,
    borderThickness,
    setBorderThickness,
    
    // Operations
    addImage,
    removeImage,
    updateImage,
    clearImages,
    updatePanelImageMapping,
  };
}; 
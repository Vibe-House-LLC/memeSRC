import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Typography, Paper, useMediaQuery, Button, Fab, Grid, IconButton, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PhotoCamera, Add, Delete, CloudUpload } from '@mui/icons-material';

// Import our new dynamic CollagePreview component
import CollagePreview from '../components/CollagePreview';

// Debugging utils
const DEBUG_MODE = true; // Set to true to enable console logs
const debugLog = (...args) => { if (DEBUG_MODE) console.log(...args); };
const debugWarn = (...args) => { if (DEBUG_MODE) console.warn(...args); };
const logError = (...args) => { console.error(...args); };

const CollageImagesStep = ({
  selectedImages, // Now [{ originalUrl, displayUrl }, ...]
  addImage, // Adds new object { original, display }
  addMultipleImages, // Adds multiple objects { original, display }
  removeImage, // Removes object, updates mapping
  updateImage, // Updates ONLY displayUrl (for crop result)
  replaceImage, // <-- NEW: Updates BOTH urls (for replacing upload)
  clearImages, // Clears objects, mapping
  panelCount,
  handleNext, // For 'Create Collage'
  selectedTemplate,
  selectedAspectRatio,
  borderThickness,
  borderColor,
  borderThicknessOptions,
  panelImageMapping, // Still { panelId: imageIndex }
  updatePanelImageMapping, // Updates mapping directly
  panelTransforms, // Receive new state
  updatePanelTransform, // Receive new function
  setFinalImage, // <<< Keep this
  handleOpenExportDialog, // <<< Add handleOpenExportDialog prop
  onCollageGenerated // <<< NEW: Handler for inline result display
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Add ref for bulk upload
  const bulkFileInputRef = useRef(null);

  // Debug the props we're receiving
  console.log("CollageImagesStep props:", {
    hasTemplate: !!selectedTemplate,
    templateId: selectedTemplate?.id,
    hasImages: selectedImages.length > 0,
    aspectRatio: selectedAspectRatio,
    panelCount,
    borderThickness
  });

  // --- State for Modals ---
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [currentPanelToEdit, setCurrentPanelToEdit] = useState(null); // { id, x, y, width, height }
  const [imageToCrop, setImageToCrop] = useState(null); // Stores ORIGINAL URL for the cropper
  const [panelAspectRatio, setPanelAspectRatio] = useState(1); // Aspect ratio for cropping tool

  // --- Handler for Crop Completion ---
  const handleCropComplete = useCallback((croppedDataUrl) => {
    if (!currentPanelToEdit) {
      logError("Cannot complete crop: No panel selected.");
      return;
    }
    
    const panelId = currentPanelToEdit.id;
    
    // Normal crop of existing image
    const imageIndex = panelImageMapping[panelId];
    
    if (imageIndex === undefined || imageIndex === null) {
      logError("Cannot complete crop: Panel has no associated image index.");
      return;
    }
    
    debugLog(`Cropping complete for panel ${panelId}. Updating DISPLAY image index ${imageIndex}.`);
    // Use 'updateImage' which only updates the displayUrl
    updateImage(imageIndex, croppedDataUrl);

    // Close the modal and reset state
    setCropModalOpen(false);
    setCurrentPanelToEdit(null);
    setImageToCrop(null);
  }, [currentPanelToEdit, panelImageMapping, updateImage]);

  // --- Handler for opening crop modal for a specific image ---
  const handleOpenCropModal = useCallback((panelId, imageIndex) => {
    // Set the panel and image information
    if (selectedImages[imageIndex]?.originalUrl) {
      // Calculate aspect ratio if we have the template
      let calculatedAspectRatio = 1; // Default to square
      
      if (selectedTemplate && selectedTemplate.layout && selectedTemplate.layout.panels) {
        // Find the panel in the template
        const panel = selectedTemplate.layout.panels.find(p => p.id === panelId);
        if (panel) {
          calculatedAspectRatio = panel.width / panel.height;
        }
      }
      
      // Update state for the crop modal
      setCurrentPanelToEdit({ id: panelId });
      setPanelAspectRatio(calculatedAspectRatio);
      setImageToCrop(selectedImages[imageIndex].originalUrl);
      setCropModalOpen(true);
    }
  }, [selectedImages, selectedTemplate]);

  // --- Handler for Replace Image request ---
  const handleReplaceRequest = useCallback(() => {
    // Just close the modal, the panel click handler in CollagePreview will handle the upload
    setCropModalOpen(false);
    setImageToCrop(null);
    setCurrentPanelToEdit(null);
  }, []);

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
        for (let panelIndex = 0; panelIndex < panelCount && assignedCount < imageUrls.length; panelIndex++) {
          const panelId = selectedTemplate?.layout?.panels?.[panelIndex]?.id || `panel-${panelIndex + 1}`;
          
          if (!newMapping[panelId]) {
            newMapping[panelId] = newImageIndex;
            newImageIndex++;
            assignedCount++;
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
    for (let panelIndex = 0; panelIndex < panelCount; panelIndex++) {
      const panelId = selectedTemplate?.layout?.panels?.[panelIndex]?.id || `panel-${panelIndex + 1}`;
      if (!panelImageMapping[panelId]) {
        return panelId;
      }
    }
    return null;
  };

  // Helper function to find the next empty panel excluding already processed ones
  const getNextEmptyPanelExcluding = (excludeMapping) => {
    for (let panelIndex = 0; panelIndex < panelCount; panelIndex++) {
      const panelId = selectedTemplate?.layout?.panels?.[panelIndex]?.id || `panel-${panelIndex + 1}`;
      if (!panelImageMapping[panelId] && !excludeMapping[panelId]) {
        return panelId;
      }
    }
    return null;
  };

  // --- Handler for Remove Image request ---
  const handleRemoveRequest = useCallback(() => {
    if (!currentPanelToEdit) {
      logError("Cannot remove: No panel selected.");
      return;
    }
    
    const panelId = currentPanelToEdit.id;
    const imageIndex = panelImageMapping[panelId];
    
    if (imageIndex === undefined || imageIndex === null) {
      logError("Cannot remove: Panel has no associated image index.");
      return;
    }
    
    // Remove the image
    removeImage(imageIndex);
    
    // Update the mapping to remove this panel's association
    const updatedMapping = { ...panelImageMapping };
    delete updatedMapping[panelId];
    updatePanelImageMapping(updatedMapping);
    
    // Close the modal and reset state
    setCropModalOpen(false);
    setCurrentPanelToEdit(null);
    setImageToCrop(null);
    
    debugLog(`Removed image at index ${imageIndex} from panel ${panelId}`);
  }, [currentPanelToEdit, panelImageMapping, removeImage, updatePanelImageMapping]);

  return (
    <Box sx={{ my: isMobile ? 0 : 0.5 }}>
      {/* Bulk Upload Section */}
      <Box sx={{ 
        p: isMobile ? 2 : 2, 
        mb: isMobile ? 2 : 2, 
        borderRadius: 2,
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
          <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            Add Images
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Click here or drag and drop to upload multiple images at once
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<Add />}
            onClick={(e) => {
              e.stopPropagation();
              bulkFileInputRef.current?.click();
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
      {(() => {
        const unassignedImages = getUnassignedImages();
        if (unassignedImages.length > 0) {
          return (
            <Box sx={{ 
              p: isMobile ? 2 : 2, 
              mb: isMobile ? 2 : 2, 
              borderRadius: 2,
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${theme.palette.divider}`
            }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                Available Images ({unassignedImages.length})
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Click on an image below, then click on an empty panel to assign it
              </Typography>
              
              <Grid container spacing={1}>
                {unassignedImages.map((img, displayIndex) => (
                  <Grid item key={`unassigned-${img.originalIndex}`} xs={3} sm={2} md={1.5}>
                    <Paper
                      elevation={2}
                      sx={{
                        position: 'relative',
                        aspectRatio: '1',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          boxShadow: theme.shadows[4],
                        }
                      }}
                      onClick={() => {
                        const nextEmptyPanel = getNextEmptyPanel();
                        if (nextEmptyPanel) {
                          assignImageToPanel(img.originalIndex, nextEmptyPanel);
                        } else {
                          // Show some feedback that all panels are full
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
                          top: 4,
                          right: 4,
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          color: 'error.main',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 1)',
                          },
                          width: 24,
                          height: 24,
                        }}
                      >
                        <Delete sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              
              {/* Quick assign button */}
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => {
                    // Auto-assign as many unassigned images as possible
                    const newMapping = { ...panelImageMapping };
                    let assignedCount = 0;
                    
                    unassignedImages.forEach((img) => {
                      const nextEmptyPanel = getNextEmptyPanelExcluding(newMapping);
                      if (nextEmptyPanel) {
                        newMapping[nextEmptyPanel] = img.originalIndex;
                        assignedCount++;
                      }
                    });
                    
                    if (assignedCount > 0) {
                      updatePanelImageMapping(newMapping);
                      debugLog(`Auto-assigned ${assignedCount} unassigned images`);
                    }
                  }}
                  disabled={getNextEmptyPanel() === null}
                >
                  Auto-assign to empty panels
                </Button>
              </Box>
            </Box>
          );
        }
        return null;
      })()}

      {/* Layout Preview */}
      <Box sx={{ 
        p: isMobile ? 2 : 2, 
        mb: isMobile ? 2 : 2, 
        borderRadius: 2, 
        textAlign: 'center', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        position: 'relative',
      }}>        
        {/* Always render the preview, let it handle null templates */}
        <Box sx={{ 
          width: isMobile ? 'calc(100vw - 16px)' : '100%', 
          maxWidth: isMobile ? 'none' : '600px', 
          margin: isMobile ? '0 calc(-50vw + 50% - 8px)' : '0 auto',
          mb: 2,
          position: 'relative'
        }} id="collage-preview-container">
          <CollagePreview 
            selectedTemplate={selectedTemplate}
            selectedAspectRatio={selectedAspectRatio}
            panelCount={panelCount || 2} /* Ensure we always have a fallback */
            selectedImages={selectedImages || []}
            addImage={addImage}
            addMultipleImages={addMultipleImages}
            removeImage={removeImage}
            updateImage={updateImage}
            replaceImage={replaceImage}
            updatePanelImageMapping={updatePanelImageMapping}
            panelImageMapping={panelImageMapping || {}}
            panelTransforms={panelTransforms || {}}
            updatePanelTransform={updatePanelTransform}
            onCropRequest={handleOpenCropModal}
            borderThickness={borderThickness}
            borderColor={borderColor}
          />
        </Box>
        <Typography 
          variant={isMobile ? "body2" : "subtitle2"} 
          color="text.secondary" 
          gutterBottom 
          sx={{ 
            mb: 2, 
            fontWeight: 500,
            textAlign: 'center'
          }}
        >
          Upload images above, then assign to panels by clicking. 
          <br />
          Fill all frames to generate your collage.
        </Typography>
      </Box>
    </Box>
  );

  // Function to save the collage as an image AND open dialog
  async function saveCollageAsImage() {
    debugLog('Generating collage and opening preview...');
    const collagePreviewElement = document.querySelector('[data-testid="dynamic-collage-preview-root"]');

    if (!collagePreviewElement) {
      logError('Collage preview element not found.');
      return;
    }

    // Temporarily hide control icons by adding a CSS class
    collagePreviewElement.classList.add('export-mode');

    try {
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      
      // --- NEW: Prepare data for canvas rendering ---
      const canvasData = {
        selectedTemplate,
        selectedAspectRatio,
        panelCount,
        theme, // Pass theme for consistency
        borderThickness, // Pass numeric value
        borderColor,
        displayImageUrls: selectedImages.map(img => img.displayUrl).filter(url => typeof url === 'string'),
        panelImageMapping,
        panelTransforms // Pass the transform state
      };
      
      debugLog("Data being used by html2canvas (for debug):", canvasData);
      
      // NOTE: html2canvas currently does not fully respect the CSS
      // `object-fit` property that we are using on the <img> tags inside
      // each panel. This ends up stretching the captured images even though
      // they look correct in the live preview. As a workaround we convert
      // each <img> that relies on `object-fit: cover` into a DIV with a
      // `background-image` set to the same source in the *cloned* document
      // that html2canvas uses for rendering.  Using a background-image with
      // `background-size: cover` is properly supported by html2canvas and
      // produces a faithful render while leaving the on‑screen preview and
      // all zoom / pan interactions untouched.

      const canvas = await html2canvas(collagePreviewElement, {
        useCORS: true,
        allowTaint: true,
        logging: DEBUG_MODE,
        scale: window.devicePixelRatio * 2,
        onclone: (clonedDoc) => {
          try {
            // Limit the query to the collage root to avoid touching other
            // images which might exist elsewhere in the DOM.
            const root = clonedDoc.querySelector('[data-testid="dynamic-collage-preview-root"]');
            if (!root) return;

            root.querySelectorAll('img').forEach((img) => {
              const computed = clonedDoc.defaultView.getComputedStyle(img);

              // Only patch images that were using object-fit: cover (the ones
              // inside the panels).  Other images (e.g. icons) should be left
              // alone.
              if (computed.getPropertyValue('object-fit') !== 'cover') return;

              const src = img.getAttribute('src');
              if (!src) return;

              const replacement = clonedDoc.createElement('div');

              // Preserve size – the parent element already defines the box so
              // we can simply make the DIV take 100% of the available space.
              replacement.style.width = '100%';
              replacement.style.height = '100%';

              replacement.style.backgroundImage = `url('${src}')`;
              replacement.style.backgroundSize = 'cover';
              replacement.style.backgroundPosition = 'center center';
              replacement.style.backgroundRepeat = 'no-repeat';

              // Copy over any transforms that were applied by react‑zoom‑pan‑pinch
              // so that cropping/zooming is captured correctly in the render.
              const transform = computed.getPropertyValue('transform');
              if (transform && transform !== 'none') {
                replacement.style.transform = transform;
              }

              // html2canvas reads the *computed* style, so inline styles on the
              // replacement div are sufficient.

              img.parentNode.replaceChild(replacement, img);
            });
          } catch (cloneErr) {
            console.error('onclone processing failed', cloneErr);
          }
        },
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      
      if (setFinalImage) {
        setFinalImage(dataUrl);
        debugLog("Final image state updated.");
        
        // Prioritize inline result over dialog
        if (onCollageGenerated) {
          onCollageGenerated();
          debugLog("Inline result triggered.");
        } else if (handleOpenExportDialog) {
          handleOpenExportDialog(); 
          debugLog("Export dialog triggered.");
        } else {
          debugWarn("No result handler provided to CollageImagesStep.");
        }

      } else {
        debugWarn("setFinalImage function not provided to CollageImagesStep.");
      }

    } catch (err) {
      logError('Error generating collage image:', err);
    } finally {
      // Remove the export mode class to restore controls
      collagePreviewElement.classList.remove('export-mode');
    }
  }
};

// Add defaultProps (ensure new replaceImage prop has default)
CollageImagesStep.defaultProps = {
  selectedImages: [],
  panelCount: 2,
  selectedAspectRatio: 'portrait',
  borderThickness: 'medium',
  borderThicknessOptions: [ 
    { label: "None", value: 0 },        // 0%
    { label: "Thin", value: 0.5 },      // 0.5%
    { label: "Medium", value: 1.5 },    // 1.5%
    { label: "Thicc", value: 4 },       // 4%
    { label: "Thiccer", value: 7 },     // 7%
    { label: "XTRA THICC", value: 12 }, // 12%
    { label: "UNGODLY CHONK'D", value: 20 } // 20%
  ],
  panelImageMapping: {},
  addImage: () => { console.warn("addImage default prop called"); },
  addMultipleImages: () => { console.warn("addMultipleImages default prop called"); },
  removeImage: () => { console.warn("removeImage default prop called"); },
  updateImage: () => { console.warn("updateImage default prop called"); },
  replaceImage: () => { console.warn("replaceImage default prop called"); }, // Add default
  clearImages: () => { console.warn("clearImages default prop called"); },
  updatePanelImageMapping: () => { console.warn("updatePanelImageMapping default prop called"); },
  handleNext: () => {},
  setFinalImage: () => { console.warn("setFinalImage default prop called"); }, // Add default
  handleOpenExportDialog: () => { console.warn("handleOpenExportDialog default prop called"); }, // Add default
  onCollageGenerated: null, // Add default for new handler
};

export default CollageImagesStep;
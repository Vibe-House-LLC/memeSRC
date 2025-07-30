import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  ImageList,
  ImageListItem,
  Card,
  CardActionArea,
  Button,
  useMediaQuery,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Collapse,
} from '@mui/material';
import { Add, CheckCircle, Delete, Close } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { Storage } from 'aws-amplify';

// Utility function to resize image using canvas
const resizeImage = (file, maxSize = 1500) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      try {
        const { width, height } = img;
        
        // Calculate new dimensions maintaining aspect ratio
        let newWidth = width;
        let newHeight = height;
        
        if (width > height) {
          // Width is the longer side
          if (width > maxSize) {
            newWidth = maxSize;
            newHeight = (height * maxSize) / width;
          }
        } else if (height > maxSize) {
          // Height is the longer side
          newHeight = maxSize;
          newWidth = (width * maxSize) / height;
        }
        
        // Set canvas dimensions
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        
        // Convert to blob with quality setting
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          file.type || 'image/jpeg',
          0.85 // Quality setting for JPEG
        );
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    // Load the image
    img.src = URL.createObjectURL(file);
  });
};

// Utility function to save data URL to library
export const saveImageToLibrary = async (dataUrl, filename = null) => {
  try {
    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const originalBlob = await response.blob();
    
    // Create a file object from the blob to use with resizeImage
    const file = new File([originalBlob], filename || 'collage-image', { 
      type: originalBlob.type 
    });
    
    let blobToUpload;
    try {
      // Try to resize the image
      blobToUpload = await resizeImage(file);
    } catch (resizeError) {
      console.warn('Failed to resize image for library, using original:', resizeError);
      blobToUpload = originalBlob;
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).slice(2);
    const extension = blobToUpload.type ? blobToUpload.type.split('/')[1] : 'jpg';
    const key = `library/${timestamp}-${randomId}-${filename || 'collage-image'}.${extension}`;
    
    // Save to AWS Storage
    await Storage.put(key, blobToUpload, {
      level: 'protected',
      contentType: blobToUpload.type,
    });
    
    console.log('Successfully saved image to library:', key);
    return key;
  } catch (error) {
    console.error('Error saving image to library:', error);
    throw error;
  }
};

const MyLibrary = ({ onSelect, refreshTrigger }) => {
  const [images, setImages] = useState([]);
  const [selected, setSelected] = useState([]);
  const [allImageKeys, setAllImageKeys] = useState([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectMultipleMode, setSelectMultipleMode] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const IMAGES_PER_PAGE = 10;

  const fetchAllImageKeys = async () => {
    try {
      const listed = await Storage.list('library/', { level: 'protected' });
      
      // Sort by lastModified date, newest first
      const sortedResults = listed.results.sort((a, b) => {
        const dateA = new Date(a.lastModified);
        const dateB = new Date(b.lastModified);
        return dateB - dateA; // Descending order (newest first)
      });
      
      setAllImageKeys(sortedResults);
      return sortedResults;
    } catch (err) {
      console.error('Error loading library image keys', err);
      return [];
    }
  };

  const loadImages = async (startIndex = 0, append = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const keys = allImageKeys.length > 0 ? allImageKeys : await fetchAllImageKeys();
      const endIndex = Math.min(startIndex + IMAGES_PER_PAGE, keys.length);
      const keysToLoad = keys.slice(startIndex, endIndex);
      
      const imageData = await Promise.all(
        keysToLoad.map(async (item) => {
          // Just get signed URLs for display - no expensive conversion yet
          const url = await Storage.get(item.key, { level: 'protected' });
          return { key: item.key, url };
        })
      );
      
      setImages(prev => append ? [...prev, ...imageData] : imageData);
      setLoadedCount(endIndex);
    } catch (err) {
      console.error('Error loading library images', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchImages = async () => {
    setImages([]);
    setLoadedCount(0);
    const keys = await fetchAllImageKeys();
    if (keys.length > 0) {
      await loadImages(0, false);
    }
  };

  const loadMoreImages = async () => {
    await loadImages(loadedCount, true);
  };

  useEffect(() => {
    fetchImages();
  }, []);

  // Effect to refresh library when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      fetchImages();
    }
  }, [refreshTrigger]);

  const toggleSelect = (key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleImageClick = (img) => {
    if (selectMultipleMode) {
      toggleSelect(img.key);
    } else {
      setPreviewImage(img);
      setPreviewOpen(true);
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewImage(null);
  };

  const handleDeleteImage = async () => {
    if (!previewImage) return;
    
    setDeleting(true);
    try {
      await Storage.remove(previewImage.key, { level: 'protected' });
      console.log('Successfully deleted image:', previewImage.key);
      
      // Remove from local state
      setImages(prev => prev.filter(img => img.key !== previewImage.key));
      setAllImageKeys(prev => prev.filter(item => item.key !== previewImage.key));
      setSelected(prev => prev.filter(key => key !== previewImage.key));
      
      handleClosePreview();
    } catch (error) {
      console.error('Error deleting image:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selected.length === 0) return;
    
    setDeleting(true);
    try {
      // Delete all selected images from AWS Storage
      await Promise.all(
        selected.map(key => Storage.remove(key, { level: 'protected' }))
      );
      
      console.log('Successfully deleted images:', selected);
      
      // Remove deleted images from local state
      setImages(prev => prev.filter(img => !selected.includes(img.key)));
      setAllImageKeys(prev => prev.filter(item => !selected.includes(item.key)));
      setSelected([]);
      
    } catch (error) {
      console.error('Error deleting selected images:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = async () => {
    if (!onSelect) return;
    
    try {
      // Get selected images
      const selectedImages = images.filter((img) => selected.includes(img.key));
      
      // Convert only the selected images to data URLs for canvas compatibility
      // and mark them as library-sourced to prevent re-saving
      const imageObjects = await Promise.all(
        selectedImages.map(async (img) => {
          try {
            // Use Storage.get with download: true to get the file content
            const downloadResult = await Storage.get(img.key, { 
              level: 'protected',
              download: true 
            });
            
            // Handle different possible return types
            let blob;
            if (downloadResult instanceof Blob) {
              blob = downloadResult;
            } else if (downloadResult.Body && downloadResult.Body instanceof Blob) {
              blob = downloadResult.Body;
            } else if (downloadResult instanceof ArrayBuffer) {
              // Convert ArrayBuffer to Blob
              blob = new Blob([downloadResult]);
            } else {
              throw new Error(`Unexpected download result type: ${typeof downloadResult}`);
            }
            
            // Convert blob to data URL
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            
            // Return object with metadata to indicate library source
            return {
              originalUrl: dataUrl,
              displayUrl: dataUrl,
              metadata: {
                isFromLibrary: true,
                libraryKey: img.key
              }
            };
          } catch (error) {
            console.error('Error converting selected image:', img.key, error);
            // Fallback to regular URL if conversion fails
            return {
              originalUrl: img.url,
              displayUrl: img.url,
              metadata: {
                isFromLibrary: true,
                libraryKey: img.key
              }
            };
          }
        })
      );
      
      onSelect(imageObjects);
      setSelected([]);
    } catch (error) {
      console.error('Error processing selected images:', error);
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      // Process and upload files with resizing
      const uploadedImages = await Promise.all(
        files.map(async (file) => {
          try {
            // Resize the image before uploading
            const resizedBlob = await resizeImage(file);
            
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).slice(2);
            const key = `library/${timestamp}-${randomId}-${file.name}`;
            
            await Storage.put(key, resizedBlob, {
              level: 'protected',
              contentType: resizedBlob.type || file.type,
            });
            
            // Get the signed URL for immediate display
            const url = await Storage.get(key, { level: 'protected' });
            
            return {
              key,
              url,
              lastModified: new Date().toISOString(),
              size: resizedBlob.size
            };
          } catch (resizeError) {
            console.warn('Failed to resize image, uploading original:', file.name, resizeError);
            
            // Fallback to original file if resizing fails
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).slice(2);
            const key = `library/${timestamp}-${randomId}-${file.name}`;
            
            await Storage.put(key, file, {
              level: 'protected',
              contentType: file.type,
            });
            
            const url = await Storage.get(key, { level: 'protected' });
            
            return {
              key,
              url,
              lastModified: new Date().toISOString(),
              size: file.size
            };
          }
        })
      );

      console.log('Successfully uploaded files:', uploadedImages.map(r => r.key));

      // Add uploaded images to the beginning of the current images list for immediate display
      setImages(prev => [...uploadedImages, ...prev]);
      
      // Update allImageKeys to include the new items
      setAllImageKeys(prev => [
        ...uploadedImages.map(img => ({ key: img.key, lastModified: img.lastModified, size: img.size })),
        ...prev
      ]);
      
      // Update loaded count
      setLoadedCount(prev => prev + uploadedImages.length);
      
    } catch (err) {
      console.error('Error uploading library images', err);
    } finally {
      if (e.target) e.target.value = null;
    }
  };

  const cols = isMobile ? 3 : 4;

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          My Library
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={selectMultipleMode}
              onChange={(e) => {
                setSelectMultipleMode(e.target.checked);
                // Clear selections when switching modes
                if (!e.target.checked) {
                  setSelected([]);
                }
              }}
              size="small"
            />
          }
          label="Select Multiple"
          sx={{ mr: 0 }}
        />
      </Box>
      
      {/* Action buttons row */}
      <Collapse 
        in={selectMultipleMode && selected.length > 0}
        timeout={300}
        sx={{
          '& .MuiCollapse-wrapper': {
            '& .MuiCollapse-wrapperInner': {
              transition: 'opacity 300ms ease-in-out',
              opacity: selectMultipleMode && selected.length > 0 ? 1 : 0,
            }
          }
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          mb: 2,
          justifyContent: 'center'
        }}>
          <Button 
            variant="outlined" 
            color="error" 
            size="small" 
            onClick={handleDeleteSelected}
            disabled={deleting}
            startIcon={<Delete />}
            sx={{ minWidth: isMobile ? '85px' : '110px' }}
          >
            {deleting ? 'Deleting...' : `Delete (${selected.length})`}
          </Button>
          <Button 
            variant="contained" 
            size="small" 
            onClick={handleCreate}
            sx={{ minWidth: isMobile ? '75px' : '100px' }}
          >
            Create ({selected.length})
          </Button>
        </Box>
      </Collapse>
      <ImageList cols={cols} gap={8} rowHeight={80} sx={{ m: 0 }}>
        <ImageListItem key="upload">
          <CardActionArea 
            onClick={() => fileInputRef.current?.click()} 
            sx={{ 
              height: '100%',
              borderRadius: 1,
              '&:hover': {
                '& .MuiCard-root': {
                  boxShadow: 2,
                }
              }
            }}
          >
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <Add />
            </Card>
          </CardActionArea>
        </ImageListItem>
        {images.map((img) => {
          const isSelected = selected.includes(img.key);
          return (
            <ImageListItem key={img.key} sx={{ cursor: 'pointer' }}>
              <CardActionArea
                onClick={() => handleImageClick(img)}
                sx={{ 
                  height: '100%', 
                  position: 'relative',
                  borderRadius: 1,
                  '&:hover': {
                    '& .MuiCard-root': {
                      boxShadow: 2,
                    }
                  }
                }}
              >
                <Card sx={{ height: '100%', borderRadius: 1 }}>
                  <img
                    src={img.url}
                    alt="library"
                    style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '4px' }}
                  />
                </Card>
                {selectMultipleMode && isSelected && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      bgcolor: 'rgba(0,0,0,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'primary.contrastText',
                      borderRadius: 1,
                    }}
                  >
                    <CheckCircle fontSize="large" />
                  </Box>
                )}
              </CardActionArea>
            </ImageListItem>
          );
        })}
      </ImageList>
      
      {/* Load More Button */}
      {loadedCount < allImageKeys.length && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button 
            variant="outlined" 
            onClick={loadMoreImages}
            disabled={loading}
            size="small"
          >
            {loading ? 'Loading...' : `Load More (${allImageKeys.length - loadedCount} remaining)`}
          </Button>
        </Box>
      )}
      <input
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {/* Image Preview Modal */}
      <Dialog
        open={previewOpen}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6">Image Preview</Typography>
          <IconButton onClick={handleClosePreview} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          minHeight: '400px',
          p: 2
        }}>
          {previewImage && (
            <img
              src={previewImage.url}
              alt="Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '4px'
              }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
          <Button
            onClick={handleDeleteImage}
            color="error"
            variant="contained"
            startIcon={<Delete />}
            disabled={deleting}
            sx={{ minWidth: '120px' }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

MyLibrary.propTypes = {
  onSelect: PropTypes.func,
  refreshTrigger: PropTypes.any,
};

MyLibrary.defaultProps = {
  onSelect: null,
  refreshTrigger: null,
};

export default MyLibrary;

import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  ImageList,
  ImageListItem,
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
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import { Add, CheckCircle, Delete, Close, Dashboard } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { Storage } from 'aws-amplify';

// Utility function to resize image using canvas
const resizeImage = (file, maxSize = 1500) => new Promise((resolve, reject) => {
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
      cacheControl: 'max-age=31536000',
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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState({});
  const progressRef = useRef({});
  const uploadsRef = useRef({});
  const MAX_CONCURRENT_UPLOADS = 3;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const IMAGES_PER_PAGE = 10;

  const CACHE_KEY = 'libraryUrlCache';
  const SIGNED_URL_EXPIRATION = 24 * 60 * 60; // seconds
  const CACHE_DURATION = (SIGNED_URL_EXPIRATION - 60 * 60) * 1000; // 1h less


  const getCachedUrl = async (key) => {
    const cacheRaw = localStorage.getItem(CACHE_KEY);
    let cache = {};
    try {
      if (cacheRaw) {
        cache = JSON.parse(cacheRaw);
      }
    } catch (err) {
      console.warn('Error parsing cache', err);
      cache = {};
    }

    const cached = cache[key];
    const now = Date.now();
    
    if (cached && cached.expiresAt && cached.expiresAt > now) {
      console.log('📸 Cache HIT for', key.split('/').pop());
      return cached.url;
    }

    console.log('📡 Cache MISS for', key.split('/').pop(), cached ? '(expired)' : '(not found)');
    const url = await Storage.get(key, { level: 'protected', expires: SIGNED_URL_EXPIRATION });
    cache[key] = { url, expiresAt: now + CACHE_DURATION };
    
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (err) {
      console.warn('Error storing image URL cache', err);
    }
    return url;
  };

  const cleanExpiredCache = () => {
    try {
      const cacheRaw = localStorage.getItem(CACHE_KEY);
      if (!cacheRaw) return;
      
      const cache = JSON.parse(cacheRaw);
      const now = Date.now();
      let cleanedCount = 0;
      
      Object.keys(cache).forEach(key => {
        if (!cache[key].expiresAt || cache[key].expiresAt <= now) {
          delete cache[key];
          cleanedCount+=1;
        }
      });
      
      if (cleanedCount > 0) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        console.log('Cleaned', cleanedCount, 'expired cache entries');
      }
    } catch (err) {
      console.warn('Error cleaning expired cache', err);
    }
  };

  const removeFromCache = (key) => {
    try {
      const cacheRaw = localStorage.getItem(CACHE_KEY);
      if (!cacheRaw) return;
      const cache = JSON.parse(cacheRaw);
      if (cache[key]) {
        delete cache[key];
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch (err) {
          console.warn('Error updating image URL cache', err);
        }
      }
    } catch (err) {
      console.warn('Error removing URL from cache', err);
    }
  };

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
          const url = await getCachedUrl(item.key);
          return { key: item.key, url };
        })
      );

      setImages(prev => (append ? [...prev, ...imageData] : imageData));
      setImageLoaded(prev => ({
        ...prev,
        ...Object.fromEntries(imageData.map(img => [img.key, false]))
      }));
      setLoadedCount(endIndex);
    } catch (err) {
      console.error('Error loading library images', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchImages = async () => {
    // Clean expired cache entries before loading
    cleanExpiredCache();
    
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
    // Clean expired cache on component mount
    cleanExpiredCache();
    fetchImages();
  }, []);

  // Effect to refresh library when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger) {
      fetchImages();
    }
  }, [refreshTrigger]);

  // Effect to handle window resize for responsive grid
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleUseInCollage = () => {
    if (!previewImage) return;
    
    // Close the preview modal
    setPreviewOpen(false);
    
    // Enable select mode
    setSelectMultipleMode(true);
    
    // Select only this image (clear other selections)
    setSelected([previewImage.key]);
    
    // Clear preview image
    setPreviewImage(null);
  };

  const handleDeleteImage = async () => {
    if (!previewImage) return;
    
    setDeleting(true);
    try {
      await Storage.remove(previewImage.key, { level: 'protected' });
      removeFromCache(previewImage.key);
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
      selected.forEach(removeFromCache);
      
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

  const handleImageLoad = (key) => {
    setImageLoaded(prev => ({ ...prev, [key]: true }));
  };

  const handlePreviewLoad = (id) => {
    setImages(prev => prev.map(img => (img.id === id ? { ...img, previewLoaded: true } : img)));
  };

  const updateProgress = (id, progress) => {
    progressRef.current[id] = progress;
    setImages(prev => prev.map(img => (img.id === id ? { ...img, progress } : img)));
  };

  const finalizeUpload = (id, data) => {
    setImages(prev => prev.map(img => {
      if (img.id === id) {
        return { key: data.key, url: img.previewUrl, previewUrl: img.previewUrl };
      }
      return img;
    }));
    setImageLoaded(prev => ({ ...prev, [data.key]: true }));
    progressRef.current[id] = 100;
  };

  const uploadSingle = async (file, id) => {
    try {
      let blob;
      try {
        blob = await resizeImage(file);
      } catch (err) {
        console.warn('Failed to resize image, uploading original:', file.name, err);
        blob = file;
      }

      const timestamp = Date.now();
      const randomId = Math.random().toString(36).slice(2);
      const key = `library/${timestamp}-${randomId}-${file.name}`;

      await Storage.put(key, blob, {
        level: 'protected',
        contentType: blob.type || file.type,
        cacheControl: 'max-age=31536000',
        progressCallback: progress => {
          const percent = (progress.loaded / progress.total) * 100;
          updateProgress(id, percent);
        }
      });

      finalizeUpload(id, { key, size: blob.size, lastModified: new Date().toISOString() });

      setAllImageKeys(prev => [
        { key, lastModified: new Date().toISOString(), size: blob.size },
        ...prev
      ]);
      setLoadedCount(prev => prev + 1);
    } catch (err) {
      console.error('Error uploading library image', err);
      updateProgress(id, 100);
    }
  };

  const processUploads = async (placeholders) => {
    let index = 0;
    /* eslint-disable no-await-in-loop */
    const worker = async () => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const current = index;
        index += 1;
        if (current >= placeholders.length) break;
        const ph = placeholders[current];
        const file = uploadsRef.current[ph.id];
        await uploadSingle(file, ph.id);
      }
    };
    /* eslint-enable no-await-in-loop */
    const workers = Array.from({ length: Math.min(MAX_CONCURRENT_UPLOADS, placeholders.length) }, worker);
    await Promise.all(workers);
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    progressRef.current = {};

    const placeholders = files.map((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      uploadsRef.current[id] = file;
      return { id, previewUrl: URL.createObjectURL(file), progress: 0, previewLoaded: false };
    });

    progressRef.current = placeholders.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {});
    setImages(prev => [...placeholders, ...prev]);
    setImageLoaded(prev => ({
      ...prev,
      ...Object.fromEntries(placeholders.map(ph => [ph.id, true]))
    }));

    await processUploads(placeholders);

    console.log('Successfully uploaded files');
    setUploading(false);
    if (e.target) e.target.value = null;
  };

  const gap = 2; // Gap between items
  const containerPadding = isMobile ? 48 : 64; // Total horizontal padding
  const availableWidth = windowWidth - containerPadding;
  
  // Target thumbnail size range
  const targetThumbnailSize = isMobile ? 80 : 120;
  const minThumbnailSize = isMobile ? 60 : 80;
  
  // Calculate optimal number of columns based on target size
  const idealCols = Math.floor((availableWidth + gap) / (targetThumbnailSize + gap));
  const cols = Math.max(isMobile ? 3 : 4, idealCols); // Minimum columns
  
  // Calculate actual thumbnail size to fill the width
  const actualThumbnailSize = Math.max(
    minThumbnailSize,
    Math.floor((availableWidth - (cols - 1) * gap) / cols)
  );
  
  const rowHeight = actualThumbnailSize;

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
      <ImageList 
        cols={cols} 
        gap={gap} 
        rowHeight={rowHeight} 
        sx={{ 
          m: 0,
          width: '100%' // Fill the full width of the container
        }}
      >
        <ImageListItem key="upload">
          <Box
            onClick={() => !uploading && fileInputRef.current?.click()}
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px dashed',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              cursor: uploading ? 'default' : 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: uploading ? 'background.paper' : 'action.hover',
                borderColor: uploading ? 'divider' : 'primary.main',
              }
            }}
          >
            <Add sx={{ color: 'text.secondary' }} />
          </Box>
        </ImageListItem>
        {images.map((img) => {
          if (!img.key) {
            return (
              <ImageListItem key={img.id}>
                <Box sx={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
                  {img.previewUrl && (
                    <img
                      src={img.previewUrl}
                      alt="uploading"
                      onLoad={() => handlePreviewLoad(img.id)}
                      style={{
                        objectFit: 'cover',
                        width: '100%',
                        height: '100%',
                        opacity: 0.6,
                        display: img.previewLoaded ? 'block' : 'none'
                      }}
                    />
                  )}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...(img.previewLoaded ? {} : { bgcolor: 'action.hover' })
                    }}
                  >
                    <CircularProgress size={24} sx={{ color: 'white' }} />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={img.progress}
                    sx={{ position: 'absolute', bottom: 0, left: 0, width: '100%', '& .MuiLinearProgress-bar': { backgroundColor: 'white' } }}
                  />
                </Box>
              </ImageListItem>
            );
          }
          const isSelected = selected.includes(img.key);
          const loaded = imageLoaded[img.key];
          return (
            <ImageListItem key={img.key} sx={{ cursor: 'pointer' }}>
              <Box
                onClick={() => handleImageClick(img)}
                sx={{
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    transform: 'scale(0.98)',
                    opacity: 0.9,
                  }
                }}
              >
                {!loaded && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      bgcolor: 'action.hover',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CircularProgress size={24} />
                  </Box>
                )}
                <img
                  src={img.url}
                  alt="library"
                  onLoad={() => handleImageLoad(img.key)}
                  style={{
                    objectFit: 'cover',
                    width: '100%',
                    height: '100%',
                    display: loaded ? 'block' : 'none'
                  }}
                />
                {selectMultipleMode && isSelected && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 24,
                      height: 24,
                      bgcolor: 'primary.main',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}
                  >
                    <CheckCircle fontSize="small" sx={{ color: 'white' }} />
                  </Box>
                )}
              </Box>
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
        disabled={uploading}
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
        <DialogActions sx={{ justifyContent: 'center', p: 2, gap: 1 }}>
          <Button
            onClick={handleUseInCollage}
            color="primary"
            variant="contained"
            startIcon={<Dashboard />}
            sx={{ minWidth: '140px' }}
          >
            Use in Collage
          </Button>
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

// Debug function for browser console
if (typeof window !== 'undefined') {
  window.debugLibraryCache = () => {
    const CACHE_KEY = 'libraryUrlCache';
    try {
      const cacheRaw = localStorage.getItem(CACHE_KEY);
      if (!cacheRaw) {
        console.log('🗃️ No cache found');
        return;
      }
      
      const cache = JSON.parse(cacheRaw);
      const now = Date.now();
      const entries = Object.entries(cache);
      
      console.log('🗃️ Cache Status:');
      console.log(`Total entries: ${entries.length}`);
      
      entries.forEach(([key, data]) => {
        const isValid = data.expiresAt && data.expiresAt > now;
        const timeLeft = data.expiresAt ? Math.round((data.expiresAt - now) / 1000 / 60) : 0;
        console.log(`${isValid ? '✅' : '❌'} ${key.split('/').pop()} - ${isValid ? `${timeLeft}min left` : 'expired'}`);
      });
    } catch (err) {
      console.error('Error checking cache:', err);
    }
  };
}

MyLibrary.propTypes = {
  onSelect: PropTypes.func,
  refreshTrigger: PropTypes.any,
};

MyLibrary.defaultProps = {
  onSelect: null,
  refreshTrigger: null,
};

export default MyLibrary;

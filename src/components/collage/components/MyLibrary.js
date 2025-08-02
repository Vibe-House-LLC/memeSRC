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
  IconButton,
  Collapse,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Delete,
  Star,
  StarBorder,
} from '@mui/icons-material';
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
  const loadMoreRef = useRef(null);
  const MAX_CONCURRENT_UPLOADS = 3;

  const FAVORITES_KEY = 'libraryFavorites';
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY));
      if (Array.isArray(stored)) {
        const now = Date.now();
        return stored.reduce((acc, key, idx) => {
          acc[key] = now - idx;
          return acc;
        }, {});
      }
      return stored || {};
    } catch (e) {
      return {};
    }
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const IMAGES_PER_PAGE = 10;

  const CACHE_KEY = 'libraryUrlCache';
  const SIGNED_URL_EXPIRATION = 24 * 60 * 60; // seconds
  const CACHE_DURATION = (SIGNED_URL_EXPIRATION - 60 * 60) * 1000; // 1h less

  const sortLoadedImages = (imgs, favs) => {
    const placeholders = imgs.filter(img => !img.key);
    const existing = imgs.filter(img => img.key);
    existing.sort((a, b) => {
      const aFav = favs[a.key];
      const bFav = favs[b.key];
      if (aFav && bFav) return bFav - aFav;
      if (aFav) return -1;
      if (bFav) return 1;
      return 0;
    });
    return [...placeholders, ...existing];
  };

  const toggleFavorite = (key) => {
    setFavorites(prev => {
      const updated = { ...prev };
      if (updated[key]) {
        delete updated[key];
      } else {
        updated[key] = Date.now();
      }
      return updated;
    });
  };

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); // TODO: Persist to user's GraphQL data
    setImages(prev => sortLoadedImages(prev, favorites));
  }, [favorites]);


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
      
      let keysToLoad;
      let endIndex;
      
      if (startIndex === 0 && !append) {
        // Initial load: prioritize favorites
        const favoriteKeys = keys.filter(item => favorites[item.key]);
        const nonFavoriteKeys = keys.filter(item => !favorites[item.key]);
        
        // Sort favorites by most recently favorited
        favoriteKeys.sort((a, b) => (favorites[b.key] || 0) - (favorites[a.key] || 0));
        
        // Take up to IMAGES_PER_PAGE items, prioritizing favorites
        const totalToLoad = Math.min(IMAGES_PER_PAGE, keys.length);
        keysToLoad = [...favoriteKeys, ...nonFavoriteKeys].slice(0, totalToLoad);
        endIndex = totalToLoad;
      } else {
        // Subsequent loads: avoid duplicates by checking what's already loaded
        const currentlyLoadedKeys = new Set(images.filter(img => img.key).map(img => img.key));
        const unloadedKeys = keys.filter(item => !currentlyLoadedKeys.has(item.key));
        
        const remainingToLoad = Math.min(IMAGES_PER_PAGE, unloadedKeys.length);
        keysToLoad = unloadedKeys.slice(0, remainingToLoad);
        endIndex = loadedCount + remainingToLoad;
      }
      
      const imageData = await Promise.all(
        keysToLoad.map(async (item) => {
          const url = await getCachedUrl(item.key);
          return { key: item.key, url };
        })
      );

      setImages(prev => {
        const newImages = append ? [...prev, ...imageData] : imageData;
        return sortLoadedImages(newImages, favorites);
      });
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

  // Automatically load more images when scrolling near the bottom
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [first] = entries;
        if (first.isIntersecting && !loading && loadedCount < allImageKeys.length) {
          loadMoreImages();
        }
      },
      { rootMargin: '200px' }
    );
    const { current } = loadMoreRef;
    if (current) observer.observe(current);
    return () => {
      if (current) observer.unobserve(current);
    };
  }, [loading, loadedCount, allImageKeys.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
      
      // Remove from favorites and local state
      setFavorites(prev => {
        const updated = { ...prev };
        delete updated[previewImage.key];
        return updated;
      });
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
      
      // Remove deleted images from favorites and local state
      setFavorites(prev => {
        const updated = { ...prev };
        selected.forEach(key => { delete updated[key]; });
        return updated;
      });
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
    const queue = [...placeholders];
    /* eslint-disable no-await-in-loop */
    const worker = async () => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const ph = queue.shift();
        if (!ph) break;
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
    setImages(prev => sortLoadedImages([...placeholders, ...prev], favorites));
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
                  transition: 'opacity 0.15s ease',
                  '&:hover': {
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
                  loading="lazy"
                  style={{
                    objectFit: 'cover',
                    width: '100%',
                    height: '100%',
                    display: loaded ? 'block' : 'none'
                  }}
                />
                {favorites[img.key] && (
                  <Star
                    fontSize="small"
                    sx={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      color: 'white',
                      zIndex: 2,
                      filter: 'drop-shadow(0px 1px 3px rgba(0,0,0,0.8))',
                      backgroundColor: 'warning.main',
                      borderRadius: '50%',
                      padding: '2px',
                    }}
                  />
                )}
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
      
      {loading && images.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      {loadedCount < allImageKeys.length && <Box ref={loadMoreRef} sx={{ height: 1 }} />}
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
        maxWidth={false}
        fullScreen={isMobile}
        fullWidth={!isMobile}
        PaperProps={{
          sx: { 
            borderRadius: isMobile ? 0 : 3,
            maxWidth: isMobile ? '100%' : '90vw',
            maxHeight: isMobile ? '100%' : '90vh',
            margin: isMobile ? 0 : 2,
            bgcolor: 'background.paper',
            boxShadow: isMobile ? 'none' : 24,
          }
        }}
        TransitionProps={{
          timeout: 400,
        }}
        sx={{
          '& .MuiDialog-container': {
            alignItems: isMobile ? 'stretch' : 'center',
            justifyContent: isMobile ? 'stretch' : 'center',
          }
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: isMobile ? 2 : 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
            minHeight: isMobile ? 64 : 72,
            bgcolor: 'background.paper',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {favorites[previewImage?.key] && (
              <Star
                sx={{
                  color: 'warning.main',
                  fontSize: isMobile ? '1.2rem' : '1.4rem',
                }}
              />
            )}
            <Typography 
              variant={isMobile ? "h6" : "h5"} 
              sx={{ 
                fontWeight: 600,
                color: 'text.primary',
                fontSize: isMobile ? '1.1rem' : '1.25rem',
              }}
            >
              Image Preview
            </Typography>
          </Box>
          <IconButton 
            onClick={handleDeleteImage}
            disabled={deleting}
            size={isMobile ? "medium" : "large"}
            sx={{
              color: 'error.main',
              bgcolor: 'error.lighter',
              '&:hover': {
                bgcolor: 'error.light',
                transform: 'scale(1.1)',
              },
              '&:disabled': {
                color: 'text.disabled',
                bgcolor: 'action.disabledBackground',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <Delete fontSize={isMobile ? "medium" : "large"} />
          </IconButton>
        </Box>

        {/* Image Content */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: isMobile ? 1.5 : 3,
            bgcolor: 'background.default',
            overflow: 'hidden',
            // Calculate available height: full screen minus header, footer, and padding
            height: isMobile 
              ? 'calc(100vh - 64px - 120px - 24px)' // header - footer - padding
              : 'calc(90vh - 72px - 88px - 48px)', // header - footer - padding
          }}
        >
          {previewImage && (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <img
                src={previewImage.url}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  transition: 'transform 0.3s ease-in-out',
                }}
              />
            </Box>
          )}
        </Box>

        {/* Action Buttons */}
        <Box
          sx={{
            p: isMobile ? 2 : 3,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            position: 'sticky',
            bottom: 0,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              justifyContent: 'center',
              alignItems: 'stretch',
              maxWidth: isMobile ? '100%' : '600px',
              margin: '0 auto',
            }}
          >
            {/* Primary actions row */}
            <Box
              sx={{
                display: 'flex',
                gap: 1.5,
                justifyContent: 'center',
              }}
            >
              <Button
                onClick={() => {
                  if (previewImage?.key) {
                    toggleFavorite(previewImage.key);
                  }
                }}
                variant={
                  previewImage?.key && favorites[previewImage.key]
                    ? 'contained'
                    : 'outlined'
                }
                startIcon={
                  previewImage?.key && favorites[previewImage.key] ? <Star /> : <StarBorder />
                }
                size="large"
                sx={{
                  minHeight: 48,
                  flex: 1,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  // Explicit colors for dark mode compatibility
                  ...(favorites[previewImage?.key] ? {
                    bgcolor: '#FFB726',
                    color: '#000',
                    borderColor: '#FFB726',
                    '&:hover': {
                      bgcolor: '#FF9800',
                      borderColor: '#FF9800',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(255, 183, 38, 0.4)',
                    },
                  } : {
                    color: '#FFB726',
                    borderColor: '#FFB726',
                    bgcolor: 'transparent',
                    '&:hover': {
                      bgcolor: 'rgba(255, 183, 38, 0.1)',
                      borderColor: '#FF9800',
                      transform: 'translateY(-1px)',
                      boxShadow: 4,
                    },
                  }),
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                {favorites[previewImage?.key] ? 'Unfavorite' : 'Favorite'}
              </Button>

              <Button
                onClick={handleUseInCollage}
                variant="contained"
                startIcon={<Add />}
                size="large"
                sx={{
                  minHeight: 48,
                  flex: 1,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #3d2459 30%, #6b42a1 90%)',
                  border: '1px solid #8b5cc7',
                  boxShadow: '0 6px 20px rgba(107, 66, 161, 0.4)',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #472a69 30%, #7b4cb8 90%)',
                    boxShadow: '0 8px 25px rgba(107, 66, 161, 0.6)',
                    transform: 'translateY(-1px)',
                  },
                  transition: 'all 0.3s ease-in-out',
                }}
              >
                Collage
              </Button>
            </Box>

            {/* Close button - full width on mobile, part of row on desktop */}
            {isMobile ? (
              <Button
                onClick={handleClosePreview}
                variant="outlined"
                size="large"
                sx={{
                  minHeight: 48,
                  width: '100%',
                  borderRadius: 3,
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#9E9E9E',
                  borderColor: '#424242',
                  bgcolor: 'transparent',
                  '&:hover': {
                    color: '#FFFFFF',
                    borderColor: '#666666',
                    bgcolor: 'rgba(158, 158, 158, 0.1)',
                    transform: 'translateY(-1px)',
                    boxShadow: 4,
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                Close
              </Button>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  onClick={handleClosePreview}
                  variant="outlined"
                  size="large"
                  sx={{
                    minHeight: 48,
                    minWidth: 120,
                    borderRadius: 3,
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#9E9E9E',
                    borderColor: '#424242',
                    bgcolor: 'transparent',
                    '&:hover': {
                      color: '#FFFFFF',
                      borderColor: '#666666',
                      bgcolor: 'rgba(158, 158, 158, 0.1)',
                      transform: 'translateY(-1px)',
                      boxShadow: 4,
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  Close
                </Button>
              </Box>
            )}
          </Box>
        </Box>
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

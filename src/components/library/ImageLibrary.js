import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  ImageList,
  ImageListItem,
  Button,
  Switch,
  FormControlLabel,
  useMediaQuery
} from '@mui/material';
import { Add, CheckCircle } from '@mui/icons-material';
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
      let newWidth = width;
      let newHeight = height;
      if (width > height) {
        if (width > maxSize) {
          newWidth = maxSize;
          newHeight = (height * maxSize) / width;
        }
      } else if (height > maxSize) {
        newHeight = maxSize;
        newWidth = (width * maxSize) / height;
      }
      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        file.type || 'image/jpeg',
        0.85
      );
    } catch (error) {
      reject(error);
    }
  };

  img.onerror = () => {
    reject(new Error('Failed to load image'));
  };

  img.src = URL.createObjectURL(file);
});

export const saveImageToLibrary = async (dataUrl, filename = null) => {
  try {
    const response = await fetch(dataUrl);
    const originalBlob = await response.blob();
    const file = new File([originalBlob], filename || 'collage-image', {
      type: originalBlob.type
    });

    let blobToUpload;
    try {
      blobToUpload = await resizeImage(file);
    } catch (resizeError) {
      console.warn('Failed to resize image for library, using original:', resizeError);
      blobToUpload = originalBlob;
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).slice(2);
    const extension = blobToUpload.type ? blobToUpload.type.split('/')[1] : 'jpg';
    const key = `library/${timestamp}-${randomId}-${filename || 'collage-image'}.${extension}`;

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

const ImageLibrary = ({ onSelect, refreshTrigger }) => {
  const [images, setImages] = useState([]);
  const [selected, setSelected] = useState([]);
  const [allImageKeys, setAllImageKeys] = useState([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectMultipleMode, setSelectMultipleMode] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const fileInputRef = useRef(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const IMAGES_PER_PAGE = 10;

  const fetchAllImageKeys = async () => {
    try {
      const listed = await Storage.list('library/', { level: 'protected' });
      const sortedResults = listed.results.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
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
          const url = await Storage.get(item.key, { level: 'protected', expires: 3600 });
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

  useEffect(() => {
    if (refreshTrigger) {
      fetchImages();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSelect = (key) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const convertLibraryImage = async (img) => {
    try {
      const downloadResult = await Storage.get(img.key, { level: 'protected', download: true });
      let blob;
      if (downloadResult instanceof Blob) {
        blob = downloadResult;
      } else if (downloadResult.Body && downloadResult.Body instanceof Blob) {
        blob = downloadResult.Body;
      } else if (downloadResult instanceof ArrayBuffer) {
        blob = new Blob([downloadResult]);
      } else {
        throw new Error(`Unexpected download result type: ${typeof downloadResult}`);
      }
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return {
        originalUrl: dataUrl,
        displayUrl: dataUrl,
        metadata: { isFromLibrary: true, libraryKey: img.key }
      };
    } catch (error) {
      console.error('Error converting selected image:', img.key, error);
      return {
        originalUrl: img.url,
        displayUrl: img.url,
        metadata: { isFromLibrary: true, libraryKey: img.key }
      };
    }
  };

  const handleImageClick = async (img) => {
    if (selectMultipleMode) {
      toggleSelect(img.key);
    } else if (onSelect) {
      const processed = await convertLibraryImage(img);
      onSelect([processed]);
    }
  };

  const handleConfirmSelection = async () => {
    if (!onSelect || selected.length === 0) return;
    try {
      const selectedImages = images.filter(img => selected.includes(img.key));
      const processed = await Promise.all(selectedImages.map(convertLibraryImage));
      onSelect(processed);
      setSelected([]);
    } catch (error) {
      console.error('Error processing selected images:', error);
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      const uploadedImages = await Promise.all(
        files.map(async (file) => {
          try {
            const resizedBlob = await resizeImage(file);
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).slice(2);
            const key = `library/${timestamp}-${randomId}-${file.name}`;
            await Storage.put(key, resizedBlob, {
              level: 'protected',
              contentType: resizedBlob.type || file.type,
              cacheControl: 'max-age=31536000',
            });
            const url = await Storage.get(key, { level: 'protected', expires: 3600 });
            return { key, url, lastModified: new Date().toISOString(), size: resizedBlob.size };
          } catch (err) {
            console.warn('Failed to resize image, uploading original:', file.name, err);
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).slice(2);
            const key = `library/${timestamp}-${randomId}-${file.name}`;
            await Storage.put(key, file, {
              level: 'protected',
              contentType: file.type,
              cacheControl: 'max-age=31536000',
            });
            const url = await Storage.get(key, { level: 'protected', expires: 3600 });
            return { key, url, lastModified: new Date().toISOString(), size: file.size };
          }
        })
      );

      setImages(prev => [...uploadedImages, ...prev]);
      setAllImageKeys(prev => [
        ...uploadedImages.map(img => ({ key: img.key, lastModified: img.lastModified, size: img.size })),
        ...prev
      ]);
      setLoadedCount(prev => prev + uploadedImages.length);
    } catch (err) {
      console.error('Error uploading library images', err);
    } finally {
      if (e.target) e.target.value = null;
    }
  };

  const gap = 2;
  const containerPadding = isMobile ? 48 : 64;
  const availableWidth = windowWidth - containerPadding;
  const targetThumbnailSize = isMobile ? 80 : 120;
  const minThumbnailSize = isMobile ? 60 : 80;
  const idealCols = Math.floor((availableWidth + gap) / (targetThumbnailSize + gap));
  const cols = Math.max(isMobile ? 3 : 4, idealCols);
  const actualThumbnailSize = Math.max(
    minThumbnailSize,
    Math.floor((availableWidth - (cols - 1) * gap) / cols)
  );
  const rowHeight = actualThumbnailSize;

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">My Library</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={selectMultipleMode}
                onChange={(e) => { setSelectMultipleMode(e.target.checked); if (!e.target.checked) setSelected([]); }}
                size="small"
              />
            }
            label="Select Multiple"
            sx={{ mr: 0 }}
          />
          {selectMultipleMode && selected.length > 0 && (
            <Button
              variant="contained"
              size="small"
              onClick={handleConfirmSelection}
              sx={{ minWidth: isMobile ? '75px' : '100px' }}
            >
              Add ({selected.length})
            </Button>
          )}
        </Box>
      </Box>

      <ImageList cols={cols} gap={gap} rowHeight={rowHeight} sx={{ m: 0, width: '100%' }}>
        <ImageListItem key="upload">
          <Box
            onClick={() => fileInputRef.current?.click()}
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px dashed',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: 'action.hover',
                borderColor: 'primary.main',
              }
            }}
          >
            <Add sx={{ color: 'text.secondary' }} />
          </Box>
        </ImageListItem>
        {images.map((img) => {
          const isSelected = selected.includes(img.key);
          return (
            <ImageListItem key={img.key} sx={{ cursor: 'pointer' }}>
              <Box
                onClick={() => handleImageClick(img)}
                sx={{
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease',
                  '&:hover': { transform: 'scale(0.98)', opacity: 0.9 }
                }}
              >
                <img
                  src={img.url}
                  alt="library"
                  style={{ objectFit: 'cover', width: '100%', height: '100%', display: 'block' }}
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

      {loadedCount < allImageKeys.length && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button variant="outlined" onClick={loadMoreImages} disabled={loading} size="small">
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
    </Box>
  );
};

ImageLibrary.propTypes = {
  onSelect: PropTypes.func,
  refreshTrigger: PropTypes.any,
};

ImageLibrary.defaultProps = {
  onSelect: null,
  refreshTrigger: null,
};

export default ImageLibrary;

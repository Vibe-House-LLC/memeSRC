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
} from '@mui/material';
import { Add, CheckCircle } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { Storage } from 'aws-amplify';

const MyLibrary = ({ onSelect }) => {
  const [images, setImages] = useState([]);
  const [selected, setSelected] = useState([]);
  const [allImageKeys, setAllImageKeys] = useState([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [loading, setLoading] = useState(false);
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

  const toggleSelect = (key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleCreate = async () => {
    if (!onSelect) return;
    
    try {
      // Get selected images
      const selectedImages = images.filter((img) => selected.includes(img.key));
      
      // Convert only the selected images to data URLs for canvas compatibility
      const dataUrls = await Promise.all(
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
            
            return dataUrl;
          } catch (error) {
            console.error('Error converting selected image:', img.key, error);
            // Fallback to regular URL if conversion fails
            return img.url;
          }
        })
      );
      
      onSelect(dataUrls);
      setSelected([]);
    } catch (error) {
      console.error('Error processing selected images:', error);
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      await Promise.all(
        files.map((file) => {
          const key = `library/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}-${file.name}`;
          return Storage.put(key, file, {
            level: 'protected',
            contentType: file.type,
          });
        })
      );
      // Reset and fetch images to show newly uploaded files first
      await fetchImages();
    } catch (err) {
      console.error('Error uploading library images', err);
    } finally {
      if (e.target) e.target.value = null;
    }
  };

  const cols = isMobile ? 3 : 4;

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, minHeight: '32px' }}>
        <Typography variant="h6">
          My Library
        </Typography>
        <Box sx={{ minWidth: '80px', display: 'flex', justifyContent: 'flex-end' }}>
          {selected.length > 0 && (
            <Button variant="contained" size="small" onClick={handleCreate}>
              Create ({selected.length})
            </Button>
          )}
        </Box>
      </Box>
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
                onClick={() => toggleSelect(img.key)}
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
                {isSelected && (
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
    </Box>
  );
};

MyLibrary.propTypes = {
  onSelect: PropTypes.func,
};

MyLibrary.defaultProps = {
  onSelect: null,
};

export default MyLibrary;

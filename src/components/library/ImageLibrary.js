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
} from '@mui/material';
import { Add, CheckCircle } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Storage } from 'aws-amplify';
import { resizeImage } from './libraryUtils';

const ImageLibrary = ({ onSelect, refreshTrigger }) => {
  const [images, setImages] = useState([]);
  const [selected, setSelected] = useState([]);
  const [selectMultipleMode, setSelectMultipleMode] = useState(false);
  const fileInputRef = useRef(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchImages = async () => {
    try {
      const listed = await Storage.list('library/', { level: 'protected' });
      const sorted = listed.results.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      const data = await Promise.all(
        sorted.map(async (item) => {
          const url = await Storage.get(item.key, { level: 'protected' });
          return { key: item.key, url };
        })
      );
      setImages(data);
    } catch (err) {
      console.error('Error loading library images', err);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [refreshTrigger]);

  const toggleSelect = (key) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const getImageDataObject = async (img) => {
    try {
      const downloadResult = await Storage.get(img.key, { level: 'protected', download: true });
      let blob;
      if (downloadResult instanceof Blob) {
        blob = downloadResult;
      } else if (downloadResult.Body instanceof Blob) {
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
        metadata: { isFromLibrary: true, libraryKey: img.key },
      };
    } catch (err) {
      console.error('Error converting image', img.key, err);
      return {
        originalUrl: img.url,
        displayUrl: img.url,
        metadata: { isFromLibrary: true, libraryKey: img.key },
      };
    }
  };

  const completeSelection = async (keys) => {
    if (!onSelect || keys.length === 0) return;
    const selectedImages = images.filter((img) => keys.includes(img.key));
    const imageObjects = await Promise.all(selectedImages.map(getImageDataObject));
    onSelect(imageObjects);
    setSelected([]);
  };

  const handleImageClick = (img) => {
    if (selectMultipleMode) {
      toggleSelect(img.key);
    } else {
      completeSelection([img.key]);
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      const uploads = await Promise.all(
        files.map(async (file) => {
          let blob;
          try {
            blob = await resizeImage(file);
          } catch (resizeError) {
            console.warn('Failed to resize image, uploading original:', file.name, resizeError);
            blob = file;
          }
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).slice(2);
          const key = `library/${timestamp}-${randomId}-${file.name}`;
          await Storage.put(key, blob, {
            level: 'protected',
            contentType: blob.type || file.type,
            cacheControl: 'max-age=31536000',
          });
          const url = await Storage.get(key, { level: 'protected' });
          return { key, url, lastModified: new Date().toISOString() };
        })
      );
      setImages((prev) => [...uploads, ...prev]);
    } catch (err) {
      console.error('Error uploading library images', err);
    } finally {
      if (e.target) e.target.value = null;
    }
  };

  const gap = 2;
  const containerPadding = isMobile ? 48 : 64;
  const availableWidth = typeof window !== 'undefined' ? window.innerWidth - containerPadding : 800;
  const targetThumbnailSize = isMobile ? 80 : 120;
  const minThumbnailSize = isMobile ? 60 : 80;
  const idealCols = Math.floor((availableWidth + gap) / (targetThumbnailSize + gap));
  const cols = Math.max(isMobile ? 3 : 4, idealCols);
  const actualThumbnailSize = Math.max(minThumbnailSize, Math.floor((availableWidth - (cols - 1) * gap) / cols));
  const rowHeight = actualThumbnailSize;

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Image Library</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={selectMultipleMode}
              onChange={(e) => {
                setSelectMultipleMode(e.target.checked);
                if (!e.target.checked) setSelected([]);
              }}
              size="small"
            />
          }
          label="Select Multiple"
          sx={{ mr: 0 }}
        />
      </Box>

      {selectMultipleMode && selected.length > 0 && (
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Button variant="contained" size="small" onClick={() => completeSelection(selected)}>
            Add {selected.length}
          </Button>
        </Box>
      )}

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
              },
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
                  '&:hover': {
                    transform: 'scale(0.98)',
                    opacity: 0.9,
                  },
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

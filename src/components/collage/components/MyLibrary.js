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
  const fileInputRef = useRef(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchImages = async () => {
    try {
      const listed = await Storage.list('library/', { level: 'protected' });
      const imageData = await Promise.all(
        listed.results.map(async (item) => {
          try {
            // Use Storage.get with download: true to get the file content
            const downloadResult = await Storage.get(item.key, { 
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
            
            return { 
              key: item.key, 
              url: dataUrl
            };
          } catch (error) {
            console.error('Error processing image:', item.key, error);
            // Fallback to regular URL if conversion fails
            const url = await Storage.get(item.key, { level: 'protected' });
            return { key: item.key, url };
          }
        })
      );
      setImages(imageData);
    } catch (err) {
      console.error('Error loading library images', err);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const toggleSelect = (key) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleCreate = () => {
    if (!onSelect) return;
    
    // Images are already converted to data URLs during fetch
    const selectedUrls = images
      .filter((img) => selected.includes(img.key))
      .map((img) => img.url);
    
    onSelect(selectedUrls);
    setSelected([]);
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
      fetchImages();
    } catch (err) {
      console.error('Error uploading library images', err);
    } finally {
      if (e.target) e.target.value = null;
    }
  };

  const cols = isMobile ? 3 : 4;

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        My Library
      </Typography>
      <ImageList cols={cols} gap={8} rowHeight={80} sx={{ m: 0 }}>
        <ImageListItem key="upload">
          <CardActionArea onClick={() => fileInputRef.current?.click()} sx={{ height: '100%' }}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed',
                borderColor: 'divider',
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
                sx={{ height: '100%', position: 'relative' }}
              >
                <Card sx={{ height: '100%' }}>
                  <img
                    src={img.url}
                    alt="library"
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
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
      {selected.length > 0 && (
        <Box sx={{ textAlign: 'right', mt: 1 }}>
          <Button variant="contained" size="small" onClick={handleCreate}>
            Create
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

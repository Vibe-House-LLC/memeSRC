import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, ImageList, ImageListItem, Card, CardActionArea } from '@mui/material';
import { Add } from '@mui/icons-material';
import { Storage } from 'aws-amplify';

const MyLibrary = ({ onSelect }) => {
  const [images, setImages] = useState([]);
  const fileInputRef = useRef(null);

  const fetchImages = async () => {
    try {
      const listed = await Storage.list('library/', { level: 'protected' });
      const urls = await Promise.all(
        listed.results.map(async (item) => {
          const url = await Storage.get(item.key, { level: 'protected' });
          return { key: item.key, url };
        })
      );
      setImages(urls);
    } catch (err) {
      console.error('Error loading library images', err);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

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

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        My Library
      </Typography>
      <ImageList cols={4} gap={8} rowHeight={80} sx={{ m: 0 }}>
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
        {images.map((img) => (
          <ImageListItem key={img.key} onClick={() => onSelect && onSelect(img.url)} sx={{ cursor: 'pointer' }}>
            <img src={img.url} alt="library" style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
          </ImageListItem>
        ))}
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

MyLibrary.propTypes = {
  onSelect: PropTypes.func,
};

MyLibrary.defaultProps = {
  onSelect: null,
};

export default MyLibrary;

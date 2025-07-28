import { useState, useEffect, useRef } from 'react';
import { Box, ImageList, ImageListItem, Typography } from '@mui/material';
import { Add } from '@mui/icons-material';
import { Storage } from 'aws-amplify';

export default function MyLibrarySection() {
  const [images, setImages] = useState([]);
  const fileInputRef = useRef(null);

  const fetchImages = async () => {
    try {
      const result = await Storage.list('collageLibrary/', { level: 'private' });
      const files = await Promise.all(result.map(async (item) => {
        const url = await Storage.get(item.key, { level: 'private' });
        return { key: item.key, url };
      }));
      setImages(files);
    } catch (err) {
      console.error('Error loading library images:', err);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    await Promise.all(files.map(async (file) => {
      if (!file.type.startsWith('image/')) return;
      const key = `collageLibrary/${Date.now()}_${file.name}`;
      try {
        await Storage.put(key, file, { contentType: file.type, level: 'private' });
      } catch (err) {
        console.error('Error uploading file:', err);
      }
    }));
    fetchImages();
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" gutterBottom>My Library</Typography>
      <ImageList cols={4} rowHeight={100} gap={8}>
        <ImageListItem key="add" onClick={handleAddClick} sx={{
          border: '1px dashed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <Add sx={{ fontSize: 32 }} />
        </ImageListItem>
        {images.map((img) => (
          <ImageListItem key={img.key} sx={{ overflow: 'hidden' }}>
            <img src={img.url} alt="library" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </ImageListItem>
        ))}
      </ImageList>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        multiple
        onChange={handleFileChange}
      />
    </Box>
  );
}

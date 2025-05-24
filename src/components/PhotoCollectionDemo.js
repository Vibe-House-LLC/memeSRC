import React, { useContext } from 'react';
import { Button, Box, Typography, Stack } from '@mui/material';
import { PhotoCollectionContext } from './PhotoCollection';

// Demo component to test the photo collection functionality
const PhotoCollectionDemo = () => {
  const { photoCollection, addToCollection, removeFromCollection, clearCollection, collectionCount } = useContext(PhotoCollectionContext);

  const addDemoPhoto = () => {
    const demoPhoto = {
      id: `demo-${Date.now()}`,
      title: `Demo Photo ${Date.now()}`,
      url: `https://picsum.photos/300/200?random=${Date.now()}`,
      timestamp: Date.now()
    };
    addToCollection(demoPhoto);
  };

  const removeDemoPhoto = () => {
    if (photoCollection.length > 0) {
      removeFromCollection(photoCollection[0].id);
    }
  };

  return (
    <Box sx={{ p: 2, border: '1px solid #ccc', borderRadius: 2, m: 2 }}>
      <Typography variant="h6" gutterBottom>
        Photo Collection Demo
      </Typography>
      <Typography variant="body2" gutterBottom>
        Current collection count: {collectionCount}
      </Typography>
      
      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        <Button variant="contained" onClick={addDemoPhoto}>
          Add Demo Photo
        </Button>
        <Button variant="outlined" onClick={removeDemoPhoto}>
          Remove Photo
        </Button>
        <Button variant="outlined" color="error" onClick={clearCollection}>
          Clear All
        </Button>
      </Stack>
      
      {photoCollection.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Collection items:</Typography>
          {photoCollection.map((photo) => (
            <Typography key={photo.id} variant="body2">
              • {photo.title}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default PhotoCollectionDemo; 
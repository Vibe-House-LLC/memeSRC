import React, { useState, useContext } from 'react';
import { 
  Fab, 
  Badge, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Grid, 
  Card, 
  CardMedia, 
  CardActions, 
  IconButton, 
  Typography, 
  Box,
  useMediaQuery,
  useTheme 
} from '@mui/material';
import { PhotoLibrary, Delete, Close } from '@mui/icons-material';
import { UserContext } from '../UserContext';

// PhotoCollection Context - for managing the collection state across the app
export const PhotoCollectionContext = React.createContext({
  photoCollection: [],
  addToCollection: () => {},
  removeFromCollection: () => {},
  clearCollection: () => {},
  collectionCount: 0
});

// PhotoCollection Provider Component
export const PhotoCollectionProvider = ({ children }) => {
  const [photoCollection, setPhotoCollection] = useState([]);

  const addToCollection = (photo) => {
    setPhotoCollection(prev => {
      // Avoid duplicates by checking if photo already exists
      const exists = prev.some(item => item.id === photo.id);
      if (!exists) {
        return [...prev, photo];
      }
      return prev;
    });
  };

  const removeFromCollection = (photoId) => {
    setPhotoCollection(prev => prev.filter(item => item.id !== photoId));
  };

  const clearCollection = () => {
    setPhotoCollection([]);
  };

  const collectionCount = photoCollection.length;

  const value = {
    photoCollection,
    addToCollection,
    removeFromCollection,
    clearCollection,
    collectionCount
  };

  return (
    <PhotoCollectionContext.Provider value={value}>
      {children}
    </PhotoCollectionContext.Provider>
  );
};

// Collection Viewer Modal Component
const CollectionViewerModal = ({ open, onClose }) => {
  const { photoCollection, removeFromCollection, clearCollection } = useContext(PhotoCollectionContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Debug: Log photo structure to understand available properties
  React.useEffect(() => {
    if (photoCollection.length > 0 && open) {
      console.log('Photo collection items:', photoCollection);
      console.log('First photo structure:', photoCollection[0]);
    }
  }, [photoCollection, open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        style: {
          borderRadius: isMobile ? 0 : 12,
          margin: isMobile ? 0 : 32,
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Photo Collection ({photoCollection.length})
        </Typography>
        <IconButton onClick={onClose} edge="end">
          <Close />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 2 }}>
        {photoCollection.length === 0 ? (
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            justifyContent="center" 
            minHeight={200}
          >
            <PhotoLibrary sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
            <Typography variant="body1" color="textSecondary">
              No photos in collection yet
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {photoCollection.map((photo) => {
              // Enhanced image property selection based on the actual data structure
              let imageUrl = null;
              
              // Check for frame-related images first (from V2FramePage)
              if (photo.editedImage) {
                imageUrl = photo.editedImage;
              } else if (photo.frameImage) {
                imageUrl = photo.frameImage;
              }
              // Check for display/original URLs (from collage components)
              else if (photo.displayUrl) {
                imageUrl = photo.displayUrl;
              } else if (photo.originalUrl) {
                imageUrl = photo.originalUrl;
              }
              // Check for standard URL properties
              else if (photo.url) {
                imageUrl = photo.url;
              } else if (photo.src) {
                imageUrl = photo.src;
              } else if (photo.image) {
                imageUrl = photo.image;
              } else if (photo.thumbnail) {
                imageUrl = photo.thumbnail;
              }

              return (
                <Grid item xs={6} sm={4} md={3} key={photo.id}>
                  <Card elevation={2}>
                    <CardMedia
                      component="img"
                      height={isMobile ? 120 : 140}
                      image={imageUrl}
                      alt={photo.alt || photo.title || `Photo ${photo.id}`}
                      sx={{ 
                        objectFit: 'cover',
                        backgroundColor: imageUrl ? 'transparent' : 'grey.200'
                      }}
                      onError={(e) => {
                        console.log('Image failed to load:', imageUrl, 'Photo object:', photo);
                        e.target.style.backgroundColor = '#f5f5f5';
                        e.target.style.display = 'flex';
                        e.target.style.alignItems = 'center';
                        e.target.style.justifyContent = 'center';
                        e.target.innerHTML = '📷';
                      }}
                    />
                    <CardActions sx={{ justifyContent: 'center', p: 1 }}>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => removeFromCollection(photo.id)}
                        aria-label="remove from collection"
                      >
                        <Delete />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </DialogContent>
      
      {photoCollection.length > 0 && (
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={clearCollection} color="error" variant="outlined">
            Clear All
          </Button>
          <Button onClick={onClose} variant="contained">
            Done
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

// PhotoCollection Button Component
const PhotoCollectionButton = ({ 
  onClick, 
  style = {}, 
  size = 'medium',
  color = 'primary',
  badgeColor = 'error'
}) => {
  const { collectionCount } = useContext(PhotoCollectionContext);
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Open the collection modal
      setModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  return (
    <>
      <Badge 
        badgeContent={collectionCount > 0 ? collectionCount : null} 
        color={badgeColor}
        max={99}
        overlap="circular"
        sx={{
          '& .MuiBadge-badge': {
            zIndex: 1301, // Higher than the Fab's z-index
          }
        }}
      >
        <Fab
          color={color}
          aria-label="photo collection"
          onClick={handleClick}
          size={size}
          style={{
            backgroundColor: 'black',
            zIndex: '1300',
            ...style
          }}
        >
          <PhotoLibrary color="white" />
        </Fab>
      </Badge>
      
      <CollectionViewerModal 
        open={modalOpen} 
        onClose={handleCloseModal} 
      />
    </>
  );
};

export default PhotoCollectionButton; 
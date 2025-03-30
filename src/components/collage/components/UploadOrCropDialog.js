import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  useMediaQuery,
  Stack,
  useTheme,
  IconButton,
  AppBar,
  Toolbar
} from '@mui/material';
import { UploadFile, Crop, Close } from '@mui/icons-material';

export default function UploadOrCropDialog({
  open,
  onClose,
  onUploadNew,
  onCropExisting,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const handleUpload = () => {
    onUploadNew();
    onClose();
  };

  const handleCrop = () => {
    onCropExisting();
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      aria-labelledby="upload-or-crop-dialog-title"
      fullScreen={isMobile}
      maxWidth="sm"
      fullWidth
    >
      {isMobile ? (
        <AppBar position="sticky" color="default" elevation={1} sx={{ bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : undefined }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={onClose}
              aria-label="close"
            >
              <Close />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Update Panel Image
            </Typography>
          </Toolbar>
        </AppBar>
      ) : (
        <DialogTitle id="upload-or-crop-dialog-title">
          Update Panel Image
        </DialogTitle>
      )}
      
      <DialogContent sx={{ 
        px: isMobile ? 3 : 2,
        pt: isMobile ? 3 : 2,
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: isMobile ? 1 : 0
      }}>
        <Typography align="center" sx={{ mb: 3 }}>
          This panel already has an image. Would you like to upload a new image or crop the existing one?
        </Typography>
        
        <Stack 
          direction={isMobile ? "column" : "row"} 
          spacing={2} 
          sx={{ 
            width: '100%', 
            maxWidth: '400px',
            mt: isMobile ? 2 : 0
          }}
        >
          <Button
            onClick={handleUpload}
            color="primary"
            variant="contained"
            startIcon={<UploadFile />}
            fullWidth
            size={isMobile ? "large" : "medium"}
            sx={{ 
              py: isMobile ? 1.5 : 1,
              color: theme.palette.mode === 'dark' ? '#fff' : undefined,
              backgroundColor: theme.palette.mode === 'dark' ? 'primary.dark' : undefined
            }}
          >
            Upload New
          </Button>
          <Button
            onClick={handleCrop}
            color="secondary"
            variant="contained"
            startIcon={<Crop />}
            fullWidth
            size={isMobile ? "large" : "medium"}
            sx={{ 
              py: isMobile ? 1.5 : 1,
              color: theme.palette.mode === 'dark' ? '#fff' : undefined,
              backgroundColor: theme.palette.mode === 'dark' ? 'secondary.dark' : undefined
            }}
          >
            Crop Existing
          </Button>
        </Stack>
      </DialogContent>
      
      {!isMobile && (
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
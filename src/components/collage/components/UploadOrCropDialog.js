import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material';
import { UploadFile, Crop } from '@mui/icons-material';

export default function UploadOrCropDialog({
  open,
  onClose,
  onUploadNew,
  onCropExisting,
}) {
  const handleUpload = () => {
    onUploadNew();
    onClose();
  };

  const handleCrop = () => {
    onCropExisting();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="upload-or-crop-dialog-title">
      <DialogTitle id="upload-or-crop-dialog-title">Update Panel Image</DialogTitle>
      <DialogContent>
        <Typography>
          This panel already has an image. Would you like to upload a new image or crop the existing one?
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-around', p: 2 }}>
        <Button
          onClick={handleUpload}
          color="primary"
          variant="outlined"
          startIcon={<UploadFile />}
          sx={{ flexGrow: 1, mx: 1 }}
        >
          Upload New
        </Button>
        <Button
          onClick={handleCrop}
          color="secondary"
          variant="outlined"
          startIcon={<Crop />}
          sx={{ flexGrow: 1, mx: 1 }}
        >
          Crop Existing
        </Button>
      </DialogActions>
    </Dialog>
  );
}
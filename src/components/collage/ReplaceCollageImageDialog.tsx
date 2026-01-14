import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';

export type ReplaceCollageImageDialogProps = {
  open: boolean;
  incomingImageUrl?: string | null;
  existingImages: Array<{ url?: string | null }>;
  onClose: () => void;
  onConfirm: (index: number) => void;
  busy?: boolean;
};

export default function ReplaceCollageImageDialog({
  open,
  incomingImageUrl,
  existingImages,
  onClose,
  onConfirm,
  busy = false,
}: ReplaceCollageImageDialogProps) {
  const [selection, setSelection] = useState<number | null>(existingImages.length ? 0 : null);

  useEffect(() => {
    setSelection(existingImages.length ? 0 : null);
  }, [existingImages, open]);

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      aria-labelledby="replace-image-dialog-title"
      fullWidth
      maxWidth="md"
    >
      <DialogTitle id="replace-image-dialog-title">Replace an image</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body1">
            You already have {existingImages.length} images. Choose one to overwrite with the incoming image.
          </Typography>
          {incomingImageUrl && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: (theme) => theme.palette.action.hover,
              }}
            >
              <Box
                component="img"
                src={incomingImageUrl}
                alt="Incoming image preview"
                sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 1 }}
              />
              <Typography variant="body2" color="text.secondary">
                New image
              </Typography>
            </Box>
          )}
          <RadioGroup
            value={selection != null ? String(selection) : ''}
            onChange={(event) => {
              const next = parseInt(event.target.value, 10);
              setSelection(Number.isNaN(next) ? null : next);
            }}
          >
            <Grid container spacing={1.5}>
              {existingImages.map((image, idx) => (
                <Grid item xs={12} sm={6} key={`replace-option-${idx}`}>
                  <FormControlLabel
                    value={String(idx)}
                    control={<Radio />}
                    label={(
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        {image.url ? (
                          <Box
                            component="img"
                            src={image.url}
                            alt={`Current collage image ${idx + 1}`}
                            sx={{
                              width: 72,
                              height: 72,
                              objectFit: 'cover',
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: (theme) => theme.palette.action.hover,
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 72,
                              height: 72,
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: (theme) => theme.palette.action.hover,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              color: 'text.secondary',
                            }}
                          >
                            No preview
                          </Box>
                        )}
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Image
                          {' '}
                          {idx + 1}
                        </Typography>
                      </Stack>
                    )}
                    sx={{
                      m: 0,
                      p: 1,
                      borderRadius: 1.5,
                      width: '100%',
                      alignItems: 'flex-start',
                      '&:hover': { backgroundColor: (theme) => theme.palette.action.hover },
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </RadioGroup>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          onClick={() => selection != null && onConfirm(selection)}
          variant="contained"
          disabled={busy || selection === null}
        >
          Replace
        </Button>
      </DialogActions>
    </Dialog>
  );
}

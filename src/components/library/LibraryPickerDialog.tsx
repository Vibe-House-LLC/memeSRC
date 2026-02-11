import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material';
import type { DialogProps } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import LibraryBrowser from './LibraryBrowser';

type LibraryPickerDialogProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (items: any[]) => void | Promise<void>;
  title?: string;
  busy?: boolean;
  errorText?: string | null;
  cancelLabel?: string;
  maxWidth?: DialogProps['maxWidth'];
  browserProps?: Record<string, any>;
};

const defaultBrowserProps = {
  multiple: false,
  uploadEnabled: true,
  deleteEnabled: false,
  showActionBar: false,
  selectionEnabled: true,
  previewOnClick: true,
  showSelectToggle: true,
  initialSelectMode: true,
};

const AnyLibraryBrowser = LibraryBrowser as unknown as React.ComponentType<any>;

export default function LibraryPickerDialog({
  open,
  onClose,
  onSelect,
  title = 'Select a photo',
  busy = false,
  errorText = null,
  cancelLabel = 'Cancel',
  maxWidth = 'md',
  browserProps = {},
}: LibraryPickerDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      fullWidth
      maxWidth={maxWidth}
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          bgcolor: '#121212',
          color: '#eaeaea',
        },
      }}
    >
      {isMobile ? (
        <AppBar
          position="sticky"
          color="default"
          elevation={0}
          sx={{ borderBottom: '1px solid #2a2a2a', bgcolor: '#121212', color: '#eaeaea' }}
        >
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1, color: '#eaeaea' }}>
              {title}
            </Typography>
            <IconButton
              edge="end"
              aria-label="close"
              onClick={() => {
                if (!busy) onClose();
              }}
              sx={{ color: '#eaeaea' }}
              disabled={busy}
            >
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      ) : (
        <DialogTitle sx={{ pr: 6, color: '#eaeaea' }}>
          {title}
          <IconButton
            aria-label="close"
            onClick={() => {
              if (!busy) onClose();
            }}
            sx={{ position: 'absolute', right: 8, top: 8, color: '#eaeaea' }}
            disabled={busy}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
      )}
      <DialogContent dividers sx={{ padding: isMobile ? '12px' : '16px', bgcolor: '#0f0f0f' }}>
        <AnyLibraryBrowser
          {...defaultBrowserProps}
          {...browserProps}
          onSelect={onSelect}
        />
        {errorText ? (
          <Alert severity="error" sx={{ mt: 1.25 }}>
            {errorText}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ padding: isMobile ? '12px' : '16px', bgcolor: '#121212' }}>
        {busy ? <CircularProgress size={20} sx={{ mr: 'auto' }} /> : null}
        <Box sx={{ width: isMobile ? '100%' : 'auto' }}>
          <Button
            onClick={onClose}
            variant="contained"
            disableElevation
            fullWidth={isMobile}
            disabled={busy}
            sx={{
              bgcolor: '#252525',
              color: '#f0f0f0',
              border: '1px solid #3a3a3a',
              borderRadius: '8px',
              px: isMobile ? 2 : 2.5,
              py: isMobile ? 1.25 : 0.75,
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { bgcolor: '#2d2d2d', borderColor: '#4a4a4a' },
            }}
          >
            {cancelLabel}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

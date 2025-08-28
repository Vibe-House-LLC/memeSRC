import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LibraryBrowser from '../library/LibraryBrowser.jsx';
import { mockMagicEdit } from '../../utils/mockMagicEdit';
// Use the same storage helper as LibraryBrowser for reliable S3 blob access
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - JS module without types
import { get as getFromLibrary } from '../../utils/library/storage';

export interface MagicEditorProps {
  imageSrc?: string | null;
  onImageChange?: (src: string | null) => void;
  onResult?: (src: string) => void;
  defaultPrompt?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function MagicEditor({
  imageSrc,
  onImageChange,
  onResult,
  defaultPrompt = '',
  className,
  style,
}: MagicEditorProps) {
  const AnyLibraryBrowser = LibraryBrowser as unknown as React.ComponentType<any>;
  const [internalSrc, setInternalSrc] = useState<string | null>(imageSrc ?? null);
  const [prompt, setPrompt] = useState<string>(defaultPrompt);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobToDataUrl = useCallback((blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  }), []);
  const toDataUrl = useCallback(async (url: string): Promise<string> => {
    const res = await fetch(url, { mode: 'cors' });
    const blob = await res.blob();
    return blobToDataUrl(blob);
  }, []);

  useEffect(() => {
    setInternalSrc(imageSrc ?? null);
  }, [imageSrc]);

  const setImage = useCallback((src: string | null) => {
    setInternalSrc(src);
    if (onImageChange) onImageChange(src);
  }, [onImageChange]);

  const canApply = useMemo(() => Boolean(internalSrc) && !processing, [internalSrc, processing]);

  const handleUploadClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    // Helps mobile browsers offer camera/library options
    input.capture = 'environment';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = (target.files && target.files[0]) || null;
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setImage(String(reader.result));
      reader.readAsDataURL(file);
    };
    input.click();
  }, [setImage]);

  const handleApply = useCallback(async () => {
    if (!internalSrc) return;
    setProcessing(true);
    setProgress(0);
    try {
      const out = await mockMagicEdit(internalSrc, prompt, (p) => setProgress(p), { durationMs: 10000 });
      setImage(out);
      if (onResult) onResult(out);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Magic edit failed.';
      setError(msg);
    } finally {
      setProcessing(false);
      setTimeout(() => setProgress(0), 400);
    }
  }, [internalSrc, onResult, prompt, setImage]);

  return (
    <Box className={className} style={style} sx={{ width: '100%', maxWidth: 720, mx: 'auto' }}>
      <Stack spacing={2}>
        {/* Image area */}
        <Box sx={{ position: 'relative', width: '100%', borderRadius: 2, overflow: 'hidden', bgcolor: '#0f0f10', minHeight: 220 }}>
          {internalSrc ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img src={internalSrc} alt="Selected" style={{ display: 'block', width: '100%', height: 'auto' }} />
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>No image selected</Typography>
            </Box>
          )}

          {processing && (
            <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
              <CircularProgress size={32} thickness={5} />
              <Box sx={{ width: '80%', maxWidth: 360 }}>
                <LinearProgress variant="determinate" value={progress} />
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, textAlign: 'center', color: 'common.white' }}>{progress}%</Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* Prompt */}
        <TextField
          fullWidth
          label="Describe the magic edit"
          placeholder="e.g. add sparkles, brighten the sky…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={processing}
          inputProps={{ 'aria-label': 'Magic edit prompt' }}
        />

        {/* Actions */}
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={handleUploadClick} disabled={processing}>Upload Photo</Button>
            <Button variant="outlined" onClick={() => setLibraryOpen(true)} disabled={processing}>Choose from Library</Button>
            <Button variant="text" color="inherit" onClick={() => setImage(null)} disabled={processing}>Clear</Button>
          </Stack>
          <Button variant="contained" color="secondary" onClick={handleApply} disabled={!canApply}>
            Apply Magic
          </Button>
        </Stack>
      </Stack>

      {/* Library picker dialog */}
      <Dialog open={libraryOpen} onClose={() => setLibraryOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Select from Library</DialogTitle>
        <DialogContent dividers>
          {/** The library browser is a JS component with PropTypes; cast to any for TS. */}
          <AnyLibraryBrowser
            multiple={false}
            instantSelectOnClick
            showActionBar
            actionBarLabel="Use Selected"
            onSelect={async (items: Array<{ displayUrl?: string; originalUrl?: string; metadata?: any }>) => {
              const first = items?.[0];
              const url = first?.displayUrl || first?.originalUrl || null;
              const libKey: string | undefined = (first as any)?.metadata?.libraryKey;
              if (libKey) {
                try {
                  // Prefer fetching via Storage to avoid CORS and get a Blob directly
                  const blob: Blob = await getFromLibrary(libKey, { level: 'protected' });
                  const dataUrl = await blobToDataUrl(blob);
                  setImage(dataUrl);
                } catch (e) {
                  // Fallback to URL → data URL conversion
                  if (url) {
                    try {
                      const dataUrl = url.startsWith('data:') ? url : await toDataUrl(url);
                      setImage(dataUrl);
                    } catch (_) {
                      setImage(url);
                      setError('Selected image may be cross-origin; edit export could fail.');
                    }
                  }
                }
              } else if (url) {
                try {
                  const finalUrl = url.startsWith('data:') ? url : await toDataUrl(url);
                  setImage(finalUrl);
                } catch (_) {
                  // Fall back to original URL and warn; edit may fail due to CORS
                  setImage(url);
                  setError('Selected image may be cross-origin; edit export could fail.');
                }
              }
              setLibraryOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={5000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
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
  type HistoryEntry = {
    id: number;
    src: string;
    label: string;
    source: 'original' | 'upload' | 'library' | 'edit' | 'revert';
    prompt?: string;
    createdAt: number;
  };
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen] = useState(true);
  const [nextId, setNextId] = useState(1);
  const [previewEntry, setPreviewEntry] = useState<HistoryEntry | null>(null);
  const initialRecordedRef = useRef(false);

  const getDisplayLabel = useCallback((h: HistoryEntry): string => {
    if (h.source === 'edit' && h.prompt) return `EDITED: "${h.prompt}"`;
    if (h.source === 'revert' && h.prompt) return `REVERTED TO: "${h.prompt}"`;
    if (h.source === 'original') return 'ORIGINAL PHOTO';
    if (h.source === 'upload') return 'UPLOADED';
    if (h.source === 'library') return 'LIBRARY';
    return h.label || 'CHANGE';
  }, []);
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

  // (moved below commitImage definition to avoid TS2448)

  const setImage = useCallback((src: string | null) => {
    setInternalSrc(src);
    if (onImageChange) onImageChange(src);
  }, [onImageChange]);

  const commitImage = useCallback((src: string, label: string, source: HistoryEntry['source'], extra?: { prompt?: string }) => {
    setImage(src);
    setHistory((prev) => {
      const isFirst = prev.length === 0 && (source === 'upload' || source === 'library' || source === 'original');
      const entry: HistoryEntry = {
        id: nextId,
        src,
        label: isFirst ? 'ORIGINAL PHOTO' : label,
        source: isFirst ? 'original' : source,
        prompt: extra?.prompt,
        createdAt: Date.now(),
      };
      const max = 20;
      const list = [...prev, entry];
      // cap history to last max entries
      return list.length > max ? list.slice(list.length - max) : list;
    });
    setNextId((n) => n + 1);
  }, [nextId, setImage]);

  // Ensure there is always an ORIGINAL PHOTO entry as the first history record
  useEffect(() => {
    if (imageSrc && history.length === 0 && !initialRecordedRef.current) {
      initialRecordedRef.current = true;
      commitImage(imageSrc, 'ORIGINAL PHOTO', 'original');
    }
  }, [commitImage, history.length, imageSrc]);

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
      reader.onload = () => commitImage(String(reader.result), 'Selected photo (upload)', 'upload');
      reader.readAsDataURL(file);
    };
    input.click();
  }, [commitImage]);

  const handleApply = useCallback(async () => {
    if (!internalSrc) return;
    setProcessing(true);
    setProgress(0);
    try {
      const out = await mockMagicEdit(internalSrc, prompt, (p) => setProgress(p), { durationMs: 3000 });
      commitImage(out, 'Applied magic edit', 'edit', { prompt });
      if (onResult) onResult(out);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Magic edit failed.';
      setError(msg);
    } finally {
      setProcessing(false);
      setTimeout(() => setProgress(0), 400);
    }
  }, [commitImage, internalSrc, onResult, prompt]);

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
                  commitImage(dataUrl, 'Selected photo (library)', 'library');
                } catch (e) {
                  // Fallback to URL → data URL conversion
                  if (url) {
                    try {
                      const dataUrl = url.startsWith('data:') ? url : await toDataUrl(url);
                      commitImage(dataUrl, 'Selected photo (library)', 'library');
                    } catch (_) {
                      setImage(url);
                      setError('Selected image may be cross-origin; edit export could fail.');
                    }
                  }
                }
              } else if (url) {
                try {
                  const finalUrl = url.startsWith('data:') ? url : await toDataUrl(url);
                  commitImage(finalUrl, 'Selected photo (library)', 'library');
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
      {/* History */}
      {history.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            History
          </Typography>
          {historyOpen && (
            <Stack spacing={1.25}>
              {[...history].slice().reverse().map((h, idx, arr) => {
                const isTop = idx === 0; // newest first
                const isCurrent = isTop && internalSrc === h.src;
                return (
                  <Box key={h.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', p: 1, borderRadius: 1.5, border: '1px solid', borderColor: isCurrent ? 'primary.main' : 'divider', bgcolor: isCurrent ? 'rgba(139,92,199,0.08)' : 'transparent' }}>
                    {/* Thumbnail opens preview */}
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <img
                      src={h.src}
                      alt={h.label}
                      onClick={() => setPreviewEntry(h)}
                      style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mt: 0.5 }}>
                        {getDisplayLabel(h)}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => commitImage(h.src, `Reverted to #${h.id}`, 'revert', { prompt: h.prompt })}
                      disabled={processing || isCurrent}
                      aria-label={`Restore version #${h.id}`}
                    >
                      Restore
                    </Button>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      )}
      {/* Preview dialog for a historical entry */}
      <Dialog open={Boolean(previewEntry)} onClose={() => setPreviewEntry(null)} fullWidth maxWidth="sm">
        <DialogTitle>Preview</DialogTitle>
        <DialogContent dividers>
          {previewEntry && (
            <Box>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img src={previewEntry.src} alt={previewEntry.label} style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 8 }} />
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{getDisplayLabel(previewEntry)}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewEntry(null)}>Close</Button>
          <Button
            variant="contained"
            disabled={processing || !previewEntry || internalSrc === previewEntry.src}
            onClick={() => {
              if (!previewEntry) return;
              commitImage(previewEntry.src, `Reverted to #${previewEntry.id}`, 'revert', { prompt: previewEntry.prompt });
              setPreviewEntry(null);
            }}
          >
            Restore
          </Button>
        </DialogActions>
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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  InputAdornment,
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
import { mockMagicEdit } from '../../utils/mockMagicEdit';

export interface MagicEditorProps {
  imageSrc: string; // required input photo
  onSave?: (finalSrc: string) => void; // commit edited image
  onCancel?: (originalSrc: string) => void; // cancel to original
  onResult?: (src: string) => void; // optional per-edit callback
  onImageChange?: (src: string | null) => void; // notify parent of current image
  onProcessingChange?: (processing: boolean) => void; // notify parent of loading state
  defaultPrompt?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function MagicEditor({
  imageSrc,
  onSave,
  onCancel,
  onResult,
  onImageChange,
  onProcessingChange,
  defaultPrompt = '',
  className,
  style,
}: MagicEditorProps) {
  const [internalSrc, setInternalSrc] = useState<string | null>(imageSrc ?? null);
  const [prompt, setPrompt] = useState<string>(defaultPrompt);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  type HistoryEntry = {
    id: number;
    src: string;
    label: string;
    source: 'original' | 'upload' | 'library' | 'edit' | 'revert';
    prompt?: string;
    createdAt: number;
    pending?: boolean;
    progress?: number;
  };
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen] = useState(true);
  const [nextId, setNextId] = useState(1);
  const [previewEntry, setPreviewEntry] = useState<HistoryEntry | null>(null);
  const initialRecordedRef = useRef(false);
  const originalSrcRef = useRef<string>(imageSrc);

  // Animated placeholder examples
  const examples = useMemo(
    () => [
      'Remove the text…',
      'Add a tophat…',
      'Make him laugh…',
      'Add an angry cat…',
    ],
    []
  );
  const [exampleIndex, setExampleIndex] = useState(0);
  const [placeholderText, setPlaceholderText] = useState<string>('');
  const [phase, setPhase] = useState<'typing' | 'pausing' | 'deleting'>('typing');
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    let timeout: number | undefined;
    // If user is typing or an edit is processing, keep placeholder empty and pause animation
    if ((prompt && prompt.length > 0) || processing) {
      setPlaceholderText('');
      return () => {
        if (timeout) window.clearTimeout(timeout);
      };
    }
    const full = examples[exampleIndex] || '';
    if (phase === 'typing') {
      if (charIndex < full.length) {
        timeout = window.setTimeout(() => {
          setCharIndex((c) => c + 1);
          setPlaceholderText(full.slice(0, charIndex + 1));
        }, 60);
      } else {
        setPhase('pausing');
      }
    } else if (phase === 'pausing') {
      timeout = window.setTimeout(() => setPhase('deleting'), 1000);
    } else if (phase === 'deleting') {
      if (charIndex > 0) {
        timeout = window.setTimeout(() => {
          setCharIndex((c) => c - 1);
          setPlaceholderText(full.slice(0, Math.max(0, charIndex - 1)));
        }, 35);
      } else {
        setPhase('typing');
        setExampleIndex((i) => (i + 1) % examples.length);
      }
    }
    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [prompt, processing, examples, exampleIndex, phase, charIndex]);

  const getDisplayLabel = useCallback((h: HistoryEntry): string => {
    if (h.source === 'edit' && h.prompt && h.pending) return `EDITING: "${h.prompt}"`;
    if (h.source === 'edit' && h.prompt) return `EDITED: "${h.prompt}"`;
    if (h.source === 'revert' && h.prompt) return `RESTORED: "${h.prompt}"`;
    if (h.source === 'original') return 'ORIGINAL PHOTO';
    if (h.source === 'upload') return 'UPLOADED';
    if (h.source === 'library') return 'LIBRARY';
    return h.label || 'CHANGE';
  }, []);
  // No upload/library here: parent must provide an input photo

  useEffect(() => {
    setInternalSrc(imageSrc ?? null);
    originalSrcRef.current = imageSrc;
    // reset history when a new image arrives
    setHistory([]);
    initialRecordedRef.current = false;
  }, [imageSrc]);

  // (moved below commitImage definition to avoid TS2448)

  const setImage = useCallback((src: string | null) => {
    setInternalSrc(src);
    if (onImageChange) onImageChange(src);
  }, [onImageChange]);

  useEffect(() => {
    if (onProcessingChange) onProcessingChange(processing);
  }, [processing, onProcessingChange]);

  const commitImage = useCallback((src: string, label: string, source: HistoryEntry['source'], extra?: { prompt?: string; pending?: boolean; progress?: number }) => {
    setImage(src);
    setHistory((prev) => {
      const isFirst = prev.length === 0 && (source === 'upload' || source === 'library' || source === 'original');
      const entry: HistoryEntry = {
        id: nextId,
        src,
        label: isFirst ? 'ORIGINAL PHOTO' : label,
        source: isFirst ? 'original' : source,
        prompt: extra?.prompt,
        pending: extra?.pending,
        progress: extra?.progress,
        createdAt: Date.now(),
      };
      const max = 20;
      const list = [...prev, entry];
      // cap history to last max entries
      return list.length > max ? list.slice(list.length - max) : list;
    });
    setNextId((n) => n + 1);
  }, [nextId, setImage]);

  // Add a pending edit entry and return its id
  const addPendingEdit = useCallback((promptText: string): number => {
    const id = nextId;
    const baseSrc = internalSrc ?? '';
    setHistory((prev) => [
      ...prev,
      {
        id,
        src: baseSrc,
        label: 'Applying magic edit…',
        source: 'edit',
        prompt: promptText,
        pending: true,
        progress: 0,
        createdAt: Date.now(),
      },
    ]);
    setNextId((n) => n + 1);
    return id;
  }, [internalSrc, nextId]);

  // Update a history entry by id
  const updateHistoryEntry = useCallback((id: number, patch: Partial<HistoryEntry>) => {
    setHistory((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }, []);

  // Ensure there is always an ORIGINAL PHOTO entry as the first history record
  useEffect(() => {
    if (imageSrc && history.length === 0 && !initialRecordedRef.current) {
      initialRecordedRef.current = true;
      commitImage(imageSrc, 'ORIGINAL PHOTO', 'original');
    }
  }, [commitImage, history.length, imageSrc]);

  const canApply = useMemo(() => Boolean(internalSrc) && !processing, [internalSrc, processing]);

  // No upload or library selection inside the editor

  const handleApply = useCallback(async () => {
    if (!internalSrc || processing) return;
    setProcessing(true);
    setProgress(0);
    const currentPrompt = prompt;
    const pendingId = addPendingEdit(currentPrompt);
    // Clear prompt immediately for the next edit
    setPrompt('');
    try {
      const out = await mockMagicEdit(
        internalSrc,
        currentPrompt,
        (p) => {
          setProgress(p);
          updateHistoryEntry(pendingId, { progress: p });
        },
        { durationMs: 3000 }
      );
      // finalize pending entry
      updateHistoryEntry(pendingId, { src: out, pending: false, progress: 100 });
      setImage(out);
      if (onResult) onResult(out);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Magic edit failed.';
      setError(msg);
      // mark entry as failed
      updateHistoryEntry(pendingId, { pending: false, label: 'Edit failed', progress: undefined, prompt: undefined });
    } finally {
      setProcessing(false);
      setTimeout(() => setProgress(0), 400);
    }
  }, [addPendingEdit, internalSrc, onResult, processing, prompt, setImage, updateHistoryEntry]);

  return (
    <Box className={className} style={style} sx={{ width: '100%', maxWidth: { xs: '100%', md: 1400 }, mx: 'auto', px: { xs: 1, sm: 2 } }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 3 }} alignItems={{ md: 'flex-start' }}>
        {/* Left: Image + Prompt (mobile combined), Image only on desktop */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              position: 'relative',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: '#0f0f10',
              minHeight: 220,
              display: { xs: 'flex', md: 'block' },
              flexDirection: { xs: 'column', md: 'initial' },
              height: { xs: '50vh', md: 'auto' },
            }}
          >
            {/* Image area */}
            <Box sx={{ position: 'relative', flex: { xs: 1, md: 'initial' }, minHeight: { xs: 0, md: 'initial' } }}>
              {internalSrc ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Box
                  component="img"
                  src={internalSrc}
                  alt="Selected"
                  sx={{
                    display: 'block',
                    width: '100%',
                    height: { xs: '100%', md: 'auto' },
                    maxHeight: { xs: '100%', md: '75vh' },
                    objectFit: 'contain',
                  }}
                />
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

            {/* Prompt inside the combined unit on mobile */}
            <Box sx={{ display: { xs: 'block', md: 'none' }, p: 1 }}>
              <TextField
                fullWidth
                placeholder={placeholderText}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (canApply) void handleApply();
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleApply}
                        disabled={!canApply}
                        sx={{ ml: 1, whiteSpace: 'nowrap' }}
                      >
                        Edit
                      </Button>
                    </InputAdornment>
                  ),
                }}
                inputProps={{ 'aria-label': 'Magic edit prompt' }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: 'rgba(255,255,255,0.6)',
                    backdropFilter: 'saturate(180%) blur(12px)',
                    WebkitBackdropFilter: 'saturate(180%) blur(12px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    transition: 'box-shadow 150ms ease, background-color 150ms ease',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.8)',
                  },
                  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,0.9)',
                  },
                  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255,255,255,1)',
                    borderWidth: 1.5,
                  },
                  '& .MuiOutlinedInput-input': {
                    color: 'rgba(0,0,0,0.88)',
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(0,0,0,0.55)',
                    opacity: 1,
                  },
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Right: Controls + History (stacked) */}
        <Box sx={{ width: { xs: '100%', md: 420 }, position: { md: 'sticky' }, top: { md: 16 }, alignSelf: { md: 'flex-start' } }}>
          {/* Prompt (desktop/tablet only) */}
          <TextField
            sx={{ display: { xs: 'none', md: 'block' },
              mb: 1.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                backgroundColor: 'rgba(255,255,255,0.6)',
                backdropFilter: 'saturate(180%) blur(12px)',
                WebkitBackdropFilter: 'saturate(180%) blur(12px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                transition: 'box-shadow 150ms ease, background-color 150ms ease',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255,255,255,0.8)',
              },
              '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255,255,255,0.9)',
              },
              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255,255,255,1)',
                borderWidth: 1.5,
              },
              '& .MuiOutlinedInput-input': {
                color: 'rgba(0,0,0,0.88)',
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'rgba(0,0,0,0.55)',
                opacity: 1,
              },
            }}
            fullWidth
            placeholder={placeholderText}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (canApply) void handleApply();
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleApply}
                    disabled={!canApply}
                    sx={{ ml: 1, whiteSpace: 'nowrap' }}
                  >
                    Edit
                  </Button>
                </InputAdornment>
              ),
            }}
            inputProps={{ 'aria-label': 'Magic edit prompt' }}
          />

          {/* Actions */}
          {/* Global actions are handled by parent top bar */}

          {/* History */}
          {history.length > 0 && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                History
              </Typography>
              {historyOpen && (
                <Stack
                  spacing={1.25}
                  sx={{
                    // Avoid internal scrolling on mobile; allow full-page scroll
                    maxHeight: { xs: 'none', md: '50vh' },
                    overflowY: { xs: 'visible', md: 'auto' },
                    pr: 0.5,
                  }}
                >
                  {[...history].slice().reverse().map((h, idx, arr) => {
                    const isTop = idx === 0; // newest first
                    const isCurrent = isTop && internalSrc === h.src;
                    return (
                      <Box key={h.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', p: 1, borderRadius: 1.5, border: '1px solid', borderColor: isCurrent ? 'primary.main' : 'divider', bgcolor: isCurrent ? 'rgba(139,92,199,0.08)' : 'transparent' }}>
                        {/* Thumbnail opens preview */}
                        {/* eslint-disable-next-line jsx-a11y/alt-text */}
                        <Box sx={{ position: 'relative' }}>
                          <img
                            src={h.src}
                            alt={h.label}
                            onClick={() => { if (!h.pending) setPreviewEntry(h); }}
                            style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, cursor: h.pending ? 'default' : 'pointer', filter: h.pending ? 'grayscale(0.4)' : 'none', opacity: h.pending ? 0.9 : 1 }}
                          />
                          {h.pending && (
                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.25)', borderRadius: 1 }}>
                              <CircularProgress size={18} thickness={5} />
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mt: 0.5 }}>
                            {getDisplayLabel(h)}
                          </Typography>
                          {h.pending && (
                            <Box sx={{ pr: 2, pt: 0.5 }}>
                              <LinearProgress variant="determinate" value={h.progress ?? 0} />
                            </Box>
                          )}
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => commitImage(h.src, `Reverted to #${h.id}`, 'revert', { prompt: h.prompt })}
                          disabled={processing || isCurrent || h.pending}
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
        </Box>
      </Stack>

      {/* No internal library/upload pickers; parent supplies image */}
      
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

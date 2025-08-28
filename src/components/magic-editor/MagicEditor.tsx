import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
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
import { Send, AutoFixHighRounded, Close, Check } from '@mui/icons-material';
import { mockMagicEdit } from '../../utils/mockMagicEdit';

export interface MagicEditorProps {
  imageSrc: string; // required input photo
  onSave?: (finalSrc: string) => void; // commit edited image
  onCancel?: (originalSrc: string) => void; // cancel to original
  onResult?: (src: string) => void; // optional per-edit callback
  onImageChange?: (src: string | null) => void; // notify parent of current image
  onProcessingChange?: (processing: boolean) => void; // notify parent of loading state
  onPromptStateChange?: (state: { value: string; focused: boolean }) => void; // notify parent about prompt text/focus
  defaultPrompt?: string;
  className?: string;
  style?: React.CSSProperties;
  // Allow parent to hide the internal header when rendering an external header
  showHeader?: boolean;
  // Customize label for save (kept for flexibility)
  saveLabel?: string;
  // Optionally hide internal actions/editor/history for split layouts
  showActions?: boolean;
  showEditor?: boolean;
  showHistory?: boolean;
}

export default function MagicEditor({
  imageSrc,
  onSave,
  onCancel,
  onResult,
  onImageChange,
  onProcessingChange,
  onPromptStateChange,
  defaultPrompt = '',
  className,
  style,
  showHeader = true,
  saveLabel = 'Save',
  showActions = true,
  showEditor = true,
  showHistory = true,
}: MagicEditorProps) {
  const [internalSrc, setInternalSrc] = useState<string | null>(imageSrc ?? null);
  const [prompt, setPrompt] = useState<string>(defaultPrompt);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [promptFocused, setPromptFocused] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);
  const desktopInputRef = useRef<HTMLInputElement | null>(null);
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

  useEffect(() => {
    if (onPromptStateChange) onPromptStateChange({ value: prompt, focused: promptFocused });
  }, [prompt, promptFocused, onPromptStateChange]);

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
  const canSend = useMemo(() => Boolean(internalSrc) && !processing && prompt.trim().length > 0, [internalSrc, processing, prompt]);

  const blurPromptInputs = useCallback(() => {
    try { mobileInputRef.current?.blur(); } catch {}
    try { desktopInputRef.current?.blur(); } catch {}
    setPromptFocused(false);
  }, []);

  // No upload or library selection inside the editor

  const handleApply = useCallback(async () => {
    if (!internalSrc || processing) return;
    setProcessing(true);
    setProgress(0);
    const currentPrompt = prompt;
    const pendingId = addPendingEdit(currentPrompt);
    // Keep prompt visible while processing so users see what's loading
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
      // Now clear the prompt after processing completes
      setPrompt('');
    }
  }, [addPendingEdit, internalSrc, onResult, processing, prompt, setImage, updateHistoryEntry]);

  return (
    <Box
      className={className}
      style={style}
      sx={{
        width: '100%',
        maxWidth: { xs: '100%', md: 1400 },
        // Container is gutterless on mobile; keep natural centering
        mx: 'auto',
        px: { xs: 0, sm: 2 },
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      {/* Magic Editor subtitle; can be hidden by parent
      {showHeader && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <AutoFixHighRounded sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Ask for edits in plain English
          </Typography>
        </Box>
      )} */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 3 }} alignItems={{ md: 'flex-start' }}>
        {/* Left: Image + Prompt (mobile combined), Image only on desktop */}
        {showEditor && (
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              position: 'relative',
              // Remove visible box styling; keep as a simple container
              borderRadius: 0,
              overflow: 'visible',
              bgcolor: 'transparent',
              minHeight: 220,
              display: { xs: 'flex', md: 'block' },
              flexDirection: { xs: 'column', md: 'initial' },
              // Natural height; image will cap itself so group can shrink/expand
              height: { xs: 'auto', md: 'auto' },
              // Remove negative margins that caused horizontal overflow on some mobiles
              mx: { xs: 0, md: 0 },
              p: { xs: 0, md: 0 },
              boxSizing: 'border-box',
            }}
          >
            {/* Image area */}
            <Box sx={{
              position: 'relative',
              // Natural height for image; do not force flex growth
              flex: { xs: '0 0 auto', md: 'initial' },
              minHeight: { xs: 'auto', md: 'initial' },
              overflow: { xs: 'visible', md: 'visible' },
              order: { xs: 2, md: 'initial' }
            }}>
              {internalSrc ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Box
                  component="img"
                  src={internalSrc}
                  alt="Selected"
                  sx={{
                    display: 'block',
                    width: '100%',
                    // Let width drive intrinsic height; cap image height on mobile
                    height: { xs: 'auto', md: 'auto' },
                    maxHeight: { xs: '55vh', md: '70vh' },
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
            <Box sx={{ display: { xs: 'block', md: 'none' }, p: 0, mt: 1, order: { xs: 3, md: 'initial' }, flexShrink: 0 }}>
              <TextField
                fullWidth
                placeholder={placeholderText}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => setPromptFocused(true)}
                onBlur={() => setPromptFocused(false)}
                disabled={processing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (canSend) { blurPromptInputs(); void handleApply(); }
                  }
                }}
                inputRef={mobileInputRef}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AutoFixHighRounded sx={{ color: processing ? 'grey.500' : 'primary.main' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      {prompt?.length && !processing ? (
                        <IconButton
                          aria-label="clear prompt"
                          size="small"
                          onClick={() => setPrompt('')}
                          edge="end"
                          sx={{ mr: 0.5 }}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      ) : null}
                      {processing ? (
                        <CircularProgress size={18} thickness={5} sx={{ ml: 0.5 }} />
                      ) : (
                        <IconButton
                          aria-label="send prompt"
                          size="small"
                          onClick={() => { blurPromptInputs(); if (canSend) void handleApply(); }}
                          disabled={!canSend}
                          edge="end"
                          color={canSend ? 'primary' as const : 'default' as const}
                          sx={{ ml: 0.5, color: canSend ? 'primary.main' : undefined }}
                        >
                          <Send />
                        </IconButton>
                      )}
                    </InputAdornment>
                  ),
                }}
                inputProps={{ 'aria-label': 'Magic edit prompt' }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: '#fff',
                  },
                  '& .MuiOutlinedInput-root.Mui-disabled': {
                    backgroundColor: '#f5f5f5',
                  },
                  '& .MuiOutlinedInput-input': {
                    color: 'rgba(0,0,0,0.9)',
                    fontWeight: 700,
                  },
                  '& .MuiOutlinedInput-input.Mui-disabled': {
                    color: 'rgba(0,0,0,0.55)',
                    WebkitTextFillColor: 'rgba(0,0,0,0.55)',
                  },
                  '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0,0,0,0.12)',
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'rgba(0,0,0,0.6)',
                    opacity: 1,
                    fontWeight: 600,
                  },
                }}
              />
            </Box>

            {/* Save/Cancel inside the combined unit on mobile */}
            {showActions && (
            <Box sx={{ display: { xs: 'block', md: 'none' }, px: 0, mb: 1, order: { xs: 1, md: 'initial' }, flexShrink: 0 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <Button
                  size="large"
                  fullWidth
                  variant="outlined"
                  onClick={() => { if (onCancel) onCancel(originalSrcRef.current); }}
                  disabled={processing}
                  sx={{
                    minHeight: 44,
                    fontWeight: 700,
                    textTransform: 'none',
                    color: 'text.primary',
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="large"
                  fullWidth
                  variant="contained"
                  onClick={() => {
                    if (!internalSrc || !onSave) return;
                    if (prompt && prompt.trim().length > 0) {
                      setConfirmDiscardOpen(true);
                    } else {
                      onSave(internalSrc);
                    }
                  }}
                  disabled={!internalSrc || processing}
                  sx={{
                    minHeight: 44,
                    fontWeight: 700,
                    textTransform: 'none',
                    background: 'linear-gradient(45deg, #6b42a1 0%, #7b4cb8 50%, #8b5cc7 100%)',
                    border: '1px solid #8b5cc7',
                    color: '#fff',
                    boxShadow: 'none',
                    '&:hover': { background: 'linear-gradient(45deg, #5e3992 0%, #6b42a1 50%, #7b4cb8 100%)' },
                  }}
                 startIcon={<Check />}>
                  {saveLabel}
                </Button>
               </Box>
            </Box>
            )}
          </Box>
        </Box>
        )}

        {/* Right: Controls + History (stacked) */}
        <Box sx={{ width: { xs: '100%', md: 420 }, position: { md: 'sticky' }, top: { md: 16 }, alignSelf: { md: 'flex-start' } }}>
          {/* Prompt (desktop/tablet only) */}
          <TextField
            sx={{ display: { xs: 'none', md: 'block' },
              mb: 1.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                backgroundColor: '#fff',
              },
              '& .MuiOutlinedInput-root.Mui-disabled': {
                backgroundColor: '#f5f5f5',
              },
              '& .MuiOutlinedInput-input': {
                color: 'rgba(0,0,0,0.9)',
                fontWeight: 700,
              },
              '& .MuiOutlinedInput-input.Mui-disabled': {
                color: 'rgba(0,0,0,0.55)',
                WebkitTextFillColor: 'rgba(0,0,0,0.55)',
              },
              '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(0,0,0,0.12)',
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'rgba(0,0,0,0.6)',
                opacity: 1,
                fontWeight: 600,
              },
            }}
            fullWidth
            placeholder={placeholderText}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onFocus={() => setPromptFocused(true)}
            onBlur={() => setPromptFocused(false)}
            disabled={processing}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (canSend) { blurPromptInputs(); void handleApply(); }
              }
            }}
            inputRef={desktopInputRef}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AutoFixHighRounded sx={{ color: processing ? 'grey.500' : 'primary.main' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {prompt?.length && !processing ? (
                    <IconButton
                      aria-label="clear prompt"
                      size="small"
                      onClick={() => setPrompt('')}
                      edge="end"
                      sx={{ mr: 0.5 }}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  ) : null}
                  {processing ? (
                    <CircularProgress size={18} thickness={5} sx={{ ml: 0.5 }} />
                  ) : (
                    <IconButton
                      aria-label="send prompt"
                      size="small"
                      onClick={() => { blurPromptInputs(); if (canSend) void handleApply(); }}
                      disabled={!canSend}
                      edge="end"
                      color={canSend ? 'primary' as const : 'default' as const}
                      sx={{ ml: 0.5, color: canSend ? 'primary.main' : undefined }}
                    >
                      <Send />
                    </IconButton>
                  )}
                </InputAdornment>
              ),
            }}
            inputProps={{ 'aria-label': 'Magic edit prompt' }}
          />

          {/* Actions */}
          {/* Global actions are handled by parent top bar */}

          {/* History */}
          {showHistory && history.length > 0 && (
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
      {/* Confirm discard of unapplied prompt when saving */}
      <Dialog open={confirmDiscardOpen} onClose={() => setConfirmDiscardOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Discard Unapplied Edit?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Do you want to discard your unapplied edit "
            <Box component="span" sx={{ fontWeight: 700 }}>{prompt}</Box>
            "?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDiscardOpen(false)}>Keep Editing</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (internalSrc && onSave) onSave(internalSrc);
              setConfirmDiscardOpen(false);
            }}
          >
            Discard and Save
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

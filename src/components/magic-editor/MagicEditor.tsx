import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
import { Send, AutoFixHighRounded, Close, Check, AddPhotoAlternate } from '@mui/icons-material';
import { API, graphqlOperation } from 'aws-amplify';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - generated JS module
import { getMagicResult } from '../../graphql/queries';
import { resizeImage } from '../../utils/library/resizeImage';
import { EDITOR_IMAGE_MAX_DIMENSION_PX } from '../../constants/imageProcessing';
import { UserContext } from '../../UserContext';

// Utilities to ensure the image payload is a browser-safe data URL in a format
// the backend (and Gemini) can process reliably across subsequent edits.
async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function isImageDataUrl(src: string): boolean {
  return typeof src === 'string' && src.startsWith('data:image/');
}

function getDataUrlMime(src: string): string | null {
  try {
    const match = /^data:([^;]+);base64,/i.exec(src);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

async function convertBlobToPngDataUrl(blob: Blob): Promise<string> {
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return await blobToDataUrl(blob);
      ctx.drawImage(bitmap, 0, 0);
      return canvas.toDataURL('image/png');
    }
  } catch {}
  // Fallback via HTMLImageElement
  try {
    const url = URL.createObjectURL(blob);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
      // Allow CORS-friendly draw; if not permitted, fallback to original blob
      try { image.crossOrigin = 'anonymous'; } catch {}
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return await blobToDataUrl(blob);
    ctx.drawImage(img, 0, 0);
    try { URL.revokeObjectURL(url); } catch {}
    return canvas.toDataURL('image/png');
  } catch {
    // Last resort: return original blob as data URL (keeps original mime)
    return await blobToDataUrl(blob);
  }
}

async function ensureImageDataUrl(src: string): Promise<string> {
  // If already a PNG/JPEG data URL, keep as-is
  if (isImageDataUrl(src)) {
    const mime = getDataUrlMime(src);
    if (mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/jpg') return src;
    // Convert other inline formats (e.g., webp) to PNG
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      return await convertBlobToPngDataUrl(blob);
    } catch {
      return src; // fall back to original
    }
  }

  // For blob: or http(s): URLs, fetch bytes then convert to a PNG data URL
  try {
    const res = await fetch(src, { mode: 'cors' as RequestMode });
    const blob = await res.blob();
    // Prefer PNG to avoid provider-specific mime quirks
    if (blob.type === 'image/png' || blob.type === 'image/jpeg') {
      return await blobToDataUrl(blob);
    }
    return await convertBlobToPngDataUrl(blob);
  } catch {
    // As a last resort, try drawing via Image element to bypass fetch CORS
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        try { image.crossOrigin = 'anonymous'; } catch {}
        image.src = src;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL('image/png');
    } catch {
      // Give up and return original; backend may still handle
      return src;
    }
  }
}

const MAX_REFERENCE_IMAGES = 4;

export interface MagicEditorProps {
  imageSrc: string; // required input photo
  onSave?: (finalSrc: string) => void; // commit edited image
  onCancel?: (originalSrc: string) => void; // cancel to original
  onResult?: (src: string) => void; // optional per-edit callback
  onImageChange?: (src: string | null) => void; // notify parent of current image
  onProcessingChange?: (processing: boolean) => void; // notify parent of loading state
  onPromptStateChange?: (state: { value: string; focused: boolean }) => void; // notify parent about prompt text/focus
  saving?: boolean; // external save-in-progress
  defaultPrompt?: string;
  variationCount?: number;
  autoStart?: boolean;
  autoStartKey?: string | number;
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
  initialReferences?: string[];
}

export default function MagicEditor({
  imageSrc,
  onSave,
  onCancel,
  onResult,
  onImageChange,
  onProcessingChange,
  onPromptStateChange,
  saving = false,
  defaultPrompt = '',
  variationCount = 2,
  autoStart = false,
  autoStartKey,
  className,
  style,
  showHeader = true,
  saveLabel = 'Save',
  showActions = true,
  showEditor = true,
  showHistory = true,
  initialReferences = [],
}: MagicEditorProps) {
  const [internalSrc, setInternalSrc] = useState<string | null>(imageSrc ?? null);
  const [prompt, setPrompt] = useState<string>(defaultPrompt);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressVariant, setProgressVariant] = useState<'determinate' | 'indeterminate'>('determinate');
  const [messageIndex, setMessageIndex] = useState(0);
  const [hasJobStarted, setHasJobStarted] = useState(false);
  const messages = useMemo(() => [
    `Generating ${variationCount === 1 ? '1 result' : `${variationCount} results`}...`,
    'This will take a few seconds...',
    'Magic is hard work, you know?',
    'Just about done!',
    'Hang tight, wrapping up...',
  ], [variationCount]);
  const messagePercentages = useMemo(() =>
    Array.from({ length: Math.max(0, messages.length - 2) }, (_, index) => (index + 1) * (100 / (messages.length - 1))),
  [messages.length]);
  const [error, setError] = useState<string | null>(null);
  const [promptFocused, setPromptFocused] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [hasCompletedEdit, setHasCompletedEdit] = useState(false);
  const [originalAspectRatio, setOriginalAspectRatio] = useState<number | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);
  const desktopInputRef = useRef<HTMLInputElement | null>(null);
  const referenceInputRef = useRef<HTMLInputElement | null>(null);
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
  // Use a ref for ID counter to ensure synchronous, unique IDs even when
  // multiple functions (commitImage, addPendingEdit) run in the same render cycle
  const nextIdRef = useRef(1);
  const [previewEntry, setPreviewEntry] = useState<HistoryEntry | null>(null);
  const initialRecordedRef = useRef(false);
  const originalSrcRef = useRef<string>(imageSrc);
  const progressTimerRef = useRef<number | null>(null);
  const autoStartTriggerRef = useRef<string | number | boolean | null>(null);

  // Elegant, subtle glow around the progress card
  const accentColor = '#8b5cc7';

  // User + credit management
  const { setUser, forceTokenRefresh } = useContext(UserContext) as any;

  const applyCreditPatch = useCallback((credits: number) => {
    if (typeof setUser !== 'function') return;
    setUser((prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        userDetails: {
          ...(prev.userDetails || {}),
          credits,
        },
      };
    });
  }, [setUser]);

  const optimisticSpendCredit = useCallback(() => {
    if (typeof setUser !== 'function') return;
    setUser((prev: any) => {
      if (!prev) return prev;
      const currentCredits = prev?.userDetails?.credits;
      if (typeof currentCredits !== 'number') return prev;
      const newCreditAmount = Math.max(0, currentCredits - 1);
      return {
        ...prev,
        userDetails: {
          ...(prev.userDetails || {}),
          credits: newCreditAmount,
        },
      };
    });
  }, [setUser]);

  const refreshCreditsFromBackend = useCallback(async () => {
    if (typeof forceTokenRefresh !== 'function') return;
    try {
      await forceTokenRefresh();
    } catch (err) {
      console.error('Failed to refresh credits after magic edit:', err);
    }
  }, [forceTokenRefresh]);

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
    if (h.source === 'edit' && h.prompt && h.pending) return `"${h.prompt}"`;
    if (h.source === 'edit' && h.prompt) return `"${h.prompt}"`;
    if (h.source === 'revert' && h.prompt) return `"${h.prompt}"`;
    if (h.source === 'original') return 'Original';
    if (h.source === 'upload') return 'Uploaded';
    if (h.source === 'library') return 'From Library';
    return h.label || 'Edit';
  }, []);
  // No upload/library here: parent must provide an input photo

  useEffect(() => {
    setInternalSrc(imageSrc ?? null);
    originalSrcRef.current = imageSrc;
    // reset history when a new image arrives
    setHistory([]);
    nextIdRef.current = 1; // Reset ID counter along with history
    initialRecordedRef.current = false;
    setHasCompletedEdit(false);
    setOriginalAspectRatio(null); // Reset aspect ratio for new image
    setReferenceImages((initialReferences || []).slice(0, MAX_REFERENCE_IMAGES));
  }, [imageSrc, initialReferences]);

  // Capture original image aspect ratio to prevent layout shift when switching versions
  useEffect(() => {
    if (!imageSrc || originalAspectRatio !== null) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setOriginalAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = imageSrc;
  }, [imageSrc, originalAspectRatio]);

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
    // Get a unique ID synchronously from the ref
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    setImage(src);
    setHistory((prev) => {
      const isFirst = prev.length === 0 && (source === 'upload' || source === 'library' || source === 'original');
      const entry: HistoryEntry = {
        id,
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
  }, [setImage]);

  // Add a pending edit entry and return its id
  const addPendingEdit = useCallback((promptText: string): number => {
    // Get a unique ID synchronously from the ref to avoid duplicate IDs
    // when multiple functions run in the same React render cycle
    const id = nextIdRef.current;
    nextIdRef.current += 1;
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
    return id;
  }, [internalSrc]);

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

  // Clear any running progress timer on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        try { window.clearInterval(progressTimerRef.current); } catch {}
        progressTimerRef.current = null;
      }
    };
  }, []);

  const canSend = useMemo(() => Boolean(internalSrc) && !processing && prompt.trim().length > 0, [internalSrc, processing, prompt]);

  useEffect(() => {
    setPrompt(defaultPrompt || '');
  }, [defaultPrompt]);

  const blurPromptInputs = useCallback(() => {
    try { mobileInputRef.current?.blur(); } catch {}
    try { desktopInputRef.current?.blur(); } catch {}
    setPromptFocused(false);
  }, []);

  const normalizeImageForApi = useCallback(async (src: string): Promise<string> => {
    const normalized = await ensureImageDataUrl(src);
    try {
      const fetched = await fetch(normalized as string);
      const srcBlob = await fetched.blob();
      const resizedBlob = await resizeImage(srcBlob, EDITOR_IMAGE_MAX_DIMENSION_PX);
      return await blobToDataUrl(resizedBlob);
    } catch {
      return normalized;
    }
  }, []);

  const handleReferenceFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, MAX_REFERENCE_IMAGES);
    const newImages: string[] = [];
    for (const file of files) {
      try {
        newImages.push(await blobToDataUrl(file));
      } catch (err) {
        console.error('Failed to read reference image', err);
      }
    }
    if (newImages.length === 0) return;
    setReferenceImages((prev) => {
      const merged = [...prev, ...newImages];
      return merged.slice(0, MAX_REFERENCE_IMAGES);
    });
  }, []);

  const removeReferenceImage = useCallback((index: number) => {
    setReferenceImages((prev) => prev.filter((_, idx) => idx !== index));
  }, []);

  // No upload or library selection inside the editor

  const handleApply = useCallback(async () => {
    if (!internalSrc || processing) return;
    setProcessing(true);
    setProgress(0);
    setProgressVariant('indeterminate'); // initial: waiting for job to start
    setHasJobStarted(false);
    setMessageIndex(0);
    const currentPrompt = prompt;
    const pendingId = addPendingEdit(currentPrompt);
    // Optimistically assume a credit will be spent for this edit
    optimisticSpendCredit();
    // Keep prompt visible while processing so users see what's loading
    try {
      const payloadImage = await normalizeImageForApi(internalSrc);
      let referencePayloads: string[] = [];
      if (referenceImages.length > 0) {
        const prepared: string[] = [];
        for (const ref of referenceImages.slice(0, MAX_REFERENCE_IMAGES)) {
          try {
            prepared.push(await normalizeImageForApi(ref));
          } catch (err) {
            console.error('Failed to prepare reference image', err);
          }
        }
        referencePayloads = prepared;
      }
      // 1) Kick off backend job via existing /inpaint route, maskless
      const resp: any = await API.post('publicapi', '/inpaint', {
        body: {
          image: payloadImage,
          prompt: currentPrompt,
          ...(referencePayloads.length ? { references: referencePayloads } : {}),
        },
      });
      const magicResultId: string = resp?.magicResultId;
      const updatedCredits = Number(resp?.credits);
      if (Number.isFinite(updatedCredits)) {
        applyCreditPatch(updatedCredits);
      }
      if (!magicResultId) throw new Error('Failed to start edit');
      // Switch from initial indeterminate to determinate once job has started
      setHasJobStarted(true);
      setProgressVariant('determinate');

      // 2) Poll for result
      const QUERY_INTERVAL = 1500;
      const TIMEOUT = 60 * 1000;
      const start = Date.now();

      // Simulate progress while polling
      if (progressTimerRef.current) {
        try { window.clearInterval(progressTimerRef.current); } catch {}
        progressTimerRef.current = null;
      }
      const DURATION_SECONDS = 10; // main phase target duration
      const UPDATES_PER_SECOND = 2;
      const INCREMENT = 100 / (DURATION_SECONDS * UPDATES_PER_SECOND);
      progressTimerRef.current = window.setInterval(() => {
        setProgress((prev) => {
          // Once we hit 100%, flip to indeterminate "wrapping up"
          if (prev >= 100) {
            setProgressVariant('indeterminate');
            setMessageIndex(messages.length - 1);
            return 100;
          }
          const next = Math.min(100, prev + INCREMENT);
          if (next >= 100) {
            setProgressVariant('indeterminate');
            updateHistoryEntry(pendingId, { progress: 100 });
            setMessageIndex(messages.length - 1);
            return 100;
          }
          updateHistoryEntry(pendingId, { progress: next });
          // Update message index based on determinate progress thresholds
          let targetMessageIndex = 0;
          for (let i = 0; i < messagePercentages.length; i+=1) {
            if (next >= messagePercentages[i]) {
              targetMessageIndex = i + 1;
            } else {
              break;
            }
          }
          setMessageIndex(targetMessageIndex);
          return next;
        });
      }, 1000 / UPDATES_PER_SECOND);

      let finalUrl: string | null = null;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        // timeout check
        if (Date.now() - start > TIMEOUT) {
          throw new Error('Timed out waiting for magic result');
        }
        try {
          const result: any = await API.graphql(
            graphqlOperation(getMagicResult, { id: magicResultId })
          );
          const resultsStr: string | null = result?.data?.getMagicResult?.results ?? null;
          if (resultsStr) {
            const urls = JSON.parse(resultsStr);
            finalUrl = urls?.[0] ?? null;
            break;
          }
        } catch (e) {
          // swallow transient errors; keep polling
        }
        await new Promise((r) => setTimeout(r, QUERY_INTERVAL));
      }

      if (!finalUrl) throw new Error('No result image returned');

      // finalize pending entry
      updateHistoryEntry(pendingId, { src: finalUrl, pending: false, progress: 100 });
      setProgress(100);
      setImage(finalUrl);
      setHasCompletedEdit(true);
      if (onResult) onResult(finalUrl);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Magic edit failed.';
      setError(msg);
      // mark entry as failed
      updateHistoryEntry(pendingId, { pending: false, label: 'Edit failed', progress: undefined, prompt: undefined });
    } finally {
      if (progressTimerRef.current) {
        try { window.clearInterval(progressTimerRef.current); } catch {}
        progressTimerRef.current = null;
      }
      setProcessing(false);
      setTimeout(() => setProgress(0), 400);
      setProgressVariant('determinate');
      setHasJobStarted(false);
      // Now clear the prompt after processing completes
      setPrompt('');
      // In case of early failures or mismatched optimistic updates, refresh balance
      void refreshCreditsFromBackend();
    }
  }, [addPendingEdit, applyCreditPatch, internalSrc, normalizeImageForApi, onResult, optimisticSpendCredit, processing, prompt, referenceImages, refreshCreditsFromBackend, setImage, updateHistoryEntry]);

  useEffect(() => {
    if (!autoStart) return;
    const token = autoStartKey ?? defaultPrompt ?? true;
    if (autoStartTriggerRef.current === token) return;
    if (!canSend) return;
    autoStartTriggerRef.current = token;
    blurPromptInputs();
    void handleApply();
  }, [autoStart, autoStartKey, canSend, defaultPrompt, blurPromptInputs, handleApply]);

  useEffect(() => {
    if (!autoStart) {
      autoStartTriggerRef.current = null;
    }
  }, [autoStart]);

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
      <input
        ref={referenceInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          void handleReferenceFiles(e.target.files);
          if (referenceInputRef.current) {
            referenceInputRef.current.value = '';
          }
        }}
      />
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
            {/* Image area - uses aspect ratio to prevent layout shift when switching versions */}
            <Box sx={{
              position: 'relative',
              flex: { xs: '0 0 auto', md: 'initial' },
              overflow: 'hidden',
              order: { xs: 2, md: 'initial' },
              // Use aspect-ratio when known to prevent layout shift
              ...(originalAspectRatio ? {
                aspectRatio: `${originalAspectRatio}`,
                maxHeight: { xs: '55vh', md: '70vh' },
                width: '100%',
              } : {
                minHeight: { xs: 'auto', md: 'initial' },
              }),
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
                    height: '100%',
                    objectFit: 'contain',
                    filter: processing ? 'blur(2px) brightness(0.7)' : 'none',
                    transition: 'filter 200ms ease',
                  }}
                />
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>No image selected</Typography>
                </Box>
              )}

              {processing && (
                <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', p: 2 }}>
                  <Box sx={{ position: 'relative', width: { xs: 320, sm: 380 }, maxWidth: '92%' }}>
                    {/* Simple glass card */}
                    <Box sx={{ p: { xs: 1.75, sm: 2 }, borderRadius: 3, bgcolor: 'rgba(22,22,26,0.72)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 10px 35px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                        <CircularProgress size={32} thickness={5} sx={{ color: '#fff' }} />
                      </Box>
                      <LinearProgress 
                        variant={progressVariant} 
                        value={progress}
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          bgcolor: 'rgba(255,255,255,0.14)',
                          overflow: 'hidden',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: accentColor,
                          }
                        }}
                      />
                      <Typography 
                        variant="body2"
                        sx={{ 
                          display: 'block', mt: 1.25, textAlign: 'center', color: '#fff', fontWeight: 800,
                          letterSpacing: 0.2,
                          textShadow: '0 2px 10px rgba(0,0,0,0.35)'
                        }}
                      >
                        {progressVariant === 'determinate' ? `${Math.round(progress)}%` : messages[hasJobStarted ? messageIndex : 0]}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>

            {/* Prompt inside the combined unit on mobile */}
          <Box
            sx={{
              display: { xs: 'block', md: 'none' },
              p: 0,
              mt: 1.5,
              order: { xs: 3, md: 'initial' },
              flexShrink: 0,
            }}
          >
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
                      <AutoFixHighRounded sx={{ color: processing ? 'action.disabled' : 'primary.main', fontSize: 20 }} />
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
                          sx={{ mr: 0.25, opacity: 0.6, '&:hover': { opacity: 1 } }}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      ) : null}
                      {processing ? (
                        <CircularProgress size={20} thickness={5} sx={{ ml: 0.5, color: 'primary.main' }} />
                      ) : (
                        <IconButton
                          aria-label="send prompt"
                          size="small"
                          onClick={() => { blurPromptInputs(); if (canSend) void handleApply(); }}
                          disabled={!canSend}
                          edge="end"
                          sx={{
                            ml: 0.25,
                            bgcolor: canSend ? 'primary.main' : 'transparent',
                            color: canSend ? 'primary.contrastText' : 'action.disabled',
                            '&:hover': { bgcolor: canSend ? 'primary.dark' : 'transparent' },
                            '&.Mui-disabled': { bgcolor: 'transparent' },
                          }}
                        >
                          <Send fontSize="small" />
                        </IconButton>
                      )}
                    </InputAdornment>
                  ),
                }}
                inputProps={{ 'aria-label': 'Magic edit prompt' }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5,
                    backgroundColor: 'background.paper',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    '&.Mui-focused': {
                      boxShadow: '0 4px 16px rgba(139,92,199,0.2)',
                    },
                  },
                  '& .MuiOutlinedInput-root.Mui-disabled': {
                    backgroundColor: 'action.disabledBackground',
                    boxShadow: 'none',
                  },
                  '& .MuiOutlinedInput-input': {
                    color: 'text.primary',
                    fontWeight: 600,
                  },
                  '& .MuiOutlinedInput-input.Mui-disabled': {
                    color: 'text.disabled',
                    WebkitTextFillColor: 'unset',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'transparent',
                  },
                  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                    borderWidth: 2,
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: 'text.secondary',
                    opacity: 0.7,
                    fontWeight: 500,
                  },
                }}
              />
            </Box>
            <Box
              sx={{
                display: { xs: 'flex', md: 'none' },
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
                mt: 0.75,
              }}
            >
              {referenceImages.map((src, idx) => (
                <Box key={`${src}-${idx}`} sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={src}
                    alt={`Ref ${idx + 1}`}
                    sx={{
                      width: 40,
                      height: 40,
                      objectFit: 'cover',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                  <IconButton
                    size="small"
                    aria-label="Remove reference"
                    onClick={() => removeReferenceImage(idx)}
                    sx={{
                      position: 'absolute',
                      top: -10,
                      right: -10,
                      bgcolor: 'background.paper',
                      boxShadow: 1,
                      '&:hover': { bgcolor: 'grey.100' },
                    }}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              {referenceImages.length < MAX_REFERENCE_IMAGES && (
                <Button
                  variant="text"
                  size="small"
                  startIcon={<AddPhotoAlternate />}
                  onClick={() => referenceInputRef.current?.click()}
                  disabled={processing}
                  sx={{ minWidth: 0, p: 0.5 }}
                >
                  Add ref
                </Button>
              )}
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
                  disabled={processing || saving}
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
                  disabled={!internalSrc || processing || !hasCompletedEdit || saving}
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
                 startIcon={saving ? <CircularProgress size={18} thickness={5} color="inherit" /> : <Check />}>
                  {saving ? 'Saving…' : saveLabel}
                </Button>
               </Box>
            </Box>
            )}
          </Box>
        </Box>
        )}

        {/* Right: Controls + Versions panel (stacked) */}
        <Box
          sx={{
            width: { xs: '100%', md: 400 },
            position: { md: 'sticky' },
            top: { md: 16 },
            alignSelf: { md: 'flex-start' },
            // Subtle panel styling
            bgcolor: { xs: 'transparent', md: 'rgba(0,0,0,0.02)' },
            borderRadius: { xs: 0, md: 3 },
            border: { xs: 'none', md: '1px solid' },
            borderColor: { md: 'divider' },
            p: { xs: 0, md: 2 },
          }}
        >
          {/* Prompt input - chat-style */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              mb: 2,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.75, display: 'block' }}>
              New Edit
            </Typography>
            <TextField
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  backgroundColor: 'background.paper',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  },
                  '&.Mui-focused': {
                    boxShadow: '0 4px 16px rgba(139,92,199,0.2)',
                  },
                },
                '& .MuiOutlinedInput-root.Mui-disabled': {
                  backgroundColor: 'action.disabledBackground',
                  boxShadow: 'none',
                },
                '& .MuiOutlinedInput-input': {
                  color: 'text.primary',
                  fontWeight: 600,
                },
                '& .MuiOutlinedInput-input.Mui-disabled': {
                  color: 'text.disabled',
                  WebkitTextFillColor: 'unset',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'transparent',
                },
                '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'divider',
                },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  borderWidth: 2,
                },
                '& .MuiInputBase-input::placeholder': {
                  color: 'text.secondary',
                  opacity: 0.7,
                  fontWeight: 500,
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
                    <AutoFixHighRounded sx={{ color: processing ? 'action.disabled' : 'primary.main', fontSize: 20 }} />
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
                        sx={{ mr: 0.25, opacity: 0.6, '&:hover': { opacity: 1 } }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    ) : null}
                    {processing ? (
                      <CircularProgress size={20} thickness={5} sx={{ ml: 0.5, color: 'primary.main' }} />
                    ) : (
                      <IconButton
                        aria-label="send prompt"
                        size="small"
                        onClick={() => { blurPromptInputs(); if (canSend) void handleApply(); }}
                        disabled={!canSend}
                        edge="end"
                        sx={{
                          ml: 0.25,
                          bgcolor: canSend ? 'primary.main' : 'transparent',
                          color: canSend ? 'primary.contrastText' : 'action.disabled',
                          '&:hover': { bgcolor: canSend ? 'primary.dark' : 'transparent' },
                          '&.Mui-disabled': { bgcolor: 'transparent' },
                        }}
                      >
                        <Send fontSize="small" />
                      </IconButton>
                    )}
                  </InputAdornment>
                ),
              }}
              inputProps={{ 'aria-label': 'Magic edit prompt' }}
            />
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            {referenceImages.map((src, idx) => (
              <Box key={`${src}-${idx}`} sx={{ position: 'relative' }}>
                <Box
                  component="img"
                  src={src}
                  alt={`Ref ${idx + 1}`}
                  sx={{
                    width: 44,
                    height: 44,
                    objectFit: 'cover',
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
                <IconButton
                  size="small"
                  aria-label="Remove reference"
                  onClick={() => removeReferenceImage(idx)}
                  sx={{
                    position: 'absolute',
                    top: -10,
                    right: -10,
                    bgcolor: 'background.paper',
                    boxShadow: 1,
                    '&:hover': { bgcolor: 'grey.100' },
                  }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </Box>
            ))}
            {referenceImages.length < MAX_REFERENCE_IMAGES && (
              <Button
                variant="text"
                size="small"
                startIcon={<AddPhotoAlternate />}
                onClick={() => referenceInputRef.current?.click()}
                disabled={processing}
                sx={{ minWidth: 0, px: 0.5 }}
              >
                Add ref
              </Button>
            )}
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Optional refs stay secondary to the main image.
            </Typography>
          </Stack>

          {/* Versions list */}
          {showHistory && history.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Versions
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 500 }}>
                  {history.length} {history.length === 1 ? 'version' : 'versions'}
                </Typography>
              </Box>
              {historyOpen && (
                <Stack
                  spacing={1}
                  sx={{
                    // Avoid internal scrolling on mobile; allow full-page scroll
                    maxHeight: { xs: 'none', md: '45vh' },
                    overflowY: { xs: 'visible', md: 'auto' },
                    mr: -0.5,
                    pr: 0.5,
                    // Custom scrollbar
                    '&::-webkit-scrollbar': { width: 6 },
                    '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                    '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 3 },
                  }}
                >
                  {[...history].slice().reverse().map((h, idx, arr) => {
                    const isCurrent = internalSrc === h.src && !h.pending;
                    const canSelect = !processing && !h.pending && !isCurrent;
                    const versionNum = arr.length - idx;
                    const background = h.pending
                      ? 'rgba(139,92,199,0.08)'
                      : isCurrent
                        ? 'primary.main'
                        : 'rgba(0,0,0,0.02)';
                    const borderColor = h.pending
                      ? 'primary.light'
                      : isCurrent
                        ? 'primary.main'
                        : 'divider';
                    const borderStyle = h.pending ? 'dotted' : 'solid';
                    const borderWidth = h.pending ? 2 : 1;
                    return (
                      <Box
                        key={h.id}
                        role="button"
                        tabIndex={canSelect ? 0 : -1}
                        onClick={() => { if (canSelect) setImage(h.src); }}
                        onKeyDown={(e) => { if (canSelect && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setImage(h.src); } }}
                        sx={{
                          display: 'flex',
                          gap: 1.25,
                          alignItems: 'center',
                          p: 1,
                          borderRadius: 2,
                          bgcolor: background,
                          border: `${borderWidth}px`,
                          borderStyle,
                          borderColor,
                          boxShadow: isCurrent
                            ? '0 4px 14px rgba(139,92,199,0.35)'
                            : '0 1px 4px rgba(0,0,0,0.08)',
                          cursor: canSelect ? 'pointer' : 'default',
                          transition: 'all 0.2s ease',
                          transform: isCurrent ? 'scale(1)' : 'scale(1)',
                          '&:hover': canSelect ? {
                            bgcolor: 'rgba(0,0,0,0.04)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            transform: 'translateY(-1px)',
                          } : {},
                          '&:active': canSelect ? {
                            transform: 'scale(0.98)',
                          } : {},
                        }}
                      >
                        {/* Thumbnail with version badge */}
                        <Box sx={{ position: 'relative', flexShrink: 0 }}>
                          {/* eslint-disable-next-line jsx-a11y/alt-text */}
                          <img
                            src={h.src}
                            alt={h.label}
                            style={{
                              width: 56,
                              height: 56,
                              objectFit: 'cover',
                              borderRadius: 8,
                              filter: h.pending ? 'grayscale(0.4) brightness(0.9)' : 'none',
                              opacity: h.pending ? 0.8 : 1,
                              border: isCurrent ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent',
                            }}
                          />
                          {/* Version number badge */}
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: -4,
                              right: -4,
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              bgcolor: isCurrent ? 'background.paper' : 'grey.700',
                              color: isCurrent ? 'primary.main' : 'common.white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 10,
                              fontWeight: 800,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            }}
                          >
                            {h.pending ? '…' : versionNum}
                          </Box>
                          {h.pending && (
                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 1 }}>
                              <CircularProgress size={18} thickness={5} sx={{ color: 'common.white' }} />
                            </Box>
                          )}
                        </Box>
                        {/* Label + meta */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                                  color: h.pending
                                    ? 'primary.main'
                                    : isCurrent
                                      ? 'primary.contrastText'
                                      : 'text.primary',
                              lineHeight: 1.3,
                            }}
                          >
                            {getDisplayLabel(h)}
                          </Typography>
                          {h.pending ? (
                            <Box sx={{ pr: 1, pt: 0.5 }}>
                              <LinearProgress
                                variant="determinate"
                                value={h.progress ?? 0}
                                sx={{
                                  height: 4,
                                  borderRadius: 2,
                                  bgcolor: 'rgba(255,255,255,0.2)',
                                  '& .MuiLinearProgress-bar': { bgcolor: 'common.white' },
                                }}
                              />
                            </Box>
                          ) : (
                            <Typography
                              variant="caption"
                              sx={{
                                color: isCurrent ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                                fontWeight: 500,
                              }}
                            >
                              {isCurrent ? '● Current' : 'Click to use'}
                            </Typography>
                          )}
                        </Box>
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
              setImage(previewEntry.src);
              setPreviewEntry(null);
            }}
          >
            Use This
          </Button>
        </DialogActions>
  </Dialog>
      {/* Confirm discard of unapplied prompt when saving */}
      <Dialog open={confirmDiscardOpen} onClose={() => { if (!saving) setConfirmDiscardOpen(false); }} disableEscapeKeyDown={saving} fullWidth maxWidth="xs">
        <DialogTitle>Discard Unapplied Edit?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Do you want to discard your unapplied edit "
            <Box component="span" sx={{ fontWeight: 700 }}>{prompt}</Box>
            "?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDiscardOpen(false)} disabled={saving}>Keep Editing</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (internalSrc && onSave) onSave(internalSrc);
              setConfirmDiscardOpen(false);
            }}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Discard and Save'}
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

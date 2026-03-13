import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import { ArrowBackRounded } from '@mui/icons-material';
import StickerBrushEditor from './StickerBrushEditor';
import type { ExportedStickerEdit } from './stickerBrushMath';
import LibraryBrowser from '../../library/LibraryBrowser';

type PreparedStickerSource = {
  dataUrl: string;
  metadata: Record<string, any>;
  aspectRatio: number;
  originalItem?: any;
};

type StickerAddFlowProps = {
  onClose: () => void;
  onResolveSelection: (selectedItem: any) => Promise<PreparedStickerSource>;
  onCommit: (payload: { preparedSource: PreparedStickerSource; edit: ExportedStickerEdit }) => void | Promise<void>;
};

const AnyLibraryBrowser = LibraryBrowser as unknown as React.ComponentType<any>;

export default function StickerAddFlow({
  onClose,
  onResolveSelection,
  onCommit,
}: StickerAddFlowProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [step, setStep] = React.useState<'library' | 'editor'>('library');
  const [busy, setBusy] = React.useState(false);
  const [errorText, setErrorText] = React.useState('');
  const [preparedSource, setPreparedSource] = React.useState<PreparedStickerSource | null>(null);
  const [availableViewportHeight, setAvailableViewportHeight] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let rafId: number | null = null;
    const updateAvailableHeight = () => {
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const root = rootRef.current;
        if (!root) return;
        const rect = root.getBoundingClientRect();
        const viewportHeight = Number(window.visualViewport?.height || window.innerHeight || 0);
        if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) return;
        const nextHeight = Math.max(0, Math.round(viewportHeight - Math.max(rect.top, 0)));
        if (nextHeight <= 0) return;
        setAvailableViewportHeight((previous) => (
          previous != null && Math.abs(previous - nextHeight) < 1 ? previous : nextHeight
        ));
      });
    };

    updateAvailableHeight();

    const visualViewport = window.visualViewport;
    window.addEventListener('resize', updateAvailableHeight);
    window.addEventListener('orientationchange', updateAvailableHeight);
    visualViewport?.addEventListener('resize', updateAvailableHeight);
    visualViewport?.addEventListener('scroll', updateAvailableHeight);

    const root = rootRef.current;
    const resizeObserver = typeof ResizeObserver !== 'undefined' && root
      ? new ResizeObserver(updateAvailableHeight)
      : null;
    resizeObserver?.observe(root);

    return () => {
      window.removeEventListener('resize', updateAvailableHeight);
      window.removeEventListener('orientationchange', updateAvailableHeight);
      visualViewport?.removeEventListener('resize', updateAvailableHeight);
      visualViewport?.removeEventListener('scroll', updateAvailableHeight);
      resizeObserver?.disconnect();
      if (rafId != null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const handleLibrarySelect = React.useCallback(async (items: any[]) => {
    const selected = Array.isArray(items) ? items[0] : null;
    if (!selected) return;
    setBusy(true);
    setErrorText('');
    try {
      const resolved = await onResolveSelection(selected);
      setPreparedSource(resolved);
      setStep('editor');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Unable to open that sticker right now.');
    } finally {
      setBusy(false);
    }
  }, [onResolveSelection]);

  const handleBack = React.useCallback(() => {
    if (busy) return;
    if (step === 'editor') {
      setStep('library');
      setErrorText('');
      return;
    }
    onClose();
  }, [busy, onClose, step]);

  const handleCommit = React.useCallback(async (edit: ExportedStickerEdit) => {
    if (!preparedSource) return;
    setBusy(true);
    setErrorText('');
    try {
      await onCommit({ preparedSource, edit });
      onClose();
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Unable to add that sticker right now.');
    } finally {
      setBusy(false);
    }
  }, [onClose, onCommit, preparedSource]);

  return (
    <Box
      ref={rootRef}
      sx={{
        width: '100%',
        height: availableViewportHeight != null ? `${availableViewportHeight}px` : '100%',
        maxHeight: availableViewportHeight != null ? `${availableViewportHeight}px` : '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        overscrollBehavior: 'none',
        bgcolor: 'transparent',
        border: 'none',
        borderRadius: 0,
      }}
    >
      {errorText ? (
        <Alert severity="error" sx={{ m: 1.25, mb: 0, flexShrink: 0 }}>
          {errorText}
        </Alert>
      ) : null}

      {step === 'editor' && preparedSource ? (
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <StickerBrushEditor
            imageSrc={preparedSource.dataUrl}
            onBack={handleBack}
            onAdd={handleCommit}
            busy={busy}
          />
        </Box>
      ) : (
        <>
          <Box
            sx={{
              px: { xs: 0.5, md: 0 },
              py: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Button
              variant="text"
              onClick={handleBack}
              disabled={busy}
              startIcon={<ArrowBackRounded sx={{ fontSize: 18 }} />}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                minWidth: 0,
                px: 0.5,
                '& .MuiButton-startIcon': { mr: 0.4 },
              }}
            >
              Library
            </Button>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              Stickers
            </Typography>
            <Box sx={{ minWidth: 56, display: 'flex', justifyContent: 'flex-end' }}>
              {busy ? <CircularProgress size={18} /> : null}
            </Box>
          </Box>

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', px: 0, pb: 0 }}>
            <AnyLibraryBrowser
              multiple={false}
              uploadEnabled
              deleteEnabled={false}
              showActionBar={false}
              previewOnClick={false}
              selectionEnabled={false}
              showSelectToggle={false}
              instantSelectOnClick
              onSelect={(items: any[]) => { void handleLibrarySelect(items); }}
              sx={{
                mt: 0,
                height: '100%',
                overflow: 'auto',
                px: 0,
                '& > .MuiBox-root:first-of-type': {
                  mt: 0,
                  mb: 0.75,
                },
                '& .MuiTextField-root': {
                  mt: 0,
                },
              }}
            />
          </Box>
        </>
      )}
    </Box>
  );
}

export type { PreparedStickerSource };

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
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
  const theme = useTheme();
  const [step, setStep] = React.useState<'library' | 'editor'>('library');
  const [busy, setBusy] = React.useState(false);
  const [errorText, setErrorText] = React.useState('');
  const [preparedSource, setPreparedSource] = React.useState<PreparedStickerSource | null>(null);

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

  if (step === 'editor' && preparedSource) {
    return (
      <StickerBrushEditor
        imageSrc={preparedSource.dataUrl}
        onBack={handleBack}
        onAdd={handleCommit}
        busy={busy}
      />
    );
  }

  return (
    <Box
      sx={{
        minHeight: { xs: 'calc(100dvh - 10px)', md: 'calc(100dvh - 36px)' },
        display: 'flex',
        flexDirection: 'column',
        borderRadius: { xs: 0, md: 3 },
        overflow: 'hidden',
        bgcolor: theme.palette.background.paper,
        border: { xs: 'none', md: `1px solid ${alpha(theme.palette.divider, 0.9)}` },
      }}
    >
      <Box
        sx={{
          px: { xs: 1.25, md: 1.5 },
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.75)}`,
        }}
      >
        <Button
          variant="text"
          onClick={handleBack}
          disabled={busy}
          sx={{ textTransform: 'none', fontWeight: 700, minWidth: 0, px: 0.5 }}
        >
          Back
        </Button>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
          Stickers
        </Typography>
        <Box sx={{ minWidth: 56, display: 'flex', justifyContent: 'flex-end' }}>
          {busy ? <CircularProgress size={18} /> : null}
        </Box>
      </Box>

      {errorText ? (
        <Alert severity="error" sx={{ m: 1.25, mb: 0, flexShrink: 0 }}>
          {errorText}
        </Alert>
      ) : null}

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden', px: { xs: 1, md: 1.25 }, pb: { xs: 1, md: 1.25 } }}>
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
            '& .MuiTextField-root': {
              mt: 0.25,
            },
          }}
        />
      </Box>
    </Box>
  );
}

export type { PreparedStickerSource };

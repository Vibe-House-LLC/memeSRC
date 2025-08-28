import React, { useMemo, useState } from 'react';
import { Box, Button, Container, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { AutoFixHighRounded } from '@mui/icons-material';
import MagicEditor from '../components/magic-editor/MagicEditor';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - JS module without types
import LibraryBrowser from '../components/library/LibraryBrowser.jsx';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - JS module without types
import { get as getFromLibrary } from '../utils/library/storage';

export default function MagicPage() {
  const [stage, setStage] = useState<'pick' | 'edit' | 'done'>('pick');
  const [chosen, setChosen] = useState<string | null>(null);
  const [finalSrc, setFinalSrc] = useState<string | null>(null);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [promptState, setPromptState] = useState<{ value: string; focused: boolean }>({ value: '', focused: false });
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const AnyLibraryBrowser = LibraryBrowser as unknown as React.ComponentType<any>;

  const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const handlePick = async (items: Array<{ displayUrl?: string; originalUrl?: string; metadata?: any }>) => {
    const first = items?.[0];
    const url = first?.displayUrl || first?.originalUrl || null;
    const libKey: string | undefined = (first as any)?.metadata?.libraryKey;
    if (libKey) {
      try {
        const blob: Blob = await getFromLibrary(libKey, { level: 'protected' });
        const dataUrl = await blobToDataUrl(blob);
        setChosen(dataUrl);
        setCurrentSrc(dataUrl);
        setStage('edit');
        return;
      } catch (_) {
        // fall back to url below
      }
    }
    if (url) {
      try {
        // try to force data url to avoid CORS; if not possible, still use url
        const res = await fetch(url, { mode: 'cors' });
        const blob = await res.blob();
        const dataUrl = await blobToDataUrl(blob);
        setChosen(dataUrl);
        setCurrentSrc(dataUrl);
      } catch (_) {
        setChosen(url);
        setCurrentSrc(url);
      }
      setStage('edit');
    }
  };

  const reset = () => {
    setStage('pick');
    setChosen(null);
    setFinalSrc(null);
  };

  return (
    <>
    <Container maxWidth="lg" sx={{ px: { xs: 1.5, md: 3 }, py: { xs: 2, md: 4 } }}>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
          Magic Editor (Demo)
        </Typography>
        {/* Mobile: always show subheading */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1, mt: 0.5 }}>
          <AutoFixHighRounded sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Ask for edits in plain English
          </Typography>
        </Box>
        {/* Desktop: show subheading only when not editing (wide bar covers this during edit) */}
        {stage !== 'edit' && (
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1, mt: 0.5 }}>
            <AutoFixHighRounded sx={{ color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Ask for edits in plain English
            </Typography>
          </Box>
        )}
      </Box>

      {/* Desktop action bar during editing: full-width under header/description */}
      {stage === 'edit' && (
        <Box sx={{ display: { xs: 'none', md: 'block' }, mb: 2 }}>
          <Box
            sx={{
              width: '100%',
              px: 2,
              py: 1,
              borderRadius: 2,
              backgroundColor: '#000',
              boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, gap: 1.25 }}>
                <AutoFixHighRounded sx={{ color: 'primary.main' }} />
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: 'common.white',
                    fontWeight: 800,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Ask for edits in plain English
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  size="large"
                  variant="outlined"
                  onClick={() => {
                    const hasUnappliedPrompt = Boolean(promptState.value && promptState.value.trim().length > 0);
                    const hasUnsavedEdits = Boolean(chosen && currentSrc && chosen !== currentSrc);
                    if (hasUnappliedPrompt || hasUnsavedEdits) {
                      setConfirmCancelOpen(true);
                    } else {
                      setStage('pick');
                    }
                  }}
                  disabled={processing}
                  sx={{
                    minHeight: 44,
                    fontWeight: 700,
                    textTransform: 'none',
                    color: 'rgba(255,255,255,0.92)',
                    borderColor: 'rgba(255,255,255,0.35)',
                    '&:hover': { borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.08)' }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="large"
                  variant="contained"
                  onClick={() => {
                    if (!currentSrc) return;
                    if (promptState.value && promptState.value.trim().length > 0) {
                      setConfirmDiscardOpen(true);
                    } else {
                      setFinalSrc(currentSrc);
                      setStage('done');
                    }
                  }}
                  disabled={!currentSrc || processing}
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
                >
                  Save
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {stage === 'pick' && (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Choose a photo
          </Typography>
          <AnyLibraryBrowser
            multiple={false}
            instantSelectOnClick
            showActionBar
            actionBarLabel="Use Selected"
            onSelect={handlePick}
          />
        </Box>
      )}

      {stage === 'edit' && chosen && (
        <MagicEditor
          imageSrc={chosen}
          onImageChange={setCurrentSrc}
          onProcessingChange={setProcessing}
          onPromptStateChange={setPromptState}
          onSave={(src) => {
            setFinalSrc(src);
            setStage('done');
          }}
          onCancel={() => {
            const hasUnappliedPrompt = Boolean(promptState.value && promptState.value.trim().length > 0);
            const hasUnsavedEdits = Boolean(chosen && currentSrc && chosen !== currentSrc);
            if (hasUnappliedPrompt || hasUnsavedEdits) {
              setConfirmCancelOpen(true);
            } else {
              setStage('pick');
            }
          }}
        />
      )}

      {stage === 'done' && finalSrc && (
        <Box sx={{ textAlign: 'center', maxWidth: 720, mx: 'auto' }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
            This is your final edit!
          </Typography>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <img src={finalSrc} alt="Final edit" style={{ maxWidth: '100%', height: 'auto', borderRadius: 12 }} />
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={reset}>Start Again</Button>
          </Box>
        </Box>
      )}
    </Container>
    {/* Confirm discard of unapplied prompt when saving from desktop controls */}
    <Dialog open={confirmDiscardOpen} onClose={() => setConfirmDiscardOpen(false)} fullWidth maxWidth="xs">
      <DialogTitle>Discard Unapplied Edit?</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2">
          Do you want to discard your unapplied edit "
          <Box component="span" sx={{ fontWeight: 700 }}>{promptState.value}</Box>
          "?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setConfirmDiscardOpen(false)}>Keep Editing</Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => {
            if (currentSrc) {
              setFinalSrc(currentSrc);
              setStage('done');
            }
            setConfirmDiscardOpen(false);
          }}
        >
          Discard and Save
        </Button>
      </DialogActions>
    </Dialog>

    {/* Confirm cancel when there are unsaved or unapplied edits */}
    <Dialog open={confirmCancelOpen} onClose={() => setConfirmCancelOpen(false)} fullWidth maxWidth="xs">
      <DialogTitle>Discard Changes?</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: promptState.value ? 1 : 0 }}>
          You have unsaved changes. Do you want to discard them and exit the editor?
        </Typography>
        {promptState.value && (
          <Typography variant="body2">
            Unapplied prompt: "<Box component="span" sx={{ fontWeight: 700 }}>{promptState.value}</Box>"
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setConfirmCancelOpen(false)}>Keep Editing</Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => {
            setConfirmCancelOpen(false);
            setStage('pick');
          }}
        >
          Discard and Exit
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}

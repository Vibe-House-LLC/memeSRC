import React, { useMemo, useState } from 'react';
import { Box, Button, Container, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
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
    <Container maxWidth="lg" sx={{ px: { xs: 1.5, md: 3 }, py: { xs: 2, md: 4 } }}>
      {/* Top action bar during editing */}
      {stage === 'edit' && (
        <>
          {/* Fixed top controls: Cancel / Save 50/50 */}
          <Box
            sx={(theme) => ({
              display: { xs: 'none', md: 'block' },
              position: 'fixed',
              // Position just below the app header so we don't overlap it
              top: theme.spacing(6), // ~48px on small screens
              [theme.breakpoints.up('lg')]: { top: theme.spacing(8) }, // ~64px on large screens
              left: 0,
              right: 0,
              zIndex: theme.zIndex.appBar, // above content, below/alongside header
              pt: 'env(safe-area-inset-top)',
              pb: 1,
            })}
          >
            <Container maxWidth="lg" sx={{ px: { xs: 1.5, md: 3 } }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <Button
                  size="large"
                  fullWidth
                  variant="contained"
                  onClick={() => setStage('pick')}
                  disabled={processing}
                  sx={{
                    minHeight: 44,
                    fontWeight: 700,
                    textTransform: 'none',
                    color: 'rgba(255,255,255,0.95)',
                    backgroundColor: 'rgba(17,17,19,0.55)',
                    backdropFilter: 'saturate(160%) blur(10px)',
                    WebkitBackdropFilter: 'saturate(160%) blur(10px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
                    '&:hover': { backgroundColor: 'rgba(17,17,19,0.7)' },
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="large"
                  fullWidth
                  variant="contained"
                  onClick={() => { if (currentSrc) { setFinalSrc(currentSrc); setStage('done'); } }}
                  disabled={!currentSrc || processing}
                  sx={{
                    minHeight: 44,
                    fontWeight: 700,
                    textTransform: 'none',
                    background: 'linear-gradient(45deg, #6b42a1 0%, #7b4cb8 50%, #8b5cc7 100%)',
                    border: '1px solid #8b5cc7',
                    color: '#fff',
                    backdropFilter: 'saturate(160%) blur(10px)',
                    WebkitBackdropFilter: 'saturate(160%) blur(10px)',
                    boxShadow: '0 6px 24px rgba(0,0,0,0.35)',
                    '&:hover': { background: 'linear-gradient(45deg, #5e3992 0%, #6b42a1 50%, #7b4cb8 100%)' },
                  }}
                >
                  Save
                </Button>
              </Box>
            </Container>
          </Box>
          {/* Spacer so content is not hidden under fixed controls */}
          <Box sx={{ display: { xs: 'none', md: 'block' }, height: { md: 72 }, mb: 1 }} />
        </>
      )}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
          Magic Editor (Demo)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select a photo from your library, edit it, then save your final result.
        </Typography>
      </Box>

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
          onSave={(src) => {
            setFinalSrc(src);
            setStage('done');
          }}
          onCancel={() => {
            // back to picker, discard changes
            setStage('pick');
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
  );
}

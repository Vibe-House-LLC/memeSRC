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
        <Box sx={{
          position: 'sticky',
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          mb: 2,
          px: { xs: 1, md: 0 },
          py: 1,
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.7)',
          backdropFilter: 'saturate(180%) blur(10px)',
          WebkitBackdropFilter: 'saturate(180%) blur(10px)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.08)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Editing</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="large"
                variant="outlined"
                color="inherit"
                onClick={() => setStage('pick')}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                size="large"
                variant="contained"
                color="secondary"
                onClick={() => { if (currentSrc) { setFinalSrc(currentSrc); setStage('done'); } }}
                disabled={!currentSrc || processing}
              >
                Save
              </Button>
            </Box>
          </Box>
        </Box>
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

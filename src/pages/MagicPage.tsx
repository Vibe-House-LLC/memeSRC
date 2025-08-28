import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Box, Button, Container, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { AutoFixHighRounded, CloseRounded } from '@mui/icons-material';
import MagicEditor from '../components/magic-editor/MagicEditor';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - JS module without types
import LibraryBrowser from '../components/library/LibraryBrowser.jsx';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - JS module without types
import { get as getFromLibrary } from '../utils/library/storage';
import { useLocation, useNavigate } from 'react-router-dom';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - JS module without types
import { saveImageToLibrary } from '../utils/library/saveImageToLibrary';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - JS module without types
import { resizeImage } from '../utils/library/resizeImage';
import { UPLOAD_IMAGE_MAX_DIMENSION_PX, EDITOR_IMAGE_MAX_DIMENSION_PX } from '../constants/imageProcessing';
import { UserContext } from '../UserContext';

export default function MagicPage() {
  const location = useLocation() as any;
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const isAdmin = user?.['cognito:groups']?.includes('admins');
  const [stage, setStage] = useState<'pick' | 'choose' | 'edit' | 'done'>('pick');
  const [chosen, setChosen] = useState<string | null>(null);
  const [finalSrc, setFinalSrc] = useState<string | null>(null);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [promptState, setPromptState] = useState<{ value: string; focused: boolean }>({ value: '', focused: false });
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [versionChoice, setVersionChoice] = useState<'frame' | 'original' | null>(null);
  const AnyLibraryBrowser = LibraryBrowser as unknown as React.ComponentType<any>;

  // Gate this page to admins only
  useEffect(() => {
    if (isAdmin === false) {
      const returnTo: string | undefined = location?.state?.returnTo;
      if (returnTo) {
        navigate(returnTo, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAdmin, navigate, location?.state]);

  const chooseFrom = useMemo(() => location?.state?.chooseFrom as undefined | { originalSrc?: string; frameSrc?: string }, [location?.state]);

  const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  // If navigated here with an initial image (from collage), start in choose/edit stage
  useEffect(() => {
    const initSrc: string | undefined = location?.state?.initialSrc;
    if (chooseFrom && (chooseFrom.originalSrc || chooseFrom.frameSrc)) {
      // If both exist, go to a dedicated choose step (default highlight cropped)
      if (chooseFrom.originalSrc && chooseFrom.frameSrc) {
        const prefer: 'frame' | 'original' = chooseFrom.frameSrc ? 'frame' : 'original';
        setVersionChoice(prefer);
        const initial = prefer === 'frame' ? chooseFrom.frameSrc : chooseFrom.originalSrc;
        if (initial) {
          setChosen(initial);
          setCurrentSrc(initial);
        }
        setStage('choose');
      } else {
        // Only one available; jump straight to edit
        const preferred = chooseFrom.frameSrc || chooseFrom.originalSrc;
        if (preferred) {
          setChosen(preferred);
          setCurrentSrc(preferred);
          setVersionChoice(chooseFrom.frameSrc ? 'frame' : 'original');
          setStage('edit');
        }
      }
    } else if (initSrc) {
      setChosen(initSrc);
      setCurrentSrc(initSrc);
      setStage('edit');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReturnToCaller = async (src: string) => {
    const returnTo: string | undefined = location?.state?.returnTo;
    const context: any = location?.state?.collageEditContext;
    if (!returnTo) return;
    try {
      // Persist + normalize like inline editor flow
      const res = await fetch(src);
      const srcBlob = await res.blob();
      const uploadBlob = await resizeImage(srcBlob, UPLOAD_IMAGE_MAX_DIMENSION_PX);
      const toDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
      const originalUrl = await toDataUrl(uploadBlob);
      const editorBlob = await resizeImage(uploadBlob, EDITOR_IMAGE_MAX_DIMENSION_PX);
      const displayUrl = await toDataUrl(editorBlob);
      const libraryKey = await saveImageToLibrary(src, 'magic-edit.jpg', { level: 'protected', metadata: { source: 'magic-editor' } });
      navigate(returnTo, {
        replace: false,
        state: {
          magicResult: { originalUrl, displayUrl, metadata: { libraryKey } },
          magicContext: context || null,
        },
      });
    } catch (_) {
      // If anything fails, still try to pass back via raw src
      navigate(returnTo, { replace: false, state: { magicResult: { originalUrl: src, displayUrl: src }, magicContext: context || null } });
    }
  };

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
              // Remove black rounded box styling to make it visually seamless
              borderRadius: 0,
              backgroundColor: 'transparent',
              boxShadow: 'none',
              border: 'none',
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
                    if (location?.state?.returnTo) {
                      navigate(-1);
                      return;
                    }
                    const hasUnappliedPrompt = Boolean(promptState.value && promptState.value.trim().length > 0);
                    const hasUnsavedEdits = Boolean(chosen && currentSrc && chosen !== currentSrc);
                    if (hasUnappliedPrompt || hasUnsavedEdits) { setConfirmCancelOpen(true); } else { setStage('pick'); }
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
                      if (location?.state?.returnTo) {
                        handleReturnToCaller(currentSrc);
                      } else {
                        setFinalSrc(currentSrc);
                        setStage('done');
                      }
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

      {stage === 'choose' && (
        <Box>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.25 }}>
        Which version do you want to edit?
      </Typography>
          {/* Top 50/50 Cancel / Edit actions */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1.25 }}>
            <Button
              size="large"
              variant="outlined"
              startIcon={<CloseRounded />}
              onClick={() => navigate(-1)}
              sx={{ fontWeight: 800, textTransform: 'none', minHeight: 48 }}
            >
              Cancel
            </Button>
            <Button
              size="large"
              variant="contained"
              startIcon={<AutoFixHighRounded />}
              onClick={() => {
                if (!versionChoice) return;
                setStage('edit');
              }}
              disabled={!versionChoice}
              sx={{
                minHeight: 48,
                fontWeight: 900,
                textTransform: 'none',
                background: 'linear-gradient(45deg, #6b42a1 0%, #7b4cb8 50%, #8b5cc7 100%)',
                border: '1px solid #8b5cc7',
                color: '#fff',
                boxShadow: '0 10px 28px rgba(139,92,199,0.35)',
                '&:hover': { background: 'linear-gradient(45deg, #5e3992 0%, #6b42a1 50%, #7b4cb8 100%)' },
              }}
            >
              Edit
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Current Frame (cropped) */}
            <Box
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!chooseFrom?.frameSrc) return;
                setVersionChoice('frame');
                setChosen(chooseFrom.frameSrc);
                setCurrentSrc(chooseFrom.frameSrc);
                setPromptState({ value: '', focused: false });
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && chooseFrom?.frameSrc) {
                  e.preventDefault();
                  setVersionChoice('frame');
                  setChosen(chooseFrom.frameSrc);
                  setCurrentSrc(chooseFrom.frameSrc);
                  setPromptState({ value: '', focused: false });
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: versionChoice === 'frame' ? 'primary.main' : 'divider',
                backgroundColor: versionChoice === 'frame' ? 'action.selected' : 'background.paper',
                cursor: chooseFrom?.frameSrc ? 'pointer' : 'not-allowed',
                opacity: chooseFrom?.frameSrc ? 1 : 0.5,
                minHeight: 72,
              }}
            >
              <Box sx={{ width: 72, height: 72, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {chooseFrom?.frameSrc && (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <img src={chooseFrom.frameSrc} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                )}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.1 }}>Current Frame</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>cropped</Typography>
              </Box>
            </Box>

            {/* Source Photo (uncropped) */}
            <Box
              role="button"
              tabIndex={0}
              onClick={() => {
                if (!chooseFrom?.originalSrc) return;
                setVersionChoice('original');
                setChosen(chooseFrom.originalSrc);
                setCurrentSrc(chooseFrom.originalSrc);
                setPromptState({ value: '', focused: false });
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && chooseFrom?.originalSrc) {
                  e.preventDefault();
                  setVersionChoice('original');
                  setChosen(chooseFrom.originalSrc);
                  setCurrentSrc(chooseFrom.originalSrc);
                  setPromptState({ value: '', focused: false });
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: versionChoice === 'original' ? 'primary.main' : 'divider',
                backgroundColor: versionChoice === 'original' ? 'action.selected' : 'background.paper',
                cursor: chooseFrom?.originalSrc ? 'pointer' : 'not-allowed',
                opacity: chooseFrom?.originalSrc ? 1 : 0.5,
                minHeight: 72,
              }}
            >
              <Box sx={{ width: 72, height: 72, borderRadius: 1, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {chooseFrom?.originalSrc && (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <img src={chooseFrom.originalSrc} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                )}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.1 }}>Source Photo</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>uncropped</Typography>
              </Box>
            </Box>
          </Box>
          {/* Frosted glass preview with centered glowing Edit button */}
          {versionChoice && (chosen || currentSrc) && (
            <Box
              sx={{
                position: 'relative',
                mt: 1.5,
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 16px 36px rgba(0,0,0,0.35)'
              }}
            >
              <Box sx={{ position: 'relative' }}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <img
                  src={versionChoice === 'frame' ? chooseFrom?.frameSrc : chooseFrom?.originalSrc}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    filter: 'blur(12px) saturate(1.05) brightness(0.9)',
                    transform: 'scale(1.03)'
                  }}
                />
                {/* subtle frosted overlay */}
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.6) 100%)',
                    backdropFilter: 'blur(2px)',
                    WebkitBackdropFilter: 'blur(2px)',
                    pointerEvents: 'none'
                  }}
                />
              </Box>
              <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <Button
                  size="large"
                  startIcon={<AutoFixHighRounded />}
                  onClick={() => setStage('edit')}
                  sx={{
                    px: 3.25,
                    py: 1.35,
                    fontWeight: 900,
                    textTransform: 'none',
                    borderRadius: 999,
                    background: 'linear-gradient(135deg, #5b2aa8 0%, #7b3fd0 50%, #9a5bef 100%)',
                    color: '#fff',
                    boxShadow: '0 8px 28px rgba(122,63,208,0.45), 0 0 0 8px rgba(122,63,208,0.18)',
                    '&:hover': { background: 'linear-gradient(135deg, #52259a 0%, #6e37bf 50%, #8d50e3 100%)', boxShadow: '0 10px 32px rgba(122,63,208,0.55), 0 0 0 8px rgba(122,63,208,0.22)' },
                  }}
                >
                  Edit This
                </Button>
              </Box>
            </Box>
          )}
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
            // If we came from a caller, return result immediately
            if (location?.state?.returnTo) {
              handleReturnToCaller(src);
            } else {
              setStage('done');
            }
          }}
          onCancel={() => {
            if (location?.state?.returnTo) {
              navigate(-1);
              return;
            }
            const hasUnappliedPrompt = Boolean(promptState.value && promptState.value.trim().length > 0);
            const hasUnsavedEdits = Boolean(chosen && currentSrc && chosen !== currentSrc);
            if (hasUnappliedPrompt || hasUnsavedEdits) { setConfirmCancelOpen(true); } else { setStage('pick'); }
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
              if (location?.state?.returnTo) {
                handleReturnToCaller(currentSrc);
              } else {
                setFinalSrc(currentSrc);
                setStage('done');
              }
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
            if (location?.state?.returnTo) {
              navigate(-1);
            } else {
              setStage('pick');
            }
          }}
        >
          Discard and Exit
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}

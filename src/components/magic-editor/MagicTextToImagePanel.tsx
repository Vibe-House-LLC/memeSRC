import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AutoFixHighRounded,
  BookmarkAddRounded,
  CheckCircleRounded,
  ErrorOutlineRounded,
  Send,
} from '@mui/icons-material';
import { runTextToImageLocally } from '../../utils/comfyTextToImage';
import { saveImageToLibrary } from '../../utils/library/saveImageToLibrary';

type GenerationEntryStatus = 'pending' | 'done' | 'error';

type GenerationEntry = {
  id: number;
  prompt: string;
  status: GenerationEntryStatus;
  imageSrc: string | null;
  error: string | null;
  createdAt: number;
  saving: boolean;
  saved: boolean;
  libraryKey?: string;
};

const MAX_HISTORY_ITEMS = 24;

const getEntryTimeLabel = (timestamp: number): string =>
  new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function MagicTextToImagePanel() {
  const nextIdRef = useRef(1);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [entries, setEntries] = useState<GenerationEntry[]>([]);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const canSend = useMemo(
    () => prompt.trim().length > 0 && !isGenerating,
    [prompt, isGenerating]
  );

  const updateEntry = (entryId: number, patch: Partial<GenerationEntry>) => {
    setEntries((prev) => prev.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)));
  };

  const handleGenerate = async (): Promise<void> => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isGenerating) return;

    setErrorBanner(null);
    const entryId = nextIdRef.current;
    nextIdRef.current += 1;

    setEntries((prev) => {
      const nextEntry: GenerationEntry = {
        id: entryId,
        prompt: trimmedPrompt,
        status: 'pending',
        imageSrc: null,
        error: null,
        createdAt: Date.now(),
        saving: false,
        saved: false,
      };
      const updated = [...prev, nextEntry];
      return updated.length > MAX_HISTORY_ITEMS
        ? updated.slice(updated.length - MAX_HISTORY_ITEMS)
        : updated;
    });

    setPrompt('');
    setIsGenerating(true);
    try {
      const generatedImage = await runTextToImageLocally({ prompt: trimmedPrompt });
      updateEntry(entryId, {
        status: 'done',
        imageSrc: generatedImage,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Image generation failed.';
      updateEntry(entryId, {
        status: 'error',
        error: message,
      });
      setErrorBanner(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToLibrary = async (entryId: number): Promise<void> => {
    const target = entries.find((entry) => entry.id === entryId);
    if (!target?.imageSrc || target.saved || target.saving) return;

    updateEntry(entryId, { saving: true, error: null });
    try {
      const libraryKey = await saveImageToLibrary(target.imageSrc, 'magic-generated-image.png', {
        level: 'private',
        metadata: {
          source: 'magic-text-to-image',
          prompt: target.prompt,
        },
      });
      updateEntry(entryId, {
        saving: false,
        saved: true,
        libraryKey,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save image.';
      updateEntry(entryId, {
        saving: false,
        error: message,
      });
      setErrorBanner(message);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          background:
            'linear-gradient(180deg, rgba(139,92,199,0.12) 0%, rgba(139,92,199,0.03) 45%, rgba(0,0,0,0) 100%)',
        }}
      >
        <Stack spacing={1.25}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoFixHighRounded sx={{ color: 'primary.main' }} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Magic Image Generator
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Type a prompt and generate an image with the local ComfyUI text-to-image workflow.
          </Typography>
          <TextField
            fullWidth
            value={prompt}
            disabled={isGenerating}
            placeholder="Describe the image you want to generate..."
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              if (canSend) {
                void handleGenerate();
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AutoFixHighRounded sx={{ color: isGenerating ? 'action.disabled' : 'primary.main' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {isGenerating ? (
                    <CircularProgress size={20} thickness={5} sx={{ color: 'primary.main' }} />
                  ) : (
                    <IconButton
                      aria-label="Generate image"
                      edge="end"
                      onClick={() => {
                        if (canSend) {
                          void handleGenerate();
                        }
                      }}
                      disabled={!canSend}
                      sx={{
                        bgcolor: canSend ? 'primary.main' : 'transparent',
                        color: canSend ? 'primary.contrastText' : 'action.disabled',
                        '&:hover': { bgcolor: canSend ? 'primary.dark' : 'transparent' },
                      }}
                    >
                      <Send fontSize="small" />
                    </IconButton>
                  )}
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                backgroundColor: 'background.paper',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                '&.Mui-focused': {
                  boxShadow: '0 4px 16px rgba(139,92,199,0.2)',
                },
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'transparent',
              },
              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
                borderWidth: 2,
              },
            }}
          />
        </Stack>
      </Paper>

      {errorBanner && (
        <Alert
          severity="error"
          sx={{ mt: 2 }}
          onClose={() => {
            setErrorBanner(null);
          }}
        >
          {errorBanner}
        </Alert>
      )}

      <Stack spacing={2.5} sx={{ mt: 3 }}>
        {entries.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: 2.5,
              textAlign: 'center',
              borderStyle: 'dashed',
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No generated images yet. Send your first prompt to start a result history.
            </Typography>
          </Paper>
        ) : (
          entries.map((entry) => (
            <Box key={entry.id}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <Box
                  sx={{
                    maxWidth: { xs: '100%', sm: '80%' },
                    px: 2,
                    py: 1.2,
                    borderRadius: '18px 18px 6px 18px',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    boxShadow: '0 6px 20px rgba(139,92,199,0.25)',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'pre-wrap' }}>
                    {entry.prompt}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Paper
                  variant="outlined"
                  sx={{
                    width: { xs: '100%', sm: 'min(640px, 100%)' },
                    borderRadius: 2.5,
                    borderColor: 'divider',
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                  }}
                >
                  {entry.status === 'pending' && (
                    <Box sx={{ p: 2.25, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CircularProgress size={22} thickness={5} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Generating image...
                      </Typography>
                    </Box>
                  )}

                  {entry.status === 'error' && (
                    <Alert
                      severity="error"
                      icon={<ErrorOutlineRounded fontSize="inherit" />}
                      sx={{ borderRadius: 0 }}
                    >
                      {entry.error || 'Image generation failed.'}
                    </Alert>
                  )}

                  {entry.status === 'done' && entry.imageSrc && (
                    <>
                      <Box
                        component="img"
                        src={entry.imageSrc}
                        alt={`Generated result for prompt: ${entry.prompt}`}
                        sx={{
                          width: '100%',
                          maxHeight: { xs: 420, md: 540 },
                          objectFit: 'contain',
                          display: 'block',
                          bgcolor: 'grey.900',
                        }}
                      />
                      <Box
                        sx={{
                          px: 1.5,
                          py: 1.25,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1.25,
                          flexWrap: 'wrap',
                          borderTop: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          Generated at {getEntryTimeLabel(entry.createdAt)}
                        </Typography>
                        <Button
                          variant={entry.saved ? 'outlined' : 'contained'}
                          size="small"
                          onClick={() => {
                            void handleSaveToLibrary(entry.id);
                          }}
                          disabled={entry.saved || entry.saving}
                          startIcon={
                            entry.saving ? (
                              <CircularProgress size={14} thickness={6} color="inherit" />
                            ) : entry.saved ? (
                              <CheckCircleRounded />
                            ) : (
                              <BookmarkAddRounded />
                            )
                          }
                          sx={{ fontWeight: 700, textTransform: 'none' }}
                        >
                          {entry.saved ? 'Saved to Library' : entry.saving ? 'Saving...' : 'Save to Library'}
                        </Button>
                      </Box>
                    </>
                  )}
                </Paper>
              </Box>
            </Box>
          ))
        )}
      </Stack>
    </Box>
  );
}

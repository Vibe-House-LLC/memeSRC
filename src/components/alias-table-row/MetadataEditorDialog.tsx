import { useContext, useEffect, useMemo, useState, type ChangeEvent, type MouseEvent } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Button,
  Popover,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { API, Storage, graphqlOperation } from 'aws-amplify';
import PropTypes from 'prop-types';
import { createV2ContentMetadata, updateV2ContentMetadata } from '../../graphql/mutations';
import { SnackbarContext } from '../../SnackbarContext';
import { Palette as PaletteIcon } from '@mui/icons-material';
import { ChromePicker } from 'react-color';

type MetadataEditorDialogProps = {
  aliasId: string | null;
  open: boolean;
  onClose: () => void;
  onMetadataSaved?: (metadata: MetadataPayload) => void;
};

type MetadataPayload = {
  title: string;
  description: string;
  frameCount: number;
  colorMain: string;
  colorSecondary: string;
  emoji: string;
  fontFamily?: string | null;
};

type ColorField = 'colorMain' | 'colorSecondary';

const defaultMetadata: MetadataPayload = {
  title: '',
  description: '',
  frameCount: 0,
  colorMain: '#000000',
  colorSecondary: '#ffffff',
  emoji: '',
  fontFamily: null,
};

const storageOptions = {
  level: 'public' as const,
  customPrefix: { public: 'protected/' },
};

const MetadataEditorDialog = ({ aliasId, open, onClose, onMetadataSaved }: MetadataEditorDialogProps) => {
  const { setOpen: setSnackbarOpen, setMessage, setSeverity } = useContext(SnackbarContext);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [rawMetadata, setRawMetadata] = useState<Record<string, unknown>>(defaultMetadata);
  const [formValues, setFormValues] = useState({
    title: defaultMetadata.title,
    description: defaultMetadata.description,
    frameCount: '',
    colorMain: defaultMetadata.colorMain,
    colorSecondary: defaultMetadata.colorSecondary,
    emoji: defaultMetadata.emoji,
    fontFamily: defaultMetadata.fontFamily ?? '',
  });
  const [frameCountError, setFrameCountError] = useState<string | null>(null);
  const [countingFrames, setCountingFrames] = useState(false);
  const [countError, setCountError] = useState<string | null>(null);
  const [colorPickerAnchorEl, setColorPickerAnchorEl] = useState<HTMLElement | null>(null);
  const [currentColorField, setCurrentColorField] = useState<ColorField | null>(null);

  const dialogTitle = useMemo(() => {
    if (!aliasId) {
      return 'Edit Metadata';
    }
    return `Edit Metadata • ${aliasId}`;
  }, [aliasId]);

  useEffect(() => {
    if (!open || !aliasId) {
      return;
    }

    let isMounted = true;

    const fetchMetadata = async () => {
      setLoading(true);
      setLoadError(null);
      setCountError(null);
      setFrameCountError(null);
      setColorPickerAnchorEl(null);
      setCurrentColorField(null);
      try {
        const response = await Storage.get(`src/${aliasId}/00_metadata.json`, {
          ...storageOptions,
          download: true,
        });

        const body = (response as { Body?: Blob }).Body;

        if (body && typeof body.text === 'function') {
          const jsonText = await body.text();
          const parsed = JSON.parse(jsonText);
          if (!isMounted) {
            return;
          }
          const frameCountValue =
            typeof parsed.frameCount === 'number'
              ? String(parsed.frameCount)
              : typeof parsed.frameCount === 'string'
              ? parsed.frameCount
              : '';

          setRawMetadata(parsed);
          setFormValues({
            title: typeof parsed.title === 'string' ? parsed.title : defaultMetadata.title,
            description: typeof parsed.description === 'string' ? parsed.description : defaultMetadata.description,
            frameCount: frameCountValue,
            colorMain: typeof parsed.colorMain === 'string' ? parsed.colorMain : defaultMetadata.colorMain,
            colorSecondary: typeof parsed.colorSecondary === 'string' ? parsed.colorSecondary : defaultMetadata.colorSecondary,
            emoji: typeof parsed.emoji === 'string' ? parsed.emoji : defaultMetadata.emoji,
            fontFamily: typeof parsed.fontFamily === 'string' ? parsed.fontFamily : defaultMetadata.fontFamily ?? '',
          });
        } else {
          throw new Error('Unable to read metadata file.');
        }
      } catch (error) {
        console.error('Failed to load metadata file', error);
        if (isMounted) {
          setLoadError('Failed to load metadata file for this alias.');
          setRawMetadata(defaultMetadata);
          setFormValues({
            title: defaultMetadata.title,
            description: defaultMetadata.description,
            frameCount: '',
            colorMain: defaultMetadata.colorMain,
            colorSecondary: defaultMetadata.colorSecondary,
            emoji: defaultMetadata.emoji,
            fontFamily: defaultMetadata.fontFamily ?? '',
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMetadata();

    return () => {
      isMounted = false;
    };
  }, [aliasId, open]);

  useEffect(() => {
    if (!open) {
      setFrameCountError(null);
      setSaveError(null);
      setCountError(null);
      setColorPickerAnchorEl(null);
      setCurrentColorField(null);
    }
  }, [open]);

  const handleInputChange = (field: keyof typeof formValues) => (event: ChangeEvent<HTMLInputElement>) => {
    if (field === 'frameCount') {
      setFrameCountError(null);
    }
    setFormValues((previous) => ({
      ...previous,
      [field]: event.target.value,
    }));
  };

  const listMp4Count = async (alias: string): Promise<number> => {
    const prefix = `src/${alias}`;
    let nextToken: string | undefined;
    let mp4Count = 0;

    do {
      const page: any = await Storage.list(prefix, {
        ...storageOptions,
        pageSize: 1000,
        nextToken,
      });

      const pageItems = (page?.results ?? page ?? []) as any[];
      pageItems.forEach((item) => {
        const key = typeof item?.key === 'string' ? item.key : '';
        if (!key || key.endsWith('/')) {
          return;
        }
        if (key.toLowerCase().endsWith('.mp4')) {
          mp4Count += 1;
        }
      });

      nextToken = (page as { nextToken?: string }).nextToken;
    } while (nextToken);

    return mp4Count;
  };

  const handleCountFrames = async () => {
    if (!aliasId) {
      return;
    }

    setCountingFrames(true);
    setCountError(null);
    setFrameCountError(null);

    try {
      const mp4Count = await listMp4Count(aliasId);
      const totalFrames = mp4Count * 250;
      const roundedFrames = Math.floor(totalFrames / 1000) * 1000;

      setFormValues((previous) => ({
        ...previous,
        frameCount: String(roundedFrames),
      }));

      setMessage(`Counted ${mp4Count} mp4 files; frame count set to ${roundedFrames.toLocaleString()} frames.`);
      setSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to count frames', error);
      setCountError('Failed to count frames for this alias.');
      setMessage('Failed to count frames.');
      setSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setCountingFrames(false);
    }
  };

  const handleColorPickerOpen = (field: ColorField) => (event: MouseEvent<HTMLElement>) => {
    setCurrentColorField(field);
    setColorPickerAnchorEl(event.currentTarget);
  };

  const handleColorPickerClose = () => {
    setColorPickerAnchorEl(null);
    setCurrentColorField(null);
  };

  const handleColorChange = (color: any) => {
    if (!currentColorField) {
      return;
    }

    const nextHex = color?.hex || '#000000';
    setFormValues((previous) => ({
      ...previous,
      [currentColorField]: nextHex,
    }));
  };

  const handleCancel = () => {
    if (saving) {
      return;
    }
    onClose();
  };

  const handleSave = async () => {
    if (!aliasId) {
      return;
    }

    const trimmedFrameCount = formValues.frameCount.trim();
    const parsedFrameCount = trimmedFrameCount === '' ? NaN : Number(trimmedFrameCount);

    if (Number.isNaN(parsedFrameCount) || parsedFrameCount < 0) {
      setFrameCountError('Frame count must be a non-negative number.');
      return;
    }

    const updatedMetadata: Record<string, unknown> = {
      ...rawMetadata,
      title: formValues.title,
      description: formValues.description,
      frameCount: parsedFrameCount,
      colorMain: formValues.colorMain,
      colorSecondary: formValues.colorSecondary,
      emoji: formValues.emoji,
      fontFamily: formValues.fontFamily ? formValues.fontFamily : null,
    };

    setSaving(true);
    setSaveError(null);

    try {
      const payload = JSON.stringify(updatedMetadata, null, 2);
      await Storage.put(`src/${aliasId}/00_metadata.json`, payload, {
        ...storageOptions,
        contentType: 'application/json',
      });

      const updateInput = {
        id: aliasId,
        title: formValues.title,
        description: formValues.description,
        frameCount: parsedFrameCount,
        colorMain: formValues.colorMain,
        colorSecondary: formValues.colorSecondary,
        emoji: formValues.emoji,
        fontFamily: formValues.fontFamily ? formValues.fontFamily : null,
      };

      const runUpdate = async () => {
        await API.graphql(
          graphqlOperation(updateV2ContentMetadata, {
            input: updateInput,
          })
        );
      };

      const runCreate = async () => {
        const status = typeof rawMetadata.status === 'number' ? rawMetadata.status : 0;
        const version = typeof rawMetadata.version === 'number' ? rawMetadata.version : 2;
        await API.graphql(
          graphqlOperation(createV2ContentMetadata, {
            input: {
              ...updateInput,
              status,
              version,
            },
          })
        );
      };

      try {
        await runUpdate();
      } catch (graphQLError) {
        const messages: string[] = [];
        if (graphQLError && typeof graphQLError === 'object' && 'errors' in graphQLError && Array.isArray((graphQLError as { errors?: unknown }).errors)) {
          ((graphQLError as { errors?: Array<{ message?: string }> }).errors || []).forEach((errorItem) => {
            if (errorItem && typeof errorItem.message === 'string') {
              messages.push(errorItem.message);
            }
          });
        }
        if (graphQLError instanceof Error && graphQLError.message) {
          messages.push(graphQLError.message);
        }

        const shouldAttemptCreate = messages.some((message) =>
          message.includes('ConditionalCheckFailedException') || message.toLowerCase().includes('not found') || message.toLowerCase().includes('no item')
        );

        if (shouldAttemptCreate) {
          await runCreate();
        } else {
          throw graphQLError;
        }
      }

      setRawMetadata(updatedMetadata);

      const metadataPayload: MetadataPayload = {
        title: formValues.title,
        description: formValues.description,
        frameCount: parsedFrameCount,
        colorMain: formValues.colorMain,
        colorSecondary: formValues.colorSecondary,
        emoji: formValues.emoji,
        fontFamily: formValues.fontFamily ? formValues.fontFamily : null,
      };

      if (onMetadataSaved) {
        onMetadataSaved(metadataPayload);
      }

      setMessage('Metadata updated successfully.');
      setSeverity('success');
      setSnackbarOpen(true);
      onClose();
    } catch (error) {
      console.error('Failed to update metadata', error);
      setSaveError('Failed to save metadata changes.');
      setMessage('Failed to update metadata.');
      setSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{dialogTitle}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {loadError && (
              <Grid item xs={12}>
                <Alert severity="error">{loadError}</Alert>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                label="Title"
                fullWidth
                value={formValues.title}
                onChange={handleInputChange('title')}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                fullWidth
                multiline
                minRows={3}
                value={formValues.description}
                onChange={handleInputChange('description')}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Frame Count"
                type="number"
                fullWidth
                value={formValues.frameCount}
                onChange={handleInputChange('frameCount')}
                disabled={saving}
                error={Boolean(frameCountError)}
                helperText={frameCountError ?? ''}
              />
              <LoadingButton
                onClick={handleCountFrames}
                loading={countingFrames}
                variant="outlined"
                sx={{ mt: 1 }}
                disabled={saving || loading || countingFrames}
              >
                Count Frames
              </LoadingButton>
              {countError && (
                <Alert sx={{ mt: 1 }} severity="error">{countError}</Alert>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Emoji"
                fullWidth
                value={formValues.emoji}
                onChange={handleInputChange('emoji')}
                disabled={saving}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Main Color"
                fullWidth
                value={formValues.colorMain}
                onChange={handleInputChange('colorMain')}
                disabled={saving}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={handleColorPickerOpen('colorMain')}
                        disabled={saving || loading}
                      >
                        <PaletteIcon sx={{ color: formValues.colorMain || '#000000' }} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Secondary Color"
                fullWidth
                value={formValues.colorSecondary}
                onChange={handleInputChange('colorSecondary')}
                disabled={saving}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={handleColorPickerOpen('colorSecondary')}
                        disabled={saving || loading}
                      >
                        <PaletteIcon sx={{ color: formValues.colorSecondary || '#000000' }} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Font Family"
                fullWidth
                value={formValues.fontFamily}
                onChange={handleInputChange('fontFamily')}
                disabled={saving}
              />
            </Grid>
            {saveError && (
              <Grid item xs={12}>
                <Alert severity="error">{saveError}</Alert>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} disabled={saving}>Cancel</Button>
        <LoadingButton onClick={handleSave} loading={saving} variant="contained" disabled={loading || saving}>
          Save
        </LoadingButton>
      </DialogActions>
      <Popover
        open={Boolean(colorPickerAnchorEl)}
        anchorEl={colorPickerAnchorEl}
        onClose={handleColorPickerClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ p: 1 }}>
          <ChromePicker
            color={currentColorField ? formValues[currentColorField] || '#000000' : '#000000'}
            onChange={handleColorChange}
            disableAlpha
          />
        </Box>
      </Popover>
    </Dialog>
  );
};

MetadataEditorDialog.propTypes = {
  aliasId: PropTypes.string,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onMetadataSaved: PropTypes.func,
};

MetadataEditorDialog.defaultProps = {
  aliasId: null,
  onMetadataSaved: undefined,
};

export default MetadataEditorDialog;

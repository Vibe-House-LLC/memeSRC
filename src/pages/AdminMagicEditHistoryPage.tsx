import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { API, graphqlOperation, Storage } from 'aws-amplify';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Stack,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { getUserDetails, magicEditHistoriesByStatus } from '../graphql/queries';
import { updateMagicEditHistory } from '../graphql/mutations';

type MagicEditHistory = {
  id: string;
  prompt?: string | null;
  imageKey?: string | null;
  imageUrl?: string | null;
  metadata?: string | null;
  status?: string | null;
  createdAt?: string | null;
  owner?: string | null;
  updatedAt?: string | null;
};

type HistoryResponse = {
  magicEditHistoriesByStatus?: {
    items?: MagicEditHistory[];
    nextToken?: string | null;
  } | null;
};

type UserDetails = {
  id?: string;
  username?: string | null;
  email?: string | null;
};

const STATUS_OPTIONS = ['unreviewed', 'approved', 'flagged', 'removed'] as const;
type StatusOption = (typeof STATUS_OPTIONS)[number];
const UPDATE_STATUS_OPTIONS: StatusOption[] = ['unreviewed', 'approved', 'flagged'];
const normalizeStatus = (value?: string | null): StatusOption => {
  if (value === 'approved' || value === 'reviewed') return 'approved';
  if (value === 'flagged') return 'flagged';
  if (value === 'removed') return 'removed';
  return 'unreviewed';
};
const formatModel = (value?: string | null) => {
  if (!value) return 'unknown';
  const lower = value.toLowerCase();
  if (lower === 'openai') return 'OpenAI';
  if (lower === 'gemini') return 'Gemini';
  return value;
};
const getKeyFromUrl = (imageUrl?: string | null) => {
  if (!imageUrl) return null;
  try {
    const parsed = new URL(imageUrl);
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || null;
  } catch {
    const cleaned = imageUrl.split('?')[0];
    const parts = cleaned.split('/').filter(Boolean);
    return parts[parts.length - 1] || null;
  }
};

const PAGE_SIZE = 25;

const parseMetadata = (value?: string | null) => {
  if (!value) return null;
  let current: any = value;
  for (let i = 0; i < 2; i += 1) {
    if (typeof current === 'string') {
      try {
        current = JSON.parse(current);
      } catch {
        break;
      }
    }
  }
  return typeof current === 'object' && current !== null ? current : null;
};

export default function AdminMagicEditHistoryPage() {
  const [status, setStatus] = useState<StatusOption>('unreviewed');
  const [items, setItems] = useState<MagicEditHistory[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MagicEditHistory | null>(null);

  const handleStatusChange = useCallback((id: string, newStatus: StatusOption) => {
    setItems((prev) => {
      if (newStatus !== status) {
        return prev.filter((itm) => itm.id !== id);
      }
      return prev.map((itm) => (itm.id === id ? { ...itm, status: newStatus } : itm));
    });
    setSelected((prev) => {
      if (!prev || prev.id !== id) return prev;
      return { ...prev, status: newStatus };
    });
  }, [status]);

  const resetAndLoad = useCallback(async (selected: StatusOption) => {
    setStatus(selected);
    setItems([]);
    setNextToken(null);
    setError(null);
    setLoading(true);
    try {
      const resp = (await API.graphql(
        graphqlOperation(magicEditHistoriesByStatus, {
          status: selected,
          sortDirection: 'DESC',
          limit: PAGE_SIZE,
        })
      )) as any;
      const data = (resp as any)?.data?.magicEditHistoriesByStatus as HistoryResponse['magicEditHistoriesByStatus'];
      setItems(data?.items || []);
      setNextToken(data?.nextToken || null);
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || err?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextToken || loading) return;
    setLoading(true);
    try {
      const resp = (await API.graphql(
        graphqlOperation(magicEditHistoriesByStatus, {
          status,
          sortDirection: 'DESC',
          limit: PAGE_SIZE,
          nextToken,
        })
      )) as any;
      const data = (resp as any)?.data?.magicEditHistoriesByStatus as HistoryResponse['magicEditHistoriesByStatus'];
      setItems((prev) => [...prev, ...(data?.items || [])]);
      setNextToken(data?.nextToken || null);
    } catch (err: any) {
      setError(err?.errors?.[0]?.message || err?.message || 'Failed to load more');
    } finally {
      setLoading(false);
    }
  }, [nextToken, loading, status]);

  useEffect(() => {
    void resetAndLoad('unreviewed');
  }, [resetAndLoad]);

  const statusChips = useMemo(
    () =>
      STATUS_OPTIONS.map((opt) => (
        <Chip
          key={opt}
          label={opt}
          color={status === opt ? 'primary' : 'default'}
          onClick={() => resetAndLoad(opt)}
          sx={{ textTransform: 'capitalize' }}
        />
      )),
    [resetAndLoad, status]
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: { xs: 'flex-start', sm: 'space-between' },
          gap: { xs: 1.5, sm: 0 },
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Magic Edit History
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review generated images by status. Default shows unreviewed.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
          {statusChips}
        </Stack>
      </Box>
      <Divider sx={{ mb: 3 }} />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Grid container spacing={2}>
        {items.map((item) => {
          const isRemoved = normalizeStatus(item.status) === 'removed';
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
              <Card variant="outlined">
                <CardActionArea onClick={() => setSelected(item)} sx={{ alignItems: 'stretch' }}>
                  <CardContent sx={{ p: 1.3 }}>
                    {isRemoved ? (
                      <Box
                        sx={{
                          mt: 1,
                          width: '100%',
                          aspectRatio: '16 / 9',
                          borderRadius: 1,
                          border: '1px dashed',
                          borderColor: 'divider',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'background.default',
                        }}
                      >
                        <CloseIcon color="disabled" sx={{ fontSize: 48 }} />
                      </Box>
                    ) : (
                      item.imageUrl && (
                        <Box
                          component="img"
                          src={item.imageUrl}
                          alt="Generated"
                          sx={{
                            mt: 1,
                            width: '100%',
                            aspectRatio: '16 / 9',
                            objectFit: 'contain',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider',
                            cursor: 'pointer',
                            backgroundColor: 'background.default',
                          }}
                        />
                      )
                    )}

                    <Typography
                      variant="body1"
                      color="text.primary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        pt: 1,
                      }}
                    >
                      <b>Prompt: </b>{item.prompt || '(No prompt)'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Button variant="contained" onClick={loadMore} disabled={loading || !nextToken}>
          {loading ? <CircularProgress size={18} /> : nextToken ? 'Load more' : 'No more'}
        </Button>
      </Box>
      <HistoryDialog
        item={selected}
        onClose={() => setSelected(null)}
        onStatusChange={handleStatusChange}
      />
    </Container>
  );
}

function HistoryDialog({
  item,
  onClose,
  onStatusChange,
}: {
  item: MagicEditHistory | null;
  onClose: () => void;
  onStatusChange: (id: string, status: StatusOption) => void;
}) {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [statusValue, setStatusValue] = useState<StatusOption>('unreviewed');
  const [savingStatus, setSavingStatus] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; label: string } | null>(null);
  const [submittedImageUrl, setSubmittedImageUrl] = useState<string | null>(null);
  const [loadingSubmittedImage, setLoadingSubmittedImage] = useState(false);
  const [submittedImageError, setSubmittedImageError] = useState<string | null>(null);
  const meta = useMemo(() => parseMetadata(item?.metadata), [item]);
  const effectiveStatus = normalizeStatus(statusValue);
  const showRemovedPlaceholder = effectiveStatus === 'removed';
  const hasSubmittedImage = Boolean(meta?.initialImageKey);

  useEffect(() => {
    let cancelled = false;
    setStatusValue(normalizeStatus(item?.status));
    setFullscreenImage(null);
    if (!item?.owner) {
      setUser(null);
      return;
    }
    const loadUser = async () => {
      setLoadingUser(true);
      try {
        const resp = (await API.graphql(graphqlOperation(getUserDetails, { id: item.owner }))) as any;
        if (!cancelled) {
          setUser(resp?.data?.getUserDetails || null);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    };
    void loadUser();
    return () => {
      cancelled = true;
    };
  }, [item]);

  useEffect(() => {
    let cancelled = false;
    setSubmittedImageUrl(null);
    setSubmittedImageError(null);
    const initialKey = meta?.initialImageKey;
    if (!item || !initialKey || typeof initialKey !== 'string') {
      setLoadingSubmittedImage(false);
      return () => {
        cancelled = true;
      };
    }
    if (initialKey.startsWith('http://') || initialKey.startsWith('https://')) {
      setSubmittedImageUrl(initialKey);
      setLoadingSubmittedImage(false);
      return () => {
        cancelled = true;
      };
    }
    const loadSubmittedImage = async () => {
      setLoadingSubmittedImage(true);
      try {
        const resp = await API.post('publicapi', '/getSignedUrl', {
          queryStringParameters: { path: initialKey },
        });
        if (!cancelled) {
          setSubmittedImageUrl(resp?.url || null);
          setSubmittedImageError(resp?.url ? null : 'Unable to load submitted image.');
        }
      } catch {
        if (!cancelled) {
          setSubmittedImageError('Unable to load submitted image.');
          setSubmittedImageUrl(null);
        }
      } finally {
        if (!cancelled) setLoadingSubmittedImage(false);
      }
    };
    void loadSubmittedImage();
    return () => {
      cancelled = true;
    };
  }, [item, meta?.initialImageKey]);

  const handleStatusUpdate = useCallback(
    async (next: StatusOption) => {
      if (!item) return;
      setStatusValue(next);
      setSavingStatus(true);
      try {
        await API.graphql(
          graphqlOperation(updateMagicEditHistory, {
            input: {
              id: item.id,
              status: next,
            },
          })
        );
        onStatusChange(item.id, next);
      } catch {
        setStatusValue(normalizeStatus(item.status));
      } finally {
        setSavingStatus(false);
      }
    },
    [item, onStatusChange, statusValue]
  );

  const handleRemove = useCallback(async () => {
    if (!item) return;
    const key = getKeyFromUrl(item.imageUrl);
    setRemoving(true);
    try {
      // Only attempt deletion when a specific key is present to avoid wiping broader paths.
      if (key) {
        try {
          await Storage.remove(key);
        } catch {
          // ignore storage errors
        }
      }
      try {
        await API.graphql(
          graphqlOperation(updateMagicEditHistory, {
            input: {
              id: item.id,
              status: 'removed',
            },
          })
        );
        setStatusValue('removed');
        onStatusChange(item.id, 'removed');
      } catch {
        // no-op on failure for now
      }
    } catch {
      // no-op on failure for now
    } finally {
      setRemoving(false);
      setConfirmOpen(false);
    }
  }, [item, onStatusChange]);

  if (!item) return null;

  return (
    <Dialog open={!!item} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Magic Edit Review</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="stretch">
            <Stack spacing={1} sx={{ flex: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Generated image
              </Typography>
              {showRemovedPlaceholder ? (
                <Box
                  sx={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    objectFit: 'contain',
                    borderRadius: 1,
                    border: '1px dashed',
                    borderColor: 'divider',
                    backgroundColor: 'background.default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CloseIcon color="disabled" sx={{ fontSize: 56 }} />
                </Box>
              ) : item.imageUrl ? (
                <Box
                  component="img"
                  src={item.imageUrl}
                  alt="Generated"
                  role="button"
                  tabIndex={0}
                  onClick={() => setFullscreenImage({ url: item.imageUrl || '', label: 'Generated image' })}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setFullscreenImage({ url: item.imageUrl || '', label: 'Generated image' });
                    }
                  }}
                  sx={{
                    width: '100%',
                    aspectRatio: '16 / 9',
                    objectFit: 'contain',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'background.default',
                    cursor: 'pointer',
                  }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Generated image unavailable.
                </Typography>
              )}
            </Stack>
            {hasSubmittedImage && (
              <Stack spacing={1} sx={{ flex: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Submitted image
                </Typography>
                {loadingSubmittedImage ? (
                  <Box
                    sx={{
                      width: '100%',
                      aspectRatio: '16 / 9',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      backgroundColor: 'background.default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CircularProgress size={28} />
                  </Box>
                ) : submittedImageUrl ? (
                  <Box
                    component="img"
                    src={submittedImageUrl}
                    alt="Submitted"
                    role="button"
                    tabIndex={0}
                    onClick={() => setFullscreenImage({ url: submittedImageUrl, label: 'Submitted image' })}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setFullscreenImage({ url: submittedImageUrl, label: 'Submitted image' });
                      }
                    }}
                    sx={{
                      width: '100%',
                      aspectRatio: '16 / 9',
                      objectFit: 'contain',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      backgroundColor: 'background.default',
                      cursor: 'pointer',
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {submittedImageError || 'Submitted image unavailable.'}
                  </Typography>
                )}
              </Stack>
            )}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={`Model: ${formatModel(meta?.model)}`} variant="outlined" />
            <Chip size="small" label={`Status: ${effectiveStatus}`} />
          </Stack>
          {effectiveStatus !== 'removed' && (
            <TextField
              label="Status"
              select
              fullWidth
              value={statusValue}
              onChange={(e) => handleStatusUpdate(e.target.value as StatusOption)}
              disabled={savingStatus}
              helperText="Update review status"
            >
              {UPDATE_STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt} sx={{ textTransform: 'capitalize' }}>
                  {opt}
                </MenuItem>
              ))}
            </TextField>
          )}
          <Typography variant="body2" color="text.secondary">
            Created: {item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}
          </Typography>
          <Typography variant="subtitle1" fontWeight={700}>
            Prompt
          </Typography>
          <Typography variant="body1" color="text.primary">
            {item.prompt || '(No prompt)'}
          </Typography>
          <Divider />
          <Typography variant="subtitle1" fontWeight={700}>
            Owner
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {loadingUser
              ? 'Loading user...'
              : user
                ? `${user.username || '—'} (${user.email || 'no email'})`
                : item.owner || '—'}
          </Typography>
          {item.updatedAt && (
            <Typography variant="body2" color="text.secondary">
              Last Updated: {new Date(item.updatedAt).toLocaleString()}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {!showRemovedPlaceholder && (
          <Button color="error" onClick={() => setConfirmOpen(true)} disabled={removing || savingStatus}>
            Remove
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
      <Dialog open={!!fullscreenImage} onClose={() => setFullscreenImage(null)} fullScreen>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            backgroundColor: 'background.default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
          }}
        >
          <IconButton
            onClick={() => setFullscreenImage(null)}
            aria-label="Close image"
            sx={{ position: 'absolute', top: 16, right: 16 }}
          >
            <CloseIcon />
          </IconButton>
          {fullscreenImage && (
            <Box
              component="img"
              src={fullscreenImage.url}
              alt={fullscreenImage.label}
              sx={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          )}
        </Box>
      </Dialog>
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Remove Image</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            This will permanently delete the image.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={removing}>
            Cancel
          </Button>
          <Button color="error" onClick={handleRemove} disabled={removing}>
            {removing ? 'Removing...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}

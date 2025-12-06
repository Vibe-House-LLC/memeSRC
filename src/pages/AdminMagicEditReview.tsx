import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import Masonry from '@mui/lab/Masonry';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Checkbox,
  Chip,
  Container,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { UserContext } from '../UserContext';

type ReviewStatus = 'pending' | 'approved' | 'needs_changes';

type ViewMode = 'grid' | 'list';

type MagicEditResult = {
  id: string;
  imageUrl: string;
  prompt: string;
  createdAt: string;
  status: ReviewStatus;
  seed: string;
  width?: number;
  height?: number;
  notes?: string;
};

type StatusConfig = {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
};

const STATUS_CONFIG: Record<ReviewStatus, StatusConfig> = {
  pending: { label: 'Pending', color: 'warning' },
  approved: { label: 'Approved', color: 'success' },
  needs_changes: { label: 'Needs changes', color: 'error' },
};

const PROMPTS = [
  'Refine lighting and add subtle rim highlights to the subject.',
  'Tighten the edges and remove stray pixels around the silhouette.',
  'Warm up the color balance and soften the background noise.',
  'Sharpen facial details while keeping skin tones natural.',
  'Enhance shadows for depth; avoid over-saturating the midtones.',
  'Remove watermark artifacts and smooth gradients in the sky.',
  'Nudge the crop to keep key elements centered and readable.',
  'Match contrast with the reference set; avoid crushed blacks.',
];

const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const createMockResult = (index: number): MagicEditResult => {
  const seed = `magic-${Date.now()}-${index}-${Math.random().toString(16).slice(2, 8)}`;
  const width = randomBetween(520, 780);
  const height = randomBetween(640, 1040);

  return {
    id: `${seed}-${index}`,
    imageUrl: `https://picsum.photos/seed/${seed}/${width}/${height}`,
    prompt: PROMPTS[index % PROMPTS.length],
    createdAt: new Date(Date.now() - randomBetween(1, 36) * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    seed,
    width,
    height,
  };
};

const createMockBatch = (count: number): MagicEditResult[] =>
  Array.from({ length: count }, (_, index) => createMockResult(index));

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const truncateSeed = (seed: string): string => {
  if (seed.length <= 8) return seed;
  const start = seed.slice(0, 4);
  const end = seed.slice(-4);
  return `${start}…${end}`;
};

const clampAspectRatio = (item: MagicEditResult): number => {
  const ratio = item.width && item.height ? item.height / item.width : 1.25;
  return Math.min(Math.max(ratio, 0.75), 1.45);
};

const AdminMagicEditReview: React.FC = () => {
  const { user } = useContext(UserContext);
  const isAdmin = Boolean(user?.['cognito:groups']?.includes('admins'));

  const [results, setResults] = useState<MagicEditResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | ReviewStatus>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoadingTimer = () => {
    if (loadingTimer.current) {
      clearTimeout(loadingTimer.current);
      loadingTimer.current = null;
    }
  };

  const primeMockBatch = (count: number, delay = 420) => {
    clearLoadingTimer();
    setIsLoading(true);
    setLoadedIds(new Set());
    loadingTimer.current = setTimeout(() => {
      setResults(createMockBatch(count));
      setIsLoading(false);
      loadingTimer.current = null;
    }, delay);
  };

  useEffect(() => {
    primeMockBatch(28);
    return () => clearLoadingTimer();
  }, []);

  const activeResult = useMemo(
    () => results.find((item) => item.id === activeId) ?? null,
    [activeId, results]
  );

  const filteredResults = useMemo(() => {
    if (filter === 'all') return results;
    return results.filter((item) => item.status === filter);
  }, [filter, results]);

  const statusCounts = useMemo(
    () =>
      results.reduce(
        (accumulator, item) => {
          accumulator[item.status] += 1;
          return accumulator;
        },
        {
          pending: 0,
          approved: 0,
          needs_changes: 0,
        } as Record<ReviewStatus, number>
      ),
    [results]
  );

  const setStatusForIds = (ids: Set<string> | string[], status: ReviewStatus, notes?: string) => {
    const idSet = ids instanceof Set ? ids : new Set(ids);
    const trimmedNotes = notes?.trim() || undefined;

    setResults((prev) =>
      prev.map((item) => (idSet.has(item.id) ? { ...item, status, notes: trimmedNotes } : item))
    );
  };

  const handleApproveSelected = () => {
    if (!selectedIds.size) return;
    setStatusForIds(selectedIds, 'approved');
    setSelectedIds(new Set());
  };

  const handleNeedsChangesSelected = () => {
    if (!selectedIds.size) return;
    setStatusForIds(selectedIds, 'needs_changes', 'Flagged in bulk review.');
    setSelectedIds(new Set());
  };

  const handleReload = () => {
    setSelectedIds(new Set());
    setActiveId(null);
    setNoteDraft('');
    primeMockBatch(30, 520);
  };

  const handleSelectVisible = () => {
    setSelectedIds(new Set(filteredResults.map((item) => item.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleOpenDetails = (id: string) => {
    const result = results.find((item) => item.id === id);
    if (!result) return;
    setActiveId(id);
    setNoteDraft(result.notes || '');
  };

  const handleUpdateFromDialog = (status: ReviewStatus) => {
    if (!activeResult) return;
    setStatusForIds([activeResult.id], status, noteDraft);
    setActiveId(null);
    setNoteDraft('');
    setSelectedIds((prev) => {
      if (!prev.size) return prev;
      const next = new Set(prev);
      next.delete(activeResult.id);
      return next;
    });
  };

  const handleFilterChange = (_event: React.SyntheticEvent, value: 'all' | ReviewStatus | null) => {
    if (!value) return;
    setFilter(value);
    setSelectedIds(new Set());
  };

  const handleViewChange = (_event: React.SyntheticEvent, value: ViewMode | null) => {
    if (!value) return;
    setViewMode(value);
  };

  const markImageLoaded = (id: string) => {
    setLoadedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  if (user === false) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Stack alignItems="center" spacing={2}>
          <RefreshIcon />
          <Typography variant="h6">Loading user…</Typography>
        </Stack>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">You do not have access to this page.</Alert>
      </Container>
    );
  }

  const selectionCount = selectedIds.size;

  const renderEmptyState = () => (
    <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
      <Stack spacing={1.5} alignItems="center">
        <Typography variant="h6">Nothing to show here</Typography>
        <Typography color="text.secondary" align="center">
          Try another filter or reload the mock batch to keep reviewing.
        </Typography>
        <Button variant="contained" startIcon={<RefreshIcon />} onClick={handleReload} disabled={isLoading}>
          Reload demo set
        </Button>
      </Stack>
    </Paper>
  );

  const renderLoadingState = () => {
    if (viewMode === 'list') {
      return (
        <Stack spacing={1.5}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Paper
              key={`loading-list-${index}`}
              variant="outlined"
              sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Skeleton variant="rectangular" width={132} height={132} sx={{ borderRadius: 1.5, flexShrink: 0 }} />
                <Stack spacing={1} flex={1}>
                  <Skeleton width="78%" />
                  <Skeleton width="58%" />
                  <Skeleton variant="rectangular" height={12} width="42%" sx={{ borderRadius: 999 }} />
                  <Skeleton width="92%" />
                  <Skeleton width="64%" />
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      );
    }

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, minmax(0, 1fr))',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))',
          },
          gap: 2,
        }}
      >
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={`loading-grid-${index}`} variant="rectangular" sx={{ pt: '120%', borderRadius: 2 }} />
        ))}
      </Box>
    );
  };

  const renderGridView = () => (
    <Masonry columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} spacing={2}>
      {filteredResults.map((result) => {
        const isSelected = selectedIds.has(result.id);
        const statusBadge = STATUS_CONFIG[result.status];

        return (
          <Card
            key={result.id}
            variant="outlined"
            sx={(theme) => ({
              borderColor: isSelected ? theme.palette.primary.main : theme.palette.divider,
              boxShadow: isSelected ? `0 0 0 1px ${theme.palette.primary.main}` : 'none',
              overflow: 'hidden',
              borderRadius: 2,
            })}
          >
            <Box sx={{ position: 'relative' }}>
              <CardActionArea onClick={() => handleOpenDetails(result.id)} sx={{ alignSelf: 'stretch' }}>
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    pt: `${clampAspectRatio(result) * 100}%`,
                    bgcolor: 'background.paper',
                    overflow: 'hidden',
                  }}
                >
                  <CardMedia
                    component="img"
                    src={result.imageUrl}
                    alt={result.prompt}
                    loading="lazy"
                    onLoad={() => markImageLoaded(result.id)}
                    onError={() => markImageLoaded(result.id)}
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      transition: 'opacity 180ms ease',
                      opacity: loadedIds.has(result.id) ? 1 : 0,
                    }}
                  />
                  {!loadedIds.has(result.id) && (
                    <Skeleton
                      variant="rectangular"
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 0,
                        bgcolor: 'background.default',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </Box>
              </CardActionArea>

              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  bgcolor: 'rgba(0,0,0,0.48)',
                  borderRadius: 1,
                }}
              >
                <Checkbox
                  size="small"
                  checked={isSelected}
                  onClick={(event) => event.stopPropagation()}
                  onChange={() => handleToggleSelect(result.id)}
                  sx={{
                    color: 'common.white',
                    '&.Mui-checked': { color: 'primary.main' },
                  }}
                />
              </Box>

              <Chip
                size="small"
                label={statusBadge.label}
                color={statusBadge.color}
                sx={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  boxShadow: 1,
                  fontWeight: 600,
                }}
              />
            </Box>

            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {result.prompt}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Seed {truncateSeed(result.seed)} · {formatTimestamp(result.createdAt)}
              </Typography>
              {result.notes && (
                <Chip
                  size="small"
                  variant="outlined"
                  color="info"
                  label={result.notes}
                  sx={{ maxWidth: '100%' }}
                />
              )}
            </CardContent>
          </Card>
        );
      })}
    </Masonry>
  );

  const renderListView = () => (
    <Stack spacing={1.5}>
      {filteredResults.map((result) => {
        const isSelected = selectedIds.has(result.id);
        const statusBadge = STATUS_CONFIG[result.status];

        return (
          <Paper
            key={result.id}
            variant="outlined"
            sx={(theme) => ({
              p: { xs: 1.5, sm: 2 },
              borderRadius: 2,
              borderColor: isSelected ? theme.palette.primary.main : theme.palette.divider,
              boxShadow: isSelected ? `0 0 0 1px ${theme.palette.primary.main}` : 'none',
            })}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="stretch">
              <Box
                sx={{
                  position: 'relative',
                  width: { xs: 140, sm: 160 },
                  flexShrink: 0,
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    pt: `${clampAspectRatio(result) * 100}%`,
                  }}
                >
                  <Box
                    component="img"
                    src={result.imageUrl}
                    alt={result.prompt}
                    loading="lazy"
                    onLoad={() => markImageLoaded(result.id)}
                    onError={() => markImageLoaded(result.id)}
                    sx={{
                      position: 'absolute',
                      inset: 8,
                      width: 'calc(100% - 16px)',
                      height: 'calc(100% - 16px)',
                      objectFit: 'contain',
                      borderRadius: 1,
                      boxShadow: 1,
                      transition: 'opacity 180ms ease',
                      opacity: loadedIds.has(result.id) ? 1 : 0,
                      bgcolor: 'background.paper',
                    }}
                  />
                  {!loadedIds.has(result.id) && (
                    <Skeleton
                      variant="rectangular"
                      sx={{
                        position: 'absolute',
                        inset: 8,
                        borderRadius: 1,
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                </Box>

                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    bgcolor: 'rgba(0,0,0,0.48)',
                    borderRadius: 1,
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(result.id)}
                    sx={{
                      color: 'common.white',
                      '&.Mui-checked': { color: 'primary.main' },
                    }}
                  />
                </Box>

                <Chip
                  size="small"
                  label={statusBadge.label}
                  color={statusBadge.color}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    fontWeight: 600,
                  }}
                />
              </Box>

              <Stack spacing={1} flex={1} minWidth={0}>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Prompt
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {result.prompt}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip size="small" label={statusBadge.label} color={statusBadge.color} />
                  <Chip size="small" variant="outlined" label={`Seed ${truncateSeed(result.seed)}`} />
                  <Chip size="small" variant="outlined" label={formatTimestamp(result.createdAt)} />
                  {result.notes && <Chip size="small" variant="outlined" color="info" label={result.notes} />}
                </Stack>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Review to see the full-size render and leave notes.
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button size="small" variant="outlined" onClick={() => handleToggleSelect(result.id)}>
                      {isSelected ? 'Selected' : 'Select'}
                    </Button>
                    <Button size="small" variant="contained" onClick={() => handleOpenDetails(result.id)}>
                      Review
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="h4">Magic edit review (demo)</Typography>
          <Typography color="text.secondary">
            Switch between a masonry grid for fast scanning and a prompt-first list with consistent thumbnails.
            Images come from Picsum for now; actions stay local until the backend API lands.
          </Typography>
        </Stack>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={`Pending ${statusCounts.pending}`} color="warning" />
                <Chip size="small" label={`Approved ${statusCounts.approved}`} color="success" />
                <Chip size="small" label={`Needs changes ${statusCounts.needs_changes}`} color="error" />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Selected ${selectionCount}`}
                  color={selectionCount ? 'info' : 'default'}
                />
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Tooltip title="Approve selected">
                  <span>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<DoneAllIcon />}
                      disabled={!selectionCount || isLoading}
                      onClick={handleApproveSelected}
                    >
                      Approve
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="Mark selected as needs changes">
                  <span>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<ErrorOutlineIcon />}
                      disabled={!selectionCount || isLoading}
                      onClick={handleNeedsChangesSelected}
                    >
                      Needs changes
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="Select everything in the current view">
                  <span>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<SelectAllIcon />}
                      onClick={handleSelectVisible}
                      disabled={!filteredResults.length || isLoading}
                    >
                      Select visible
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="Clear current selection">
                  <span>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<ClearAllIcon />}
                      onClick={handleClearSelection}
                      disabled={!selectionCount}
                    >
                      Clear
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title="Load a fresh mock batch">
                  <span>
                    <Button
                      size="small"
                      variant="text"
                      startIcon={
                        isLoading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />
                      }
                      onClick={handleReload}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Loading' : 'Reload demo set'}
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Stack>

            <Divider />

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
            >
              <Stack spacing={0.75}>
                <Typography variant="subtitle2" color="text.secondary">
                  Filter by status
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={filter}
                  onChange={handleFilterChange}
                  aria-label="Filter by review status"
                >
                  <ToggleButton value="all" aria-label="All items">
                    All
                  </ToggleButton>
                  <ToggleButton value="pending" aria-label="Pending items">
                    Pending
                  </ToggleButton>
                  <ToggleButton value="approved" aria-label="Approved items">
                    Approved
                  </ToggleButton>
                  <ToggleButton value="needs_changes" aria-label="Needs changes items">
                    Needs changes
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>

              <Stack spacing={0.75} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Layout
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={viewMode}
                  onChange={handleViewChange}
                  aria-label="Switch between list and grid layouts"
                >
                  <ToggleButton value="list" aria-label="List view">
                    <ViewListIcon fontSize="small" />
                    List
                  </ToggleButton>
                  <ToggleButton value="grid" aria-label="Grid view">
                    <ViewModuleIcon fontSize="small" />
                    Grid
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>
            </Stack>

            {isLoading && (
              <Stack spacing={0.5}>
                <LinearProgress sx={{ borderRadius: 1 }} />
                <Typography variant="caption" color="text.secondary">
                  Loading mock results…
                </Typography>
              </Stack>
            )}
          </Stack>
        </Paper>

        {isLoading
          ? renderLoadingState()
          : filteredResults.length === 0
              ? renderEmptyState()
              : viewMode === 'list'
                  ? renderListView()
                  : renderGridView()}
      </Stack>

      <Dialog
        open={Boolean(activeResult)}
        onClose={() => setActiveId(null)}
        fullWidth
        maxWidth="md"
        aria-labelledby="magic-edit-dialog-title"
      >
        {activeResult && (
          <>
            <DialogTitle id="magic-edit-dialog-title">Review magic edit</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2}>
                <Box
                  component="img"
                  src={activeResult.imageUrl}
                  alt={activeResult.prompt}
                  loading="lazy"
                  sx={{
                    width: '100%',
                    maxHeight: 520,
                    objectFit: 'contain',
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                  }}
                />

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip
                    label={STATUS_CONFIG[activeResult.status].label}
                    color={STATUS_CONFIG[activeResult.status].color}
                    size="small"
                  />
                  <Chip size="small" variant="outlined" label={`Seed ${truncateSeed(activeResult.seed)}`} />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`Captured ${formatTimestamp(activeResult.createdAt)}`}
                  />
                </Stack>

                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {activeResult.prompt}
                </Typography>

                <TextField
                  label="Notes / issues (demo only)"
                  multiline
                  minRows={2}
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="E.g. trim halo around subject, darken background, rerender text."
                  fullWidth
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setActiveId(null)}>Close</Button>
              <Button color="error" onClick={() => handleUpdateFromDialog('needs_changes')}>
                Needs changes
              </Button>
              <Button variant="contained" onClick={() => handleUpdateFromDialog('approved')}>
                Approve
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default AdminMagicEditReview;


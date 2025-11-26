import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, graphqlOperation } from 'aws-amplify';
import { GraphQLResult } from '@aws-amplify/api-graphql';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { listSearchFilterGroups } from '../graphql/queries';
import { deleteSearchFilterGroup } from '../graphql/mutations';
import { UserContext } from '../UserContext';
import { getShowsWithFavorites } from '../utils/fetchShowsRevised';

type SearchFilterGroupRecord = {
  id: string;
  name: string;
  filters: string;
  createdAt: string;
  updatedAt: string;
  owner?: string | null;
};

type ListSearchFilterGroupsResponse = {
  listSearchFilterGroups?: {
    items?: SearchFilterGroupRecord[] | null;
    nextToken?: string | null;
  } | null;
};

type ParsedFilters = {
  emoji: string;
  itemsCount: number;
  raw: Record<string, unknown> | null;
};

const FILTER_GROUP_PAGE_SIZE = 50;

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const parseFilters = (filters: string): ParsedFilters => {
  try {
    const parsed = JSON.parse(filters);
    const emoji = typeof parsed?.emoji === 'string' ? parsed.emoji : '📁';
    const itemsCount = Array.isArray(parsed?.items) ? parsed.items.length : 0;

    return {
      emoji,
      itemsCount,
      raw: parsed && typeof parsed === 'object' ? parsed : null,
    };
  } catch {
    return {
      emoji: '📁',
      itemsCount: 0,
      raw: null,
    };
  }
};

const formatOwner = (owner?: string | null): string => {
  if (!owner) return '—';
  const [sub, username] = owner.split('::');
  if (sub && username) {
    return `${username} (${sub})`;
  }
  return owner;
};

export default function AdminUserContentReview() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const isAdmin = Boolean(user?.['cognito:groups']?.includes('admins'));

  const [filterGroups, setFilterGroups] = useState<SearchFilterGroupRecord[]>([]);
  const [filterNextToken, setFilterNextToken] = useState<string | null>(null);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<SearchFilterGroupRecord | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [itemsGroup, setItemsGroup] = useState<SearchFilterGroupRecord | null>(null);
  const [showLookup, setShowLookup] = useState<Record<string, { title: string; colorMain?: string; colorSecondary?: string }>>({});
  const [loadingShows, setLoadingShows] = useState(false);
  const [showsError, setShowsError] = useState<string | null>(null);
  const resolvedItems = useMemo(() => {
    if (!itemsGroup) return [];
    const parsed = parseFilters(itemsGroup.filters);
    const rawItems = Array.isArray((parsed.raw as any)?.items) ? (parsed.raw as any).items : [];
    const ids = rawItems.filter((id: unknown) => typeof id === 'string' && id.trim().length > 0) as string[];

    const mapped = ids.map((id) => {
      const meta = showLookup[id];
      return {
        id,
        title: meta?.title || id,
        colorMain: meta?.colorMain,
        colorSecondary: meta?.colorSecondary,
      };
    });

    mapped.sort((a, b) => a.title.localeCompare(b.title));
    return mapped;
  }, [itemsGroup, showLookup]);

  useEffect(() => {
    if (user !== false && !isAdmin) {
      navigate('/404');
    }
  }, [isAdmin, navigate, user]);

  const loadFilterGroups = useCallback(
    async (nextToken?: string | null, append = false) => {
      if (!isAdmin) return;

      setLoadingFilters(true);
      setFilterError(null);

      try {
        const result = (await API.graphql(
          graphqlOperation(listSearchFilterGroups, {
            limit: FILTER_GROUP_PAGE_SIZE,
            nextToken,
          })
        )) as GraphQLResult<ListSearchFilterGroupsResponse>;

        const response = result.data?.listSearchFilterGroups;
        const items = response?.items?.filter(Boolean) ?? [];

        setFilterGroups((prev) => {
          const base = append ? [...prev] : [];
          const seen = new Map(base.map((item) => [item.id, item]));

          items.forEach((item) => {
            if (!item?.id) return;
            const nextItem = item as SearchFilterGroupRecord;
            seen.set(item.id, nextItem);
          });

          return Array.from(seen.values());
        });

        setFilterNextToken(response?.nextToken ?? null);
      } catch (error) {
        console.error('Failed to load search filter groups', error);
        setFilterError('Failed to load search filter groups.');
      } finally {
        setLoadingFilters(false);
      }
    },
    [isAdmin]
  );

  useEffect(() => {
    if (!isAdmin || user === false) return;

    loadFilterGroups();
  }, [isAdmin, loadFilterGroups, user]);

  useEffect(() => {
    if (!isAdmin || user === false) return;

    setLoadingShows(true);
    setShowsError(null);

    getShowsWithFavorites()
      .then((shows) => {
        const lookup: Record<string, { title: string; colorMain?: string; colorSecondary?: string }> = {};

        shows.forEach((show) => {
          if (!show?.id) return;
          lookup[show.id] = {
            title: show.title || 'Untitled',
            colorMain: show.colorMain || undefined,
            colorSecondary: show.colorSecondary || undefined,
          };
        });

        setShowLookup(lookup);
      })
      .catch((error) => {
        console.error('Failed to load show metadata', error);
        setShowsError('Failed to load show metadata for item names.');
      })
      .finally(() => {
        setLoadingShows(false);
      });
  }, [isAdmin, user]);

  const handleDeleteGroup = useCallback(
    async (group: SearchFilterGroupRecord) => {
      if (!window.confirm(`Delete filter group "${group.name}"? This cannot be undone.`)) {
        return;
      }

      setDeletingGroupId(group.id);
      setFilterError(null);

      try {
        await API.graphql(
          graphqlOperation(deleteSearchFilterGroup, {
            input: { id: group.id },
          })
        );

        setFilterGroups((prev) => prev.filter((item) => item.id !== group.id));
      } catch (error) {
        console.error('Failed to delete filter group', error);
        setFilterError('Failed to delete filter group.');
      } finally {
        setDeletingGroupId(null);
      }
    },
    []
  );

  const totalItemsCount = useMemo(
    () =>
      filterGroups.reduce((count, group) => {
        const parsed = parseFilters(group.filters);
        return count + parsed.itemsCount;
      }, 0),
    [filterGroups]
  );

  if (user === false) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography variant="h6">Loading user...</Typography>
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

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Typography variant="h4">User Content Review</Typography>
        <Typography color="text.secondary">Review custom search filter groups created by users.</Typography>
      </Stack>

      <Paper sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Custom filter groups</Typography>
            <Chip label={`${filterGroups.length} groups`} color="info" variant="outlined" />
            <Chip label={`${totalItemsCount} total items`} variant="outlined" />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button onClick={() => loadFilterGroups(undefined, false)} disabled={loadingFilters}>
              Refresh
            </Button>
            {filterNextToken && (
              <Button onClick={() => loadFilterGroups(filterNextToken, true)} disabled={loadingFilters}>
                Load more
              </Button>
            )}
          </Stack>
        </Stack>

        {filterError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {filterError}
          </Alert>
        )}
        {loadingShows && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Loading show metadata for item names...
          </Alert>
        )}
        {showsError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {showsError}
          </Alert>
        )}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filterGroups.map((group) => {
              const parsed = parseFilters(group.filters);
              const backgroundColor = parsed.raw?.colorMain || '#111827';
              const foregroundColor = parsed.raw?.colorSecondary || '#ffffff';

              return (
                <TableRow key={group.id}>
                  <TableCell>
                    <Chip
                      label={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <span>{parsed.emoji}</span>
                          <Typography variant="subtitle2" sx={{ color: foregroundColor }}>
                            {group.name}
                          </Typography>
                        </Stack>
                      }
                      sx={{
                        bgcolor: backgroundColor,
                        color: foregroundColor,
                        borderColor: backgroundColor,
                        '& .MuiChip-label': {
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          color: foregroundColor,
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>{formatOwner(group.owner)}</TableCell>
                  <TableCell>
                    <Chip
                      label={`${parsed.itemsCount} items`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      onClick={() => setItemsGroup(group)}
                      disabled={parsed.itemsCount === 0}
                    />
                  </TableCell>
                  <TableCell>{formatDate(group.createdAt)}</TableCell>
                  <TableCell>{formatDate(group.updatedAt)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="outlined" onClick={() => setSelectedGroup(group)}>
                        View
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleDeleteGroup(group)}
                        disabled={deletingGroupId === group.id}
                        startIcon={deletingGroupId === group.id ? <CircularProgress size={16} /> : undefined}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
            {loadingFilters && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Stack alignItems="center" spacing={1} sx={{ py: 2 }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" color="text.secondary">
                      Loading filter groups...
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
            {!loadingFilters && filterGroups.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">No filter groups found.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog
        open={Boolean(selectedGroup)}
        onClose={() => setSelectedGroup(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Filter group details</DialogTitle>
        <DialogContent dividers>
          {selectedGroup && (
            <Stack spacing={1}>
              <Typography variant="subtitle1">{selectedGroup.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                Owner: {formatOwner(selectedGroup.owner)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Created: {formatDate(selectedGroup.createdAt)} • Updated: {formatDate(selectedGroup.updatedAt)}
              </Typography>
              <Box
                component="pre"
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: 360,
                  overflow: 'auto',
                }}
              >
                {JSON.stringify(parseFilters(selectedGroup.filters).raw ?? selectedGroup.filters, null, 2)}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedGroup(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(itemsGroup)}
        onClose={() => setItemsGroup(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Filter items</DialogTitle>
        <DialogContent dividers>
          {itemsGroup && (
            <Stack spacing={2}>
              <Typography variant="subtitle1">{itemsGroup.name}</Typography>
              {loadingShows && (
                <Stack alignItems="center" spacing={1} sx={{ py: 1 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" color="text.secondary">
                    Loading show names...
                  </Typography>
                </Stack>
              )}
              {!loadingShows && resolvedItems.length === 0 && (
                <Typography color="text.secondary">No items found in this filter group.</Typography>
              )}
              {!loadingShows && resolvedItems.length > 0 && (
                <List dense>
                  {resolvedItems.map((item) => (
                    <ListItem key={item.id} disableGutters sx={{ py: 0.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                        <Chip
                          label={item.title}
                          size="small"
                          sx={{
                            bgcolor: item.colorMain || 'action.hover',
                            color: item.colorSecondary || 'text.primary',
                            '& .MuiChip-label': {
                              color: item.colorSecondary || 'inherit',
                            },
                          }}
                        />
                        <ListItemText
                          primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                          primary={item.id}
                        />
                      </Stack>
                    </ListItem>
                  ))}
                </List>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemsGroup(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

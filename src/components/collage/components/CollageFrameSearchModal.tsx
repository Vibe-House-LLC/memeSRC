import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  CircularProgress,
  Dialog,
  Grid,
  IconButton,
  Skeleton,
  Toolbar,
  Typography,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useSearchFilterGroups } from '../../../hooks/useSearchFilterGroups';
import { UnifiedSearchBar, type UnifiedSearchBarProps } from '../../search/UnifiedSearchBar';

const RESULT_BATCH_SIZE = 24;
const RANDOM_SEARCH_TERMS = ['what', 'wait', 'no way', 'oh no', 'why', 'really', 'fine', 'okay'];

type SearchResultRecord = {
  id: string;
  cid: string;
  season: string;
  episode: string;
  frame: number;
  subtitle: string;
  imageUrl: string;
  scopeId: string;
  searchTerm: string;
};

export type CollageFrameSearchSelection = SearchResultRecord;

type RawSearchResult = {
  cid?: string | number;
  season?: string | number;
  episode?: string | number;
  start_frame?: string | number;
  end_frame?: string | number;
  frame?: string | number;
  subtitle_text?: string;
  subtitle?: string;
  subtitle_index?: string | number;
};

type SearchResponsePayload = {
  results?: RawSearchResult[];
};

type SearchFilterGroup = {
  id?: string;
  filters?: string;
};

type CollageFrameSearchModalProps = {
  open: boolean;
  busy?: boolean;
  initialQuery?: string;
  initialScopeId?: string;
  favoriteSeriesIds?: string[];
  shows?: UnifiedSearchBarProps['shows'];
  savedCids?: UnifiedSearchBarProps['savedCids'];
  onClose: () => void;
  onSelect: (selection: CollageFrameSearchSelection) => Promise<void> | void;
  onSearchContextChange?: (payload: { query: string; scopeId: string }) => void;
};

const stripHtml = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};

const resolveFrameNumber = (item: RawSearchResult): number | null => {
  const start = Number.parseInt(String(item?.start_frame ?? ''), 10);
  const end = Number.parseInt(String(item?.end_frame ?? ''), 10);

  if (Number.isFinite(start) && Number.isFinite(end)) {
    return Math.round(((start + end) / 2) / 10) * 10;
  }

  const direct = Number.parseInt(String(item?.frame ?? ''), 10);
  if (Number.isFinite(direct)) {
    return Math.round(direct / 10) * 10;
  }

  return null;
};

const resolveSeriesToSearch = (
  scopeId: string,
  groups: SearchFilterGroup[],
  hasFavorites: boolean,
  favoriteSeriesIds: string[],
): string => {
  if (!scopeId || scopeId === '_universal') {
    return '_universal';
  }

  if (scopeId === '_favorites') {
    if (!hasFavorites) {
      return '';
    }
    return favoriteSeriesIds.join(',');
  }

  const customFilter = groups.find((group) => group?.id === scopeId);
  if (customFilter) {
    try {
      const parsed = JSON.parse(customFilter?.filters || '{}');
      const items = Array.isArray(parsed?.items) ? parsed.items.filter(Boolean) : [];
      return items.join(',');
    } catch (_) {
      return '';
    }
  }

  return scopeId;
};

const normalizeScopeId = (scopeId?: string): string => {
  if (!scopeId) {
    return '_universal';
  }
  return scopeId;
};

export default function CollageFrameSearchModal({
  open,
  busy = false,
  initialQuery = '',
  initialScopeId = '_universal',
  favoriteSeriesIds = [],
  shows = [],
  savedCids = [],
  onClose,
  onSelect,
  onSearchContextChange,
}: CollageFrameSearchModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [scopeId, setScopeId] = useState(normalizeScopeId(initialScopeId));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<SearchResultRecord[]>([]);
  const [visibleCount, setVisibleCount] = useState(RESULT_BATCH_SIZE);
  const [hasSearched, setHasSearched] = useState(false);
  const [pendingSelectionId, setPendingSelectionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { groups } = useSearchFilterGroups();
  const hasFavorites = favoriteSeriesIds.length > 0;

  const normalizedInitialQuery = useMemo(() => initialQuery.trim(), [initialQuery]);

  const runSearch = useCallback(
    async ({ queryValue, scopeValue }: { queryValue: string; scopeValue: string }) => {
      const normalizedQuery = queryValue.trim();
      const normalizedScopeId = normalizeScopeId(scopeValue);

      if (!normalizedQuery) {
        setHasSearched(false);
        setResults([]);
        setError('');
        setVisibleCount(RESULT_BATCH_SIZE);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError('');
      setHasSearched(true);

      try {
        const branch = process.env.REACT_APP_USER_BRANCH;
        const groupList = Array.isArray(groups) ? (groups as SearchFilterGroup[]) : [];
        const seriesToSearch = resolveSeriesToSearch(
          normalizedScopeId,
          groupList,
          hasFavorites,
          favoriteSeriesIds,
        );

        if (!seriesToSearch) {
          setResults([]);
          setVisibleCount(RESULT_BATCH_SIZE);
          setLoading(false);
          return;
        }

        const response = await fetch(
          `https://v2-${branch}.memesrc.com/search/${seriesToSearch}/${encodeURIComponent(normalizedQuery)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`Search request failed: ${response.status}`);
        }

        const parsed = (await response.json()) as SearchResponsePayload | RawSearchResult[];
        const rawResults = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.results)
            ? parsed.results
            : [];

        const mapped = rawResults
          .map((item: RawSearchResult, index: number) => {
            const frame = resolveFrameNumber(item);
            if (frame === null) {
              return null;
            }

            const cid = String(item?.cid || '').trim();
            const season = String(item?.season ?? '').trim();
            const episode = String(item?.episode ?? '').trim();

            if (!cid || !season || !episode) {
              return null;
            }

            const subtitle = stripHtml(item?.subtitle_text ?? item?.subtitle ?? '');
            const imageUrl = `https://v2-${branch}.memesrc.com/frame/${cid}/${season}/${episode}/${frame}`;
            const resultId = `${cid}-${season}-${episode}-${frame}-${item?.subtitle_index ?? index}`;

            return {
              id: resultId,
              cid,
              season,
              episode,
              frame,
              subtitle,
              imageUrl,
              scopeId: normalizedScopeId,
              searchTerm: normalizedQuery,
            };
          })
          .filter(Boolean) as SearchResultRecord[];

        setResults(mapped);
        setVisibleCount(RESULT_BATCH_SIZE);
        onSearchContextChange?.({ query: normalizedQuery, scopeId: normalizedScopeId });
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        console.error('Failed to search memeSRC frames', err);
        setResults([]);
        setError('Search failed. Please try again.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [favoriteSeriesIds, groups, hasFavorites, onSearchContextChange],
  );

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      setLoading(false);
      setPendingSelectionId(null);
      return;
    }

    const scoped = normalizeScopeId(initialScopeId);
    setQuery(initialQuery);
    setScopeId(scoped);
    setError('');
    setPendingSelectionId(null);

    if (normalizedInitialQuery) {
      runSearch({ queryValue: normalizedInitialQuery, scopeValue: scoped });
    } else {
      setHasSearched(false);
      setResults([]);
      setVisibleCount(RESULT_BATCH_SIZE);
    }
  }, [initialQuery, initialScopeId, normalizedInitialQuery, open, runSearch]);

  useEffect(() => () => {
    abortRef.current?.abort();
  }, []);

  const visibleResults = useMemo(
    () => results.slice(0, visibleCount),
    [results, visibleCount],
  );

  const canLoadMore = visibleCount < results.length;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runSearch({ queryValue: query, scopeValue: scopeId });
  };

  const handleScopeChange = (nextScopeId: string) => {
    setScopeId(nextScopeId);
    if (query.trim()) {
      runSearch({ queryValue: query, scopeValue: nextScopeId });
    }
  };

  const handleClearQuery = () => {
    setQuery('');
    setHasSearched(false);
    setResults([]);
    setError('');
    setVisibleCount(RESULT_BATCH_SIZE);
  };

  const handleClarifySearch: NonNullable<UnifiedSearchBarProps['onClarifySearch']> = ({ stripped }) => {
    const normalized = String(stripped || '').trim();
    setQuery(normalized);
    runSearch({ queryValue: normalized, scopeValue: scopeId });
  };

  const handleRandomSearch = () => {
    const randomTerm = RANDOM_SEARCH_TERMS[Math.floor(Math.random() * RANDOM_SEARCH_TERMS.length)] || 'what';
    setQuery(randomTerm);
    runSearch({ queryValue: randomTerm, scopeValue: scopeId });
  };

  const handleSelect = async (item: SearchResultRecord) => {
    if (busy || loading) {
      return;
    }

    setPendingSelectionId(item.id);
    try {
      await onSelect(item);
    } finally {
      setPendingSelectionId(null);
    }
  };

  return (
    <Dialog
      open={open}
      fullScreen
      onClose={busy ? undefined : onClose}
      PaperProps={{
        sx: {
          background: 'linear-gradient(180deg, #0b0d10 0%, #070708 100%)',
          color: '#f5f7fa',
        },
      }}
    >
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'rgba(10, 12, 14, 0.94)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, sm: 72 } }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Search memeSRC
          </Typography>
          <IconButton edge="end" aria-label="Close" onClick={onClose} disabled={busy} sx={{ color: '#fff' }}>
            <Close />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ px: { xs: 1.25, sm: 2 }, pt: 1.25, pb: 1 }}>
        <UnifiedSearchBar
          value={query}
          onValueChange={setQuery}
          onSubmit={handleSubmit}
          onClear={handleClearQuery}
          onRandom={handleRandomSearch}
          isRandomLoading={loading}
          shows={shows}
          savedCids={savedCids}
          currentValueId={scopeId}
          includeAllFavorites={hasFavorites}
          onSelectSeries={handleScopeChange}
          appearance="dark"
          onClarifySearch={handleClarifySearch}
          placeholder="Search captions, quotes, scenes..."
        />
      </Box>

      <Box
        sx={{
          px: { xs: 1.25, sm: 2 },
          pb: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {loading && (
          <Grid container spacing={1.25}>
            {Array.from({ length: 12 }).map((_, idx) => (
              <Grid item xs={6} sm={4} md={3} key={`search-loading-${idx}`}>
                <Card sx={{ borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  <Skeleton variant="rectangular" sx={{ pt: '56.25%', transform: 'none' }} />
                  <CardContent sx={{ p: 1.25 }}>
                    <Skeleton variant="text" width="90%" />
                    <Skeleton variant="text" width="55%" />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {!loading && error && (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <Typography variant="body1" color="error.light" sx={{ fontWeight: 600 }}>
              {error}
            </Typography>
          </Box>
        )}

        {!loading && !error && hasSearched && results.length === 0 && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              No matches found
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
              Try a different quote or search all shows.
            </Typography>
          </Box>
        )}

        {!loading && !error && !hasSearched && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Pick a frame for this collage slot
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
              Search captions, then tap any result to place it.
            </Typography>
          </Box>
        )}

        {!loading && !error && visibleResults.length > 0 && (
          <>
            <Grid container spacing={1.25}>
              {visibleResults.map((item) => {
                const selectingThis = pendingSelectionId === item.id;
                return (
                  <Grid item xs={6} sm={4} md={3} key={item.id}>
                    <Card
                      sx={{
                        borderRadius: 2,
                        overflow: 'hidden',
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <CardActionArea
                        disabled={busy || Boolean(pendingSelectionId)}
                        onClick={() => handleSelect(item)}
                        sx={{ alignItems: 'stretch' }}
                      >
                        <Box sx={{ position: 'relative' }}>
                          <CardMedia
                            component="img"
                            src={item.imageUrl}
                            alt={`${item.cid} S${item.season}E${item.episode} frame ${item.frame}`}
                            sx={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }}
                          />
                          {selectingThis && (
                            <Box
                              sx={{
                                position: 'absolute',
                                inset: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <CircularProgress size={24} sx={{ color: '#fff' }} />
                            </Box>
                          )}
                        </Box>
                        <CardContent sx={{ p: 1.1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              lineHeight: 1.35,
                              minHeight: 38,
                              maxHeight: 38,
                              overflow: 'hidden',
                              color: 'rgba(255,255,255,0.9)',
                              fontWeight: 500,
                            }}
                          >
                            {item.subtitle || 'Tap to use this frame'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mt: 0.8 }}>
                            {item.cid} • S{item.season}E{item.episode}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {canLoadMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2.25 }}>
                <Button
                  variant="outlined"
                  onClick={() => setVisibleCount((prev) => prev + RESULT_BATCH_SIZE)}
                  sx={{
                    textTransform: 'none',
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    borderRadius: 2,
                    px: 2.25,
                  }}
                >
                  Load more results
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Dialog>
  );
}

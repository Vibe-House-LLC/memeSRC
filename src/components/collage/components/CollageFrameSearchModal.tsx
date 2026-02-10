import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Dialog,
  Grid,
  IconButton,
  Slider,
  Skeleton,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ArrowBack, ArrowBackIos, ArrowForwardIos, Close, HistoryToggleOffRounded } from '@mui/icons-material';
import { Buffer } from 'buffer';
import { Storage } from 'aws-amplify';
import { useSearchFilterGroups } from '../../../hooks/useSearchFilterGroups';
import { UnifiedSearchBar, type UnifiedSearchBarProps } from '../../search/UnifiedSearchBar';

const RESULT_BATCH_SIZE = 24;
const RANDOM_SEARCH_TERMS = ['what', 'wait', 'no way', 'oh no', 'why', 'really', 'fine', 'okay'];
const FINE_TUNE_RADIUS = 5;
const SURROUNDING_FRAME_OFFSETS = [-40, -30, -20, -10, 0, 10, 20, 30, 40];
const MODAL_Z_INDEX_BOOST = 1200;

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

type EpisodeSubtitleRange = {
  startFrame: number;
  endFrame: number;
  subtitle: string;
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

const decodeSubtitleValue = (value: string): string => {
  if (!value) {
    return '';
  }

  try {
    return Buffer.from(value, 'base64').toString('utf8');
  } catch (_) {
    return '';
  }
};

const parseEpisodeSubtitleRanges = (csvText: string): EpisodeSubtitleRange[] => {
  if (!csvText) {
    return [];
  }

  return csvText
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(',');
      if (parts.length < 6) {
        return null;
      }

      const encodedSubtitleText = parts[3] || '';
      const startFrame = Number.parseInt(parts[4] || '', 10);
      const endFrame = Number.parseInt(parts[5] || '', 10);

      if (!Number.isFinite(startFrame) || !Number.isFinite(endFrame)) {
        return null;
      }

      return {
        startFrame,
        endFrame,
        subtitle: stripHtml(decodeSubtitleValue(encodedSubtitleText)),
      };
    })
    .filter(Boolean) as EpisodeSubtitleRange[];
};

const resolveSubtitleForFrame = (ranges: EpisodeSubtitleRange[], frame: number): string => {
  if (!Array.isArray(ranges) || ranges.length === 0 || !Number.isFinite(frame)) {
    return '';
  }

  const directMatch = ranges.find((range) => frame >= range.startFrame && frame <= range.endFrame);
  if (directMatch?.subtitle) {
    return directMatch.subtitle;
  }

  let closest: EpisodeSubtitleRange | null = null;
  let minDistance = Number.POSITIVE_INFINITY;

  ranges.forEach((range) => {
    const distance = frame < range.startFrame
      ? range.startFrame - frame
      : frame > range.endFrame
        ? frame - range.endFrame
        : 0;
    if (distance < minDistance) {
      minDistance = distance;
      closest = range;
    }
  });

  return closest?.subtitle || '';
};

const buildFrameImageUrl = (
  branch: string | undefined,
  cid: string,
  season: string,
  episode: string,
  frame: number,
): string => `https://v2-${branch}.memesrc.com/frame/${cid}/${season}/${episode}/${frame}`;

const frameToTimeCode = (frame: number, frameRate = 10): string => {
  const totalSeconds = Math.max(0, frame) / frameRate;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds - (hours * 3600)) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
};

const clampFrame = (frame: number): number => Math.max(0, Math.round(frame));

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
  const theme = useTheme();
  const isWideRefine = useMediaQuery(theme.breakpoints.up('lg'));
  const [query, setQuery] = useState(initialQuery);
  const [scopeId, setScopeId] = useState(normalizeScopeId(initialScopeId));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<SearchResultRecord[]>([]);
  const [visibleCount, setVisibleCount] = useState(RESULT_BATCH_SIZE);
  const [hasSearched, setHasSearched] = useState(false);
  const [pendingSelectionId, setPendingSelectionId] = useState<string | null>(null);
  const [refineTarget, setRefineTarget] = useState<SearchResultRecord | null>(null);
  const [refineAnchorFrame, setRefineAnchorFrame] = useState<number | null>(null);
  const [refineSliderIndex, setRefineSliderIndex] = useState(FINE_TUNE_RADIUS);
  const [refinePreviewLoaded, setRefinePreviewLoaded] = useState(false);
  const [refineLiveSubtitle, setRefineLiveSubtitle] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const wasOpenRef = useRef(false);
  const subtitleRangesCacheRef = useRef<Record<string, EpisodeSubtitleRange[]>>({});
  const subtitleLookupRequestRef = useRef(0);
  const { groups } = useSearchFilterGroups();
  const hasFavorites = favoriteSeriesIds.length > 0;
  const branch = process.env.REACT_APP_USER_BRANCH;
  const dismissKeyboard = useCallback(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const activeElement = document.activeElement as HTMLElement | null;
    if (activeElement && typeof activeElement.blur === 'function') {
      activeElement.blur();
    }
  }, []);

  const normalizedInitialQuery = useMemo(() => initialQuery.trim(), [initialQuery]);
  const isRefineMode = Boolean(refineTarget && refineAnchorFrame !== null);
  const selectedRefineFrame = useMemo(
    () => (refineAnchorFrame === null ? null : clampFrame(refineAnchorFrame + (refineSliderIndex - FINE_TUNE_RADIUS))),
    [refineAnchorFrame, refineSliderIndex],
  );
  const refinePreviewUrl = useMemo(() => {
    if (!refineTarget || selectedRefineFrame === null) {
      return '';
    }
    return buildFrameImageUrl(branch, refineTarget.cid, refineTarget.season, refineTarget.episode, selectedRefineFrame);
  }, [branch, refineTarget, selectedRefineFrame]);
  const nearbyFrames = useMemo(() => {
    if (refineAnchorFrame === null) {
      return [];
    }
    const unique = new Set<number>();
    SURROUNDING_FRAME_OFFSETS.forEach((offset) => unique.add(clampFrame(refineAnchorFrame + offset)));
    return Array.from(unique);
  }, [refineAnchorFrame]);

  const loadEpisodeSubtitleRanges = useCallback(
    async ({ cid, season, episode }: { cid: string; season: string; episode: string }) => {
      const cacheKey = `${cid}::${season}::${episode}`;
      const cached = subtitleRangesCacheRef.current[cacheKey];
      if (cached) {
        return cached;
      }

      const csvDownload = await Storage.get(`src/${cid}/${season}/${episode}/_docs.csv`, {
        level: 'public',
        download: true,
        customPrefix: { public: 'protected/' },
      });
      const csvText = await csvDownload?.Body?.text?.();
      const parsedRanges = parseEpisodeSubtitleRanges(typeof csvText === 'string' ? csvText : '');
      subtitleRangesCacheRef.current[cacheKey] = parsedRanges;
      return parsedRanges;
    },
    [],
  );

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
    [branch, favoriteSeriesIds, groups, hasFavorites, onSearchContextChange],
  );
  const runSearchRef = useRef(runSearch);

  useEffect(() => {
    runSearchRef.current = runSearch;
  }, [runSearch]);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        dismissKeyboard();
        abortRef.current?.abort();
        setLoading(false);
        setPendingSelectionId(null);
        setRefineTarget(null);
        setRefineAnchorFrame(null);
        setRefineSliderIndex(FINE_TUNE_RADIUS);
        setRefinePreviewLoaded(false);
        setRefineLiveSubtitle('');
      }
      wasOpenRef.current = false;
      return;
    }

    if (wasOpenRef.current) {
      return;
    }
    wasOpenRef.current = true;

    const scoped = normalizeScopeId(initialScopeId);
    setQuery(initialQuery);
    setScopeId(scoped);
    setError('');
    setPendingSelectionId(null);
    setRefineTarget(null);
    setRefineAnchorFrame(null);
    setRefineSliderIndex(FINE_TUNE_RADIUS);
    setRefinePreviewLoaded(false);
    setRefineLiveSubtitle('');

    if (normalizedInitialQuery) {
      runSearchRef.current({ queryValue: normalizedInitialQuery, scopeValue: scoped });
    } else {
      setHasSearched(false);
      setResults([]);
      setVisibleCount(RESULT_BATCH_SIZE);
    }
  }, [dismissKeyboard, initialQuery, initialScopeId, normalizedInitialQuery, open]);

  useEffect(() => {
    if (!isRefineMode || !refineTarget || selectedRefineFrame === null) {
      setRefineLiveSubtitle('');
      return;
    }

    const fallbackSubtitle = stripHtml(refineTarget.subtitle);
    setRefineLiveSubtitle(fallbackSubtitle);

    const requestId = subtitleLookupRequestRef.current + 1;
    subtitleLookupRequestRef.current = requestId;

    loadEpisodeSubtitleRanges({
      cid: refineTarget.cid,
      season: refineTarget.season,
      episode: refineTarget.episode,
    })
      .then((ranges) => {
        if (subtitleLookupRequestRef.current !== requestId) {
          return;
        }

        const resolved = resolveSubtitleForFrame(ranges, selectedRefineFrame);
        setRefineLiveSubtitle(stripHtml(resolved || fallbackSubtitle));
      })
      .catch(() => {
        if (subtitleLookupRequestRef.current !== requestId) {
          return;
        }
        setRefineLiveSubtitle(fallbackSubtitle);
      });
  }, [isRefineMode, loadEpisodeSubtitleRanges, refineTarget, selectedRefineFrame]);

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
    dismissKeyboard();
    runSearch({ queryValue: query, scopeValue: scopeId });
  };

  const handleScopeChange = (nextScopeId: string) => {
    if (!nextScopeId || nextScopeId === 'addNewCid') {
      return;
    }
    setScopeId(nextScopeId);
    dismissKeyboard();
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
    dismissKeyboard();
    runSearch({ queryValue: normalized, scopeValue: scopeId });
  };

  const handleRandomSearch = () => {
    const randomTerm = RANDOM_SEARCH_TERMS[Math.floor(Math.random() * RANDOM_SEARCH_TERMS.length)] || 'what';
    setQuery(randomTerm);
    dismissKeyboard();
    runSearch({ queryValue: randomTerm, scopeValue: scopeId });
  };

  const handleStartRefine = (item: SearchResultRecord) => {
    if (busy || loading || pendingSelectionId) {
      return;
    }

    dismissKeyboard();
    setRefineTarget(item);
    setRefineAnchorFrame(item.frame);
    setRefineSliderIndex(FINE_TUNE_RADIUS);
    setRefinePreviewLoaded(false);
  };

  const handleExitRefine = () => {
    if (pendingSelectionId) {
      return;
    }
    setRefineTarget(null);
    setRefineAnchorFrame(null);
    setRefineSliderIndex(FINE_TUNE_RADIUS);
    setRefinePreviewLoaded(false);
  };

  const handleShiftAnchorFrame = (delta: number) => {
    setRefineAnchorFrame((previous) => {
      const fallback = refineTarget?.frame ?? 0;
      return clampFrame((previous ?? fallback) + delta);
    });
    setRefineSliderIndex(FINE_TUNE_RADIUS);
    setRefinePreviewLoaded(false);
  };

  const handleNearbyFrameSelect = (frame: number) => {
    setRefineAnchorFrame(clampFrame(frame));
    setRefineSliderIndex(FINE_TUNE_RADIUS);
    setRefinePreviewLoaded(false);
  };

  const handleInsertRefinedFrame = async () => {
    if (!refineTarget || selectedRefineFrame === null || busy || loading || pendingSelectionId) {
      return;
    }
    dismissKeyboard();
    const selectionSubtitle = stripHtml(refineLiveSubtitle || refineTarget.subtitle || '');

    const refinedSelection: SearchResultRecord = {
      ...refineTarget,
      id: `${refineTarget.cid}-${refineTarget.season}-${refineTarget.episode}-${selectedRefineFrame}`,
      frame: selectedRefineFrame,
      subtitle: selectionSubtitle,
      imageUrl: buildFrameImageUrl(
        branch,
        refineTarget.cid,
        refineTarget.season,
        refineTarget.episode,
        selectedRefineFrame,
      ),
    };

    setPendingSelectionId(refinedSelection.id);
    try {
      await onSelect(refinedSelection);
    } catch (err) {
      console.error('Failed to insert refined frame into collage', err);
    } finally {
      setPendingSelectionId(null);
    }
  };

  const handleCloseRequest = useCallback(() => {
    dismissKeyboard();
    onClose();
  }, [dismissKeyboard, onClose]);

  return (
    <Dialog
      open={open}
      fullScreen
      keepMounted
      onClose={busy || Boolean(pendingSelectionId) ? undefined : handleCloseRequest}
      sx={{
        zIndex: (muiTheme) => muiTheme.zIndex.modal + MODAL_Z_INDEX_BOOST,
        '& .MuiDialog-container': {
          alignItems: 'stretch',
        },
      }}
      BackdropProps={{
        sx: {
          zIndex: (muiTheme) => muiTheme.zIndex.modal + MODAL_Z_INDEX_BOOST - 1,
          backgroundColor: 'rgba(0, 0, 0, 0.78)',
        },
      }}
      PaperProps={{
        sx: {
          position: 'relative',
          zIndex: (muiTheme) => muiTheme.zIndex.modal + MODAL_Z_INDEX_BOOST,
          margin: 0,
          width: '100%',
          maxWidth: '100%',
          height: '100%',
          maxHeight: '100%',
          background: 'linear-gradient(180deg, #0b0d10 0%, #070708 100%)',
          color: '#f5f7fa',
          overflowX: 'hidden',
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
          {isRefineMode && (
            <IconButton edge="start" aria-label="Back to results" onClick={handleExitRefine} disabled={Boolean(pendingSelectionId)} sx={{ color: '#fff', mr: 1 }}>
              <ArrowBack />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            {isRefineMode ? 'Adjust Frame' : 'Search memeSRC'}
          </Typography>
          <IconButton edge="end" aria-label="Close" onClick={handleCloseRequest} disabled={busy || Boolean(pendingSelectionId)} sx={{ color: '#fff' }}>
            <Close />
          </IconButton>
        </Toolbar>
      </AppBar>

      {!isRefineMode && (
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
      )}

      <Box
        onMouseDown={dismissKeyboard}
        onTouchStart={dismissKeyboard}
        sx={{
          px: { xs: 1.25, sm: 2 },
          pb: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          flex: 1,
        }}
      >
        {isRefineMode && refineTarget && selectedRefineFrame !== null ? (
          <Stack
            spacing={1.75}
            sx={{
              minHeight: 0,
              width: '100%',
              maxWidth: '100%',
            }}
          >
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={`${refineTarget.cid} • S${refineTarget.season}E${refineTarget.episode}`}
                sx={{ bgcolor: 'rgba(255,255,255,0.09)', color: '#fff' }}
              />
              <Chip
                size="small"
                label={frameToTimeCode(selectedRefineFrame)}
                sx={{ bgcolor: 'rgba(255,255,255,0.09)', color: '#fff' }}
              />
            </Stack>

            {refineLiveSubtitle && (
              <Box
                sx={{
                  px: { xs: 1.2, sm: 1.5 },
                  py: { xs: 0.9, sm: 1.1 },
                  borderRadius: 2,
                  border: '1px solid rgba(255,255,255,0.18)',
                  bgcolor: 'rgba(0,0,0,0.5)',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
                }}
              >
                <Typography
                  sx={{
                    color: '#fff',
                    textAlign: 'center',
                    fontWeight: 800,
                    letterSpacing: 0.15,
                    lineHeight: 1.3,
                    fontSize: { xs: '0.95rem', sm: '1.02rem', md: '1.08rem' },
                    textShadow: '0 1px 2px rgba(0,0,0,0.7)',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {refineLiveSubtitle}
                </Typography>
              </Box>
            )}

            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)' }}>
              Use nearby frames, arrows, or fine tuning slider to get the exact image, then insert it.
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  lg: 'minmax(0, 1.3fr) minmax(320px, 1fr)',
                },
                gap: 1.75,
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
              }}
            >
              <Stack spacing={1.25} sx={{ minWidth: 0 }}>
                <Card
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: '#020202',
                      width: '100%',
                      aspectRatio: '16 / 9',
                      minHeight: { xs: 220, sm: 300, md: 360, lg: 420 },
                      maxHeight: isWideRefine ? 'min(70svh, 760px)' : 'none',
                    }}
                  >
                    {!refinePreviewLoaded && (
                      <Skeleton
                        variant="rectangular"
                        sx={{
                          width: '100%',
                          height: '100%',
                          transform: 'none',
                          bgcolor: 'rgba(255,255,255,0.08)',
                        }}
                      />
                    )}
                    <CardMedia
                      component="img"
                      src={refinePreviewUrl}
                      alt={`${refineTarget.cid} S${refineTarget.season}E${refineTarget.episode} frame ${selectedRefineFrame}`}
                      onLoad={() => setRefinePreviewLoaded(true)}
                      onError={() => setRefinePreviewLoaded(true)}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        display: refinePreviewLoaded ? 'block' : 'none',
                      }}
                    />
                    {refineLiveSubtitle && (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          px: { xs: 1, sm: 1.5 },
                          py: { xs: 0.75, sm: 0.9 },
                          bgcolor: 'rgba(0,0,0,0.58)',
                          borderTop: '1px solid rgba(255,255,255,0.12)',
                        }}
                      >
                        <Typography
                          sx={{
                            color: '#fff',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.3,
                            fontWeight: 700,
                            textAlign: 'center',
                            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                            fontSize: { xs: '0.86rem', sm: '0.93rem' },
                          }}
                        >
                          {refineLiveSubtitle}
                        </Typography>
                      </Box>
                    )}
                    <IconButton
                      aria-label="Previous nearby frame"
                      onClick={() => handleShiftAnchorFrame(-10)}
                      disabled={Boolean(pendingSelectionId)}
                      sx={{
                        position: 'absolute',
                        left: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#fff',
                        bgcolor: 'rgba(0,0,0,0.45)',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.62)' },
                      }}
                    >
                      <ArrowBackIos fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label="Next nearby frame"
                      onClick={() => handleShiftAnchorFrame(10)}
                      disabled={Boolean(pendingSelectionId)}
                      sx={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#fff',
                        bgcolor: 'rgba(0,0,0,0.45)',
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.62)' },
                      }}
                    >
                      <ArrowForwardIos fontSize="small" />
                    </IconButton>
                  </Box>
                </Card>

                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: { xs: 0.25, sm: 0.75 }, pt: 0.75 }}>
                  <HistoryToggleOffRounded sx={{ color: 'rgba(255,255,255,0.85)' }} />
                  <Slider
                    size="small"
                    min={0}
                    max={FINE_TUNE_RADIUS * 2}
                    step={1}
                    marks
                    value={refineSliderIndex}
                    aria-label="Fine tune frame timing"
                    onChange={(_, value) => {
                      if (typeof value !== 'number') return;
                      setRefineSliderIndex(value);
                      setRefinePreviewLoaded(false);
                    }}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${((value - FINE_TUNE_RADIUS) / 10).toFixed(1)}s`}
                    sx={{
                      color: '#fff',
                      '& .MuiSlider-track': { bgcolor: '#fff' },
                      '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.45)' },
                      '& .MuiSlider-thumb': { bgcolor: '#2079fe' },
                    }}
                  />
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={handleExitRefine}
                    disabled={Boolean(pendingSelectionId)}
                    sx={{
                      textTransform: 'none',
                      borderColor: 'rgba(255,255,255,0.24)',
                      color: '#fff',
                      fontWeight: 700,
                    }}
                  >
                    Back to Results
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleInsertRefinedFrame}
                    disabled={busy || loading || Boolean(pendingSelectionId)}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    {pendingSelectionId ? <CircularProgress size={18} color="inherit" /> : 'Insert Image'}
                  </Button>
                </Stack>
              </Stack>

              <Stack spacing={1} sx={{ minWidth: 0, minHeight: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Nearby Frames
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(3, minmax(0, 1fr))',
                      sm: 'repeat(4, minmax(0, 1fr))',
                      md: 'repeat(5, minmax(0, 1fr))',
                      lg: 'repeat(3, minmax(0, 1fr))',
                    },
                    gap: 1,
                    overflowY: isWideRefine ? 'auto' : 'visible',
                    maxHeight: isWideRefine ? 'min(70svh, 760px)' : 'none',
                    pr: isWideRefine ? 0.5 : 0,
                    pb: 0.5,
                  }}
                >
                  {nearbyFrames.map((frame) => {
                    const isActive = frame === selectedRefineFrame;
                    const frameUrl = buildFrameImageUrl(
                      branch,
                      refineTarget.cid,
                      refineTarget.season,
                      refineTarget.episode,
                      frame,
                    );
                    return (
                      <Card
                        key={`nearby-${frame}`}
                        sx={{
                          borderRadius: 1.5,
                          overflow: 'hidden',
                          border: isActive ? '2px solid #7db4ff' : '1px solid rgba(255,255,255,0.16)',
                          backgroundColor: 'rgba(255,255,255,0.03)',
                          minWidth: 0,
                        }}
                      >
                        <CardActionArea
                          onClick={() => handleNearbyFrameSelect(frame)}
                          disabled={Boolean(pendingSelectionId)}
                          sx={{ position: 'relative' }}
                        >
                          <CardMedia
                            component="img"
                            src={frameUrl}
                            alt={`Nearby frame ${frame}`}
                            sx={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }}
                          />
                          <Box
                            sx={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              bottom: 0,
                              px: 0.5,
                              py: 0.25,
                              bgcolor: 'rgba(0,0,0,0.58)',
                            }}
                          >
                            <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, fontSize: '0.65rem' }}>
                              {frameToTimeCode(frame)}
                            </Typography>
                          </Box>
                        </CardActionArea>
                      </Card>
                    );
                  })}
                </Box>
              </Stack>
            </Box>
          </Stack>
        ) : (
          <>
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
                  Search captions, then tap any result to refine and insert it.
                </Typography>
              </Box>
            )}

            {!loading && !error && visibleResults.length > 0 && (
              <>
                <Grid container spacing={1.25}>
                  {visibleResults.map((item) => (
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
                          disabled={busy || loading || Boolean(pendingSelectionId)}
                          onClick={() => handleStartRefine(item)}
                          sx={{ alignItems: 'stretch' }}
                        >
                          <Box sx={{ position: 'relative' }}>
                            <CardMedia
                              component="img"
                              src={item.imageUrl}
                              alt={`${item.cid} S${item.season}E${item.episode} frame ${item.frame}`}
                              sx={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover' }}
                            />
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
                              {item.subtitle || 'Tap to refine this frame'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block', mt: 0.8 }}>
                              {item.cid} • S{item.season}E{item.episode}
                            </Typography>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
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
          </>
        )}
      </Box>
    </Dialog>
  );
}

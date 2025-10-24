import { useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { Box, Button, IconButton, Stack, Typography, useMediaQuery } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import useSearchDetails from '../../hooks/useSearchDetails';
import FavoriteToggleButton from '../../components/FavoriteToggleButton';
import { UserContext } from '../../UserContext';
import { normalizeColorValue, isColorNearBlack } from '../../utils/colors';
import { safeGetItem, safeSetItem } from '../../utils/storage';
import {
  fetchLatestRelease,
  formatReleaseDisplay,
  formatRelativeTimeCompact,
  getReleaseType,
  type GitHubRelease,
} from '../../utils/githubReleases';
import { FeedCardSurface } from './cards/CardSurface';
import { Search } from '@mui/icons-material';

const FEED_CARD_WRAPPER_SX = {
  px: { xs: 0, md: 0 },
  mx: { xs: -3, md: 0 },
  pt: { xs: 0, md: 0 },
  pb: { xs: 0, md: 0 },
} as const;

const DEFAULT_BACKGROUND = '#0f172a';
const DEFAULT_FOREGROUND = '#f8fafc';
const RECENT_SERIES_LIMIT = 12;
const CARD_EXIT_DURATION_MS = 360;
const FEED_CLEAR_ALL_KEY_PREFIX = 'memesrcFeedClearAll';
const FEED_CLEAR_SINGLE_KEY_PREFIX = 'memesrcFeedClear';
// Feed primer removed
const FEED_UPDATE_DISMISSED_VERSION_KEY = 'feedUpdateBannerDismissedVersion';
const FEED_RECENCY_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

interface ShowRecord {
  id: string;
  title?: string | null;
  description?: string | null;
  colorMain?: string | null;
  colorSecondary?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  isFavorite?: boolean | null;
  frameCount?: number | null;
  emoji?: string | null;
}

interface FeedSectionProps {
  anchorId?: string;
  onFeedSummaryChange?: (summary: FeedSummary) => void;
}

export type FeedSummaryEntry = {
  kind: 'release' | 'show';
  timestamp: number;
  release?: GitHubRelease;
  show?: ShowRecord;
};

export interface FeedSummary {
  entries: FeedSummaryEntry[];
}

type UserContextValue = {
  shows?: unknown;
  user?: MaybeUser | null | false | undefined;
  setShowFeed?: (value: boolean) => void;
};

interface MaybeUserDetails {
  username?: string | null;
  email?: string | null;
  [key: string]: unknown;
}

interface MaybeUser {
  username?: string | null;
  userDetails?: MaybeUserDetails | null;
  attributes?: Record<string, unknown> | null;
  [key: string]: unknown;
}

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function coerceTimestamp(value?: string | null): number {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveSeriesTimestamp(show: ShowRecord): number {
  return Math.max(coerceTimestamp(show.updatedAt), coerceTimestamp(show.createdAt));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function sanitizeKeySegment(value: string): string {
  return value.replace(/[^0-9a-zA-Z_-]/g, '_');
}

export function resolveUserIdentifier(user?: MaybeUser | null | false): string {
  if (!user || typeof user !== 'object') {
    return 'signedOutGuest';
  }

  const candidates: unknown[] = [
    user.username,
    user.userDetails?.username,
    user.userDetails?.email,
    (user.attributes as Record<string, unknown> | null | undefined)?.preferred_username,
    (user.attributes as Record<string, unknown> | null | undefined)?.email,
  ];

  const match = candidates.find(isNonEmptyString) ?? null;

  if (isNonEmptyString(match)) {
    return sanitizeKeySegment(match.trim());
  }

  return 'signedOutGuest';
}

function buildClearAllKey(identifier: string): string {
  return `${FEED_CLEAR_ALL_KEY_PREFIX}-${sanitizeKeySegment(identifier)}`;
}

function buildShowDismissKey(showId: string, identifier: string): string {
  return `${FEED_CLEAR_SINGLE_KEY_PREFIX}-${sanitizeKeySegment(showId)}-${sanitizeKeySegment(identifier)}`;
}

// buildPrimerDismissKey removed

function parseStoredTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

interface SeriesCardProps {
  show: ShowRecord;
  onDismiss: (show: ShowRecord) => void;
  isRemoving: boolean;
}

// PrimerRenderState removed

function SeriesCard({ show, onDismiss, isRemoving }: SeriesCardProps): ReactElement {
  const [isFavorite, setIsFavorite] = useState(Boolean(show.isFavorite));

  const backgroundColor = normalizeColorValue(show.colorMain) ?? DEFAULT_BACKGROUND;
  const baseForeground = normalizeColorValue(show.colorSecondary) ?? DEFAULT_FOREGROUND;
  const textColor = baseForeground;
  const isBackgroundDark = isColorNearBlack(baseForeground || '#000000');
  const actionFillColor = isBackgroundDark ? '#000000' : '#ffffff';
  const actionTextColor = isBackgroundDark ? '#ffffff' : '#000000';

  const addedOnTimestamp = resolveSeriesTimestamp(show);
  const addedOnDisplay = addedOnTimestamp
    ? DATE_TIME_FORMATTER.format(new Date(addedOnTimestamp))
    : null;
  const addedOnRelativeLabel = (() => {
    if (!addedOnTimestamp) {
      return null;
    }

    const elapsedMs = Date.now() - addedOnTimestamp;
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
      return 'Added: Just Now';
    }

    const hourMs = 60 * 60 * 1000;
    const dayMs = 24 * hourMs;
    const weekMs = 7 * dayMs;
    const monthMs = 30 * dayMs;
    const yearMs = 365 * dayMs;

    const elapsedHours = Math.floor(elapsedMs / hourMs);
    if (elapsedHours < 1) {
      return 'Added: Just Now';
    }

    const elapsedYears = Math.floor(elapsedMs / yearMs);
    if (elapsedYears >= 1) {
      return `Added: ${elapsedYears}y Ago`;
    }

    const elapsedMonths = Math.floor(elapsedMs / monthMs);
    if (elapsedMonths >= 1) {
      return `Added: ${elapsedMonths}mo Ago`;
    }

    const elapsedWeeks = Math.floor(elapsedMs / weekMs);
    if (elapsedWeeks >= 1) {
      return `Added: ${elapsedWeeks}w Ago`;
    }

    const elapsedDays = Math.floor(elapsedMs / dayMs);
    if (elapsedDays >= 1) {
      return `Added: ${elapsedDays}d Ago`;
    }

    return `Added: ${elapsedHours}h Ago`;
  })();

  useEffect(() => {
    setIsFavorite(Boolean(show.isFavorite));
  }, [show.isFavorite]);

  const handleDismiss = useCallback(() => {
    onDismiss(show);
  }, [onDismiss, show]);

  return (
    <FeedCardSurface
      gradient={backgroundColor}
      sx={{
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 32px 64px rgba(9,11,24,0.52)',
        color: textColor,
        opacity: isRemoving ? 0 : 1,
        transform: isRemoving ? 'translateY(-28px)' : 'translateY(0)',
        transition: `opacity ${CARD_EXIT_DURATION_MS}ms ease, transform ${CARD_EXIT_DURATION_MS}ms ease`,
        pointerEvents: isRemoving ? 'none' : 'auto',
      }}
    >

      <Stack spacing={{ xs: 1 }} sx={{ width: '100%' }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          alignContent="center"
        >
          <IconButton
            aria-label={`Dismiss ${show.title || show.id}`}
            size="small"
            sx={{
              color: actionTextColor,
              backgroundColor: alpha(actionFillColor, 0.25),
              border: `1px solid ${alpha(actionFillColor, 0.35)}`,
              backdropFilter: 'blur(12px)',
              '&:hover': {
                backgroundColor: alpha(actionFillColor, 0.25),
                cursor: 'default',
              },
              aspectRatio: '1/1',
            }}
          >
            {show.emoji || '🎬'}
          </IconButton>
          <Typography
            component="h3"
            variant="h3"
            sx={{
              gridColumn: 2,
              justifySelf: 'center',
              textAlign: 'center',
              fontWeight: 800,
              fontSize: { xs: '1.5rem', sm: '1.6rem' },
              lineHeight: { xs: 1.12, md: 1.08 },
              letterSpacing: { xs: -0.22, md: -0.28 },
              pb: 0,
              px: { xs: 0.5, sm: 1 },
            }}
          >
            {show.title || show.id}
          </Typography>
          <IconButton
            aria-label={`Dismiss ${show.title || show.id}`}
            onClick={handleDismiss}
            size="small"
            sx={{
              color: actionTextColor,
              backgroundColor: alpha(actionFillColor, 0.25),
              border: `1px solid ${alpha(actionFillColor, 0.35)}`,
              backdropFilter: 'blur(12px)',
              '&:hover': {
                backgroundColor: alpha(actionFillColor, 0.28),
              },
              aspectRatio: '1/1',
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          spacing={{ xs: 1.6, sm: 2 }}
          sx={{
            gap: { xs: 0.5, sm: 1 },
            pt: 2,
            width: '100%',
            flexWrap: { xs: 'nowrap' }
          }}
        >
          <Button
            component={RouterLink}
            to={`/${show.id}`}
            variant="contained"
            sx={{
              borderRadius: 999,
              px: { xs: 2.4, sm: 3 },
              py: { xs: 1, sm: 1.05 },
              textTransform: 'none',
              fontWeight: 700,
              fontSize: { xs: '1rem', sm: '1.05rem' },
              color: actionTextColor,
              backgroundColor: actionFillColor,
              boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
              '&:hover': {
                backgroundColor: actionFillColor,
                opacity: 0.92,
              },
              flexGrow: { xs: 1 },
              flexShrink: 1,
              minWidth: 0,
            }}
            startIcon={<Search fontSize="small" />}
          >
            Search
          </Button>
          <FavoriteToggleButton
            indexId={show.id}
            initialIsFavorite={isFavorite}
            onToggle={setIsFavorite}
            backgroundColor={actionFillColor}
            textColor={actionTextColor}
            sx={{
              flexGrow: { xs: 1 },
              flexShrink: 1,
              minWidth: 0,
            }}
          />
        </Stack>
        <Typography
          component="p"
          variant="body1"
          sx={{
            color: textColor,
            fontWeight: 500,
            textAlign: 'center',
            pt: 1.5,
            pb: 0,
            mb: 0,
          }}
        >
          Search over {show.frameCount?.toLocaleString()} meme templates from {show.title}
        </Typography>
      </Stack>
    </FeedCardSurface>
  );
}

export default function FeedSection({ anchorId = 'news-feed', onFeedSummaryChange }: FeedSectionProps): ReactElement | null {
  const contextValue = (useContext(UserContext) as unknown as UserContextValue) ?? {};
  const showsInput = Array.isArray(contextValue.shows) ? (contextValue.shows as ShowRecord[]) : [];
  const userIdentifier = useMemo(() => resolveUserIdentifier(contextValue.user), [contextValue.user]);
  const setShowFeed = typeof contextValue.setShowFeed === 'function' ? contextValue.setShowFeed : undefined;
  const { show: activeSeriesId } = useSearchDetails();
  const [dismissalVersion, setDismissalVersion] = useState(0);
  const [clearAllTimestamp, setClearAllTimestamp] = useState<number | null>(null);
  const [renderedShows, setRenderedShows] = useState<ShowRecord[]>([]);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const removingSet = useMemo(() => new Set(removingIds), [removingIds]);
  const [retainedIds, setRetainedIds] = useState<string[]>([]);
  const retainedSet = useMemo(() => new Set(retainedIds), [retainedIds]);
  const [latestRelease, setLatestRelease] = useState<GitHubRelease | null>(null);
  const feedDismissedStorageKey = useMemo(() => `${FEED_UPDATE_DISMISSED_VERSION_KEY}:${userIdentifier}`, [userIdentifier]);
  const [feedDismissedVersion, setFeedDismissedVersion] = useState<string>(() => safeGetItem(feedDismissedStorageKey) || '');
  useEffect(() => {
    const stored = safeGetItem(feedDismissedStorageKey);
    setFeedDismissedVersion(stored || '');
  }, [feedDismissedStorageKey]);
  const [isReleaseRemoving, setIsReleaseRemoving] = useState(false);
  const hasRecentUndismissedUpdate = useMemo(() => {
    if (!latestRelease?.tag_name || !latestRelease?.published_at) {
      return false;
    }
    if (feedDismissedVersion === latestRelease.tag_name) {
      return false;
    }
    const published = new Date(latestRelease.published_at).getTime();
    if (!Number.isFinite(published)) {
      return false;
    }
    const threeDaysMsExtended = 3 * 24 * 60 * 60 * 1000;
    return Date.now() - published <= threeDaysMsExtended;
  }, [latestRelease, feedDismissedVersion]);
  const timeoutsRef = useRef<number[]>([]);
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up('md'));
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const releaseStatusColor = useMemo(() => {
    if (!latestRelease) {
      return theme?.palette?.success?.main ?? '#22c55e';
    }
    const isDraft = Boolean(latestRelease.draft);
    const isPrerelease = Boolean(latestRelease.prerelease);
    const type = getReleaseType(latestRelease.tag_name);
    if (isDraft) return theme?.palette?.error?.main ?? '#ef4444';
    if (isPrerelease) return theme?.palette?.warning?.main ?? '#f59e0b';
    switch (type) {
      case 'major':
        return theme?.palette?.error?.main ?? '#ef4444';
      case 'minor':
        return theme?.palette?.success?.main ?? '#22c55e';
      default:
        return theme?.palette?.info?.main ?? '#3b82f6';
    }
  }, [latestRelease, theme]);
  const releaseLinkStyle = useMemo<CSSProperties>(
    () => ({
      color: '#bfdbfe',
      textDecoration: 'none',
      whiteSpace: isMobile ? 'normal' : 'nowrap',
      fontWeight: 600,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
    }),
    [isMobile]
  );
  const releaseTimestamp = useMemo(() => {
    if (!latestRelease?.published_at) {
      return null;
    }
    const value = new Date(latestRelease.published_at).getTime();
    return Number.isFinite(value) ? value : null;
  }, [latestRelease?.published_at]);
  const shouldShowReleaseCard = Boolean(latestRelease?.tag_name && hasRecentUndismissedUpdate && releaseTimestamp !== null);

  useEffect(() => {
    let didCancel = false;

    const load = async () => {
      try {
        const latest = await fetchLatestRelease();
        if (!didCancel) {
          setLatestRelease(latest);
        }
      } catch (error) {
        // Silent fail
      }
    };

    load();

    return () => {
      didCancel = true;
    };
  }, []);

  useEffect(() => {
    if (!shouldShowReleaseCard && isReleaseRemoving) {
      setIsReleaseRemoving(false);
    }
  }, [isReleaseRemoving, shouldShowReleaseCard]);

  const handleDismissReleaseCard = useCallback(() => {
    if (!latestRelease?.tag_name || isReleaseRemoving) {
      return;
    }

    const tagName = latestRelease.tag_name;
    setIsReleaseRemoving(true);

    const finalizeTimeout = window.setTimeout(() => {
      try {
        safeSetItem(feedDismissedStorageKey, tagName);
      } catch (error) {
        // no-op
      } finally {
        setFeedDismissedVersion(tagName);
        setIsReleaseRemoving(false);
      }
    }, CARD_EXIT_DURATION_MS);

    timeoutsRef.current.push(finalizeTimeout);
  }, [feedDismissedStorageKey, isReleaseRemoving, latestRelease]);

  useEffect(() => {
    const stored = safeGetItem(buildClearAllKey(userIdentifier));
    const parsed = parseStoredTimestamp(stored);
    setClearAllTimestamp(parsed);
    setDismissalVersion((prev) => prev + 1);
  }, [userIdentifier]);

  const eligibleShows = useMemo(() => {
    return [...showsInput]
      .filter((show): show is ShowRecord => Boolean(show && show.id && !show.id.startsWith('_')))
      .filter((show) => show.createdAt > new Date('2025-09-01').toISOString())
      .map((show) => ({ show, timestamp: resolveSeriesTimestamp(show) }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .filter(({ show, timestamp }) => {
        if (activeSeriesId && show.id === activeSeriesId) {
          return false;
        }
        if (clearAllTimestamp && timestamp <= clearAllTimestamp) {
          return false;
        }
        const stored = safeGetItem(buildShowDismissKey(show.id, userIdentifier));
        const dismissedAt = parseStoredTimestamp(stored);
        if (dismissedAt && timestamp <= dismissedAt) {
          return false;
        }
        return true;
      })
      .slice(0, RECENT_SERIES_LIMIT)
      .map(({ show }) => show);
  }, [showsInput, userIdentifier, clearAllTimestamp, dismissalVersion, activeSeriesId]);

  useEffect(() => {
    setRenderedShows((prev) => {
      const prevMap = new Map(prev.map((item) => [item.id, item]));
      const next: ShowRecord[] = [];
      const added = new Set<string>();

      eligibleShows.forEach((show) => {
        if (!show.id || added.has(show.id)) {
          return;
        }
        const previous = prevMap.get(show.id);
        const merged = previous ? { ...previous, ...show } : show;
        next.push(merged);
        added.add(show.id);
      });

      retainedSet.forEach((id) => {
        if (added.has(id)) {
          return;
        }
        const previous = prevMap.get(id);
        const latest = showsInput.find((item) => item.id === id);
        const merged = latest
          ? ({ ...(previous ?? {}), ...latest } as ShowRecord)
          : previous;
        if (merged) {
          next.push(merged);
          added.add(id);
        }
      });

      return next;
    });
  }, [eligibleShows, retainedSet, showsInput]);

  useEffect(() => {
    setShowFeed?.(eligibleShows.length > 0 || shouldShowReleaseCard);
  }, [eligibleShows, shouldShowReleaseCard, setShowFeed]);

  useEffect(
    () => () => {
      timeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      timeoutsRef.current = [];
    },
    []
  );

  const scheduleRemoval = useCallback(
    (show: ShowRecord, delayMs: number, persist: () => void) => {
      if (!show.id) {
        return;
      }

      setRetainedIds((prev) => (prev.includes(show.id) ? prev : [...prev, show.id]));

      const startTimeout = window.setTimeout(() => {
        setRemovingIds((prev) => (prev.includes(show.id) ? prev : [...prev, show.id]));

        const finalizeTimeout = window.setTimeout(() => {
          persist();
          setRenderedShows((prev) => prev.filter((item) => item.id !== show.id));
          setRemovingIds((prev) => prev.filter((id) => id !== show.id));
          setRetainedIds((prev) => prev.filter((id) => id !== show.id));
        }, CARD_EXIT_DURATION_MS);

        timeoutsRef.current.push(finalizeTimeout);
      }, delayMs);

      timeoutsRef.current.push(startTimeout);
    },
    []
  );

  const handleDismissShow = useCallback(
    (show: ShowRecord) => {
      if (!show.id || removingSet.has(show.id)) {
        return;
      }
      scheduleRemoval(show, 0, () => {
        const isoValue = new Date().toISOString();
        safeSetItem(buildShowDismissKey(show.id, userIdentifier), isoValue);
        setDismissalVersion((prev) => prev + 1);
      });
    },
    [scheduleRemoval, removingSet, userIdentifier]
  );

  const handleClearAll = useCallback(() => {
    if (!renderedShows.length) {
      return;
    }

    const timestampIso = new Date().toISOString();
    const parsed = parseStoredTimestamp(timestampIso) ?? Date.now();

    safeSetItem(buildClearAllKey(userIdentifier), timestampIso);
    setClearAllTimestamp(parsed);
    setDismissalVersion((prev) => prev + 1);

    setRetainedIds((prev) => {
      const next = new Set(prev);
      renderedShows.forEach((show) => {
        if (show.id) {
          next.add(show.id);
        }
      });
      return Array.from(next);
    });

    renderedShows.forEach((show) => {
      scheduleRemoval(show, 0, () => {
        setDismissalVersion((prev) => prev + 1);
      });
    });
  }, [renderedShows, scheduleRemoval, userIdentifier]);

  const hasShows = renderedShows.length > 0;
  const hasFeedContent = hasShows || shouldShowReleaseCard;

  // Feed primer logic removed

  const releaseCardElement = shouldShowReleaseCard && latestRelease ? (
    <Box
      key={latestRelease.tag_name ?? latestRelease.id ?? 'latestReleaseCard'}
      sx={{
        ...FEED_CARD_WRAPPER_SX,
        px: { xs: 0, sm: 0 },
        pointerEvents: isReleaseRemoving ? 'none' : 'auto',
        opacity: isReleaseRemoving ? 0 : 1,
        transform: isReleaseRemoving ? 'translateY(-28px)' : 'translateY(0)',
        transition: `transform ${CARD_EXIT_DURATION_MS}ms ease, opacity ${CARD_EXIT_DURATION_MS}ms ease`,
      }}
    >
      <FeedCardSurface
        tone="neutral"
        gradient="rgba(15,23,42,0.92)"
        sx={{
          border: '1px solid rgba(148,163,184,0.25)',
          boxShadow: '0 32px 64px rgba(8,10,20,0.52)',
          backdropFilter: 'blur(18px) saturate(140%)',
          gap: { xs: 1.8, sm: 2 },
        }}
      >
        <Stack spacing={{ xs: 1.6, sm: 2.1 }} sx={{ width: '100%' }}>
          <Stack
            direction={{ xs: 'row', sm: 'row' }}
            spacing={{ xs: 1.1, sm: 1.6 }}
            alignItems={{ xs: 'center', sm: 'center' }}
            justifyContent="space-between"
            sx={{ width: '100%' }}
          >
            <Stack
              direction="row"
              spacing={1.1}
              alignItems="center"
              sx={{
                flexGrow: 1,
                minWidth: 0,
              }}
            >
              <Box
                component="span"
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: releaseStatusColor,
                  boxShadow: `0 0 0 4px ${alpha(releaseStatusColor, 0.2)}`,
                  flexShrink: 0,
                }}
              />
              <Typography
                component="span"
                variant="body2"
                sx={{
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 1.2,
                  color: 'rgba(226,232,240,0.86)',
                }}
              >
                Latest update
              </Typography>
            </Stack>
            <IconButton
              aria-label="Dismiss latest update"
              onClick={handleDismissReleaseCard}
              size="small"
              sx={{
                color: 'rgba(226,232,240,0.78)',
                backgroundColor: 'rgba(148,163,184,0.18)',
                border: '1px solid rgba(148,163,184,0.28)',
                '&:hover': {
                  backgroundColor: 'rgba(148,163,184,0.28)',
                  color: '#f8fafc',
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Stack spacing={{ xs: 0.8, sm: 1 }} sx={{ width: '100%', pb: 1 }}>
            <Typography
              component="p"
              variant="body1"
              sx={{
                color: '#e2e8f0',
                fontWeight: 800,
                fontSize: { xs: '1.4rem', sm: '1.5rem' },
                lineHeight: { xs: 1.56, sm: 1.6 },
                textAlign: 'center',
              }}
            >
              Updated to{' '}
              <Box component={RouterLink} to="/releases" style={releaseLinkStyle}>
                {formatReleaseDisplay(latestRelease.tag_name)}
              </Box>
            </Typography>
          </Stack>
          <Stack
            direction='column'
            spacing={{ xs: 1, sm: 1.4 }}
            alignItems='stretch'
            sx={{ width: '100%' }}
          >
            <Button
              component={RouterLink}
              to="/releases"
              variant="contained"
              sx={{
                borderRadius: 999,
                px: { xs: 2.6, sm: 3 },
                py: { xs: 0.9, sm: 1 },
                textTransform: 'none',
                fontWeight: 700,
                color: isColorNearBlack(releaseStatusColor) ? '#f8fafc' : '#0b1020',
                backgroundColor: releaseStatusColor,
                boxShadow: '0 22px 44px rgba(7,11,23,0.42)',
                '&:hover': {
                  backgroundColor: releaseStatusColor,
                  opacity: 0.94,
                },
              }}
            >
              View release notes
            </Button>
          </Stack>
        </Stack>
      </FeedCardSurface>
    </Box>
  ) : null;

  const feedItems: ReactElement[] = [];
  let releaseInserted = !releaseCardElement || releaseTimestamp === null;

  renderedShows.forEach((show) => {
    if (!releaseInserted && releaseCardElement && releaseTimestamp !== null) {
      const showTimestamp = resolveSeriesTimestamp(show);
      if (releaseTimestamp >= showTimestamp) {
        feedItems.push(releaseCardElement);
        releaseInserted = true;
      }
    }

    feedItems.push(
      <Box
        key={show.id}
        sx={{
          ...FEED_CARD_WRAPPER_SX,
          transition: `transform ${CARD_EXIT_DURATION_MS}ms ease, opacity ${CARD_EXIT_DURATION_MS}ms ease`,
        }}
      >
        <SeriesCard show={show} onDismiss={handleDismissShow} isRemoving={removingSet.has(show.id)} />
      </Box>
    );
  });

  if (!releaseInserted && releaseCardElement) {
    feedItems.push(releaseCardElement);
  }

  const releaseIsRecent = useMemo(() => {
    if (releaseTimestamp === null) {
      return false;
    }
    return Date.now() - releaseTimestamp <= FEED_RECENCY_THRESHOLD_MS;
  }, [releaseTimestamp]);

  const summaryEntries = useMemo<FeedSummaryEntry[]>(() => {
    const now = Date.now();
    const entries: FeedSummaryEntry[] = [];

    if (
      latestRelease &&
      releaseTimestamp !== null &&
      releaseIsRecent &&
      latestRelease.tag_name !== feedDismissedVersion
    ) {
      entries.push({ kind: 'release', timestamp: releaseTimestamp, release: latestRelease });
    }

    renderedShows.forEach((show) => {
      const timestamp = resolveSeriesTimestamp(show);
      if (!timestamp) {
        return;
      }
      if (now - timestamp > FEED_RECENCY_THRESHOLD_MS) {
        return;
      }
      entries.push({ kind: 'show', timestamp, show });
    });

    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }, [feedDismissedVersion, latestRelease, releaseIsRecent, releaseTimestamp, renderedShows]);

  const summarySignature = useMemo(() => {
    if (!summaryEntries.length) {
      return 'empty';
    }
    return summaryEntries
      .map((entry) => {
        if (entry.kind === 'release') {
          return `release:${entry.release?.tag_name ?? 'unknown'}:${entry.timestamp}`;
        }
        if (entry.kind === 'show') {
          return `show:${entry.show?.id ?? 'unknown'}:${entry.timestamp}`;
        }
        return `entry:${entry.timestamp}`;
      })
      .join('|');
  }, [summaryEntries]);

  const previousSummarySignatureRef = useRef<string>('');

  useEffect(() => {
    if (!onFeedSummaryChange) {
      return;
    }
    if (summarySignature === previousSummarySignatureRef.current) {
      return;
    }
    previousSummarySignatureRef.current = summarySignature;
    onFeedSummaryChange({ entries: summaryEntries });
  }, [onFeedSummaryChange, summaryEntries, summarySignature]);

  useEffect(
    () => () => {
      if (onFeedSummaryChange) {
        onFeedSummaryChange({ entries: [] });
      }
      previousSummarySignatureRef.current = '';
    },
    [onFeedSummaryChange]
  );

  if (!hasFeedContent) {
    return null;
  }

  return (

    <Stack id={anchorId} spacing={{ xs: 1.8, md: 2 }} sx={{ width: '100%', color: '#f8fafc', mt: { xs: 1.8, md: 0 } }}>
      {isMd && <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: isMd ? 'flex-start' : 'flex-end', sm: 'center' }}
        spacing={{ xs: 1, sm: 2 }}
        sx={{ px: { xs: 3, sm: 0 } }}
      ><Typography
        component="h2"
        variant="h5"
        sx={{
          fontWeight: 700,
          letterSpacing: -0.18,
          color: '#f8fafc',
          paddingLeft: { xs: 0.5, md: 0 },
        }}
      >
          News Feed
        </Typography>
      </Stack>
      }
      {/* Feed primer removed */}
      {feedItems}
    </Stack>
  );
}

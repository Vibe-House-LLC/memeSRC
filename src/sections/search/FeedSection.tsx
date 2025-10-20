import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Box, Button, IconButton, Stack, Typography, useMediaQuery } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import useSearchDetails from '../../hooks/useSearchDetails';
import FavoriteToggleButton from '../../components/FavoriteToggleButton';
import { UserContext } from '../../UserContext';
import { normalizeColorValue, isColorNearBlack } from '../../utils/colors';
import { safeGetItem, safeSetItem } from '../../utils/storage';
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
const FEED_PRIMER_GRADIENT = 'linear-gradient(135deg, #5461c8 0%, #c724b1 100%)';
const FEED_PRIMER_DISMISS_KEY_PREFIX = 'memesrcFeedPrimerDismiss';
const FEED_PRIMER_VERSION = '20240618';

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

function resolveUserIdentifier(user?: MaybeUser | null | false): string {
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

function buildPrimerDismissKey(identifier: string): string {
  return `${FEED_PRIMER_DISMISS_KEY_PREFIX}-${sanitizeKeySegment(FEED_PRIMER_VERSION)}-${sanitizeKeySegment(identifier)}`;
}

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

type PrimerRenderState = 'hidden' | 'visible' | 'removing';

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

export default function FeedSection(): ReactElement | null {
  const contextValue = (useContext(UserContext) as unknown as UserContextValue) ?? {};
  const showsInput = Array.isArray(contextValue.shows) ? (contextValue.shows as ShowRecord[]) : [];
  const userIdentifier = useMemo(() => resolveUserIdentifier(contextValue.user), [contextValue.user]);
  const primerDismissKey = useMemo(() => buildPrimerDismissKey(userIdentifier), [userIdentifier]);
  const setShowFeed = typeof contextValue.setShowFeed === 'function' ? contextValue.setShowFeed : undefined;
  const { show: activeSeriesId } = useSearchDetails();
  const [primerState, setPrimerState] = useState<PrimerRenderState>(() => {
    const stored = safeGetItem(primerDismissKey);
    return parseStoredTimestamp(stored) ? 'hidden' : 'visible';
  });
  const [dismissalVersion, setDismissalVersion] = useState(0);
  const [clearAllTimestamp, setClearAllTimestamp] = useState<number | null>(null);
  const [renderedShows, setRenderedShows] = useState<ShowRecord[]>([]);
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const removingSet = useMemo(() => new Set(removingIds), [removingIds]);
  const [retainedIds, setRetainedIds] = useState<string[]>([]);
  const retainedSet = useMemo(() => new Set(retainedIds), [retainedIds]);
  const timeoutsRef = useRef<number[]>([]);
  const theme = useTheme();
  const isMd = useMediaQuery(theme.breakpoints.up('md'));

  useEffect(() => {
    const stored = safeGetItem(buildClearAllKey(userIdentifier));
    const parsed = parseStoredTimestamp(stored);
    setClearAllTimestamp(parsed);
    setDismissalVersion((prev) => prev + 1);
  }, [userIdentifier]);

  const eligibleShows = useMemo(() => {
    return [...showsInput]
      .filter((show): show is ShowRecord => Boolean(show && show.id && !show.id.startsWith('_')))
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
    setShowFeed?.(eligibleShows.length > 0);
  }, [eligibleShows, setShowFeed]);

  useEffect(() => () => {
    timeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    timeoutsRef.current = [];
  }, []);

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
  const shouldRenderPrimer = primerState !== 'hidden';
  const isPrimerRemoving = primerState === 'removing';

  useEffect(() => {
    const stored = safeGetItem(primerDismissKey);
    const dismissedAt = parseStoredTimestamp(stored);
    setPrimerState(dismissedAt ? 'hidden' : 'visible');
  }, [primerDismissKey]);

  const handleDismissPrimer = useCallback(() => {
    if (!shouldRenderPrimer || isPrimerRemoving) {
      return;
    }

    setPrimerState('removing');

    const finalizeTimeout = window.setTimeout(() => {
      safeSetItem(primerDismissKey, new Date().toISOString());
      setPrimerState('hidden');
    }, CARD_EXIT_DURATION_MS);

    timeoutsRef.current.push(finalizeTimeout);
  }, [isPrimerRemoving, primerDismissKey, shouldRenderPrimer]);

  if (!hasShows) {
    return null;
  }

  return (

    <Stack spacing={{ xs: 1.8, md: 2 }} sx={{ width: '100%', color: '#f8fafc', mt: { xs: 1.8, md: 0 } }}>
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
      {shouldRenderPrimer ? (
        <Box
          sx={{
            ...FEED_CARD_WRAPPER_SX,
            opacity: isPrimerRemoving ? 0 : 1,
            transform: isPrimerRemoving ? 'translateY(-28px)' : 'translateY(0)',
            transition: `transform ${CARD_EXIT_DURATION_MS}ms ease, opacity ${CARD_EXIT_DURATION_MS}ms ease`,
            pointerEvents: isPrimerRemoving ? 'none' : 'auto',
          }}
        >
          <FeedCardSurface
            tone="neutral"
            gradient={FEED_PRIMER_GRADIENT}
            sx={{
              border: '1px solid rgba(255,255,255,0.28)',
              boxShadow: '0 34px 68px rgba(18,7,36,0.6)',
              gap: { xs: 2.2, sm: 2.3, md: 2.5 },
            }}
          >
            <Stack
              spacing={{ xs: 2.4, sm: 2.3, md: 2.6 }}
              sx={{
                width: '100%',
                maxWidth: { xs: '100%'},
                textAlign: 'left',
                alignItems: 'stretch',
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={{ xs: 1.4, sm: 1.8 }}
                sx={{ width: '100%' }}
              >
                <IconButton
                  aria-label="Feed spotlight"
                  size="small"
                  sx={{
                    flexShrink: 0,
                    color: 'rgba(17,24,39,0.92)',
                    backgroundColor: alpha('#ffffff', 0.9),
                    border: `1px solid ${alpha('#ffffff', 0.92)}`,
                    boxShadow: '0 18px 36px rgba(9,11,24,0.35)',
                    backdropFilter: 'blur(12px)',
                    pointerEvents: 'none',
                    fontSize: '1rem',
                    aspectRatio: '1/1',
                  }}
                >
                  👋
                </IconButton>
                <Typography
                  component="h3"
                  variant="h3"
                  sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    fontWeight: 800,
                    color: '#fff',
                    textShadow: '0 22px 55px rgba(38,7,32,0.7)',
                    fontSize: { xs: '1.5rem', sm: '1.6rem' },
                    lineHeight: { xs: 1.14, md: 1.1 },
                    letterSpacing: { xs: -0.22, md: -0.3 },
                    textAlign: 'center',
                  }}
                >
                  Welcome to the feed
                </Typography>
                <IconButton
                  aria-label="Dismiss feed spotlight"
                  onClick={handleDismissPrimer}
                  size="small"
                  sx={{
                    flexShrink: 0,
                    color: 'rgba(255,255,255,0.92)',
                    backgroundColor: alpha('#ffffff', 0.16),
                    border: `1px solid ${alpha('#ffffff', 0.28)}`,
                    boxShadow: '0 18px 36px rgba(9,11,24,0.35)',
                    backdropFilter: 'blur(12px)',
                    transition: 'background-color 160ms ease, transform 160ms ease',
                    '&:hover': {
                      backgroundColor: alpha('#ffffff', 0.24),
                      transform: 'translateY(-1px)',
                    },
                    aspectRatio: '1/1',
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Typography
                component="p"
                variant="body1"
                sx={{
                  color: 'rgba(255,255,255,0.93)',
                  fontWeight: 600,
                  letterSpacing: { xs: 0.1, md: 0.14 },
                  fontSize: { xs: '1.08rem', sm: '1.16rem', md: '1.24rem' },
                  lineHeight: { xs: 1.6, md: 1.68 },
                  maxWidth: { xs: '100%' },
                  textAlign: 'center',
                  width: '100%',
                }}
              >
                Stay up to date with the latest shows and features from the memeSRC team.
              </Typography>
              {/* <Typography
                component="p"
                variant="body2"
                sx={{
                  color: 'rgba(245,245,255,0.85)',
                  fontWeight: 500,
                  fontSize: { xs: '0.98rem', sm: '1rem' },
                  lineHeight: 1.7,
                  maxWidth: { xs: '100%', sm: 520 },
                }}
              >
                We are iterating quickly—expect this space to evolve as new feed content and experiments roll out.
              </Typography> */}
            </Stack>
          </FeedCardSurface>
        </Box>
      ) : null}
      {renderedShows?.length > 0 && renderedShows.map((show) => (
        <Box
          key={show.id}
          sx={{
            ...FEED_CARD_WRAPPER_SX,
            transition: `transform ${CARD_EXIT_DURATION_MS}ms ease, opacity ${CARD_EXIT_DURATION_MS}ms ease`,
          }}
        >
          <SeriesCard show={show} onDismiss={handleDismissShow} isRemoving={removingSet.has(show.id)} />
        </Box>
      ))}
    </Stack>
  );
}

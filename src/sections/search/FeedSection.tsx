import { useCallback, useContext, useEffect, useMemo, useState, type ReactElement } from 'react';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteToggle from '../../components/FavoriteToggle';
import { UserContext } from '../../UserContext';
import { normalizeColorValue, isColorNearBlack } from '../../utils/colors';
import { safeGetItem, safeSetItem } from '../../utils/storage';
import { FeedCardSurface } from './cards/CardSurface';

const FEED_CARD_WRAPPER_SX = {
  px: { xs: 0, md: 0 },
  mx: { xs: -3, md: 0 },
  pt: { xs: 0, md: 0 },
  pb: { xs: 0, md: 0 },
} as const;

const DEFAULT_BACKGROUND = '#0f172a';
const DEFAULT_FOREGROUND = '#f8fafc';
const RECENT_SERIES_LIMIT = 12;
const FEED_CLEAR_ALL_KEY_PREFIX = 'memesrcFeedClearAll';
const FEED_CLEAR_SINGLE_KEY_PREFIX = 'memesrcFeedClear';

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
}

type UserContextValue = {
  shows?: unknown;
  user?: MaybeUser | null | false | undefined;
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
}

function SeriesCard({ show, onDismiss }: SeriesCardProps): ReactElement {
  const [isFavorite, setIsFavorite] = useState(Boolean(show.isFavorite));

  const backgroundColor = normalizeColorValue(show.colorMain) ?? DEFAULT_BACKGROUND;
  const baseForeground = normalizeColorValue(show.colorSecondary) ?? DEFAULT_FOREGROUND;
  const textColor = isColorNearBlack(baseForeground) ? DEFAULT_FOREGROUND : baseForeground;
  const isBackgroundDark = isColorNearBlack(backgroundColor);
  const actionFillColor = isBackgroundDark ? '#ffffff' : '#000000';
  const actionTextColor = isBackgroundDark ? '#000000' : '#ffffff';

  const addedOnTimestamp = resolveSeriesTimestamp(show);
  const addedOnDisplay = addedOnTimestamp
    ? DATE_TIME_FORMATTER.format(new Date(addedOnTimestamp))
    : null;

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
      }}
    >
      <IconButton
        aria-label={`Dismiss ${show.title || show.id}`}
        onClick={handleDismiss}
        size="small"
        sx={{
          position: 'absolute',
          top: { xs: 18, sm: 22 },
          right: { xs: 18, sm: 22 },
          color: actionFillColor,
          backgroundColor: alpha(actionFillColor, 0.16),
          border: `1px solid ${alpha(actionFillColor, 0.35)}`,
          backdropFilter: 'blur(12px)',
          '&:hover': {
            backgroundColor: alpha(actionFillColor, 0.28),
          },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
      <Stack spacing={{ xs: 2.4, sm: 2.8 }} sx={{ width: '100%' }}>
        <Stack spacing={{ xs: 1.4, sm: 1.6 }}>
          <Typography
            component="h3"
            variant="h3"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.9rem', sm: '2.3rem', md: '2.7rem' },
              lineHeight: { xs: 1.12, md: 1.08 },
              letterSpacing: { xs: -0.22, md: -0.28 },
            }}
          >
            {show.title || show.id}
          </Typography>
          {addedOnDisplay && (
            <Typography
              component="p"
              variant="body2"
              sx={{
                color: alpha(textColor, 0.72),
                fontWeight: 500,
              }}
            >
              Added {addedOnDisplay}
            </Typography>
          )}
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          spacing={{ xs: 1.6, sm: 2 }}
          sx={{
            flexWrap: 'wrap',
            gap: { xs: 1.6, sm: 2 },
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
            }}
          >
            Search
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', color: textColor }}>
            <FavoriteToggle
              indexId={show.id}
              initialIsFavorite={isFavorite}
              onToggle={setIsFavorite}
            />
          </Box>
        </Stack>
      </Stack>
    </FeedCardSurface>
  );
}

export default function FeedSection(): ReactElement | null {
  const contextValue = (useContext(UserContext) as unknown as UserContextValue) ?? {};
  const showsInput = Array.isArray(contextValue.shows) ? (contextValue.shows as ShowRecord[]) : [];
  const userIdentifier = useMemo(() => resolveUserIdentifier(contextValue.user), [contextValue.user]);
  const [clearAllTimestamp, setClearAllTimestamp] = useState<number | null>(null);
  const [dismissalVersion, setDismissalVersion] = useState(0);

  useEffect(() => {
    const stored = safeGetItem(buildClearAllKey(userIdentifier));
    const parsed = parseStoredTimestamp(stored);
    setClearAllTimestamp(parsed);
    setDismissalVersion((prev) => prev + 1);
  }, [userIdentifier]);

  const handleClearAll = useCallback(() => {
    const isoValue = new Date().toISOString();
    safeSetItem(buildClearAllKey(userIdentifier), isoValue);
    const parsed = parseStoredTimestamp(isoValue) ?? Date.now();
    setClearAllTimestamp(parsed);
    setDismissalVersion((prev) => prev + 1);
  }, [userIdentifier]);

  const handleDismissShow = useCallback(
    (show: ShowRecord) => {
      if (!show.id) {
        return;
      }
      const isoValue = new Date().toISOString();
      safeSetItem(buildShowDismissKey(show.id, userIdentifier), isoValue);
      setDismissalVersion((prev) => prev + 1);
    },
    [userIdentifier]
  );

  const orderedShows = useMemo(() => {
    return [...showsInput]
      .filter((show): show is ShowRecord => Boolean(show && show.id && !show.id.startsWith('_')))
      .map((show) => ({ show, timestamp: resolveSeriesTimestamp(show) }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .filter(({ show, timestamp }) => {
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
  }, [showsInput, clearAllTimestamp, userIdentifier, dismissalVersion]);

  if (!orderedShows.length) {
    return null;
  }

  return (
    <Stack spacing={{ xs: 1.8, md: 2 }} sx={{ width: '100%', color: '#f8fafc', mt: { xs: 1.8, md: 0 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={{ xs: 1, sm: 2 }}
        sx={{ px: { xs: 3, sm: 0 } }}
      >
        <Typography
          component="h2"
          variant="h5"
          sx={{
            fontWeight: 700,
            letterSpacing: -0.18,
            color: '#f8fafc',
            paddingLeft: { xs: 0.5, md: 0 },
          }}
        >
          Recently Added
        </Typography>
        <Button
          variant="text"
          size="small"
          onClick={handleClearAll}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            color: alpha('#f8fafc', 0.9),
            '&:hover': {
              color: '#f8fafc',
              backgroundColor: alpha('#f8fafc', 0.08),
            },
          }}
        >
          Clear All
        </Button>
      </Stack>
      {orderedShows.map((show) => (
        <Box key={show.id} sx={FEED_CARD_WRAPPER_SX}>
          <SeriesCard show={show} onDismiss={handleDismissShow} />
        </Box>
      ))}
    </Stack>
  );
}

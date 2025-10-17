import { useContext, useEffect, useMemo, useState, type ReactElement } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import FavoriteToggle from '../../components/FavoriteToggle';
import { UserContext } from '../../UserContext';
import { normalizeColorValue, isColorNearBlack } from '../../utils/colors';
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
  shows?: ShowRecord[];
};

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

interface SeriesCardProps {
  show: ShowRecord;
}

function SeriesCard({ show }: SeriesCardProps): ReactElement {
  const [isFavorite, setIsFavorite] = useState(Boolean(show.isFavorite));

  const backgroundColor = normalizeColorValue(show.colorMain) ?? DEFAULT_BACKGROUND;
  const baseForeground = normalizeColorValue(show.colorSecondary) ?? DEFAULT_FOREGROUND;
  const textColor = isColorNearBlack(baseForeground) ? DEFAULT_FOREGROUND : baseForeground;
  const buttonBackground = isColorNearBlack(baseForeground) ? DEFAULT_FOREGROUND : baseForeground;
  const buttonTextColor = isColorNearBlack(buttonBackground) ? DEFAULT_FOREGROUND : DEFAULT_BACKGROUND;

  const addedOnTimestamp = resolveSeriesTimestamp(show);
  const addedOnDisplay = addedOnTimestamp
    ? DATE_TIME_FORMATTER.format(new Date(addedOnTimestamp))
    : null;

  useEffect(() => {
    setIsFavorite(Boolean(show.isFavorite));
  }, [show.isFavorite]);

  return (
    <FeedCardSurface
      gradient={backgroundColor}
      sx={{
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 32px 64px rgba(9,11,24,0.52)',
        color: textColor,
      }}
    >
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
          {show.description && (
            <Typography
              component="p"
              variant="body1"
              sx={{
                color: alpha(textColor, 0.9),
                fontWeight: 500,
                fontSize: { xs: '1.05rem', sm: '1.12rem' },
                lineHeight: 1.56,
                maxWidth: { xs: '100%', sm: 560 },
              }}
            >
              {show.description}
            </Typography>
          )}
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
              color: buttonTextColor,
              backgroundColor: buttonBackground,
              boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
              '&:hover': {
                backgroundColor: buttonBackground,
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
  const { shows } = (useContext(UserContext) as UserContextValue) ?? {};

  const orderedShows = useMemo(() => {
    if (!Array.isArray(shows)) {
      return [];
    }

    return [...shows]
      .filter((show): show is ShowRecord => Boolean(show && show.id && !show.id.startsWith('_')))
      .sort((a, b) => resolveSeriesTimestamp(b) - resolveSeriesTimestamp(a))
      .slice(0, RECENT_SERIES_LIMIT);
  }, [shows]);

  if (!orderedShows.length) {
    return null;
  }

  return (
    <Stack spacing={{ xs: 1.8, md: 2 }} sx={{ width: '100%', color: '#f8fafc', mt: { xs: 1.8, md: 0 } }}>
      {orderedShows.map((show) => (
        <Box key={show.id} sx={FEED_CARD_WRAPPER_SX}>
          <SeriesCard show={show} />
        </Box>
      ))}
    </Stack>
  );
}

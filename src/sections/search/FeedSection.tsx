import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Link as RouterLink } from 'react-router-dom';
import { fetchLatestRelease, type GitHubRelease } from '../../utils/githubReleases';
import { safeGetItem, safeSetItem } from '../../utils/storage';
import { FeedCardSurface } from './cards/CardSurface';

const FEED_CARD_WRAPPER_SX = {
  px: { xs: 0, md: 0 },
  mx: { xs: -3, md: 0 },
  pt: { xs: 0, md: 0 },
  pb: { xs: 0, md: 0 },
} as const;

const FEED_RELEASE_DISMISS_PREFIX = 'feed-release-dismissed:';
const FEED_UPDATE_RECENCY_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const FEED_PRIMER_GRADIENT = 'linear-gradient(135deg, #5461c8 0%, #c724b1 100%)';

interface FeedCardItem {
  id: string;
  element: ReactElement;
}

interface LatestReleaseCardProps {
  release: GitHubRelease;
  onDismiss: () => void;
}

function buildReleaseDismissKey(tagName?: string | null): string | null {
  if (!tagName) return null;
  return `${FEED_RELEASE_DISMISS_PREFIX}${tagName}`;
}

function isReleaseRecent(publishedAt?: string | null): boolean {
  if (!publishedAt) return false;
  const publishedTime = new Date(publishedAt).getTime();
  if (Number.isNaN(publishedTime)) return false;
  return Date.now() - publishedTime <= FEED_UPDATE_RECENCY_WINDOW_MS;
}

function releaseTagMatchesName(tagName?: string | null, name?: string | null): boolean {
  if (!tagName || !name) return false;
  return tagName.trim().toLowerCase() === name.trim().toLowerCase();
}

function LatestReleaseCard({ release, onDismiss }: LatestReleaseCardProps): ReactElement {
  const releaseTitle = (release.name && release.name.trim()) || release.tag_name || 'Latest update';
  const secondaryHeading =
    release.name && !releaseTagMatchesName(release.tag_name, release.name)
      ? release.name.trim()
      : null;
  const secondaryHeadingDisplay =
    secondaryHeading && !/^what[’']?s changed$/i.test(secondaryHeading.trim()) ? secondaryHeading : null;
  const headline = release.tag_name ? `Updated to ${release.tag_name}` : releaseTitle;

  return (
    <FeedCardSurface
      tone="neutral"
      gradient="linear-gradient(135deg, rgba(23,16,52,0.96) 0%, rgba(91,33,182,0.88) 100%)"
      sx={{
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 30px 66px rgba(10,16,38,0.55)',
      }}
    >
      <Stack spacing={{ xs: 2.4, sm: 2.6 }} sx={{ width: '100%' }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={{ xs: 1.6, sm: 2 }}
        >
          <Stack spacing={{ xs: 1.2, sm: 1.4 }} sx={{ pr: { xs: 0, sm: 1.8 } }}>
            <Typography
              component="h3"
              variant="h3"
              sx={{
                fontWeight: 800,
                color: '#fff',
                textShadow: '0 22px 54px rgba(9,12,28,0.58)',
                fontSize: { xs: '1.9rem', sm: '2.3rem', md: '2.7rem' },
                lineHeight: { xs: 1.15, md: 1.12 },
                letterSpacing: { xs: -0.22, md: -0.3 },
              }}
            >
              {headline}
            </Typography>
            {secondaryHeadingDisplay && (
              <Typography
                variant="subtitle1"
                sx={{
                  color: 'rgba(230,235,255,0.88)',
                  fontWeight: 600,
                  fontSize: { xs: '1.05rem', sm: '1.12rem' },
                  lineHeight: { xs: 1.4, md: 1.45 },
                }}
              >
                {secondaryHeadingDisplay}
              </Typography>
            )}
          </Stack>
          <IconButton
            aria-label="Dismiss latest update card"
            onClick={onDismiss}
            size="medium"
            sx={{
              backgroundColor: 'rgba(15,18,44,0.35)',
              color: 'rgba(236,240,255,0.88)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 12px 24px rgba(7,10,28,0.4)',
              '&:hover': {
                backgroundColor: 'rgba(17,20,48,0.48)',
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Stack
          spacing={{ xs: 1.2, sm: 1.6 }}
          sx={{
            mt: { xs: 1.4, sm: 1.6 },
            alignItems: { xs: 'stretch', sm: 'flex-start' },
          }}
        >
          <Button
            component={RouterLink}
            to="/releases"
            variant="contained"
            color="inherit"
            sx={{
              borderRadius: 999,
              px: { xs: 2.6, sm: 3.4 },
              py: { xs: 1.05, sm: 1.08 },
              textTransform: 'none',
              fontWeight: 700,
              fontSize: { xs: '0.98rem', sm: '1rem' },
              color: '#17092f',
              backgroundColor: 'rgba(255,255,255,0.94)',
              boxShadow: '0 20px 42px rgba(7,12,32,0.48)',
              '&:hover': {
                backgroundColor: '#fff',
              },
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            Learn more
          </Button>
        </Stack>
      </Stack>
    </FeedCardSurface>
  );
}

function FeedPrimerCard(): ReactElement {
  return (
    <FeedCardSurface
      tone="neutral"
      gradient={FEED_PRIMER_GRADIENT}
      sx={{
        border: '1px solid rgba(255,255,255,0.28)',
        boxShadow: '0 34px 68px rgba(18,7,36,0.6)',
        px: { xs: 3.6, sm: 4.1, md: 5, lg: 5.8 },
        py: { xs: 5.4, sm: 5.4, md: 5.9, lg: 6.4 },
        gap: { xs: 2.2, sm: 2.3, md: 2.5 },
      }}
    >
      <Stack
        spacing={{ xs: 2.4, sm: 2.3, md: 2.6 }}
        sx={{
          width: '100%',
          maxWidth: { xs: '100%', sm: 560, md: 660 },
          textAlign: 'left',
          alignItems: 'stretch',
        }}
      >
        <Typography
          component="h3"
          variant="h3"
          sx={{
            fontWeight: 800,
            color: '#fff',
            textShadow: '0 22px 55px rgba(38,7,32,0.7)',
            fontSize: { xs: '1.8rem', sm: '2.4rem', md: '3.12rem', lg: '3.32rem' },
            lineHeight: { xs: 1.14, md: 1.1 },
            letterSpacing: { xs: -0.22, md: -0.3 },
            textAlign: 'left',
            width: '100%',
          }}
        >
          Welcome to the feed 👋
        </Typography>
        <Typography
          component="p"
          variant="body1"
          sx={{
            color: 'rgba(255,255,255,0.93)',
            fontWeight: 600,
            letterSpacing: { xs: 0.1, md: 0.14 },
            fontSize: { xs: '1.08rem', sm: '1.16rem', md: '1.24rem' },
            lineHeight: { xs: 1.6, md: 1.68 },
            maxWidth: { xs: '100%', sm: 540 },
            textAlign: 'left',
            width: '100%',
          }}
        >
          Stay tuned for release highlights, feature announcements, and curated drops from the memeSRC team.
        </Typography>
        <Typography
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
        </Typography>
      </Stack>
    </FeedCardSurface>
  );
}

function FeedCardsArea({ cards }: { cards: FeedCardItem[] }): ReactElement | null {
  if (!cards.length) {
    return null;
  }

  return (
    <Stack spacing={{ xs: 1.8, md: 2 }} sx={{ width: '100%' }}>
      {cards.map((card) => (
        <Box key={card.id} sx={FEED_CARD_WRAPPER_SX}>
          {card.element}
        </Box>
      ))}
    </Stack>
  );
}

export default function FeedSection(): ReactElement | null {
  const [latestRelease, setLatestRelease] = useState<GitHubRelease | null>(null);
  const [dismissedReleaseTag, setDismissedReleaseTag] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadLatestRelease = async () => {
      try {
        const release = await fetchLatestRelease();
        if (isMounted) {
          setLatestRelease(release);
        }
      } catch {
        if (isMounted) {
          setLatestRelease(null);
        }
      }
    };

    loadLatestRelease();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!latestRelease?.tag_name) {
      setDismissedReleaseTag(null);
      return;
    }
    const key = buildReleaseDismissKey(latestRelease.tag_name);
    if (!key) {
      setDismissedReleaseTag(null);
      return;
    }
    const stored = safeGetItem(key);
    setDismissedReleaseTag(stored ? latestRelease.tag_name : null);
  }, [latestRelease?.tag_name]);

  const handleDismissLatestReleaseCard = useCallback(() => {
    if (!latestRelease?.tag_name) {
      return;
    }
    const key = buildReleaseDismissKey(latestRelease.tag_name);
    if (!key) {
      return;
    }
    safeSetItem(key, 'true');
    setDismissedReleaseTag(latestRelease.tag_name);
  }, [latestRelease?.tag_name]);

  const shouldShowLatestReleaseCard = useMemo(() => {
    if (!latestRelease) return false;
    if (latestRelease.draft) return false;
    if (!latestRelease.published_at) return false;
    if (!latestRelease.tag_name) return false;
    if (!isReleaseRecent(latestRelease.published_at)) return false;
    return dismissedReleaseTag !== latestRelease.tag_name;
  }, [dismissedReleaseTag, latestRelease]);

  const feedCards = useMemo<FeedCardItem[]>(() => {
    const cards: FeedCardItem[] = [];

    if (shouldShowLatestReleaseCard && latestRelease) {
      cards.push({
        id: `latest-release-${latestRelease.id ?? latestRelease.tag_name}`,
        element: <LatestReleaseCard release={latestRelease} onDismiss={handleDismissLatestReleaseCard} />,
      });
    }

    cards.push({ id: 'feed-primer', element: <FeedPrimerCard /> });

    return cards;
  }, [handleDismissLatestReleaseCard, latestRelease, shouldShowLatestReleaseCard]);

  if (!feedCards.length) {
    return null;
  }

  return (
    <Stack spacing={{ xs: 1.8, md: 2 }} sx={{ width: '100%', color: '#f8fafc', mt: { xs: 1.8, md: 0 } }}>
      <FeedCardsArea cards={feedCards} />
    </Stack>
  );
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Collapse,
  Container,
  Divider,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import BoltIcon from '@mui/icons-material/Bolt';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Helmet } from 'react-helmet-async';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { keyframes } from '@mui/system';

interface UsageEventSummary {
  id: string;
  identityId?: string | null;
  eventType: string;
  createdAt: string;
}

interface UsageEventDetail extends UsageEventSummary {
  eventData: Record<string, unknown>;
}

const STREAM_EVENT_LIMIT = 30;
const DETAIL_FETCH_DELAY_MS = 350;
const NEW_EVENT_HIGHLIGHT_DURATION_MS = 1600;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

interface EventTypeMeta {
  label: string;
}

const EVENT_TYPE_META: Record<string, EventTypeMeta> = {
  search: { label: 'Search' },
  view_image: { label: 'View Image' },
  view_episode: { label: 'View Episode' },
  add_to_library: { label: 'Add To Library' },
  library_upload: { label: 'Library Upload' },
  library_delete: { label: 'Library Delete' },
  favorite_add: { label: 'Favorite Added' },
  favorite_remove: { label: 'Favorite Removed' },
  random_frame: { label: 'Random Frame' },
  collage_generate: { label: 'Collage Generate' },
  
  view_image_advanced: { label: 'View Image (Advanced Editor)' },
  advanced_editor_save: { label: 'Advanced Editor Save' },
  advanced_editor_add_text_layer: { label: 'Advanced Editor Add Text Layer' },
};

const deriveFallbackLabel = (eventType: string): string =>
  eventType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getEventTypeMeta = (eventType: string): EventTypeMeta =>
  EVENT_TYPE_META[eventType] ?? { label: deriveFallbackLabel(eventType) };

const identities = ['us-east-1:mock-admin', 'us-east-1:mock-power-user'];

const formatRelativeTime = (iso: string, reference: number): string => {
  const diffMs = Math.max(0, reference - new Date(iso).getTime());
  const diffSeconds = Math.floor(diffMs / 1000);
  if (diffSeconds < 60) {
    return 'just now';
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    const remainingMinutes = diffMinutes % 60;
    return remainingMinutes ? `${diffHours}h ${remainingMinutes}m ago` : `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;
  return remainingHours ? `${diffDays}d ${remainingHours}h ago` : `${diffDays}d ago`;
};

const generateMockUsageEventData = (
  referenceTime: number,
): { summaries: UsageEventSummary[]; detailById: Record<string, UsageEventDetail> } => {
  let counter = 0;
  const summaries: UsageEventSummary[] = [];
  const detailById: Record<string, UsageEventDetail> = {};

  const registerEvent = (
    eventType: UsageEventSummary['eventType'],
    secondsAgo: number,
    eventData: Record<string, unknown>,
  ) => {
    counter += 1;
    const identityIndex = (counter - 1) % identities.length;
    const createdAt = new Date(referenceTime - secondsAgo * 1000).toISOString();
    const base: UsageEventSummary = {
      id: `${eventType}-${counter}`,
      identityId: identities[identityIndex],
      eventType,
      createdAt,
    };
    summaries.push(base);
    detailById[base.id] = {
      ...base,
      eventData,
    };
  };

  // Minimal set of mock templates
  registerEvent('search', 45, {
    index: 'stooges',
    resolvedIndex: 'stooges,stooges_hd',
    searchTerm: 'cream pies',
    source: 'HomePage',
  });

  registerEvent('view_image', 75, {
    cid: 'stooges',
    season: '3',
    episode: '5',
    frame: '12345',
    fineTuningIndex: '2',
    source: 'V2FramePage',
    searchTerm: 'cream pies',
  });

  registerEvent('random_frame', 240, {
    source: 'FloatingActionButtons',
    showCount: 12,
    hasAd: false,
  });

  return { summaries, detailById };
};

const AdminActivityLogsPage: React.FC = () => {
  const [lastRefresh, setLastRefresh] = useState(() => Date.now());
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const { detailById: mockDetailById } = useMemo(
    () => generateMockUsageEventData(lastRefresh),
    [lastRefresh],
  );

  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, Record<string, unknown>>>({});
  const [loadingEventId, setLoadingEventId] = useState<string | null>(null);
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [streamEvents, setStreamEvents] = useState<UsageEventDetail[]>([]);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const highlightTimeoutsRef = useRef<number[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => () => {
    highlightTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    highlightTimeoutsRef.current = [];
  }, []);

  const streamSummaries = useMemo(
    () => streamEvents.map(({ eventData: _eventData, ...summary }) => summary),
    [streamEvents],
  );

  const sortedEvents = useMemo(() => {
    return [...streamSummaries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [streamSummaries]);

  useEffect(() => {
    setNow(Date.now());
    setExpandedEventId(null);
    setDetailCache({});
    setDetailErrors({});
    setLoadingEventId(null);
    setStreamEvents([]);
    setHighlightedIds([]);
    highlightTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    highlightTimeoutsRef.current = [];
  }, [lastRefresh]);

  const fetchEventDetail = useCallback(
    (eventId: string): Promise<UsageEventDetail> =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          const streamDetail = streamEvents.find((event) => event.id === eventId);
          const detail = streamDetail ?? mockDetailById[eventId];
          if (detail) {
            resolve(detail);
          } else {
            reject(new Error('Mock event detail not found.'));
          }
        }, DETAIL_FETCH_DELAY_MS);
      }),
    [mockDetailById, streamEvents],
  );

  const handleRefresh = () => {
    setLastRefresh(Date.now());
  };

  const handleSimulateEvent = () => {
    const candidates = Object.values(mockDetailById);
    if (!candidates.length) {
      return;
    }

    const template = candidates[Math.floor(Math.random() * candidates.length)];
    const syntheticId = `${template.eventType}-sim-${Date.now()}`;
    const simulatedDetail: UsageEventDetail = {
      ...template,
      id: syntheticId,
      identityId: identities[Math.floor(Math.random() * identities.length)],
      createdAt: new Date().toISOString(),
    };

    setStreamEvents((prev) => {
      const next = [simulatedDetail, ...prev];
      return next.slice(0, STREAM_EVENT_LIMIT);
    });
    setDetailCache((prev) => {
      if (!prev[syntheticId]) {
        return prev;
      }
      const { [syntheticId]: _discard, ...rest } = prev;
      return rest;
    });
    setDetailErrors((prev) => {
      if (!prev[syntheticId]) {
        return prev;
      }
      const { [syntheticId]: _discard, ...rest } = prev;
      return rest;
    });
    setHighlightedIds((prev) => [...prev.filter((id) => id !== syntheticId), syntheticId]);

    const timeoutId = window.setTimeout(() => {
      setHighlightedIds((prev) => prev.filter((id) => id !== syntheticId));
      highlightTimeoutsRef.current = highlightTimeoutsRef.current.filter((id) => id !== timeoutId);
    }, NEW_EVENT_HIGHLIGHT_DURATION_MS);
    highlightTimeoutsRef.current.push(timeoutId);
  };

  const handleToggleEvent = (eventId: string) => {
    const isCurrentlyExpanded = expandedEventId === eventId;

    if (isCurrentlyExpanded) {
      setExpandedEventId(null);
      return;
    }

    setExpandedEventId(eventId);
    setDetailErrors((prev) => {
      if (!prev[eventId]) {
        return prev;
      }
      const { [eventId]: _discard, ...rest } = prev;
      return rest;
    });

    if (!detailCache[eventId] && loadingEventId !== eventId) {
      setLoadingEventId(eventId);
      fetchEventDetail(eventId)
        .then((detail) => {
          setDetailCache((prev) => ({ ...prev, [eventId]: detail.eventData }));
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : 'Failed to load mock event detail.';
          setDetailErrors((prev) => ({ ...prev, [eventId]: message }));
        })
        .finally(() => {
          setLoadingEventId((prev) => (prev === eventId ? null : prev));
        });
    }
  };

  const renderRefreshButton = (fullWidth: boolean) => (
    <Button
      variant="outlined"
      startIcon={<RefreshIcon />}
      onClick={handleRefresh}
      fullWidth={fullWidth}
      sx={{ alignSelf: fullWidth ? 'stretch' : 'auto' }}
    >
      Refresh sample
    </Button>
  );

  const renderSimulateButton = (fullWidth: boolean) => (
    <Button
      variant="contained"
      startIcon={<BoltIcon />}
      onClick={handleSimulateEvent}
      fullWidth={fullWidth}
      sx={{ alignSelf: fullWidth ? 'stretch' : 'auto' }}
    >
      Simulate event
    </Button>
  );

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
      <Helmet>
        <title>Activity Logs (Mock) - memeSRC 2.0</title>
      </Helmet>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Box sx={{ width: '100%' }}>
            <Typography variant="h4" gutterBottom>
              Activity Logs
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Listening for subscription metadata only. Select an event to load mocked details while the backend schema deploys.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Refreshed at {new Date(lastRefresh).toLocaleTimeString()}.
            </Typography>
          </Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={{ xs: 1, sm: 1.5 }}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            {isSmallScreen ? (
              <>
                {renderSimulateButton(true)}
                {renderRefreshButton(true)}
              </>
            ) : (
              <>
                <Tooltip title="Simulate a new subscription event">
                  <span>{renderSimulateButton(false)}</span>
                </Tooltip>
                <Tooltip title="Regenerate mock activity data">
                  <span>{renderRefreshButton(false)}</span>
                </Tooltip>
              </>
            )}
          </Stack>
        </Stack>

        <Alert severity="warning">
          Activity data and detail lookups are mocked until the updated GraphQL schema is deployed.
        </Alert>

        {sortedEvents.length === 0 ? (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary" align="center">
                No events available yet. Try simulating an event or refreshing the feed.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {sortedEvents.map((event) => {
              const { label } = getEventTypeMeta(event.eventType);
              const isExpanded = expandedEventId === event.id;
              const isLoading = loadingEventId === event.id;
              const payload = detailCache[event.id];
              const errorMessage = detailErrors[event.id];
              const eventDate = new Date(event.createdAt);
              const absoluteTime = eventDate.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              const isHighlighted = highlightedIds.includes(event.id);

              return (
                <Card
                  key={event.id}
                  variant="outlined"
                  sx={{
                    transition: 'background-color 0.6s ease, border-color 0.6s ease',
                    bgcolor: isHighlighted
                      ? alpha(theme.palette.primary.main, 0.08)
                      : undefined,
                    borderColor: isHighlighted
                      ? alpha(theme.palette.primary.main, 0.4)
                      : undefined,
                    ...(isHighlighted && {
                      animation: `${slideIn} 0.25s ease-out`,
                      animationFillMode: 'both',
                    }),
                  }}
                >
                  <CardActionArea
                    onClick={() => handleToggleEvent(event.id)}
                    disableRipple
                    sx={{ textAlign: 'left' }}
                  >
                    <CardContent
                      sx={{
                        py: { xs: 1.5, sm: 2 },
                        px: { xs: 1.5, sm: 2.5 },
                      }}
                    >
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateAreas: {
                            xs: '"label" "meta" "time"',
                            sm: '"label time" "meta meta"',
                          },
                          gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) auto' },
                          columnGap: { xs: 0, sm: 3 },
                          rowGap: { xs: 1, sm: 0.75 },
                          alignItems: { sm: 'center' },
                        }}
                      >
                        <Stack spacing={0.5} sx={{ gridArea: 'label', minWidth: 0 }}>
                          <Typography variant="subtitle1" fontWeight={600} sx={{ pr: { xs: 0, sm: 2 } }}>
                            {label}
                          </Typography>
                        </Stack>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={{ xs: 0.5, sm: 2 }}
                          alignItems={{ xs: 'flex-start', sm: 'center' }}
                          sx={{ gridArea: 'meta', minWidth: 0 }}
                        >
                          {event.identityId && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ fontFamily: 'Source Code Pro, monospace', wordBreak: 'break-all' }}
                            >
                              {event.identityId}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            {absoluteTime}
                          </Typography>
                        </Stack>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{
                            gridArea: 'time',
                            justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Typography variant="body2" fontWeight={600}>
                            {formatRelativeTime(event.createdAt, now)}
                          </Typography>
                          <KeyboardArrowDownIcon
                            sx={{
                              transition: 'transform 0.2s ease',
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            }}
                          />
                        </Stack>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit={false}>
                    <Divider />
                    <Box sx={{ p: { xs: 2, sm: 3 } }}>
                      {isLoading ? (
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <CircularProgress size={20} />
                          <Typography variant="body2" color="text.secondary">
                            Loading mock event data...
                          </Typography>
                        </Stack>
                      ) : errorMessage ? (
                        <Alert severity="error">{errorMessage}</Alert>
                      ) : payload ? (
                        <Stack spacing={1.5}>
                          <Stack spacing={0.5}>
                            <Typography variant="subtitle2">Event payload (mocked)</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {`Event type: ${event.eventType}`}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {`Event ID: ${event.id}`}
                            </Typography>
                          </Stack>
                          <Box
                            component="pre"
                            sx={{
                              m: 0,
                              fontSize: 12,
                              fontFamily: 'Source Code Pro, monospace',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              bgcolor: 'action.hover',
                              borderRadius: 1,
                              p: 1.5,
                            }}
                          >
                            {JSON.stringify(payload, null, 2)}
                          </Box>
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Event data will appear here once loaded.
                        </Typography>
                      )}
                    </Box>
                  </Collapse>
                </Card>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Container>
  );
};

export default AdminActivityLogsPage;

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

const INITIAL_EVENT_LIMIT = 10;
const INITIAL_FETCH_DELAY_MS = 250;
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

  registerEvent('search', 45, {
      index: 'stooges',
      resolvedIndex: 'stooges,stooges_hd',
      searchTerm: 'cream pies',
      source: 'HomePage',
    });
  registerEvent('search', 210, {
      index: 'office',
      searchTerm: 'bear beets',
      source: 'NavSearch',
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
  registerEvent('view_image', 180, {
      cid: 'office',
      season: '2',
      episode: '3',
      frame: '20482',
      fineTuningIndex: '1',
      source: 'FavoritesPage',
      searchTerm: 'dundies',
    });
  registerEvent('view_episode', 90, {
      source: 'V2FramePage',
      cid: 'stooges',
      season: '3',
      episode: '5',
      frame: '12345',
      fineTuningIndex: '2',
      searchTerm: 'cream pies',
    });
  registerEvent('view_episode', 240, {
      source: 'V2EditorPage',
      cid: 'office',
      season: '2',
      episode: '12',
      frame: '50231',
      fineTuningIndex: '0',
      searchTerm: 'finer things club',
      editorProjectId: 'proj-42',
    });
  registerEvent('add_to_library', 105, {
      cid: 'stooges',
      season: '3',
      episode: '5',
      frame: '12345',
      fineTuningIndex: '2',
      source: 'V2FramePage',
      searchTerm: 'cream pies',
    });
  registerEvent('add_to_library', 300, {
      cid: 'office',
      season: '4',
      episode: '1',
      frame: '67890',
      fineTuningIndex: '3',
      source: 'V2EditorPage',
      searchTerm: 'fun run',
    });
  registerEvent('library_upload', 150, {
      source: 'LibraryBrowser',
      storageLevel: 'private',
      uploadedCount: 2,
      batchSize: 2,
      files: [
        {
          key: 'library/1700000000000-kfj2-photo.png',
          fileName: 'photo.png',
          fileSize: 512341,
          fileType: 'image/png',
        },
        {
          key: 'library/1700000000001-2jd9-landscape.jpg',
          fileName: 'landscape.jpg',
          fileSize: 413276,
          fileType: 'image/jpeg',
        },
      ],
    });
  registerEvent('library_upload', 360, {
      source: 'AdminCollageUploader',
      storageLevel: 'protected',
      uploadedCount: 3,
      batchSize: 3,
      files: [
        {
          key: 'library/1700000001000-hd94-canvas.psd',
          fileName: 'canvas.psd',
          fileSize: 1051234,
          fileType: 'application/octet-stream',
        },
        {
          key: 'library/1700000001001-gj32-poster.png',
          fileName: 'poster.png',
          fileSize: 815321,
          fileType: 'image/png',
        },
        {
          key: 'library/1700000001002-fj20-caption.txt',
          fileName: 'caption.txt',
          fileSize: 1320,
          fileType: 'text/plain',
        },
      ],
    });
  registerEvent('library_delete', 165, {
      source: 'LibraryBrowser',
      storageLevel: 'private',
      deletedCount: 1,
      keys: ['library/1700000000003-8as8-old-photo.png'],
    });
  registerEvent('library_delete', 420, {
      source: 'AdminCleanup',
      storageLevel: 'protected',
      deletedCount: 2,
      keys: [
        'library/1700000000004-f9s0-background.png',
        'library/1700000000005-d9x4-meme.jpg',
      ],
    });
  registerEvent('favorite_add', 195, {
      indexId: 'stooges',
      source: 'FavoriteToggle',
      nextIsFavorite: true,
      favoritesCount: 6,
    });
  registerEvent('favorite_add', 480, {
      indexId: 'office',
      source: 'FavoriteToggle',
      nextIsFavorite: true,
      favoritesCount: 21,
    });
  registerEvent('favorite_remove', 210, {
      indexId: 'office',
      source: 'FavoriteToggle',
      nextIsFavorite: false,
      favoritesCount: 20,
    });
  registerEvent('favorite_remove', 510, {
      indexId: 'parks_and_rec',
      source: 'FavoriteToggle',
      nextIsFavorite: false,
      favoritesCount: 14,
    });
  registerEvent('random_frame', 240, {
      source: 'FloatingActionButtons',
      showCount: 12,
      hasAd: false,
    });
  registerEvent('random_frame', 540, {
      source: 'FloatingActionButtons',
      showCount: 15,
      hasAd: true,
    });
  registerEvent('collage_generate', 255, {
      source: 'CollagePage',
      panelCount: 4,
      aspectRatio: 'square',
      imageCount: 4,
      hasCustomLayout: false,
      allPanelsHaveImages: true,
      borderThickness: 1.5,
      borderColor: '#000000',
      canvasElementFound: true,
      templateId: 'baseline-2x2',
    });
  registerEvent('collage_generate', 570, {
      source: 'CollagePage',
      panelCount: 6,
      aspectRatio: 'widescreen',
      imageCount: 6,
      hasCustomLayout: true,
      allPanelsHaveImages: false,
      borderThickness: 2.5,
      borderColor: '#FFFFFF',
      canvasElementFound: true,
      templateId: 'story-3x2',
      projectId: 'proj-99',
    });
  
  registerEvent('view_image_advanced', 285, {
      source: 'V2EditorPage',
      cid: 'office',
      season: '3',
      episode: '8',
      frame: '34211',
      fineTuningIndex: '1',
      selectedFrameIndex: 7,
      fid: 'office-3-8-34211',
      editorProjectId: 'proj-17',
      fromCollage: false,
      hasUploadedImage: false,
      imageLoaded: true,
      searchTerm: 'the merger',
    });
  registerEvent('view_image_advanced', 450, {
      source: 'V2EditorPage',
      cid: 'parks_and_rec',
      season: '5',
      episode: '4',
      frame: '55201',
      fineTuningIndex: '4',
      selectedFrameIndex: 3,
      fid: 'parks_and_rec-5-4-55201',
      editorProjectId: 'proj-54',
      fromCollage: true,
      hasUploadedImage: true,
      imageLoaded: true,
      searchTerm: 'cones of dunshire',
    });
  registerEvent('advanced_editor_save', 300, {
      source: 'V2EditorPage',
      cid: 'office',
      season: '3',
      episode: '8',
      frame: '34211',
      fineTuningIndex: '1',
      editorProjectId: 'proj-17',
      fromCollage: false,
      hasUploadedImage: false,
      searchTerm: 'the merger',
    });
  registerEvent('advanced_editor_save', 465, {
      source: 'V2EditorPage',
      cid: 'parks_and_rec',
      season: '5',
      episode: '4',
      frame: '55201',
      fineTuningIndex: '4',
      editorProjectId: 'proj-54',
      fromCollage: true,
      hasUploadedImage: true,
      searchTerm: 'cones of dunshire',
    });
  registerEvent('advanced_editor_add_text_layer', 315, {
      source: 'V2EditorPage',
      cid: 'office',
      season: '3',
      episode: '8',
      frame: '34211',
      fineTuningIndex: '1',
      selectedFrameIndex: 7,
      canvasObjectCount: 2,
      nextCanvasObjectCount: 3,
      searchTerm: 'the merger',
    });
  registerEvent('advanced_editor_add_text_layer', 495, {
      source: 'V2EditorPage',
      cid: 'parks_and_rec',
      season: '5',
      episode: '4',
      frame: '55201',
      fineTuningIndex: '4',
      selectedFrameIndex: 3,
      canvasObjectCount: 3,
      nextCanvasObjectCount: 4,
      searchTerm: 'cones of dunshire',
    });

  return { summaries, detailById };
};

const AdminActivityLogsPage: React.FC = () => {
  const [lastRefresh, setLastRefresh] = useState(() => Date.now());
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const { summaries: mockSummaryEvents, detailById: mockDetailById } = useMemo(
    () => generateMockUsageEventData(lastRefresh),
    [lastRefresh],
  );

  const [initialEvents, setInitialEvents] = useState<UsageEventSummary[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);
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
    const combined = [...streamSummaries, ...initialEvents];
    return combined.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [streamSummaries, initialEvents]);

  useEffect(() => {
    setNow(Date.now());
    setInitialLoading(true);
    setInitialError(null);
    setInitialEvents([]);
    setExpandedEventId(null);
    setDetailCache({});
    setDetailErrors({});
    setLoadingEventId(null);
    setStreamEvents([]);
    setHighlightedIds([]);
    highlightTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    highlightTimeoutsRef.current = [];

    const timeoutId = window.setTimeout(() => {
      try {
        const latestEvents = [...mockSummaryEvents]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, INITIAL_EVENT_LIMIT);
        setInitialEvents(latestEvents);
      } catch (_error) {
        setInitialError('Failed to load mock activity events. Please refresh.');
      } finally {
        setInitialLoading(false);
      }
    }, INITIAL_FETCH_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [mockSummaryEvents, lastRefresh]);

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

        <Typography variant="body2" color="text.secondary">
          Initial load fetches the latest 10 events. Subscription events will appear at the top.
        </Typography>

        {initialError && <Alert severity="error">{initialError}</Alert>}

        {initialLoading && sortedEvents.length === 0 ? (
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Fetching the latest mock events...
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ) : sortedEvents.length === 0 ? (
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

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Helmet } from 'react-helmet-async';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

interface UsageEvent {
  id: string;
  identityId?: string | null;
  eventType: string;
  eventData: Record<string, unknown>;
  createdAt: string;
}

const TEN_MINUTES_MS = 10 * 60 * 1000;

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
  collage_select_photos: { label: 'Collage Select Photos' },
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
  const diffSeconds = Math.round(diffMs / 1000);
  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  const remainingSeconds = diffSeconds % 60;
  if (diffMinutes >= 10) {
    return '10m+ ago';
  }
  return remainingSeconds
    ? `${diffMinutes}m ${remainingSeconds}s ago`
    : `${diffMinutes}m ago`;
};

const generateMockUsageEvents = (referenceTime: number): UsageEvent[] => {
  let counter = 0;
  const createEvent = (
    eventType: UsageEvent['eventType'],
    secondsAgo: number,
    eventData: Record<string, unknown>,
  ): UsageEvent => {
    counter += 1;
    const identityIndex = (counter - 1) % identities.length;
    return {
      id: `${eventType}-${counter}`,
      identityId: identities[identityIndex],
      eventType,
      eventData,
      createdAt: new Date(referenceTime - secondsAgo * 1000).toISOString(),
    };
  };

  return [
    createEvent('search', 45, {
      index: 'stooges',
      resolvedIndex: 'stooges,stooges_hd',
      searchTerm: 'cream pies',
      source: 'HomePage',
    }),
    createEvent('search', 210, {
      index: 'office',
      searchTerm: 'bear beets',
      source: 'NavSearch',
    }),
    createEvent('view_image', 75, {
      cid: 'stooges',
      season: '3',
      episode: '5',
      frame: '12345',
      fineTuningIndex: '2',
      source: 'V2FramePage',
      searchTerm: 'cream pies',
    }),
    createEvent('view_image', 180, {
      cid: 'office',
      season: '2',
      episode: '3',
      frame: '20482',
      fineTuningIndex: '1',
      source: 'FavoritesPage',
      searchTerm: 'dundies',
    }),
    createEvent('view_episode', 90, {
      source: 'V2FramePage',
      cid: 'stooges',
      season: '3',
      episode: '5',
      frame: '12345',
      fineTuningIndex: '2',
      searchTerm: 'cream pies',
    }),
    createEvent('view_episode', 240, {
      source: 'V2EditorPage',
      cid: 'office',
      season: '2',
      episode: '12',
      frame: '50231',
      fineTuningIndex: '0',
      searchTerm: 'finer things club',
      editorProjectId: 'proj-42',
    }),
    createEvent('add_to_library', 105, {
      cid: 'stooges',
      season: '3',
      episode: '5',
      frame: '12345',
      fineTuningIndex: '2',
      source: 'V2FramePage',
      searchTerm: 'cream pies',
    }),
    createEvent('add_to_library', 300, {
      cid: 'office',
      season: '4',
      episode: '1',
      frame: '67890',
      fineTuningIndex: '3',
      source: 'V2EditorPage',
      searchTerm: 'fun run',
    }),
    createEvent('library_upload', 150, {
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
    }),
    createEvent('library_upload', 360, {
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
    }),
    createEvent('library_delete', 165, {
      source: 'LibraryBrowser',
      storageLevel: 'private',
      deletedCount: 1,
      keys: ['library/1700000000003-8as8-old-photo.png'],
    }),
    createEvent('library_delete', 420, {
      source: 'AdminCleanup',
      storageLevel: 'protected',
      deletedCount: 2,
      keys: [
        'library/1700000000004-f9s0-background.png',
        'library/1700000000005-d9x4-meme.jpg',
      ],
    }),
    createEvent('favorite_add', 195, {
      indexId: 'stooges',
      source: 'FavoriteToggle',
      nextIsFavorite: true,
      favoritesCount: 6,
    }),
    createEvent('favorite_add', 480, {
      indexId: 'office',
      source: 'FavoriteToggle',
      nextIsFavorite: true,
      favoritesCount: 21,
    }),
    createEvent('favorite_remove', 210, {
      indexId: 'office',
      source: 'FavoriteToggle',
      nextIsFavorite: false,
      favoritesCount: 20,
    }),
    createEvent('favorite_remove', 510, {
      indexId: 'parks_and_rec',
      source: 'FavoriteToggle',
      nextIsFavorite: false,
      favoritesCount: 14,
    }),
    createEvent('random_frame', 240, {
      source: 'FloatingActionButtons',
      showCount: 12,
      hasAd: false,
    }),
    createEvent('random_frame', 540, {
      source: 'FloatingActionButtons',
      showCount: 15,
      hasAd: true,
    }),
    createEvent('collage_generate', 255, {
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
    }),
    createEvent('collage_generate', 570, {
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
    }),
    createEvent('collage_select_photos', 270, {
      source: 'BulkUploadSection',
      via: 'library_cta',
      hasImages: false,
      isAdmin: true,
      hasLibraryAccess: true,
    }),
    createEvent('collage_select_photos', 585, {
      source: 'BulkUploadSection',
      via: 'camera_roll',
      hasImages: true,
      isAdmin: false,
      hasLibraryAccess: true,
    }),
    createEvent('view_image_advanced', 285, {
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
    }),
    createEvent('view_image_advanced', 450, {
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
    }),
    createEvent('advanced_editor_save', 300, {
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
    }),
    createEvent('advanced_editor_save', 465, {
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
    }),
    createEvent('advanced_editor_add_text_layer', 315, {
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
    }),
    createEvent('advanced_editor_add_text_layer', 495, {
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
    }),
  ];
};

const AdminActivityLogsPage: React.FC = () => {
  const [lastRefresh, setLastRefresh] = useState(() => Date.now());
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const mockEvents = useMemo(() => generateMockUsageEvents(lastRefresh), [lastRefresh]);

  const recentEvents = useMemo(() => {
    const cutoff = lastRefresh - TEN_MINUTES_MS;
    return mockEvents.filter((event) => new Date(event.createdAt).getTime() >= cutoff);
  }, [mockEvents, lastRefresh]);

  const sortedEvents = useMemo(
    () =>
      [...recentEvents].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [recentEvents],
  );

  const handleRefresh = () => {
    setLastRefresh(Date.now());
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

  const renderEventTypeInfo = (eventType: string) => {
    const { label } = getEventTypeMeta(eventType);

    return (
      <Stack spacing={0.25}>
        <Typography variant="subtitle1" fontWeight={600}>
          {label}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontFamily: 'Source Code Pro, monospace' }}
        >
          {eventType}
        </Typography>
      </Stack>
    );
  };

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
            <Typography variant="body2" color="text.secondary">
              Showing mocked usage events from the last 10 minutes. Backend analytics wiring is pending deployment.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Refreshed at {new Date(lastRefresh).toLocaleTimeString()}.
            </Typography>
          </Box>
          {isSmallScreen ? (
            renderRefreshButton(true)
          ) : (
            <Tooltip title="Regenerate mock activity data">
              <span>{renderRefreshButton(false)}</span>
            </Tooltip>
          )}
        </Stack>

        <Alert severity="warning">
          Activity data is currently mocked while the updated GraphQL schema is awaiting deployment.
        </Alert>

        {isSmallScreen ? (
          <Stack spacing={2}>
            {sortedEvents.length === 0 ? (
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2" color="text.secondary" align="center">
                    No events recorded within the last 10 minutes.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              sortedEvents.map((event) => (
                <Card key={event.id} variant="outlined">
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                        {renderEventTypeInfo(event.eventType)}
                        <Stack spacing={0.25} alignItems="flex-end">
                          <Typography variant="body2" fontWeight={600}>
                            {formatRelativeTime(event.createdAt, lastRefresh)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(event.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </Typography>
                        </Stack>
                      </Stack>
                      {event.identityId && (
                        <Typography variant="caption" color="text.secondary">
                          Identity: {event.identityId}
                        </Typography>
                      )}
                      <Box
                        component="pre"
                        sx={{
                          m: 0,
                          fontSize: 11,
                          fontFamily: 'Source Code Pro, monospace',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          bgcolor: 'action.hover',
                          borderRadius: 1,
                          p: 1,
                        }}
                      >
                        {JSON.stringify(event.eventData, null, 2)}
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))
            )}
          </Stack>
        ) : (
          <Card>
            <CardContent sx={{ p: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width="22%">Event Type</TableCell>
                      <TableCell width="20%">When</TableCell>
                      <TableCell>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedEvents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                            No events recorded within the last 10 minutes.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {sortedEvents.map((event) => (
                      <TableRow key={event.id} hover>
                        <TableCell>
                          <Stack spacing={0.75}>
                            {renderEventTypeInfo(event.eventType)}
                            {event.identityId && (
                              <Typography variant="caption" color="text.secondary">
                                {event.identityId}
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <Typography variant="body2">{formatRelativeTime(event.createdAt, lastRefresh)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(event.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
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
                              p: 1,
                            }}
                          >
                            {JSON.stringify(event.eventData, null, 2)}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Container>
  );
};

export default AdminActivityLogsPage;

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { API, graphqlOperation } from 'aws-amplify';
import { GraphQLResult } from '@aws-amplify/api-graphql';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  CardActions,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { Link as RouterLink } from 'react-router-dom';
import LaunchIcon from '@mui/icons-material/Launch';
import { UserContext } from '../UserContext';
import { usageEventsByType } from '../graphql/queries';

type UsageEventRecord = {
  id: string;
  eventData?: string | null;
  createdAt?: string | null;
  eventType?: string | null;
  identityId?: string | null;
  sessionId?: string | null;
  updatedAt?: string | null;
};

type UsageEventsResponse = {
  usageEventsByType?: {
    items?: UsageEventRecord[] | null;
    nextToken?: string | null;
  } | null;
};

const EVENT_TYPES = [
  'view_image',
  'view_image_advanced',
  'save_intent_image',
  'add_to_library',
  'advanced_editor_save',
] as const;

type FrameEventType = (typeof EVENT_TYPES)[number];

const EVENT_WEIGHT_MAP: Record<FrameEventType, number> = {
  view_image: 1,
  view_image_advanced: 1.5,
  save_intent_image: 3,
  add_to_library: 5,
  advanced_editor_save: 4,
};

const EVENT_TYPE_LABELS: Record<FrameEventType, string> = {
  view_image: 'Frame views',
  view_image_advanced: 'Editor image loads',
  save_intent_image: 'Save intents',
  add_to_library: 'Library saves',
  advanced_editor_save: 'Editor saves',
};

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;
const PAGE_LIMIT = 200;
const MAX_CONTEXT_ITEMS = 4;
const MAX_TOP_FRAMES_PER_CID = 5;

const FRAME_DELIVERY_BRANCH =
  process.env.REACT_APP_USER_BRANCH && process.env.REACT_APP_USER_BRANCH.length
    ? process.env.REACT_APP_USER_BRANCH
    : 'prod';

const buildFrameImageUrl = (cid: string, season: string, episode: string, frame: string): string =>
  `https://v2-${FRAME_DELIVERY_BRANCH}.memesrc.com/frame/${cid}/${season}/${episode}/${frame}`;

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const safeParseJSON = (input: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore parse failure
  }

  return null;
};

const sanitizeString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value}`;
  }

  return null;
};

const readStringField = (payload: Record<string, unknown>, key: string): string | null =>
  sanitizeString(payload[key]);

const buildFrameKey = (
  cid: string,
  season: string,
  episode: string,
  frame: string,
  fineTuningIndex?: string
): string => {
  const finePart = fineTuningIndex && fineTuningIndex.length ? fineTuningIndex : 'base';
  return `${cid}::${season}::${episode}::${frame}::${finePart}`;
};

const createEmptyCounts = (): Record<FrameEventType, number> => ({
  view_image: 0,
  view_image_advanced: 0,
  save_intent_image: 0,
  add_to_library: 0,
  advanced_editor_save: 0,
});

type SearchTermSummary = {
  term: string;
  count: number;
};

type SourceSummary = {
  source: string;
  count: number;
};

type FrameSummary = {
  key: string;
  cid: string;
  season: string;
  episode: string;
  frame: string;
  fineTuningIndex?: string;
  totalEvents: number;
  score: number;
  scorePerEvent: number;
  countsByType: Record<FrameEventType, number>;
  lastSeen?: number;
  topSearchTerms: SearchTermSummary[];
  topSources: SourceSummary[];
};

type CidSummary = {
  cid: string;
  totalFrames: number;
  totalEvents: number;
  totalScore: number;
  countsByType: Record<FrameEventType, number>;
  topFrames: FrameSummary[];
};

type AggregatedFrameSummary = {
  cutoffIso: string;
  totalRecords: number;
  processedRecords: number;
  skippedRecords: number;
  uniqueFrameCount: number;
  uniqueCidCount: number;
  eventTypeTotals: Record<FrameEventType, number>;
  frameSummaries: FrameSummary[];
  cidSummaries: CidSummary[];
};

type FrameCollector = {
  key: string;
  cid: string;
  season: string;
  episode: string;
  frame: string;
  fineTuningIndex?: string;
  totalEvents: number;
  score: number;
  countsByType: Record<FrameEventType, number>;
  lastSeen?: number;
  searchTermCounts: Map<string, number>;
  sourceCounts: Map<string, number>;
};

const ALLOWED_EVENT_TYPE_SET = new Set<FrameEventType>(EVENT_TYPES);

const aggregateFrameEvents = (
  records: UsageEventRecord[],
  cutoffIso: string
): AggregatedFrameSummary => {
  const frameCollectors = new Map<string, FrameCollector>();
  const typeTotals = createEmptyCounts();
  const uniqueCidSet = new Set<string>();
  const cutoffTimestamp = Date.parse(cutoffIso);

  let processedRecords = 0;
  let skippedRecords = 0;

  records.forEach((record) => {
    if (!record?.id) {
      skippedRecords += 1;
      return;
    }

    const eventTypeRaw = record.eventType;
    if (!eventTypeRaw || !ALLOWED_EVENT_TYPE_SET.has(eventTypeRaw as FrameEventType)) {
      skippedRecords += 1;
      return;
    }

    const eventType = eventTypeRaw as FrameEventType;
    const createdAt = record.createdAt ? Date.parse(record.createdAt) : Number.NaN;
    if (Number.isFinite(cutoffTimestamp) && Number.isFinite(createdAt) && createdAt < cutoffTimestamp) {
      skippedRecords += 1;
      return;
    }

    const rawPayload = typeof record.eventData === 'string' ? record.eventData : '';
    const parsedPayload = rawPayload ? safeParseJSON(rawPayload) : null;
    const eventPayload = parsedPayload ?? {};

    const cid = readStringField(eventPayload, 'cid');
    const season = readStringField(eventPayload, 'season');
    const episode = readStringField(eventPayload, 'episode');
    const frame = readStringField(eventPayload, 'frame');

    if (!cid || !season || !episode || !frame) {
      skippedRecords += 1;
      return;
    }

    const fineTuningIndexRaw = readStringField(eventPayload, 'fineTuningIndex');
    const fineTuningIndex =
      fineTuningIndexRaw && fineTuningIndexRaw.toLowerCase() !== 'null' && fineTuningIndexRaw !== '-1'
        ? fineTuningIndexRaw
        : undefined;

    const key = buildFrameKey(cid, season, episode, frame, fineTuningIndex);

    let collector = frameCollectors.get(key);
    if (!collector) {
      collector = {
        key,
        cid,
        season,
        episode,
        frame,
        fineTuningIndex,
        totalEvents: 0,
        score: 0,
        countsByType: createEmptyCounts(),
        searchTermCounts: new Map<string, number>(),
        sourceCounts: new Map<string, number>(),
      };
      frameCollectors.set(key, collector);
    }

    collector.totalEvents += 1;
    collector.score += EVENT_WEIGHT_MAP[eventType];
    collector.countsByType[eventType] += 1;
    if (Number.isFinite(createdAt)) {
      collector.lastSeen = collector.lastSeen ? Math.max(collector.lastSeen, createdAt) : createdAt;
    }

    const searchTermRaw = readStringField(eventPayload, 'searchTerm');
    if (searchTermRaw) {
      const normalizedTerm = collapseWhitespace(searchTermRaw);
      collector.searchTermCounts.set(
        normalizedTerm,
        (collector.searchTermCounts.get(normalizedTerm) ?? 0) + 1
      );
    }

    const sourceRaw = readStringField(eventPayload, 'source');
    if (sourceRaw) {
      collector.sourceCounts.set(
        sourceRaw,
        (collector.sourceCounts.get(sourceRaw) ?? 0) + 1
      );
    }

    typeTotals[eventType] += 1;
    uniqueCidSet.add(cid);
    processedRecords += 1;
  });

  const frameSummaries: FrameSummary[] = Array.from(frameCollectors.values())
    .map((collector) => {
      const topSearchTerms = Array.from(collector.searchTermCounts.entries())
        .map(([term, count]) => ({ value: term, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, MAX_CONTEXT_ITEMS)
        .map(({ value, count }) => ({ term: value, count }));

      const topSources = Array.from(collector.sourceCounts.entries())
        .map(([source, count]) => ({ value: source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, MAX_CONTEXT_ITEMS)
        .map(({ value, count }) => ({ source: value, count }));

      const countsByType = EVENT_TYPES.reduce(
        (accumulator, type) => {
          accumulator[type] = collector.countsByType[type];
          return accumulator;
        },
        createEmptyCounts()
      );

      const scorePerEvent =
        collector.totalEvents > 0 ? collector.score / collector.totalEvents : 0;

      return {
        key: collector.key,
        cid: collector.cid,
        season: collector.season,
        episode: collector.episode,
        frame: collector.frame,
        fineTuningIndex: collector.fineTuningIndex,
        totalEvents: collector.totalEvents,
        score: collector.score,
        scorePerEvent,
        countsByType,
        lastSeen: collector.lastSeen,
        topSearchTerms,
        topSources,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (b.totalEvents !== a.totalEvents) {
        return b.totalEvents - a.totalEvents;
      }

      return (b.lastSeen ?? 0) - (a.lastSeen ?? 0);
    });

  const cidAggregates = new Map<
    string,
    {
      cid: string;
      totalFrames: number;
      totalEvents: number;
      totalScore: number;
      countsByType: Record<FrameEventType, number>;
      frames: FrameSummary[];
    }
  >();

  frameSummaries.forEach((frameSummary) => {
    let bucket = cidAggregates.get(frameSummary.cid);
    if (!bucket) {
      bucket = {
        cid: frameSummary.cid,
        totalFrames: 0,
        totalEvents: 0,
        totalScore: 0,
        countsByType: createEmptyCounts(),
        frames: [],
      };
      cidAggregates.set(frameSummary.cid, bucket);
    }

    bucket.totalFrames += 1;
    bucket.totalEvents += frameSummary.totalEvents;
    bucket.totalScore += frameSummary.score;
    EVENT_TYPES.forEach((type) => {
      bucket.countsByType[type] += frameSummary.countsByType[type];
    });
    bucket.frames.push(frameSummary);
  });

  const cidSummaries: CidSummary[] = Array.from(cidAggregates.values())
    .map((bucket) => ({
      cid: bucket.cid,
      totalFrames: bucket.totalFrames,
      totalEvents: bucket.totalEvents,
      totalScore: bucket.totalScore,
      countsByType: bucket.countsByType,
      topFrames: bucket.frames.slice(0, MAX_TOP_FRAMES_PER_CID),
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  return {
    cutoffIso,
    totalRecords: records.length,
    processedRecords,
    skippedRecords,
    uniqueFrameCount: frameSummaries.length,
    uniqueCidCount: cidSummaries.length,
    eventTypeTotals: typeTotals,
    frameSummaries,
    cidSummaries,
  };
};

const formatSeasonEpisode = (season: string, episode: string): string => {
  const seasonNumber = Number.parseInt(season, 10);
  const episodeNumber = Number.parseInt(episode, 10);

  if (Number.isFinite(seasonNumber) && Number.isFinite(episodeNumber)) {
    const seasonPart = `S${seasonNumber.toString().padStart(2, '0')}`;
    const episodePart = `E${episodeNumber.toString().padStart(2, '0')}`;
    return `${seasonPart}${episodePart}`;
  }

  return `Season ${season} · Episode ${episode}`;
};

const formatScore = (value: number): string => value.toFixed(1);

const buildFrameDetailPath = (frame: FrameSummary): string => {
  const basePath = `/frame/${frame.cid}/${frame.season}/${frame.episode}/${frame.frame}`;
  return frame.fineTuningIndex ? `${basePath}/${frame.fineTuningIndex}` : basePath;
};

const buildEditorPath = (frame: FrameSummary): string => {
  const basePath = `/editor/${frame.cid}/${frame.season}/${frame.episode}/${frame.frame}`;
  return frame.fineTuningIndex ? `${basePath}/${frame.fineTuningIndex}` : basePath;
};

const AdminPopularFramesPage: React.FC = () => {
  const { user, shows } = useContext(UserContext);
  const isAdmin = Boolean(user?.['cognito:groups']?.includes('admins'));

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AggregatedFrameSummary | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [selectedCid, setSelectedCid] = useState<string>('');

  const handleLoad = useCallback(async () => {
    if (!isAdmin || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const cutoffIso = new Date(Date.now() - SEVEN_DAYS_IN_MS).toISOString();
    const collected: UsageEventRecord[] = [];

    try {
      for (const eventType of EVENT_TYPES) {
        let nextToken: string | null = null;
        do {
          const variables: Record<string, unknown> = {
            eventType,
            createdAt: { ge: cutoffIso },
            sortDirection: 'DESC',
            limit: PAGE_LIMIT,
          };

          if (nextToken) {
            variables.nextToken = nextToken;
          }

          const response = (await API.graphql(
            graphqlOperation(usageEventsByType, variables)
          )) as GraphQLResult<UsageEventsResponse>;

          const connection = response?.data?.usageEventsByType;
          const items = connection?.items ?? [];

          items
            .filter((item): item is UsageEventRecord => Boolean(item && item.id))
            .forEach((item) => collected.push(item));

          nextToken = connection?.nextToken ?? null;
        } while (nextToken);
      }

      const aggregated = aggregateFrameEvents(collected, cutoffIso);
      setSummary(aggregated);
      setLastUpdatedAt(new Date().toISOString());
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : 'Unable to load frame analytics.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, isLoading]);

  const showLabelMap = useMemo(() => {
    if (!Array.isArray(shows)) {
      return new Map<string, string>();
    }

    return new Map<string, string>(
      shows
        .filter((show): show is { id?: unknown; cid?: unknown; title?: unknown } => Boolean(show))
        .map((show: any) => {
          const key =
            typeof show?.cid === 'string'
              ? show.cid
              : typeof show?.id === 'string'
              ? show.id
              : null;
          const label = typeof show?.title === 'string' ? show.title : null;
          if (!key || !label) {
            return null;
          }
          return [key, label] as [string, string];
        })
        .filter((entry): entry is [string, string] => Boolean(entry))
    );
  }, [shows]);

  useEffect(() => {
    if (!summary) {
      setSelectedCid('');
      return;
    }

    const available = summary.cidSummaries.map((item) => item.cid);
    if (selectedCid && available.includes(selectedCid)) {
      return;
    }

    setSelectedCid('');
  }, [summary, selectedCid]);

  const metrics = useMemo(() => {
    if (!summary) {
      return null;
    }

    return {
      totalProcessed: summary.processedRecords,
      totalSkipped: summary.skippedRecords,
      totalRecords: summary.totalRecords,
      uniqueFrames: summary.uniqueFrameCount,
      uniqueShows: summary.uniqueCidCount,
    };
  }, [summary]);

  const cidOptions = useMemo(() => {
    if (!summary) {
      return [];
    }

    return summary.cidSummaries.map((item) => {
      const labelBase = showLabelMap.get(item.cid) ?? item.cid;
      const formattedScore = formatScore(item.totalScore);
      return {
        value: item.cid,
        label: `${labelBase} — score ${formattedScore}, frames ${item.totalFrames}`,
      };
    });
  }, [summary, showLabelMap]);

  const filteredFrames = useMemo(() => {
    if (!summary) {
      return [];
    }

    const frames = selectedCid
      ? summary.frameSummaries.filter((frame) => frame.cid === selectedCid)
      : summary.frameSummaries;

    return frames;
  }, [summary, selectedCid]);

  const topFrames = useMemo(() => filteredFrames.slice(0, 100), [filteredFrames]);

  const handleCidChange = useCallback((event: SelectChangeEvent<string>) => {
    setSelectedCid(event.target.value);
  }, []);

  const weightLegend = useMemo(
    () =>
      EVENT_TYPES.map((type) => ({
        type,
        label: EVENT_TYPE_LABELS[type],
        weight: EVENT_WEIGHT_MAP[type],
      })),
    []
  );

  if (!isAdmin) {
    return (
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="warning">
          This page is restricted to administrators. Please sign in with an admin account.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Popular frames (7-day window)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fetches frame-related usage events for the last 7 days, weights stronger engagement
            signals higher, and aggregates the results per frame to highlight trending content.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <Button variant="contained" onClick={handleLoad} disabled={isLoading}>
            {summary ? 'Refresh data' : 'Load data'}
          </Button>
          {isLoading ? <CircularProgress size={24} /> : null}
          {lastUpdatedAt ? (
            <Typography variant="caption" color="text.secondary">
              Updated {new Date(lastUpdatedAt).toLocaleString()}
            </Typography>
          ) : null}
          {summary ? (
            <Typography variant="caption" color="text.secondary">
              Events since {new Date(summary.cutoffIso).toLocaleString()}
            </Typography>
          ) : null}
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}

        {summary ? (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="flex-start">
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Snapshot
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      label={`Processed ${summary.processedRecords}/${summary.totalRecords}`}
                    />
                    <Chip size="small" label={`Skipped ${summary.skippedRecords}`} />
                    <Chip size="small" label={`Unique frames ${summary.uniqueFrameCount}`} />
                    <Chip size="small" label={`Unique shows ${summary.uniqueCidCount}`} />
                  </Stack>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Engagement weighting
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {weightLegend.map((entry) => (
                      <Chip
                        key={entry.type}
                        size="small"
                        label={`${entry.label}: ×${entry.weight}`}
                      />
                    ))}
                  </Stack>
                </Box>
              </Stack>

              <Divider />

              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Event totals
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {EVENT_TYPES.map((type) => (
                    <Chip
                      key={type}
                      size="small"
                      label={`${EVENT_TYPE_LABELS[type]}: ${summary.eventTypeTotals[type]}`}
                    />
                  ))}
                </Stack>
              </Box>

              {summary.cidSummaries.length ? (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Top shows by weighted engagement
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {summary.cidSummaries.map((item) => {
                      const label = showLabelMap.get(item.cid) ?? item.cid;
                      return (
                        <Tooltip
                          key={item.cid}
                          title={`Score ${formatScore(item.totalScore)} · Frames ${item.totalFrames} · Events ${item.totalEvents}`}
                        >
                          <Chip
                            size="small"
                            label={`${label} (${formatScore(item.totalScore)})`}
                            onClick={() => setSelectedCid(item.cid)}
                          />
                        </Tooltip>
                      );
                    })}
                  </Stack>
                </Box>
              ) : null}
            </Stack>
          </Paper>
        ) : null}

        {metrics ? (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 280 } }}>
              <InputLabel id="popular-frames-cid-label">Show / index</InputLabel>
              <Select
                labelId="popular-frames-cid-label"
                value={selectedCid}
                label="Show / index"
                onChange={handleCidChange}
              >
                <MenuItem value="">
                  All shows ({metrics.uniqueFrames} frames)
                </MenuItem>
                {cidOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        ) : null}

        {summary ? (
          topFrames.length ? (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={3}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  justifyContent={{ xs: 'flex-start', md: 'space-between' }}
                >
                  <Box>
                    <Typography variant="h6">
                      {selectedCid
                        ? `${showLabelMap.get(selectedCid) ?? selectedCid} — top frames`
                        : 'Top frames by weighted engagement'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Click any card to jump into the frame or editor. Scores blend all weighted
                      signals from the last 7 days.
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    color="primary"
                    label={`Showing ${topFrames.length} of ${filteredFrames.length} frames`}
                  />
                </Stack>

                <Grid container spacing={{ xs: 2, sm: 3 }}>
                  {topFrames.map((frame, index) => {
                    const rank = index + 1;
                    const showLabel = showLabelMap.get(frame.cid) ?? frame.cid;
                    const seasonEpisode = formatSeasonEpisode(frame.season, frame.episode);
                    const fineTuningLabel =
                      frame.fineTuningIndex !== undefined ? ` · FT ${frame.fineTuningIndex}` : '';
                    const framePath = buildFrameDetailPath(frame);
                    const editorPath = buildEditorPath(frame);
                    const imageUrl = buildFrameImageUrl(frame.cid, frame.season, frame.episode, frame.frame);

                    return (
                      <Grid item xs={12} sm={6} md={4} lg={3} key={frame.key}>
                        <Card
                          variant="outlined"
                          sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                        >
                          <CardActionArea component={RouterLink} to={framePath}>
                            <Box sx={{ position: 'relative', width: '100%', pt: '56.25%', bgcolor: 'grey.900' }}>
                              <CardMedia
                                component="img"
                                image={imageUrl}
                                alt={`${showLabel} ${seasonEpisode} frame ${frame.frame}`}
                                loading="lazy"
                                sx={{
                                  position: 'absolute',
                                  inset: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                              <Chip
                                size="small"
                                label={`#${rank}`}
                                sx={{
                                  position: 'absolute',
                                  top: 12,
                                  left: 12,
                                  bgcolor: 'rgba(0,0,0,0.72)',
                                  color: 'common.white',
                                  fontWeight: 600,
                                }}
                              />
                            </Box>
                          </CardActionArea>

                          <CardContent sx={{ flexGrow: 1 }}>
                            <Stack spacing={1.5}>
                              <Stack spacing={0.5}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {showLabel}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {seasonEpisode} · Frame {frame.frame}
                                  {fineTuningLabel}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Last seen:{' '}
                                  {frame.lastSeen ? new Date(frame.lastSeen).toLocaleString() : '—'}
                                </Typography>
                              </Stack>

                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip size="small" color="primary" label={`Score ${formatScore(frame.score)}`} />
                                <Chip size="small" label={`Signals ${frame.totalEvents}`} />
                                <Chip
                                  size="small"
                                  label={`Avg weight ×${frame.scorePerEvent.toFixed(2)}`}
                                />
                              </Stack>

                              <Stack spacing={1}>
                                <Typography variant="caption" color="text.secondary">
                                  Signal mix
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                  {EVENT_TYPES.map((type) =>
                                    frame.countsByType[type] ? (
                                      <Chip
                                        key={`${frame.key}-${type}`}
                                        size="small"
                                        label={`${frame.countsByType[type]} ${EVENT_TYPE_LABELS[type].toLowerCase()}`}
                                      />
                                    ) : null
                                  )}
                                </Stack>
                              </Stack>

                              {frame.topSearchTerms.length ? (
                                <Stack spacing={0.5}>
                                  <Typography variant="caption" color="text.secondary">
                                    Top searches
                                  </Typography>
                                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    {frame.topSearchTerms.map((term) => (
                                      <Chip
                                        key={`${frame.key}-search-${term.term}`}
                                        size="small"
                                        label={`${term.term} (${term.count})`}
                                      />
                                    ))}
                                  </Stack>
                                </Stack>
                              ) : null}

                              {frame.topSources.length ? (
                                <Stack spacing={0.5}>
                                  <Typography variant="caption" color="text.secondary">
                                    Frequent sources
                                  </Typography>
                                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    {frame.topSources.map((source) => (
                                      <Chip
                                        key={`${frame.key}-source-${source.source}`}
                                        size="small"
                                        label={`${source.source} (${source.count})`}
                                      />
                                    ))}
                                  </Stack>
                                </Stack>
                              ) : null}
                            </Stack>
                          </CardContent>

                          <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                            <Stack
                              direction={{ xs: 'column', sm: 'row' }}
                              spacing={1}
                              alignItems={{ xs: 'stretch', sm: 'center' }}
                              justifyContent={{ xs: 'flex-start', sm: 'space-between' }}
                              sx={{ width: '100%' }}
                            >
                              <Button
                                size="small"
                                component={RouterLink}
                                to={framePath}
                                sx={{ width: { xs: '100%', sm: 'auto' } }}
                              >
                                View frame
                              </Button>
                              <Button
                                size="small"
                                component={RouterLink}
                                to={editorPath}
                                sx={{ width: { xs: '100%', sm: 'auto' } }}
                              >
                                Open editor
                              </Button>
                              <Button
                                size="small"
                                component={Link}
                                href={imageUrl}
                                target="_blank"
                                rel="noopener"
                                endIcon={<LaunchIcon fontSize="small" />}
                                sx={{ width: { xs: '100%', sm: 'auto' } }}
                              >
                                Image
                              </Button>
                            </Stack>
                          </CardActions>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </Stack>
            </Paper>
          ) : (
            <Alert severity="info">
              No frame engagement activity within the selected window.
            </Alert>
          )
        ) : (
          <Alert severity="info">Load usage data to view popular frames.</Alert>
        )}
      </Stack>
    </Container>
  );
};

export default AdminPopularFramesPage;

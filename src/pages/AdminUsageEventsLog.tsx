import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { API, graphqlOperation, Hub } from 'aws-amplify';
import { CONNECTION_STATE_CHANGE } from '@aws-amplify/pubsub';
import {
  Alert,
  Box,
  CircularProgress,
  Collapse,
  Container,
  Divider,
  IconButton,
  Button,
  FormControl,
  FormHelperText,
  InputLabel,
  ListItemButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../UserContext';
import type { SelectChangeEvent } from '@mui/material/Select';
import { getUsageEvent, listUsageEvents, usageEventsByType } from '../graphql/queries';

const USAGE_EVENT_SUBSCRIPTION = /* GraphQL */ `
  subscription OnCreateUsageEvent {
    onCreateUsageEvent {
      id
    }
  }
`;

const GET_USAGE_EVENT_SUMMARY = /* GraphQL */ `
  query GetUsageEventSummary($id: ID!) {
    getUsageEvent(id: $id) {
      id
      eventType
      identityId
      sessionId
      createdAt
    }
  }
`;

type UsageEventSummary = {
  id: string;
  eventType?: string | null;
  identityId?: string | null;
  sessionId?: string | null;
  createdAt?: string | null;
};

type UsageEventDetail = {
  id: string;
  identityId?: string | null;
  eventType?: string | null;
  eventData?: string | null;
  sessionId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type UsageEventLogEntry = {
  id: string;
  receivedAt: string;
  summaryStatus: 'loading' | 'loaded' | 'error';
  detailStatus: 'idle' | 'loading' | 'loaded' | 'error';
  summary?: UsageEventSummary | null;
  detail?: UsageEventDetail | null;
  formattedEventData?: string;
  formattedDetail?: string;
  parsedEventData?: unknown;
  rawPayload: string;
  rawErrors?: string;
  summaryError?: string;
  detailError?: string;
};

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

type ChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

type AsyncStatus = 'idle' | 'loading' | 'loadingMore' | 'loaded' | 'error';

const MAX_EVENTS = 100;
const HISTORICAL_PAGE_SIZE = 50;
const EVENT_TYPE_SAMPLE_LIMIT = 200;
const ALL_EVENT_TYPES_OPTION = '__ALL__';
const NOAUTH_IDENTITY_PREFIX = 'noauth-';

const IDENTITY_ACCENT_COLORS = [
  '#38BDF8',
  '#F472B6',
  '#34D399',
  '#F97316',
  '#8B5CF6',
  '#22D3EE',
  '#F59E0B',
  '#6366F1',
  '#14B8A6',
  '#EF4444',
  '#A855F7',
  '#2DD4BF',
] as const;

const hashIdentityToColor = (identity: string | null | undefined): string | null => {
  if (!identity) {
    return null;
  }

  let hash = 0;
  for (let index = 0; index < identity.length; index += 1) {
    hash = (hash * 31 + identity.charCodeAt(index)) >>> 0; // simple deterministic hash
  }

  const paletteIndex = hash % IDENTITY_ACCENT_COLORS.length;
  return IDENTITY_ACCENT_COLORS[paletteIndex];
};

const EVENT_COLOR_MAP: Record<string, ChipColor> = {
  search: 'info',
  view_image: 'primary',
  view_episode: 'secondary',
  add_to_library: 'success',
  save_intent_image: 'info',
  library_upload: 'success',
  library_delete: 'warning',
  favorite_add: 'success',
  favorite_remove: 'warning',
  random_frame: 'info',
  collage_generate: 'secondary',
  view_image_advanced: 'primary',
  advanced_editor_save: 'success',
  advanced_editor_add_text_layer: 'info',
};

const normalizeEventType = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.toLowerCase() : null;
};

type EventSpecificFieldRenderer = (entry: UsageEventLogEntry) => StringEntry[];

// Spotlight event-specific payload details without overwhelming the main view.
const EVENT_SPECIFIC_FIELD_RENDERERS: Record<string, EventSpecificFieldRenderer> = {
  search: (entry) => {
    if (!entry.parsedEventData || typeof entry.parsedEventData !== 'object') {
      return [];
    }

    const data = entry.parsedEventData as Record<string, unknown>;
    const fields: StringEntry[] = [];

    const searchTerm = typeof data.searchTerm === 'string' ? data.searchTerm.trim() : '';
    if (searchTerm) {
      fields.push({ key: 'Search term', value: searchTerm });
    }

    const resolvedIndex = typeof data.resolvedIndex === 'string' ? data.resolvedIndex.trim() : '';
    if (resolvedIndex) {
      fields.push({ key: 'Resolved index', value: resolvedIndex });
    }

    return fields;
  },
};

const getEventSpecificFields = (entry: UsageEventLogEntry): StringEntry[] => {
  const typeKey = normalizeEventType(entry.detail?.eventType ?? entry.summary?.eventType ?? null);
  if (!typeKey) {
    return [];
  }

  const renderer = EVENT_SPECIFIC_FIELD_RENDERERS[typeKey];
  if (!renderer) {
    return [];
  }

  return renderer(entry);
};

const safeStringify = (input: unknown) => {
  if (input === undefined) return 'undefined';
  try {
    return JSON.stringify(input, null, 2);
  } catch (error) {
    return String(input);
  }
};

type ParsedEventDataResult = {
  formatted: string | undefined;
  parsed: unknown;
};

const parseEventData = (rawValue: string | null | undefined): ParsedEventDataResult => {
  if (rawValue === null || rawValue === undefined) {
    return { formatted: undefined, parsed: undefined };
  }

  try {
    const parsed = JSON.parse(rawValue);
    return { formatted: safeStringify(parsed), parsed };
  } catch (error) {
    return { formatted: safeStringify(rawValue), parsed: rawValue };
  }
};

type StringEntry = {
  key: string;
  value: string;
};

const extractStringEntries = (value: unknown, limit = 12): StringEntry[] => {
  const results: StringEntry[] = [];

  const visit = (node: unknown, path: string) => {
    if (results.length >= limit) {
      return;
    }

    if (typeof node === 'string') {
      const trimmed = node.trim();
      if (trimmed) {
        results.push({ key: path || 'value', value: trimmed });
      }
      return;
    }

    if (!node || typeof node !== 'object') {
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((child, index) => {
        const nextPath = path ? `${path}[${index}]` : `[${index}]`;
        visit(child, nextPath);
      });
      return;
    }

    Object.entries(node as Record<string, unknown>).forEach(([key, child]) => {
      const nextPath = path ? `${path}.${key}` : key;
      visit(child, nextPath);
    });
  };

  visit(value, '');
  return results;
};

type FieldTilesProps = {
  idPrefix: string;
  items: StringEntry[];
  emphasis?: boolean;
};

const FieldTiles: React.FC<FieldTilesProps> = ({ idPrefix, items, emphasis }) => {
  if (!items.length) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
      }}
    >
      {items.map((item, index) => (
        <Box
          key={`${idPrefix}-${index}`}
          sx={(theme) => ({
            flex: '1 1 210px',
            minWidth: 0,
            borderRadius: 1.25,
            border: `1px solid ${
              emphasis ? theme.palette.primary.light : theme.palette.divider
            }`,
            backgroundColor: emphasis
              ? theme.palette.action.selected
              : theme.palette.action.hover,
            px: { xs: 1.25, sm: 1.5 },
            py: { xs: 1, sm: 1.25 },
          })}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}
          >
            {item.key}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, wordBreak: 'break-word' }}>
            {item.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

const renderJsonBlock = (title: string, content: string | null | undefined, emptyLabel?: string) => (
  <Stack spacing={0.75}>
    <Typography
      variant="overline"
      color="text.secondary"
      sx={{ fontWeight: 700, letterSpacing: 0.8 }}
    >
      {title}
    </Typography>
    <Box
      component="pre"
      sx={(theme) => ({
        m: 0,
        p: 1.5,
        borderRadius: 1,
        backgroundColor: theme.palette.background.default,
        border: `1px solid ${theme.palette.divider}`,
        fontFamily: 'Roboto Mono, Menlo, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 13,
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      })}
    >
      {content ?? emptyLabel ?? 'No data available.'}
    </Box>
  </Stack>
);

type ConnectionStatusIndicatorProps = {
  status: ConnectionStatus;
  onRetry: () => void;
};

type ConnectionStatusPresentation = {
  label: string;
  description: string;
  color: ChipColor;
  variant: 'filled' | 'outlined';
};

const CONNECTION_STATUS_COPY: Record<ConnectionStatus, ConnectionStatusPresentation> = {
  connected: { label: 'Live', description: 'Subscription active', color: 'success', variant: 'filled' },
  connecting: { label: 'Syncing', description: 'Connecting to stream', color: 'warning', variant: 'outlined' },
  error: { label: 'Offline', description: 'Connection lost', color: 'error', variant: 'filled' },
  idle: { label: 'Idle', description: 'Waiting for events', color: 'info', variant: 'outlined' },
};

const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ status, onRetry }) => {
  const config = CONNECTION_STATUS_COPY[status];
  const showRetry = status === 'error';

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={showRetry ? 1 : 0.75}
      aria-label={config.description}
    >
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minHeight: 24 }}>
        <Box
          sx={(theme) => ({
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor:
              config.color === 'default'
                ? theme.palette.text.disabled
                : theme.palette[config.color].main,
          })}
        />
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: 'text.primary',
          }}
        >
          {config.label}
        </Typography>
      </Stack>
      {showRetry && (
        <Tooltip title="Retry connection">
          <IconButton
            size="small"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRetry();
            }}
            sx={{ p: 0.5 }}
          >
            <RefreshIcon fontSize="inherit" sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
};

type UsageEventCardProps = {
  entry: UsageEventLogEntry;
  isExpanded: boolean;
  onToggle: (eventId: string) => void;
  showEventSpecificSummary: boolean;
};

const UsageEventCard: React.FC<UsageEventCardProps> = ({ entry, isExpanded, onToggle, showEventSpecificSummary }) => {
  const normalizedType = normalizeEventType(entry.summary?.eventType ?? entry.detail?.eventType ?? null) ?? '';
  const chipColor = EVENT_COLOR_MAP[normalizedType] ?? 'default';
  const isSummaryLoading = entry.summaryStatus === 'loading';
  const hasSummaryError = entry.summaryStatus === 'error';
  const eventTypeLabel =
    entry.summaryStatus === 'loaded'
      ? formatEventTypeLabel(entry.summary?.eventType)
      : entry.summaryStatus === 'loading'
        ? 'Loading…'
        : 'Event unavailable';

  const identityRaw = entry.summary?.identityId ?? entry.detail?.identityId ?? null;
  const identityFull = identityRaw ?? 'Unknown identity';
  const isNoAuthIdentity = typeof identityRaw === 'string' && identityRaw.startsWith(NOAUTH_IDENTITY_PREFIX);
  const IdentityIconComponent = isNoAuthIdentity || !identityRaw ? HelpOutlineIcon : PersonIcon;
  const identityLabel = useMemo(() => {
    if (!identityRaw) {
      return 'Unknown identity';
    }

    if (isNoAuthIdentity) {
      const trimmed = identityRaw.trim();
      if (trimmed.length <= 12) {
        return trimmed;
      }

      return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
    }

    return shortenIdentifier(identityRaw) ?? identityRaw;
  }, [identityRaw, isNoAuthIdentity]);
  const identityAccentColor = useMemo(() => hashIdentityToColor(identityRaw), [identityRaw]);
  const timestampIso = entry.summary?.createdAt ?? entry.receivedAt;
  const timeLabel = formatTimeLabel(timestampIso);
  const fullTimestampLabel = formatTimestamp(timestampIso) ?? timestampIso ?? 'Timestamp unavailable';
  const relativeLabel = formatRelativeTimeLabel(timestampIso);
  const canSurfaceEventSummary = showEventSpecificSummary || entry.detailStatus === 'loaded';
  const eventSpecificFields = canSurfaceEventSummary ? getEventSpecificFields(entry) : [];
  const [showRawDetails, setShowRawDetails] = useState(false);

  useEffect(() => {
    setShowRawDetails(false);
  }, [entry.id]);

  const payloadStringEntries = useMemo(() => extractStringEntries(entry.parsedEventData), [entry.parsedEventData]);
  const hasRawSections = Boolean(
    entry.formattedEventData || entry.formattedDetail || entry.rawErrors || entry.rawPayload
  );

  const hasParsedFields = eventSpecificFields.length > 0 || payloadStringEntries.length > 0;

  return (
    <Box>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <ListItemButton
          onClick={() => onToggle(entry.id)}
          sx={{ p: 0 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'stretch', width: '100%' }}>
            <Box
              sx={(theme) => ({
                width: 6,
                flexShrink: 0,
                backgroundColor:
                  chipColor === 'default'
                    ? theme.palette.text.disabled
                    : theme.palette[chipColor].main,
                opacity: isSummaryLoading ? 0.35 : 1,
                transition: 'opacity 150ms ease, background-color 150ms ease',
              })}
            />
            <Stack
              spacing={1.25}
              sx={{
                width: '100%',
                minWidth: 0,
                px: { xs: 1.5, sm: 2 },
                py: { xs: 1.5, sm: 1.75 },
              }}
            >
              <Stack
                direction="row"
                alignItems="flex-start"
                justifyContent="space-between"
                spacing={1}
                sx={{ flexWrap: 'wrap', rowGap: 0.25, columnGap: 0.5 }}
              >
                <Tooltip title={identityFull} placement="top" enterTouchDelay={20}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      maxWidth: '100%',
                      minWidth: 0,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', lineHeight: 0, color: 'text.secondary' }}>
                      <IdentityIconComponent sx={{ fontSize: 16 }} />
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flexGrow: 1,
                      }}
                    >
                      <Box
                        component="span"
                        sx={(theme) => ({
                          color: identityAccentColor ?? theme.palette.text.primary,
                        })}
                      >
                        {identityLabel}
                      </Box>
                      {relativeLabel ? (
                        <Box
                          component="span"
                          sx={{
                            color: 'text.secondary',
                            fontWeight: 500,
                          }}
                        >
                          {` • ${relativeLabel}`}
                        </Box>
                      ) : null}
                    </Typography>
                  </Box>
                </Tooltip>
                <Tooltip title={fullTimestampLabel} placement="top" enterTouchDelay={20}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}
                  >
                    {timeLabel ?? '—'}
                  </Typography>
                </Tooltip>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ width: '100%', minWidth: 0 }}>
              {!isSummaryLoading && (
                <Box
                  sx={(theme) => ({
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor:
                      chipColor === 'default'
                        ? theme.palette.text.disabled
                        : theme.palette[chipColor].main,
                    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                    flexShrink: 0,
                  })}
                />
              )}
              <Tooltip title={eventTypeLabel} placement="top" enterTouchDelay={20}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    lineHeight: 1.3,
                    color: 'text.primary',
                    wordBreak: 'break-word',
                    flexGrow: 1,
                  }}
                >
                  {eventTypeLabel}
                </Typography>
              </Tooltip>
              {isSummaryLoading && <CircularProgress size={18} thickness={5} />}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'transform 150ms ease',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  color: 'text.secondary',
                  flexShrink: 0,
                }}
              >
                <ExpandMoreIcon fontSize="small" />
              </Box>
            </Stack>
          </Stack>
          </Box>
        </ListItemButton>

        {hasSummaryError && entry.summaryError && (
          <Box sx={{ px: 2, pb: 1 }}>
            <Alert severity="error" variant="outlined">
              {entry.summaryError}
            </Alert>
          </Box>
        )}

        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Divider />
          <Box sx={{ px: 2, py: 2.5 }}>
            {entry.detailStatus === 'loading' && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CircularProgress size={18} thickness={5} />
                <Typography variant="body2" color="text.secondary">
                  Loading…
                </Typography>
              </Stack>
            )}

            {entry.detailStatus === 'error' && entry.detailError && (
              <Alert severity="error" variant="outlined">
                {entry.detailError}
              </Alert>
            )}

            {entry.detailStatus === 'loaded' && entry.detail && (
              <Stack spacing={2}>
                <Stack spacing={1.5}>
                  {eventSpecificFields.length > 0 && (
                    <FieldTiles
                      idPrefix={`${entry.id}-feature`}
                      items={eventSpecificFields}
                      emphasis
                    />
                  )}

                  {payloadStringEntries.length > 0 && (
                    <FieldTiles
                      idPrefix={`${entry.id}-payload`}
                      items={payloadStringEntries}
                    />
                  )}

                  {!hasParsedFields && (
                    <Typography variant="body2" color="text.secondary">
                      No event data captured.
                    </Typography>
                  )}
                </Stack>

                {hasRawSections && (
                  <Stack spacing={1.25}>
                    <Button
                      size="small"
                      variant="text"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setShowRawDetails((prev) => !prev);
                      }}
                      sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
                    >
                      {showRawDetails ? 'Hide raw JSON' : 'Show raw JSON'}
                    </Button>
                    <Collapse in={showRawDetails} timeout="auto" unmountOnExit>
                      <Stack spacing={1.5}>
                        {renderJsonBlock(
                          'Event data (raw)',
                          entry.formattedEventData,
                          'No eventData payload was returned.'
                        )}

                        {renderJsonBlock(
                          'Record (raw)',
                          entry.formattedDetail ?? safeStringify(entry.detail),
                          'Usage event record was empty.'
                        )}

                        {entry.rawErrors &&
                          renderJsonBlock('Errors', entry.rawErrors, 'No GraphQL errors reported.')}

                        {renderJsonBlock(
                          'Subscription payload',
                          entry.rawPayload,
                          'Subscription payload was empty.'
                        )}
                      </Stack>
                    </Collapse>
                  </Stack>
                )}
              </Stack>
            )}
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
};

const formatTimestamp = (iso: string | null | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

const formatTimeLabel = (iso: string | null | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

const formatRelativeTimeLabel = (iso: string | null | undefined) => {
  if (!iso) return null;
  const date = new Date(iso);
  const timestamp = date.getTime();
  if (Number.isNaN(timestamp)) return null;

  const diff = Date.now() - timestamp;
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? 'ago' : 'from now';
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (abs < 30 * 1000) return diff >= 0 ? 'just now' : 'in a moment';
  if (abs < minute) return `${Math.round(abs / 1000)}s ${suffix}`;
  if (abs < hour) return `${Math.round(abs / minute)}m ${suffix}`;
  if (abs < day) return `${Math.round(abs / hour)}h ${suffix}`;
  if (abs < 7 * day) return `${Math.round(abs / day)}d ${suffix}`;
  return null;
};

const formatEventTypeLabel = (value: string | null | undefined) => {
  if (!value) return 'Unknown Event';
  return value
    .toLowerCase()
    .split('_')
    .map((word) => (word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word))
    .join(' ');
};

const shortenIdentifier = (value: string | null | undefined) => {
  if (!value) return null;
  return value.length <= 20 ? value : `${value.slice(0, 8)}…${value.slice(-6)}`;
};

const getEventTimestamp = (entry: UsageEventLogEntry) => {
  const primaryTimestamp = entry.summary?.createdAt ?? entry.detail?.createdAt ?? entry.receivedAt;
  if (primaryTimestamp) {
    const parsedPrimary = new Date(primaryTimestamp).getTime();
    if (!Number.isNaN(parsedPrimary)) {
      return parsedPrimary;
    }
  }

  const fallback = new Date(entry.receivedAt).getTime();
  return Number.isNaN(fallback) ? 0 : fallback;
};

export default function AdminUsageEventsLog() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [events, setEvents] = useState<UsageEventLogEntry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [subscriptionAttempt, setSubscriptionAttempt] = useState(0);
  const [eventTypeOptions, setEventTypeOptions] = useState<string[]>(() => Object.keys(EVENT_COLOR_MAP).sort());
  const [eventTypeStatus, setEventTypeStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [eventTypeError, setEventTypeError] = useState<string | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);
  const [historicalEvents, setHistoricalEvents] = useState<UsageEventLogEntry[]>([]);
  const [historicalNextToken, setHistoricalNextToken] = useState<string | null>(null);
  const [historicalStatus, setHistoricalStatus] = useState<AsyncStatus>('idle');
  const [historicalError, setHistoricalError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const addEventTypes = useCallback((types: Array<string | null | undefined>) => {
    setEventTypeOptions((prev) => {
      const normalized = new Set(prev);
      let hasChange = false;

      types.forEach((value) => {
        if (!value) return;
        const trimmed = value.trim();
        if (!trimmed || normalized.has(trimmed)) return;
        normalized.add(trimmed);
        hasChange = true;
      });

      if (!hasChange) {
        return prev;
      }

      return Array.from(normalized).sort((a, b) => a.localeCompare(b));
    });
  }, []);

  const createLogEntryFromUsageRecord = useCallback((record: UsageEventDetail): UsageEventLogEntry => {
    const { formatted: formattedEventData, parsed: parsedEventData } = parseEventData(record.eventData ?? null);

    return {
      id: record.id,
      receivedAt: record.createdAt ?? new Date().toISOString(),
      summaryStatus: 'loaded',
      detailStatus: 'loaded',
      summary: {
        id: record.id,
        eventType: record.eventType,
        identityId: record.identityId,
        sessionId: record.sessionId,
        createdAt: record.createdAt,
      },
      detail: record,
      formattedEventData,
      parsedEventData,
      formattedDetail: safeStringify(record),
      rawPayload: 'Historical fetch (subscription payload unavailable).',
    };
  }, []);

  const isAdmin = Array.isArray(user?.['cognito:groups']) && user['cognito:groups'].includes('admins');

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (user !== false && !isAdmin) {
      navigate('/', { replace: true });
    }
  }, [isAdmin, navigate, user]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    if (eventTypeStatus !== 'idle') return undefined;

    let isActive = true;

    setEventTypeStatus('loading');
    setEventTypeError(null);

    void (async () => {
      try {
        const result: any = await API.graphql(
          graphqlOperation(listUsageEvents, { limit: EVENT_TYPE_SAMPLE_LIMIT })
        );

        if (!isActive || !isMountedRef.current) {
          return;
        }

        const items = (result?.data?.listUsageEvents?.items ?? []) as UsageEventDetail[];
        addEventTypes(items.map((item) => item?.eventType ?? null));
        setEventTypeStatus('loaded');
      } catch (error) {
        if (!isActive || !isMountedRef.current) {
          return;
        }

        setEventTypeStatus('error');
        setEventTypeError(safeStringify(error));
      }
    })();

    return () => {
      isActive = false;
    };
  }, [addEventTypes, eventTypeStatus, isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      return undefined;
    }

    if (!selectedEventType) {
      setHistoricalEvents([]);
      setHistoricalNextToken(null);
      setHistoricalStatus('idle');
      setHistoricalError(null);
      return undefined;
    }

    let isActive = true;

    setHistoricalEvents([]);
    setHistoricalNextToken(null);
    setHistoricalStatus('loading');
    setHistoricalError(null);

    void (async () => {
      try {
        const response: any = await API.graphql(
          graphqlOperation(usageEventsByType, {
            eventType: selectedEventType,
            sortDirection: 'DESC',
            limit: HISTORICAL_PAGE_SIZE,
          })
        );

        if (!isActive || !isMountedRef.current) {
          return;
        }

        const connection = response?.data?.usageEventsByType;
        const items = (connection?.items ?? []) as UsageEventDetail[];
        const entries = items
          .filter((item): item is UsageEventDetail => Boolean(item?.id))
          .map(createLogEntryFromUsageRecord);

        setHistoricalEvents(entries);
        setHistoricalNextToken(connection?.nextToken ?? null);
        setHistoricalStatus('loaded');
        addEventTypes(items.map((item) => item?.eventType ?? null));
      } catch (error) {
        if (!isActive || !isMountedRef.current) {
          return;
        }

        setHistoricalStatus('error');
        setHistoricalError(safeStringify(error));
      }
    })();

    return () => {
      isActive = false;
    };
  }, [addEventTypes, createLogEntryFromUsageRecord, isAdmin, selectedEventType]);

  useEffect(() => {
    if (!isAdmin) return undefined;

    setConnectionStatus('connecting');
    setSubscriptionError(null);

    const handleHubCapsule = (capsule: any) => {
      const { payload } = capsule || {};
      if (payload?.event === CONNECTION_STATE_CHANGE) {
        const state = payload?.data?.connectionState as string | undefined;
        switch (state) {
          case 'Connected':
            setConnectionStatus('connected');
            break;
          case 'Connecting':
            setConnectionStatus('connecting');
            break;
          case 'Disconnected':
          case 'ConnectionDisrupted':
          case 'ConnectionDisruptedPendingNetwork':
          case 'ConnectedPendingDisconnect':
            setConnectionStatus('error');
            break;
          default:
            break;
        }
      }
    };

    let isActive = true;

    const observable = API.graphql(graphqlOperation(USAGE_EVENT_SUBSCRIPTION)) as any;

    if (!observable || typeof observable.subscribe !== 'function') {
      setConnectionStatus('error');
      setSubscriptionError('Subscription client not available.');
      return undefined;
    }

    Hub.listen('api', handleHubCapsule);

    const subscription = observable.subscribe({
      next: ({ value }: { value: any }) => {
        if (!isActive || !isMountedRef.current) return;

        setConnectionStatus('connected');
        const subscriptionData = value?.data?.onCreateUsageEvent;
        const subscriptionErrors = value?.errors;
        const eventId: string | undefined = subscriptionData?.id;

        const entryId = eventId || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const baseEntry: UsageEventLogEntry = {
          id: entryId,
          receivedAt: new Date().toISOString(),
          summaryStatus: eventId ? 'loading' : 'error',
          detailStatus: 'idle',
          rawPayload: safeStringify(value),
          rawErrors: subscriptionErrors?.length ? safeStringify(subscriptionErrors) : undefined,
          summaryError: eventId ? undefined : 'Subscription did not include an event id.',
        };

        setEvents((prev) => [baseEntry, ...prev].slice(0, MAX_EVENTS));

        if (!eventId) {
          return;
        }

        void (async () => {
          try {
            const result: any = await API.graphql(
              graphqlOperation(GET_USAGE_EVENT_SUMMARY, { id: eventId })
            );
            const summary = result?.data?.getUsageEvent as UsageEventSummary | null;

            if (!isActive || !isMountedRef.current) return;

            setEvents((prev) =>
              prev.map((entry) => {
                if (entry.id !== entryId) return entry;
                if (!summary) {
                  return {
                    ...entry,
                    summaryStatus: 'error',
                    summaryError: 'Usage event record was empty.',
                  };
                }
                return {
                  ...entry,
                  summaryStatus: 'loaded',
                  summary,
                  summaryError: undefined,
                };
              })
            );
          } catch (error) {
            if (!isActive || !isMountedRef.current) return;

            setEvents((prev) =>
              prev.map((entry) => {
                if (entry.id !== entryId) return entry;
                return {
                  ...entry,
                  summaryStatus: 'error',
                  summaryError: safeStringify(error),
                };
              })
            );
          }
        })();
      },
      error: (error: any) => {
        console.warn('Usage event subscription error', error);
        if (!isActive || !isMountedRef.current) return;
        setConnectionStatus('error');
        const message = error?.errors?.[0]?.message || error?.message || 'Unknown subscription error.';
        setSubscriptionError(message);
      },
    });

    return () => {
      isActive = false;
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
      Hub.remove('api', handleHubCapsule);
    };
  }, [isAdmin, subscriptionAttempt]);

  useEffect(() => {
    if (!events.length) {
      return;
    }

    addEventTypes(
      events.map((entry) => entry.summary?.eventType ?? entry.detail?.eventType ?? null)
    );
  }, [addEventTypes, events]);

  useEffect(() => {
    if (!historicalEvents.length) {
      return;
    }

    addEventTypes(
      historicalEvents.map((entry) => entry.summary?.eventType ?? entry.detail?.eventType ?? null)
    );
  }, [addEventTypes, historicalEvents]);

  const fetchEventDetail = useCallback((entryId: string) => {
    const currentEntry = events.find((event) => event.id === entryId);

    if (!currentEntry || currentEntry.detailStatus === 'loading' || currentEntry.detailStatus === 'loaded') {
      return;
    }

    const recordId = currentEntry.summary?.id ?? currentEntry.id;

    if (!recordId) {
      setEvents((prev) =>
        prev.map((entry) => {
          if (entry.id !== entryId) return entry;
          return {
            ...entry,
            detailStatus: 'error',
            detailError: 'Usage event id was unavailable.',
          };
        })
      );
      return;
    }

    setEvents((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) return entry;
        return {
          ...entry,
          detailStatus: 'loading',
          detailError: undefined,
        };
      })
    );

    void (async () => {
      try {
        const result: any = await API.graphql(
          graphqlOperation(getUsageEvent, { id: recordId })
        );
        const detail = result?.data?.getUsageEvent as UsageEventDetail | null;
        if (!isMountedRef.current) return;

        if (!detail) {
          setEvents((prev) =>
            prev.map((entry) => {
              if (entry.id !== entryId) return entry;
              return {
                ...entry,
                detailStatus: 'error',
                detailError: 'Usage event record was empty.',
              };
            })
          );
          return;
        }

        const { formatted: formattedEventData, parsed: parsedEventData } = parseEventData(detail.eventData ?? null);

        setEvents((prev) =>
          prev.map((entry) => {
            if (entry.id !== entryId) return entry;
            return {
              ...entry,
              detailStatus: 'loaded',
              detail,
              formattedEventData,
              parsedEventData,
              formattedDetail: safeStringify(detail),
              detailError: undefined,
            };
          })
        );
      } catch (error) {
        if (!isMountedRef.current) return;

        setEvents((prev) =>
          prev.map((entry) => {
            if (entry.id !== entryId) return entry;
            return {
              ...entry,
              detailStatus: 'error',
              detailError: safeStringify(error),
            };
          })
        );
      }
    })();
  }, [events]);

  const isUserLoading = user === false;

  const normalizedSelectedType = useMemo(
    () => normalizeEventType(selectedEventType),
    [selectedEventType]
  );

  const displayedEvents = useMemo(() => {
    if (!normalizedSelectedType) {
      return events;
    }

    const matchingLive = events.filter((entry) => {
      const typeFromSummary = entry.summary?.eventType?.toLowerCase();
      if (typeFromSummary) {
        return typeFromSummary === normalizedSelectedType;
      }

      const typeFromDetail = entry.detail?.eventType?.toLowerCase();
      return typeFromDetail === normalizedSelectedType;
    });

    const combined = [...historicalEvents, ...matchingLive];
    if (!combined.length) {
      return combined;
    }

    const deduped = new Map<string, UsageEventLogEntry>();

    combined.forEach((entry) => {
      const key = entry.summary?.id ?? entry.id;
      if (!key) return;
      deduped.set(key, entry);
    });

    return Array.from(deduped.values()).sort((a, b) => getEventTimestamp(b) - getEventTimestamp(a));
  }, [events, historicalEvents, normalizedSelectedType]);

  const isFilteredView = Boolean(selectedEventType);
  const isHistoricalLoading = isFilteredView && historicalStatus === 'loading';
  const isHistoricalLoadingMore = isFilteredView && historicalStatus === 'loadingMore';
  const selectedEventTypeLabel = selectedEventType ? formatEventTypeLabel(selectedEventType) : null;
  const canLoadMoreHistorical = Boolean(selectedEventType && historicalNextToken);
  const shouldShowEmptyState =
    displayedEvents.length === 0 && (!isFilteredView || (!isHistoricalLoading && !isHistoricalLoadingMore));
  const eventCountLabel = `${displayedEvents.length} event${displayedEvents.length === 1 ? '' : 's'}`;

  useEffect(() => {
    if (!normalizedSelectedType) {
      return;
    }

    displayedEvents.forEach((entry) => {
      if (entry.detailStatus !== 'idle') {
        return;
      }

      if (entry.parsedEventData !== undefined) {
        return;
      }

      const entryType = normalizeEventType(entry.summary?.eventType ?? entry.detail?.eventType ?? null);
      if (!entryType || entryType !== normalizedSelectedType) {
        return;
      }

      fetchEventDetail(entry.id);
    });
  }, [displayedEvents, fetchEventDetail, normalizedSelectedType]);

  const handleToggleExpand = (eventId: string) => {
    const isExpanding = expandedEventId !== eventId;
    setExpandedEventId(isExpanding ? eventId : null);

    if (isExpanding) {
      fetchEventDetail(eventId);
    }
  };

  const handleManualReconnect = () => {
    setConnectionStatus('connecting');
    setSubscriptionError(null);
    setSubscriptionAttempt((prev) => prev + 1);
  };

  const handleEventTypeChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    const normalized = value === ALL_EVENT_TYPES_OPTION ? null : value;
    setSelectedEventType(normalized);
    setExpandedEventId(null);
  };

  const handleLoadMoreHistorical = () => {
    if (!isAdmin) return;
    if (!selectedEventType) return;
    if (!historicalNextToken) return;
    if (historicalStatus === 'loadingMore') return;

    setHistoricalStatus('loadingMore');
    setHistoricalError(null);

    void (async () => {
      try {
        const response: any = await API.graphql(
          graphqlOperation(usageEventsByType, {
            eventType: selectedEventType,
            sortDirection: 'DESC',
            limit: HISTORICAL_PAGE_SIZE,
            nextToken: historicalNextToken,
          })
        );

        if (!isMountedRef.current) {
          return;
        }

        const connection = response?.data?.usageEventsByType;
        const items = (connection?.items ?? []) as UsageEventDetail[];
        const entries = items
          .filter((item): item is UsageEventDetail => Boolean(item?.id))
          .map(createLogEntryFromUsageRecord);

        setHistoricalEvents((prev) => {
          if (!prev.length) {
            return entries;
          }

          const knownIds = new Set(prev.map((entry) => entry.id));
          const merged = [...prev];

          entries.forEach((entry) => {
            if (knownIds.has(entry.id)) return;
            knownIds.add(entry.id);
            merged.push(entry);
          });

          return merged;
        });

        setHistoricalNextToken(connection?.nextToken ?? null);
        setHistoricalStatus('loaded');
        addEventTypes(items.map((item) => item?.eventType ?? null));
      } catch (error) {
        if (!isMountedRef.current) {
          return;
        }

        setHistoricalStatus('error');
        setHistoricalError(safeStringify(error));
      }
    })();
  };

  if (isUserLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Stack spacing={{ xs: 1.75, sm: 2.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: { xs: 'center', sm: 'center' },
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                rowGap: 1,
                columnGap: { xs: 1.5, sm: 2 },
              }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: -0.2, whiteSpace: 'nowrap' }}>
                  Usage events
                </Typography>
              </Box>

              <Box sx={{ flexShrink: 0 }}>
                <ConnectionStatusIndicator status={connectionStatus} onRetry={handleManualReconnect} />
              </Box>
            </Box>

            <FormControl
              size="small"
              fullWidth
              sx={{
                maxWidth: { sm: 260 },
              }}
              disabled={eventTypeStatus === 'loading' && eventTypeOptions.length === 0}
            >
              <InputLabel id="usage-event-type-filter-label">Event type</InputLabel>
              <Select
                labelId="usage-event-type-filter-label"
                id="usage-event-type-filter"
                label="Event type"
                value={selectedEventType ?? ALL_EVENT_TYPES_OPTION}
                onChange={handleEventTypeChange}
              >
                <MenuItem value={ALL_EVENT_TYPES_OPTION}>All events</MenuItem>
                {eventTypeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {formatEventTypeLabel(option)}
                  </MenuItem>
                ))}
              </Select>
              {eventTypeError && <FormHelperText error>{eventTypeError}</FormHelperText>}
            </FormControl>
          </Stack>
        </Paper>

        {subscriptionError && (
          <Alert severity="error" variant="outlined">
            {subscriptionError}
          </Alert>
        )}

        {isFilteredView && selectedEventTypeLabel && (
          <Alert severity="info" variant="outlined">
            Showing only {selectedEventTypeLabel} events.
          </Alert>
        )}

        {isFilteredView && historicalStatus === 'error' && historicalError && (
          <Alert severity="error" variant="outlined">
            {historicalError}
          </Alert>
        )}

        {isHistoricalLoading && (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
            <Stack spacing={2} alignItems="center">
              <CircularProgress size={22} thickness={5} />
              <Typography variant="body2" color="text.secondary">
                Loading events…
              </Typography>
            </Stack>
          </Paper>
        )}

        {shouldShowEmptyState ? (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {isFilteredView ? 'No matches' : 'No events yet'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isFilteredView
                ? 'Trigger this event or choose another type.'
                : 'Fire any tracked action to see it here.'}
            </Typography>
          </Paper>
        ) : (
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box
              sx={(theme) => ({
                px: 2,
                py: 1.25,
                borderBottom: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.default,
              })}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {eventCountLabel}
              </Typography>
            </Box>

            <Stack spacing={1.25} sx={{ px: 2, py: 2 }}>
              {displayedEvents.map((entry) => (
                <UsageEventCard
                  key={entry.id}
                  entry={entry}
                  isExpanded={expandedEventId === entry.id}
                  onToggle={handleToggleExpand}
                  showEventSpecificSummary={isFilteredView}
                />
              ))}
            </Stack>

            {isFilteredView && canLoadMoreHistorical && (
              <>
                <Divider />
                <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: { xs: 'stretch', sm: 'flex-end' } }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleLoadMoreHistorical}
                    disabled={isHistoricalLoadingMore}
                  >
                    {isHistoricalLoadingMore ? 'Loading…' : 'Load more history'}
                  </Button>
                </Box>
              </>
            )}
          </Paper>
        )}
      </Stack>
    </Container>
  );
}

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { API, graphqlOperation, Hub } from 'aws-amplify';
import { CONNECTION_STATE_CHANGE } from '@aws-amplify/pubsub';
import {
  Alert,
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Divider,
  IconButton,
  Button,
  Checkbox,
  FormHelperText,
  ListItemButton,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../UserContext';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
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

type AsyncStatus = 'idle' | 'loading' | 'loaded' | 'error';

type HistoricalCollectionState = {
  eventsByType: Record<string, UsageEventLogEntry[]>;
  combined: UsageEventLogEntry[];
  status: AsyncStatus;
  error: string | null;
  cutoffIso: string | null;
};

const MAX_EVENTS = 100;
const HISTORICAL_PAGE_SIZE = 100;
const EVENT_TYPE_SAMPLE_LIMIT = 200;
const HISTORICAL_MAX_PAGES = 200;
const INITIAL_VISIBLE_COUNT = 25;
const LOAD_MORE_STEP = 25;
const EVENT_TAG_LIMIT = 3;
const MAX_SELECTED_EVENT_TYPES = 5;
const NOAUTH_IDENTITY_PREFIX = 'noauth-';

type TimeRangeKey = '5m' | '1h' | '24h' | '7d';

type TimeRangeOption = {
  value: TimeRangeKey;
  label: string;
  durationMs: number;
  shortLabel: string;
};

const TIME_RANGE_OPTIONS: readonly TimeRangeOption[] = [
  { value: '5m', label: 'Last 5 minutes', shortLabel: '5m', durationMs: 5 * 60 * 1000 },
  { value: '1h', label: 'Last hour', shortLabel: '1h', durationMs: 60 * 60 * 1000 },
  { value: '24h', label: 'Last 24 hours', shortLabel: '24h', durationMs: 24 * 60 * 60 * 1000 },
  { value: '7d', label: 'Last 7 days', shortLabel: '7d', durationMs: 7 * 24 * 60 * 60 * 1000 },
];

const DEFAULT_TIME_RANGE: TimeRangeKey = '5m';
const DEFAULT_TIME_RANGE_OPTION =
  TIME_RANGE_OPTIONS.find((option) => option.value === DEFAULT_TIME_RANGE) ?? TIME_RANGE_OPTIONS[0];

const STORAGE_KEYS = {
  timeRange: 'adminUsageEvents.timeRange',
  eventTypes: 'adminUsageEvents.eventTypes',
};

const GOLDEN_RATIO_CONJUGATE = 0.618033988749895;

const hslChannelToHex = (channel: number) => {
  const bounded = Math.max(0, Math.min(255, Math.round(channel)));
  return bounded.toString(16).padStart(2, '0');
};

const hslToHex = (hue: number, saturation: number, lightness: number) => {
  const s = saturation / 100;
  const l = lightness / 100;
  const k = (n: number) => (n + hue / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => l - a * Math.max(-1, Math.min(Math.min(k(n) - 3, 9 - k(n)), 1));

  const r = hslChannelToHex(255 * channel(0));
  const g = hslChannelToHex(255 * channel(8));
  const b = hslChannelToHex(255 * channel(4));

  return `#${r}${g}${b}`.toUpperCase();
};

const createIdentityAccentPalette = (count: number) => {
  const palette: string[] = [];
  let hue = 0.127318; // deterministic seed keeps distribution stable across reloads
  const variants = [
    { saturation: 86, lightness: 56 },
    { saturation: 76, lightness: 61 },
    { saturation: 90, lightness: 52 },
    { saturation: 72, lightness: 64 },
    { saturation: 82, lightness: 58 },
    { saturation: 70, lightness: 66 },
    { saturation: 88, lightness: 54 },
    { saturation: 78, lightness: 62 },
  ];

  for (let index = 0; index < count; index += 1) {
    hue = (hue + GOLDEN_RATIO_CONJUGATE) % 1;
    const variant = variants[(index * 5) % variants.length];
    const hueDegrees = (hue * 360 + 360) % 360;
    palette.push(hslToHex(hueDegrees, variant.saturation, variant.lightness));
  }

  return palette;
};

const IDENTITY_ACCENT_COLORS = createIdentityAccentPalette(96);

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

const ICON_CONTRAST_LUMINANCE_THRESHOLD = 0.6;

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const normalized = hex.trim().replace(/^#/, '');

  if (normalized.length !== 6 || /[^0-9a-fA-F]/.test(normalized)) {
    return null;
  }

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return null;
  }

  return { r, g, b };
};

const calculateRelativeLuminance = (hex: string): number | null => {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    return null;
  }

  const normalizeChannel = (channel: number) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };

  const r = normalizeChannel(rgb.r);
  const g = normalizeChannel(rgb.g);
  const b = normalizeChannel(rgb.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const isHexColorLight = (hex: string): boolean => {
  const luminance = calculateRelativeLuminance(hex);

  if (luminance === null) {
    return false;
  }

  return luminance > ICON_CONTRAST_LUMINANCE_THRESHOLD;
};

const logStorageWarning = (message: string, error: unknown) => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(message, error);
  }
};

const readStoredTimeRange = (): TimeRangeKey => {
  if (typeof window === 'undefined') {
    return DEFAULT_TIME_RANGE;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.timeRange) as TimeRangeKey | null;
    if (stored && TIME_RANGE_OPTIONS.some((option) => option.value === stored)) {
      return stored;
    }
  } catch (error) {
    logStorageWarning('Failed to read stored usage event time range', error);
  }

  return DEFAULT_TIME_RANGE;
};

const sanitizeEventTypeList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item): item is string => Boolean(item));

  return Array.from(new Set(normalized));
};

const readStoredEventTypes = (): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.eventTypes);
    if (!raw) {
      return [];
    }

    const parsed = sanitizeEventTypeList(JSON.parse(raw));
    return parsed.slice(0, MAX_SELECTED_EVENT_TYPES);
  } catch (error) {
    logStorageWarning('Failed to read stored usage event type filters', error);
    return [];
  }
};

const getStoredEventTypeState = () => {
  const types = readStoredEventTypes();
  const cappedTypes = types.slice(0, MAX_SELECTED_EVENT_TYPES);
  return {
    types: cappedTypes,
    isAll: cappedTypes.length === 0,
  };
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
  filter_recommendation_impression: 'info',
  filter_recommendation_accept: 'success',
  filter_recommendation_deny: 'warning',
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
  filter_recommendation_impression: (entry) => {
    if (!entry.parsedEventData || typeof entry.parsedEventData !== 'object') {
      return [];
    }

    const data = entry.parsedEventData as Record<string, unknown>;
    const fields: StringEntry[] = [];

    const recommendedFilterName = typeof data.recommendedFilterName === 'string' ? data.recommendedFilterName.trim() : '';
    if (recommendedFilterName) {
      fields.push({ key: 'Recommended', value: recommendedFilterName });
    }

    const searchTerm = typeof data.searchTerm === 'string' ? data.searchTerm.trim() : '';
    if (searchTerm) {
      fields.push({ key: 'Search term', value: searchTerm });
    }

    const currentFilterId = typeof data.currentFilterId === 'string' ? data.currentFilterId.trim() : '';
    if (currentFilterId) {
      fields.push({ key: 'Current filter', value: currentFilterId });
    }

    return fields;
  },
  filter_recommendation_accept: (entry) => {
    if (!entry.parsedEventData || typeof entry.parsedEventData !== 'object') {
      return [];
    }

    const data = entry.parsedEventData as Record<string, unknown>;
    const fields: StringEntry[] = [];

    const recommendedFilterName = typeof data.recommendedFilterName === 'string' ? data.recommendedFilterName.trim() : '';
    if (recommendedFilterName) {
      fields.push({ key: 'Accepted', value: recommendedFilterName });
    }

    const searchTerm = typeof data.searchTerm === 'string' ? data.searchTerm.trim() : '';
    if (searchTerm) {
      fields.push({ key: 'Search term', value: searchTerm });
    }

    return fields;
  },
  filter_recommendation_deny: (entry) => {
    if (!entry.parsedEventData || typeof entry.parsedEventData !== 'object') {
      return [];
    }

    const data = entry.parsedEventData as Record<string, unknown>;
    const fields: StringEntry[] = [];

    const recommendedFilterName = typeof data.recommendedFilterName === 'string' ? data.recommendedFilterName.trim() : '';
    if (recommendedFilterName) {
      fields.push({ key: 'Dismissed', value: recommendedFilterName });
    }

    const searchTerm = typeof data.searchTerm === 'string' ? data.searchTerm.trim() : '';
    if (searchTerm) {
      fields.push({ key: 'Search term', value: searchTerm });
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
        <IconButton
          size="small"
          aria-label="Retry connection"
          title="Retry connection"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRetry();
          }}
          sx={{ p: 0.5 }}
        >
          <RefreshIcon fontSize="inherit" sx={{ fontSize: 18 }} />
        </IconButton>
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
      if (trimmed.length <= 6) {
        return trimmed;
      }

      return trimmed.slice(-6);
    }

    return shortenIdentifier(identityRaw) ?? identityRaw;
  }, [identityRaw, isNoAuthIdentity]);
  const identityAccentColor = useMemo(() => hashIdentityToColor(identityRaw), [identityRaw]);
  const isIdentityAccentLight = useMemo(
    () => (identityAccentColor ? isHexColorLight(identityAccentColor) : false),
    [identityAccentColor]
  );
  const timestampIso = entry.summary?.createdAt ?? entry.receivedAt;
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
                backgroundColor: identityAccentColor ?? theme.palette.grey[600],
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
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
                sx={{ flexWrap: 'wrap', rowGap: 0.25, columnGap: 0.5 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    maxWidth: '100%',
                    minWidth: 0,
                    gap: 0.5,
                  }}
                  title={identityFull}
                >
                  <Box
                    sx={(theme) => {
                      const backgroundColor = identityAccentColor ?? theme.palette.text.secondary;
                      const contrastColor = identityAccentColor
                        ? isIdentityAccentLight
                          ? theme.palette.common.black
                          : theme.palette.common.white
                        : theme.palette.common.white;

                      return {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 0,
                        flexShrink: 0,
                        color: contrastColor,
                        backgroundColor,
                        borderRadius: '50%',
                        width: 22,
                        height: 22,
                        transition: 'background-color 150ms ease, color 150ms ease',
                      };
                    }}
                  >
                    <IdentityIconComponent sx={{ fontSize: 16 }} />
                  </Box>
                  <Typography
                    variant="body2"
                    sx={(theme) => ({
                      fontWeight: 600,
                      color: identityAccentColor ?? theme.palette.text.primary,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      transition: 'color 150ms ease',
                    })}
                  >
                    {identityLabel}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}
                  title={fullTimestampLabel}
                >
                  {relativeLabel ?? '—'}
                </Typography>
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
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 600,
                    lineHeight: 1.3,
                    color: 'text.primary',
                    wordBreak: 'break-word',
                    flexGrow: 1,
                  }}
                  title={eventTypeLabel}
                >
                  {eventTypeLabel}
                </Typography>
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

const formatEventTypeList = (labels: string[]) => {
  if (labels.length <= 1) {
    return labels.join('');
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  const last = labels[labels.length - 1];
  return `${labels.slice(0, -1).join(', ')}, and ${last}`;
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

const entryIsAfterCutoff = (entry: UsageEventLogEntry, cutoffIso: string | null | undefined) => {
  if (!cutoffIso) {
    return true;
  }

  const cutoffTimestamp = new Date(cutoffIso).getTime();
  if (Number.isNaN(cutoffTimestamp)) {
    return true;
  }

  return getEventTimestamp(entry) >= cutoffTimestamp;
};

export default function AdminUsageEventsLog() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const storedEventTypeStateRef = useRef(getStoredEventTypeState());
  const storedEventTypeState = storedEventTypeStateRef.current;
  const [events, setEvents] = useState<UsageEventLogEntry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [subscriptionAttempt, setSubscriptionAttempt] = useState(0);
  const [eventTypeOptions, setEventTypeOptions] = useState<string[]>(() => {
    const seeded = new Set(Object.keys(EVENT_COLOR_MAP));
    storedEventTypeState.types.forEach((type) => {
      if (type) {
        seeded.add(type);
      }
    });
    return Array.from(seeded).sort((a, b) => a.localeCompare(b));
  });
  const [eventTypeStatus, setEventTypeStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [eventTypeError, setEventTypeError] = useState<string | null>(null);
  const [eventTypeSelectionError, setEventTypeSelectionError] = useState<string | null>(null);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>(storedEventTypeState.types);
  const [isAllTypesSelected, setIsAllTypesSelected] = useState(storedEventTypeState.isAll);
  const [historicalState, setHistoricalState] = useState<HistoricalCollectionState>({
    eventsByType: {},
    combined: [],
    status: 'idle',
    error: null,
    cutoffIso: null,
  });
  const fetchContextRef = useRef({ generation: 0, key: '' });
  const previousSelectionKeyRef = useRef<string>('');
  const [timeRange, setTimeRange] = useState<TimeRangeKey>(() => readStoredTimeRange());
  const isMountedRef = useRef(true);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

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
    if (isAllTypesSelected) {
      return;
    }

    setSelectedEventTypes((prev) => {
      const filtered = prev.filter((type) => eventTypeOptions.includes(type));
      const capped = filtered.slice(0, MAX_SELECTED_EVENT_TYPES);

      if (capped.length === 0) {
        setIsAllTypesSelected(true);
        setEventTypeSelectionError(null);
        return [];
      }

      if (capped.length === prev.length) {
        let unchanged = true;
        for (let index = 0; index < capped.length; index += 1) {
          if (capped[index] !== prev[index]) {
            unchanged = false;
            break;
          }
        }
        if (unchanged) {
          return prev;
        }
      }

      return capped;
    });
  }, [eventTypeOptions, isAllTypesSelected]);

  const selectedTimeRangeOption = useMemo(() => {
    return TIME_RANGE_OPTIONS.find((option) => option.value === timeRange) ?? DEFAULT_TIME_RANGE_OPTION;
  }, [timeRange]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEYS.timeRange, timeRange);
    } catch (error) {
      logStorageWarning('Failed to persist usage event time range', error);
    }
  }, [timeRange]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      if (isAllTypesSelected || selectedEventTypes.length === 0) {
        window.localStorage.removeItem(STORAGE_KEYS.eventTypes);
      } else {
        window.localStorage.setItem(
          STORAGE_KEYS.eventTypes,
          JSON.stringify(selectedEventTypes)
        );
      }
    } catch (error) {
      logStorageWarning('Failed to persist usage event type filters', error);
    }
  }, [isAllTypesSelected, selectedEventTypes]);

  const historicalCutoffIso = useMemo(() => {
    const windowMs = selectedTimeRangeOption.durationMs;
    return new Date(Date.now() - windowMs).toISOString();
  }, [selectedTimeRangeOption]);

  const effectiveSelectedEventTypes = useMemo(() => {
    if (isAllTypesSelected) {
      return eventTypeOptions;
    }

    if (!selectedEventTypes.length) {
      return [];
    }

    const allowed = new Set(eventTypeOptions);
    return selectedEventTypes.filter((type) => allowed.has(type));
  }, [eventTypeOptions, isAllTypesSelected, selectedEventTypes]);

  const historicalSelectionKey = useMemo(() => {
    if (!isAdmin) {
      return 'no-admin';
    }

    if (!effectiveSelectedEventTypes.length) {
      return 'no-selection';
    }

    return `${effectiveSelectedEventTypes.join('|')}|${historicalCutoffIso}`;
  }, [effectiveSelectedEventTypes, historicalCutoffIso, isAdmin]);

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

  const loadEventsForType = useCallback(
    async (eventType: string, cutoffIso: string, generation: number): Promise<UsageEventLogEntry[]> => {
      const collected: UsageEventLogEntry[] = [];
      let nextToken: string | null = null;
      const seenTokens = new Set<string>();

      for (let page = 0; page < HISTORICAL_MAX_PAGES; page += 1) {
        if (!isMountedRef.current || fetchContextRef.current.generation !== generation) {
          break;
        }

        if (page > 0) {
          if (!nextToken) {
            break;
          }

          if (seenTokens.has(nextToken)) {
            break;
          }

          seenTokens.add(nextToken);
        }

        const variables: Record<string, unknown> = {
          eventType,
          sortDirection: 'DESC',
          limit: HISTORICAL_PAGE_SIZE,
          createdAt: { ge: cutoffIso },
        };

        if (page > 0 && nextToken) {
          variables.nextToken = nextToken;
        }

        const response: any = await API.graphql(
          graphqlOperation(usageEventsByType, variables)
        );

        const connection = response?.data?.usageEventsByType;
        const items = (connection?.items ?? []) as UsageEventDetail[];

        if (!Array.isArray(items) || !items.length) {
          nextToken = connection?.nextToken ?? null;
          if (!nextToken) {
            break;
          }
          continue;
        }

        const entries = items
          .filter((item): item is UsageEventDetail => Boolean(item?.id))
          .map(createLogEntryFromUsageRecord)
          .filter((entry) => entryIsAfterCutoff(entry, cutoffIso));

        if (entries.length) {
          collected.push(...entries);
        }

        nextToken = connection?.nextToken ?? null;

        if (!nextToken) {
          break;
        }
      }

      if (collected.length <= 1) {
        return collected;
      }

      const deduped = new Map<string, UsageEventLogEntry>();

      collected.forEach((entry) => {
        const key = entry.summary?.id ?? entry.id;
        if (!key) {
          return;
        }

        const current = deduped.get(key);
        if (!current || getEventTimestamp(entry) > getEventTimestamp(current)) {
          deduped.set(key, entry);
        }
      });

      return Array.from(deduped.values()).sort((a, b) => getEventTimestamp(b) - getEventTimestamp(a));
    },
    [createLogEntryFromUsageRecord]
  );

  useEffect(() => {
    if (previousSelectionKeyRef.current !== historicalSelectionKey) {
      fetchContextRef.current = {
        generation: fetchContextRef.current.generation + 1,
        key: historicalSelectionKey,
      };
      previousSelectionKeyRef.current = historicalSelectionKey;
    }

    if (!isAdmin || !effectiveSelectedEventTypes.length) {
      setHistoricalState((prev) => {
        if (prev.status === 'idle' && !prev.combined.length && !prev.error) {
          return prev;
        }
        return {
          eventsByType: {},
          combined: [],
          status: 'idle',
          error: null,
          cutoffIso: historicalCutoffIso,
        };
      });
      setVisibleCount(INITIAL_VISIBLE_COUNT);
      return;
    }

    const generation = fetchContextRef.current.generation;

    setHistoricalState({
      eventsByType: {},
      combined: [],
      status: 'loading',
      error: null,
      cutoffIso: historicalCutoffIso,
    });
    setVisibleCount(INITIAL_VISIBLE_COUNT);

    let cancelled = false;

    void (async () => {
      const results: Record<string, UsageEventLogEntry[]> = {};
      const discoveredEventTypes: (string | null | undefined)[] = [];
      const errors: string[] = [];

      for (const eventType of effectiveSelectedEventTypes) {
        if (!isMountedRef.current || fetchContextRef.current.generation !== generation || cancelled) {
          return;
        }

        try {
          const entries = await loadEventsForType(eventType, historicalCutoffIso, generation);
          results[eventType] = entries;
          entries.forEach((entry) => {
            discoveredEventTypes.push(
              entry.summary?.eventType ?? entry.detail?.eventType ?? null
            );
          });
        } catch (error) {
          errors.push(safeStringify(error));
          results[eventType] = [];
        }
      }

      if (!isMountedRef.current || fetchContextRef.current.generation !== generation || cancelled) {
        return;
      }

      const combinedMap = new Map<string, UsageEventLogEntry>();

      Object.values(results).forEach((entries) => {
        entries.forEach((entry) => {
          const key = entry.summary?.id ?? entry.id;
          if (!key) {
            return;
          }

          const current = combinedMap.get(key);
          if (!current || getEventTimestamp(entry) > getEventTimestamp(current)) {
            combinedMap.set(key, entry);
          }
        });
      });

      const combined = Array.from(combinedMap.values()).sort(
        (a, b) => getEventTimestamp(b) - getEventTimestamp(a)
      );

      setHistoricalState({
        eventsByType: results,
        combined,
        status: errors.length ? 'error' : 'loaded',
        error: errors[0] ?? null,
        cutoffIso: historicalCutoffIso,
      });

      if (discoveredEventTypes.length) {
        addEventTypes(discoveredEventTypes);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    addEventTypes,
    effectiveSelectedEventTypes,
    historicalCutoffIso,
    historicalSelectionKey,
    isAdmin,
    loadEventsForType,
  ]);

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
    const collections = Object.values(historicalState.eventsByType);
    if (!collections.length) {
      return;
    }

    const eventTypes = collections.flatMap((collection) =>
      collection.map((entry) => entry.summary?.eventType ?? entry.detail?.eventType ?? null)
    );

    if (!eventTypes.length) {
      return;
    }

    addEventTypes(eventTypes);
  }, [addEventTypes, historicalState.eventsByType]);

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

  const normalizedSelectedTypes = useMemo(
    () =>
      effectiveSelectedEventTypes
        .map((type) => normalizeEventType(type))
        .filter((type): type is string => Boolean(type)),
    [effectiveSelectedEventTypes]
  );

  const cutoffTimestamp = useMemo(
    () => Date.now() - selectedTimeRangeOption.durationMs,
    [selectedTimeRangeOption.durationMs]
  );

  const combinedEvents = useMemo(() => {
    const liveWithinWindow = events.filter((entry) => getEventTimestamp(entry) >= cutoffTimestamp);

    if (!normalizedSelectedTypes.length) {
      return isAllTypesSelected ? liveWithinWindow : [];
    }

    const selectedTypeSet = new Set(normalizedSelectedTypes);

    const historicalMatches = historicalState.combined.filter((entry) => {
      if (getEventTimestamp(entry) < cutoffTimestamp) {
        return false;
      }

      const summaryType = normalizeEventType(entry.summary?.eventType ?? null);
      if (summaryType && selectedTypeSet.has(summaryType)) {
        return true;
      }

      const detailType = normalizeEventType(entry.detail?.eventType ?? null);
      return Boolean(detailType && selectedTypeSet.has(detailType));
    });

    const liveMatches = liveWithinWindow.filter((entry) => {
      const summaryType = normalizeEventType(entry.summary?.eventType ?? null);
      if (summaryType && selectedTypeSet.has(summaryType)) {
        return true;
      }

      const detailType = normalizeEventType(entry.detail?.eventType ?? null);
      return Boolean(detailType && selectedTypeSet.has(detailType));
    });

    if (!historicalMatches.length && !liveMatches.length) {
      return [];
    }

    const deduped = new Map<string, UsageEventLogEntry>();

    [...historicalMatches, ...liveMatches].forEach((entry) => {
      const key = entry.summary?.id ?? entry.id;
      if (!key) {
        return;
      }

      const existing = deduped.get(key);
      if (!existing || getEventTimestamp(entry) > getEventTimestamp(existing)) {
        deduped.set(key, entry);
      }
    });

    return Array.from(deduped.values()).sort((a, b) => getEventTimestamp(b) - getEventTimestamp(a));
  }, [
    cutoffTimestamp,
    events,
    historicalState.combined,
    isAllTypesSelected,
    normalizedSelectedTypes,
  ]);

  const totalEventCount = combinedEvents.length;

  const uniqueUserCount = useMemo(() => {
    if (!combinedEvents.length) {
      return 0;
    }

    const userIds = new Set<string>();

    combinedEvents.forEach((entry) => {
      const identity = entry.summary?.identityId ?? entry.detail?.identityId ?? null;
      if (!identity || typeof identity !== 'string') {
        return;
      }

      const trimmed = identity.trim();
      if (trimmed) {
        userIds.add(trimmed);
      }
    });

    return userIds.size;
  }, [combinedEvents]);

  const displayedEvents = useMemo(() => {
    if (!totalEventCount) {
      return combinedEvents;
    }

    return combinedEvents.slice(0, visibleCount);
  }, [combinedEvents, totalEventCount, visibleCount]);

  const hasSelection = normalizedSelectedTypes.length > 0;
  const isCustomSelection = !isAllTypesSelected && selectedEventTypes.length > 0;
  const isHistoricalLoading = hasSelection && historicalState.status === 'loading';
  const historicalErrorMessage = hasSelection ? historicalState.error : null;
  const canLoadMoreHistorical = hasSelection && visibleCount < totalEventCount;
  const shouldShowEmptyState =
    totalEventCount === 0 && (!hasSelection || (!isHistoricalLoading && !historicalErrorMessage));
  const eventCountLabel = `${totalEventCount} event${totalEventCount === 1 ? '' : 's'}`;
  const userCountLabel = `${uniqueUserCount} user${uniqueUserCount === 1 ? '' : 's'}`;

  useEffect(() => {
    if (!normalizedSelectedTypes.length) {
      return;
    }

    const selectedTypeSet = new Set(normalizedSelectedTypes);

    displayedEvents.forEach((entry) => {
      if (entry.detailStatus !== 'idle') {
        return;
      }

      if (entry.parsedEventData !== undefined) {
        return;
      }

      const summaryType = normalizeEventType(entry.summary?.eventType ?? null);
      const detailType = normalizeEventType(entry.detail?.eventType ?? null);

      if (
        (summaryType && selectedTypeSet.has(summaryType)) ||
        (detailType && selectedTypeSet.has(detailType))
      ) {
        fetchEventDetail(entry.id);
      }
    });
  }, [displayedEvents, fetchEventDetail, normalizedSelectedTypes]);

  const customSelectedEventTypeLabels = useMemo(
    () => selectedEventTypes.map((type) => formatEventTypeLabel(type)),
    [selectedEventTypes]
  );

  const selectedEventTypesSummary = useMemo(() => {
    if (!isCustomSelection || !customSelectedEventTypeLabels.length) {
      return null;
    }

    if (customSelectedEventTypeLabels.length === 1) {
      return `Showing only ${customSelectedEventTypeLabels[0]} events.`;
    }

    if (customSelectedEventTypeLabels.length <= 3) {
      return `Showing ${customSelectedEventTypeLabels.length} event types: ${formatEventTypeList(customSelectedEventTypeLabels)}.`;
    }

    const visible = customSelectedEventTypeLabels.slice(0, 2);
    const remaining = customSelectedEventTypeLabels.length - visible.length;
    return `Showing ${customSelectedEventTypeLabels.length} event types: ${visible.join(', ')}, and ${remaining} more.`;
  }, [customSelectedEventTypeLabels, isCustomSelection]);

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

  const handleTimeRangeChange = (_event: React.SyntheticEvent, nextValue: TimeRangeKey | null) => {
    if (!nextValue || nextValue === timeRange) {
      return;
    }

    const isSupported = TIME_RANGE_OPTIONS.some((option) => option.value === nextValue);
    if (!isSupported) {
      return;
    }

    setTimeRange(nextValue);
    setExpandedEventId(null);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  const handleEventTypeChange = (_event: React.SyntheticEvent, newValue: string[]) => {
    const uniqueSelection = Array.from(new Set(newValue));

    if (!uniqueSelection.length) {
      setIsAllTypesSelected(true);
      setSelectedEventTypes([]);
      setEventTypeSelectionError(null);
      setExpandedEventId(null);
      setVisibleCount(INITIAL_VISIBLE_COUNT);
      return;
    }

    const cappedSelection = uniqueSelection.slice(0, MAX_SELECTED_EVENT_TYPES);

    if (cappedSelection.length < uniqueSelection.length) {
      setEventTypeSelectionError(`Select up to ${MAX_SELECTED_EVENT_TYPES} event types.`);
    } else {
      setEventTypeSelectionError(null);
    }

    setIsAllTypesSelected(false);
    setSelectedEventTypes(cappedSelection);
    setExpandedEventId(null);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  const handleLoadMoreHistorical = () => {
    setVisibleCount((prev) => prev + LOAD_MORE_STEP);
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

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 1.5, sm: 2.5 }}
              sx={{ width: '100%' }}
            >
              <Box sx={{ flex: 1, minWidth: 0, maxWidth: { sm: 260 } }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.75, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.6 }}
                >
                  Time range
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  value={timeRange}
                  onChange={handleTimeRangeChange}
                  size="small"
                  aria-label="Usage events time range"
                  sx={{
                    flexWrap: 'nowrap',
                    overflowX: 'auto',
                    px: 0.5,
                    pb: 0.5,
                    mx: -0.5,
                    gap: 0.75,
                    '&::-webkit-scrollbar': { display: 'none' },
                    scrollbarWidth: 'none',
                    '& .MuiToggleButton-root': {
                      flex: '0 0 auto',
                      minWidth: 72,
                      fontWeight: 600,
                    },
                    '& .MuiToggleButtonGroup-grouped:not(:first-of-type)': {
                      marginLeft: 0,
                      borderLeft: (theme) => `1px solid ${theme.palette.divider}`,
                    },
                    '& .MuiToggleButtonGroup-grouped': {
                      borderRadius: 1,
                    },
                  }}
                >
                  {TIME_RANGE_OPTIONS.map((option) => (
                    <ToggleButton key={option.value} value={option.value} aria-label={option.label}>
                      {option.shortLabel}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              <Box sx={{ flex: 1, minWidth: 0, maxWidth: { sm: 320 } }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.75, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.6 }}
                >
                  Event types
                </Typography>
                <Autocomplete
                  multiple
                  options={eventTypeOptions}
                  value={isAllTypesSelected ? [] : selectedEventTypes}
                  onChange={handleEventTypeChange}
                  size="small"
                  disableCloseOnSelect
                  limitTags={2}
                  disabled={eventTypeStatus === 'loading' && eventTypeOptions.length === 0}
                  filterSelectedOptions={false}
                  loading={eventTypeStatus === 'loading'}
                  loadingText="Loading event types…"
                  noOptionsText="No event types found"
                  renderOption={(props, option, { selected }) => (
                    <li {...props}>
                      <Checkbox
                        icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                        checkedIcon={<CheckBoxIcon fontSize="small" />}
                        sx={{ mr: 1 }}
                        checked={selected}
                        disableRipple
                      />
                      {formatEventTypeLabel(option)}
                    </li>
                  )}
                  getOptionLabel={(option) => formatEventTypeLabel(option)}
                  ChipProps={{ size: 'small' }}
                  renderTags={(value, getTagProps) => {
                    if (isAllTypesSelected || value.length === 0) {
                      return [
                        <Chip
                          key="all-events"
                          label="All events"
                          size="small"
                          color="default"
                          sx={{ fontWeight: 600 }}
                        />,
                      ];
                    }

                    const visible = value.slice(0, EVENT_TAG_LIMIT);
                    const extraCount = value.length - visible.length;

                    const chips = visible.map((option, index) => (
                      <Chip
                        label={formatEventTypeLabel(option)}
                        size="small"
                        {...getTagProps({ index })}
                        key={option}
                      />
                    ));

                    if (extraCount > 0) {
                      chips.push(
                        <Chip
                          key="event-type-overflow"
                          label={`+${extraCount}`}
                          size="small"
                        />
                      );
                    }

                    return chips;
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Event types"
                      placeholder={
                        isAllTypesSelected ? 'All events' : `Select up to ${MAX_SELECTED_EVENT_TYPES} event types`
                      }
                      inputProps={{
                        ...params.inputProps,
                        readOnly: true,
                      }}
                      sx={{
                        '& .MuiInputBase-root': {
                          cursor: 'pointer',
                        },
                        '& .MuiInputBase-input': {
                          cursor: 'pointer',
                          caretColor: 'transparent',
                        },
                      }}
                    />
                  )}
                />
                {(eventTypeSelectionError || eventTypeError) && (
                  <FormHelperText error sx={{ mt: 0.75 }}>
                    {eventTypeSelectionError ?? eventTypeError}
                  </FormHelperText>
                )}
              </Box>
            </Stack>
          </Stack>
        </Paper>

        {subscriptionError && (
          <Alert severity="error" variant="outlined">
            {subscriptionError}
          </Alert>
        )}

        {isCustomSelection && selectedEventTypesSummary && (
          <Alert severity="info" variant="outlined">
            {selectedEventTypesSummary}
          </Alert>
        )}

        {hasSelection && historicalErrorMessage && (
          <Alert severity="error" variant="outlined">
            {historicalErrorMessage}
          </Alert>
        )}

        {isHistoricalLoading && (
          <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
            <Stack spacing={2.5} alignItems="center">
              <CircularProgress size={32} thickness={4} />
              <Stack spacing={0.5} alignItems="center">
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Preparing event timeline…
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>
                  Gathering usage records for the selected time range.
                </Typography>
              </Stack>
            </Stack>
          </Paper>
        )}

        {shouldShowEmptyState ? (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {isCustomSelection ? 'No matches' : 'No events yet'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isCustomSelection
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
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 0.25, sm: 1 }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {eventCountLabel}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  {userCountLabel}
                </Typography>
              </Stack>
            </Box>

            <Stack spacing={1.25} sx={{ px: 2, py: 2 }}>
              {displayedEvents.map((entry) => (
                <UsageEventCard
                  key={entry.id}
                  entry={entry}
                  isExpanded={expandedEventId === entry.id}
                  onToggle={handleToggleExpand}
                  showEventSpecificSummary={isCustomSelection}
                />
              ))}
            </Stack>

            {hasSelection && canLoadMoreHistorical && (
              <>
                <Divider />
                <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: { xs: 'stretch', sm: 'flex-end' } }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleLoadMoreHistorical}
                  >
                    Load more history
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

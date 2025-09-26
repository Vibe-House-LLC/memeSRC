import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { API, graphqlOperation, Hub } from 'aws-amplify';
import { CONNECTION_STATE_CHANGE } from '@aws-amplify/pubsub';
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  FormControl,
  FormHelperText,
  Divider,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, keyframes, useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
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

type EventSpecificSummaryRenderer = (entry: UsageEventLogEntry) => React.ReactNode | null;

// Surface signature payload fields per event type without bloating the main render path.
const EVENT_SPECIFIC_SUMMARY_RENDERERS: Record<string, EventSpecificSummaryRenderer> = {
  search: (entry) => {
    if (!entry.parsedEventData || typeof entry.parsedEventData !== 'object') {
      return null;
    }

    const data = entry.parsedEventData as Record<string, unknown>;
    const searchTerm = typeof data.searchTerm === 'string' ? data.searchTerm.trim() : '';
    if (!searchTerm) {
      return null;
    }

    const resolvedIndex = typeof data.resolvedIndex === 'string' ? data.resolvedIndex.trim() : '';

    return (
      <Stack spacing={0.25}>
        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Search term
          </Box>
          : {searchTerm}
        </Typography>
        {resolvedIndex && (
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
            Resolved index: {resolvedIndex}
          </Typography>
        )}
      </Stack>
    );
  },
};

const getEventSpecificSummary = (entry: UsageEventLogEntry) => {
  const typeKey = normalizeEventType(entry.detail?.eventType ?? entry.summary?.eventType ?? null);
  if (!typeKey) {
    return null;
  }

  const renderer = EVENT_SPECIFIC_SUMMARY_RENDERERS[typeKey];
  if (!renderer) {
    return null;
  }

  return renderer(entry);
};

const LIVE_PULSE = keyframes`
  0% {
    transform: scale(0.6);
    opacity: 0.7;
  }
  65% {
    transform: scale(1.8);
    opacity: 0;
  }
  100% {
    transform: scale(1.8);
    opacity: 0;
  }
`;

const CONNECTING_STRIPES = keyframes`
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 200% 50%;
  }
`;

type StreamStatusTone = {
  badge: string;
  statusText: string;
  helperText: string;
  accent: string;
  dotColor: string;
  background: string;
  border: string;
  textColor: string;
  variant: 'pulse' | 'shimmer' | 'offline' | 'idle';
  shadow: string;
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

const renderJsonBlock = (
  theme: Theme,
  isDarkMode: boolean,
  title: string,
  content: string | null | undefined,
  emptyLabel?: string
) => (
  <Paper
    variant="outlined"
    sx={{
      borderRadius: 2,
      px: 2,
      py: 1.5,
      backgroundColor: alpha(theme.palette.background.paper, isDarkMode ? 0.6 : 0.9),
    }}
  >
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
      {title}
    </Typography>
    <Box
      component="pre"
      sx={{
        m: 0,
        fontFamily: 'Roboto Mono, Menlo, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 13,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        color: theme.palette.text.primary,
      }}
    >
      {content ?? emptyLabel ?? 'No data available.'}
    </Box>
  </Paper>
);

type StreamStatusBannerProps = {
  tone: StreamStatusTone;
  showRetry: boolean;
  onRetry: () => void;
};

const StreamStatusBanner: React.FC<StreamStatusBannerProps> = ({ tone, showRetry, onRetry }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.1,
      flexWrap: { xs: 'wrap', sm: 'nowrap' },
      px: 1.75,
      py: 0.95,
      borderRadius: 1.75,
      border: `1px solid ${tone.border}`,
      background: tone.background,
      color: tone.textColor,
      minWidth: { sm: 240 },
      width: { xs: '100%', sm: 'auto' },
      minHeight: 56,
      boxShadow: tone.shadow,
      backgroundSize: tone.variant === 'shimmer' ? '200% 100%' : undefined,
      animation: tone.variant === 'shimmer' ? `${CONNECTING_STRIPES} 2.6s linear infinite` : undefined,
      transition: 'background 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
    }}
  >
    <Box
      sx={{
        position: 'relative',
        width: 10,
        height: 10,
        borderRadius: '50%',
        flexShrink: 0,
        backgroundColor: tone.dotColor,
        color: tone.dotColor,
        boxShadow:
          tone.variant === 'offline'
            ? `0 0 0 2px ${alpha(tone.dotColor, 0.35)}`
            : tone.variant === 'idle'
              ? `0 0 0 1px ${alpha(tone.dotColor, 0.35)}`
              : `0 0 0 0 ${alpha(tone.dotColor, 0.35)}`,
        ...(tone.variant === 'pulse'
          ? {
              '&::after': {
                content: "''",
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '1px solid currentColor',
                opacity: 0.7,
                animation: `${LIVE_PULSE} 1.6s ease-out infinite`,
              },
            }
          : {}),
      }}
    />
    <Stack spacing={0.2} sx={{ minWidth: 0, flexGrow: 1 }}>
      <Typography
        variant="overline"
        sx={{ fontSize: 10, letterSpacing: 1.3, fontWeight: 700, color: alpha(tone.textColor, 0.9) }}
      >
        {tone.badge}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, color: tone.textColor }}>
        {tone.statusText}
      </Typography>
      <Typography variant="caption" sx={{ color: alpha(tone.textColor, 0.75) }}>
        {tone.helperText}
      </Typography>
    </Stack>
    <Button
      size="small"
      variant="text"
      onClick={onRetry}
      startIcon={<RefreshIcon fontSize="small" />}
      sx={{
        ml: { xs: 0, sm: 'auto' },
        fontWeight: 600,
        color: tone.textColor,
        textTransform: 'none',
        minWidth: 72,
        visibility: showRetry ? 'visible' : 'hidden',
        opacity: showRetry ? 1 : 0,
        pointerEvents: showRetry ? 'auto' : 'none',
        transition: 'opacity 180ms ease',
      }}
    >
      Retry
    </Button>
  </Box>
);

type UsageEventCardProps = {
  entry: UsageEventLogEntry;
  isExpanded: boolean;
  onToggle: (eventId: string) => void;
  showEventSpecificSummary: boolean;
};

type MetaItem = {
  key: string;
  label: string;
  value: string;
  tooltip?: string | null;
  icon?: React.ReactNode;
};

const UsageEventCard: React.FC<UsageEventCardProps> = ({ entry, isExpanded, onToggle, showEventSpecificSummary }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const normalizedType = normalizeEventType(entry.summary?.eventType ?? entry.detail?.eventType ?? null) ?? '';
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const chipColor = EVENT_COLOR_MAP[normalizedType] ?? 'default';
  const eventTypeLabel =
    entry.summaryStatus === 'loaded'
      ? formatEventTypeLabel(entry.summary?.eventType)
      : entry.summaryStatus === 'loading'
        ? 'Loading…'
        : 'Event unavailable';
  const identityRaw = entry.summary?.identityId ?? entry.detail?.identityId ?? null;
  const identityFull = identityRaw ?? 'Unknown identity';
  const identityShort = shortenIdentifier(identityFull) ?? identityFull;
  const sessionFull = entry.summary?.sessionId ?? entry.detail?.sessionId ?? null;
  const sessionShort = sessionFull ? shortenIdentifier(sessionFull) ?? sessionFull : null;
  const eventIdFull = entry.summary?.id ?? entry.id;
  const eventIdShort = shortenIdentifier(eventIdFull) ?? eventIdFull;
  const isSummaryLoading = entry.summaryStatus === 'loading';
  const canSurfaceEventSummary = showEventSpecificSummary || entry.detailStatus === 'loaded';
  const eventSpecificSummary = canSurfaceEventSummary ? getEventSpecificSummary(entry) : null;
  const collapsedSupplement = eventSpecificSummary;

  const accentBase =
    chipColor === 'default'
      ? alpha(theme.palette.text.primary, isDarkMode ? 0.45 : 0.58)
      : theme.palette[chipColor].main;
  const accentBorder = alpha(accentBase, isDarkMode ? 0.5 : 0.28);
  const accentHover = alpha(accentBase, isDarkMode ? 0.82 : 0.55);
  const accentSurface = alpha(accentBase, isDarkMode ? 0.22 : 0.08);
  const metaBorder = alpha(accentBase, isDarkMode ? 0.4 : 0.18);
  const metaBackground = alpha(accentBase, isDarkMode ? 0.22 : 0.08);
  const metaLabelColor = alpha(theme.palette.text.secondary, isDarkMode ? 0.85 : 0.68);

  const isNoAuthIdentity = typeof identityRaw === 'string' && identityRaw.startsWith(NOAUTH_IDENTITY_PREFIX);
  const identityIcon = identityShort
    ? isNoAuthIdentity || !identityRaw
      ? <HelpOutlineIcon sx={{ fontSize: 14, color: metaLabelColor }} />
      : <PersonIcon sx={{ fontSize: 14, color: metaLabelColor }} />
    : undefined;

  const timestampIso = entry.summary?.createdAt ?? entry.receivedAt;
  const timeLabel = formatTimeLabel(timestampIso) ?? '—';
  const fullTimestampLabel = formatTimestamp(timestampIso) ?? timestampIso ?? 'Timestamp unavailable';
  const relativeLabel = formatRelativeTimeLabel(timestampIso);
  const isHistoricalEntry = Boolean(entry.rawPayload && entry.rawPayload.startsWith('Historical fetch'));
  const metaItems = (
    [
      identityShort
        ? {
            key: 'identity',
            label: 'Identity',
            value: identityShort,
            tooltip: identityFull,
            icon: identityIcon,
          }
        : null,
      sessionShort && sessionFull
        ? { key: 'session', label: 'Session', value: sessionShort, tooltip: sessionFull }
        : null,
      eventIdShort && eventIdFull
        ? { key: 'event', label: 'Event', value: eventIdShort, tooltip: eventIdFull }
        : null,
    ].filter(Boolean) as MetaItem[]
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'relative',
        borderRadius: 2.5,
        overflow: 'hidden',
        borderColor: accentBorder,
        backgroundColor: alpha(theme.palette.background.paper, isDarkMode ? 0.82 : 0.98),
        backgroundImage: `linear-gradient(120deg, ${alpha(accentBase, isDarkMode ? 0.12 : 0.05)} 0%, ${alpha(accentBase, 0)} 70%)`,
        transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow'], {
          duration: theme.transitions.duration.shorter,
        }),
        boxShadow: isExpanded
          ? `0 14px 32px ${alpha(theme.palette.common.black, isDarkMode ? 0.45 : 0.16)}`
          : `0 6px 18px ${alpha(theme.palette.common.black, isDarkMode ? 0.28 : 0.08)}`,
        '&::before': {
          content: "''",
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 4,
          borderTopLeftRadius: 'inherit',
          borderBottomLeftRadius: 'inherit',
          background: `linear-gradient(180deg, ${accentBase} 0%, ${alpha(accentBase, 0.35)} 100%)`,
        },
        '&:hover': {
          borderColor: accentHover,
        },
        opacity: isSummaryLoading ? 0.88 : 1,
      }}
    >
      <ButtonBase
        onClick={() => onToggle(entry.id)}
        disabled={isSummaryLoading}
        sx={{
          width: '100%',
          textAlign: 'left',
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          '&.Mui-disabled': {
            cursor: 'default',
            color: 'inherit',
          },
        }}
      >
        <Stack
          direction={isSmallScreen ? 'column' : 'row'}
          spacing={isSmallScreen ? 1.5 : 2}
          sx={{ flexGrow: 1, alignItems: isSmallScreen ? 'stretch' : 'stretch', minWidth: 0 }}
        >
          <Stack
            direction={isSmallScreen ? 'row' : 'column'}
            spacing={isSmallScreen ? 0.9 : 0.75}
            justifyContent={isSmallScreen ? 'space-between' : 'flex-start'}
            alignItems={isSmallScreen ? 'center' : 'flex-start'}
            sx={{
              minWidth: isSmallScreen ? 'auto' : { xs: 112, sm: 150 },
              pr: isSmallScreen ? 0 : { xs: 1.5, sm: 2 },
              pb: isSmallScreen ? 1 : 0,
              mb: isSmallScreen ? 0.4 : 0,
              borderRight: isSmallScreen ? 'none' : `1px solid ${alpha(accentBase, 0.32)}`,
              borderBottom: isSmallScreen ? `1px solid ${alpha(accentBase, 0.3)}` : 'none',
              alignSelf: 'stretch',
            }}
          >
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography
                variant={isSmallScreen ? 'body2' : 'subtitle1'}
                sx={{ fontWeight: 700, lineHeight: 1.25 }}
              >
                {timeLabel}
              </Typography>
              <Tooltip title={fullTimestampLabel} placement="top" enterTouchDelay={20}>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                  {fullTimestampLabel}
                </Typography>
              </Tooltip>
            </Stack>
            <Stack
              spacing={0.25}
              sx={{ alignItems: isSmallScreen ? 'flex-end' : 'flex-start', minWidth: 0 }}
            >
              {relativeLabel && (
                <Typography variant="caption" color="text.secondary">
                  {relativeLabel}
                </Typography>
              )}
              <Chip
                size="small"
                label={isHistoricalEntry ? 'History' : 'Live'}
                color={isHistoricalEntry ? 'default' : 'success'}
                variant={isHistoricalEntry ? 'outlined' : 'filled'}
                sx={{ fontWeight: 600, letterSpacing: 0.35, px: 0.5, alignSelf: 'flex-start' }}
              />
            </Stack>
          </Stack>

          <Stack spacing={isSummaryLoading ? 0.6 : 0.9} sx={{ flexGrow: 1, minWidth: 0 }}>
            {isSummaryLoading ? (
              <Stack spacing={0.6}>
                <Skeleton variant="rounded" width={160} height={26} sx={{ borderRadius: 14 }} />
                <Skeleton variant="text" width={190} sx={{ fontSize: 16 }} />
                <Skeleton variant="text" width={150} sx={{ fontSize: 12 }} />
              </Stack>
            ) : (
              <Stack spacing={0.8} sx={{ minWidth: 0 }}>
                <Stack
                  direction={isSmallScreen ? 'column' : 'row'}
                  alignItems={isSmallScreen ? 'flex-start' : 'center'}
                  spacing={isSmallScreen ? 0.6 : 1}
                  sx={{ flexWrap: 'wrap', rowGap: 0.6 }}
                >
                  <Chip
                    size="small"
                    label={eventTypeLabel}
                    color={chipColor === 'default' ? 'default' : chipColor}
                    variant={chipColor === 'default' ? 'outlined' : 'filled'}
                    sx={{ fontWeight: 700, letterSpacing: 0.5 }}
                  />
                </Stack>

                {!!metaItems.length && (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap rowGap={0.5}>
                    {metaItems.map((item) => {
                      const tooltipLabel = `${item.label}: ${item.tooltip ?? item.value}`;
                      return (
                        <Tooltip key={`${entry.id}-${item.key}`} title={tooltipLabel} placement="top" enterTouchDelay={20}>
                          <Box
                            component="span"
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.45,
                              px: 0.75,
                              py: 0.35,
                              borderRadius: 1,
                              border: `1px solid ${metaBorder}`,
                              backgroundColor: metaBackground,
                              maxWidth: '100%',
                            }}
                          >
                            <Typography
                              component="span"
                              variant="overline"
                              sx={{ fontSize: 9, letterSpacing: 0.65, color: metaLabelColor }}
                            >
                              {item.label}
                            </Typography>
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{ fontWeight: 600, color: theme.palette.text.primary, wordBreak: 'break-word' }}
                            >
                              {item.value}
                            </Typography>
                            {item.icon && (
                              <Box
                                component="span"
                                sx={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}
                              >
                                {item.icon}
                              </Box>
                            )}
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Stack>
                )}

                {collapsedSupplement && (
                  <Box
                    sx={{
                      px: 1.25,
                      py: 0.9,
                      borderRadius: 1.5,
                      border: `1px solid ${alpha(accentBase, isDarkMode ? 0.45 : 0.2)}`,
                      backgroundColor: accentSurface,
                      color: alpha(theme.palette.text.primary, 0.92),
                      minWidth: 0,
                    }}
                  >
                    {collapsedSupplement}
                  </Box>
                )}

                {entry.summaryStatus === 'error' && entry.summaryError && (
                  <Alert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>
                    {entry.summaryError}
                  </Alert>
                )}
              </Stack>
            )}
          </Stack>
        </Stack>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: alpha(theme.palette.text.secondary, 0.9),
            transition: theme.transitions.create('transform', {
              duration: theme.transitions.duration.shortest,
            }),
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            opacity: isSummaryLoading ? 0.6 : 1,
          }}
        >
          <ExpandMoreIcon fontSize="small" />
        </Box>
      </ButtonBase>

      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        <Box sx={{ borderTop: `1px solid ${alpha(theme.palette.divider, 0.7)}`, px: 3, py: 2.5 }}>
          {entry.detailStatus === 'loading' && (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CircularProgress size={18} thickness={5} />
              <Typography variant="body2" color="text.secondary">
                Loading event details…
              </Typography>
            </Stack>
          )}

          {entry.detailStatus === 'error' && entry.detailError && (
            <Alert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>
              {entry.detailError}
            </Alert>
          )}

          {entry.detailStatus === 'loaded' && entry.detail && (
            <Stack spacing={2.5}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Event metadata
                </Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                  {[{
                    label: 'Event ID',
                    value: entry.detail.id,
                  }, {
                    label: 'Identity',
                    value: entry.detail.identityId,
                  }, {
                    label: 'Session',
                    value: entry.detail.sessionId,
                  }, {
                    label: 'Created',
                    value: formatTimestamp(entry.detail.createdAt) ?? entry.detail.createdAt,
                  }, {
                    label: 'Updated',
                    value: formatTimestamp(entry.detail.updatedAt) ?? entry.detail.updatedAt,
                  }]
                    .filter((item) => Boolean(item.value))
                    .map((item) => (
                      <Box
                        key={`${entry.id}-${item.label}`}
                        sx={{
                          px: 1.5,
                          py: 1,
                          borderRadius: 2,
                          border: `1px solid ${alpha(theme.palette.primary.main, isDarkMode ? 0.3 : 0.15)}`,
                          backgroundColor: alpha(theme.palette.primary.main, isDarkMode ? 0.12 : 0.06),
                          minWidth: 0,
                        }}
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
                        >
                          {item.label}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                          {item.value}
                        </Typography>
                      </Box>
                    ))}
                </Stack>
              </Stack>

              {renderJsonBlock(
                theme,
                isDarkMode,
                'Event Data',
                entry.formattedEventData,
                'No eventData payload was returned.'
              )}

              {renderJsonBlock(
                theme,
                isDarkMode,
                'Usage Event Record',
                entry.formattedDetail ?? safeStringify(entry.detail),
                'Usage event record was empty.'
              )}

              {entry.rawErrors &&
                renderJsonBlock(
                  theme,
                  isDarkMode,
                  'GraphQL Errors',
                  entry.rawErrors,
                  'No GraphQL errors reported.'
                )}

              {renderJsonBlock(
                theme,
                isDarkMode,
                'Raw Subscription Payload',
                entry.rawPayload,
                'Subscription payload was empty.'
              )}
            </Stack>
          )}
        </Box>
      </Collapse>
    </Paper>
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
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
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

  const statusTone = useMemo<StreamStatusTone>(() => {
    const liveAccent = theme.palette.success.main;
    const connectingAccent = theme.palette.warning.main;
    const idleAccent = theme.palette.info.main;

    if (connectionStatus === 'connected') {
      const shadow = `0 0 0 1px ${alpha(liveAccent, isDarkMode ? 0.45 : 0.2)}, 0 6px 16px ${alpha(
        liveAccent,
        isDarkMode ? 0.28 : 0.12
      )}`;
      return {
        badge: 'LIVE',
        statusText: 'Connected',
        helperText: 'Live updates streaming.',
        accent: liveAccent,
        dotColor: liveAccent,
        background: alpha(liveAccent, isDarkMode ? 0.16 : 0.09),
        border: alpha(liveAccent, isDarkMode ? 0.45 : 0.24),
        textColor: isDarkMode ? theme.palette.success.light : theme.palette.success.dark,
        variant: 'pulse',
        shadow,
      };
    }

    if (connectionStatus === 'connecting') {
      const shadow = `0 3px 12px ${alpha(connectingAccent, isDarkMode ? 0.22 : 0.1)}`;
      return {
        badge: 'CONNECTING',
        statusText: 'Connecting…',
        helperText: 'Establishing stream.',
        accent: connectingAccent,
        dotColor: connectingAccent,
        background: `linear-gradient(120deg, ${alpha(connectingAccent, isDarkMode ? 0.18 : 0.08)} 0%, ${alpha(connectingAccent, isDarkMode ? 0.04 : 0.02)} 55%, ${alpha(connectingAccent, isDarkMode ? 0.18 : 0.08)} 100%)`,
        border: alpha(connectingAccent, isDarkMode ? 0.35 : 0.2),
        textColor: isDarkMode ? theme.palette.warning.light : theme.palette.warning.dark,
        variant: 'shimmer',
        shadow,
      };
    }

    if (connectionStatus === 'error') {
      const accent = theme.palette.error.main;
      const shadow = `0 3px 12px ${alpha(accent, isDarkMode ? 0.28 : 0.12)}`;
      return {
        badge: 'OFFLINE',
        statusText: 'Offline',
        helperText: 'Retry to reconnect.',
        accent,
        dotColor: accent,
        background: alpha(accent, isDarkMode ? 0.18 : 0.1),
        border: alpha(accent, isDarkMode ? 0.55 : 0.33),
        textColor: isDarkMode ? theme.palette.error.light : theme.palette.error.dark,
        variant: 'offline',
        shadow,
      };
    }

    const shadow = `0 3px 12px ${alpha(idleAccent, isDarkMode ? 0.18 : 0.08)}`;
    return {
      badge: 'STANDBY',
      statusText: 'Standby',
      helperText: 'Awaiting connection.',
      accent: idleAccent,
      dotColor: alpha(idleAccent, 0.9),
      background: alpha(idleAccent, isDarkMode ? 0.14 : 0.07),
      border: alpha(idleAccent, isDarkMode ? 0.32 : 0.18),
      textColor: isDarkMode ? theme.palette.info.light : theme.palette.info.dark,
      variant: 'idle',
      shadow,
    };
  }, [connectionStatus, isDarkMode, theme]);

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
  const streamHeading = isFilteredView && selectedEventTypeLabel ? `${selectedEventTypeLabel} activity` : 'All event types';
  const eventCountLabel = `${displayedEvents.length} event${displayedEvents.length === 1 ? '' : 's'}`;
  const streamSubtitle = isFilteredView
    ? 'Streaming filtered history alongside live events — latest first.'
    : 'Streaming new subscription events in real time.';

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
      <Container maxWidth="md" sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Stack spacing={3.5}>
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            px: { xs: 2.5, sm: 3 },
            py: { xs: 2.5, sm: 3 },
            backgroundColor: alpha(theme.palette.background.paper, isDarkMode ? 0.78 : 0.99),
            borderColor: alpha(theme.palette.divider, 0.55),
            boxShadow: `0 18px 38px ${alpha(theme.palette.common.black, isDarkMode ? 0.52 : 0.14)}`,
          }}
        >
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h4" fontWeight={800} gutterBottom>
                Usage Event Stream
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Live feed of `onCreateUsageEvent`. Click any row to inspect payloads and metadata instantly.
              </Typography>
            </Box>

            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              spacing={{ xs: 2, lg: 2.5 }}
              alignItems={{ xs: 'stretch', lg: 'center' }}
            >
              <FormControl
                size="small"
                sx={{ minWidth: { xs: '100%', sm: 220 } }}
                disabled={eventTypeStatus === 'loading' && eventTypeOptions.length === 0}
              >
                <InputLabel id="usage-event-type-filter-label">Event Type</InputLabel>
                <Select
                  labelId="usage-event-type-filter-label"
                  id="usage-event-type-filter"
                  label="Event Type"
                  value={selectedEventType ?? ALL_EVENT_TYPES_OPTION}
                  onChange={handleEventTypeChange}
                >
                  <MenuItem value={ALL_EVENT_TYPES_OPTION}>All event types</MenuItem>
                  {eventTypeOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {formatEventTypeLabel(option)}
                    </MenuItem>
                  ))}
                </Select>
                {eventTypeError && <FormHelperText error>{eventTypeError}</FormHelperText>}
              </FormControl>

              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1.25}
                alignItems={{ xs: 'stretch', md: 'center' }}
                sx={{ width: { xs: '100%', md: 'auto' } }}
              >
                <StreamStatusBanner
                  tone={statusTone}
                  showRetry={connectionStatus === 'error'}
                  onRetry={handleManualReconnect}
                />

                <Button
                  size="small"
                  onClick={() => {
                    setEvents([]);
                    setExpandedEventId(null);
                  }}
                  disabled={events.length === 0}
                  variant="outlined"
                  sx={{
                    alignSelf: { xs: 'stretch', md: 'auto' },
                    whiteSpace: 'nowrap',
                  }}
                >
                  Clear log
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        {subscriptionError && (
          <Alert severity="error" variant="outlined">
            {subscriptionError}
          </Alert>
        )}

        {isFilteredView && selectedEventTypeLabel && (
          <Alert severity="info" variant="outlined">
            Filtering to {selectedEventTypeLabel} events. Matching live events stream in automatically.
          </Alert>
        )}

        {isFilteredView && historicalStatus === 'error' && historicalError && (
          <Alert severity="error" variant="outlined">
            {historicalError}
          </Alert>
        )}

        {isHistoricalLoading && (
          <Paper variant="outlined" sx={{ px: 3, py: 4, borderRadius: 3, textAlign: 'center' }}>
            <Stack spacing={2} alignItems="center">
              <CircularProgress size={22} thickness={5} />
              <Typography variant="body2" color="text.secondary">
                Loading {selectedEventTypeLabel ?? 'selected'} events…
              </Typography>
            </Stack>
          </Paper>
        )}

        {shouldShowEmptyState ? (
          <Paper
            variant="outlined"
            sx={{
              px: 3,
              py: 6,
              textAlign: 'center',
              borderRadius: 3,
              backgroundColor: alpha(theme.palette.primary.main, isDarkMode ? 0.12 : 0.06),
            }}
          >
            <Typography variant="h6" fontWeight={700} gutterBottom>
              {isFilteredView ? 'No matching events yet' : 'Waiting for events'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isFilteredView
                ? 'No events found for this event type. Try a different filter or trigger a new event.'
                : 'Trigger any tracked action in the product and the event will appear here instantly.'}
            </Typography>
            {!isFilteredView && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                This view only reflects live subscription events. Choose an event type above to load historical
                records.
              </Typography>
            )}
          </Paper>
        ) : (
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 3,
              px: { xs: 2.5, sm: 3 },
              py: { xs: 2.5, sm: 3 },
              backgroundColor: alpha(theme.palette.background.paper, isDarkMode ? 0.78 : 0.99),
              borderColor: alpha(theme.palette.divider, 0.55),
              boxShadow: `0 14px 32px ${alpha(theme.palette.common.black, isDarkMode ? 0.45 : 0.12)}`,
            }}
          >
            <Stack spacing={2.5}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 1.25, sm: 2 }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
              >
                <Stack spacing={0.35}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Live activity · {streamHeading}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {streamSubtitle}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                  <Chip
                    size="small"
                    label={eventCountLabel}
                    color={displayedEvents.length ? 'success' : 'default'}
                    variant={displayedEvents.length ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 600, letterSpacing: 0.3 }}
                  />
                  {isFilteredView && selectedEventTypeLabel && (
                    <Chip
                      size="small"
                      label={selectedEventTypeLabel}
                      color="info"
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  )}
                </Stack>
              </Stack>

              <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.6) }} />

              <Stack spacing={1.5}>
                {displayedEvents.map((entry) => (
                  <UsageEventCard
                    key={entry.id}
                    entry={entry}
                    isExpanded={expandedEventId === entry.id}
                    onToggle={handleToggleExpand}
                    showEventSpecificSummary={isFilteredView}
                  />
                ))}

                {!isFilteredView && (
                  <Alert severity="info" variant="outlined">
                    Live stream only shows new subscription events. Select an event type above to browse historical
                    activity.
                  </Alert>
                )}

                {isFilteredView && canLoadMoreHistorical && (
                  <Stack alignItems="center" sx={{ pt: 1.5 }}>
                    <Button
                      variant="outlined"
                      onClick={handleLoadMoreHistorical}
                      disabled={isHistoricalLoadingMore}
                    >
                      {isHistoricalLoadingMore ? 'Loading…' : 'Load more history'}
                    </Button>
                  </Stack>
                )}
              </Stack>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}

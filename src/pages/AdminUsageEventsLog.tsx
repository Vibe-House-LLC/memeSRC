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
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
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

const EVENT_COLOR_MAP: Record<string, ChipColor> = {
  search: 'info',
  view_image: 'primary',
  view_episode: 'secondary',
  add_to_library: 'success',
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

const safeStringify = (input: unknown) => {
  if (input === undefined) return 'undefined';
  try {
    return JSON.stringify(input, null, 2);
  } catch (error) {
    return String(input);
  }
};

const parseEventData = (rawValue: string | null | undefined) => {
  if (rawValue === null || rawValue === undefined) {
    return { formatted: undefined };
  }

  try {
    const parsed = JSON.parse(rawValue);
    return { formatted: safeStringify(parsed) };
  } catch (error) {
    return { formatted: safeStringify(rawValue) };
  }
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
    const { formatted: formattedEventData } = parseEventData(record.eventData ?? null);

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

  const fetchEventDetail = (entryId: string) => {
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

        const { formatted: formattedEventData } = parseEventData(detail.eventData ?? null);

        setEvents((prev) =>
          prev.map((entry) => {
            if (entry.id !== entryId) return entry;
            return {
              ...entry,
              detailStatus: 'loaded',
              detail,
              formattedEventData,
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
  };

  const isUserLoading = user === false;

  const statusLabel = useMemo(() => {
    if (connectionStatus === 'connecting') return 'Connecting…';
    if (connectionStatus === 'connected') return 'Live';
    if (connectionStatus === 'error') return 'Disconnected';
    return 'Idle';
  }, [connectionStatus]);

  const statusColor: ChipColor = useMemo(() => {
    if (connectionStatus === 'connected') return 'success';
    if (connectionStatus === 'error') return 'error';
    if (connectionStatus === 'connecting') return 'warning';
    return 'default';
  }, [connectionStatus]);

  const normalizedSelectedType = useMemo(
    () => selectedEventType?.toLowerCase() ?? null,
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

  const renderJsonBlock = (title: string, content: string | null | undefined, emptyLabel?: string) => (
    <Paper variant="outlined" sx={{ borderRadius: 2, px: 2, py: 1.5, backgroundColor: alpha(theme.palette.background.paper, isDarkMode ? 0.6 : 0.9) }}>
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
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
        >
          <Box>
            <Typography variant="h4" fontWeight={800} gutterBottom>
              Usage Event Stream
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Live feed of `onCreateUsageEvent`. Click any row to see the raw JSON payload.
            </Typography>
          </Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            sx={{ width: { xs: '100%', sm: 'auto' } }}
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

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Chip
                label={`Status: ${statusLabel}`}
                color={statusColor === 'default' ? 'default' : statusColor}
                size="small"
                variant={statusColor === 'default' ? 'outlined' : 'filled'}
                sx={{ fontWeight: 600, letterSpacing: 0.3 }}
              />
              {connectionStatus === 'error' && (
                <IconButton
                  size="small"
                  color="primary"
                  onClick={handleManualReconnect}
                  aria-label="Reconnect subscription"
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              )}
              <Button
                size="small"
                onClick={() => {
                  setEvents([]);
                  setExpandedEventId(null);
                }}
                disabled={events.length === 0}
                variant="outlined"
              >
                Clear log
              </Button>
            </Stack>
          </Stack>
        </Stack>

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
          <Stack spacing={1.5}>
            {displayedEvents.map((event) => {
              const normalizedType = event.summary?.eventType?.toLowerCase() ?? '';
              const chipColor = EVENT_COLOR_MAP[normalizedType] ?? 'default';
              const eventTypeLabel = event.summaryStatus === 'loaded'
                ? formatEventTypeLabel(event.summary?.eventType)
                : event.summaryStatus === 'loading'
                  ? 'Loading…'
                  : 'Event unavailable';
              const identityShort = shortenIdentifier(event.summary?.identityId) ?? 'Unknown identity';
              const timestampLabel =
                formatTimestamp(event.summary?.createdAt ?? event.receivedAt) ?? event.receivedAt;
              const isExpanded = expandedEventId === event.id;
              const isSummaryLoading = event.summaryStatus === 'loading';

              return (
                <Paper
                  key={event.id}
                  variant="outlined"
                  sx={{
                    borderRadius: 2.5,
                    overflow: 'hidden',
                    borderColor: alpha(theme.palette.divider, 0.6),
                    backgroundColor: alpha(
                      theme.palette.background.paper,
                      isExpanded ? (isDarkMode ? 0.75 : 0.98) : 0.92
                    ),
                    transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow'], {
                      duration: theme.transitions.duration.shorter,
                    }),
                    boxShadow: isExpanded
                      ? `0 18px 40px ${alpha(theme.palette.common.black, isDarkMode ? 0.45 : 0.18)}`
                      : `0 8px 24px ${alpha(theme.palette.common.black, isDarkMode ? 0.35 : 0.12)}`,
                    '&:hover': {
                      borderColor: alpha(theme.palette.primary.main, 0.4),
                    },
                    opacity: isSummaryLoading ? 0.9 : 1,
                  }}
                >
                  <ButtonBase
                    onClick={() => handleToggleExpand(event.id)}
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
                    <Stack spacing={0.75} sx={{ flexGrow: 1 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                        {isSummaryLoading ? (
                          <Skeleton variant="rounded" width={140} height={28} sx={{ borderRadius: 14 }} />
                        ) : (
                          <Chip
                            size="small"
                            label={eventTypeLabel}
                            color={chipColor === 'default' ? 'default' : chipColor}
                            variant={chipColor === 'default' ? 'outlined' : 'filled'}
                            sx={{ fontWeight: 700, letterSpacing: 0.5 }}
                          />
                        )}
                        {isSummaryLoading ? (
                          <Skeleton variant="text" width={180} sx={{ fontSize: 16 }} />
                        ) : (
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {identityShort}
                          </Typography>
                        )}
                      </Stack>
                      {isSummaryLoading ? (
                        <Skeleton variant="text" width={160} sx={{ fontSize: 12 }} />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {timestampLabel}
                        </Typography>
                      )}
                      {event.summaryStatus === 'error' && event.summaryError && (
                        <Typography variant="caption" color={theme.palette.error.main}>
                          {event.summaryError}
                        </Typography>
                      )}
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
                      {event.detailStatus === 'loading' && (
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <CircularProgress size={18} thickness={5} />
                          <Typography variant="body2" color="text.secondary">
                            Loading event details…
                          </Typography>
                        </Stack>
                      )}

                      {event.detailStatus === 'error' && event.detailError && (
                        <Alert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>
                          {event.detailError}
                        </Alert>
                      )}

                      {event.detailStatus === 'loaded' && event.detail && (
                        <Stack spacing={2.5}>
                          <Stack spacing={1}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              Event metadata
                            </Typography>
                            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                              {[{
                                label: 'Event ID',
                                value: event.detail.id,
                              }, {
                                label: 'Identity',
                                value: event.detail.identityId,
                              }, {
                                label: 'Session',
                                value: event.detail.sessionId,
                              }, {
                                label: 'Created',
                                value: formatTimestamp(event.detail.createdAt) ?? event.detail.createdAt,
                              }, {
                                label: 'Updated',
                                value: formatTimestamp(event.detail.updatedAt) ?? event.detail.updatedAt,
                              }]
                                .filter((item) => Boolean(item.value))
                                .map((item) => (
                                  <Box
                                    key={`${event.id}-${item.label}`}
                                    sx={{
                                      px: 1.5,
                                      py: 1,
                                      borderRadius: 2,
                                      border: `1px solid ${alpha(theme.palette.primary.main, isDarkMode ? 0.3 : 0.15)}`,
                                      backgroundColor: alpha(theme.palette.primary.main, isDarkMode ? 0.12 : 0.06),
                                      minWidth: 0,
                                    }}
                                  >
                                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
                                      {item.label}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-word' }}>
                                      {item.value}
                                    </Typography>
                                  </Box>
                                ))}
                            </Stack>
                          </Stack>

                          {renderJsonBlock('Event Data', event.formattedEventData, 'No eventData payload was returned.')}

                          {renderJsonBlock('Usage Event Record', event.formattedDetail ?? safeStringify(event.detail), 'Usage event record was empty.')}

                          {event.rawErrors &&
                            renderJsonBlock('GraphQL Errors', event.rawErrors, 'No GraphQL errors reported.')}

                          {renderJsonBlock('Raw Subscription Payload', event.rawPayload, 'Subscription payload was empty.')}
                        </Stack>
                      )}
                    </Box>
                  </Collapse>
                </Paper>
              );
            })}

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
        )}
      </Stack>
    </Container>
  );
}

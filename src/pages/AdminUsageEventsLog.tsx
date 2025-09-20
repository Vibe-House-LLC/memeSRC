import React, { useContext, useEffect, useMemo, useState } from 'react';
import { API, graphqlOperation, Hub } from 'aws-amplify';
import { CONNECTION_STATE_CHANGE } from '@aws-amplify/pubsub';
import { Alert, Box, Button, Chip, CircularProgress, Container, Paper, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../UserContext';
import { getUsageEvent } from '../graphql/queries';

const USAGE_EVENT_SUBSCRIPTION = /* GraphQL */ `
  subscription OnCreateUsageEvent {
    onCreateUsageEvent {
      id
    }
  }
`;

type UsageEventLogEntry = {
  id: string;
  receivedAt: string;
  eventPayload: unknown;
  eventSummary?: string;
  formattedEvent: string;
  formattedRaw: string;
  formattedErrors?: string;
  status: 'pending' | 'loaded' | 'error';
  fetchError?: string;
};

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

const MAX_EVENTS = 100;

export default function AdminUsageEventsLog() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const isAdmin = Array.isArray(user?.['cognito:groups']) && user['cognito:groups'].includes('admins');
  const [events, setEvents] = useState<UsageEventLogEntry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  useEffect(() => {
    if (user !== false && !isAdmin) {
      navigate('/', { replace: true });
    }
  }, [isAdmin, navigate, user]);

  useEffect(() => {
    if (!isAdmin) return undefined;

    setConnectionStatus('connecting');
    setSubscriptionError(null);

    const handleHubCapsule = (capsule: any) => {
      const { payload } = capsule || {};
      if (payload?.event === CONNECTION_STATE_CHANGE) {
        const state = payload?.data?.connectionState as string | undefined;
        if (!state) return;
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

    const observable = API.graphql(graphqlOperation(USAGE_EVENT_SUBSCRIPTION)) as any;

    if (!observable || typeof observable.subscribe !== 'function') {
      setConnectionStatus('error');
      setSubscriptionError('Subscription client not available.');
      return undefined;
    }

    Hub.listen('api', handleHubCapsule);

    const subscription = observable.subscribe({
      next: ({ value }: { value: any }) => {
        setConnectionStatus('connected');
        const subscriptionData = value?.data?.onCreateUsageEvent;
        const subscriptionErrors = value?.errors;

        const safeStringify = (input: unknown) => {
          try {
            return JSON.stringify(input, null, 2);
          } catch (error) {
            return String(input);
          }
        };

        const eventId: string | undefined = subscriptionData?.id;

        const baseEntry: UsageEventLogEntry = {
          id: eventId || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          receivedAt: new Date().toISOString(),
          eventPayload: null,
          formattedEvent: eventId
            ? 'Loading usage event details…'
            : 'No event id returned by subscription. Raw payload logged below.',
          formattedRaw: safeStringify(value),
          formattedErrors: subscriptionErrors?.length ? safeStringify(subscriptionErrors) : undefined,
          status: eventId ? 'pending' : 'error',
          fetchError: eventId ? undefined : 'Subscription did not include an event id.',
        };

        setEvents((prev) => [baseEntry, ...prev].slice(0, MAX_EVENTS));

        if (!eventId) {
          return;
        }

        void (async () => {
          try {
            const result: any = await API.graphql(
              graphqlOperation(getUsageEvent, { id: eventId })
            );
            const record = result?.data?.getUsageEvent;

            setEvents((prev) =>
              prev.map((entry) => {
                if (entry.id !== baseEntry.id) return entry;

                const summaryParts: string[] = [];
                if (record?.eventType) summaryParts.push(String(record.eventType));
                if (record?.identityId) summaryParts.push(String(record.identityId));

                return {
                  ...entry,
                  eventPayload: record,
                  eventSummary: summaryParts.length ? summaryParts.join(' · ') : entry.eventSummary,
                  formattedEvent: safeStringify(record ?? entry.formattedEvent),
                  status: 'loaded',
                  fetchError: undefined,
                };
              })
            );
          } catch (error) {
            setEvents((prev) =>
              prev.map((entry) => {
                if (entry.id !== baseEntry.id) return entry;

                return {
                  ...entry,
                  status: 'error',
                  fetchError: safeStringify(error),
                  formattedEvent: 'Failed to load usage event details.',
                };
              })
            );
          }
        })();
      },
      error: (error: any) => {
        console.warn('Usage event subscription error', error);
        setConnectionStatus('error');
        const message = error?.errors?.[0]?.message || error?.message || 'Unknown subscription error.';
        setSubscriptionError(message);
      },
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
      Hub.remove('api', handleHubCapsule);
    };
  }, [isAdmin]);

  const isUserLoading = user === false;

  const statusLabel = useMemo(() => {
    if (connectionStatus === 'connecting') return 'Connecting…';
    if (connectionStatus === 'connected') return 'Live';
    if (connectionStatus === 'error') return 'Disconnected';
    return 'Idle';
  }, [connectionStatus]);

  const statusColor: 'default' | 'success' | 'error' | 'warning' = useMemo(() => {
    if (connectionStatus === 'connected') return 'success';
    if (connectionStatus === 'error') return 'error';
    if (connectionStatus === 'connecting') return 'warning';
    return 'default';
  }, [connectionStatus]);

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
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight={800} gutterBottom>
              Usage Event Stream
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Showing raw payloads from the `onCreateUsageEvent` subscription.
            </Typography>
          </Box>
          <Stack direction="column" spacing={1} alignItems="flex-end">
            <Chip label={`Status: ${statusLabel}`} color={statusColor} size="small" variant={statusColor === 'default' ? 'outlined' : 'filled'} />
            <Button
              size="small"
              onClick={() => setEvents([])}
              disabled={events.length === 0}
              variant="outlined"
            >
              Clear log
            </Button>
          </Stack>
        </Box>

        {subscriptionError && (
          <Alert severity="error">{subscriptionError}</Alert>
        )}

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            bgcolor: isDarkMode
              ? alpha(theme.palette.common.white, 0.04)
              : alpha(theme.palette.common.black, 0.03),
            minHeight: 320,
            maxHeight: '70vh',
            overflow: 'auto',
            fontFamily: 'monospace',
            color: theme.palette.text.primary,
          }}
        >
          {events.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Waiting for events…
            </Typography>
          ) : (
            <Stack spacing={2}>
              {events.map((event) => {
                const borderColor = (event.status === 'error' || event.formattedErrors)
                  ? theme.palette.error.main
                  : event.status === 'pending'
                    ? theme.palette.warning.main
                    : theme.palette.primary.main;

                return (
                  <Box
                    key={`${event.id}-${event.receivedAt}`}
                    sx={{
                      borderLeft: 3,
                      borderColor,
                      pl: 1.5,
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="caption" color="text.secondary">
                        {event.receivedAt}
                        {event.eventSummary ? ` · ${event.eventSummary}` : ''}
                      </Typography>
                      <Chip
                        label={event.status === 'pending' ? 'Fetching' : event.status === 'loaded' ? 'Loaded' : 'Error'}
                        size="small"
                        color={event.status === 'loaded' ? 'success' : event.status === 'pending' ? 'warning' : 'error'}
                      />
                    </Stack>

                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Usage Event
                      </Typography>
                      <pre
                        style={{
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {event.formattedEvent}
                      </pre>
                    </Box>

                    <Box sx={{ mb: event.formattedRaw ? 1 : 0 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Raw Subscription Payload
                      </Typography>
                      <pre
                        style={{
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {event.formattedRaw}
                      </pre>
                    </Box>

                    {event.formattedErrors && (
                      <Box
                        sx={{
                          mt: 1,
                          px: 1.5,
                          py: 1,
                          borderRadius: 1,
                          bgcolor: alpha(theme.palette.error.main, isDarkMode ? 0.24 : 0.12),
                        }}
                      >
                        <Typography variant="caption" color={theme.palette.error.contrastText} sx={{ display: 'block', mb: 0.5 }}>
                          GraphQL Errors
                        </Typography>
                        <pre
                          style={{
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            color: theme.palette.error.contrastText,
                          }}
                        >
                          {event.formattedErrors}
                        </pre>
                      </Box>
                    )}

                    {event.fetchError && (
                      <Box
                        sx={{
                          mt: 1,
                          px: 1.5,
                          py: 1,
                          borderRadius: 1,
                          bgcolor: alpha(theme.palette.warning.main, isDarkMode ? 0.24 : 0.12),
                        }}
                      >
                        <Typography variant="caption" color={theme.palette.warning.contrastText} sx={{ display: 'block', mb: 0.5 }}>
                          Fetch Error
                        </Typography>
                        <pre
                          style={{
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            color: theme.palette.warning.contrastText,
                          }}
                        >
                          {event.fetchError}
                        </pre>
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}

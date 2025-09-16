import { API, graphqlOperation } from 'aws-amplify';
import { GraphQLResult } from '@aws-amplify/api-graphql';

const createUsageEventMutation = /* GraphQL */ `
  mutation CreateUsageEvent($input: CreateUsageEventInput!) {
    createUsageEvent(input: $input) {
      id
    }
  }
`;

type UsageEventPayload =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null
  | undefined;

type CreateUsageEventInput = {
  eventType: string;
  eventData?: string | null;
};

type CreateUsageEventMutation = {
  createUsageEvent?: {
    id: string;
  } | null;
};

const inflightEvents = new Set<Promise<void>>();

const parseEventData = (eventData?: string | null): unknown => {
  if (!eventData) {
    return undefined;
  }

  try {
    return JSON.parse(eventData);
  } catch (parseError) {
    return eventData;
  }
};

const logUsageEventError = (
  error: unknown,
  context?: CreateUsageEventInput
) => {
  if (process.env.NODE_ENV !== 'production') {
    let message: string;

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else {
      try {
        message = JSON.stringify(error, null, 2);
      } catch (stringifyError) {
        message = `Unknown error: ${String(stringifyError)}`;
      }
    }

    const eventTypeLabel = `eventType: ${context?.eventType ?? 'unknown'}`;
    const parsedEventData = parseEventData(context?.eventData ?? null);

    if (parsedEventData !== undefined) {
      // eslint-disable-next-line no-console
      console.warn('Usage event tracking failed:', message, eventTypeLabel, 'eventData:', parsedEventData);
    } else {
      // eslint-disable-next-line no-console
      console.warn('Usage event tracking failed:', message, eventTypeLabel);
    }
  }
};

const trackPromise = (promise: Promise<void>): Promise<void> => {
  inflightEvents.add(promise);

  promise.finally(() => {
    inflightEvents.delete(promise);
  });

  return promise;
};

const serializeEventData = (eventData?: UsageEventPayload): string | null => {
  if (eventData === undefined) {
    return null;
  }

  try {
    const serializedValue = JSON.stringify(eventData);

    if (typeof serializedValue !== 'string') {
      return null;
    }

    if (serializedValue === '{}') {
      return null;
    }

    return serializedValue;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('Failed to serialize usage event payload', error);
    }

    return null;
  }
};

const sendUsageEvent = (input: CreateUsageEventInput): void => {
  const request = (async () => {
    try {
      await (API.graphql(
        graphqlOperation(createUsageEventMutation, { input })
      ) as Promise<GraphQLResult<CreateUsageEventMutation>>);
    } catch (error) {
      logUsageEventError(error, input);
    }
  })();

  void trackPromise(request);
};

export const flushUsageEvents = async (): Promise<void> => {
  if (!inflightEvents.size) {
    return;
  }

  const pendingEvents = Array.from(inflightEvents);
  await Promise.allSettled(pendingEvents);
};

export const trackUsageEvent = (
  eventType: string,
  eventData?: UsageEventPayload
): void => {
  if (!eventType) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('trackUsageEvent called without an event type');
    }

    return;
  }

  const input: CreateUsageEventInput = {
    eventType,
  };

  const serializedEventData = serializeEventData(eventData);
  if (serializedEventData) {
    input.eventData = serializedEventData;
  }

  Promise.resolve()
    .then(() => {
      sendUsageEvent(input);
    })
    .catch((error) => {
      logUsageEventError(error, input);
    });
};

export const event = trackUsageEvent;

if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') {
      return;
    }

    void flushUsageEvents();
  });
}

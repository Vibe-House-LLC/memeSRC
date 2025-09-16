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

const inflightEvents = new Set<Promise<GraphQLResult<CreateUsageEventMutation>>>();

const trackPromise = (
  promise: Promise<GraphQLResult<CreateUsageEventMutation>>
): Promise<GraphQLResult<CreateUsageEventMutation>> => {
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
  const request = API.graphql(
    graphqlOperation(createUsageEventMutation, { input })
  ) as Promise<GraphQLResult<CreateUsageEventMutation>>;

  trackPromise(request).catch((error) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('Usage event tracking failed', error);
    }
  });
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

  Promise.resolve().then(() => {
    sendUsageEvent(input);
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

import { API, Auth } from 'aws-amplify';
import { GraphQLResult, GraphQLOptions } from '@aws-amplify/api-graphql';
import { nanoid } from 'nanoid';
import getSessionID from './getSessionsId';

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
  identityId?: string | null;
  sessionId?: string | null;
};

type CreateUsageEventMutation = {
  createUsageEvent?: {
    id: string;
  } | null;
};

type GraphQLAuthMode = 'AWS_IAM' | 'AMAZON_COGNITO_USER_POOLS';

type AuthContext = {
  authMode: GraphQLAuthMode;
  trackingUserId?: string;
};

const ANONYMOUS_TRACKING_ID_STORAGE_KEY = 'anonymousTrackingId';
const ANONYMOUS_TRACKING_ID_PREFIX = 'noauth-';

let inMemoryAnonymousTrackingId: string | null = null;
let hasLoggedStorageReadFailure = false;
let hasLoggedStorageWriteFailure = false;

const buildAnonymousTrackingId = (): string => `${ANONYMOUS_TRACKING_ID_PREFIX}${nanoid(12)}`;

const readAnonymousTrackingId = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedValue = window.localStorage.getItem(ANONYMOUS_TRACKING_ID_STORAGE_KEY);

    if (storedValue && storedValue.startsWith(ANONYMOUS_TRACKING_ID_PREFIX)) {
      return storedValue;
    }
  } catch (storageError) {
    if (process.env.NODE_ENV !== 'production' && !hasLoggedStorageReadFailure) {
      hasLoggedStorageReadFailure = true;
      // eslint-disable-next-line no-console
      console.warn('Unable to read anonymous tracking id from storage', storageError);
    }
  }

  return null;
};

const persistAnonymousTrackingId = (trackingId: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(ANONYMOUS_TRACKING_ID_STORAGE_KEY, trackingId);
  } catch (storageError) {
    if (process.env.NODE_ENV !== 'production' && !hasLoggedStorageWriteFailure) {
      hasLoggedStorageWriteFailure = true;
      // eslint-disable-next-line no-console
      console.warn('Unable to persist anonymous tracking id', storageError);
    }
  }
};

const getAnonymousTrackingId = (): string => {
  if (inMemoryAnonymousTrackingId) {
    return inMemoryAnonymousTrackingId;
  }

  const storedValue = readAnonymousTrackingId();

  if (storedValue) {
    inMemoryAnonymousTrackingId = storedValue;
    return storedValue;
  }

  const newId = buildAnonymousTrackingId();
  inMemoryAnonymousTrackingId = newId;
  persistAnonymousTrackingId(newId);

  return newId;
};

const resolveAuthContext = async (): Promise<AuthContext> => {
  try {
    await Auth.currentAuthenticatedUser();
    return {
      authMode: 'AMAZON_COGNITO_USER_POOLS',
    };
  } catch {
    try {
      await Auth.currentCredentials();
    } catch (credentialError) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('Falling back to AWS_IAM for usage tracking', credentialError);
      }
    }

    return {
      authMode: 'AWS_IAM',
      trackingUserId: getAnonymousTrackingId(),
    };
  }
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

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null) {
    return false;
  }

  return typeof value === 'object' && !Array.isArray(value);
};

const augmentEventPayloadWithTrackingUserId = (
  eventData: UsageEventPayload,
  trackingUserId?: string
): UsageEventPayload => {
  if (!trackingUserId) {
    return eventData;
  }

  if (isPlainObject(eventData)) {
    if ('anonymousUserId' in eventData) {
      return eventData;
    }

    return {
      ...eventData,
      anonymousUserId: trackingUserId,
    };
  }

  if (eventData === undefined || eventData === null) {
    return {
      anonymousUserId: trackingUserId,
    };
  }

  return {
    anonymousUserId: trackingUserId,
    originalEventData: eventData,
  };
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

const buildCreateUsageEventInput = (
  eventType: string,
  eventData: UsageEventPayload,
  trackingUserId?: string,
  sessionId?: string
): CreateUsageEventInput => {
  const input: CreateUsageEventInput = {
    eventType,
  };

  if (trackingUserId) {
    input.identityId = trackingUserId;
  }

  if (sessionId) {
    input.sessionId = sessionId;
  }

  const payloadWithTrackingId = augmentEventPayloadWithTrackingUserId(eventData, trackingUserId);
  const serializedEventData = serializeEventData(payloadWithTrackingId);

  if (serializedEventData) {
    input.eventData = serializedEventData;
  }

  return input;
};

const sendUsageEvent = (
  eventType: string,
  eventData: UsageEventPayload
): void => {
  const requestTask = (async () => {
    let input: CreateUsageEventInput | undefined;

    try {
      const { authMode, trackingUserId } = await resolveAuthContext();
      const sessionId = await getSessionID();
      input = buildCreateUsageEventInput(eventType, eventData, trackingUserId, sessionId);
      const graphQLRequest: GraphQLOptions = {
        query: createUsageEventMutation,
        variables: { input },
        authMode,
      };

      await (API.graphql(graphQLRequest) as Promise<GraphQLResult<CreateUsageEventMutation>>);
    } catch (error) {
      logUsageEventError(error, input ?? { eventType });
    }
  })();

  void trackPromise(requestTask);
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

  Promise.resolve()
    .then(() => {
      sendUsageEvent(eventType, eventData);
    })
    .catch(async (error) => {
      const fallbackContext: CreateUsageEventInput = { eventType };
      const serializedEventData = serializeEventData(eventData);
      if (serializedEventData) {
        fallbackContext.eventData = serializedEventData;
      }

      try {
        fallbackContext.sessionId = await getSessionID();
      } catch (sessionError) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('Unable to resolve session id for usage event logging', sessionError);
        }
      }

      logUsageEventError(error, fallbackContext);
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

import { API, graphqlOperation } from 'aws-amplify';
import { onCreateTemplate, onDeleteTemplate, onUpdateTemplate } from '../../../../graphql/subscriptions';
import {
  addTemplatesListener,
  cacheProject,
  cloneProject,
  emitCurrentTemplates,
  getTemplatesListenerCount,
  normalizeTemplate,
  removeFromCache,
  removeTemplatesListener,
} from './cache';
import { getIdentityId, isDev, SUBSCRIPTION_RETRY_DELAY_MS } from './shared';
import type { GraphQLSubscriptionHandle, ProjectListener, TemplateModel, TemplatesListener } from './types';

let activeTemplateSubscriptions: GraphQLSubscriptionHandle[] = [];
let subscriptionStartPromise: Promise<void> | null = null;
let subscriptionRetryTimer: ReturnType<typeof setTimeout> | null = null;

function cleanupTemplateSubscriptions(): void {
  if (activeTemplateSubscriptions.length === 0) return;

  activeTemplateSubscriptions.forEach((subscription) => {
    try {
      subscription?.unsubscribe?.();
    } catch (err) {
      if (isDev()) console.warn('[templates] Failed to tear down template subscription', err);
    }
  });

  activeTemplateSubscriptions = [];
}

function stopTemplateSubscriptions(): void {
  if (subscriptionRetryTimer) {
    clearTimeout(subscriptionRetryTimer);
    subscriptionRetryTimer = null;
  }
  cleanupTemplateSubscriptions();
  subscriptionStartPromise = null;
}

function scheduleTemplateSubscriptionRestart(): void {
  if (subscriptionRetryTimer || getTemplatesListenerCount() === 0) return;

  subscriptionRetryTimer = setTimeout(() => {
    subscriptionRetryTimer = null;
    if (getTemplatesListenerCount() > 0) {
      void ensureTemplateSubscriptions().catch(() => {
        if (isDev()) console.warn('[templates] Retrying template subscriptions failed');
      });
    }
  }, SUBSCRIPTION_RETRY_DELAY_MS);
}

function handleTemplateSubscriptionError(err: unknown, source: string): void {
  if (isDev()) console.error(`[templates] ${source} subscription failed`, err);
  stopTemplateSubscriptions();
  scheduleTemplateSubscriptionRestart();
}

async function ensureTemplateSubscriptions(): Promise<void> {
  if (getTemplatesListenerCount() === 0) return;
  if (activeTemplateSubscriptions.length > 0) return;

  if (subscriptionStartPromise) {
    await subscriptionStartPromise;
    return;
  }

  if (subscriptionRetryTimer) {
    clearTimeout(subscriptionRetryTimer);
    subscriptionRetryTimer = null;
  }

  const start = async () => {
    try {
      const identityId = await getIdentityId();
      if (!identityId) {
        if (isDev()) console.warn('[templates] Skipping template subscriptions: identityId is unavailable');
        return;
      }

      const baseVariables = {
        filter: {
          ownerIdentityId: { eq: identityId },
        },
      };

      const subscribe = (
        query: string,
        key: 'onCreateTemplate' | 'onUpdateTemplate' | 'onDeleteTemplate',
        sourceLabel: string
      ) => {
        let observable: any;
        try {
          observable = API.graphql(graphqlOperation(query, baseVariables));
        } catch (err) {
          handleTemplateSubscriptionError(err, sourceLabel);
          return;
        }

        if (!observable || typeof observable.subscribe !== 'function') {
          if (isDev()) console.warn(`[templates] ${sourceLabel} subscription is not supported by API.graphql result`);
          return;
        }

        const subscription = observable.subscribe({
          next: (event: any) => {
            const payload = event?.value?.data?.[key] as TemplateModel | null | undefined;
            if (!payload || !payload.id) return;
            if (payload.ownerIdentityId && payload.ownerIdentityId !== identityId) return;

            if (key === 'onDeleteTemplate') {
              removeFromCache(payload.id);
              return;
            }

            const normalized = normalizeTemplate(payload);
            cacheProject(normalized);
          },
          error: (err: unknown) => {
            handleTemplateSubscriptionError(err, sourceLabel);
          },
          complete: () => {
            handleTemplateSubscriptionError(new Error(`${sourceLabel} subscription completed unexpectedly`), sourceLabel);
          },
        });

        activeTemplateSubscriptions.push(subscription as GraphQLSubscriptionHandle);
      };

      subscribe(onCreateTemplate, 'onCreateTemplate', 'createTemplate');
      subscribe(onUpdateTemplate, 'onUpdateTemplate', 'updateTemplate');
      subscribe(onDeleteTemplate, 'onDeleteTemplate', 'deleteTemplate');
    } catch (err) {
      if (isDev()) console.error('[templates] Failed to start template subscriptions', err);
      cleanupTemplateSubscriptions();
      throw err;
    } finally {
      subscriptionStartPromise = null;
    }
  };

  subscriptionStartPromise = start();
  await subscriptionStartPromise;
}

export function subscribeToTemplates(
  listener: TemplatesListener,
  { emitInitial = true }: { emitInitial?: boolean } = {}
): () => void {
  const shouldStart = addTemplatesListener(listener);
  if (shouldStart) {
    void ensureTemplateSubscriptions().catch(() => {
      if (isDev()) console.warn('[templates] Failed to establish template subscriptions');
    });
  }

  if (emitInitial) {
    emitCurrentTemplates(listener);
  }

  return () => {
    const remaining = removeTemplatesListener(listener);
    if (remaining === 0) {
      stopTemplateSubscriptions();
    }
  };
}

export function subscribeToProject(
  projectId: string,
  listener: ProjectListener
): () => void {
  if (!projectId) return () => {};

  let cancelled = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let subscription: GraphQLSubscriptionHandle | null = null;

  const cleanup = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (subscription) {
      try {
        subscription.unsubscribe?.();
      } catch (_) {
        // ignore
      }
      subscription = null;
    }
  };

  const start = async () => {
    cleanup();
    if (cancelled) return;

    try {
      const identityId = await getIdentityId();
      if (!identityId) {
        if (isDev()) console.warn(`[templates] Skipping project ${projectId} subscription: identityId is unavailable`);
        return;
      }

      const variables: Record<string, unknown> = {
        filter: {
          id: { eq: projectId },
          ownerIdentityId: { eq: identityId },
        },
      };

      const observable: any = API.graphql(graphqlOperation(onUpdateTemplate, variables));
      if (!observable || typeof observable.subscribe !== 'function') {
        if (isDev()) console.warn('[templates] Project subscription observable missing subscribe');
        return;
      }

      subscription = observable.subscribe({
        next: (payload: any) => {
          if (cancelled) return;
          const raw = payload?.value?.data?.onUpdateTemplate;
          if (!raw || raw.id !== projectId) return;
          if (raw.ownerIdentityId && raw.ownerIdentityId !== identityId) return;

          const normalized = normalizeTemplate(raw);
          cacheProject(normalized);
          listener(cloneProject(normalized));
        },
        error: (err: unknown) => {
          if (isDev()) console.warn(`[templates] Project ${projectId} subscription error`, err);
          cleanup();
          if (!cancelled) {
            retryTimer = setTimeout(start, SUBSCRIPTION_RETRY_DELAY_MS);
          }
        },
      });
    } catch (err) {
      if (isDev()) console.warn(`[templates] Failed to subscribe to project ${projectId}`, err);
      if (!cancelled) {
        retryTimer = setTimeout(start, SUBSCRIPTION_RETRY_DELAY_MS);
      }
    }
  };

  void start();

  return () => {
    cancelled = true;
    cleanup();
  };
}

import { API, Auth, Storage, graphqlOperation } from 'aws-amplify';
import type { GraphQLResult } from '@aws-amplify/api-graphql';
import type { CollageProject, CollageSnapshot } from '../../../types/collage';
import { buildSnapshotFromState as buildSnapshotFromStateLegacy } from './projects';
import { createTemplate, deleteTemplate, updateTemplate } from '../../../graphql/mutations';
import { getTemplate, templatesByOwnerIdentityIdAndCreatedAt } from '../../../graphql/queries';
import { onCreateTemplate, onUpdateTemplate, onDeleteTemplate } from '../../../graphql/subscriptions';

const STORAGE_LEVEL = 'protected';
const TEMPLATE_STORAGE_PREFIX = 'collage/templates';
const SNAPSHOT_FILENAME = 'snapshot.json';
const THUMBNAIL_FILENAME = 'thumbnail.jpg';
const LIST_PAGE_SIZE = 50;

type StorageLevel = 'public' | 'protected' | 'private';

type TemplateModel = {
  id: string;
  ownerIdentityId?: string | null;
  name?: string | null;
  state?: string | CollageSnapshot | null;
  snapshotKey?: string | null;
  snapshotVersion?: number | null;
  thumbnailKey?: string | null;
  thumbnailSignature?: string | null;
  thumbnailUpdatedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type TemplatesByOwnerIdentityIdQuery = {
  templatesByOwnerIdentityIdAndCreatedAt?: {
    items?: (TemplateModel | null)[] | null;
    nextToken?: string | null;
  } | null;
};

type GetTemplateQuery = {
  getTemplate?: TemplateModel | null;
};

type CreateTemplateMutation = {
  createTemplate?: TemplateModel | null;
};

type UpdateTemplateMutation = {
  updateTemplate?: TemplateModel | null;
};

type DeleteTemplateMutation = {
  deleteTemplate?: TemplateModel | null;
};

type UpsertProjectPayload = Partial<
  Pick<
    CollageProject,
    | 'name'
    | 'thumbnail'
    | 'thumbnailKey'
    | 'thumbnailSignature'
    | 'thumbnailUpdatedAt'
    | 'state'
    | 'snapshotKey'
    | 'snapshotVersion'
  >
>;

const templateCache = new Map<string, CollageProject>();
let templateCacheComplete = false;
let listInFlight: Promise<CollageProject[]> | null = null;
type ThumbnailCacheEntry = { url: string; signature: string; expiresAt: number };
const thumbnailUrlCache = new Map<string, ThumbnailCacheEntry>();
type TemplatesListener = (templates: CollageProject[]) => void;
const templateListeners = new Set<TemplatesListener>();
type ProjectListener = (project: CollageProject) => void;

type GraphQLSubscriptionHandle = { unsubscribe?: () => void };
let activeTemplateSubscriptions: GraphQLSubscriptionHandle[] = [];
let subscriptionStartPromise: Promise<void> | null = null;
let subscriptionRetryTimer: ReturnType<typeof setTimeout> | null = null;
const SUBSCRIPTION_RETRY_DELAY_MS = 2500;

function isDev(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function cloneSnapshot<T extends CollageSnapshot | null | undefined>(snapshot: T): CollageSnapshot | null {
  if (!snapshot) return null;
  try {
    return JSON.parse(JSON.stringify(snapshot)) as CollageSnapshot;
  } catch (_) {
    return snapshot as CollageSnapshot;
  }
}

function cloneProject(record: CollageProject): CollageProject {
  return {
    ...record,
    state: cloneSnapshot(record.state),
  };
}

function cacheProject(record: CollageProject): void {
  // Invalidate thumbnail URL cache when signature changes
  if (record.thumbnailKey) {
    const cacheSig = thumbnailUrlCache.get(record.thumbnailKey);
    const nextSig = buildThumbnailCacheSignature(record);
    if (cacheSig && cacheSig.signature !== nextSig) {
      thumbnailUrlCache.delete(record.thumbnailKey);
    }
  }
  templateCache.set(record.id, cloneProject(record));
  notifyListeners();
}

function replaceCache(records: CollageProject[]): void {
  templateCache.clear();
  thumbnailUrlCache.clear();
  records.forEach((record) => {
    templateCache.set(record.id, cloneProject(record));
  });
  templateCacheComplete = true;
  notifyListeners();
}

function removeFromCache(id: string): void {
  const cached = templateCache.get(id);
  if (cached?.thumbnailKey) {
    thumbnailUrlCache.delete(cached.thumbnailKey);
  }
  templateCache.delete(id);
  notifyListeners();
}

function cacheToArray(): CollageProject[] {
  return Array.from(templateCache.values())
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .map((record) => cloneProject(record));
}

function notifyListeners(): void {
  if (templateListeners.size === 0) return;
  const snapshot = cacheToArray();
  templateListeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (err) {
      if (isDev()) console.warn('[templates] Listener callback failed', err);
    }
  });
}

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
  if (subscriptionRetryTimer || templateListeners.size === 0) return;
  subscriptionRetryTimer = setTimeout(() => {
    subscriptionRetryTimer = null;
    if (templateListeners.size > 0) {
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

function parseSnapshot(raw: TemplateModel['state']): CollageSnapshot | null {
  if (!raw) return null;
  if (typeof raw === 'object') return raw as CollageSnapshot;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    try {
      return JSON.parse(raw) as CollageSnapshot;
    } catch (_) {
      if (isDev()) console.warn('[templates] Failed to parse snapshot JSON');
    }
  }
  return null;
}

function normalizeTemplate(model: TemplateModel): CollageProject {
  const nowIso = new Date().toISOString();
  return {
    id: model.id,
    ownerIdentityId: model.ownerIdentityId ?? null,
    name: model.name || 'Untitled Collage',
    createdAt: model.createdAt || nowIso,
    updatedAt: model.updatedAt || model.createdAt || nowIso,
    thumbnail: null,
    thumbnailKey: model.thumbnailKey ?? null,
    thumbnailSignature: model.thumbnailSignature ?? null,
    thumbnailUpdatedAt: model.thumbnailUpdatedAt ?? null,
    state: parseSnapshot(model.state),
    snapshotKey: model.snapshotKey ?? null,
    snapshotVersion: model.snapshotVersion ?? null,
  };
}

async function getIdentityId(): Promise<string | null> {
  try {
    const credentials = await Auth.currentCredentials();
    return credentials?.identityId ?? null;
  } catch (_) {
    return null;
  }
}

async function ensureTemplateSubscriptions(): Promise<void> {
  if (templateListeners.size === 0) return;
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

function buildSnapshotKey(id: string): string {
  return `${TEMPLATE_STORAGE_PREFIX}/${id}/${SNAPSHOT_FILENAME}`;
}

function buildThumbnailKey(id: string): string {
  return `${TEMPLATE_STORAGE_PREFIX}/${id}/${THUMBNAIL_FILENAME}`;
}

function buildThumbnailCacheSignature(record: Pick<CollageProject, 'thumbnailKey' | 'thumbnailSignature' | 'thumbnailUpdatedAt'>): string {
  return `${record.thumbnailKey ?? ''}|${record.thumbnailSignature ?? ''}|${record.thumbnailUpdatedAt ?? ''}`;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  if (!dataUrl.startsWith('data:')) {
    throw new Error('Expected a data URL for thumbnail rendering');
  }
  const response = await fetch(dataUrl);
  return response.blob();
}

async function uploadSnapshot(id: string, snapshot: CollageSnapshot, snapshotKey?: string | null): Promise<{ snapshotKey: string; snapshotVersion: number }> {
  const key = snapshotKey || buildSnapshotKey(id);
  const body = new Blob([JSON.stringify(snapshot)], { type: 'application/json' });
  await Storage.put(key, body, {
    level: STORAGE_LEVEL as StorageLevel,
    contentType: 'application/json',
    cacheControl: 'no-cache',
  } as any);
  const cached = templateCache.get(id);
  const currentVersion = cached?.snapshotVersion ?? 0;
  return { snapshotKey: key, snapshotVersion: currentVersion + 1 };
}

async function uploadThumbnail(
  id: string,
  thumbnail: string,
  thumbnailKey?: string | null
): Promise<{ thumbnailKey: string; thumbnailUpdatedAt: string }> {
  const key = thumbnailKey || buildThumbnailKey(id);
  const blob = await dataUrlToBlob(thumbnail);
  await Storage.put(key, blob, {
    level: STORAGE_LEVEL as StorageLevel,
    contentType: blob.type || 'image/jpeg',
    cacheControl: 'no-cache',
  } as any);
  return { thumbnailKey: key, thumbnailUpdatedAt: new Date().toISOString() };
}

async function removeObject(key: string): Promise<void> {
  try {
    await Storage.remove(key, { level: STORAGE_LEVEL as StorageLevel } as any);
  } catch (err) {
    if (isDev()) console.warn(`[templates] Failed to remove ${key}`, err);
  }
}

async function fetchAllTemplates(): Promise<CollageProject[]> {
  const identityId = await getIdentityId();
  if (!identityId) {
    replaceCache([]);
    return [];
  }

  const collected: CollageProject[] = [];
  let nextToken: string | null = null;
  do {
    const response = (await API.graphql(
      graphqlOperation(templatesByOwnerIdentityIdAndCreatedAt, {
        ownerIdentityId: identityId,
        sortDirection: 'DESC',
        limit: LIST_PAGE_SIZE,
        nextToken,
      })
    )) as GraphQLResult<TemplatesByOwnerIdentityIdQuery>;
    const connection = response?.data?.templatesByOwnerIdentityIdAndCreatedAt;
    const items = connection?.items || [];
    items
      .filter(
        (item): item is TemplateModel =>
          Boolean(item && item.id && (!item.ownerIdentityId || item.ownerIdentityId === identityId))
      )
      .map(normalizeTemplate)
      .forEach((record) => {
        collected.push(record);
      });
    nextToken = connection?.nextToken ?? null;
  } while (nextToken);
  replaceCache(collected);
  return cacheToArray();
}

async function fetchTemplateById(id: string): Promise<CollageProject | null> {
  const response = (await API.graphql(
    graphqlOperation(getTemplate, { id })
  )) as GraphQLResult<GetTemplateQuery>;
  const record = response?.data?.getTemplate;
  if (!record || !record.id) return null;
  const normalized = normalizeTemplate(record);
  cacheProject(normalized);
  return cloneProject(normalized);
}

export async function loadProjects({ forceRefresh = false }: { forceRefresh?: boolean } = {}): Promise<CollageProject[]> {
  const inFlightBeforeRefresh = forceRefresh ? listInFlight : null;
  if (inFlightBeforeRefresh) {
    try {
      await inFlightBeforeRefresh;
    } catch (err) {
      if (isDev()) console.warn('[templates] Ignoring templates list failure before force refresh', err);
    } finally {
      if (listInFlight === inFlightBeforeRefresh) {
        listInFlight = null;
      }
    }
  }
  if (forceRefresh) {
    templateCache.clear();
    templateCacheComplete = false;
  }
  if (templateCacheComplete && !forceRefresh) {
    return cacheToArray();
  }
  if (!listInFlight) {
    listInFlight = fetchAllTemplates()
      .catch((err) => {
        if (isDev()) console.error('[templates] Failed to load templates from API', err);
        throw err;
      })
      .finally(() => {
        listInFlight = null;
      });
  }
  return listInFlight;
}

export async function createProject({ name }: { name?: string } = {}): Promise<CollageProject> {
  const input: Record<string, unknown> = {
    name: name || 'Untitled Collage',
  };
  const identityId = await getIdentityId();
  if (identityId) input.ownerIdentityId = identityId;
  const response = (await API.graphql(
    graphqlOperation(createTemplate, { input })
  )) as GraphQLResult<CreateTemplateMutation>;
  const created = response?.data?.createTemplate;
  if (!created || !created.id) {
    throw new Error('createTemplate returned no record');
  }
  const normalized = normalizeTemplate(created);
  cacheProject(normalized);
  return cloneProject(normalized);
}

export async function getProject(id: string): Promise<CollageProject | null> {
  if (templateCache.has(id)) {
    return cloneProject(templateCache.get(id)!);
  }
  const fetched = await fetchTemplateById(id);
  return fetched ? cloneProject(fetched) : null;
}

export async function upsertProject(id: string, payload: UpsertProjectPayload): Promise<CollageProject> {
  if (!id) {
    throw new Error('Template id is required');
  }
  const current = templateCache.get(id) || (await fetchTemplateById(id));
  if (!current) {
    throw new Error(`Template ${id} not found`);
  }
  const input: Record<string, unknown> = { id };

  if (payload.name !== undefined) {
    input.name = payload.name;
  }

  if (payload.state !== undefined) {
    const snapshot = payload.state;
    if (!snapshot) {
      input.state = null;
      input.snapshotKey = null;
      input.snapshotVersion = null;
    } else {
      const { snapshotKey, snapshotVersion } = await uploadSnapshot(id, snapshot, current.snapshotKey);
      input.state = JSON.stringify(snapshot);
      input.snapshotKey = snapshotKey;
      input.snapshotVersion = snapshotVersion;
    }
  }

  if (payload.thumbnail !== undefined) {
    if (!payload.thumbnail) {
      input.thumbnailKey = null;
      if (payload.thumbnailSignature !== undefined) input.thumbnailSignature = payload.thumbnailSignature;
      if (payload.thumbnailUpdatedAt !== undefined) input.thumbnailUpdatedAt = payload.thumbnailUpdatedAt;
    } else {
      const signatureChanged =
        payload.thumbnailSignature !== undefined && payload.thumbnailSignature !== current.thumbnailSignature;
      const shouldUpload = signatureChanged || !current.thumbnailKey;
      let thumbnailKey = payload.thumbnailKey ?? current.thumbnailKey ?? null;
      let thumbnailUpdatedAt = payload.thumbnailUpdatedAt ?? current.thumbnailUpdatedAt ?? null;
      if (shouldUpload) {
        const uploaded = await uploadThumbnail(id, payload.thumbnail, thumbnailKey);
        thumbnailKey = uploaded.thumbnailKey;
        thumbnailUpdatedAt = uploaded.thumbnailUpdatedAt;
      }
      input.thumbnailKey = thumbnailKey;
      if (payload.thumbnailSignature !== undefined) input.thumbnailSignature = payload.thumbnailSignature;
      if (thumbnailUpdatedAt) input.thumbnailUpdatedAt = thumbnailUpdatedAt;
    }
  } else {
    if (payload.thumbnailKey !== undefined) input.thumbnailKey = payload.thumbnailKey;
    if (payload.thumbnailSignature !== undefined) input.thumbnailSignature = payload.thumbnailSignature;
    if (payload.thumbnailUpdatedAt !== undefined) input.thumbnailUpdatedAt = payload.thumbnailUpdatedAt;
  }

  if (payload.snapshotKey !== undefined && payload.state === undefined) {
    input.snapshotKey = payload.snapshotKey;
  }
  if (payload.snapshotVersion !== undefined && payload.state === undefined) {
    input.snapshotVersion = payload.snapshotVersion;
  }

  const response = (await API.graphql(
    graphqlOperation(updateTemplate, { input })
  )) as GraphQLResult<UpdateTemplateMutation>;
  const updated = response?.data?.updateTemplate;
  if (!updated || !updated.id) {
    throw new Error('updateTemplate returned no record');
  }
  const normalized = normalizeTemplate(updated);
  const merged: CollageProject = {
    ...normalized,
    state: payload.state !== undefined ? cloneSnapshot(payload.state) : normalized.state,
  };
  cacheProject(merged);
  return cloneProject(merged);
}

export async function deleteProject(id: string): Promise<void> {
  const current = templateCache.get(id) || (await fetchTemplateById(id));
  await API.graphql(
    graphqlOperation(deleteTemplate, { input: { id } })
  ) as GraphQLResult<DeleteTemplateMutation>;
  if (current?.snapshotKey) {
    await removeObject(current.snapshotKey);
  }
  if (current?.thumbnailKey) {
    await removeObject(current.thumbnailKey);
  }
  removeFromCache(id);
}

export const buildSnapshotFromState = buildSnapshotFromStateLegacy;

export function clearTemplateCache(): void {
  templateCache.clear();
  listInFlight = null;
  thumbnailUrlCache.clear();
  templateCacheComplete = false;
  notifyListeners();
}

export function subscribeToTemplates(
  listener: TemplatesListener,
  { emitInitial = true }: { emitInitial?: boolean } = {}
): () => void {
  const shouldStart = templateListeners.size === 0;
  templateListeners.add(listener);
  if (shouldStart) {
    void ensureTemplateSubscriptions().catch(() => {
      if (isDev()) console.warn('[templates] Failed to establish template subscriptions');
    });
  }
  if (emitInitial) {
    listener(cacheToArray());
  }
  return () => {
    templateListeners.delete(listener);
    if (templateListeners.size === 0) {
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

export function __debugGetCache(): Map<string, CollageProject> {
  return templateCache;
}

export async function resolveThumbnailUrl(
  project: Pick<CollageProject, 'thumbnail' | 'thumbnailKey' | 'thumbnailSignature' | 'thumbnailUpdatedAt'>,
  { forceRefresh = false, expiresIn = 300 }: { forceRefresh?: boolean; expiresIn?: number } = {}
): Promise<string | null> {
  if (project.thumbnailKey) {
    const signature = buildThumbnailCacheSignature(project);
    const cached = thumbnailUrlCache.get(project.thumbnailKey);
    const now = Date.now();
    const safeExpiresIn = Math.max(1, expiresIn);
    const isCacheFresh = cached && cached.signature === signature && cached.expiresAt > now + 1000;
    if (!forceRefresh && isCacheFresh) {
      return cached.url;
    }
    try {
      const urlOrObj = await Storage.get(project.thumbnailKey, {
        level: STORAGE_LEVEL as StorageLevel,
        expires: safeExpiresIn,
      } as any);
      const url = typeof urlOrObj === 'string' ? urlOrObj : (urlOrObj as any)?.signedUrl;
      if (typeof url === 'string') {
        thumbnailUrlCache.set(project.thumbnailKey, {
          url,
          signature,
          expiresAt: now + safeExpiresIn * 1000,
        });
        return url;
      }
    } catch (err) {
      if (isDev()) console.warn('[templates] Failed to fetch thumbnail URL', err);
      // Fall through to inline thumbnail if present
    }
  }
  return project.thumbnail ?? null;
}

export async function resolveTemplateSnapshot(
  projectOrId: string | Pick<CollageProject, 'id' | 'state' | 'snapshotKey'> | CollageProject
): Promise<CollageSnapshot | null> {
  const ensureRecord = async (): Promise<CollageProject | null> => {
    if (typeof projectOrId === 'string') {
      if (templateCache.has(projectOrId)) return templateCache.get(projectOrId)!;
      return fetchTemplateById(projectOrId);
    }
    if ('name' in projectOrId) {
      return projectOrId as CollageProject;
    }
    const cached = templateCache.get(projectOrId.id);
    if (cached) return cached;
    return fetchTemplateById(projectOrId.id);
  };
  const record = await ensureRecord();
  if (!record) return null;
  if (record.state) return cloneSnapshot(record.state);
  if (!record.snapshotKey) return null;
  try {
    const response = await Storage.get(record.snapshotKey, {
      level: STORAGE_LEVEL as StorageLevel,
      download: true,
      cacheControl: 'no-cache',
    } as any);
    const body = (response as any)?.Body;
    if (body instanceof Blob) {
      const text = await body.text();
      const parsed = JSON.parse(text) as CollageSnapshot;
      cacheProject({ ...record, state: parsed });
      return cloneSnapshot(parsed);
    }
    if (body && typeof body.text === 'function') {
      const text = await body.text();
      const parsed = JSON.parse(text) as CollageSnapshot;
      cacheProject({ ...record, state: parsed });
      return cloneSnapshot(parsed);
    }
    if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
      const view = body instanceof ArrayBuffer ? new Uint8Array(body) : new Uint8Array((body as ArrayBufferView).buffer);
      const text = new TextDecoder('utf-8').decode(view);
      const parsed = JSON.parse(text) as CollageSnapshot;
      cacheProject({ ...record, state: parsed });
      return cloneSnapshot(parsed);
    }
    if (typeof response === 'string') {
      const parsed = JSON.parse(response) as CollageSnapshot;
      cacheProject({ ...record, state: parsed });
      return cloneSnapshot(parsed);
    }
  } catch (err) {
    if (isDev()) console.warn('[templates] Failed to resolve snapshot from storage', err);
  }
  return null;
}

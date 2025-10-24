import { API, Auth, Storage, graphqlOperation } from 'aws-amplify';
import type { GraphQLResult } from '@aws-amplify/api-graphql';
import type { CollageProject, CollageSnapshot } from '../../../types/collage';
import {
  buildSnapshotFromState as buildSnapshotFromStateLegacy,
  loadProjects as loadProjectsLegacy,
  createProject as createProjectLegacy,
  getProject as getProjectLegacy,
  upsertProject as upsertProjectLegacy,
  deleteProject as deleteProjectLegacy,
} from './projects';
import { createTemplate, deleteTemplate, updateTemplate } from '../../../graphql/mutations';
import { getTemplate, listTemplates } from '../../../graphql/queries';

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

type ListTemplatesQuery = {
  listTemplates?: {
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
let listInFlight: Promise<CollageProject[]> | null = null;
let identityIdPromise: Promise<string | null> | null = null;

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
  templateCache.set(record.id, cloneProject(record));
}

function removeFromCache(id: string): void {
  templateCache.delete(id);
}

function cacheToArray(): CollageProject[] {
  return Array.from(templateCache.values())
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .map((record) => cloneProject(record));
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
  if (!identityIdPromise) {
    identityIdPromise = Auth.currentCredentials()
      .then((creds: any) => creds?.identityId ?? null)
      .catch(() => null);
  }
  return identityIdPromise;
}

function buildSnapshotKey(id: string): string {
  return `${TEMPLATE_STORAGE_PREFIX}/${id}/${SNAPSHOT_FILENAME}`;
}

function buildThumbnailKey(id: string): string {
  return `${TEMPLATE_STORAGE_PREFIX}/${id}/${THUMBNAIL_FILENAME}`;
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
  const collected: CollageProject[] = [];
  let nextToken: string | null = null;
  do {
    const response = (await API.graphql(
      graphqlOperation(listTemplates, { limit: LIST_PAGE_SIZE, nextToken })
    )) as GraphQLResult<ListTemplatesQuery>;
    const connection = response?.data?.listTemplates;
    const items = connection?.items || [];
    items
      .filter((item): item is TemplateModel => Boolean(item && item.id))
      .map(normalizeTemplate)
      .forEach((record) => {
        cacheProject(record);
        collected.push(cloneProject(record));
      });
    nextToken = connection?.nextToken ?? null;
  } while (nextToken);
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

async function runWithFallback<T>(handler: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  try {
    return await handler();
  } catch (err) {
    if (isDev()) console.warn('[templates] Remote helper failed, falling back to localStorage', err);
    return fallback();
  }
}

export async function loadProjects({ forceRefresh = false }: { forceRefresh?: boolean } = {}): Promise<CollageProject[]> {
  return runWithFallback(async () => {
    if (forceRefresh) {
      templateCache.clear();
      listInFlight = null;
    }
    if (templateCache.size > 0 && !forceRefresh) {
      return cacheToArray();
    }
    if (!listInFlight) {
      listInFlight = fetchAllTemplates().finally(() => {
        listInFlight = null;
      });
    }
    return listInFlight;
  }, async () => loadProjectsLegacy());
}

export async function createProject({ name }: { name?: string } = {}): Promise<CollageProject> {
  return runWithFallback(async () => {
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
  }, async () => createProjectLegacy({ name }));
}

export async function getProject(id: string): Promise<CollageProject | null> {
  if (templateCache.has(id)) {
    return cloneProject(templateCache.get(id)!);
  }
  return runWithFallback(async () => {
    const fetched = await fetchTemplateById(id);
    return fetched ? cloneProject(fetched) : null;
  }, async () => getProjectLegacy(id));
}

export async function upsertProject(id: string, payload: UpsertProjectPayload): Promise<CollageProject> {
  if (!id) {
    throw new Error('Template id is required');
  }
  return runWithFallback(async () => {
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
  }, async () => {
    upsertProjectLegacy(id, payload as any);
    const result = getProjectLegacy(id);
    if (!result) throw new Error(`Local project ${id} not found after upsert`);
    return result;
  });
}

export async function deleteProject(id: string): Promise<void> {
  return runWithFallback(async () => {
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
  }, async () => deleteProjectLegacy(id));
}

export const buildSnapshotFromState = buildSnapshotFromStateLegacy;

export function clearTemplateCache(): void {
  templateCache.clear();
  listInFlight = null;
}

export function __debugGetCache(): Map<string, CollageProject> {
  return templateCache;
}

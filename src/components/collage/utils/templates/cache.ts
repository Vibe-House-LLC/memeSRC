import type { CollageProject, CollageSnapshot } from '../../../../types/collage';
import { isDev } from './shared';
import type { TemplateModel, TemplatesListener, ThumbnailCacheEntry } from './types';

const templateCache = new Map<string, CollageProject>();
const thumbnailUrlCache = new Map<string, ThumbnailCacheEntry>();
const templateListeners = new Set<TemplatesListener>();
let templateCacheComplete = false;

export function cloneSnapshot<T extends CollageSnapshot | null | undefined>(snapshot: T): CollageSnapshot | null {
  if (!snapshot) return null;
  try {
    return JSON.parse(JSON.stringify(snapshot)) as CollageSnapshot;
  } catch (_) {
    return snapshot as CollageSnapshot;
  }
}

export function cloneProject(record: CollageProject): CollageProject {
  return {
    ...record,
    state: cloneSnapshot(record.state),
  };
}

export function parseSnapshot(raw: TemplateModel['state']): CollageSnapshot | null {
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

export function normalizeTemplate(model: TemplateModel): CollageProject {
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

export function buildThumbnailCacheSignature(
  record: Pick<CollageProject, 'thumbnailKey' | 'thumbnailSignature' | 'thumbnailUpdatedAt'>
): string {
  return `${record.thumbnailKey ?? ''}|${record.thumbnailSignature ?? ''}|${record.thumbnailUpdatedAt ?? ''}`;
}

export function cacheToArray(): CollageProject[] {
  return Array.from(templateCache.values())
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .map((record) => cloneProject(record));
}

export function notifyListeners(): void {
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

export function cacheProject(record: CollageProject): void {
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

export function replaceCache(records: CollageProject[]): void {
  templateCache.clear();
  thumbnailUrlCache.clear();
  records.forEach((record) => {
    templateCache.set(record.id, cloneProject(record));
  });
  templateCacheComplete = true;
  notifyListeners();
}

export function removeFromCache(id: string): void {
  const cached = templateCache.get(id);
  if (cached?.thumbnailKey) {
    thumbnailUrlCache.delete(cached.thumbnailKey);
  }
  templateCache.delete(id);
  notifyListeners();
}

export function clearCacheState({ notify = true }: { notify?: boolean } = {}): void {
  templateCache.clear();
  thumbnailUrlCache.clear();
  templateCacheComplete = false;
  if (notify) {
    notifyListeners();
  }
}

export function addTemplatesListener(listener: TemplatesListener): boolean {
  const shouldStart = templateListeners.size === 0;
  templateListeners.add(listener);
  return shouldStart;
}

export function removeTemplatesListener(listener: TemplatesListener): number {
  templateListeners.delete(listener);
  return templateListeners.size;
}

export function getTemplatesListenerCount(): number {
  return templateListeners.size;
}

export function emitCurrentTemplates(listener: TemplatesListener): void {
  listener(cacheToArray());
}

export function isCacheComplete(): boolean {
  return templateCacheComplete;
}

export function setCacheComplete(value: boolean): void {
  templateCacheComplete = Boolean(value);
}

export function getCachedProject(id: string): CollageProject | null {
  const cached = templateCache.get(id);
  return cached ? cloneProject(cached) : null;
}

export function getCachedProjectRaw(id: string): CollageProject | null {
  return templateCache.get(id) || null;
}

export function hasCachedProject(id: string): boolean {
  return templateCache.has(id);
}

export function getCacheMap(): Map<string, CollageProject> {
  return templateCache;
}

export function getThumbnailCacheEntry(key: string): ThumbnailCacheEntry | null {
  return thumbnailUrlCache.get(key) || null;
}

export function setThumbnailCacheEntry(key: string, entry: ThumbnailCacheEntry): void {
  thumbnailUrlCache.set(key, entry);
}

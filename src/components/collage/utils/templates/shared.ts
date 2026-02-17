import { Auth } from 'aws-amplify';

export const STORAGE_LEVEL = 'protected';
export const TEMPLATE_STORAGE_PREFIX = 'collage/templates';
export const SNAPSHOT_FILENAME = 'snapshot.json';
export const THUMBNAIL_FILENAME = 'thumbnail.jpg';
export const LIST_PAGE_SIZE = 50;
export const SUBSCRIPTION_RETRY_DELAY_MS = 2500;

export type StorageLevel = 'public' | 'protected' | 'private';

export function isDev(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export async function getIdentityId(): Promise<string | null> {
  try {
    const credentials = await Auth.currentCredentials();
    return credentials?.identityId ?? null;
  } catch (_) {
    return null;
  }
}

export function buildSnapshotKey(id: string): string {
  return `${TEMPLATE_STORAGE_PREFIX}/${id}/${SNAPSHOT_FILENAME}`;
}

export function buildThumbnailKey(id: string): string {
  return `${TEMPLATE_STORAGE_PREFIX}/${id}/${THUMBNAIL_FILENAME}`;
}

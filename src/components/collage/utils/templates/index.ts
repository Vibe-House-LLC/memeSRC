import { buildSnapshotFromState as buildSnapshotFromStateLegacy } from '../projects';
import {
  clearTemplateCache,
  createProject,
  deleteProject,
  getProject,
  loadProjects,
  resolveTemplateSnapshot,
  resolveThumbnailUrl,
  upsertProject,
} from './api';
import { getCacheMap } from './cache';
import { subscribeToProject, subscribeToTemplates } from './subscriptions';

export {
  clearTemplateCache,
  createProject,
  deleteProject,
  getProject,
  loadProjects,
  resolveTemplateSnapshot,
  resolveThumbnailUrl,
  subscribeToProject,
  subscribeToTemplates,
  upsertProject,
};

export const buildSnapshotFromState = buildSnapshotFromStateLegacy;

export function __debugGetCache() {
  return getCacheMap();
}

// Shared utilities for interacting with GitHub Releases and formatting helpers

import { readJSON, safeGetItem, safeRemoveItem, safeSetItem, writeJSON } from './storage';

export type ReleaseType = 'major' | 'minor' | 'patch';
export type ReleaseColor = 'error' | 'warning' | 'success' | 'info';

export interface ReleaseAsset {
  id: number;
  name?: string;
  browser_download_url?: string;
  download_count?: number;
}

export interface GitHubRelease {
  id: number;
  name?: string;
  tag_name?: string;
  draft?: boolean;
  prerelease?: boolean;
  published_at?: string;
  html_url?: string;
  body?: string;
  assets?: ReleaseAsset[];
}

export const DEFAULT_GITHUB_OWNER = 'Vibe-House-LLC';
export const DEFAULT_GITHUB_REPO = 'memeSRC';
export const DEFAULT_PAGE_SIZE = 20;

// Simple cross-refresh cache with 60s TTL, backed by memory and localStorage
const GITHUB_CACHE_TTL_MS = 60 * 1000;
const CACHE_PREFIX = 'githubReleasesCache:';

type CachedEntry<T> = { timestamp: number; data: T };
const memoryCache = new Map<string, CachedEntry<unknown>>();
const inflightRequests = new Map<string, Promise<unknown>>();

function getStorageKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

function readFromLocalStorage<T>(key: string): CachedEntry<T> | null {
  const parsed = readJSON<CachedEntry<T>>(getStorageKey(key));
  if (!parsed || typeof parsed.timestamp !== 'number') {
    return null;
  }
  const isFresh = Date.now() - parsed.timestamp < GITHUB_CACHE_TTL_MS;
  if (!isFresh) {
    safeRemoveItem(getStorageKey(key));
    return null;
  }
  return parsed;
}

function writeToLocalStorage<T>(key: string, data: T): void {
  const entry: CachedEntry<T> = { timestamp: Date.now(), data };
  writeJSON(getStorageKey(key), entry);
}

function getCached<T>(key: string): T | null {
  const mem = memoryCache.get(key) as CachedEntry<T> | undefined;
  if (mem && Date.now() - mem.timestamp < GITHUB_CACHE_TTL_MS) return mem.data;
  if (mem) memoryCache.delete(key);
  const ls = readFromLocalStorage<T>(key);
  if (ls) {
    memoryCache.set(key, ls);
    return ls.data;
  }
  return null;
}

function setCached<T>(key: string, data: T): void {
  const entry: CachedEntry<T> = { timestamp: Date.now(), data };
  memoryCache.set(key, entry);
  writeToLocalStorage<T>(key, data);
}

function buildReleasesUrl(params?: {
  owner?: string;
  repo?: string;
  perPage?: number;
  page?: number;
}): string {
  const owner = params?.owner || DEFAULT_GITHUB_OWNER;
  const repo = params?.repo || DEFAULT_GITHUB_REPO;
  const perPage = params?.perPage ?? DEFAULT_PAGE_SIZE;
  const page = params?.page ?? 1;
  return `https://api.github.com/repos/${owner}/${repo}/releases?per_page=${perPage}&page=${page}`;
}

export async function fetchReleases(params?: {
  owner?: string;
  repo?: string;
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}): Promise<GitHubRelease[]> {
  const url = buildReleasesUrl(params);
  const cacheKey = url;

  const cached = getCached<GitHubRelease[]>(cacheKey);
  if (cached) return cached;

  const existing = inflightRequests.get(cacheKey) as Promise<GitHubRelease[]> | undefined;
  if (existing) return existing;

  const request = (async (): Promise<GitHubRelease[]> => {
    const response = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: params?.signal,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitHub API error ${response.status}: ${text}`);
    }
    const data = (await response.json()) as GitHubRelease[];
    setCached<GitHubRelease[]>(cacheKey, data);
    return data;
  })();

  inflightRequests.set(cacheKey, request);
  try {
    const data = await request;
    return data;
  } finally {
    inflightRequests.delete(cacheKey);
  }
}

export async function fetchLatestRelease(params?: {
  owner?: string;
  repo?: string;
  signal?: AbortSignal;
}): Promise<GitHubRelease | null> {
  const releases = await fetchReleases({ ...params, page: 1, perPage: 1 });
  return Array.isArray(releases) && releases.length > 0 ? releases[0] : null;
}

export function getReleaseType(tagName?: string): ReleaseType {
  if (!tagName || typeof tagName !== 'string') return 'patch';
  const version = tagName.replace(/^v/, '');
  const parts = version.split('.');
  if (parts.length >= 3) {
    const [, minor, patch] = parts;
    if (patch === '0' && minor === '0') return 'major';
    if (patch === '0') return 'minor';
  }
  return 'patch';
}

export function getReleaseColor(type: ReleaseType, isPrerelease: boolean, isDraft: boolean): ReleaseColor {
  if (isDraft) return 'error';
  if (isPrerelease) return 'warning';
  switch (type) {
    case 'major':
      return 'error';
    case 'minor':
      return 'success';
    default:
      return 'info';
  }
}

export function formatRelativeTimeCompact(dateString?: string): string {
  if (!dateString) return 'Draft';
  const then = new Date(dateString).getTime();
  if (Number.isNaN(then)) return 'Draft';
  const now = Date.now();
  const seconds = Math.max(1, Math.floor((now - then) / 1000));
  if (seconds < 60) return '<1m ago';
  const units = [
    { label: 'y', secs: 31536000 },
    { label: 'mo', secs: 2592000 },
    { label: 'w', secs: 604800 },
    { label: 'd', secs: 86400 },
    { label: 'h', secs: 3600 },
    { label: 'm', secs: 60 },
  ];
  const matchingUnit = units.find((u) => seconds >= u.secs);
  if (matchingUnit) {
    const value = Math.floor(seconds / matchingUnit.secs);
    return `${value}${matchingUnit.label} ago`;
  }
  return '<1m ago';
}

export function processGitHubLinks(
  text?: string,
  owner: string = DEFAULT_GITHUB_OWNER,
  repo: string = DEFAULT_GITHUB_REPO
): string {
  if (!text || typeof text !== 'string') return text || '';

  const prRegex = new RegExp(`https://github\\.com/${owner}/${repo}/pull/(\\d+)`, 'g');
  const issueRegex = new RegExp(`https://github\\.com/${owner}/${repo}/issues/(\\d+)`, 'g');
  const compareRegex = new RegExp(`https://github\\.com/${owner}/${repo}/compare/([^\\s]+)\\.\\.\\.([^\\s)]+)`, 'g');

  return text
    .replace(prRegex, `[#$1](https://github.com/${owner}/${repo}/pull/$1)`) // PR links as #123
    .replace(issueRegex, `[#$1](https://github.com/${owner}/${repo}/issues/$1)`) // Issue links as #123
    .replace(/\b#(\d+)\b/g, `[#$1](https://github.com/${owner}/${repo}/pull/$1)`) // Bare #123 to PR by default
    .replace(compareRegex, `[($1...$2)](https://github.com/${owner}/${repo}/compare/$1...$2)`) // Compare range
    .replace(/\B@([a-zA-Z0-9-]{1,39})\b/g, '[@$1](https://github.com/$1)'); // Mentions
}

export const DISMISSED_VERSION_KEY = 'updateBannerDismissedVersion';

export function getDismissedVersion(): string {
  return safeGetItem(DISMISSED_VERSION_KEY) || '';
}

export function setDismissedVersion(tagName: string): void {
  safeSetItem(DISMISSED_VERSION_KEY, tagName);
}

export function formatReleaseDisplay(input?: string): string {
  if (!input || typeof input !== 'string') return input || '';
  const trimmed = input.trim();

  const fullSemverMatch = trimmed.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  if (fullSemverMatch) {
    const [, major, minor, patch] = fullSemverMatch;
    if (patch !== '0') return `v${major}.${minor}.${patch}`;
    if (minor !== '0') return `v${major}.${minor}`;
    return `v${major}`;
  }

  const twoPartMatch = trimmed.match(/^v?(\d+)\.(\d+)$/);
  if (twoPartMatch) {
    const [, major, minor] = twoPartMatch;
    return `v${major}.${minor}`;
  }

  const onePartMatch = trimmed.match(/^v?(\d+)$/);
  if (onePartMatch) {
    const [, major] = onePartMatch;
    return `v${major}`;
  }

  return trimmed;
}

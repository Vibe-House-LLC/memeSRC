export const __DO_NOT_USE = null;
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { get, getUrl, list, put, remove } from '../../utils/library/storage';

export default function useLibraryData({ pageSize = 10, storageLevel = 'protected', refreshToken = null, userSub = null } = {}) {
  const [items, setItems] = useState([]); // { key, url }
  const [allKeys, setAllKeys] = useState([]); // full list for paging: { key, lastModified, size }
  const [loading, setLoading] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [uploadingCount, setUploadingCount] = useState(0);

  const favoritesKey = useMemo(() => `libraryFavorites:${userSub || 'anon'}`, [userSub]);
  const [favorites, setFavorites] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(favoritesKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const persistFavorites = useCallback((next) => {
    try { localStorage.setItem(favoritesKey, JSON.stringify(next)); } catch {}
    return next;
  }, [favoritesKey]);

  const toggleFavorite = useCallback((key) => {
    setFavorites((prev) => {
      const updated = { ...prev };
      if (updated[key]) delete updated[key]; else updated[key] = Date.now();
      return persistFavorites(updated);
    });
  }, [persistFavorites]);

  const sortWithFavorites = useCallback((arr) => {
    const placeholders = arr.filter((i) => !i.key);
    const rest = arr.filter((i) => i.key);
    rest.sort((a, b) => {
      const af = favorites[a.key];
      const bf = favorites[b.key];
      if (af && bf) return bf - af;
      if (af) return -1;
      if (bf) return 1;
      return 0;
    });
    return [...placeholders, ...rest];
  }, [favorites]);

  const reload = useCallback(async () => {
    setItems([]);
    setLoadedCount(0);
    try {
      const all = await list('library/', { level: storageLevel });
      setAllKeys(all);
      if (all.length > 0) {
        const initialFavoriteKeys = all.filter((k) => favorites[k.key]);
        const nonFavs = all.filter((k) => !favorites[k.key]);
        const totalToLoad = Math.min(pageSize, all.length);
        const keysToLoad = [...initialFavoriteKeys, ...nonFavs].slice(0, totalToLoad);
        const urls = await Promise.all(keysToLoad.map(async (it) => ({ key: it.key, url: await getUrl(it.key, { level: storageLevel }) })));
        setItems(sortWithFavorites(urls));
        setLoadedCount(totalToLoad);
      }
    } catch (e) {
      // swallow here; surface via caller if desired
    }
  }, [favorites, pageSize, sortWithFavorites, storageLevel]);

  useEffect(() => { reload(); }, [reload, refreshToken]);

  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const currentlyLoadedKeys = new Set(items.filter((i) => i.key).map((i) => i.key));
      const remaining = allKeys.filter((k) => !currentlyLoadedKeys.has(k.key));
      const count = Math.min(pageSize, remaining.length);
      const toLoad = remaining.slice(0, count);
      const urls = await Promise.all(toLoad.map(async (it) => ({ key: it.key, url: await getUrl(it.key, { level: storageLevel }) })));
      setItems((prev) => sortWithFavorites([...prev, ...urls]));
      setLoadedCount((prev) => prev + count);
    } finally {
      setLoading(false);
    }
  }, [allKeys, items, loading, pageSize, sortWithFavorites, storageLevel]);

  const upload = useCallback(async (file, { onProgress } = {}) => {
    setUploadingCount((c) => c + 1);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const previewUrl = typeof window !== 'undefined' ? URL.createObjectURL(file) : undefined;
    // Insert placeholder at top
    setItems((prev) => sortWithFavorites([{ id, url: previewUrl, loading: true, progress: 0 }, ...prev]));
    try {
      const timestamp = Date.now();
      const rand = Math.random().toString(36).slice(2);
      const key = `library/${timestamp}-${rand}-${file.name || 'image'}`;
      const { url } = await put(key, file, {
        level: storageLevel,
        onProgress: (pct) => {
          if (onProgress) onProgress(pct);
          setItems((prev) => prev.map((it) => (it.id === id ? { ...it, progress: pct } : it)));
        },
      });
      // Replace placeholder with real item
      if (typeof window !== 'undefined' && previewUrl) {
        try { URL.revokeObjectURL(previewUrl); } catch {}
      }
      setAllKeys((prev) => [{ key, lastModified: new Date().toISOString(), size: file.size }, ...prev]);
      setItems((prev) => sortWithFavorites([{ key, url }, ...prev.filter((it) => it.id !== id)]));
      return { key, url };
    } catch (e) {
      if (typeof window !== 'undefined' && previewUrl) {
        try { URL.revokeObjectURL(previewUrl); } catch {}
      }
      // Drop placeholder on failure
      setItems((prev) => prev.filter((it) => it.id !== id));
      throw e;
    } finally {
      setUploadingCount((c) => Math.max(0, c - 1));
    }
  }, [sortWithFavorites, storageLevel]);

  const removeItem = useCallback(async (key) => {
    await remove(key, { level: storageLevel });
    setItems((prev) => prev.filter((i) => i.key !== key));
    setAllKeys((prev) => prev.filter((i) => i.key !== key));
  }, [storageLevel]);

  return { items, loading, loadMore, reload, upload, remove: removeItem, toggleFavorite, favorites };
}
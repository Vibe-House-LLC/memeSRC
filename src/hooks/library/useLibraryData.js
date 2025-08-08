import { useCallback, useEffect, useMemo, useState } from 'react';
import { getUrl, list, put, remove } from '../../utils/library/storage';

export default function useLibraryData({ pageSize = 10, storageLevel = 'protected', refreshToken = null } = {}) {
  const [items, setItems] = useState([]); // { key, url }
  const [allKeys, setAllKeys] = useState([]); // full list for paging: { key, lastModified, size }
  const [loading, setLoading] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  const hasMore = useMemo(() => loadedCount < allKeys.length, [loadedCount, allKeys.length]);

  // No favorites: keep original order as returned by storage
  const sortItems = useCallback((arr) => arr, []);

  const reload = useCallback(async () => {
    setItems([]);
    setLoadedCount(0);
    try {
      const all = await list('library/', { level: storageLevel, pageSize });
      setAllKeys(all);
      if (all.length > 0) {
        const totalToLoad = Math.min(pageSize, all.length);
        const keysToLoad = all.slice(0, totalToLoad);
        const urls = await Promise.all(keysToLoad.map(async (it) => ({ key: it.key, url: await getUrl(it.key, { level: storageLevel }) })));
        setItems(sortItems(urls));
        setLoadedCount(totalToLoad);
      }
    } catch (e) {
      // ignore list error; caller can trigger reload again
    }
  }, [pageSize, sortItems, storageLevel]);

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
      setItems((prev) => sortItems([...prev, ...urls]));
      setLoadedCount((prev) => prev + count);
    } finally {
      setLoading(false);
    }
  }, [allKeys, items, loading, pageSize, sortItems, storageLevel]);

  const upload = useCallback(async (file, { onProgress } = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const previewUrl = typeof window !== 'undefined' ? URL.createObjectURL(file) : undefined;
    // Insert placeholder at top
    setItems((prev) => sortItems([{ id, url: previewUrl, loading: true, progress: 0 }, ...prev]));
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
        try {
          URL.revokeObjectURL(previewUrl);
        } catch (err) {
          // ignore revoke errors
        }
      }
      setAllKeys((prev) => [{ key, lastModified: new Date().toISOString(), size: file.size }, ...prev]);
      setItems((prev) => sortItems([{ key, url }, ...prev.filter((it) => it.id !== id)]));
      setLoadedCount((prev) => prev + 1);
      return { key, url };
    } catch (e) {
      if (typeof window !== 'undefined' && previewUrl) {
        try {
          URL.revokeObjectURL(previewUrl);
        } catch (err) {
          // ignore revoke errors
        }
      }
      // Drop placeholder on failure
      setItems((prev) => prev.filter((it) => it.id !== id));
      throw e;
    }
  }, [sortItems, storageLevel]);

  const removeItem = useCallback(async (key) => {
    await remove(key, { level: storageLevel });
    setItems((prev) => prev.filter((i) => i.key !== key));
    setAllKeys((prev) => prev.filter((i) => i.key !== key));
  }, [storageLevel]);

  return { items, loading, hasMore, loadMore, reload, upload, remove: removeItem };
}
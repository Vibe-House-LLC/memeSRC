import { useCallback, useEffect, useMemo, useState } from 'react';
import { getUrl, list, put, remove } from '../../utils/library/storage';
import { resizeImage } from '../../utils/library/resizeImage';

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
      // Fetch the full list of keys (up to backend max), not limited by the UI page size
      const all = await list('library/', { level: storageLevel });
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

  // Create a placeholder item and return a handle
  const createPlaceholder = useCallback((file) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const previewUrl = typeof window !== 'undefined' ? URL.createObjectURL(file) : undefined;
    setItems((prev) =>
      sortItems([
        { id, url: previewUrl, loading: true, progress: 0, createdAt: Date.now() },
        ...prev,
      ])
    );
    return { id, previewUrl };
  }, [sortItems]);

  // Perform the actual resize and upload for a given placeholder handle
  const performUpload = useCallback(async (file, handle, { onProgress } = {}) => {
    const { id, previewUrl } = handle || {};
    // Yield to the browser so the placeholder can paint before heavy work
    try {
      await new Promise((resolve) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => resolve()) : setTimeout(resolve, 0)));
      await new Promise((resolve) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => resolve()) : setTimeout(resolve, 0)));
    } catch (_) { /* ignore */ }
    try {
      const toUpload = await resizeImage(file, 1000);
      const timestamp = Date.now();
      const rand = Math.random().toString(36).slice(2);
      const key = `library/${timestamp}-${rand}-${file.name || 'image'}`;
      const { url } = await put(key, toUpload, {
        level: storageLevel,
        onProgress: (pct) => {
          if (onProgress) onProgress(pct);
          if (id) setItems((prev) => prev.map((it) => (it.id === id ? { ...it, progress: pct } : it)));
        },
      });
      if (typeof window !== 'undefined' && previewUrl) {
        try { URL.revokeObjectURL(previewUrl); } catch (_) { /* ignore */ }
      }
      setAllKeys((prev) => [{ key, lastModified: new Date().toISOString(), size: toUpload?.size || file.size }, ...prev]);
      if (id) setItems((prev) => sortItems([{ key, url }, ...prev.filter((it) => it.id !== id)]));
      setLoadedCount((prev) => prev + 1);
      return { key, url };
    } catch (e) {
      if (typeof window !== 'undefined' && previewUrl) {
        try { URL.revokeObjectURL(previewUrl); } catch (_) { /* ignore */ }
      }
      if (id) setItems((prev) => prev.filter((it) => it.id !== id));
      throw e;
    }
  }, [sortItems, storageLevel]);

  // Legacy single-file API: create placeholder + upload
  const upload = useCallback(async (file, { onProgress } = {}) => {
    const handle = createPlaceholder(file);
    return performUpload(file, handle, { onProgress });
  }, [createPlaceholder, performUpload]);

  // Bulk upload with concurrency limit; shows all placeholders immediately
  const uploadMany = useCallback(async (files, { concurrency = 3 } = {}) => {
    const handles = files.map((f) => ({ file: f, handle: createPlaceholder(f) }));
    const results = new Array(handles.length);
    let cursor = 0;
    const startWorker = async () => {
      if (cursor >= handles.length) return;
      const idx = cursor + 1 - 1; // avoid ++ for explicitness
      cursor += 1;
      const { file, handle } = handles[idx];
      try {
        results[idx] = await performUpload(file, handle);
      } catch (_) {
        results[idx] = null;
      }
      await startWorker();
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, handles.length) }, () => startWorker()));
    return results;
  }, [createPlaceholder, performUpload]);

  const removeItem = useCallback(async (key) => {
    await remove(key, { level: storageLevel });
    setItems((prev) => prev.filter((i) => i.key !== key));
    setAllKeys((prev) => prev.filter((i) => i.key !== key));
  }, [storageLevel]);

  return { items, loading, hasMore, loadMore, reload, upload, uploadMany, remove: removeItem };
}
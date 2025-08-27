import { useCallback, useEffect, useMemo, useState } from 'react';
import { getUrl, list, put, remove } from '../../utils/library/storage';
import { resizeImage } from '../../utils/library/resizeImage';
import { UPLOAD_IMAGE_MAX_DIMENSION_PX } from '../../constants/imageProcessing';

export default function useLibraryData({ pageSize = 10, storageLevel = 'protected', refreshToken = null } = {}) {
  const [items, setItems] = useState([]); // { key, url }
  const [allKeys, setAllKeys] = useState([]); // full list for paging: { key, lastModified, size }
  const [loading, setLoading] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [fetchFromEnd, setFetchFromEnd] = useState(false);

  const hasMore = useMemo(() => loadedCount < allKeys.length, [loadedCount, allKeys.length]);

  // No favorites: keep original order as returned by storage
  const sortItems = useCallback((arr) => arr, []);

  const reload = useCallback(async ({ fromEnd } = {}) => {
    const useFromEnd = typeof fromEnd === 'boolean' ? fromEnd : fetchFromEnd;
    setFetchFromEnd(useFromEnd);
    setItems([]);
    setLoadedCount(0);
    try {
      // Fetch the full list of keys (up to backend max), not limited by the UI page size
      const all = await list('library/', { level: storageLevel });
      setAllKeys(all);
      if (all.length > 0) {
        const totalToLoad = Math.min(pageSize, all.length);
        const keysToLoad = useFromEnd ? all.slice(-totalToLoad) : all.slice(0, totalToLoad);
        const urls = await Promise.all(keysToLoad.map(async (it) => ({ key: it.key, url: await getUrl(it.key, { level: storageLevel }) })));
        setItems(sortItems(urls));
        setLoadedCount(totalToLoad);
      }
    } catch (e) {
      // ignore list error; caller can trigger reload again
    }
  }, [fetchFromEnd, pageSize, sortItems, storageLevel]);

  useEffect(() => { reload(); }, [reload, refreshToken]);

  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const currentlyLoadedKeys = new Set(items.filter((i) => i.key).map((i) => i.key));
      const remaining = allKeys.filter((k) => !currentlyLoadedKeys.has(k.key));
      const count = Math.min(pageSize, remaining.length);
      const toLoad = fetchFromEnd ? remaining.slice(-count) : remaining.slice(0, count);
      const urls = await Promise.all(toLoad.map(async (it) => ({ key: it.key, url: await getUrl(it.key, { level: storageLevel }) })));
      setItems((prev) => sortItems([...prev, ...urls]));
      setLoadedCount((prev) => prev + count);
    } finally {
      setLoading(false);
    }
  }, [allKeys, fetchFromEnd, items, loading, pageSize, sortItems, storageLevel]);

  // Create a placeholder item and return a handle
  const createPlaceholder = useCallback((file, { withPreview = true, createdAtValue } = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const previewUrl = withPreview && typeof window !== 'undefined' ? URL.createObjectURL(file) : undefined;
    setItems((prev) =>
      sortItems([
        // progress intentionally left undefined so UI shows indeterminate until upload starts
        { id, url: previewUrl, loading: true, createdAt: typeof createdAtValue === 'number' ? createdAtValue : Date.now() },
        ...prev,
      ])
    );
    return { id, previewUrl };
  }, [sortItems]);

  // Perform the actual resize and upload for a given placeholder handle
  const performUpload = useCallback(async (file, handle, { onProgress } = {}) => {
    const { id, previewUrl, plannedTimestamp } = handle || {};
    // Yield to the browser so the placeholder can paint before heavy work
    try {
      await new Promise((resolve) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => resolve()) : setTimeout(resolve, 0)));
      await new Promise((resolve) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => resolve()) : setTimeout(resolve, 0)));
    } catch (_) { /* ignore */ }
    try {
      const toUpload = await resizeImage(file, UPLOAD_IMAGE_MAX_DIMENSION_PX);
      // Yield before network upload to keep UI responsive
      try {
        // eslint-disable-next-line no-unused-expressions
        await new Promise((resolve) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => resolve()) : setTimeout(resolve, 0)));
      } catch (_) { /* ignore */ }
      const timestamp = typeof plannedTimestamp === 'number' ? plannedTimestamp : Date.now();
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
      if (id) setItems((prev) => prev.map((it) => (it.id === id ? { key, url, createdAt: timestamp } : it)));
      setLoadedCount((prev) => prev + 1);
      return { key, url };
    } catch (e) {
      if (typeof window !== 'undefined' && previewUrl) {
        try { URL.revokeObjectURL(previewUrl); } catch (_) { /* ignore */ }
      }
      if (id) {
        // Keep the placeholder but mark as failed so the UI can indicate an error
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, loading: false, error: true } : it)));
      }
      throw e;
    }
  }, [sortItems, storageLevel]);

  // Legacy single-file API: create placeholder + upload
  const upload = useCallback(async (file, { onProgress } = {}) => {
    const plannedTimestamp = Date.now();
    const handle = createPlaceholder(file, { withPreview: true, createdAtValue: plannedTimestamp });
    return performUpload(file, { ...handle, plannedTimestamp }, { onProgress });
  }, [createPlaceholder, performUpload]);

  // Bulk upload with concurrency limit; shows placeholders immediately (without previews) to reduce memory pressure
  const uploadMany = useCallback(async (files, { concurrency = 1 } = {}) => {
    const handles = [];
    const baseTs = Date.now();
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const plannedTimestamp = baseTs - i; // stable newest-first across selection order
      // Create placeholder without preview first with planned timestamp
      handles.push({ file, plannedTimestamp, handle: createPlaceholder(file, { withPreview: false, createdAtValue: plannedTimestamp }) });
      // Yield every 8 placeholders so React can paint and avoid jank
      if ((i + 1) % 8 === 0) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => resolve()) : setTimeout(resolve, 0)));
        } catch (_) { /* ignore */ }
      }
    }
    const results = new Array(handles.length);
    const workerCount = Math.min(concurrency, handles.length);
    const worker = async (workerIndex) => {
      // Deterministic strided partitioning avoids shared mutable state across workers
      for (let idx = workerIndex; idx < handles.length; idx += workerCount) {
        const { file, handle, plannedTimestamp } = handles[idx];
        // Create preview URL just-in-time and attach to placeholder
        let previewUrl;
        if (typeof window !== 'undefined') {
          try { previewUrl = URL.createObjectURL(file); } catch (_) { /* ignore */ }
        }
        if (previewUrl && handle?.id) {
          setItems((prev) => prev.map((it) => (it.id === handle.id ? { ...it, url: previewUrl } : it)));
        }
        try {
          // eslint-disable-next-line no-await-in-loop
          results[idx] = await performUpload(file, { id: handle?.id, previewUrl, plannedTimestamp });
        } catch (_) {
          results[idx] = null;
          if (typeof window !== 'undefined' && previewUrl) {
            try { URL.revokeObjectURL(previewUrl); } catch (_) { /* ignore */ }
          }
        }
        // Small delay between tasks to avoid overwhelming CPU/GPU on large batches
        try {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((resolve) => setTimeout(resolve, 10));
        } catch (_) { /* ignore */ }
      }
    };
    await Promise.all(Array.from({ length: workerCount }, (_, i) => worker(i)));
    return results;
  }, [createPlaceholder, performUpload]);

  const removeItem = useCallback(async (key) => {
    await remove(key, { level: storageLevel });
    setItems((prev) => prev.filter((i) => i.key !== key));
    setAllKeys((prev) => prev.filter((i) => i.key !== key));
  }, [storageLevel]);

  return { items, loading, hasMore, loadMore, reload, upload, uploadMany, remove: removeItem };
}

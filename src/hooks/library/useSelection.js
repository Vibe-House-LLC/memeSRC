import { useCallback, useMemo, useState } from 'react';

export default function useSelection({ multiple = true, maxSelected = Infinity } = {}) {
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());

  const isSelected = useCallback((key) => selectedKeys.has(key), [selectedKeys]);

  const toggle = useCallback((key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (multiple) {
        if (next.has(key)) {
          next.delete(key);
        } else {
          // Enforce max selection when adding a new key
          if (Number.isFinite(maxSelected) && next.size >= maxSelected) {
            return prev; // no-op when at max
          }
          next.add(key);
        }
      } else {
        next.clear();
        if (!prev.has(key)) next.add(key);
      }
      return next;
    });
  }, [multiple, maxSelected]);

  const clear = useCallback(() => setSelectedKeys(new Set()), []);

  // Replace the entire selection set in one atomic update
  const setKeys = useCallback((keysArray) => {
    const next = new Set();
    if (Array.isArray(keysArray)) {
      if (multiple) {
        for (let i = 0; i < keysArray.length; i += 1) {
          const k = keysArray[i];
          if (k == null) {
            // skip null/undefined without using continue (eslint: no-continue)
          } else if (Number.isFinite(maxSelected) && next.size >= maxSelected) {
            break;
          } else {
            next.add(k);
          }
        }
      } else if (keysArray.length > 0 && keysArray[0] != null) {
        next.add(keysArray[0]);
      }
    }
    setSelectedKeys(next);
  }, [multiple, maxSelected]);

  const count = useMemo(() => selectedKeys.size, [selectedKeys]);
  const atMax = useMemo(() => Number.isFinite(maxSelected) && count >= maxSelected, [count, maxSelected]);

  return { selectedKeys, isSelected, toggle, clear, count, atMax, setKeys };
}

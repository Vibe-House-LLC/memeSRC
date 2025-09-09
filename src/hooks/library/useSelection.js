import { useCallback, useMemo, useState } from 'react';

export default function useSelection({ multiple = true, maxSelected = Infinity } = {}) {
  // Track membership in a Set for O(1) checks and a separate ordered list
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [orderedKeys, setOrderedKeys] = useState(() => []);

  const isSelected = useCallback((key) => selectedKeys.has(key), [selectedKeys]);

  const toggle = useCallback((key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (multiple) {
        if (next.has(key)) {
          next.delete(key);
          // Remove from ordered list
          setOrderedKeys((prevOrdered) => prevOrdered.filter((k) => k !== key));
        } else {
          // Enforce max selection when adding a new key
          if (Number.isFinite(maxSelected) && next.size >= maxSelected) {
            return prev; // no-op when at max
          }
          next.add(key);
          setOrderedKeys((prevOrdered) => [...prevOrdered, key]);
        }
      } else {
        // Single-select: clear previous and set this key
        const wasSelected = prev.has(key);
        next.clear();
        if (!wasSelected) {
          next.add(key);
          setOrderedKeys([key]);
        } else {
          setOrderedKeys([]);
        }
      }
      return next;
    });
  }, [multiple, maxSelected]);

  const clear = useCallback(() => {
    setSelectedKeys(new Set());
    setOrderedKeys([]);
  }, []);

  const count = useMemo(() => selectedKeys.size, [selectedKeys]);
  const atMax = useMemo(() => Number.isFinite(maxSelected) && count >= maxSelected, [count, maxSelected]);

  return { selectedKeys, orderedKeys, isSelected, toggle, clear, count, atMax };
}

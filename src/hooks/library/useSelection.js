import { useCallback, useMemo, useState } from 'react';

export default function useSelection({ multiple = true } = {}) {
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());

  const isSelected = useCallback((key) => selectedKeys.has(key), [selectedKeys]);

  const toggle = useCallback((key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (multiple) {
        if (next.has(key)) next.delete(key); else next.add(key);
      } else {
        next.clear();
        if (!prev.has(key)) next.add(key);
      }
      return next;
    });
  }, [multiple]);

  const clear = useCallback(() => setSelectedKeys(new Set()), []);

  const count = useMemo(() => selectedKeys.size, [selectedKeys]);

  return { selectedKeys, isSelected, toggle, clear, count };
}
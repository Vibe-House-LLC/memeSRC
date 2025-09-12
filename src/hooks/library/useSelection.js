import { useCallback, useMemo, useReducer } from 'react';

// Local helper to avoid duplicated logic and ensure atomic updates
function reducer(state, action) {
  switch (action.type) {
    case 'CLEAR':
      return { selected: new Set(), ordered: [] };
    case 'TOGGLE': {
      const { key, multiple, maxSelected } = action;
      const selected = new Set(state.selected);
      let ordered = state.ordered.slice();

      if (multiple) {
        if (selected.has(key)) {
          selected.delete(key);
          ordered = ordered.filter((k) => k !== key);
        } else {
          if (Number.isFinite(maxSelected) && selected.size >= maxSelected) {
            // At max, ignore new adds
            return state;
          }
          selected.add(key);
          ordered.push(key);
        }
      } else {
        // Single select mode
        const wasSelected = selected.has(key);
        selected.clear();
        if (!wasSelected) {
          selected.add(key);
          ordered = [key];
        } else {
          ordered = [];
        }
      }

      return { selected, ordered };
    }
    default:
      return state;
  }
}

export default function useSelection({ multiple = true, maxSelected = Infinity } = {}) {
  // Keep selection membership and order in a single reducer to avoid race conditions
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ selected: new Set(), ordered: [] }));

  const isSelected = useCallback((key) => state.selected.has(key), [state.selected]);

  const toggle = useCallback(
    (key) => {
      dispatch({ type: 'TOGGLE', key, multiple, maxSelected });
    },
    [multiple, maxSelected]
  );

  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const selectedKeys = state.selected;
  const orderedKeys = state.ordered;

  const count = useMemo(() => selectedKeys.size, [selectedKeys]);
  const atMax = useMemo(() => Number.isFinite(maxSelected) && count >= maxSelected, [count, maxSelected]);

  return { selectedKeys, orderedKeys, isSelected, toggle, clear, count, atMax };
}

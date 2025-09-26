import { useCallback, useEffect, useRef } from 'react';
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { trackUsageEvent } from '../utils/trackUsageEvent';

export type SaveIntentTrigger = 'context_menu' | 'long_press' | 'drag_start';

const DUPLICATE_TRIGGER_WINDOW_MS = 800;
const DEFAULT_LONG_PRESS_DELAY_MS = 400; // fire slightly before native save menus

export interface ImageSaveIntentMeta extends Record<string, unknown> {
  source: string;
}

export interface UseTrackImageSaveIntentOptions {
  longPressDelayMs?: number;
}

interface PointerState {
  timeoutId: number | null;
  pointerId: number | null;
  pointerType: string | null;
}

const readPointerType = (nativeEvent: unknown): string | undefined => {
  if (
    nativeEvent &&
    typeof nativeEvent === 'object' &&
    'pointerType' in nativeEvent &&
    typeof (nativeEvent as { pointerType?: unknown }).pointerType === 'string'
  ) {
    return (nativeEvent as { pointerType: string }).pointerType;
  }

  if (
    nativeEvent &&
    typeof nativeEvent === 'object' &&
    'type' in nativeEvent &&
    typeof (nativeEvent as { type?: unknown }).type === 'string'
  ) {
    const typeValue = (nativeEvent as { type: string }).type;
    if (typeValue.startsWith('touch')) {
      return 'touch';
    }

    if (typeValue.startsWith('mouse')) {
      return 'mouse';
    }

    if (typeValue.startsWith('pen')) {
      return 'pen';
    }
  }

  return undefined;
};

type EventPayload = Record<string, unknown>;

export const useTrackImageSaveIntent = (
  meta: ImageSaveIntentMeta,
  options?: UseTrackImageSaveIntentOptions
) => {
  const longPressDelayMs = options?.longPressDelayMs ?? DEFAULT_LONG_PRESS_DELAY_MS;
  const pointerStateRef = useRef<PointerState>({ timeoutId: null, pointerId: null, pointerType: null });
  const lastIntentRef = useRef<{ type: SaveIntentTrigger; timestamp: number; pointerType?: string } | null>(null);
  const latestMetaRef = useRef<ImageSaveIntentMeta>(meta);

  useEffect(() => {
    latestMetaRef.current = meta;
  }, [meta]);

  const emitIntent = useCallback(
    (trigger: SaveIntentTrigger, extra?: EventPayload) => {
      const payload: EventPayload = {
        trigger,
        ...latestMetaRef.current,
      };

      if (extra) {
        Object.assign(payload, extra);
      }

      trackUsageEvent('save_intent_image', payload);
      const pointerTypeValue =
        (extra && typeof extra.pointerType === 'string' ? extra.pointerType : undefined) ||
        pointerStateRef.current.pointerType;
      lastIntentRef.current = { type: trigger, timestamp: Date.now(), pointerType: pointerTypeValue };
    },
    []
  );

  const clearLongPressTimeout = useCallback(() => {
    const state = pointerStateRef.current;
    if (state.timeoutId !== null) {
      window.clearTimeout(state.timeoutId);
    }

    state.timeoutId = null;
  }, []);

  const resetPointerMetadata = useCallback(() => {
    const state = pointerStateRef.current;
    state.pointerId = null;
    state.pointerType = null;
  }, []);

  useEffect(
    () => () => {
      clearLongPressTimeout();
      resetPointerMetadata();
    },
    [clearLongPressTimeout, resetPointerMetadata]
  );

  const scheduleLongPress = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') {
        return;
      }

      clearLongPressTimeout();

      const state = pointerStateRef.current;
      state.pointerId = event.pointerId;
      state.pointerType = event.pointerType;

      state.timeoutId = window.setTimeout(() => {
        state.timeoutId = null;
        emitIntent('long_press', { pointerType: event.pointerType });
      }, longPressDelayMs);
    },
    [clearLongPressTimeout, emitIntent, longPressDelayMs]
  );

  const handleContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      const pointerType =
        readPointerType(event.nativeEvent) || pointerStateRef.current.pointerType || 'mouse';

      const lastIntent = lastIntentRef.current;
      if (
        lastIntent?.type === 'long_press' &&
        Date.now() - lastIntent.timestamp < DUPLICATE_TRIGGER_WINDOW_MS &&
        (lastIntent.pointerType && lastIntent.pointerType !== 'mouse')
      ) {
        return;
      }

      emitIntent('context_menu', { pointerType });
    },
    [emitIntent]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const state = pointerStateRef.current;
      state.pointerId = event.pointerId;
      state.pointerType = event.pointerType;
      scheduleLongPress(event);
    },
    [scheduleLongPress]
  );

  const cancelLongPress = useCallback(() => {
    clearLongPressTimeout();
    resetPointerMetadata();
  }, [clearLongPressTimeout, resetPointerMetadata]);

  const handleDragStart = useCallback(
    (event: ReactDragEvent<HTMLElement>) => {
      const pointerType =
        readPointerType(event.nativeEvent) || pointerStateRef.current.pointerType || 'mouse';
      emitIntent('drag_start', { pointerType });
    },
    [emitIntent]
  );

  return {
    onContextMenu: handleContextMenu,
    onPointerDown: handlePointerDown,
    onPointerUp: cancelLongPress,
    onPointerLeave: cancelLongPress,
    onPointerCancel: cancelLongPress,
    onDragStart: handleDragStart,
  } as const;
};

export default useTrackImageSaveIntent;

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Slider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  ArrowBackRounded,
  BrushRounded,
  CenterFocusStrongRounded,
  FitScreenRounded,
  OpenWithRounded,
  RedoRounded,
  ReplayRounded,
  UndoRounded,
  WaterDropRounded,
  ZoomInRounded,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { ExportedStickerEdit, LoadedStickerSource, ViewTransform } from './stickerBrushMath';
import {
  applyOverlayToMaskCanvas,
  clampTransformToViewport,
  createCenteredTransformForBounds,
  cloneCanvas,
  createFitTransform,
  createOpaqueMaskCanvas,
  createTransparentCanvas,
  exportMaskedSticker,
  getCanvasNonTransparentBounds,
  imageToScreenPoint,
  isMaskCanvasPristine,
  loadStickerSource,
  renderStickerViewport,
  resetMaskCanvas,
  screenToImagePoint,
  stampBrushStrokeOnCanvas,
  STICKER_EDITOR_MAX_DIMENSION_PX,
  updateCompositeCanvas,
} from './stickerBrushMath';

type StickerBrushEditorProps = {
  imageSrc: string;
  busy?: boolean;
  onAdd: (result: ExportedStickerEdit) => void | Promise<void>;
  onBack: () => void;
};

type PointerPoint = {
  x: number;
  y: number;
};

type InteractionMode = 'none' | 'draw' | 'pan' | 'pinch';
type DrawSession = {
  startPoint: PointerPoint;
  lastPoint: PointerPoint;
  hasAppliedStroke: boolean;
};

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const DRAW_START_THRESHOLD_PX = 6;
const FLOATING_CANVAS_CONTROL_GAP_PX = 16;
const HISTORY_LIMIT = 40;
const MIN_VIEW_SCALE = 0.005;
const MAX_VIEW_SCALE = 512;

const getDistance = (first: PointerPoint, second: PointerPoint): number => {
  const dx = second.x - first.x;
  const dy = second.y - first.y;
  return Math.sqrt((dx * dx) + (dy * dy));
};

const getMidpoint = (first: PointerPoint, second: PointerPoint): PointerPoint => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2,
});

const getAngle = (first: PointerPoint, second: PointerPoint): number => (
  Math.atan2(second.y - first.y, second.x - first.x)
);

const getOrderedActivePoints = (pointers: Map<number, PointerPoint>): PointerPoint[] => (
  Array.from(pointers.entries())
    .sort(([firstId], [secondId]) => firstId - secondId)
    .map(([, point]) => point)
);

export default function StickerBrushEditor({
  imageSrc,
  busy = false,
  onAdd,
  onBack,
}: StickerBrushEditorProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const sourceCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const compositeCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const strokeBaseMaskCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const strokeOverlayCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const transformRef = React.useRef<ViewTransform | null>(null);
  const hasUserAdjustedViewRef = React.useRef(false);
  const historySnapshotsRef = React.useRef<HTMLCanvasElement[]>([]);
  const historyIndexRef = React.useRef(0);
  const editSessionBaselineRef = React.useRef<{
    mask: HTMLCanvasElement;
    historySnapshots: HTMLCanvasElement[];
    historyIndex: number;
    hasApproximateEdits: boolean;
    previewResult: ExportedStickerEdit | null;
  } | null>(null);
  const renderFrameRef = React.useRef<number | null>(null);
  const brushPreviewTimeoutRef = React.useRef<number | null>(null);
  const activePointersRef = React.useRef<Map<number, PointerPoint>>(new Map());
  const interactionModeRef = React.useRef<InteractionMode>('none');
  const drawSessionRef = React.useRef<DrawSession | null>(null);
  const drawingPointerIdRef = React.useRef<number | null>(null);
  const panPointerIdRef = React.useRef<number | null>(null);
  const lastPanPointRef = React.useRef<PointerPoint | null>(null);
  const shiftPressedRef = React.useRef(false);
  const hasApproximateEditsRef = React.useRef(false);
  const pinchStateRef = React.useRef<{
    startDistance: number;
    startScale: number;
    startRotation: number;
    startAngle: number;
    startMidImage: PointerPoint;
  } | null>(null);
  const [brushMode, setBrushMode] = React.useState<'erase' | 'restore'>('erase');
  const [brushSize, setBrushSize] = React.useState(44);
  const [brushOpacity, setBrushOpacity] = React.useState(1);
  const [viewportSize, setViewportSize] = React.useState({ width: 0, height: 0 });
  const [loadedSource, setLoadedSource] = React.useState<LoadedStickerSource | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editorError, setEditorError] = React.useState<string>('');
  const [hasApproximateEdits, setHasApproximateEdits] = React.useState(false);
  const [previewResult, setPreviewResult] = React.useState<ExportedStickerEdit | null>(null);
  const [previewBusy, setPreviewBusy] = React.useState(false);
  const [commitBusy, setCommitBusy] = React.useState(false);
  const [screenMode, setScreenMode] = React.useState<'preview' | 'edit'>('preview');
  const [interactionMode, setInteractionMode] = React.useState<InteractionMode>('none');
  const [panModifierPressed, setPanModifierPressed] = React.useState(false);
  const [brushPreviewVisible, setBrushPreviewVisible] = React.useState(false);
  const [historyState, setHistoryState] = React.useState({ canUndo: false, canRedo: false });
  const [discardConfirmOpen, setDiscardConfirmOpen] = React.useState(false);

  const scheduleRender = React.useCallback(() => {
    if (renderFrameRef.current != null) return;
    renderFrameRef.current = window.requestAnimationFrame(() => {
      renderFrameRef.current = null;
      const canvas = canvasRef.current;
      const composite = compositeCanvasRef.current;
      const transform = transformRef.current;
      if (!canvas || !composite || !transform) return;
      renderStickerViewport({
        targetCanvas: canvas,
        compositeCanvas: composite,
        transform,
      });
    });
  }, []);

  const clampTransform = React.useCallback((nextTransform: ViewTransform): ViewTransform => {
    if (!loadedSource) return nextTransform;
    return clampTransformToViewport(
      nextTransform,
      loadedSource.width,
      loadedSource.height,
      viewportSize.width,
      viewportSize.height,
      MIN_VIEW_SCALE
    );
  }, [loadedSource, viewportSize.height, viewportSize.width]);

  const setTransform = React.useCallback((nextTransform: ViewTransform) => {
    const normalized = clampTransform(nextTransform);
    transformRef.current = normalized;
    scheduleRender();
  }, [clampTransform, scheduleRender]);

  const setUserTransform = React.useCallback((nextTransform: ViewTransform) => {
    hasUserAdjustedViewRef.current = true;
    setTransform(nextTransform);
  }, [setTransform]);

  const revealBrushPreview = React.useCallback(() => {
    setBrushPreviewVisible(true);
    if (brushPreviewTimeoutRef.current != null) {
      window.clearTimeout(brushPreviewTimeoutRef.current);
    }
    brushPreviewTimeoutRef.current = window.setTimeout(() => {
      setBrushPreviewVisible(false);
      brushPreviewTimeoutRef.current = null;
    }, 900);
  }, []);

  const syncHistoryState = React.useCallback(() => {
    setHistoryState({
      canUndo: historyIndexRef.current > 0,
      canRedo: historyIndexRef.current < (historySnapshotsRef.current.length - 1),
    });
  }, []);

  const initializeHistory = React.useCallback((maskCanvas: HTMLCanvasElement) => {
    historySnapshotsRef.current = [cloneCanvas(maskCanvas)];
    historyIndexRef.current = 0;
    syncHistoryState();
  }, [syncHistoryState]);

  const commitHistorySnapshot = React.useCallback((maskCanvas: HTMLCanvasElement) => {
    const nextSnapshots = historySnapshotsRef.current.slice(0, historyIndexRef.current + 1);
    nextSnapshots.push(cloneCanvas(maskCanvas));
    if (nextSnapshots.length > HISTORY_LIMIT) {
      nextSnapshots.shift();
    }
    historySnapshotsRef.current = nextSnapshots;
    historyIndexRef.current = nextSnapshots.length - 1;
    syncHistoryState();
  }, [syncHistoryState]);

  const resetViewToFit = React.useCallback(() => {
    if (!loadedSource || viewportSize.width <= 0 || viewportSize.height <= 0) return;
    const fit = createFitTransform(
      loadedSource.width,
      loadedSource.height,
      viewportSize.width,
      viewportSize.height,
      isMobile ? 14 : 24
    );
    hasUserAdjustedViewRef.current = false;
    setTransform(fit);
  }, [isMobile, loadedSource, setTransform, viewportSize.height, viewportSize.width]);

  const refreshComposite = React.useCallback(() => {
    const sourceCanvas = sourceCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const compositeCanvas = compositeCanvasRef.current;
    if (!sourceCanvas || !maskCanvas || !compositeCanvas) return;
    updateCompositeCanvas(compositeCanvas, sourceCanvas, maskCanvas);
    scheduleRender();
  }, [scheduleRender]);

  const restoreMaskFromHistory = React.useCallback((nextIndex: number) => {
    const maskCanvas = maskCanvasRef.current;
    const snapshot = historySnapshotsRef.current[nextIndex];
    if (!maskCanvas || !snapshot) return;
    const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    ctx.drawImage(snapshot, 0, 0);
    historyIndexRef.current = nextIndex;
    hasApproximateEditsRef.current = !isMaskCanvasPristine(maskCanvas);
    setHasApproximateEdits(hasApproximateEditsRef.current);
    setScreenMode('edit');
    setPreviewResult(null);
    syncHistoryState();
    refreshComposite();
  }, [refreshComposite, syncHistoryState]);

  const enterEditMode = React.useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    editSessionBaselineRef.current = {
      mask: cloneCanvas(maskCanvas),
      historySnapshots: historySnapshotsRef.current.map((snapshot) => cloneCanvas(snapshot)),
      historyIndex: historyIndexRef.current,
      hasApproximateEdits: hasApproximateEditsRef.current,
      previewResult,
    };
    setDiscardConfirmOpen(false);
    setScreenMode('edit');
  }, [previewResult]);

  const discardEditSession = React.useCallback(() => {
    const baseline = editSessionBaselineRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!baseline || !maskCanvas) {
      setDiscardConfirmOpen(false);
      setScreenMode('preview');
      return;
    }

    const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    ctx.drawImage(baseline.mask, 0, 0);
    historySnapshotsRef.current = baseline.historySnapshots.map((snapshot) => cloneCanvas(snapshot));
    historyIndexRef.current = baseline.historyIndex;
    hasApproximateEditsRef.current = baseline.hasApproximateEdits;
    setHasApproximateEdits(baseline.hasApproximateEdits);
    setPreviewResult(baseline.previewResult);
    setDiscardConfirmOpen(false);
    setScreenMode('preview');
    syncHistoryState();
    refreshComposite();
  }, [refreshComposite, syncHistoryState]);

  React.useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const update = () => {
      const nextWidth = Math.max(1, Math.round(viewport.clientWidth));
      const nextHeight = Math.max(1, Math.round(viewport.clientHeight));
      setViewportSize((prev) => (
        prev.width === nextWidth && prev.height === nextHeight
          ? prev
          : { width: nextWidth, height: nextHeight }
      ));
      const canvas = canvasRef.current;
      if (canvas && (canvas.width !== nextWidth || canvas.height !== nextHeight)) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setEditorError('');

    (async () => {
      try {
        const source = await loadStickerSource(imageSrc, STICKER_EDITOR_MAX_DIMENSION_PX);
        if (cancelled) return;
        sourceCanvasRef.current = source.canvas;
        const maskCanvas = createOpaqueMaskCanvas(source.width, source.height);
        maskCanvasRef.current = maskCanvas;
        compositeCanvasRef.current = document.createElement('canvas');
        setLoadedSource(source);
        hasUserAdjustedViewRef.current = false;
        hasApproximateEditsRef.current = false;
        setHasApproximateEdits(false);
        setScreenMode('preview');
        setPreviewResult(null);
        setDiscardConfirmOpen(false);
        editSessionBaselineRef.current = null;
        initializeHistory(maskCanvas);
        refreshComposite();
      } catch (error) {
        if (cancelled) return;
        setEditorError(error instanceof Error ? error.message : 'Unable to load this sticker.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [imageSrc, initializeHistory, refreshComposite]);

  React.useEffect(() => {
    if (!loadedSource || viewportSize.width <= 0 || viewportSize.height <= 0) return;
    const shouldAutoFit = !transformRef.current || !hasUserAdjustedViewRef.current;
    if (shouldAutoFit) {
      resetViewToFit();
      return;
    }
    setTransform(transformRef.current as ViewTransform);
  }, [loadedSource, resetViewToFit, setTransform, viewportSize.height, viewportSize.width]);

  React.useEffect(() => {
    if (!loading) scheduleRender();
  }, [loading, scheduleRender]);

  React.useEffect(() => {
    if (screenMode !== 'edit' || viewportSize.width <= 0 || viewportSize.height <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width !== viewportSize.width || canvas.height !== viewportSize.height) {
      canvas.width = viewportSize.width;
      canvas.height = viewportSize.height;
    }
    scheduleRender();
  }, [scheduleRender, screenMode, viewportSize.height, viewportSize.width]);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        shiftPressedRef.current = true;
        setPanModifierPressed(true);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        shiftPressedRef.current = false;
        setPanModifierPressed(false);
      }
    };
    const handleBlur = () => {
      shiftPressedRef.current = false;
      setPanModifierPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  React.useEffect(() => () => {
    if (renderFrameRef.current != null) {
      window.cancelAnimationFrame(renderFrameRef.current);
    }
    if (brushPreviewTimeoutRef.current != null) {
      window.clearTimeout(brushPreviewTimeoutRef.current);
    }
  }, []);

  const getCanvasLocalPoint = React.useCallback((event: React.PointerEvent<HTMLCanvasElement>): PointerPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp(event.clientX - rect.left, 0, rect.width),
      y: clamp(event.clientY - rect.top, 0, rect.height),
    };
  }, []);

  const applyStroke = React.useCallback((fromPoint: PointerPoint, toPoint: PointerPoint) => {
    const transform = transformRef.current;
    const maskCanvas = maskCanvasRef.current;
    const baseMaskCanvas = strokeBaseMaskCanvasRef.current;
    const overlayCanvas = strokeOverlayCanvasRef.current;
    if (!transform || !maskCanvas || !baseMaskCanvas || !overlayCanvas) return;
    const start = screenToImagePoint(fromPoint.x, fromPoint.y, transform);
    const end = screenToImagePoint(toPoint.x, toPoint.y, transform);
    const radius = Math.max(4, brushSize) / transform.scale / 2;
    stampBrushStrokeOnCanvas(overlayCanvas, {
      fromX: start.x,
      fromY: start.y,
      toX: end.x,
      toY: end.y,
      radius,
      opacity: 1,
      mode: brushMode,
    });
    applyOverlayToMaskCanvas({
      targetMaskCanvas: maskCanvas,
      baseMaskCanvas,
      overlayCanvas,
      mode: brushMode,
      opacity: brushOpacity,
    });

    hasApproximateEditsRef.current = true;
    setHasApproximateEdits(true);
    setScreenMode('edit');
    setPreviewResult(null);
    refreshComposite();
  }, [brushMode, brushOpacity, brushSize, refreshComposite]);

  const setInteraction = React.useCallback((nextMode: InteractionMode) => {
    interactionModeRef.current = nextMode;
    setInteractionMode(nextMode);
  }, []);

  const clearPendingDraw = React.useCallback(() => {
    drawingPointerIdRef.current = null;
    drawSessionRef.current = null;
    strokeBaseMaskCanvasRef.current = null;
    strokeOverlayCanvasRef.current = null;
  }, []);

  const beginStroke = React.useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    strokeBaseMaskCanvasRef.current = cloneCanvas(maskCanvas);
    strokeOverlayCanvasRef.current = createTransparentCanvas(maskCanvas.width, maskCanvas.height);
  }, []);

  const beginPinch = React.useCallback(() => {
    const pointers = getOrderedActivePoints(activePointersRef.current);
    if (pointers.length < 2 || !transformRef.current) return;
    const midpoint = getMidpoint(pointers[0], pointers[1]);
    pinchStateRef.current = {
      startDistance: Math.max(1, getDistance(pointers[0], pointers[1])),
      startScale: transformRef.current.scale,
      startRotation: transformRef.current.rotation || 0,
      startAngle: getAngle(pointers[0], pointers[1]),
      startMidImage: screenToImagePoint(midpoint.x, midpoint.y, transformRef.current),
    };
    clearPendingDraw();
    panPointerIdRef.current = null;
    lastPanPointRef.current = null;
    setInteraction('pinch');
  }, [clearPendingDraw, setInteraction]);

  const handlePointerDown = React.useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasLocalPoint(event);
    if (!point || !loadedSource) return;

    activePointersRef.current.set(event.pointerId, point);
    event.currentTarget.setPointerCapture(event.pointerId);

    if (activePointersRef.current.size >= 2) {
      beginPinch();
      event.preventDefault();
      return;
    }

    if (event.pointerType === 'mouse' && shiftPressedRef.current) {
      setInteraction('pan');
      panPointerIdRef.current = event.pointerId;
      lastPanPointRef.current = point;
      event.preventDefault();
      return;
    }

    setInteraction('draw');
    drawingPointerIdRef.current = event.pointerId;
    beginStroke();
    drawSessionRef.current = {
      startPoint: point,
      lastPoint: point,
      hasAppliedStroke: false,
    };
    event.preventDefault();
  }, [beginPinch, beginStroke, getCanvasLocalPoint, loadedSource, setInteraction]);

  const handlePointerMove = React.useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasLocalPoint(event);
    if (!point) return;
    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, point);
    }

    if (interactionModeRef.current === 'pinch') {
      const pointers = getOrderedActivePoints(activePointersRef.current);
      const pinchState = pinchStateRef.current;
      if (pointers.length < 2 || !pinchState || !loadedSource) return;
      const midpoint = getMidpoint(pointers[0], pointers[1]);
      const distance = Math.max(1, getDistance(pointers[0], pointers[1]));
      const angle = getAngle(pointers[0], pointers[1]);
      const scale = clamp(pinchState.startScale * (distance / pinchState.startDistance), MIN_VIEW_SCALE, MAX_VIEW_SCALE);
      const rotation = pinchState.startRotation + (angle - pinchState.startAngle);
      const transformedMidpoint = imageToScreenPoint(
        pinchState.startMidImage.x,
        pinchState.startMidImage.y,
        {
          scale,
          offsetX: 0,
          offsetY: 0,
          rotation,
        }
      );
      setUserTransform({
        scale,
        offsetX: midpoint.x - transformedMidpoint.x,
        offsetY: midpoint.y - transformedMidpoint.y,
        rotation,
      });
      event.preventDefault();
      return;
    }

    if (interactionModeRef.current === 'pan' && panPointerIdRef.current === event.pointerId && lastPanPointRef.current && loadedSource) {
      const deltaX = point.x - lastPanPointRef.current.x;
      const deltaY = point.y - lastPanPointRef.current.y;
      lastPanPointRef.current = point;
      const current = transformRef.current;
      if (!current) return;
      setUserTransform({
        scale: current.scale,
        offsetX: current.offsetX + deltaX,
        offsetY: current.offsetY + deltaY,
        rotation: current.rotation,
      });
      event.preventDefault();
      return;
    }

    if (interactionModeRef.current === 'draw' && drawingPointerIdRef.current === event.pointerId && drawSessionRef.current) {
      const currentSession = drawSessionRef.current;
      if (!currentSession.hasAppliedStroke) {
        const distance = getDistance(currentSession.startPoint, point);
        if (distance < DRAW_START_THRESHOLD_PX) {
          event.preventDefault();
          return;
        }
        applyStroke(currentSession.startPoint, point);
        drawSessionRef.current = {
          startPoint: currentSession.startPoint,
          lastPoint: point,
          hasAppliedStroke: true,
        };
        event.preventDefault();
        return;
      }

      applyStroke(currentSession.lastPoint, point);
      drawSessionRef.current = {
        ...currentSession,
        lastPoint: point,
      };
      event.preventDefault();
    }
  }, [applyStroke, getCanvasLocalPoint, loadedSource, setUserTransform]);

  const finishPointer = React.useCallback((pointerId: number) => {
    activePointersRef.current.delete(pointerId);

    if (drawingPointerIdRef.current === pointerId && interactionModeRef.current === 'draw' && drawSessionRef.current) {
      const currentSession = drawSessionRef.current;
      if (!currentSession.hasAppliedStroke) {
        applyStroke(currentSession.startPoint, currentSession.startPoint);
      }
      clearPendingDraw();
      if (maskCanvasRef.current) {
        commitHistorySnapshot(maskCanvasRef.current);
      }
    }
    if (panPointerIdRef.current === pointerId) {
      panPointerIdRef.current = null;
      lastPanPointRef.current = null;
    }

    if (activePointersRef.current.size >= 2) {
      beginPinch();
      return;
    }

    setInteraction('none');
    pinchStateRef.current = null;
  }, [applyStroke, beginPinch, clearPendingDraw, commitHistorySnapshot, setInteraction]);

  const handlePointerUp = React.useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    finishPointer(event.pointerId);
  }, [finishPointer]);

  const handlePointerCancel = React.useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    finishPointer(event.pointerId);
  }, [finishPointer]);

  const handleWheel = React.useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    if (!loadedSource) return;
    event.preventDefault();
    const current = transformRef.current;
    if (!current) return;
    const point = getCanvasLocalPoint(event as unknown as React.PointerEvent<HTMLCanvasElement>);
    if (!point) return;
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.92;
    const nextScale = clamp(current.scale * zoomFactor, MIN_VIEW_SCALE, MAX_VIEW_SCALE);
    const imagePoint = screenToImagePoint(point.x, point.y, current);
    const transformedPoint = imageToScreenPoint(imagePoint.x, imagePoint.y, {
      scale: nextScale,
      offsetX: 0,
      offsetY: 0,
      rotation: current.rotation,
    });
    setUserTransform({
      scale: nextScale,
      offsetX: point.x - transformedPoint.x,
      offsetY: point.y - transformedPoint.y,
      rotation: current.rotation,
    });
  }, [getCanvasLocalPoint, loadedSource, setUserTransform]);

  const handleReset = React.useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    resetMaskCanvas(maskCanvas);
    hasApproximateEditsRef.current = false;
    setHasApproximateEdits(false);
    clearPendingDraw();
    panPointerIdRef.current = null;
    lastPanPointRef.current = null;
    pinchStateRef.current = null;
    activePointersRef.current.clear();
    setInteraction('none');
    setScreenMode('edit');
    setPreviewResult(null);
    setBrushPreviewVisible(false);
    commitHistorySnapshot(maskCanvas);
    refreshComposite();
  }, [clearPendingDraw, commitHistorySnapshot, refreshComposite, setInteraction]);

  const handleRecenter = React.useCallback(() => {
    const compositeCanvas = compositeCanvasRef.current;
    const current = transformRef.current;
    if (!compositeCanvas || !current || viewportSize.width <= 0 || viewportSize.height <= 0) return;

    const visibleBounds = getCanvasNonTransparentBounds(compositeCanvas) || {
      x: 0,
      y: 0,
      width: compositeCanvas.width,
      height: compositeCanvas.height,
    };

    setUserTransform(createCenteredTransformForBounds({
      bounds: visibleBounds,
      viewportWidth: viewportSize.width,
      viewportHeight: viewportSize.height,
      scale: current.scale,
      rotation: current.rotation,
    }));
  }, [setUserTransform, viewportSize.height, viewportSize.width]);

  const handlePreview = React.useCallback(async () => {
    const sourceCanvas = sourceCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!sourceCanvas || !maskCanvas || previewBusy || commitBusy || busy) return;
    setPreviewBusy(true);
    setEditorError('');
    try {
      const result = await exportMaskedSticker({ sourceCanvas, maskCanvas });
      setPreviewResult(result);
      setDiscardConfirmOpen(false);
      setScreenMode('preview');
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : 'Unable to preview this sticker right now.');
    } finally {
      setPreviewBusy(false);
    }
  }, [busy, commitBusy, previewBusy]);

  const handleAdd = React.useCallback(async () => {
    const sourceCanvas = sourceCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!sourceCanvas || !maskCanvas || commitBusy || busy) return;
    setCommitBusy(true);
    setEditorError('');
    try {
      const result = previewResult || await exportMaskedSticker({ sourceCanvas, maskCanvas });
      await onAdd(result);
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : 'Unable to add this sticker right now.');
    } finally {
      setCommitBusy(false);
    }
  }, [busy, commitBusy, onAdd, previewResult]);

  const canvasCursor = !isMobile
    ? (
      interactionMode === 'pan' || interactionMode === 'pinch'
        ? 'grabbing'
        : (panModifierPressed ? 'grab' : 'crosshair')
    )
    : 'crosshair';
  const navigationTip = isMobile
    ? 'Pinch to zoom, rotate, or pan'
    : 'Wheel to zoom, Shift + drag to pan';
  const previewImageSrc = previewResult?.dataUrl || imageSrc;
  const handleUndo = React.useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    restoreMaskFromHistory(historyIndexRef.current - 1);
  }, [restoreMaskFromHistory]);

  const handleRedo = React.useCallback(() => {
    if (historyIndexRef.current >= historySnapshotsRef.current.length - 1) return;
    restoreMaskFromHistory(historyIndexRef.current + 1);
  }, [restoreMaskFromHistory]);
  const brushPreviewDiameter = clamp(brushSize, 14, Math.min(150, Math.max(80, viewportSize.width * 0.28 || 150)));
  const brushPreviewTint = brushMode === 'erase'
    ? alpha(theme.palette.error.main, Math.max(0.16, brushOpacity * 0.24))
    : alpha(theme.palette.success.main, Math.max(0.16, brushOpacity * 0.24));
  const brushPreviewBorder = brushMode === 'erase'
    ? alpha(theme.palette.error.main, 0.78)
    : alpha(theme.palette.success.main, 0.78);
  const neutralButtonBg = alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.9 : 1);
  const neutralButtonHoverBg = alpha(theme.palette.action.hover, theme.palette.mode === 'dark' ? 0.62 : 1);
  const neutralButtonBorder = alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.95 : 0.82);
  const neutralButtonHoverBorder = alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.36 : 0.22);
  const neutralButtonShadow = `0 4px 14px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.32 : 0.14)}`;
  const neutralActionButtonSx = {
    minHeight: 48,
    minWidth: isMobile ? 52 : undefined,
    px: isMobile ? 1.25 : 2,
    borderRadius: 1.5,
    fontWeight: 700,
    textTransform: 'none',
    color: 'text.primary',
    backgroundColor: neutralButtonBg,
    border: '1px solid',
    borderColor: neutralButtonBorder,
    boxShadow: neutralButtonShadow,
    '&:hover': {
      backgroundColor: neutralButtonHoverBg,
      borderColor: neutralButtonHoverBorder,
      boxShadow: neutralButtonShadow,
    },
  };
  const sideIconActionButtonSx = {
    ...neutralActionButtonSx,
    color: 'text.primary',
    backgroundColor: neutralButtonBg,
    boxShadow: neutralButtonShadow,
    '&:hover': {
      backgroundColor: neutralButtonHoverBg,
      borderColor: neutralButtonHoverBorder,
      boxShadow: neutralButtonShadow,
    },
    '&.Mui-disabled': {
      color: 'text.disabled',
      backgroundColor: alpha(theme.palette.action.disabledBackground, theme.palette.mode === 'dark' ? 0.25 : 0.5),
      borderColor: alpha(theme.palette.action.disabledBackground, theme.palette.mode === 'dark' ? 0.3 : 0.65),
      boxShadow: 'none',
    },
  };
  const primaryActionButtonSx = {
    flex: 1,
    minHeight: 48,
    borderRadius: 1.5,
    fontWeight: 700,
    textTransform: 'none',
    backgroundColor: theme.palette.primary.main,
    boxShadow: `0 6px 18px ${alpha(theme.palette.primary.main, 0.34)}`,
    color: 'primary.contrastText',
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
      boxShadow: `0 6px 18px ${alpha(theme.palette.primary.main, 0.4)}`,
    },
  };
  const overlayIconButtonSx = {
    width: 40,
    height: 40,
    borderRadius: 1.35,
    color: 'text.primary',
    bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.7 : 0.88),
    boxShadow: `0 8px 22px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.22 : 0.14)}`,
    backdropFilter: 'blur(14px)',
    '&:hover': {
      bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.84 : 0.97),
    },
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: { xs: 0, md: 3 },
        overflow: 'hidden',
        overscrollBehavior: 'none',
        bgcolor: theme.palette.mode === 'dark' ? '#0b0c0f' : '#fbfbfc',
        border: { xs: 'none', md: `1px solid ${alpha(theme.palette.divider, 0.9)}` },
      }}
    >
      {editorError ? (
        <Alert severity="error" sx={{ mx: 1, mt: 1, mb: 0, flexShrink: 0 }}>
          {editorError}
        </Alert>
      ) : null}

      <Box
        ref={viewportRef}
        sx={{
          position: 'relative',
          flex: '1 1 auto',
          minHeight: 0,
          overflow: 'hidden',
          overscrollBehavior: 'none',
          bgcolor: theme.palette.mode === 'dark' ? '#111317' : '#eff1f4',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'stretch',
          }}
        >
          <Box
            component={screenMode === 'preview' ? 'div' : 'canvas'}
            ref={screenMode === 'preview' ? undefined : canvasRef}
            onPointerDown={screenMode === 'preview' ? undefined : handlePointerDown}
            onPointerMove={screenMode === 'preview' ? undefined : handlePointerMove}
            onPointerUp={screenMode === 'preview' ? undefined : handlePointerUp}
            onPointerCancel={screenMode === 'preview' ? undefined : handlePointerCancel}
            onLostPointerCapture={screenMode === 'preview' ? undefined : handlePointerCancel}
            onWheel={screenMode === 'preview' ? undefined : handleWheel}
            sx={{
              width: '100%',
              height: '100%',
              display: 'block',
              touchAction: 'none',
              cursor: screenMode === 'preview' ? 'default' : canvasCursor,
              position: 'relative',
            }}
          >
            {screenMode === 'preview' ? (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                  backgroundImage: `
                    linear-gradient(45deg, rgba(255,255,255,0.08) 25%, transparent 25%),
                    linear-gradient(-45deg, rgba(255,255,255,0.08) 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.08) 75%),
                    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.08) 75%)
                  `,
                  backgroundSize: '18px 18px',
                  backgroundPosition: '0 0, 0 9px, 9px -9px, -9px 0px',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                }}
              >
                <Box
                  component="img"
                  src={previewImageSrc}
                  alt="Sticker preview"
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    userSelect: 'none',
                    WebkitUserDrag: 'none',
                    filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.18))',
                  }}
                />
              </Box>
            ) : null}

            {screenMode === 'edit' && brushPreviewVisible && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box
                  sx={{
                    width: `${brushPreviewDiameter}px`,
                    height: `${brushPreviewDiameter}px`,
                    borderRadius: '50%',
                    border: `2px solid ${brushPreviewBorder}`,
                    bgcolor: brushPreviewTint,
                    boxShadow: `0 10px 28px ${alpha(theme.palette.common.black, 0.16)}`,
                  }}
                />
              </Box>
            )}
          </Box>
        </Box>

        {screenMode === 'edit' && (
          <>
            <Box
              sx={{
                position: 'absolute',
                top: 12,
                left: 12,
                zIndex: 2,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 0.85,
                px: 1,
                py: 0.75,
                borderRadius: 1.5,
                color: theme.palette.mode === 'dark' ? alpha('#ffffff', 0.96) : 'text.primary',
                bgcolor: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.common.black, 0.5)
                  : alpha(theme.palette.background.paper, 0.9),
                backdropFilter: 'blur(14px)',
                boxShadow: `0 10px 24px ${alpha(theme.palette.common.black, 0.14)}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.55, flexShrink: 0 }}>
                <ZoomInRounded sx={{ fontSize: 16 }} />
                <OpenWithRounded sx={{ fontSize: 16 }} />
              </Box>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  fontWeight: 700,
                  lineHeight: 1.15,
                  letterSpacing: 0.08,
                }}
              >
                {navigationTip}
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={0.8}
              sx={{
                position: 'absolute',
                left: 12,
                bottom: FLOATING_CANVAS_CONTROL_GAP_PX,
                zIndex: 2,
              }}
            >
              <IconButton
                onClick={resetViewToFit}
                disabled={loading}
                aria-label="Fit image"
                sx={overlayIconButtonSx}
              >
                <FitScreenRounded sx={{ fontSize: 19 }} />
              </IconButton>
              <IconButton
                onClick={handleRecenter}
                disabled={loading || !loadedSource}
                aria-label="Center visible sticker"
                sx={overlayIconButtonSx}
              >
                <CenterFocusStrongRounded sx={{ fontSize: 19 }} />
              </IconButton>
            </Stack>

            <Stack
              direction="row"
              spacing={0.8}
              sx={{
                position: 'absolute',
                right: 12,
                bottom: FLOATING_CANVAS_CONTROL_GAP_PX,
                zIndex: 2,
              }}
            >
              <IconButton
                onClick={handleUndo}
                disabled={!historyState.canUndo}
                aria-label="Undo sticker edit"
                sx={overlayIconButtonSx}
              >
                <UndoRounded sx={{ fontSize: 19 }} />
              </IconButton>
              <IconButton
                onClick={handleRedo}
                disabled={!historyState.canRedo}
                aria-label="Redo sticker edit"
                sx={overlayIconButtonSx}
              >
                <RedoRounded sx={{ fontSize: 19 }} />
              </IconButton>
            </Stack>
          </>
        )}

        {(loading || !loadedSource) && (
          <Stack
            spacing={1}
            sx={{
              position: 'absolute',
              inset: 0,
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette.background.default, 0.5),
            }}
          >
            <CircularProgress size={28} />
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Loading
            </Typography>
          </Stack>
        )}
      </Box>

      <Box
        sx={{
          position: 'relative',
          zIndex: 3,
          flexShrink: 0,
          bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.96 : 0.98),
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.75)}`,
          boxShadow: `0 -8px 30px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.34 : 0.14)}`,
          backdropFilter: 'blur(18px)',
          pb: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
          pt: 1,
          px: { xs: 1.25, md: 2 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 960, mx: 'auto' }}>
          <Box sx={{ position: 'relative' }}>
            {screenMode === 'edit' && discardConfirmOpen && (
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 62,
                  display: 'flex',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              >
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{
                    alignItems: 'center',
                    px: 1,
                    py: 0.8,
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.9 : 0.96),
                    boxShadow: `0 12px 30px ${alpha(theme.palette.common.black, 0.18)}`,
                    backdropFilter: 'blur(16px)',
                    pointerEvents: 'auto',
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', px: 0.25 }}>
                    Discard brush edits?
                  </Typography>
                  <Button
                    variant="text"
                    onClick={() => setDiscardConfirmOpen(false)}
                    sx={{ textTransform: 'none', fontWeight: 700, minWidth: 0, px: 0.75 }}
                  >
                    Keep
                  </Button>
                  <Button
                    variant="contained"
                    onClick={discardEditSession}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      minWidth: 0,
                      px: 1,
                      borderRadius: 999,
                    }}
                  >
                    Discard
                  </Button>
                </Stack>
              </Box>
            )}

            <Stack spacing={0.8}>
            {screenMode === 'edit' && (
              <>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={0.8}
                  sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
                >
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={brushMode}
                    onChange={(_, value) => {
                      if (value === 'erase' || value === 'restore') {
                        setBrushMode(value);
                      }
                    }}
                    sx={{
                      alignSelf: { xs: 'stretch', sm: 'flex-start' },
                      p: 0.35,
                      borderRadius: 999,
                      bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.72 : 0.88),
                      '& .MuiToggleButton-root': {
                        flex: 1,
                        textTransform: 'none',
                        fontWeight: 700,
                        px: isMobile ? 1.15 : 1.8,
                        py: 0.55,
                        border: 'none',
                        borderRadius: 999,
                        color: 'text.secondary',
                        '&.Mui-selected': {
                          color: 'text.primary',
                          bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.16 : 0.08),
                        },
                        '&.Mui-selected:hover': {
                          bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.2 : 0.1),
                        },
                      },
                    }}
                  >
                    <ToggleButton value="erase">Erase</ToggleButton>
                    <ToggleButton value="restore">Restore</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>

                <Stack spacing={0.65}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: 'center',
                      px: 1,
                      py: 0.55,
                      borderRadius: 1.35,
                      bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.72 : 0.88),
                    }}
                  >
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.primary',
                        bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.12 : 0.08),
                        flexShrink: 0,
                      }}
                    >
                      <BrushRounded sx={{ fontSize: 17 }} />
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, minWidth: 42, flexShrink: 0 }}>
                      Brush
                    </Typography>
                    <Slider
                      size="small"
                      value={brushSize}
                      min={12}
                      max={160}
                      step={1}
                      onChange={(_, value) => {
                        setBrushSize(Array.isArray(value) ? value[0] : value);
                        revealBrushPreview();
                      }}
                      aria-label="Brush size"
                      sx={{ flex: 1, minWidth: 0 }}
                    />
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.42 : 0.82),
                        flexShrink: 0,
                      }}
                    >
                      <Box
                        sx={{
                          width: `${Math.max(8, Math.min(28, brushSize * 0.2))}px`,
                          height: `${Math.max(8, Math.min(28, brushSize * 0.2))}px`,
                          borderRadius: '50%',
                          border: `2px solid ${brushPreviewBorder}`,
                          bgcolor: brushPreviewTint,
                        }}
                      />
                    </Box>
                  </Stack>

                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: 'center',
                      px: 1,
                      py: 0.55,
                      borderRadius: 1.35,
                      bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.72 : 0.88),
                    }}
                  >
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.primary',
                        bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.12 : 0.08),
                        flexShrink: 0,
                      }}
                    >
                      <WaterDropRounded sx={{ fontSize: 17 }} />
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, minWidth: 42, flexShrink: 0 }}>
                      Opacity
                    </Typography>
                    <Slider
                      size="small"
                      value={Math.round(brushOpacity * 100)}
                      min={5}
                      max={100}
                      step={1}
                      onChange={(_, value) => {
                        const nextValue = Array.isArray(value) ? value[0] : value;
                        setBrushOpacity(clamp(nextValue / 100, 0.05, 1));
                        revealBrushPreview();
                      }}
                      aria-label="Brush opacity"
                      sx={{ flex: 1, minWidth: 0 }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        minWidth: 42,
                        textAlign: 'right',
                        fontWeight: 800,
                        color: 'text.secondary',
                        flexShrink: 0,
                      }}
                    >
                      {Math.round(brushOpacity * 100)}%
                    </Typography>
                  </Stack>
                </Stack>
              </>
            )}

            <Stack direction="row" spacing={1} sx={{ width: '100%', alignItems: 'center' }}>
              {screenMode === 'preview' ? (
                <>
                  <IconButton
                    onClick={onBack}
                    disabled={previewBusy || commitBusy || busy}
                    aria-label="Back"
                    sx={{
                      ...sideIconActionButtonSx,
                      width: 52,
                      minWidth: 52,
                      px: 0,
                    }}
                  >
                    <ArrowBackRounded />
                  </IconButton>

                  <Button
                    variant="contained"
                    onClick={() => { void handleAdd(); }}
                    disabled={loading || previewBusy || commitBusy || busy || !loadedSource}
                    size="large"
                    sx={primaryActionButtonSx}
                  >
                    {(previewBusy || commitBusy || busy) ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      'Add Sticker'
                    )}
                  </Button>

                  <IconButton
                    onClick={enterEditMode}
                    disabled={loading || previewBusy || commitBusy || busy || !loadedSource}
                    aria-label="Edit sticker"
                    sx={{
                      ...sideIconActionButtonSx,
                      width: 52,
                      minWidth: 52,
                      px: 0,
                    }}
                  >
                    <BrushRounded />
                  </IconButton>
                </>
              ) : (
                <>
                  <IconButton
                    onClick={() => setDiscardConfirmOpen(true)}
                    disabled={loading || previewBusy || commitBusy || busy}
                    aria-label="Go back without saving edits"
                    sx={{
                      ...sideIconActionButtonSx,
                      width: 52,
                      minWidth: 52,
                      px: 0,
                    }}
                  >
                    <ArrowBackRounded />
                  </IconButton>

                  <Button
                    variant="contained"
                    onClick={() => { void handlePreview(); }}
                    disabled={loading || previewBusy || commitBusy || busy || !loadedSource}
                    size="large"
                    sx={primaryActionButtonSx}
                  >
                    {(previewBusy || busy) ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      'Done'
                    )}
                  </Button>

                  <IconButton
                    onClick={handleReset}
                    disabled={loading || !hasApproximateEdits}
                    aria-label="Reset sticker edits"
                    sx={{
                      ...sideIconActionButtonSx,
                      width: 52,
                      minWidth: 52,
                      px: 0,
                    }}
                  >
                    <ReplayRounded />
                  </IconButton>
                </>
              )}
            </Stack>
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

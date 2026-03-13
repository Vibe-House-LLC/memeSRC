import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Slider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
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

const getDistance = (first: PointerPoint, second: PointerPoint): number => {
  const dx = second.x - first.x;
  const dy = second.y - first.y;
  return Math.sqrt((dx * dx) + (dy * dy));
};

const getMidpoint = (first: PointerPoint, second: PointerPoint): PointerPoint => ({
  x: (first.x + second.x) / 2,
  y: (first.y + second.y) / 2,
});

export default function StickerBrushEditor({
  imageSrc,
  busy = false,
  onAdd,
  onBack,
}: StickerBrushEditorProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const bottomBarRef = React.useRef<HTMLDivElement | null>(null);
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const sourceCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const compositeCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const strokeBaseMaskCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const strokeOverlayCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const transformRef = React.useRef<ViewTransform | null>(null);
  const minScaleRef = React.useRef(0.1);
  const renderFrameRef = React.useRef<number | null>(null);
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
    startOffsetX: number;
    startOffsetY: number;
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
  const [interactionMode, setInteractionMode] = React.useState<InteractionMode>('none');
  const [panModifierPressed, setPanModifierPressed] = React.useState(false);
  const [bottomBarHeight, setBottomBarHeight] = React.useState(152);

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
      minScaleRef.current
    );
  }, [loadedSource, viewportSize.height, viewportSize.width]);

  const setTransform = React.useCallback((nextTransform: ViewTransform) => {
    const normalized = clampTransform(nextTransform);
    transformRef.current = normalized;
    scheduleRender();
  }, [clampTransform, scheduleRender]);

  const resetViewToFit = React.useCallback(() => {
    if (!loadedSource || viewportSize.width <= 0 || viewportSize.height <= 0) return;
    const fit = createFitTransform(
      loadedSource.width,
      loadedSource.height,
      viewportSize.width,
      viewportSize.height,
      isMobile ? 14 : 24
    );
    minScaleRef.current = fit.scale;
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
        maskCanvasRef.current = createOpaqueMaskCanvas(source.width, source.height);
        compositeCanvasRef.current = document.createElement('canvas');
        setLoadedSource(source);
        hasApproximateEditsRef.current = false;
        setHasApproximateEdits(false);
        setPreviewResult(null);
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
  }, [imageSrc, refreshComposite]);

  React.useEffect(() => {
    if (!loadedSource || viewportSize.width <= 0 || viewportSize.height <= 0) return;
    const hasTransform = Boolean(transformRef.current);
    if (!hasTransform) {
      resetViewToFit();
      return;
    }
    setTransform(transformRef.current as ViewTransform);
  }, [loadedSource, resetViewToFit, setTransform, viewportSize.height, viewportSize.width]);

  React.useEffect(() => {
    if (!loading) scheduleRender();
  }, [loading, scheduleRender]);

  React.useEffect(() => {
    if (previewResult || viewportSize.width <= 0 || viewportSize.height <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width !== viewportSize.width || canvas.height !== viewportSize.height) {
      canvas.width = viewportSize.width;
      canvas.height = viewportSize.height;
    }
    scheduleRender();
  }, [previewResult, scheduleRender, viewportSize.height, viewportSize.width]);

  React.useEffect(() => {
    const bar = bottomBarRef.current;
    if (!bar) return undefined;

    const update = () => {
      const nextHeight = Math.max(1, Math.round(bar.getBoundingClientRect().height));
      setBottomBarHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [isMobile, previewResult]);

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
    const pointers = Array.from(activePointersRef.current.values());
    if (pointers.length < 2 || !transformRef.current) return;
    const midpoint = getMidpoint(pointers[0], pointers[1]);
    pinchStateRef.current = {
      startDistance: Math.max(1, getDistance(pointers[0], pointers[1])),
      startScale: transformRef.current.scale,
      startOffsetX: transformRef.current.offsetX,
      startOffsetY: transformRef.current.offsetY,
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
      const pointers = Array.from(activePointersRef.current.values());
      const pinchState = pinchStateRef.current;
      if (pointers.length < 2 || !pinchState || !loadedSource) return;
      const midpoint = getMidpoint(pointers[0], pointers[1]);
      const distance = Math.max(1, getDistance(pointers[0], pointers[1]));
      const scale = clamp(pinchState.startScale * (distance / pinchState.startDistance), minScaleRef.current, minScaleRef.current * 8);
      const nextOffsetX = midpoint.x - (pinchState.startMidImage.x * scale);
      const nextOffsetY = midpoint.y - (pinchState.startMidImage.y * scale);
      setTransform({
        scale,
        offsetX: nextOffsetX,
        offsetY: nextOffsetY,
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
      setTransform({
        scale: current.scale,
        offsetX: current.offsetX + deltaX,
        offsetY: current.offsetY + deltaY,
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
  }, [applyStroke, getCanvasLocalPoint, loadedSource, setTransform]);

  const finishPointer = React.useCallback((pointerId: number) => {
    activePointersRef.current.delete(pointerId);

    if (drawingPointerIdRef.current === pointerId && interactionModeRef.current === 'draw' && drawSessionRef.current) {
      const currentSession = drawSessionRef.current;
      if (!currentSession.hasAppliedStroke) {
        applyStroke(currentSession.startPoint, currentSession.startPoint);
      }
      clearPendingDraw();
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
  }, [applyStroke, beginPinch, clearPendingDraw, setInteraction]);

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
    const nextScale = clamp(current.scale * zoomFactor, minScaleRef.current, minScaleRef.current * 8);
    const imagePoint = screenToImagePoint(point.x, point.y, current);
    setTransform({
      scale: nextScale,
      offsetX: point.x - (imagePoint.x * nextScale),
      offsetY: point.y - (imagePoint.y * nextScale),
    });
  }, [getCanvasLocalPoint, loadedSource, setTransform]);

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
    setPreviewResult(null);
    refreshComposite();
  }, [clearPendingDraw, refreshComposite, setInteraction]);

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

    setTransform(createCenteredTransformForBounds({
      bounds: visibleBounds,
      viewportWidth: viewportSize.width,
      viewportHeight: viewportSize.height,
      scale: current.scale,
    }));
  }, [setTransform, viewportSize.height, viewportSize.width]);

  const handlePreview = React.useCallback(async () => {
    const sourceCanvas = sourceCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!sourceCanvas || !maskCanvas || previewBusy || commitBusy || busy) return;
    setPreviewBusy(true);
    setEditorError('');
    try {
      const result = await exportMaskedSticker({ sourceCanvas, maskCanvas });
      setPreviewResult(result);
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : 'Unable to preview this sticker right now.');
    } finally {
      setPreviewBusy(false);
    }
  }, [busy, commitBusy, previewBusy]);

  const handleAdd = React.useCallback(async () => {
    if (!previewResult || commitBusy || busy) return;
    setCommitBusy(true);
    setEditorError('');
    try {
      await onAdd(previewResult);
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : 'Unable to add this sticker right now.');
    } finally {
      setCommitBusy(false);
    }
  }, [busy, commitBusy, onAdd, previewResult]);

  const interactionHint = isMobile
    ? 'Paint: 1 finger. Move/zoom: 2 fingers.'
    : 'Paint: drag. Pan: Shift + drag. Zoom: wheel.';
  const previewHint = previewResult?.changed ? 'Preview the cropped sticker.' : 'Preview before adding.';
  const canvasCursor = !isMobile
    ? (
      interactionMode === 'pan' || interactionMode === 'pinch'
        ? 'grabbing'
        : (panModifierPressed ? 'grab' : 'crosshair')
    )
    : 'crosshair';
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
  const primaryActionButtonSx = {
    flex: 1,
    minHeight: 48,
    borderRadius: 1.5,
    fontWeight: 700,
    textTransform: 'none',
    backgroundColor: theme.palette.primary.main,
    border: '1px solid',
    borderColor: alpha(theme.palette.primary.dark, 0.95),
    boxShadow: `0 6px 18px ${alpha(theme.palette.primary.main, 0.34)}`,
    color: 'primary.contrastText',
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
      boxShadow: `0 6px 18px ${alpha(theme.palette.primary.main, 0.4)}`,
    },
  };

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: { xs: 'calc(100svh - 28px)', md: 'calc(100dvh - 72px)' },
        display: 'flex',
        flexDirection: 'column',
        borderRadius: { xs: 0, md: 3 },
        overflow: 'hidden',
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
            component={previewResult ? 'div' : 'canvas'}
            ref={previewResult ? undefined : canvasRef}
            onPointerDown={previewResult ? undefined : handlePointerDown}
            onPointerMove={previewResult ? undefined : handlePointerMove}
            onPointerUp={previewResult ? undefined : handlePointerUp}
            onPointerCancel={previewResult ? undefined : handlePointerCancel}
            onLostPointerCapture={previewResult ? undefined : handlePointerCancel}
            onWheel={previewResult ? undefined : handleWheel}
            sx={{
              width: '100%',
              height: '100%',
              display: 'block',
              touchAction: previewResult ? 'auto' : 'none',
              cursor: previewResult ? 'default' : canvasCursor,
              position: 'relative',
            }}
          >
            {previewResult ? (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                  backgroundImage: `
                    linear-gradient(45deg, #dde1e6 25%, transparent 25%),
                    linear-gradient(-45deg, #dde1e6 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #dde1e6 75%),
                    linear-gradient(-45deg, transparent 75%, #dde1e6 75%)
                  `,
                  backgroundSize: '18px 18px',
                  backgroundPosition: '0 0, 0 9px, 9px -9px, -9px 0px',
                  backgroundColor: '#f4f5f7',
                }}
              >
                <Box
                  component="img"
                  src={previewResult.dataUrl}
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
                <Box
                  sx={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    px: 1,
                    py: 0.45,
                    borderRadius: 999,
                    fontSize: '0.68rem',
                    letterSpacing: 0.3,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: alpha('#ffffff', 0.94),
                    backgroundColor: alpha(theme.palette.common.black, 0.52),
                  }}
                >
                  Preview
                </Box>
              </Box>
            ) : null}
          </Box>
        </Box>

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
        aria-hidden
        sx={{
          flexShrink: 0,
          height: `${bottomBarHeight}px`,
        }}
      />

      <Box
        ref={bottomBarRef}
        sx={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1600,
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
          <Stack spacing={0.8}>
            <Typography
              variant="caption"
              sx={{
                textAlign: 'center',
                color: 'text.secondary',
                fontWeight: 700,
                letterSpacing: 0.1,
                lineHeight: 1.15,
              }}
            >
              {previewResult ? previewHint : interactionHint}
            </Typography>

            {!previewResult && (
              <>
                <Stack direction="row" spacing={0.9} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
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
                      '& .MuiToggleButton-root': {
                        textTransform: 'none',
                        fontWeight: 700,
                        px: isMobile ? 1.25 : 1.8,
                        py: 0.45,
                      },
                    }}
                  >
                    <ToggleButton value="erase">Erase</ToggleButton>
                    <ToggleButton value="restore">Restore</ToggleButton>
                  </ToggleButtonGroup>

                  <Stack direction="row" spacing={0.6}>
                    <Button
                      variant="text"
                      onClick={resetViewToFit}
                      disabled={loading}
                      sx={{ textTransform: 'none', minWidth: 0, px: 0.35, fontWeight: 700 }}
                    >
                      Fit
                    </Button>
                    <Button
                      variant="text"
                      onClick={handleRecenter}
                      disabled={loading || !loadedSource}
                      sx={{ textTransform: 'none', minWidth: 0, px: 0.35, fontWeight: 700 }}
                    >
                      Center
                    </Button>
                    <Button
                      variant="text"
                      onClick={handleReset}
                      disabled={loading || !hasApproximateEdits}
                      sx={{ textTransform: 'none', minWidth: 0, px: 0.35, fontWeight: 700 }}
                    >
                      Reset
                    </Button>
                  </Stack>
                </Stack>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 1,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.1 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                        Size
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                        {Math.round(brushSize)}
                      </Typography>
                    </Stack>
                    <Slider
                      size="small"
                      value={brushSize}
                      min={12}
                      max={160}
                      step={1}
                      onChange={(_, value) => setBrushSize(Array.isArray(value) ? value[0] : value)}
                      aria-label="Brush size"
                    />
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.1 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                        Opacity
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                        {Math.round(brushOpacity * 100)}%
                      </Typography>
                    </Stack>
                    <Slider
                      size="small"
                      value={Math.round(brushOpacity * 100)}
                      min={5}
                      max={100}
                      step={1}
                      onChange={(_, value) => {
                        const nextValue = Array.isArray(value) ? value[0] : value;
                        setBrushOpacity(clamp(nextValue / 100, 0.05, 1));
                      }}
                      aria-label="Brush opacity"
                    />
                  </Box>
                </Box>
              </>
            )}

            <Stack direction="row" spacing={1} sx={{ width: '100%', alignItems: 'center' }}>
              <Button
                variant="contained"
                onClick={() => {
                  if (previewResult) {
                    setPreviewResult(null);
                    return;
                  }
                  onBack();
                }}
                disabled={previewBusy || commitBusy || busy}
                sx={neutralActionButtonSx}
              >
                {previewResult ? 'Back to Edit' : 'Back'}
              </Button>

              <Button
                variant="contained"
                onClick={() => {
                  if (previewResult) {
                    void handleAdd();
                    return;
                  }
                  void handlePreview();
                }}
                disabled={loading || previewBusy || commitBusy || busy || !loadedSource}
                size="large"
                sx={primaryActionButtonSx}
              >
                {(previewBusy || commitBusy || busy) ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  previewResult ? 'Use Sticker' : 'Add Sticker'
                )}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

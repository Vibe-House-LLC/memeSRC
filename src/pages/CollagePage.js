import { useContext, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery, Box, Container, Typography, Button, Slide, Stack, Collapse, Chip, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress } from "@mui/material";
import { Dashboard, Save, Settings, ArrowBack, DeleteForever, ArrowForward, Close } from "@mui/icons-material";
import { useNavigate, useLocation, useParams, useBeforeUnload } from 'react-router-dom';
import { unstable_batchedUpdates } from 'react-dom';
import { UserContext } from "../UserContext";
import { useSubscribeDialog } from "../contexts/useSubscribeDialog";
import { useCollage } from "../contexts/CollageContext";
import { aspectRatioPresets, layoutTemplates, getLayoutsForPanelCount } from "../components/collage/config/CollageConfig";
import UpgradeMessage from "../components/collage/components/UpgradeMessage";
import { CollageLayout } from "../components/collage/components/CollageLayoutComponents";
import { useCollageState } from "../components/collage/hooks/useCollageState";
import { createProject, upsertProject, buildSnapshotFromState, getProject as getProjectRecord, resolveTemplateSnapshot, subscribeToProject } from "../components/collage/utils/templates";
import { renderThumbnailFromSnapshot } from "../components/collage/utils/renderThumbnailFromSnapshot";
import { get as getFromLibrary } from "../utils/library/storage";
import EarlyAccessFeedback from "../components/collage/components/EarlyAccessFeedback";
import CollageResultDialog from "../components/collage/components/CollageResultDialog";
import { trackUsageEvent } from "../utils/trackUsageEvent";

// Pure helpers (module scope) to avoid TDZ and keep stable references
function computeSnapshotSignature(snap) {
  try {
    const json = JSON.stringify(snap);
    let hash = 5381;
    for (let i = 0; i < json.length; i += 1) {
      hash = (hash * 33 + json.charCodeAt(i)) % 4294967296;
    }
    return `v2:${Math.floor(hash)}`;
  } catch (_) {
    return `v2:${Date.now()}`;
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Guard against adopting a stale custom layout from snapshots saved
// under a different panel count. We only accept if the layout has
// enough areas/items for the requested panel count.
function expandGridTemplate(template) {
  if (typeof template !== 'string' || template.trim().length === 0) return '';
  return template.replace(/repeat\((\d+)\s*,\s*([^)]+)\)/gi, (_, count, body) => {
    const n = Math.max(0, parseInt(count, 10) || 0);
    if (n === 0) return '';
    const token = body.trim();
    return Array.from({ length: n }).map(() => token).join(' ');
  });
}

function countGridTracks(template) {
  if (typeof template !== 'string' || template.trim().length === 0) return 0;
  const expanded = expandGridTemplate(template);
  return expanded
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .length;
}

function isCustomLayoutCompatible(customLayout, panelCount) {
  try {
    if (!customLayout || typeof customLayout !== 'object') return false;
    const needed = Math.max(2, panelCount || 2);
    if (Array.isArray(customLayout.areas)) return customLayout.areas.length >= needed;
    if (Array.isArray(customLayout.items)) return customLayout.items.length >= needed;
    const cols = countGridTracks(customLayout.gridTemplateColumns);
    const rows = countGridTracks(customLayout.gridTemplateRows);
    if (cols > 0 && rows > 0) {
      return cols * rows >= needed;
    }
    return false;
  } catch (_) {
    return false;
  }
}

const DEBUG_MODE = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (() => {
  try { return localStorage.getItem('meme-src-collage-debug') === '1'; } catch { return false; }
})();
const debugLog = (...args) => { if (DEBUG_MODE) console.log(...args); };

const AUTOSAVE_DEBOUNCE_MS = 650;
const AUTOSAVE_RETRY_BASE_DELAY_MS = 1500;
const AUTOSAVE_RETRY_MAX_DELAY_MS = 8000;
const PANEL_DIM_REFRESH_TIMEOUT_MS = 1800;

// Navigation blocking removed - only browser tab close warning remains via useBeforeUnload

// Development utility removed - welcome screen is no longer shown for users with access



/**
 * Helper function to get numeric border thickness percentage value from string/option
 */
const getBorderThicknessValue = (borderThickness, options) => {
  // If it's already a number, return it as percentage
  if (typeof borderThickness === 'number') {
    return borderThickness;
  }
  
  // Find matching option by label (case insensitive)
  const normalizedLabel = String(borderThickness).toLowerCase();
  const option = options.find(opt => 
    String(opt.label).toLowerCase() === normalizedLabel
  );
  
  // Return the percentage value if found, otherwise default to 2 (medium)
  return option ? option.value : 2;
};

// Utility function to hash username for localStorage (needed for auto-forwarding)
const hashString = (str) => {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i);
    hash = ((hash * 33) - hash) + char;
    hash = Math.imul(hash, 1); // Convert to 32bit integer
  }
  return Math.abs(hash).toString();
};

// Utility functions for localStorage preference management (needed for auto-forwarding)
const getCollagePreferenceKey = (user) => {
  if (!user?.userDetails?.email) return 'memeSRC-collage-preference-anonymous';
  const hashedUsername = hashString(user.userDetails.email);
  return `memeSRC-collage-preference-${hashedUsername}`;
};

const getCollagePreference = (user) => {
  const key = getCollagePreferenceKey(user);
  return localStorage.getItem(key) || 'new';
};

export default function CollagePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useContext(UserContext);
  const { openSubscriptionDialog } = useSubscribeDialog();
  const { clearAll } = useCollage();
  const isAdmin = user?.['cognito:groups']?.includes('admins');
  const isPro = user?.userDetails?.magicSubscription === "true";
  const authorized = (isPro || isAdmin);
  // Access flags
  const hasLibraryAccess = isAdmin || isPro; // enable library for paid pro users
  const hasProjectsAccess = isAdmin; // keep projects admin-only

  // Autosave UI state
  const lastSavedSigRef = useRef(null);
  const lastThumbnailSigRef = useRef(null);
  const [saveStatus, setSaveStatus] = useState({ state: 'idle', time: null, error: null }); // states: idle | queued | saving | saved | error
  const [isDirty, setIsDirty] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const saveTimerRef = useRef(null);
  const saveChainRef = useRef(Promise.resolve());
  const retryAttemptRef = useRef(0);
  const retryTimerRef = useRef(null);
  const enqueueSaveRef = useRef(null);
  const queuedSigRef = useRef(null);
  const isMountedRef = useRef(true);
  
  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams();
  
  // Projects state: track only the active project id for editor flows
  const [activeProjectId, setActiveProjectId] = useState(null);
  // Simplified autosave: no throttling/deferral; save only on tool exit
  const lastRenderedSigRef = useRef(null);
  const editingSessionActiveRef = useRef(false);
  const captionOpenPrevRef = useRef(false);
  const exitSaveTimerRef = useRef(null);
  const loadingProjectRef = useRef(false);
  const creatingProjectRef = useRef(false);
  // Persisted custom grid from border dragging
  const [customLayout, setCustomLayout] = useState(null);
  const [isHydratingProject, setHydratingProject] = useState(false);
  const [remoteUpdateWarning, setRemoteUpdateWarning] = useState(null);
  const [allowHydrationTransformCarry, setAllowHydrationTransformCarry] = useState(false);
  const activeSnapshotVersionRef = useRef(null);
  const acknowledgedRemoteVersionRef = useRef(null);
  const projectSubscriptionCleanupRef = useRef(null);
  const isDirtyRef = useRef(false);
  const isHydratingProjectRef = useRef(isHydratingProject);
  const hydrationTransformAdjustRef = useRef(null);
  
  // State to control the result dialog
  const [showResultDialog, setShowResultDialog] = useState(false);
  // Queue for applying magic edits after state rehydrates (e.g., project load)
  const pendingMagicRef = useRef({ result: null, ctx: null });
  
  // Unified bottom bar control (no animation)
  const [currentView, setCurrentView] = useState('editor'); // 'library' | 'editor'
  const [librarySelection, setLibrarySelection] = useState({ count: 0, minSelected: 2 });
  const libraryActionsRef = useRef({ primary: null, clearSelection: null });

  // State and ref for settings disclosure
  const settingsRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isCaptionEditorOpen, setIsCaptionEditorOpen] = useState(false);
  const [showEarlyAccess, setShowEarlyAccess] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  




  // Note: BulkUploadSection is now completely hidden when images are present
  // No need for collapse state management since it's not shown after initial upload

  const {
    selectedImages, 
    panelImageMapping,
    panelTransforms,
    panelTexts,
    lastUsedTextSettings,
    selectedTemplate,
    setSelectedTemplate,
    selectedAspectRatio,
    setSelectedAspectRatio,
    panelCount,
    setPanelCount,
    finalImage,
    setFinalImage,
    isCreatingCollage,
    setIsCreatingCollage,
    borderThickness,
    setBorderThickness,
    borderColor,
    setBorderColor,
    addImage,
    addMultipleImages,
    removeImage,
    updateImage,
    replaceImage,
    clearImages,
    applySnapshotState,
    setHydrationMode,
    updatePanelImageMapping,
    updatePanelTransform,
    setAllPanelTransforms,
    updatePanelText,
    libraryRefreshTrigger,
  } = useCollageState(isAdmin);

  // Nudge states: visual hold vs. tooltip visibility
  const [nudgeVisualActive, setNudgeVisualActive] = useState(false);
  const [nudgeMessageVisible, setNudgeMessageVisible] = useState(false);
  const nudgeMessageVisibleRef = useRef(false);
  // Single replaceable dismissal timer
  const nudgeDismissTimeoutRef = useRef(null);
  const generateBtnRef = useRef(null);
  const bottomBarRef = useRef(null);
  const nudgeVisualActiveRef = useRef(false);
  const [bottomBarHeight, setBottomBarHeight] = useState(0);
  const bottomBarContentRef = useRef(null);
  const [bottomBarCenterX, setBottomBarCenterX] = useState(null);
  // Suppress frame-level action menus briefly after collage-level long-press
  const frameActionSuppressUntilRef = useRef(0);

  // Check if all panels have images assigned (same logic as CollageImagesStep)
  const mappedPanels = Object.keys(panelImageMapping || {}).length;
  const allPanelsHaveImages = mappedPanels === panelCount && 
    Object.values(panelImageMapping || {}).every(imageIndex => 
      imageIndex !== undefined && 
      imageIndex !== null && 
      selectedImages[imageIndex]
    );

  // Check if user has added at least one image or wants to start from scratch
  const hasImages = selectedImages && selectedImages.length > 0;

  const borderThicknessOptions = [
    { label: "None", value: 0 },        // 0%
    { label: "Thin", value: 0.5 },      // 0.5%
    { label: "Medium", value: 1.5 },    // 1.5%
    { label: "Thicc", value: 4 },       // 4%
    { label: "Thiccer", value: 7 },     // 7%
    { label: "XTRA THICC", value: 12 }, // 12%
    { label: "UNGODLY CHONK'D", value: 20 } // 20%
  ];

  // Get numeric border thickness value
  const borderThicknessValue = getBorderThicknessValue(borderThickness, borderThicknessOptions);

  // Log changes to border color and thickness
  useEffect(() => {
    debugLog(`[PAGE DEBUG] Border settings: color=${borderColor}, thickness=${borderThickness} (${borderThicknessValue}%)`);
  }, [borderColor, borderThickness, borderThicknessValue]);

  

  // Track current subview for admins
  useEffect(() => {
    if (hasLibraryAccess) {
      setCurrentView(hasImages ? 'editor' : 'library');
    } else {
      setCurrentView(hasImages ? 'editor' : 'start');
    }
  }, [hasLibraryAccess, hasImages]);

  // Track bottom bar size/center for positioning the nudge message above it
  useEffect(() => {
    const el = bottomBarRef.current;
    const contentEl = bottomBarContentRef.current;
    if (!el) return undefined;

    const update = () => {
      setBottomBarHeight(el.offsetHeight || 0);
      if (contentEl) {
        const rect = contentEl.getBoundingClientRect();
        setBottomBarCenterX(rect.left + rect.width / 2);
      } else {
        setBottomBarCenterX(typeof window !== 'undefined' ? window.innerWidth / 2 : null);
      }
    };
    update();

    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update);
      ro.observe(el);
      if (contentEl) ro.observe(contentEl);
    }
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      if (ro) ro.disconnect();
    };
  }, [currentView, showResultDialog, isCaptionEditorOpen]);



  // Auto-forwarding logic based on user preference
  useEffect(() => {
    if (authorized && user) {
      const preference = getCollagePreference(user);
      const searchParams = new URLSearchParams(location.search);
      const isForced = searchParams.get('force') === 'new';
      // no-op for old inline picker; editor-only now
      
      // Only auto-forward if not forced to new version
      if (preference === 'legacy' && !isForced) {
        navigate('/collage-legacy');
      }
    }
  }, [user, navigate, location.search, authorized]);

  // If user has projects access and lands on /collage, redirect to /projects as the starting point
  useEffect(() => {
    if (!hasProjectsAccess) return;
    if (location.pathname === '/collage') {
      navigate('/projects', { replace: true });
    }
  }, [hasProjectsAccess, location.pathname, navigate]);

  // (Removed redundant no-op useEffect for project route; actual loader lives below.)

  // Handle new project route (/projects/new): start with clean state
  useEffect(() => {
    if (!hasProjectsAccess) return;
    if (location.pathname === '/projects/new') {
      setActiveProjectId(null);
      try {
        clearImages();
      } catch (_) { /* ignore */ }
      setCustomLayout(null);
      setLiveCustomLayout(null);
      setLivePanelDimensions(null);
    }
  }, [hasProjectsAccess, location.pathname]);

  useEffect(() => {
    if (activeProjectId) return;
    activeSnapshotVersionRef.current = null;
    acknowledgedRemoteVersionRef.current = null;
    setRemoteUpdateWarning(null);
    hydrationTransformAdjustRef.current = null;
  }, [activeProjectId]);

  // Build current snapshot/signature once per state change
  const [renderBump, setRenderBump] = useState(0);
  // Live preview meta from CanvasCollagePreview (avoids DOM queries)
  const [previewCanvasWidth, setPreviewCanvasWidth] = useState(null);
  const [previewCanvasHeight, setPreviewCanvasHeight] = useState(null);
  const [liveCustomLayout, setLiveCustomLayout] = useState(null);
  const [livePanelDimensions, setLivePanelDimensions] = useState(null);
  const [previewResetKey, setPreviewResetKey] = useState(0);

  const currentSnapshot = useMemo(() => buildSnapshotFromState({
    selectedImages,
    panelImageMapping,
    panelTransforms,
    panelTexts,
    selectedTemplate,
    selectedAspectRatio,
    panelCount,
    borderThickness,
    borderColor,
    // Include live custom layout from preview dataset if available
    // Note: this relies on the preview tagging the canvas with the serialized layout
    customLayout: (() => {
      // Prefer state pushed from preview to avoid races
      if (liveCustomLayout) return liveCustomLayout;
      try {
        const canvas = document.querySelector('[data-testid="canvas-collage-preview"]');
        const json = canvas?.dataset?.customLayout;
        if (!json) return null;
        return JSON.parse(json);
      } catch (_) { return null; }
    })(),
    // Capture live canvas size for proper transform scaling in thumbnails
    ...(() => {
      // Prefer state pushed from preview to avoid races
      const w = Number(previewCanvasWidth || 0);
      const h = Number(previewCanvasHeight || 0);
      if (w > 0 && h > 0) return { canvasWidth: w, canvasHeight: h };
      try {
        const canvas = document.querySelector('[data-testid="canvas-collage-preview"]');
        const dw = Number(canvas?.dataset?.previewWidth || 0);
        const dh = Number(canvas?.dataset?.previewHeight || 0);
        if (dw > 0 && dh > 0) return { canvasWidth: dw, canvasHeight: dh };
      } catch (_) { /* ignore */ }
      return {};
    })(),
    panelDimensions: livePanelDimensions || (() => {
      try {
        const canvas = document.querySelector('[data-testid="canvas-collage-preview"]');
        const json = canvas?.dataset?.panelDimensions;
        if (!json) return undefined;
        const parsed = JSON.parse(json);
        if (!parsed || typeof parsed !== 'object' || Object.keys(parsed).length === 0) {
          return undefined;
        }
        return parsed;
      } catch (_) {
        return undefined;
      }
    })(),
  }), [selectedImages, panelImageMapping, panelTransforms, panelTexts, selectedTemplate, selectedAspectRatio, panelCount, borderThickness, borderColor, previewCanvasWidth, previewCanvasHeight, liveCustomLayout, livePanelDimensions]);

  const currentSig = useMemo(() => computeSnapshotSignature(currentSnapshot), [currentSnapshot]);
  const currentSnapshotRef = useRef(currentSnapshot);
  const currentSigRef = useRef(currentSig);
  useEffect(() => { currentSnapshotRef.current = currentSnapshot; }, [currentSnapshot]);
  useEffect(() => { currentSigRef.current = currentSig; }, [currentSig]);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);
  useEffect(() => { isHydratingProjectRef.current = isHydratingProject; }, [isHydratingProject]);
  const maybeNormalizeHydratedTransforms = useCallback(({ canvasWidth = null, canvasHeight = null, panelDimensions = null } = {}) => {
    const pending = hydrationTransformAdjustRef.current;
    if (!pending) return;
    const source = pending.transforms || {};
    const savedPanelDims = pending.panelDimensions || null;
    if (savedPanelDims && (!panelDimensions || Object.keys(panelDimensions).length === 0)) {
      // Wait until live panel dimensions are available to avoid mis-scaling on remote hydration.
      return;
    }

    const scaleWithPanels = () => {
      if (!savedPanelDims || !panelDimensions) return false;
      const scaled = JSON.parse(JSON.stringify(source || {}));
      let changed = false;
      Object.keys(savedPanelDims).forEach((panelId) => {
        const saved = savedPanelDims[panelId];
        const current = panelDimensions[panelId];
        if (!saved || !current) return;
        if (!saved.width || !saved.height || !current.width || !current.height) return;
        const scaleX = current.width / saved.width;
        const scaleY = current.height / saved.height;
        if (Math.abs(scaleX - 1) < 0.0001 && Math.abs(scaleY - 1) < 0.0001) return;
        const transform = scaled[panelId];
        if (!transform) return;
        transform.positionX = (transform.positionX || 0) * scaleX;
        transform.positionY = (transform.positionY || 0) * scaleY;
        changed = true;
      });
      if (changed) {
        setAllPanelTransforms(scaled);
        hydrationTransformAdjustRef.current = null;
      }
      return changed;
    };

    if (scaleWithPanels()) return;

    const baseWidth = pending.width || canvasWidth;
    const baseHeight = pending.height || canvasHeight;
    if (!baseWidth || !canvasWidth) return;
    const scaleX = canvasWidth / baseWidth;
    const scaleY = baseHeight && canvasHeight ? canvasHeight / baseHeight : scaleX;
    if (Math.abs(scaleX - 1) < 0.0001 && Math.abs(scaleY - 1) < 0.0001) {
      hydrationTransformAdjustRef.current = null;
      return;
    }
    const scaled = JSON.parse(JSON.stringify(source || {}));
    Object.keys(scaled).forEach((panelId) => {
      const transform = scaled[panelId];
      if (!transform) return;
      transform.positionX = (transform.positionX || 0) * scaleX;
      transform.positionY = (transform.positionY || 0) * scaleY;
    });
    setAllPanelTransforms(scaled);
    hydrationTransformAdjustRef.current = null;
  }, [setAllPanelTransforms]);

  // Track whether current state differs from last saved snapshot (for UI enablement)
  useEffect(() => {
    if (!activeProjectId) return;
    setIsDirty(currentSig !== lastSavedSigRef.current);
  }, [activeProjectId, currentSig]);

  const saveIndicator = useMemo(() => {
    if (saveStatus.state === 'error') {
      return <Chip label="Retrying…" color="error" size="small" variant="outlined" />;
    }
    if (saveStatus.state === 'saving' || saveStatus.state === 'queued') {
      return <Chip label="Saving…" color="warning" size="small" />;
    }
    // Check saved state before isDirty to avoid showing "Unsaved changes" right after save completes
    if (saveStatus.state === 'saved' && !isDirty) {
      return <Chip label="All changes saved" color="success" size="small" variant="outlined" />;
    }
    if (isDirty) {
      return <Chip label="Unsaved changes" color="warning" size="small" variant="outlined" />;
    }
    return null;
  }, [isDirty, saveStatus.state]);

  // Handle images passed from collage
  useEffect(() => {
    // Handle a magic editor return (navigation-based)
    if (location.state?.magicResult) {
      const result = location.state.magicResult;
      const ctx = location.state.magicContext;
      try {
        // Stash the result and context; actual replace may need to wait
        pendingMagicRef.current = { result, ctx };
      } catch (_) { /* ignore */ }
      // Immediately clear navigation state to avoid duplicate application on back/refresh
      navigate(location.pathname, { replace: true, state: {} });
      return; // don't also try to process collage import below
    }

    if (location.state?.fromCollage && location.state?.images) {
      const loadImages = async () => {
        debugLog('Loading images from collage:', location.state.images);

        // Transform images to the expected format, preserving subtitle data
        const transformedImages = location.state.images.map(item => {
          if (typeof item === 'string') {
            return item; // Already a URL
          }
          // Return the complete item with subtitle data preserved
          return {
            originalUrl: item.originalUrl || item.displayUrl || item,
            displayUrl: item.displayUrl || item.originalUrl || item,
            subtitle: item.subtitle || '',
            subtitleShowing: item.subtitleShowing || false,
            metadata: item.metadata || {}
          };
        });

        debugLog('Transformed collage images with subtitle data:', transformedImages);
        await addMultipleImages(transformedImages);

        // Auto-assign images to panels like bulk upload does
        setTimeout(() => {
          // First adjust panel count if needed to accommodate all images
          const desiredPanelCount = Math.min(transformedImages.length, 5); // Max 5 panels supported
          debugLog(`[PANEL DEBUG] Current panel count: ${panelCount}, desired: ${desiredPanelCount}, images: ${transformedImages.length}`);
          debugLog(`[PANEL DEBUG] Current template:`, selectedTemplate);

          if (transformedImages.length > panelCount && setPanelCount) {
            setPanelCount(desiredPanelCount);
            debugLog(`[PANEL DEBUG] Adjusted panel count to ${desiredPanelCount} for ${transformedImages.length} images`);
          }

          // Wait a bit more for template to update if panel count changed
          setTimeout(() => {
            debugLog(`[PANEL DEBUG] Template after panel count change:`, selectedTemplate);

            // Then assign images to panels using the updated panel count
            const newMapping = {};
            const imagesToAssign = Math.min(transformedImages.length, desiredPanelCount);

            for (let i = 0; i < imagesToAssign; i += 1) {
              const panelId = selectedTemplate?.layout?.panels?.[i]?.id || `panel-${i + 1}`;
              newMapping[panelId] = i;
            }

            debugLog('[PANEL DEBUG] Auto-assigning collage images to panels:', newMapping);
            updatePanelImageMapping(newMapping);
          }, transformedImages.length > panelCount ? 200 : 0); // Extra delay if panel count changed
        }, 100); // Small delay to ensure images are added first

        // Clear the navigation state to prevent re-loading on refresh
        navigate(location.pathname, { replace: true, state: {} });
      };

      loadImages();
    }
  }, [location.state, addMultipleImages, navigate, location.pathname, panelCount, selectedTemplate, updatePanelImageMapping, setPanelCount]);

  // Apply any pending magic edit once images/mapping are available
  useEffect(() => {
    const pending = pendingMagicRef.current;
    if (!pending || !pending.result) return;

    const ctx = pending.ctx || {};
    // Resolve target index, preferring the originally edited index
    const byIndex = (typeof ctx.imageIndex === 'number') ? ctx.imageIndex : null;
    const byPanel = (ctx.panelId && typeof panelImageMapping?.[ctx.panelId] === 'number')
      ? panelImageMapping[ctx.panelId]
      : null;
    const targetIdx = (typeof byIndex === 'number') ? byIndex : byPanel;

    if (typeof targetIdx === 'number' && targetIdx >= 0 && targetIdx < selectedImages.length) {
      try {
        replaceImage(targetIdx, pending.result);
      } finally {
        // Clear the pending record once applied
        pendingMagicRef.current = { result: null, ctx: null };
      }
    }
  }, [selectedImages.length, panelImageMapping, replaceImage]);

  // Project list sync removed; list now lives solely on /projects page

  // Helpers defined at module scope: blobToDataUrl, computeSnapshotSignature

  // Load a project snapshot into the current editor state
  const loadProjectById = useCallback(async (projectId) => {
    setHydratingProject(true);
    const record = await getProjectRecord(projectId);
    if (!record) return;
    activeSnapshotVersionRef.current = typeof record.snapshotVersion === 'number' ? record.snapshotVersion : null;
    acknowledgedRemoteVersionRef.current = activeSnapshotVersionRef.current;
    setRemoteUpdateWarning(null);
    loadingProjectRef.current = true;
    const snap = await resolveTemplateSnapshot(record);
    if (!snap) return;

    const nextAspectRatio = snap.selectedAspectRatio || 'square';
    const nextPanelCount = snap.panelCount || 2;

    let templateForSnapshot = null;
    try {
      const templates = getLayoutsForPanelCount(nextPanelCount, nextAspectRatio);
      templateForSnapshot = templates.find((t) => t.id === snap.selectedTemplateId) || templates[0] || null;
    } catch (_) { /* ignore */ }

    const restoredCustom = isCustomLayoutCompatible(snap.customLayout, nextPanelCount)
      ? (snap.customLayout || null)
      : null;

    const resolveImageRef = async (ref) => {
      if (!ref) return null;
      if (typeof ref === 'string') {
        return {
          originalUrl: ref,
          displayUrl: ref,
          metadata: {},
          subtitle: '',
          subtitleShowing: false,
        };
      }
      if (ref.libraryKey) {
        try {
          const blob = await getFromLibrary(ref.libraryKey);
          const dataUrl = await blobToDataUrl(blob);
          return {
            originalUrl: dataUrl,
            displayUrl: dataUrl,
            metadata: { libraryKey: ref.libraryKey },
            subtitle: ref.subtitle || '',
            subtitleShowing: !!ref.subtitleShowing,
          };
        } catch (_) {
          const fallbackUrl = ref.url || '';
          return {
            originalUrl: fallbackUrl,
            displayUrl: fallbackUrl,
            metadata: { libraryKey: ref.libraryKey },
            subtitle: ref.subtitle || '',
            subtitleShowing: !!ref.subtitleShowing,
          };
        }
      }
      if (ref.url) {
        return {
          originalUrl: ref.url,
          displayUrl: ref.url,
          subtitle: ref.subtitle || '',
          subtitleShowing: !!ref.subtitleShowing,
        };
      }
      return null;
    };

    const resolvedImagesRaw = Array.isArray(snap.images) && snap.images.length > 0
      ? await Promise.all(snap.images.map(resolveImageRef))
      : [];

    const imagesForState = resolvedImagesRaw.map((img, index) => {
      if (img) return img;
      const fallbackRef = Array.isArray(snap.images) ? snap.images[index] || {} : {};
      if (typeof fallbackRef === 'string') {
        return {
          originalUrl: fallbackRef,
          displayUrl: fallbackRef,
          metadata: {},
          subtitle: '',
          subtitleShowing: false,
        };
      }
      const fallbackUrl = fallbackRef.url || '';
      const metadata = fallbackRef.libraryKey ? { libraryKey: fallbackRef.libraryKey } : {};
      return {
        originalUrl: fallbackUrl,
        displayUrl: fallbackUrl,
        metadata,
        subtitle: fallbackRef.subtitle || '',
        subtitleShowing: !!fallbackRef.subtitleShowing,
      };
    });

    const normalizedTransforms = (snap.panelTransforms && typeof snap.panelTransforms === 'object')
      ? JSON.parse(JSON.stringify(snap.panelTransforms))
      : {};

    const snapshotState = {
      images: imagesForState,
      mapping: (snap.panelImageMapping && typeof snap.panelImageMapping === 'object') ? snap.panelImageMapping : {},
      transforms: normalizedTransforms,
      texts: (snap.panelTexts && typeof snap.panelTexts === 'object') ? snap.panelTexts : {},
    };

    hydrationTransformAdjustRef.current = {
      width: snap.canvasWidth || null,
      height: snap.canvasHeight || null,
      panelDimensions: (snap.panelDimensions && typeof snap.panelDimensions === 'object')
        ? JSON.parse(JSON.stringify(snap.panelDimensions))
        : null,
      transforms: JSON.parse(JSON.stringify(normalizedTransforms)),
    };

    setHydrationMode(true);

    const applyAll = () => {
      setSelectedAspectRatio(nextAspectRatio);
      setPanelCount(nextPanelCount);
      setSelectedTemplate(templateForSnapshot || null);
      if (snap.borderThickness !== undefined) setBorderThickness(snap.borderThickness);
      if (snap.borderColor !== undefined) setBorderColor(snap.borderColor);
      setCustomLayout(restoredCustom);
      setLiveCustomLayout(restoredCustom || null);
      setLivePanelDimensions(null);
      applySnapshotState(snapshotState);
      setActiveProjectId(projectId);
      setPreviewResetKey((key) => key + 1);
    };

    if (typeof unstable_batchedUpdates === 'function') {
      unstable_batchedUpdates(applyAll);
    } else {
      applyAll();
    }

    const sig = computeSnapshotSignature(snap);
    lastSavedSigRef.current = sig;
    lastThumbnailSigRef.current = record.thumbnailSignature || null;
    queuedSigRef.current = null;
    retryAttemptRef.current = 0;
    saveChainRef.current = Promise.resolve();
    didInitialSaveRef.current = true; // Prevent autosave from triggering immediately after load
    justLoadedRef.current = true; // Flag to sync signature after first render
    setIsDirty(false); // Project just loaded, no unsaved changes
    setSaveStatus({ state: 'saved', time: Date.now(), error: null });
  }, [applySnapshotState, getProjectRecord, resolveTemplateSnapshot, setActiveProjectId, setBorderColor, setBorderThickness, setCustomLayout, setHydrationMode, setHydratingProject, setPanelCount, setSelectedAspectRatio, setSelectedTemplate]);

  // Ensure we always release the loading flag, even on errors, and only
  // after state has settled so custom layouts are not cleared prematurely.
  // Wrap the original function in a safe caller.
  const safeLoadProjectById = useCallback(async (projectId) => {
    try {
      await loadProjectById(projectId);
    } finally {
      const release = () => {
        loadingProjectRef.current = false;
        setHydratingProject(false);
        setHydrationMode(false);
      };
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(release);
        });
      } else {
        setTimeout(release, 50);
      }
    }
  }, [loadProjectById, setHydrationMode, setHydratingProject]);

  // Keep a stable ref to the loader to avoid effect re-runs from changing callback identities
  const loadProjectByIdRef = useRef(safeLoadProjectById);
  useEffect(() => { loadProjectByIdRef.current = safeLoadProjectById; }, [safeLoadProjectById]);

  const triggerProjectLoad = useCallback((id, { allowTransformCarry = false } = {}) => {
    if (!id || typeof loadProjectByIdRef.current !== 'function') return Promise.resolve();
    if (allowTransformCarry) setAllowHydrationTransformCarry(true);
    const promise = Promise.resolve(loadProjectByIdRef.current(id));
    return promise.finally(() => {
      if (allowTransformCarry) setAllowHydrationTransformCarry(false);
    });
  }, [setAllowHydrationTransformCarry]);

  // Centralized save used by autosave queue and manual save
  const saveProjectNow = useCallback(async ({ showToast = false, forceThumbnail = false } = {}) => {
    if (!activeProjectId) return;
    const state = currentSnapshotRef.current;
    if (!state) return;
    const sig = computeSnapshotSignature(state);
    const nextForceThumbnail = forceThumbnail || sig !== lastThumbnailSigRef.current;
    if (!nextForceThumbnail && sig === lastSavedSigRef.current) {
      if (showToast) setSnackbar({ open: true, message: 'All changes saved', severity: 'success' });
      setSaveStatus({ state: 'saved', time: Date.now(), error: null });
      setIsDirty(false); // Ensure isDirty is false when there are no changes to save
      queuedSigRef.current = null;
      return;
    }
    try {
      setSaveStatus({ state: 'saving', time: null, error: null });
      const updatedRecord = await upsertProject(activeProjectId, { state });
      lastSavedSigRef.current = sig;
      if (updatedRecord && typeof updatedRecord.snapshotVersion === 'number') {
        activeSnapshotVersionRef.current = updatedRecord.snapshotVersion;
        acknowledgedRemoteVersionRef.current = updatedRecord.snapshotVersion;
      }
      setRemoteUpdateWarning(null);
      if (nextForceThumbnail) {
        const dataUrl = await renderThumbnailFromSnapshot(state, { maxDim: 512 });
        if (dataUrl) {
          await upsertProject(activeProjectId, {
            thumbnail: dataUrl,
            thumbnailSignature: sig,
            thumbnailUpdatedAt: new Date().toISOString(),
          });
          lastThumbnailSigRef.current = sig;
        }
      }
      setSaveStatus({ state: 'saved', time: Date.now(), error: null });
      // Update isDirty since we just updated the saved signature ref
      setIsDirty(currentSigRef.current !== sig);
      retryAttemptRef.current = 0;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      queuedSigRef.current = null;
      if (showToast) setSnackbar({ open: true, message: 'Saved', severity: 'success' });
    } catch (error) {
      if (DEBUG_MODE) console.warn('Autosave failed:', error);
      retryAttemptRef.current += 1;
      setSaveStatus({ state: 'error', time: Date.now(), error });
      setSnackbar({ open: true, message: 'Save failed. Retrying…', severity: 'error' });
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      const delay = Math.min(AUTOSAVE_RETRY_BASE_DELAY_MS * retryAttemptRef.current, AUTOSAVE_RETRY_MAX_DELAY_MS);
      retryTimerRef.current = setTimeout(() => {
        if (enqueueSaveRef.current) {
          enqueueSaveRef.current({ reason: 'retry', immediate: true, forceThumbnail: true });
        }
      }, delay);
      throw error;
    }
  }, [activeProjectId, setSnackbar, upsertProject, renderThumbnailFromSnapshot]);

  const enqueueSave = useCallback(
    ({ reason = 'autosave', immediate = false, forceThumbnail = false, showToast = false } = {}) => {
      if (!activeProjectId) return saveChainRef.current;
      const sig = currentSigRef.current;
      const hasChanges = forceThumbnail || sig !== lastSavedSigRef.current;
      if (!hasChanges) {
        return saveChainRef.current;
      }
      if (DEBUG_MODE) debugLog('[autosave] queue', { reason, immediate, sig, forceThumbnail });
      queuedSigRef.current = sig;
      setSaveStatus((prev) => (prev.state === 'saving' ? prev : { state: 'queued', time: prev.time, error: null }));
      const schedule = () => {
        const run = () => saveProjectNow({ showToast, forceThumbnail });
        saveChainRef.current = saveChainRef.current
          .catch(() => undefined)
          .then(run)
          .catch(() => undefined);
        return saveChainRef.current;
      };
      if (immediate) {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        return schedule();
      }
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        schedule();
      }, AUTOSAVE_DEBOUNCE_MS);
      return saveChainRef.current;
    },
    [activeProjectId, saveProjectNow]
  );

  useEffect(() => { enqueueSaveRef.current = enqueueSave; }, [enqueueSave]);
  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
  }, []);

  const isSaveBusy = saveStatus.state === 'saving' || saveStatus.state === 'queued' || saveStatus.state === 'error';

  useBeforeUnload(useCallback((event) => {
    if (isSaveBusy || isDirty) {
      event.preventDefault();
      // eslint-disable-next-line no-param-reassign
      event.returnValue = '';
    }
  }, [isSaveBusy, isDirty]));


  // Receive editing session state from preview and save once editing ends
  const handleEditingSessionChange = useCallback((active) => {
    const wasActive = editingSessionActiveRef.current;
    const isActive = !!active;
    // Update stored state first
    editingSessionActiveRef.current = isActive;
    // Clear any pending exit-save if user re-enters editing quickly
    if (isActive && exitSaveTimerRef.current) {
      clearTimeout(exitSaveTimerRef.current);
      exitSaveTimerRef.current = null;
    }
    // Only save on transition from active -> inactive; defer slightly to let state settle
    if (wasActive && !isActive) {
      if (exitSaveTimerRef.current) clearTimeout(exitSaveTimerRef.current);
      exitSaveTimerRef.current = setTimeout(() => {
        exitSaveTimerRef.current = null;
        enqueueSave({ reason: 'editing-session-end' });
      }, 80);
    }
  }, [enqueueSave]);

  // After loading a project, update the saved signature to match the first render
  // This prevents autosave from triggering due to canvas dimension differences
  const justLoadedRef = useRef(false);
  useEffect(() => {
    if (!activeProjectId) return;
    if (!justLoadedRef.current) return;
    if (loadingProjectRef.current || isHydratingProject) return;
    // Once hydration completes and preview has rendered, sync the saved signature
    if (lastRenderedSigRef.current && lastRenderedSigRef.current !== lastSavedSigRef.current) {
      lastSavedSigRef.current = lastRenderedSigRef.current;
      justLoadedRef.current = false;
      // Force isDirty to recalculate since we updated the ref
      setIsDirty(currentSig !== lastRenderedSigRef.current);
    }
  }, [activeProjectId, isHydratingProject, currentSig]);

  // Autosave trigger when the rendered snapshot changes
  const didInitialSaveRef = useRef(false);
  useEffect(() => {
    if (!activeProjectId) return undefined;
    // Skip autosave while loading/hydrating a project to avoid spurious saves from canvas dimension changes
    if (loadingProjectRef.current || isHydratingProject) return undefined;
    if (justLoadedRef.current) return undefined;
    if (currentSig === lastSavedSigRef.current) return undefined;
    let fallbackTimer = null;
    const hasRendered = lastRenderedSigRef.current === currentSig;
    if (!hasRendered) {
      fallbackTimer = setTimeout(() => {
        if (!didInitialSaveRef.current) didInitialSaveRef.current = true;
        enqueueSave({ reason: 'preview-fallback', immediate: true, forceThumbnail: true });
      }, 450);
      return () => {
        if (fallbackTimer) clearTimeout(fallbackTimer);
      };
    }
    if (!didInitialSaveRef.current) {
      didInitialSaveRef.current = true;
      enqueueSave({ reason: 'initial-render', immediate: true, forceThumbnail: true });
    } else {
      enqueueSave({ reason: 'state-change' });
    }
    return () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [activeProjectId, currentSig, renderBump, enqueueSave, isHydratingProject]);

  // After the first save of a newly created project on /projects/new, navigate to /projects/<id>
  const didNavigateToProjectRef = useRef(false);
  useEffect(() => {
    if (!hasProjectsAccess) return;
    if (didNavigateToProjectRef.current) return;
    if (location.pathname !== '/projects/new') return;
    if (!activeProjectId) return;
    if (saveStatus.state !== 'saved') return;
    didNavigateToProjectRef.current = true;
    navigate(`/projects/${activeProjectId}`, { replace: true });
  }, [hasProjectsAccess, location.pathname, activeProjectId, saveStatus.state, navigate]);

  // Handle navigation-driven project editing (/projects/:projectId) — placed after loadProjectById is defined
  // Use a ref-backed loader to avoid re-running due to changing callback identity
  useEffect(() => {
    if (hasProjectsAccess && projectId) {
      void triggerProjectLoad(projectId).catch(() => {});
    }
    return () => {};
  }, [hasProjectsAccess, projectId, triggerProjectLoad]);

  const handleRemoteProjectUpdate = useCallback((record) => {
    if (!record || record.id !== activeProjectId) return;
    const remoteVersion = typeof record.snapshotVersion === 'number' ? record.snapshotVersion : null;
    if (remoteVersion === null) return;
    const localVersion = typeof activeSnapshotVersionRef.current === 'number' ? activeSnapshotVersionRef.current : null;
    if (localVersion !== null && remoteVersion <= localVersion) {
      if ((acknowledgedRemoteVersionRef.current ?? -1) < remoteVersion) {
        acknowledgedRemoteVersionRef.current = remoteVersion;
      }
      return;
    }
    if (loadingProjectRef.current || isHydratingProjectRef.current) return;
    if (!isDirtyRef.current) {
      acknowledgedRemoteVersionRef.current = remoteVersion;
      triggerProjectLoad(record.id).catch(() => {});
      return;
    }
    if ((acknowledgedRemoteVersionRef.current ?? -1) >= remoteVersion) return;
    setRemoteUpdateWarning({
      projectId: record.id,
      version: remoteVersion,
      updatedAt: record.updatedAt || null,
    });
  }, [activeProjectId, triggerProjectLoad]);

  useEffect(() => {
    if (!hasProjectsAccess || !activeProjectId) {
      if (projectSubscriptionCleanupRef.current) {
        projectSubscriptionCleanupRef.current();
        projectSubscriptionCleanupRef.current = null;
      }
      return undefined;
    }
    const unsubscribe = subscribeToProject(activeProjectId, handleRemoteProjectUpdate);
    projectSubscriptionCleanupRef.current = unsubscribe;
    return () => {
      unsubscribe?.();
      if (projectSubscriptionCleanupRef.current === unsubscribe) {
        projectSubscriptionCleanupRef.current = null;
      }
    };
  }, [hasProjectsAccess, activeProjectId, handleRemoteProjectUpdate]);

  const handleRemoteReload = useCallback(() => {
    if (!activeProjectId) return;
    const targetVersion = typeof remoteUpdateWarning?.version === 'number' ? remoteUpdateWarning.version : null;
    if (targetVersion !== null) {
      acknowledgedRemoteVersionRef.current = targetVersion;
    }
    setRemoteUpdateWarning(null);
    triggerProjectLoad(activeProjectId).catch(() => {});
  }, [activeProjectId, remoteUpdateWarning, triggerProjectLoad]);

  const handleRemoteDismiss = useCallback(() => {
    const targetVersion = typeof remoteUpdateWarning?.version === 'number' ? remoteUpdateWarning.version : null;
    if (targetVersion !== null) {
      acknowledgedRemoteVersionRef.current = targetVersion;
    }
    setRemoteUpdateWarning(null);
  }, [remoteUpdateWarning]);

  const remoteUpdateTimestampLabel = useMemo(() => {
    if (!remoteUpdateWarning?.updatedAt) return 'just now';
    try {
      const date = new Date(remoteUpdateWarning.updatedAt);
      if (Number.isNaN(date.getTime())) return remoteUpdateWarning.updatedAt;
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch (_) {
      return remoteUpdateWarning.updatedAt;
    }
  }, [remoteUpdateWarning]);

  // 4) Create a project only after images are present AND preview has rendered
  //    This avoids leaving blank projects when a user abandons during selection.
  useEffect(() => {
    if (!hasProjectsAccess) return;
    if (loadingProjectRef.current) return;
    if (activeProjectId) return;
    if (creatingProjectRef.current) return;
    const hasAnyImage = (selectedImages?.length || 0) > 0;
    if (!hasAnyImage) return;
    const hasRendered = lastRenderedSigRef.current === currentSigRef.current;
    if (!hasRendered) return;
    creatingProjectRef.current = true;
    let isActive = true;
    (async () => {
      try {
        const project = await createProject({ name: 'Untitled Meme' });
        if (!isMountedRef.current || !isActive) return;
        setActiveProjectId(project.id);
        activeSnapshotVersionRef.current = typeof project.snapshotVersion === 'number' ? project.snapshotVersion : null;
        acknowledgedRemoteVersionRef.current = activeSnapshotVersionRef.current;
        setRemoteUpdateWarning(null);
        lastSavedSigRef.current = null;
        lastThumbnailSigRef.current = null;
        queuedSigRef.current = null;
        didInitialSaveRef.current = false;
      } catch (err) {
        if (DEBUG_MODE) console.warn('Failed to create template', err);
      } finally {
        creatingProjectRef.current = false;
      }
    })();
    return () => {
      // Only mark inactive when the in-flight request has completed so we don't cancel it prematurely
      if (!creatingProjectRef.current) {
        isActive = false;
      }
    };
  }, [hasProjectsAccess, activeProjectId, selectedImages?.length, currentSig, createProject]);

  // When the user changes layout controls, drop any existing custom grid override
  useEffect(() => {
    if (loadingProjectRef.current) return;
    setCustomLayout(null);
    setLiveCustomLayout(null);
    setLivePanelDimensions(null);
  }, [selectedTemplate?.id, selectedAspectRatio, panelCount]);

  // New/open/delete handlers removed along with inline projects view

  // Manual Save handler (forces immediate thumbnail generation)
  const handleManualSave = useCallback(async () => {
    const promise = enqueueSave({ reason: 'manual', immediate: true, forceThumbnail: true, showToast: true });
    try {
      await promise;
    } catch (_) {
      // Errors surface via snackbar; retries happen automatically
    }
  }, [enqueueSave]);

  // Save before switching to the project picker so recent changes (e.g., replace image) persist
  const handleBackToProjects = useCallback(async () => {
    try {
      await enqueueSave({ reason: 'navigate-back', immediate: true, forceThumbnail: true });
      await saveChainRef.current;
    } catch (_) { /* best-effort save */ }
    if (hasProjectsAccess) navigate('/projects');
  }, [enqueueSave, hasProjectsAccess, navigate]);

  // Cancel from library selection: go back to /projects when on /projects/* routes
  const handleLibraryCancel = useCallback(() => {
    try { libraryActionsRef.current?.clearSelection?.(); } catch (_) { /* ignore */ }
    if (typeof location?.pathname === 'string' && location.pathname.startsWith('/projects')) {
      navigate('/projects');
    }
  }, [navigate, location?.pathname]);

  // Removed unused time formatter

  // Keyboard shortcut: Cmd/Ctrl+S to manually save
  useEffect(() => {
    const onKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      if ((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (isDirty && !isSaveBusy) {
          handleManualSave();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleManualSave, isDirty, isSaveBusy]);

  // Note: BulkUploadSection auto-collapse logic removed since section is now hidden when images are present

  // Handler to go back to edit mode
  const handleBackToEdit = () => {
    setShowResultDialog(false);
  };

  // (Reset All button removed from bottom bar)
  // Start Over (non-admin) — clear current collage and return to start
  const handleResetToStart = () => {
    try {
      setShowResultDialog(false);
      clearImages();
      setCustomLayout(null);
      setLiveCustomLayout(null);
      setLivePanelDimensions(null);
      // Also reset layout to default 2 panels to avoid leftover empty panels
      if (typeof setPanelCount === 'function') {
        setPanelCount(2);
      }
      // For non-admins there is no project picker; clearing images returns to the start screen
    } catch (e) {
      console.error('Failed to reset collage state:', e);
    }
  };

  // Confirm before resetting for non-admins (dialog-based for mobile reliability)
  const openResetDialog = () => setResetDialogOpen(true);
  const closeResetDialog = () => setResetDialogOpen(false);
  const confirmReset = () => { setResetDialogOpen(false); handleResetToStart(); };

  // Toggle settings disclosure and scroll when opening
  const handleToggleSettings = () => {
    setSettingsOpen(prev => {
      const next = !prev;
      if (!prev) {
        setTimeout(() => {
          settingsRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
      return next;
    });
  };



  // Handler for floating button - triggers collage generation
  const handleFloatingButtonClick = async () => {
    debugLog('Floating button: Generating collage...');
    setIsCreatingCollage(true);
    
    // Find the canvas element instead of the HTML element
    const canvasElement = document.querySelector('[data-testid="canvas-collage-preview"]');

    const eventPayload = {
      source: 'CollagePage',
      panelCount,
      aspectRatio: selectedAspectRatio,
      imageCount: Array.isArray(selectedImages) ? selectedImages.length : 0,
      hasCustomLayout: Boolean(customLayout),
      allPanelsHaveImages,
      borderThickness: borderThicknessValue,
      borderColor,
      canvasElementFound: Boolean(canvasElement),
    };

    if (selectedTemplate?.id) {
      eventPayload.templateId = selectedTemplate.id;
    }

    if (activeProjectId) {
      eventPayload.projectId = activeProjectId;
    }

    trackUsageEvent('collage_generate', eventPayload);

    if (!canvasElement) {
      console.error('Canvas collage preview element not found.');
      setIsCreatingCollage(false);
      return;
    }

    try {
      // Get the canvas blob directly - no need for html2canvas
      if (canvasElement.getCanvasBlob) {
        const blob = await canvasElement.getCanvasBlob();
        if (blob) {
          setFinalImage(blob);
          setShowResultDialog(true);
          debugLog("Floating button: Collage generated directly from canvas.");
          
          // Clear the collage items since the collage has been successfully generated
          clearAll();
        } else {
          console.error('Failed to generate canvas blob.');
        }
      } else {
        // Fallback: use canvas toBlob method directly
        canvasElement.toBlob((blob) => {
          if (blob) {
            setFinalImage(blob);
            setShowResultDialog(true);
            debugLog("Floating button: Collage generated directly from canvas (fallback method).");
            
            // Clear the collage items since the collage has been successfully generated
            clearAll();
          } else {
            console.error('Failed to generate canvas blob using fallback method.');
          }
        }, 'image/png');
      }
    } catch (err) {
      console.error('Error generating collage:', err);
    } finally {
      setIsCreatingCollage(false);
    }
  };

  // Triggered by long-press/right-click on the canvas to nudge user to generate
  const handleGenerateNudgeRequested = useCallback(() => {
    setNudgeVisualActive(true);
    nudgeVisualActiveRef.current = true;
    setNudgeMessageVisible(true);
    nudgeMessageVisibleRef.current = true;
    // Cancel any running dismissal and stop countdown immediately
    if (nudgeDismissTimeoutRef.current) {
      clearTimeout(nudgeDismissTimeoutRef.current);
      nudgeDismissTimeoutRef.current = null;
    }
    // No countdown while holding; dismissal starts on release
    // Start a brief suppression window to avoid frame action menu
    frameActionSuppressUntilRef.current = Date.now() + 800; // ms
  }, []);

  useEffect(() => () => {
    if (nudgeDismissTimeoutRef.current) clearTimeout(nudgeDismissTimeoutRef.current);
  }, []);

  // Close the nudge on global pointer release/blur to avoid feeling stuck.
  // Mount-once listeners to avoid missing events during state changes.
  useEffect(() => {
    const startDismissTimer = () => {
      if (!nudgeMessageVisibleRef.current) return;
      // Replace any existing timeout
      if (nudgeDismissTimeoutRef.current) {
        clearTimeout(nudgeDismissTimeoutRef.current);
        nudgeDismissTimeoutRef.current = null;
      }
      // Kick off simple dismissal countdown
      nudgeDismissTimeoutRef.current = setTimeout(() => {
        setNudgeMessageVisible(false);
        nudgeMessageVisibleRef.current = false;
        nudgeDismissTimeoutRef.current = null;
      }, 2000);
    };

    const onVisibility = () => {
      // If tab is hidden, close immediately to avoid lingering UI
      if (document.hidden) {
        if (nudgeDismissTimeoutRef.current) { clearTimeout(nudgeDismissTimeoutRef.current); nudgeDismissTimeoutRef.current = null; }
        setNudgeMessageVisible(false);
        nudgeMessageVisibleRef.current = false;
        setNudgeVisualActive(false);
        nudgeVisualActiveRef.current = false;
      }
    };

    const onEndLike = () => {
      setNudgeVisualActive(false);
      nudgeVisualActiveRef.current = false;
      startDismissTimer();
    };

    const onScroll = () => {
      if (nudgeMessageVisibleRef.current || nudgeVisualActiveRef.current) onEndLike();
    };

    window.addEventListener('pointerup', onEndLike, { passive: true });
    window.addEventListener('mouseup', onEndLike, { passive: true });
    window.addEventListener('touchend', onEndLike, { passive: true });
    window.addEventListener('touchcancel', onEndLike, { passive: true });
    window.addEventListener('pointercancel', onEndLike, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('blur', onVisibility, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pointerup', onEndLike);
      window.removeEventListener('mouseup', onEndLike);
      window.removeEventListener('touchend', onEndLike);
      window.removeEventListener('touchcancel', onEndLike);
      window.removeEventListener('pointercancel', onEndLike);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('blur', onVisibility);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Keep refs in sync with state
  useEffect(() => { nudgeMessageVisibleRef.current = nudgeMessageVisible; }, [nudgeMessageVisible]);
  useEffect(() => { nudgeVisualActiveRef.current = nudgeVisualActive; }, [nudgeVisualActive]);


  // Props for settings step (selectedImages length might be useful for UI feedback)
  const settingsStepProps = {
    selectedImageCount: selectedImages.length, // Pass count instead of full array
    selectedTemplate,
    setSelectedTemplate,
    selectedAspectRatio, // Pass the original aspect ratio ID, not the converted value
    setSelectedAspectRatio,
    panelCount,
    setPanelCount,
    // Needed for safe panel count reduction that may hide an image
    panelImageMapping,
    removeImage,
    aspectRatioPresets,
    layoutTemplates,
    borderThickness,
    setBorderThickness,
    borderColor,
    setBorderColor,
    borderThicknessOptions,
  };

  // Handler for when collage is generated - show inline result
  const handleCollageGenerated = () => {
    setShowResultDialog(true);
  };

  // Handler for starting from scratch without images
  const handleStartFromScratch = async () => {
    debugLog('Starting from scratch - user chose to continue without images');
    // Add a placeholder to trigger showing the collage interface
    await addMultipleImages(['__START_FROM_SCRATCH__']);
    // Scroll to top to show the collage interface
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Props for images step (pass the correct state and actions)
  const imagesStepProps = {
          selectedImages, // Pass the array of objects [{ originalUrl, displayUrl, subtitle?, subtitleShowing?, metadata? }, ...]
    panelImageMapping,
    panelTransforms,
    panelTexts,
    lastUsedTextSettings,
    updatePanelImageMapping,
    updatePanelTransform,
    updatePanelText,
    panelCount,
    selectedTemplate,
    selectedAspectRatio, // Pass the original aspect ratio ID, not the converted value
    borderThickness: borderThicknessValue, // Pass the numeric value
    borderColor,
    borderThicknessOptions,
    // Actions
    addImage,
    addMultipleImages,
    removeImage,
    updateImage,
    replaceImage,
    clearImages,
    // Custom handler for showing inline result
    onCollageGenerated: handleCollageGenerated,
    // BulkUploadSection state (kept for compatibility, though section is hidden when images present)
    bulkUploadSectionOpen: true, // Always true since we don't manage collapse state anymore
    onBulkUploadSectionToggle: () => {}, // No-op since BulkUploadSection is hidden when images are present
    onStartFromScratch: handleStartFromScratch, // Handler for starting without images
    isCreatingCollage, // Pass the collage generation state to prevent placeholder text during export
    libraryRefreshTrigger, // For refreshing library when new images are auto-saved
    onCaptionEditorVisibleChange: (open) => {
      setIsCaptionEditorOpen(open);
      captionOpenPrevRef.current = open;
    },
    onGenerateNudgeRequested: handleGenerateNudgeRequested,
    isFrameActionSuppressed: () => Date.now() < frameActionSuppressUntilRef.current,
    // Render tracking for timely thumbnail capture
    renderSig: currentSig,
    onPreviewRendered: (sig) => { lastRenderedSigRef.current = sig; setRenderBump(b => b + 1); },
    onPreviewMetaChange: ({ canvasWidth, canvasHeight, customLayout, panelDimensions }) => {
      setPreviewCanvasWidth(canvasWidth || null);
      setPreviewCanvasHeight(canvasHeight || null);
      setLivePanelDimensions(panelDimensions || null);
      setLiveCustomLayout((prev) => {
        if (!customLayout) {
          return prev ? null : prev;
        }
        return customLayout;
      });
      maybeNormalizeHydratedTransforms({ canvasWidth: canvasWidth || null, canvasHeight: canvasHeight || null, panelDimensions: panelDimensions || null });
    },
    // Editing session tracking to gate thumbnail updates
    onEditingSessionChange: handleEditingSessionChange,
    // Provide persisted custom grid to preview on load
    customLayout,
    customLayoutKey: useMemo(() => `${selectedTemplate?.id || 'none'}|${panelCount}|${selectedAspectRatio}`, [selectedTemplate?.id, panelCount, selectedAspectRatio]),
    isHydratingProject,
    allowHydrationTransformCarry,
    canvasResetKey: previewResetKey,
  };

  // Log mapping changes for debugging
  useEffect(() => {
    if (DEBUG_MODE) {
      debugLog("CollagePage state update:", {
        imageCount: selectedImages.length,
        mappingKeys: Object.keys(panelImageMapping),
        transformKeys: Object.keys(panelTransforms),
        borderThickness,
        borderThicknessValue,
        borderColor,
        aspectRatio: selectedAspectRatio,
      });
    }
  }, [panelImageMapping, selectedImages, borderThickness, borderThicknessValue, borderColor, selectedAspectRatio, panelTransforms]);

  return (
    <>
      <Helmet><title>Collage Tool - Editor - memeSRC</title></Helmet>

      {!authorized ? (
        <UpgradeMessage openSubscriptionDialog={openSubscriptionDialog} previewImage="/assets/images/products/collage-tool.png" />
      ) : (
        <Box component="main" sx={{
          flexGrow: 1,
          pb: !showResultDialog && hasImages ? 8 : (isMobile ? 2 : 4),
          width: '100%',
          overflowX: 'hidden',
          overflowY: 'visible', // Allow vertical overflow for caption editor
          minHeight: '100vh',
          bgcolor: 'background.default'
        }}>
          <Container 
            maxWidth="xl" 
            sx={{ 
              mb: 15,
              pt: isMobile ? 1 : 1.5,
              px: isMobile ? 1 : 2,
              width: '100%',
              overflow: 'visible' // Allow caption editor to overflow container bounds
            }}
            disableGutters={isMobile}
          >
            {/* Editor UI */}
            <>
            {/* Page Header */}
            <Box sx={{ mb: isMobile ? 0.5 : 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="h3" sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  fontWeight: '700', 
                  mb: isMobile ? 0.25 : 0.75,
                  pl: isMobile ? 0.5 : 0,
                  ml: isMobile ? 0 : -0.5,
                  color: '#fff',
                  fontSize: isMobile ? '2.2rem' : '2.5rem',
                  textShadow: '0px 2px 4px rgba(0,0,0,0.15)'
                }}>
                  <Dashboard sx={{ mr: 2, color: 'inherit', fontSize: 40 }} /> 
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                    Collage
                    {!showEarlyAccess && (
                      <Chip 
                        label="BETA" 
                        size="small" 
                        onClick={() => setShowEarlyAccess(true)}
                        sx={{ 
                          backgroundColor: '#ff9800',
                          color: '#000',
                          fontWeight: 'bold',
                          fontSize: '0.65rem',
                          height: 20,
                          ml: 1,
                          cursor: 'pointer'
                        }} 
                      />
                    )}
                  </Box>
                </Typography>
                {saveIndicator && (
                  <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 32 }}>
                    {saveIndicator}
                  </Box>
                )}
              </Box>
            </Box>

            <Collapse in={!!remoteUpdateWarning} unmountOnExit>
              <Alert
                severity="warning"
                sx={{
                  mb: 2,
                  border: '1px solid rgba(255, 193, 7, 0.4)',
                  background: 'rgba(255, 193, 7, 0.12)',
                }}
                action={(
                  <Stack direction={isMobile ? 'column' : 'row'} spacing={1} sx={{ minWidth: isMobile ? 'auto' : 240 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="inherit"
                      onClick={handleRemoteDismiss}
                    >
                      Keep Working & Overwrite
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      color="warning"
                      onClick={handleRemoteReload}
                      disabled={isHydratingProject}
                    >
                      Reload & Lose Local Changes
                    </Button>
                  </Stack>
                )}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Project updated elsewhere at {remoteUpdateTimestampLabel}.
                </Typography>
                <Typography variant="body2">
                  Reload to pull in those edits, or keep working to overwrite them (last save wins).
                </Typography>
              </Alert>
            </Collapse>

            <Collapse in={showEarlyAccess} unmountOnExit>
              <EarlyAccessFeedback 
                defaultExpanded
                onCollapsed={() => setShowEarlyAccess(false)}
              />
            </Collapse>

            <Box sx={{ position: 'relative' }}>
              <CollageLayout
                settingsStepProps={settingsStepProps}
                imagesStepProps={imagesStepProps}
                finalImage={finalImage}
                setFinalImage={setFinalImage}
                isMobile={isMobile}
                onBackToEdit={handleBackToEdit}
                settingsOpen={settingsOpen}
                setSettingsOpen={setSettingsOpen}
                settingsRef={settingsRef}
                onViewChange={(v) => setCurrentView(v)}
                onLibrarySelectionChange={(info) => setLibrarySelection(info || { count: 0, minSelected: 2 })}
                onLibraryActionsReady={(actions) => { libraryActionsRef.current = actions || {}; }}
                // Mobile controls bar actions
                onBack={hasProjectsAccess ? handleBackToProjects : undefined}
                onReset={!hasProjectsAccess ? openResetDialog : undefined}
                onGenerate={handleFloatingButtonClick}
                canGenerate={allPanelsHaveImages}
                isGenerating={isCreatingCollage}
              />
              {isHydratingProject && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    bgcolor: 'rgba(0,0,0,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 5,
                    pointerEvents: 'auto',
                    backdropFilter: 'blur(1px)',
                  }}
                >
                  <Stack spacing={1} alignItems="center">
                    <CircularProgress size={26} thickness={4} sx={{ color: '#fff' }} />
                    <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600 }}>
                      Loading project…
                    </Typography>
                  </Stack>
                </Box>
              )}
            </Box>

            {/* Save snackbar */}
            <Snackbar 
              open={snackbar.open}
              autoHideDuration={2000}
              onClose={() => setSnackbar(s => ({ ...s, open: false }))}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
              <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
                {snackbar.message}
              </Alert>
            </Snackbar>

            {/* Bottom Action Bar (admins always see; no animation) */}
            {(!showResultDialog && !isCaptionEditorOpen) && (
                <Box
                  sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1600,
                    bgcolor: 'background.paper',
                    borderTop: 1,
                    borderColor: 'divider',
                    p: isMobile ? 1.5 : 2,
                    pb: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
                    boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
                    backdropFilter: 'blur(20px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                ref={bottomBarRef}
                >
                  <Stack direction="row" spacing={1} sx={{ width: '100%', maxWidth: 960, alignItems: 'center' }} ref={bottomBarContentRef}>
                    {hasLibraryAccess ? (
                      <>
                        {currentView === 'library' && (
                          <>
                            {hasProjectsAccess && (
                              <Button
                                variant="contained"
                                onClick={handleLibraryCancel}
                                disabled={isCreatingCollage}
                                sx={{
                                  flex: 1,
                                  minHeight: 48,
                                  fontWeight: 700,
                                  textTransform: 'none',
                                  background: 'linear-gradient(45deg, #1f1f1f 30%, #2a2a2a 90%)',
                                  border: '1px solid #3a3a3a',
                                  boxShadow: '0 6px 16px rgba(0, 0, 0, 0.35)',
                                  color: '#e0e0e0',
                                  '&:hover': { background: 'linear-gradient(45deg, #262626 30%, #333333 90%)' }
                                }}
                                startIcon={<Close sx={{ color: '#e0e0e0' }} />}
                              >
                                Cancel
                              </Button>
                            )}

                            <Button
                              variant="contained"
                              onClick={() => libraryActionsRef.current?.primary?.()}
                              disabled={isCreatingCollage || (librarySelection?.count || 0) < (librarySelection?.minSelected || 1)}
                              sx={{
                                flex: 1,
                                minHeight: 48,
                                fontWeight: 700,
                                textTransform: 'none',
                                background: 'linear-gradient(45deg, #6b42a1 0%, #7b4cb8 50%, #8b5cc7 100%)',
                                border: '1px solid #8b5cc7',
                                boxShadow: '0 6px 20px rgba(139, 92, 199, 0.4)',
                                color: '#fff',
                                '&:hover': { background: 'linear-gradient(45deg, #5e3992 0%, #6b42a1 50%, #7b4cb8 100%)' }
                              }}
                              startIcon={<ArrowForward />}
                            >
                              Continue
                            </Button>
                          </>
                        )}

                        {currentView === 'editor' && (
                          <>
                            {hasProjectsAccess && (
                              <Collapse in={!nudgeVisualActive} orientation="horizontal">
                                <Button
                                  variant="contained"
                                  onClick={handleBackToProjects}
                                  disabled={isCreatingCollage}
                                  startIcon={!isMobile ? <ArrowBack sx={{ color: '#e0e0e0' }} /> : undefined}
                                  aria-label="Back to memes"
                                  sx={{
                                    minHeight: 48,
                                    minWidth: isMobile ? 48 : undefined,
                                    px: isMobile ? 1.25 : 2,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    background: 'linear-gradient(45deg, #1f1f1f 30%, #2a2a2a 90%)',
                                    border: '1px solid #3a3a3a',
                                    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.35)',
                                    color: '#e0e0e0',
                                    '&:hover': { background: 'linear-gradient(45deg, #262626 30%, #333333 90%)' }
                                  }}
                                >
                                  {isMobile ? <ArrowBack sx={{ color: '#e0e0e0' }} /> : 'Back to Memes'}
                                </Button>
                              </Collapse>
                            )}

                            {!hasProjectsAccess && (
                              <Collapse in={!nudgeVisualActive} orientation="horizontal">
                                <Button
                                  variant="contained"
                                  onClick={openResetDialog}
                                  disabled={isCreatingCollage}
                                  startIcon={!isMobile ? <DeleteForever sx={{ color: (theme) => theme.palette.error.main }} /> : undefined}
                                  aria-label="Start over"
                                  sx={{
                                    minHeight: 48,
                                    minWidth: isMobile ? 48 : undefined,
                                    px: isMobile ? 1.25 : 2,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    background: 'linear-gradient(45deg, #1f1f1f 30%, #2a2a2a 90%)',
                                    border: '1px solid #3a3a3a',
                                    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.35)',
                                    color: '#e0e0e0',
                                    '&:hover': { background: 'linear-gradient(45deg, #262626 30%, #333333 90%)' }
                                  }}
                                >
                                  {isMobile ? <DeleteForever sx={{ color: (theme) => theme.palette.error.main }} /> : 'Start Over'}
                                </Button>
                              </Collapse>
                            )}

                            <Button
                              variant="contained"
                              onClick={handleFloatingButtonClick}
                              disabled={isCreatingCollage || !allPanelsHaveImages}
                              size="large"
                              startIcon={<Save />}
                              sx={{
                                flex: 1,
                                minHeight: 48,
                                fontWeight: 700,
                                textTransform: 'none',
                                background: 'linear-gradient(45deg, #6b42a1 0%, #7b4cb8 50%, #8b5cc7 100%)',
                                border: '1px solid #8b5cc7',
                                boxShadow: nudgeVisualActive ? '0 10px 28px rgba(139, 92, 199, 0.6)' : '0 6px 20px rgba(139, 92, 199, 0.4)',
                                transform: nudgeVisualActive ? 'scale(1.015)' : 'none',
                                transition: 'transform 180ms ease, box-shadow 220ms ease',
                                color: '#fff',
                                '&:hover': { background: 'linear-gradient(45deg, #5e3992 0%, #6b42a1 50%, #7b4cb8 100%)' }
                              }}
                              aria-label="Create and save meme"
                              ref={generateBtnRef}
                            >
                              {isCreatingCollage ? 'Generating Meme...' : 'Generate Meme'}
                            </Button>

                            <Collapse in={!nudgeVisualActive} orientation="horizontal">
                              <Button
                                variant="contained"
                                onClick={handleToggleSettings}
                                disabled={isCreatingCollage}
                                startIcon={!isMobile ? <Settings sx={{ color: '#ffffff' }} /> : undefined}
                                aria-label={settingsOpen ? 'Close settings' : 'Open settings'}
                                sx={{
                                  minHeight: 48,
                                  minWidth: isMobile ? 48 : undefined,
                                  px: isMobile ? 1.25 : 2,
                                  fontWeight: 700,
                                  textTransform: 'none',
                                  background: settingsOpen ? 'linear-gradient(45deg, #2a2a2a 30%, #333333 90%)' : 'linear-gradient(45deg, #1f1f1f 30%, #2a2a2a 90%)',
                                  border: settingsOpen ? '1px solid #8b5cc7' : '1px solid #3a3a3a',
                                  boxShadow: settingsOpen ? '0 0 0 2px rgba(139, 92, 199, 0.3), 0 6px 16px rgba(0, 0, 0, 0.35)' : '0 6px 16px rgba(0, 0, 0, 0.35)',
                                  color: '#e0e0e0',
                                  '&:hover': { background: settingsOpen ? 'linear-gradient(45deg, #343434 30%, #3b3b3b 90%)' : 'linear-gradient(45deg, #262626 30%, #333333 90%)' }
                                }}
                              >
                                {isMobile ? <Settings sx={{ color: '#ffffff' }} /> : (settingsOpen ? 'Close' : 'Settings')}
                              </Button>
                            </Collapse>
                          </>
                        )}
                      </>
                    ) : (
                      // Non-admin: only show in editor when images exist
                      hasImages && (
                        <>
                          <Collapse in={!nudgeVisualActive} orientation="horizontal">
                            <Button
                              variant="contained"
                              onClick={openResetDialog}
                              disabled={isCreatingCollage}
                              startIcon={!isMobile ? <DeleteForever sx={{ color: (theme) => theme.palette.error.main }} /> : undefined}
                              aria-label="Start over"
                              sx={{
                                minHeight: 48,
                                minWidth: isMobile ? 48 : undefined,
                                px: isMobile ? 1.25 : 2,
                                fontWeight: 700,
                                textTransform: 'none',
                                background: 'linear-gradient(45deg, #1f1f1f 30%, #2a2a2a 90%)',
                                border: '1px solid #3a3a3a',
                                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.35)',
                                color: '#e0e0e0',
                                '&:hover': { background: 'linear-gradient(45deg, #262626 30%, #333333 90%)' }
                              }}
                            >
                              {isMobile ? <DeleteForever sx={{ color: (theme) => theme.palette.error.main }} /> : 'Start Over'}
                            </Button>
                          </Collapse>

                          <Button
                            variant="contained"
                            onClick={handleFloatingButtonClick}
                            disabled={isCreatingCollage || !allPanelsHaveImages}
                            size="large"
                            startIcon={<Save />}
                            sx={{
                              flex: 1,
                              minHeight: 48,
                              fontWeight: 700,
                              textTransform: 'none',
                              background: 'linear-gradient(45deg, #6b42a1 0%, #7b4cb8 50%, #8b5cc7 100%)',
                              border: '1px solid #8b5cc7',
                              boxShadow: nudgeVisualActive ? '0 10px 28px rgba(139, 92, 199, 0.6)' : '0 6px 20px rgba(139, 92, 199, 0.4)',
                              transform: nudgeVisualActive ? 'scale(1.015)' : 'none',
                              transition: 'transform 180ms ease, box-shadow 220ms ease',
                              color: '#fff',
                              '&:hover': { background: 'linear-gradient(45deg, #5e3992 0%, #6b42a1 50%, #7b4cb8 100%)' }
                            }}
                            aria-label="Create and save meme"
                            ref={generateBtnRef}
                          >
                            {isCreatingCollage ? 'Generating Meme...' : 'Generate Meme'}
                          </Button>

                          <Collapse in={!nudgeVisualActive} orientation="horizontal">
                            <Button
                              variant="contained"
                              onClick={handleToggleSettings}
                              disabled={isCreatingCollage}
                              startIcon={!isMobile ? <Settings sx={{ color: '#ffffff' }} /> : undefined}
                              aria-label={settingsOpen ? 'Close settings' : 'Open settings'}
                              sx={{
                                minHeight: 48,
                                minWidth: isMobile ? 48 : undefined,
                                px: isMobile ? 1.25 : 2,
                                fontWeight: 700,
                                textTransform: 'none',
                                background: settingsOpen ? 'linear-gradient(45deg, #2a2a2a 30%, #333333 90%)' : 'linear-gradient(45deg, #1f1f1f 30%, #2a2a2a 90%)',
                                border: settingsOpen ? '1px solid #8b5cc7' : '1px solid #3a3a3a',
                                boxShadow: settingsOpen ? '0 0 0 2px rgba(139, 92, 199, 0.3), 0 6px 16px rgba(0, 0, 0, 0.35)' : '0 6px 16px rgba(0, 0, 0, 0.35)',
                                color: '#e0e0e0',
                                '&:hover': { background: settingsOpen ? 'linear-gradient(45deg, #343434 30%, #3b3b3b 90%)' : 'linear-gradient(45deg, #262626 30%, #333333 90%)' }
                              }}
                            >
                              {isMobile ? <Settings sx={{ color: '#ffffff' }} /> : (settingsOpen ? 'Close' : 'Settings')}
                            </Button>
                          </Collapse>
                        </>
                      )
                    )}
                  </Stack>
                </Box>
            )}
            {/* Render the nudge message as a fixed sibling behind the bar */}
            <Slide in={nudgeMessageVisible} direction="up" mountOnEnter unmountOnExit>
              <Box
                sx={{
                  position: 'fixed',
                  left: bottomBarCenterX != null ? `${bottomBarCenterX}px` : '50%',
                  bottom: (bottomBarHeight || 0) + 8,
                  zIndex: 1500, // below bar's 1600 so it appears behind
                  pointerEvents: 'none',
                }}
              >
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    position: 'relative',
                    transform: 'translateX(-50%)',
                    bgcolor: 'rgba(25, 25, 25, 0.98)',
                    color: '#fff',
                    px: 2,
                    py: 1.25,
                    borderRadius: 2,
                    border: '1px solid rgba(139, 92, 199, 0.5)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
                    maxWidth: 320,
                    width: 'max-content',
                    textAlign: 'center',
                    fontWeight: 600,
                    letterSpacing: 0.2,
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                    <span>You need to generate before saving</span>
                  </Box>
                </Box>
              </Box>
            </Slide>
              </>
          </Container>

          {/* Collage Result Dialog */}
          <CollageResultDialog
            open={showResultDialog}
            onClose={() => setShowResultDialog(false)}
            finalImage={finalImage}
          />

          {/* Confirm Reset Dialog (non-admin) */}
          <Dialog
            open={resetDialogOpen}
            onClose={closeResetDialog}
            aria-labelledby="confirm-reset-title"
            maxWidth="xs"
            fullWidth
            BackdropProps={{
              sx: {
                backgroundColor: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(2px)'
              }
            }}
            PaperProps={{
              elevation: 16,
              sx: theme => ({
                bgcolor: theme.palette.mode === 'dark' ? '#1f2126' : '#ffffff',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 12px 32px rgba(0,0,0,0.7)'
                  : '0 12px 32px rgba(0,0,0,0.25)'
              })
            }}
          >
            <DialogTitle id="confirm-reset-title" sx={{ fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider', px: 3, py: 2, letterSpacing: 0, lineHeight: 1.3 }}>
              Start over?
            </DialogTitle>
            <DialogContent sx={{ color: 'text.primary', '&&': { px: 3, pt: 2, pb: 2 } }}>
              <Typography variant="body1" sx={{ m: 0, lineHeight: 1.5 }}>
                This will discard your current collage and reset the editor.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', px: 3, py: 1.5, gap: 1 }}>
              <Button onClick={closeResetDialog}>Cancel</Button>
              <Button onClick={confirmReset} color="error" variant="contained" autoFocus>
                Start Over
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </>
  );
}

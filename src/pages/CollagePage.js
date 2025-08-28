import { useContext, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery, Box, Container, Typography, Button, Slide, Stack, Collapse, Chip, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from "@mui/material";
import { Dashboard, Save, Settings, ArrowBack, DeleteForever, ArrowForward, Close } from "@mui/icons-material";
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { UserContext } from "../UserContext";
import { useSubscribeDialog } from "../contexts/useSubscribeDialog";
import { useCollage } from "../contexts/CollageContext";
import { aspectRatioPresets, layoutTemplates, getLayoutsForPanelCount } from "../components/collage/config/CollageConfig";
import UpgradeMessage from "../components/collage/components/UpgradeMessage";
import { CollageLayout } from "../components/collage/components/CollageLayoutComponents";
import { useCollageState } from "../components/collage/hooks/useCollageState";
import { createProject, upsertProject, buildSnapshotFromState, getProject as getProjectRecord } from "../components/collage/utils/projects";
import { renderThumbnailFromSnapshot } from "../components/collage/utils/renderThumbnailFromSnapshot";
import { get as getFromLibrary } from "../utils/library/storage";
import EarlyAccessFeedback from "../components/collage/components/EarlyAccessFeedback";
import CollageResultDialog from "../components/collage/components/CollageResultDialog";

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

const DEBUG_MODE = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (() => {
  try { return localStorage.getItem('meme-src-collage-debug') === '1'; } catch { return false; }
})();
const debugLog = (...args) => { if (DEBUG_MODE) console.log(...args); };

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
  const authorized = (user?.userDetails?.magicSubscription === "true" || isAdmin);
  // Library access flag (admins only for now)
  const hasLibraryAccess = isAdmin;

  // Autosave UI state
  const lastSavedSigRef = useRef(null);
  const [saveStatus, setSaveStatus] = useState({ state: 'idle', time: null }); // states: idle | saving | saved
  const [isDirty, setIsDirty] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
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
  // Persisted custom grid from border dragging
  const [customLayout, setCustomLayout] = useState(null);
  
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
    updatePanelImageMapping,
    updatePanelTransform,
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

  // If user has access and lands on /collage, redirect to /projects as the starting point
  useEffect(() => {
    if (!hasLibraryAccess) return;
    if (location.pathname === '/collage') {
      navigate('/projects', { replace: true });
    }
  }, [hasLibraryAccess, location.pathname, navigate]);

  // (Removed redundant no-op useEffect for project route; actual loader lives below.)

  // Handle new project route (/projects/new): start with clean state
  useEffect(() => {
    if (!hasLibraryAccess) return;
    if (location.pathname === '/projects/new') {
      setActiveProjectId(null);
      try {
        clearImages();
      } catch (_) { /* ignore */ }
      setCustomLayout(null);
    }
  }, [hasLibraryAccess, location.pathname]);

  // Build current snapshot/signature once per state change
  const [renderBump, setRenderBump] = useState(0);
  // Live preview meta from CanvasCollagePreview (avoids DOM queries)
  const [previewCanvasWidth, setPreviewCanvasWidth] = useState(null);
  const [previewCanvasHeight, setPreviewCanvasHeight] = useState(null);
  const [liveCustomLayout, setLiveCustomLayout] = useState(null);

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
  }), [selectedImages, panelImageMapping, panelTransforms, panelTexts, selectedTemplate, selectedAspectRatio, panelCount, borderThickness, borderColor, renderBump, previewCanvasWidth, previewCanvasHeight, liveCustomLayout]);

  const currentSig = useMemo(() => computeSnapshotSignature(currentSnapshot), [currentSnapshot]);
  const currentSnapshotRef = useRef(currentSnapshot);
  const currentSigRef = useRef(currentSig);
  useEffect(() => { currentSnapshotRef.current = currentSnapshot; }, [currentSnapshot]);
  useEffect(() => { currentSigRef.current = currentSig; }, [currentSig]);

  // Track whether current state differs from last saved snapshot (for UI enablement)
  useEffect(() => {
    if (!activeProjectId) return;
    setIsDirty(currentSig !== lastSavedSigRef.current);
  }, [activeProjectId, currentSig]);

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
    const record = getProjectRecord(projectId);
    if (!record || !record.state) return;
    const snap = record.state;
    loadingProjectRef.current = true;

    // Clear current state
    clearImages();

    // Apply layout-level settings first
    setSelectedAspectRatio(snap.selectedAspectRatio || 'square');
    setPanelCount(snap.panelCount || 2);
    try {
      const templates = getLayoutsForPanelCount(snap.panelCount || 2, snap.selectedAspectRatio || 'square');
      const tpl = templates.find(t => t.id === snap.selectedTemplateId) || templates[0] || null;
      if (tpl) setSelectedTemplate(tpl);
    } catch (_) { /* ignore */ }

    if (snap.borderThickness !== undefined) setBorderThickness(snap.borderThickness);
    if (snap.borderColor !== undefined) setBorderColor(snap.borderColor);
    // Restore custom layout grid if present
    setCustomLayout(snap.customLayout || null);

    // Resolve images via library or stored URLs
    if (Array.isArray(snap.images) && snap.images.length > 0) {
      const resolved = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const ref of snap.images) {
        if (ref?.libraryKey) {
          try {
            // Fetch from library and convert to data URL for canvas safety
            // eslint-disable-next-line no-await-in-loop
            const blob = await getFromLibrary(ref.libraryKey);
            // eslint-disable-next-line no-await-in-loop
            const dataUrl = await blobToDataUrl(blob);
            resolved.push({ originalUrl: dataUrl, displayUrl: dataUrl, metadata: { libraryKey: ref.libraryKey }, subtitle: ref.subtitle || '', subtitleShowing: !!ref.subtitleShowing });
          } catch (_) {
            resolved.push({ originalUrl: ref.url || '', displayUrl: ref.url || '' });
          }
        } else if (ref?.url) {
          resolved.push({ originalUrl: ref.url, displayUrl: ref.url, subtitle: ref.subtitle || '', subtitleShowing: !!ref.subtitleShowing });
        }
      }
      if (resolved.length) {
        await addMultipleImages(resolved);
      }
    }

    if (snap.panelImageMapping) updatePanelImageMapping(snap.panelImageMapping);

    if (snap.panelTransforms && typeof snap.panelTransforms === 'object') {
      Object.entries(snap.panelTransforms).forEach(([panelId, transform]) => {
        if (transform) updatePanelTransform(panelId, transform);
      });
    }

    if (snap.panelTexts && typeof snap.panelTexts === 'object') {
      Object.entries(snap.panelTexts).forEach(([panelId, textConfig]) => {
        if (textConfig) updatePanelText(panelId, textConfig, { replace: true });
      });
    }

    setActiveProjectId(projectId);
    // ensure editor mode when loading an existing project
    // Mark current snapshot as saved for status UI
    lastSavedSigRef.current = computeSnapshotSignature(snap);
    setSaveStatus({ state: 'saved', time: Date.now() });
  }, [addMultipleImages, clearImages, setBorderColor, setBorderThickness, setPanelCount, setSelectedAspectRatio, setSelectedTemplate, updatePanelImageMapping, updatePanelText, updatePanelTransform]);

  // Ensure we always release the loading flag, even on errors, and only
  // after state has settled so custom layouts are not cleared prematurely.
  // Wrap the original function in a safe caller.
  const safeLoadProjectById = useCallback(async (projectId) => {
    try {
      await loadProjectById(projectId);
    } finally {
      const release = () => { loadingProjectRef.current = false; };
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(release);
        });
      } else {
        setTimeout(release, 50);
      }
    }
  }, [loadProjectById]);

  // Keep a stable ref to the loader to avoid effect re-runs from changing callback identities
  const loadProjectByIdRef = useRef(safeLoadProjectById);
  useEffect(() => { loadProjectByIdRef.current = safeLoadProjectById; }, [safeLoadProjectById]);

  // Centralized save used by autosave-on-exit and manual save
  const saveProjectNow = useCallback(async ({ showToast = false } = {}) => {
    if (!activeProjectId) return;
    const state = currentSnapshotRef.current;
    const sig = currentSigRef.current;
    if (sig === lastSavedSigRef.current) return;
    try {
      setSaveStatus({ state: 'saving', time: null });
      upsertProject(activeProjectId, { state });
      lastSavedSigRef.current = sig;
      // Generate thumbnail immediately from saved snapshot
      const dataUrl = await renderThumbnailFromSnapshot(state, { maxDim: 512 });
      if (dataUrl) {
        upsertProject(activeProjectId, { thumbnail: dataUrl, thumbnailKey: null, thumbnailSignature: sig, thumbnailUpdatedAt: new Date().toISOString() });
      }
      // notify ProjectsPage via storage; no local list to update
      setSaveStatus({ state: 'saved', time: Date.now() });
      if (showToast) setSnackbar({ open: true, message: 'Saved', severity: 'success' });
    } catch (e) {
      if (DEBUG_MODE) console.warn('Autosave failed:', e);
      setTimeout(() => setSaveStatus({ state: 'idle', time: null }), 800);
      if (showToast) setSnackbar({ open: true, message: 'Save failed', severity: 'error' });
    }
  }, [activeProjectId]);


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
        saveProjectNow();
      }, 60);
    }
  }, [saveProjectNow]);

  // Collage-level autosave triggers
  // 1) Save on border color/thickness changes once rendered settles
  useEffect(() => {
    let t = null;
    if (activeProjectId) {
      // Only attempt save if we have rendered the new state at least once
      const hasRendered = lastRenderedSigRef.current === currentSigRef.current;
      if (hasRendered) {
        // Defer slightly to batch rapid UI updates
        t = setTimeout(() => { saveProjectNow(); }, 120);
      }
    }
    return () => { if (t) clearTimeout(t); };
  }, [activeProjectId, borderColor, borderThickness, renderBump, saveProjectNow]);

  // 2) Save on layout changes: template, aspect ratio, or panel count
  useEffect(() => {
    let t = null;
    if (activeProjectId) {
      const hasRendered = lastRenderedSigRef.current === currentSigRef.current;
      if (hasRendered) {
        t = setTimeout(() => { saveProjectNow(); }, 120);
      }
    }
    return () => { if (t) clearTimeout(t); };
  }, [activeProjectId, selectedTemplate?.id, selectedAspectRatio, panelCount, renderBump, saveProjectNow]);

  // 2.5) Save on image content changes (e.g., replace/crop) once preview has rendered
  // This complements (3) which only handles the very first appearance of any images.
  useEffect(() => {
    let t = null;
    if (activeProjectId) {
      const hasRendered = lastRenderedSigRef.current === currentSigRef.current;
      if (hasRendered) {
        t = setTimeout(() => { saveProjectNow(); }, 120);
      }
    }
    return () => { if (t) clearTimeout(t); };
  }, [activeProjectId, selectedImages, renderBump, saveProjectNow]);

  // 3) Initial save when images first appear and preview has rendered
  const didInitialSaveRef = useRef(false);
  useEffect(() => {
    if (!activeProjectId) return;
    if (didInitialSaveRef.current) return;
    const hasAnyImage = (selectedImages?.length || 0) > 0;
    const hasRendered = lastRenderedSigRef.current === currentSigRef.current;
    if (hasAnyImage && hasRendered) {
      didInitialSaveRef.current = true;
      saveProjectNow();
    }
  }, [activeProjectId, selectedImages?.length, saveProjectNow]);

  // Handle navigation-driven project editing (/projects/:projectId) — placed after loadProjectById is defined
  // Use a ref-backed loader to avoid re-running due to changing callback identity
  useEffect(() => {
    let cancelled = false;
    if (hasLibraryAccess && projectId) {
      (async () => {
        try {
          await loadProjectByIdRef.current(projectId);
        } catch (_) {
          // ignore
        }
      })();
    }
    return () => { cancelled = true; };
  }, [hasLibraryAccess, projectId]);

  // 4) Create a project only after images are present AND preview has rendered
  //    This avoids leaving blank projects when a user abandons during selection.
  useEffect(() => {
    if (!hasLibraryAccess) return;
    // Do not auto-create while actively loading an existing project
    if (loadingProjectRef.current) return;
    if (activeProjectId) return;
    const hasAnyImage = (selectedImages?.length || 0) > 0;
    if (!hasAnyImage) return;
    const hasRendered = lastRenderedSigRef.current === currentSigRef.current;
    if (!hasRendered) return;
    const p = createProject({ name: 'Untitled Meme' });
    setActiveProjectId(p.id);
    // Reset initial-save gate so we capture the first render under this new project
    didInitialSaveRef.current = false;
  }, [hasLibraryAccess, activeProjectId, selectedImages?.length, currentSig]);

  // When the user changes layout controls, drop any existing custom grid override
  useEffect(() => {
    if (loadingProjectRef.current) return;
    setCustomLayout(null);
  }, [selectedTemplate?.id, selectedAspectRatio, panelCount]);

  // New/open/delete handlers removed along with inline projects view

  // Manual Save handler (forces immediate thumbnail generation)
  const handleManualSave = useCallback(async () => {
    saveProjectNow({ showToast: true });
  }, [saveProjectNow]);

  // Save before switching to the project picker so recent changes (e.g., replace image) persist
  const handleBackToProjects = useCallback(async () => {
    try {
      await saveProjectNow();
    } catch (_) { /* best-effort save */ }
    if (hasLibraryAccess) navigate('/projects');
  }, [saveProjectNow, hasLibraryAccess, navigate]);

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
        if (isDirty && saveStatus.state !== 'saving') {
          handleManualSave();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleManualSave, isDirty, saveStatus.state]);

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
    onPreviewMetaChange: ({ canvasWidth, canvasHeight, customLayout }) => {
      setPreviewCanvasWidth(canvasWidth || null);
      setPreviewCanvasHeight(canvasHeight || null);
      if (customLayout) setLiveCustomLayout(customLayout);
    },
    // Editing session tracking to gate thumbnail updates
    onEditingSessionChange: handleEditingSessionChange,
    // Provide persisted custom grid to preview on load
    customLayout,
    customLayoutKey: useMemo(() => `${selectedTemplate?.id || 'none'}|${panelCount}|${selectedAspectRatio}`, [selectedTemplate?.id, panelCount, selectedAspectRatio]),
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
            <Box sx={{ mb: isMobile ? 1 : 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Typography variant="h3" gutterBottom sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  fontWeight: '700', 
                  mb: isMobile ? 0.5 : 0.75,
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
                {/* Removed top action for inline projects view */}
              </Box>
            </Box>

            <Collapse in={showEarlyAccess} unmountOnExit>
              <EarlyAccessFeedback 
                defaultExpanded
                onCollapsed={() => setShowEarlyAccess(false)}
              />
            </Collapse>

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
              onBack={hasLibraryAccess ? handleBackToProjects : undefined}
              onReset={!hasLibraryAccess ? openResetDialog : undefined}
              onGenerate={handleFloatingButtonClick}
              canGenerate={allPanelsHaveImages}
              isGenerating={isCreatingCollage}
            />

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

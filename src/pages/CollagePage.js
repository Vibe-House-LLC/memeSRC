import { useContext, useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useTheme } from "@mui/material/styles";
import { useMediaQuery, Box, Container, Typography, Button, Slide, Stack, Collapse, Chip, IconButton, Tooltip, CircularProgress, Snackbar, Alert } from "@mui/material";
import { Dashboard, Save, DeleteForever, Settings, CheckCircleOutline, ErrorOutline } from "@mui/icons-material";
import { useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from "../UserContext";
import { useSubscribeDialog } from "../contexts/useSubscribeDialog";
import { useCollage } from "../contexts/CollageContext";
import { aspectRatioPresets, layoutTemplates, getLayoutsForPanelCount } from "../components/collage/config/CollageConfig";
import UpgradeMessage from "../components/collage/components/UpgradeMessage";
import { CollageLayout } from "../components/collage/components/CollageLayoutComponents";
import { useCollageState } from "../components/collage/hooks/useCollageState";
import ProjectPicker from "../components/collage/components/ProjectPicker";
import { loadProjects, createProject, deleteProject as deleteProjectRecord, upsertProject, buildSnapshotFromState, getProject as getProjectRecord } from "../components/collage/utils/projects";
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
    return `v1:${Math.floor(hash)}`;
  } catch (_) {
    return `v1:${Date.now()}`;
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

  // Autosave UI state
  const lastSavedSigRef = useRef(null);
  const [saveStatus, setSaveStatus] = useState({ state: 'idle', time: null }); // states: idle | saving | saved
  const [isDirty, setIsDirty] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Projects state
  const [projects, setProjects] = useState(() => loadProjects());
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [showProjectPicker, setShowProjectPicker] = useState(true);
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
  
  // State to control button animation
  const [showAnimatedButton, setShowAnimatedButton] = useState(false);

  // State and ref for settings disclosure
  const settingsRef = useRef(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isCaptionEditorOpen, setIsCaptionEditorOpen] = useState(false);
  const [showEarlyAccess, setShowEarlyAccess] = useState(false);
  




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

  

  // Animate button section in with delay when the preview is visible
  useEffect(() => {
    if (hasImages && !showResultDialog) {
      const timer = setTimeout(() => {
        setShowAnimatedButton(true);
      }, 800); // 800ms delay for dramatic effect

      return () => clearTimeout(timer);
    }

    setShowAnimatedButton(false);
    return undefined; // Consistent return for all code paths
  }, [hasImages, showResultDialog]);

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
  }, [showAnimatedButton]);



  // Auto-forwarding logic based on user preference
  useEffect(() => {
    if (authorized && user) {
      const preference = getCollagePreference(user);
      const searchParams = new URLSearchParams(location.search);
      const isForced = searchParams.get('force') === 'new';
      if (isForced) {
        setShowProjectPicker(false);
      }
      
      // Only auto-forward if not forced to new version
      if (preference === 'legacy' && !isForced) {
        navigate('/collage-legacy');
      }
    }
  }, [user, navigate, location.search, authorized]);

  // Build current snapshot/signature once per state change
  const [renderBump, setRenderBump] = useState(0);

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
      try {
        // When collage-level layout settings change, drop custom layout
        // and allow a fresh grid from the selected template
        if (selectedTemplate || selectedAspectRatio || panelCount) {
          // no-op: fall through to reading live custom layout if present later in the session
        }
        const canvas = document.querySelector('[data-testid="canvas-collage-preview"]');
        const json = canvas?.dataset?.customLayout;
        if (!json) return null;
        return JSON.parse(json);
      } catch (_) { return null; }
    })(),
  }), [selectedImages, panelImageMapping, panelTransforms, panelTexts, selectedTemplate, selectedAspectRatio, panelCount, borderThickness, borderColor, renderBump]);

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

  // Keep local projects list in sync when storage changes (simple refresh on window focus)
  useEffect(() => {
    const onFocus = () => setProjects(loadProjects());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Helpers defined at module scope: blobToDataUrl, computeSnapshotSignature

  // Load a project snapshot into the current editor state
  const loadProjectById = useCallback(async (projectId) => {
    loadingProjectRef.current = true;
    const record = getProjectRecord(projectId);
    if (!record || !record.state) return;
    const snap = record.state;

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
            const url = await blobToDataUrl(blob);
            resolved.push({ originalUrl: url, displayUrl: url, metadata: { libraryKey: ref.libraryKey }, subtitle: ref.subtitle || '', subtitleShowing: !!ref.subtitleShowing });
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
    setShowProjectPicker(false);
    // Mark current snapshot as saved for status UI
    lastSavedSigRef.current = computeSnapshotSignature(snap);
    setSaveStatus({ state: 'saved', time: Date.now() });
    // Allow layout-change clearing logic to resume after state settles
    setTimeout(() => { loadingProjectRef.current = false; }, 0);
  }, [addMultipleImages, clearImages, setBorderColor, setBorderThickness, setPanelCount, setSelectedAspectRatio, setSelectedTemplate, updatePanelImageMapping, updatePanelText, updatePanelTransform]);

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
      setProjects(loadProjects());
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
  }, [activeProjectId, borderColor, borderThickness, saveProjectNow]);

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
  }, [activeProjectId, selectedTemplate?.id, selectedAspectRatio, panelCount, saveProjectNow]);

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

  // 4) Ensure a project exists once images are present (e.g., coming from external selection)
  useEffect(() => {
    if (activeProjectId) return;
    if ((selectedImages?.length || 0) === 0) return;
    const p = createProject({ name: 'Untitled Collage' });
    setProjects(loadProjects());
    setActiveProjectId(p.id);
    setShowProjectPicker(false);
    // Reset initial-save gate so we capture the first render under this new project
    didInitialSaveRef.current = false;
  }, [activeProjectId, selectedImages?.length]);

  // When the user changes layout controls, drop any existing custom grid override
  useEffect(() => {
    if (loadingProjectRef.current) return;
    setCustomLayout(null);
  }, [selectedTemplate?.id, selectedAspectRatio, panelCount]);

  // Picker handlers
  const handleCreateNewProject = useCallback(() => {
    const p = createProject({ name: 'Untitled Collage' });
    setProjects(loadProjects());
    setActiveProjectId(p.id);
    setShowProjectPicker(false);
    clearImages();
    setCustomLayout(null);
    }, [clearImages]);

  const handleOpenProject = useCallback((id) => { loadProjectById(id); }, [loadProjectById]);
  const handleDeleteProject = useCallback((id) => {
    deleteProjectRecord(id);
    setProjects(loadProjects());
    if (activeProjectId === id) {
      setActiveProjectId(null);
      clearImages();
      setShowProjectPicker(true);
    }
  }, [activeProjectId, clearImages]);

  // Manual Save handler (forces immediate thumbnail generation)
  const handleManualSave = useCallback(async () => {
    saveProjectNow({ showToast: true });
  }, [saveProjectNow]);

  const formatSavedTime = (ts) => {
    if (!ts) return '';
    const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    const m = Math.floor(diff / 60);
    return `${m}m ago`;
  };

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

  // Reset the collage and return to the library
  const handleResetCollage = () => {
    if (window.confirm('Resetting the collage will discard your changes.')) {
      clearImages();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
            {showProjectPicker && !hasImages ? (
              <ProjectPicker 
                projects={projects}
                onCreateNew={handleCreateNewProject}
                onOpen={handleOpenProject}
                onDelete={handleDeleteProject}
              />
            ) : (
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
                {/* Save controls */}
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minHeight: 40 }}>
                  <Tooltip title={
                    saveStatus.state === 'saving' ? 'Saving changes…' :
                    saveStatus.state === 'saved' ? `Saved ${formatSavedTime(saveStatus.time)}` :
                    'No recent changes'
                  }>
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 72, justifyContent: 'flex-end' }}>
                      {saveStatus.state === 'saving' ? (
                        <CircularProgress size={16} thickness={5} />
                      ) : saveStatus.state === 'saved' ? (
                        <CheckCircleOutline fontSize="small" color="success" />
                      ) : (
                        <ErrorOutline fontSize="small" color="disabled" />
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {saveStatus.state === 'saving' ? 'Saving' : saveStatus.state === 'saved' ? 'Saved' : 'Idle'}
                      </Typography>
                    </Stack>
                  </Tooltip>
                  <Tooltip title={isDirty ? 'Save (Ctrl/Cmd+S)' : 'No changes to save'}>
                    <span>
                      <IconButton 
                        color="primary" 
                        onClick={handleManualSave}
                        disabled={!isDirty || saveStatus.state === 'saving'}
                        aria-label="Save"
                        size="small"
                      >
                        <Save />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
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

            {/* Bottom Action Bar */}
            {!showResultDialog && hasImages && !isCaptionEditorOpen && (
              <Slide direction="up" in={showAnimatedButton}>
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
                    <Collapse in={!nudgeVisualActive} orientation="horizontal">
                      <Button
                      variant="contained"
                      onClick={handleToggleSettings}
                      disabled={isCreatingCollage}
                      startIcon={!isMobile ? <Settings sx={{ color: '#8b5cc7' }} /> : undefined}
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
                        {isMobile ? <Settings sx={{ color: '#8b5cc7' }} /> : (settingsOpen ? 'Close' : 'Settings')}
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
                        background: 'linear-gradient(45deg, #3d2459 30%, #6b42a1 90%)',
                        border: '1px solid #8b5cc7',
                        boxShadow: nudgeVisualActive ? '0 10px 28px rgba(107, 66, 161, 0.6)' : '0 6px 20px rgba(107, 66, 161, 0.4)',
                        transform: nudgeVisualActive ? 'scale(1.015)' : 'none',
                        transition: 'transform 180ms ease, box-shadow 220ms ease',
                        color: '#fff',
                        '&:hover': { background: 'linear-gradient(45deg, #472a69 30%, #7b4cb8 90%)' }
                      }}
                      aria-label="Create and save collage"
                      ref={generateBtnRef}
                    >
                      {isCreatingCollage ? 'Generating Collage...' : 'Generate Collage'}
                    </Button>
                    {/* Nudge message moved outside bar to render behind it */}
                    <Collapse in={!nudgeVisualActive} orientation="horizontal">
                      <Button
                      variant="contained"
                      onClick={handleResetCollage}
                      disabled={isCreatingCollage}
                      startIcon={!isMobile ? <DeleteForever sx={{ color: '#c84b4b' }} /> : undefined}
                      aria-label="Reset all"
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
                        {isMobile ? <DeleteForever sx={{ color: '#c84b4b' }} /> : 'Reset All'}
                      </Button>
                    </Collapse>
                  </Stack>
                </Box>
              </Slide>
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
            )}
          </Container>

          {/* Collage Result Dialog */}
          <CollageResultDialog
            open={showResultDialog}
            onClose={() => setShowResultDialog(false)}
            finalImage={finalImage}
          />
        </Box>
      )}
    </>
  );
}

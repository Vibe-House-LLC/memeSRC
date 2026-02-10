import React, { useState, useRef, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  Menu,
  MenuItem,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  AppBar,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PhotoLibraryRoundedIcon from '@mui/icons-material/PhotoLibraryRounded';
import UploadRoundedIcon from '@mui/icons-material/UploadRounded';
import { aspectRatioPresets } from '../config/CollageConfig';
import CanvasCollagePreview from './CanvasCollagePreview';
import { useNavigate, useLocation } from 'react-router-dom';
import CollageFrameSearchModal from './CollageFrameSearchModal';
import { LibraryBrowser } from '../../library';
import { get as getFromLibrary } from '../../../utils/library/storage';
import { saveImageToLibrary } from '../../../utils/library/saveImageToLibrary';
import { UserContext } from '../../../UserContext';
import { resizeImage } from '../../../utils/library/resizeImage';
import { UPLOAD_IMAGE_MAX_DIMENSION_PX, EDITOR_IMAGE_MAX_DIMENSION_PX } from '../../../constants/imageProcessing';
import { V2SearchContext } from '../../../contexts/v2-search-context';

const DEBUG_MODE = process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (() => {
  try { return localStorage.getItem('meme-src-collage-debug') === '1'; } catch { return false; }
})();
const debugLog = (...args) => { if (DEBUG_MODE) console.log(...args); };

/**
 * Get the aspect ratio value from the presets
 * @param {string} selectedAspectRatio - The ID of the selected aspect ratio
 * @returns {number} The aspect ratio value
 */
const getAspectRatioValue = (selectedAspectRatio) => {
  const aspectRatioPreset = aspectRatioPresets.find(preset => preset.id === selectedAspectRatio);
  return aspectRatioPreset ? aspectRatioPreset.value : 1; // Default to 1 (square) if not found
};

/**
 * CollagePreview - A component for previewing and interacting with a collage
 * Wraps DynamicCollagePreview and adds panel interaction functionality
 */
const CollagePreview = ({
  canvasResetKey = 0,
  selectedTemplate,
  selectedAspectRatio,
  panelCount,
  selectedImages,
  addMultipleImages,
  replaceImage,
  updatePanelImageMapping,
  panelImageMapping,
  borderThickness = 0,
  borderColor = '#000000',
  panelTransforms,
  updatePanelTransform,
  panelTexts,
  updatePanelText,
  lastUsedTextSettings,
  isCreatingCollage = false,
  onCaptionEditorVisibleChange,
  onGenerateNudgeRequested,
  isFrameActionSuppressed,
  isHydratingProject = false,
  // New: notify when the canvas has rendered a given signature
  renderSig,
  onPreviewRendered,
  onPreviewMetaChange,
  // Editing session tracking
  onEditingSessionChange,
  // Optional persisted custom layout to initialize preview grid
  customLayout,
  customLayoutKey,
  allowHydrationTransformCarry = false,
}) => {
  const fileInputRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, shows } = useContext(UserContext);
  const searchDetailsV2 = useContext(V2SearchContext);
  const isAdmin = user?.['cognito:groups']?.includes('admins');
  const hasLibraryAccess = isAdmin || (user?.userDetails?.magicSubscription === 'true');
  const favoriteSeriesIds = Array.isArray(shows)
    ? shows.filter((show) => show?.isFavorite).map((show) => show.id).filter(Boolean)
    : [];
  
  // State for menu
  const [menuPosition, setMenuPosition] = useState(null);
  const [activePanelIndex, setActivePanelIndex] = useState(null);
  const [activePanelId, setActivePanelId] = useState(null);
  const [isSourceSelectorOpen, setIsSourceSelectorOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchSelectionBusy, setSearchSelectionBusy] = useState(false);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [activeExistingImageIndex, setActiveExistingImageIndex] = useState(null);
  const [isCaptionDecisionOpen, setIsCaptionDecisionOpen] = useState(false);
  const [incomingCaptionPreview, setIncomingCaptionPreview] = useState('');
  const captionDecisionResolveRef = useRef(null);
  // Legacy Magic Editor dialog flow removed; navigation to MagicPage is primary
  
  // Dialog-based magic editor removed in favor of page navigation
  const navigate = useNavigate();
  const location = useLocation();
  
  // Helper: revoke blob: URLs to avoid memory leaks
  const revokeIfBlobUrl = (url) => {
    try {
      if (typeof url === 'string' && url.startsWith('blob:') && typeof URL !== 'undefined' && URL.revokeObjectURL) {
        URL.revokeObjectURL(url);
      }
    } catch (_) {
      // no-op
    }
  };
  const revokeImageObjectUrls = (imageObj) => {
    if (!imageObj) return;
    revokeIfBlobUrl(imageObj.originalUrl);
    revokeIfBlobUrl(imageObj.displayUrl);
  };


  // Get the aspect ratio value
  const aspectRatioValue = getAspectRatioValue(selectedAspectRatio);

  const clearActivePanelSelection = () => {
    if (captionDecisionResolveRef.current) {
      captionDecisionResolveRef.current(false);
      captionDecisionResolveRef.current = null;
    }
    setIsCaptionDecisionOpen(false);
    setIncomingCaptionPreview('');
    setIsReplaceMode(false);
    setActiveExistingImageIndex(null);
    setActivePanelIndex(null);
    setActivePanelId(null);
  };

  const closeCaptionDecision = (shouldUpdateCaption = false) => {
    const resolve = captionDecisionResolveRef.current;
    captionDecisionResolveRef.current = null;
    setIsCaptionDecisionOpen(false);
    setIncomingCaptionPreview('');
    if (typeof resolve === 'function') {
      resolve(Boolean(shouldUpdateCaption));
    }
  };

  const requestCaptionReplacementDecision = (incomingCaption) => (
    new Promise((resolve) => {
      captionDecisionResolveRef.current = resolve;
      setIncomingCaptionPreview(incomingCaption);
      setIsCaptionDecisionOpen(true);
    })
  );

  const resolvePanelIdFromIndex = (index) => {
    try {
      const layoutPanel = selectedTemplate?.layout?.panels?.[index];
      const templatePanel = selectedTemplate?.panels?.[index];
      return layoutPanel?.id || templatePanel?.id || `panel-${index + 1}`;
    } catch (_) {
      return `panel-${index + 1}`;
    }
  };

  const openSourceSelectorForActivePanel = () => {
    if (hasLibraryAccess) {
      setIsLibraryOpen(false);
      setIsSearchModalOpen(false);
      setIsSourceSelectorOpen(true);
      return;
    }
    fileInputRef.current?.click();
  };

  // Handle panel click - pro/admin users choose between Library and memeSRC search, others use file picker fallback
  const handlePanelClick = (index, panelId) => {
    debugLog(`Panel clicked: index=${index}, panelId=${panelId}`);
    setActivePanelIndex(index);
    setActivePanelId(panelId);

    // Determine if the clicked panel currently has an assigned image
    const imageIndex = panelImageMapping?.[panelId];
    const hasValidImage =
      imageIndex !== undefined &&
      imageIndex !== null &&
      imageIndex >= 0 &&
      imageIndex < (selectedImages?.length || 0) &&
      selectedImages?.[imageIndex];

    if (!hasValidImage) {
      // Empty frame
      setIsReplaceMode(false);
      setActiveExistingImageIndex(null);
      openSourceSelectorForActivePanel();
    } else {
      // Frame has image
      setIsReplaceMode(true);
      setActiveExistingImageIndex(imageIndex);
      openSourceSelectorForActivePanel();
    }
  };

  // Open menu for a panel
  const handleMenuOpen = (event, index) => {
    event.stopPropagation(); // Prevent panel click

    const panelId = resolvePanelIdFromIndex(index);
    const imageIndex = panelImageMapping?.[panelId];
    const hasValidImage =
      imageIndex !== undefined &&
      imageIndex !== null &&
      imageIndex >= 0 &&
      imageIndex < (selectedImages?.length || 0) &&
      selectedImages?.[imageIndex];

    setActivePanelIndex(index);
    setActivePanelId(panelId);

    if (!hasValidImage) {
      setIsReplaceMode(false);
      setActiveExistingImageIndex(null);
      setMenuPosition(null);
      openSourceSelectorForActivePanel();
      return;
    }

    setIsReplaceMode(true);
    setActiveExistingImageIndex(imageIndex);

    // Store the mouse position instead of the element reference
    setMenuPosition({
      left: event.clientX - 2,
      top: event.clientY - 4,
    });
  };

  // Close menu
  const handleMenuClose = () => {
    setMenuPosition(null);
  };

  // Handle replace image from menu
  const handleReplaceImage = () => {
    if (activePanelIndex !== null) {
      const panelId = resolvePanelIdFromIndex(activePanelIndex);

      setActivePanelId(panelId);
      const existingIdx = panelImageMapping?.[panelId];
      setActiveExistingImageIndex(typeof existingIdx === 'number' ? existingIdx : null);
      setIsReplaceMode(true);
      openSourceSelectorForActivePanel();
    }

    // Close the menu
    handleMenuClose();
  };

  // Helper: convert Blob to data URL
  const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  // Request to edit image for a specific panel
  const handleEditImageRequest = async (index, panelId, meta) => {
    try {
      setActivePanelIndex(index);
      setActivePanelId(panelId);
      const imageIndex = panelImageMapping?.[panelId];
      if (imageIndex == null) return;
      const imageObj = selectedImages?.[imageIndex];
      if (!imageObj) return;

      const panelRect = meta?.panelRect;
      const transform = panelTransforms?.[panelId] || { scale: 1, positionX: 0, positionY: 0 };

      const libKey = imageObj?.metadata?.libraryKey;
      const getOriginalSrc = async () => {
        let src = imageObj.originalUrl || imageObj.displayUrl;
        if (libKey) {
          try { const blob = await getFromLibrary(libKey, { level: 'private' }); src = await blobToDataUrl(blob); } catch (_) {}
        }
        return src;
      };

      if (!panelRect || !panelRect.width || !panelRect.height) {
        const initSrc = await getOriginalSrc();
        navigate('/magic', { state: { initialSrc: initSrc, returnTo: (location.pathname + location.search), collageEditContext: { panelId, imageIndex } } });
        return;
      }

      // Load for crop heuristic
      const ensureImageElement = async () => {
        try {
          let blob = null;
          if (libKey) { try { blob = await getFromLibrary(libKey, { level: 'private' }); } catch (_) {} }
          const src = blob ? URL.createObjectURL(blob) : (imageObj.originalUrl || imageObj.displayUrl);
          return await new Promise((resolve, reject) => {
            const img = new Image(); img.crossOrigin = 'anonymous';
            img.onload = () => { if (blob && src && src.startsWith('blob:')) { try { URL.revokeObjectURL(src); } catch {} } resolve(img); };
            img.onerror = (err) => { if (blob && src && src.startsWith('blob:')) { try { URL.revokeObjectURL(src); } catch {} } reject(err); };
            img.src = src;
          });
        } catch (_) { return null; }
      };

      const imgEl = await ensureImageElement();
      if (!imgEl) {
        const initSrc = await getOriginalSrc();
        navigate('/magic', { state: { initialSrc: initSrc, returnTo: (location.pathname + location.search), collageEditContext: { panelId, imageIndex } } });
        return;
      }

      const width = Math.max(1, Math.round(panelRect.width || 1));
      const height = Math.max(1, Math.round(panelRect.height || 1));
      const imageAspectRatio = imgEl.naturalWidth / imgEl.naturalHeight;
      const panelAspectRatio = width / height;
      let initialScale;
      if (imageAspectRatio > panelAspectRatio) initialScale = height / imgEl.naturalHeight; else initialScale = width / imgEl.naturalWidth;
      const finalScale = initialScale * (transform.scale || 1);
      const scaledWidth = imgEl.naturalWidth * finalScale;
      const scaledHeight = imgEl.naturalHeight * finalScale;
      const centerOffsetX = (width - scaledWidth) / 2;
      const centerOffsetY = (height - scaledHeight) / 2;
      const finalOffsetX = centerOffsetX + (transform.positionX || 0);
      const finalOffsetY = centerOffsetY + (transform.positionY || 0);
      const sX0 = (0 - finalOffsetX) / finalScale;
      const sY0 = (0 - finalOffsetY) / finalScale;
      const sX1 = (width - finalOffsetX) / finalScale;
      const sY1 = (height - finalOffsetY) / finalScale;
      const srcX = Math.max(0, Math.min(imgEl.naturalWidth, Math.round(sX0)));
      const srcY = Math.max(0, Math.min(imgEl.naturalHeight, Math.round(sY0)));
      const srcW = Math.max(1, Math.min(imgEl.naturalWidth - srcX, Math.round(sX1 - sX0)));
      const srcH = Math.max(1, Math.min(imgEl.naturalHeight - srcY, Math.round(sY1 - sY0)));

      // Determine how much of the original is being used in the frame.
      // Only show the choose step for extremely heavy crops (>= 90%).
      const CROP_AREA_THRESHOLD = 0.90;
      const originalArea = imgEl.naturalWidth * imgEl.naturalHeight;
      const croppedArea = srcW * srcH;
      const cropFraction = Math.max(0, Math.min(1, 1 - (croppedArea / originalArea)));
      const croppedALot = cropFraction >= CROP_AREA_THRESHOLD;

      if (!croppedALot) {
        const initSrc = await getOriginalSrc();
        navigate('/magic', { state: { initialSrc: initSrc, returnTo: (location.pathname + location.search), collageEditContext: { panelId, imageIndex } } });
      } else {
        const maxDim = 1024;
        const scaleDown = Math.min(1, maxDim / Math.max(srcW, srcH));
        const outW = Math.max(1, Math.round(srcW * scaleDown));
        const outH = Math.max(1, Math.round(srcH * scaleDown));
        const canvas = document.createElement('canvas');
        canvas.width = outW; canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(imgEl, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
        }
        const frameUrl = await dataUrlFromCanvas(canvas);
        const initSrc = await getOriginalSrc();
        navigate('/magic', { state: { chooseFrom: { originalSrc: initSrc, frameSrc: frameUrl }, returnTo: (location.pathname + location.search), collageEditContext: { panelId, imageIndex } } });
      }
    } catch (e) {
      console.error('Failed to open magic editor', e);
    }
  };

  // Helpers for fetching image blob and cropping
  // (dialog-based magic editor helpers removed; navigation-only flow)

  const dataUrlFromCanvas = (canvas) => new Promise((resolve) => {
    try {
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    } catch (_) {
      resolve(canvas.toDataURL());
    }
  });

  // (Dialog-based magic editor removed; navigation-only flow)

  // Handle file selection for a panel
  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || activePanelIndex === null) return;

    // Helper: resize then produce a data URL
    const toDataUrl = (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    // Track blob: URLs created during this handler so we can revoke on failure
    const tempBlobUrls = [];
    const trackBlobUrl = (u) => {
      if (typeof u === 'string' && u.startsWith('blob:')) tempBlobUrls.push(u);
      return u;
    };

    const getImageObject = async (file) => {
      try {
        const uploadBlob = await resizeImage(file, UPLOAD_IMAGE_MAX_DIMENSION_PX);
        const originalUrl = (typeof URL !== 'undefined' && URL.createObjectURL) ? trackBlobUrl(URL.createObjectURL(uploadBlob)) : await toDataUrl(uploadBlob);
        const editorBlob = await resizeImage(uploadBlob, EDITOR_IMAGE_MAX_DIMENSION_PX);
        const displayUrl = (typeof URL !== 'undefined' && URL.createObjectURL) ? trackBlobUrl(URL.createObjectURL(editorBlob)) : await toDataUrl(editorBlob);
        return { originalUrl, displayUrl };
      } catch (_) {
        const dataUrl = (typeof URL !== 'undefined' && URL.createObjectURL && file instanceof Blob) ? trackBlobUrl(URL.createObjectURL(file)) : await toDataUrl(file);
        return { originalUrl: dataUrl, displayUrl: dataUrl };
      }
    };
    const nextFrame = () => new Promise((resolve) => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => resolve()) : setTimeout(resolve, 0)));

    // Debug selected template and active panel
    debugLog("File upload for panel:", {
      activePanelIndex,
      fileCount: files.length,
      template: selectedTemplate,
      hasLayout: selectedTemplate && !!selectedTemplate.layout,
      hasPanels: selectedTemplate && selectedTemplate.layout && !!selectedTemplate.layout.panels,
      currentMapping: panelImageMapping
    });

    // Determine panel ID from template structure (same for both menu and direct clicks)
    let clickedPanelId;
    
    // Use the stored activePanelId if available
    if (activePanelId) {
      clickedPanelId = activePanelId;
      debugLog(`Using stored activePanelId: ${clickedPanelId}`);
    } else {
      // Fallback: Try to get panel ID from template structure using activePanelIndex
      console.warn("activePanelId not set, falling back to index-based lookup");
      try {
        const layoutPanel = selectedTemplate?.layout?.panels?.[activePanelIndex];
        const templatePanel = selectedTemplate?.panels?.[activePanelIndex];
        clickedPanelId = layoutPanel?.id || templatePanel?.id || `panel-${activePanelIndex + 1}`;
        debugLog(`Using fallback panel ID: ${clickedPanelId} for activePanelIndex: ${activePanelIndex}`);
      } catch (error) {
        console.error("Error getting fallback panel ID:", error);
        clickedPanelId = `panel-${activePanelIndex + 1}`;
      }
    }

    let committed = false;
    try {
      // Process files sequentially with small yields to keep UI responsive
      const imageObjs = [];
      for (let i = 0; i < files.length; i += 1) {
        await nextFrame();
        await nextFrame();
        // eslint-disable-next-line no-await-in-loop
        const obj = await getImageObject(files[i]);
        imageObjs.push(obj);
      }
      debugLog(`Loaded ${imageObjs.length} files for panel ${clickedPanelId}`);

      // Check if this is a replacement operation for the first file
      const existingImageIndex = panelImageMapping[clickedPanelId];
      debugLog(`Panel ${clickedPanelId}: existingImageIndex=${existingImageIndex}`);

      if (existingImageIndex !== undefined && imageObjs.length === 1) {
        // If this panel already has an image and we're only uploading one file, replace it
        debugLog(`Replacing image at index ${existingImageIndex} for panel ${clickedPanelId}`);
        const previousImage = selectedImages?.[existingImageIndex];
        await replaceImage(existingImageIndex, imageObjs[0]);
        // Mark committed immediately after state change so finally won't revoke
        // blob: URLs that are now referenced in state.
        committed = true;
        // Defer revocation to next tick so UI can re-render to new source first
        setTimeout(() => revokeImageObjectUrls(previousImage), 0);
      } else {
        // Otherwise, add all images sequentially
        const currentLength = selectedImages.length;
        debugLog(`Adding ${imageObjs.length} new images starting at index ${currentLength}`);

        // Add all images at once
        await addMultipleImages(imageObjs);
        // Prevent finally from revoking any blob: URLs now stored in state
        committed = true;

        // If this is a single file replacement, update the specific panel mapping
        if (imageObjs.length === 1) {
          const newMapping = {
            ...panelImageMapping,
            [clickedPanelId]: currentLength
          };
          debugLog("Updated mapping for single image:", newMapping);
          updatePanelImageMapping(newMapping);
        } else {
          // For multiple files, don't auto-assign them to panels
          // Let the user manually assign them by clicking on panels
          debugLog(`Added ${imageObjs.length} images. Users can now assign them to panels manually.`);
        }
      }
      // committed is set above immediately after add/replace
    } catch (error) {
      console.error("Error loading files:", error);
    } finally {
      if (!committed) {
        try { tempBlobUrls.forEach(u => URL.revokeObjectURL(u)); } catch {}
      }
    }
    
    // Reset file input and active panel state
    setActivePanelIndex(null);
    setActivePanelId(null);
    if (event.target) {
      event.target.value = null;
    }
  };

  const handleSearchContextChange = ({ query, scopeId }) => {
    if (!searchDetailsV2) return;
    if (typeof searchDetailsV2.setSearchQuery === 'function') {
      searchDetailsV2.setSearchQuery(query || '');
    }
    if (typeof searchDetailsV2.setCid === 'function' && scopeId) {
      searchDetailsV2.setCid(scopeId);
    }
  };

  const resetSearchFlowContext = () => {
    if (!searchDetailsV2) return;
    if (typeof searchDetailsV2.setSearchQuery === 'function') {
      searchDetailsV2.setSearchQuery('');
    }
    if (typeof searchDetailsV2.setCid === 'function') {
      searchDetailsV2.setCid('_universal');
    }
  };

  const applySelectedAsset = async (selected) => {
    if (!selected || activePanelIndex === null || searchSelectionBusy) {
      return;
    }

    const startedFromSearchModal = isSearchModalOpen;
    if (isSearchModalOpen) {
      setIsSearchModalOpen(false);
    }
    setSearchSelectionBusy(true);

    const clickedPanelId = activePanelId || resolvePanelIdFromIndex(activePanelIndex);

    // Normalize selected frame URL to upload/editor-sized image blobs for canvas safety.
    const toDataUrl = (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    // Track blob: URLs created while normalizing; revoke them if we fail to commit
    const tempBlobUrls = [];
    const trackBlobUrl = (u) => {
      if (typeof u === 'string' && u.startsWith('blob:')) tempBlobUrls.push(u);
      return u;
    };
    const normalizeText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const selectedSubtitle = normalizeText(selected?.subtitle);
    const subtitleFallback = normalizeText(selected?.metadata?.defaultCaption);
    const resolvedSubtitle = selectedSubtitle || subtitleFallback;
    const resolvedSubtitleShowing = typeof selected?.subtitleShowing === 'boolean'
      ? selected.subtitleShowing
      : Boolean(resolvedSubtitle);
    const existingImageSubtitle = normalizeText(selectedImages?.[activeExistingImageIndex]?.subtitle);
    const existingImageSubtitleShowing = Boolean(selectedImages?.[activeExistingImageIndex]?.subtitleShowing);
    const existingCaption = normalizeText(
      panelTexts?.[clickedPanelId]?.rawContent ??
      panelTexts?.[clickedPanelId]?.content ??
      (existingImageSubtitleShowing ? existingImageSubtitle : '')
    );
    const incomingCaption = normalizeText(resolvedSubtitle);
    const shouldPromptForCaptionUpdate = Boolean(
      isReplaceMode &&
      activeExistingImageIndex !== null &&
      typeof activeExistingImageIndex === 'number' &&
      existingCaption &&
      incomingCaption
    );
    let shouldUpdateCaption = false;
    let finalSubtitleShowing = resolvedSubtitleShowing;
    if (shouldPromptForCaptionUpdate) {
      shouldUpdateCaption = await requestCaptionReplacementDecision(incomingCaption);
      if (!shouldUpdateCaption) {
        finalSubtitleShowing = false;
      }
    }

    const buildNormalizedFromBlob = async (blob) => {
      // Create upload-sized and editor-sized JPEGs from the source blob
      const uploadBlob = await resizeImage(blob, UPLOAD_IMAGE_MAX_DIMENSION_PX);
      const originalUrl = (typeof URL !== 'undefined' && URL.createObjectURL) ? trackBlobUrl(URL.createObjectURL(uploadBlob)) : await toDataUrl(uploadBlob);
      const editorBlob = await resizeImage(uploadBlob, EDITOR_IMAGE_MAX_DIMENSION_PX);
      const displayUrl = (typeof URL !== 'undefined' && URL.createObjectURL) ? trackBlobUrl(URL.createObjectURL(editorBlob)) : await toDataUrl(editorBlob);
      return { originalUrl, displayUrl, sourceBlob: blob };
    };
    const ensureNormalized = async (item) => {
      const srcUrl = item?.originalUrl || item?.displayUrl || item?.url || item;
      const libraryKey = item?.metadata?.libraryKey;
      // Prefer fetching by library key to get a Blob we can normalize.
      if (libraryKey) {
        try {
          const blob = await getFromLibrary(libraryKey);
          return await buildNormalizedFromBlob(blob);
        } catch (e) {
          // Fall back to treating the URL directly below
        }
      }
      // For URL-based selections, fetch the image and normalize to editor-safe image blobs.
      try {
        const res = await fetch(srcUrl);
        const blob = await res.blob();
        return await buildNormalizedFromBlob(blob);
      } catch (_) {
        // As a last resort, pass through
        return { originalUrl: srcUrl, displayUrl: srcUrl };
      }
    };

    const maybeSaveSelectionToLibrary = async ({ normalized, metadata }) => {
      if (!normalized?.sourceBlob) return metadata;
      if (typeof metadata?.libraryKey === 'string' && metadata.libraryKey) return metadata;
      if (metadata?.source !== 'memesrc-search') return metadata;

      try {
        const cid = metadata?.cid ? String(metadata.cid).trim() : 'memesrc';
        const season = metadata?.season ? `S${String(metadata.season).trim()}` : '';
        const episode = metadata?.episode ? `E${String(metadata.episode).trim()}` : '';
        const frame = metadata?.frame ? `F${String(metadata.frame).trim()}` : '';
        const filename = [cid, season && episode ? `${season}${episode}` : season || episode, frame, Date.now().toString()]
          .filter(Boolean)
          .join('-');
        const tags = metadata?.cid ? [String(metadata.cid)] : [];
        const libraryMetadata = {
          tags,
          description: '',
          defaultCaption: resolvedSubtitle,
        };
        const libraryKey = await saveImageToLibrary(normalized.sourceBlob, filename, {
          level: 'private',
          metadata: libraryMetadata,
        });

        if (libraryKey) {
          return {
            ...metadata,
            libraryKey,
          };
        }
      } catch (error) {
        console.warn('Failed to save memeSRC selection to library', error);
      }

      return metadata;
    };

    let committed = false;
    try {
      const normalized = await ensureNormalized(selected);
      const metadataWithDefaults = {
        ...(selected?.metadata || {}),
        ...(resolvedSubtitle ? { defaultCaption: resolvedSubtitle } : {}),
      };
      const persistedMetadata = await maybeSaveSelectionToLibrary({
        normalized,
        metadata: metadataWithDefaults,
      });
      const imageObj = {
        ...normalized,
        subtitle: resolvedSubtitle,
        subtitleShowing: finalSubtitleShowing,
        metadata: persistedMetadata,
      };

      if (isReplaceMode && activeExistingImageIndex !== null && typeof activeExistingImageIndex === 'number') {
        // Replace existing image in place.
        const previousImage = selectedImages?.[activeExistingImageIndex];
        await replaceImage(activeExistingImageIndex, imageObj);
        if (shouldUpdateCaption && incomingCaption && typeof updatePanelText === 'function') {
          updatePanelText(clickedPanelId, {
            content: incomingCaption,
            rawContent: incomingCaption,
            subtitleShowing: true,
          });
        }
        committed = true;
        setTimeout(() => revokeImageObjectUrls(previousImage), 0);
      } else {
        // Assign to empty panel.
        const currentLength = selectedImages.length;
        await addMultipleImages([imageObj]);
        committed = true;
        const newMapping = {
          ...panelImageMapping,
          [clickedPanelId]: currentLength,
        };
        updatePanelImageMapping(newMapping);
      }
      setIsSourceSelectorOpen(false);
      setIsLibraryOpen(false);
      setIsSearchModalOpen(false);
      if (startedFromSearchModal) {
        resetSearchFlowContext();
      }
      clearActivePanelSelection();
    } finally {
      if (!committed) {
        try { tempBlobUrls.forEach(u => URL.revokeObjectURL(u)); } catch {}
      }
      setSearchSelectionBusy(false);
    }
  };

  // Handle selecting an image from memeSRC search results for the active panel.
  const handleSearchResultSelect = (selection) => {
    if (!selection) return;
    const subtitle = String(selection.subtitle || '').trim();
    const hasSubtitle = subtitle.length > 0;
    const selected = {
      url: selection.imageUrl,
      ...(hasSubtitle ? { subtitle } : {}),
      subtitleShowing: hasSubtitle,
      metadata: {
        source: 'memesrc-search',
        sourceUrl: selection.imageUrl,
        cid: selection.cid,
        season: selection.season,
        episode: selection.episode,
        frame: selection.frame,
        searchTerm: selection.searchTerm,
        ...(hasSubtitle ? { defaultCaption: subtitle } : {}),
      },
    };
    void applySelectedAsset(selected);
  };

  // Handle selecting an image from My Library for the active panel.
  const handleLibrarySelect = (items) => {
    if (!items || items.length === 0) return;
    void applySelectedAsset(items[0]);
  };

  const handleSourceSelectorClose = () => {
    if (searchSelectionBusy) return;
    setIsSourceSelectorOpen(false);
    clearActivePanelSelection();
  };

  const handleChooseSearchSource = () => {
    if (searchSelectionBusy) return;
    setIsSourceSelectorOpen(false);
    setIsLibraryOpen(false);
    setIsSearchModalOpen(true);
  };

  const handleChooseLibrarySource = () => {
    if (searchSelectionBusy) return;
    setIsSourceSelectorOpen(false);
    setIsSearchModalOpen(false);
    setIsLibraryOpen(true);
  };

  const handleChooseDeviceSource = () => {
    if (searchSelectionBusy) return;
    setIsSourceSelectorOpen(false);
    setIsLibraryOpen(false);
    setIsSearchModalOpen(false);
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        fileInputRef.current?.click();
      });
      return;
    }
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  // Close the search dialog and reset active state.
  const handleSearchModalClose = () => {
    if (searchSelectionBusy) return;
    setIsSourceSelectorOpen(false);
    setIsSearchModalOpen(false);
    resetSearchFlowContext();
    clearActivePanelSelection();
  };

  // Close the library dialog and reset active state.
  const handleLibraryClose = () => {
    if (searchSelectionBusy) return;
    setIsSourceSelectorOpen(false);
    setIsLibraryOpen(false);
    clearActivePanelSelection();
  };

  const sourceOptions = [
    {
      id: 'search',
      title: 'Search memeSRC',
      Icon: SearchRoundedIcon,
      onClick: handleChooseSearchSource,
      accent: '#91b4ff',
      tint: 'rgba(148, 163, 184, 0.07)',
    },
    {
      id: 'library',
      title: 'Choose from Library',
      Icon: PhotoLibraryRoundedIcon,
      onClick: handleChooseLibrarySource,
      accent: '#8bd5c9',
      tint: 'rgba(148, 163, 184, 0.07)',
    },
    {
      id: 'upload',
      title: 'Upload from Device',
      Icon: UploadRoundedIcon,
      onClick: handleChooseDeviceSource,
      accent: '#e8c18d',
      tint: 'rgba(148, 163, 184, 0.07)',
    },
  ];


  return (
    <Box sx={{ position: 'relative' }}>
      <CanvasCollagePreview
        key={`canvas-preview-${canvasResetKey}`}
        selectedTemplate={selectedTemplate}
        selectedAspectRatio={selectedAspectRatio}
        panelCount={panelCount}
        images={selectedImages}
        onPanelClick={handlePanelClick}
        onEditImage={isAdmin ? handleEditImageRequest : undefined}
        canEditImage={isAdmin}
        onMenuOpen={handleMenuOpen}
        onSaveGestureDetected={onGenerateNudgeRequested}
        isFrameActionSuppressed={isFrameActionSuppressed}
        isHydratingProject={isHydratingProject}
        aspectRatioValue={aspectRatioValue}
        panelImageMapping={panelImageMapping}
        updatePanelImageMapping={updatePanelImageMapping}
        borderThickness={borderThickness}
        borderColor={borderColor}
        panelTransforms={panelTransforms}
        updatePanelTransform={updatePanelTransform}
        panelTexts={panelTexts}
        updatePanelText={updatePanelText}
        lastUsedTextSettings={lastUsedTextSettings}
        onCaptionEditorVisibleChange={onCaptionEditorVisibleChange}
        isGeneratingCollage={isCreatingCollage}
        // Render tracking for autosave thumbnails
        renderSig={renderSig}
        onRendered={onPreviewRendered}
        onPreviewMetaChange={onPreviewMetaChange}
        // Editing session tracking
        onEditingSessionChange={onEditingSessionChange}
        // Initialize with a custom grid when reloading a project
        initialCustomLayout={customLayout}
        customLayoutKey={customLayoutKey}
        allowHydrationTransformCarry={allowHydrationTransformCarry}
      />
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Source selector for pro/admin users */}
      {hasLibraryAccess && (
        <Dialog
          open={isSourceSelectorOpen}
          onClose={handleSourceSelectorClose}
          fullWidth
          maxWidth="md"
          PaperProps={{
            sx: {
              borderRadius: { xs: 3, sm: 4 },
              mx: { xs: 1.25, sm: 2 },
              width: 'calc(100% - 20px)',
              maxWidth: 900,
              backgroundImage: 'linear-gradient(180deg, #161616 0%, #0b0b0b 100%)',
              border: '1px solid rgba(148,163,184,0.24)',
              color: '#f8fafc',
            },
          }}
        >
          <DialogTitle sx={{ pr: 6, fontWeight: 800, color: '#f8fafc' }}>
            Add or replace image
            <IconButton
              aria-label="close"
              onClick={handleSourceSelectorClose}
              sx={{ position: 'absolute', right: 8, top: 8, color: 'rgba(248,250,252,0.92)' }}
              disabled={searchSelectionBusy}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 0.5, pb: 2.25 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                gap: 1.25,
              }}
            >
              {sourceOptions.map((option) => {
                const Icon = option.Icon;
                return (
                  <Button
                    key={option.id}
                    onClick={option.onClick}
                    disabled={searchSelectionBusy}
                    sx={{
                      p: 0,
                      position: 'relative',
                      textTransform: 'none',
                      borderRadius: 2.5,
                      overflow: 'hidden',
                      justifyContent: 'stretch',
                      alignItems: 'stretch',
                      border: '1px solid rgba(148,163,184,0.2)',
                      background: 'linear-gradient(180deg, rgba(30,30,30,0.97) 0%, rgba(16,16,16,0.98) 100%)',
                      color: '#f8fafc',
                      minHeight: { xs: 88, sm: 96, md: 116 },
                      boxShadow: '0 8px 18px rgba(2,6,23,0.28)',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(120deg, ${option.tint}, rgba(15,23,42,0))`,
                        pointerEvents: 'none',
                      },
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 12px 22px rgba(2,6,23,0.38)',
                        borderColor: 'rgba(148,163,184,0.34)',
                        background: 'linear-gradient(180deg, rgba(38,38,38,0.98) 0%, rgba(22,22,22,0.98) 100%)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: '100%',
                        px: 1.5,
                        py: { xs: 1.5, md: 1.75 },
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                      }}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          flexShrink: 0,
                          display: 'grid',
                          placeItems: 'center',
                          color: option.accent,
                          bgcolor: 'rgba(2,6,23,0.58)',
                          border: '1px solid rgba(148,163,184,0.34)',
                        }}
                      >
                        <Icon fontSize="small" />
                      </Box>
                      <Box sx={{ minWidth: 0, textAlign: 'left' }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 800, lineHeight: 1.25, fontSize: { xs: '0.95rem', sm: '1rem' } }}
                        >
                          {option.title}
                        </Typography>
                      </Box>
                    </Box>
                  </Button>
                );
              })}
            </Box>
          </DialogContent>
        </Dialog>
      )}

      {/* My Library selection dialog for frame add/replace */}
      {hasLibraryAccess && (
        <Dialog
          open={isLibraryOpen}
          onClose={handleLibraryClose}
          fullWidth
          maxWidth="md"
          fullScreen={isMobile}
          PaperProps={{
            sx: {
              borderRadius: isMobile ? 0 : 2,
              bgcolor: '#121212',
              color: '#eaeaea',
            },
          }}
        >
          {isMobile ? (
            <AppBar
              position="sticky"
              color="default"
              elevation={0}
              sx={{ borderBottom: '1px solid #2a2a2a', bgcolor: '#121212', color: '#eaeaea' }}
            >
              <Toolbar>
                <Typography variant="h6" sx={{ flexGrow: 1, color: '#eaeaea' }}>
                  Select a photo
                </Typography>
                <IconButton
                  edge="end"
                  aria-label="close"
                  onClick={handleLibraryClose}
                  sx={{ color: '#eaeaea' }}
                  disabled={searchSelectionBusy}
                >
                  <CloseIcon />
                </IconButton>
              </Toolbar>
            </AppBar>
          ) : (
            <DialogTitle sx={{ pr: 6, color: '#eaeaea' }}>
              Select a photo
              <IconButton
                aria-label="close"
                onClick={handleLibraryClose}
                sx={{ position: 'absolute', right: 8, top: 8, color: '#eaeaea' }}
                disabled={searchSelectionBusy}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
          )}
          <DialogContent dividers sx={{ padding: isMobile ? '12px' : '16px', bgcolor: '#0f0f0f' }}>
            <LibraryBrowser
              multiple={false}
              uploadEnabled
              deleteEnabled={false}
              onSelect={(arr) => handleLibrarySelect(arr)}
              showActionBar={false}
              selectionEnabled
              previewOnClick
              showSelectToggle
              initialSelectMode
            />
          </DialogContent>
          <DialogActions sx={{ padding: isMobile ? '12px' : '16px', bgcolor: '#121212' }}>
            <Button
              onClick={handleLibraryClose}
              variant="contained"
              disableElevation
              fullWidth={isMobile}
              disabled={searchSelectionBusy}
              sx={{
                bgcolor: '#252525',
                color: '#f0f0f0',
                border: '1px solid #3a3a3a',
                borderRadius: '8px',
                px: isMobile ? 2 : 2.5,
                py: isMobile ? 1.25 : 0.75,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: '#2d2d2d', borderColor: '#4a4a4a' },
              }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* memeSRC search selection modal for frame add/replace */}
      {hasLibraryAccess && (
        <CollageFrameSearchModal
          open={isSearchModalOpen}
          busy={searchSelectionBusy}
          onClose={handleSearchModalClose}
          onSelect={handleSearchResultSelect}
          onSearchContextChange={handleSearchContextChange}
          initialQuery={searchDetailsV2?.searchQuery || ''}
          initialScopeId={searchDetailsV2?.cid || '_universal'}
          favoriteSeriesIds={favoriteSeriesIds}
          shows={Array.isArray(shows) ? shows : []}
          savedCids={Array.isArray(searchDetailsV2?.savedCids) ? searchDetailsV2.savedCids : []}
        />
      )}

      <Dialog
        open={isCaptionDecisionOpen}
        onClose={() => closeCaptionDecision(false)}
        fullWidth
        maxWidth="xs"
        sx={{
          zIndex: (muiTheme) => muiTheme.zIndex.modal + 1305,
        }}
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.62)',
          },
        }}
        PaperProps={{
          sx: {
            background: '#111318',
            color: '#f8fafc',
            border: '1px solid rgba(148,163,184,0.24)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Update caption?</DialogTitle>
        <DialogContent sx={{ pt: 0.5 }}>
          <Typography variant="body2" sx={{ color: 'rgba(203,213,225,0.86)' }}>
            Do you want to change the caption to:
          </Typography>
          <Box
            sx={{
              mt: 1.25,
              px: 1.25,
              py: 1,
              borderRadius: 1.5,
              bgcolor: 'rgba(2, 6, 23, 0.6)',
              border: '1px solid rgba(148,163,184,0.3)',
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.35, textAlign: 'center' }}>
              "{incomingCaptionPreview}"
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
          <Button
            onClick={() => closeCaptionDecision(false)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            No Thanks
          </Button>
          <Button
            onClick={() => closeCaptionDecision(true)}
            variant="contained"
            disableElevation
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Update Caption
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Panel options menu */}
      <Menu
        open={Boolean(menuPosition)}
        onClose={handleMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={menuPosition || undefined}
      >
        <MenuItem onClick={handleReplaceImage}>Replace image</MenuItem>
      </Menu>

      
    </Box>
  );
};

CollagePreview.propTypes = {
  selectedTemplate: PropTypes.object,
  selectedAspectRatio: PropTypes.string,
  panelCount: PropTypes.number,
  selectedImages: PropTypes.array,
  addMultipleImages: PropTypes.func.isRequired,
  replaceImage: PropTypes.func.isRequired,
  updatePanelImageMapping: PropTypes.func.isRequired,
  panelImageMapping: PropTypes.object.isRequired,
  borderThickness: PropTypes.number,
  borderColor: PropTypes.string,
  panelTransforms: PropTypes.object,
  updatePanelTransform: PropTypes.func,
  panelTexts: PropTypes.object,
  updatePanelText: PropTypes.func,
  lastUsedTextSettings: PropTypes.object,
  isCreatingCollage: PropTypes.bool,
  onCaptionEditorVisibleChange: PropTypes.func,
  onGenerateNudgeRequested: PropTypes.func,
  isFrameActionSuppressed: PropTypes.func,
  isHydratingProject: PropTypes.bool,
  renderSig: PropTypes.string,
  onPreviewRendered: PropTypes.func,
  onPreviewMetaChange: PropTypes.func,
  onEditingSessionChange: PropTypes.func,
  allowHydrationTransformCarry: PropTypes.bool,
  canvasResetKey: PropTypes.number,
};

export default CollagePreview; 

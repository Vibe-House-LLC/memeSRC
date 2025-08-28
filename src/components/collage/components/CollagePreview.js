import React, { useState, useRef, useContext, useEffect } from 'react';
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
} from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import { AutoFixHighRounded } from '@mui/icons-material';
import { aspectRatioPresets } from '../config/CollageConfig';
import CanvasCollagePreview from './CanvasCollagePreview';
import MagicEditor from '../../magic-editor/MagicEditor';
import { LibraryBrowser } from '../../library';
import { get as getFromLibrary } from '../../../utils/library/storage';
import { saveImageToLibrary } from '../../../utils/library/saveImageToLibrary';
import { UserContext } from '../../../UserContext';
import { resizeImage } from '../../../utils/library/resizeImage';
import { UPLOAD_IMAGE_MAX_DIMENSION_PX, EDITOR_IMAGE_MAX_DIMENSION_PX } from '../../../constants/imageProcessing';

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
  // New: notify when the canvas has rendered a given signature
  renderSig,
  onPreviewRendered,
  onPreviewMetaChange,
  // Editing session tracking
  onEditingSessionChange,
  // Optional persisted custom layout to initialize preview grid
  customLayout,
  customLayoutKey,
}) => {
  const fileInputRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useContext(UserContext);
  const isAdmin = user?.['cognito:groups']?.includes('admins');
  
  // State for menu
  const [menuPosition, setMenuPosition] = useState(null);
  const [activePanelIndex, setActivePanelIndex] = useState(null);
  const [activePanelId, setActivePanelId] = useState(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [activeExistingImageIndex, setActiveExistingImageIndex] = useState(null);
  
  // Magic editor dialog state
  const [isMagicOpen, setIsMagicOpen] = useState(false);
  const [magicChosenSrc, setMagicChosenSrc] = useState(null);
  const [magicCurrentSrc, setMagicCurrentSrc] = useState(null);
  const [magicProcessing, setMagicProcessing] = useState(false);
  const [magicPromptState, setMagicPromptState] = useState({ value: '', focused: false });
  const [confirmMagicDiscardOpen, setConfirmMagicDiscardOpen] = useState(false);
  const [confirmMagicCancelOpen, setConfirmMagicCancelOpen] = useState(false);
  // Choice dialog for original vs frame-view input to Magic Editor
  const [chooseEditInputOpen, setChooseEditInputOpen] = useState(false);
  const [pendingMagicContext, setPendingMagicContext] = useState(null); // { index, panelId, meta }
  const [editPreviewLoading, setEditPreviewLoading] = useState(false);
  const [editOriginalPreview, setEditOriginalPreview] = useState(null);
  const [editFramePreview, setEditFramePreview] = useState(null);
  
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

  // Handle panel click - admins use Library, non-admins use system file picker
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
      if (isAdmin) {
        setIsLibraryOpen(true);
      } else {
        // Non-admins: open system file picker (legacy behavior)
        fileInputRef.current?.click();
      }
    } else {
      // Frame has image
      setIsReplaceMode(true);
      setActiveExistingImageIndex(imageIndex);
      if (isAdmin) {
        setIsLibraryOpen(true);
      } else {
        // Non-admins: open system file picker to replace image
        fileInputRef.current?.click();
      }
    }
  };

  // Open menu for a panel
  const handleMenuOpen = (event, index) => {
    event.stopPropagation(); // Prevent panel click
    
    // Store the mouse position instead of the element reference
    setMenuPosition({
      left: event.clientX - 2,
      top: event.clientY - 4,
    });
    
    setActivePanelIndex(index);
  };

  // Close menu
  const handleMenuClose = () => {
    setMenuPosition(null);
  };

  // Handle replace image from menu
  const handleReplaceImage = () => {
    if (activePanelIndex !== null) {
      // Determine panel ID and existing image index
      let panelId;
      try {
        const layoutPanel = selectedTemplate?.layout?.panels?.[activePanelIndex];
        const templatePanel = selectedTemplate?.panels?.[activePanelIndex];
        panelId = layoutPanel?.id || templatePanel?.id || `panel-${activePanelIndex + 1}`;
      } catch (error) {
        panelId = `panel-${activePanelIndex + 1}`;
      }

      setActivePanelId(panelId);
      const existingIdx = panelImageMapping?.[panelId];
      setActiveExistingImageIndex(typeof existingIdx === 'number' ? existingIdx : null);
      setIsReplaceMode(true);
      if (isAdmin) {
        setIsLibraryOpen(true);
      } else {
        // Non-admins: open system file picker
        fileInputRef.current?.click();
      }
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
      // Open choice dialog to select input source
      setPendingMagicContext({ index, panelId, meta: meta || null });
      setChooseEditInputOpen(true);
    } catch (e) {
      console.error('Failed to open magic editor', e);
    }
  };

  // Helpers for fetching image blob and cropping
  const fetchImageBlob = async (imageObj) => {
    const libKey = imageObj?.metadata?.libraryKey;
    if (libKey) {
      try {
        const blob = await getFromLibrary(libKey, { level: 'protected' });
        return blob;
      } catch (_) { /* fallthrough */ }
    }
    const url = imageObj.originalUrl || imageObj.displayUrl;
    if (!url) return null;
    try {
      const res = await fetch(url, { mode: 'cors' });
      return await res.blob();
    } catch (_) {
      return null;
    }
  };

  const loadImageElement = (blobOrUrl) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    if (blobOrUrl instanceof Blob) {
      const url = URL.createObjectURL(blobOrUrl);
      img.onload = () => { try { URL.revokeObjectURL(url); } catch {} resolve(img); };
      img.src = url;
    } else {
      img.src = blobOrUrl;
    }
  });

  const dataUrlFromCanvas = (canvas) => new Promise((resolve) => {
    try {
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    } catch (_) {
      resolve(canvas.toDataURL());
    }
  });

  const openMagicWithOriginal = async () => {
    try {
      const imageIndex = panelImageMapping?.[activePanelId];
      if (imageIndex == null) return;
      const imageObj = selectedImages?.[imageIndex];
      if (!imageObj) return;
      const blob = await fetchImageBlob(imageObj);
      if (blob) {
        const dataUrl = await blobToDataUrl(blob);
        setMagicChosenSrc(dataUrl);
        setMagicCurrentSrc(dataUrl);
      } else {
        const url = imageObj.originalUrl || imageObj.displayUrl;
        if (!url) return;
        setMagicChosenSrc(url);
        setMagicCurrentSrc(url);
      }
      setIsMagicOpen(true);
    } catch (e) {
      console.error('Failed to prepare original image for magic editor', e);
    }
  };

  const openMagicWithFrameView = async () => {
    try {
      const imageIndex = panelImageMapping?.[activePanelId];
      if (imageIndex == null) return;
      const imageObj = selectedImages?.[imageIndex];
      if (!imageObj) return;
      const blob = await fetchImageBlob(imageObj);
      if (!blob) {
        await openMagicWithOriginal();
        return;
      }
      const img = await loadImageElement(blob);
      // Determine panel rect size
      const panelRect = pendingMagicContext?.meta?.panelRect;
      const width = Math.max(1, Math.round(panelRect?.width || 1));
      const height = Math.max(1, Math.round(panelRect?.height || 1));
      // Get transform for this panel
      const transform = panelTransforms?.[activePanelId] || { scale: 1, positionX: 0, positionY: 0 };
      // Compute initial scale as in CanvasCollagePreview
      const imageAspectRatio = img.naturalWidth / img.naturalHeight;
      const panelAspectRatio = width / height;
      let initialScale;
      if (imageAspectRatio > panelAspectRatio) {
        initialScale = height / img.naturalHeight;
      } else {
        initialScale = width / img.naturalWidth;
      }
      const finalScale = initialScale * (transform.scale || 1);
      const scaledWidth = img.naturalWidth * finalScale;
      const scaledHeight = img.naturalHeight * finalScale;
      const centerOffsetX = (width - scaledWidth) / 2;
      const centerOffsetY = (height - scaledHeight) / 2;
      const finalOffsetX = centerOffsetX + (transform.positionX || 0);
      const finalOffsetY = centerOffsetY + (transform.positionY || 0);
      // Map panel bounds to source image coordinates
      const sX0 = (0 - finalOffsetX) / finalScale;
      const sY0 = (0 - finalOffsetY) / finalScale;
      const sX1 = (width - finalOffsetX) / finalScale;
      const sY1 = (height - finalOffsetY) / finalScale;
      const srcX = Math.max(0, Math.min(img.naturalWidth, Math.round(sX0)));
      const srcY = Math.max(0, Math.min(img.naturalHeight, Math.round(sY0)));
      const srcW = Math.max(1, Math.min(img.naturalWidth - srcX, Math.round(sX1 - sX0)));
      const srcH = Math.max(1, Math.min(img.naturalHeight - srcY, Math.round(sY1 - sY0)));
      // Draw to an offscreen canvas, optionally resizing to editor max
      const maxDim = EDITOR_IMAGE_MAX_DIMENSION_PX;
      const scaleDown = Math.min(1, maxDim / Math.max(srcW, srcH));
      const outW = Math.max(1, Math.round(srcW * scaleDown));
      const outH = Math.max(1, Math.round(srcH * scaleDown));
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        img,
        srcX,
        srcY,
        srcW,
        srcH,
        0,
        0,
        outW,
        outH
      );
      const dataUrl = await dataUrlFromCanvas(canvas);
      setMagicChosenSrc(dataUrl);
      setMagicCurrentSrc(dataUrl);
      setIsMagicOpen(true);
    } catch (e) {
      console.error('Failed to prepare frame-view image for magic editor', e);
      // Fallback to original
      await openMagicWithOriginal();
    }
  };

  // Build previews when the choice dialog opens
  useEffect(() => {
    const buildPreviews = async () => {
      try {
        setEditPreviewLoading(true);
        setEditOriginalPreview(null);
        setEditFramePreview(null);
        const imageIndex = panelImageMapping?.[activePanelId];
        if (imageIndex == null) return;
        const imageObj = selectedImages?.[imageIndex];
        if (!imageObj) return;
        const blob = await fetchImageBlob(imageObj);
        let imgEl;
        if (blob) {
          imgEl = await loadImageElement(blob);
        } else {
          const url = imageObj.originalUrl || imageObj.displayUrl;
          if (!url) return;
          imgEl = await loadImageElement(url);
        }
        // Create original preview
        const maxPreview = 320;
        const scaleO = Math.min(1, maxPreview / Math.max(imgEl.naturalWidth, imgEl.naturalHeight));
        const oW = Math.max(1, Math.round(imgEl.naturalWidth * scaleO));
        const oH = Math.max(1, Math.round(imgEl.naturalHeight * scaleO));
        const oCanvas = document.createElement('canvas');
        oCanvas.width = oW; oCanvas.height = oH;
        const oCtx = oCanvas.getContext('2d');
        oCtx.imageSmoothingQuality = 'high';
        oCtx.drawImage(imgEl, 0, 0, oW, oH);
        const originalPreviewUrl = await dataUrlFromCanvas(oCanvas);
        setEditOriginalPreview(originalPreviewUrl);

        // Create frame-view preview using same cropping math as openMagicWithFrameView
        const panelRect = pendingMagicContext?.meta?.panelRect;
        if (panelRect) {
          const width = Math.max(1, Math.round(panelRect.width || 1));
          const height = Math.max(1, Math.round(panelRect.height || 1));
          const transform = panelTransforms?.[activePanelId] || { scale: 1, positionX: 0, positionY: 0 };
          const imageAspectRatio = imgEl.naturalWidth / imgEl.naturalHeight;
          const panelAspectRatio = width / height;
          let initialScale;
          if (imageAspectRatio > panelAspectRatio) {
            initialScale = height / imgEl.naturalHeight;
          } else {
            initialScale = width / imgEl.naturalWidth;
          }
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
          const scaleF = Math.min(1, maxPreview / Math.max(srcW, srcH));
          const fW = Math.max(1, Math.round(srcW * scaleF));
          const fH = Math.max(1, Math.round(srcH * scaleF));
          const fCanvas = document.createElement('canvas');
          fCanvas.width = fW; fCanvas.height = fH;
          const fCtx = fCanvas.getContext('2d');
          fCtx.imageSmoothingQuality = 'high';
          fCtx.drawImage(imgEl, srcX, srcY, srcW, srcH, 0, 0, fW, fH);
          const framePreviewUrl = await dataUrlFromCanvas(fCanvas);
          setEditFramePreview(framePreviewUrl);
        } else {
          setEditFramePreview(originalPreviewUrl);
        }
      } catch (e) {
        // If preview generation fails, leave previews null
        console.error('Failed generating edit previews', e);
      } finally {
        setEditPreviewLoading(false);
      }
    };
    if (chooseEditInputOpen) {
      buildPreviews();
    } else {
      setEditOriginalPreview(null);
      setEditFramePreview(null);
      setEditPreviewLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chooseEditInputOpen, activePanelId]);

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

  // Handle selecting an image from the Library for the active (empty) panel
  const handleLibrarySelect = async (items) => {
    if (!items || items.length === 0 || activePanelIndex === null) {
      setIsLibraryOpen(false);
      return;
    }

    // Optimistically close dialog for snappier UX
    setIsLibraryOpen(false);

    // Determine panel ID
    let clickedPanelId = activePanelId;
    if (!clickedPanelId) {
      try {
        const layoutPanel = selectedTemplate?.layout?.panels?.[activePanelIndex];
        const templatePanel = selectedTemplate?.panels?.[activePanelIndex];
        clickedPanelId = layoutPanel?.id || templatePanel?.id || `panel-${activePanelIndex + 1}`;
      } catch (e) {
        clickedPanelId = `panel-${activePanelIndex + 1}`;
      }
    }

    const selected = items[0];

    // Helper to ensure we use a data URL for canvas safety
    // Build a normalized image object (originalUrl at upload size, displayUrl at editor size)
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

    const buildNormalizedFromBlob = async (blob) => {
      // Create upload-sized and editor-sized JPEGs from the source blob
      const uploadBlob = await resizeImage(blob, UPLOAD_IMAGE_MAX_DIMENSION_PX);
      const originalUrl = (typeof URL !== 'undefined' && URL.createObjectURL) ? trackBlobUrl(URL.createObjectURL(uploadBlob)) : await toDataUrl(uploadBlob);
      const editorBlob = await resizeImage(uploadBlob, EDITOR_IMAGE_MAX_DIMENSION_PX);
      const displayUrl = (typeof URL !== 'undefined' && URL.createObjectURL) ? trackBlobUrl(URL.createObjectURL(editorBlob)) : await toDataUrl(editorBlob);
      return { originalUrl, displayUrl };
    };
    const ensureNormalized = async (item) => {
      const srcUrl = item?.originalUrl || item?.displayUrl || item?.url || item;
      const libraryKey = item?.metadata?.libraryKey;
      // Prefer fetching by library key to get a Blob we can normalize
      if (libraryKey) {
        try {
          const blob = await getFromLibrary(libraryKey);
          return await buildNormalizedFromBlob(blob);
        } catch (e) {
          // Fall back to treating the URL directly below
        }
      }
      // If we already have a data URL or http url, fetch and normalize
      try {
        const res = await fetch(srcUrl);
        const blob = await res.blob();
        return await buildNormalizedFromBlob(blob);
      } catch (_) {
        // As a last resort, pass through
        return { originalUrl: srcUrl, displayUrl: srcUrl, metadata: item?.metadata || {} };
      }
    };

    let committed = false;
    try {
      if (isReplaceMode && activeExistingImageIndex !== null && typeof activeExistingImageIndex === 'number') {
        // Replace existing image in place with data URL for display, but preserve library metadata for persistence
        const normalized = await ensureNormalized(selected);
        const previousImage = selectedImages?.[activeExistingImageIndex];
        await replaceImage(activeExistingImageIndex, { ...normalized, metadata: selected?.metadata || {} });
        // Mark committed right after state mutation to avoid revoking in-use blob URLs
        committed = true;
        setTimeout(() => revokeImageObjectUrls(previousImage), 0);
      } else {
        // Assign to empty panel: add to images and map using data URL
        const currentLength = selectedImages.length;
        const normalized = await ensureNormalized(selected);
        const imageObj = { ...normalized, metadata: selected?.metadata || {} };
        await addMultipleImages([imageObj]);
        // Mark committed immediately after adding to state
        committed = true;
        const newMapping = {
          ...panelImageMapping,
          [clickedPanelId]: currentLength,
        };
        updatePanelImageMapping(newMapping);
      }
      // committed is set above immediately after add/replace
    } finally {
      // Cleanup any temporary blob URLs if we failed to commit
      if (!committed) {
        try { tempBlobUrls.forEach(u => URL.revokeObjectURL(u)); } catch {}
      }
      // Reset active state
      setIsReplaceMode(false);
      setActiveExistingImageIndex(null);
      setActivePanelIndex(null);
      setActivePanelId(null);
    }
  };

  // Close the library dialog and reset active state
  const handleLibraryClose = () => {
    setIsLibraryOpen(false);
    setIsReplaceMode(false);
    setActiveExistingImageIndex(null);
    setActivePanelIndex(null);
    setActivePanelId(null);
  };


  return (
    <Box sx={{ position: 'relative' }}>
      <CanvasCollagePreview
        selectedTemplate={selectedTemplate}
        selectedAspectRatio={selectedAspectRatio}
        panelCount={panelCount}
        images={selectedImages}
        onPanelClick={handlePanelClick}
        onEditImage={handleEditImageRequest}
        onMenuOpen={handleMenuOpen}
        onSaveGestureDetected={onGenerateNudgeRequested}
        isFrameActionSuppressed={isFrameActionSuppressed}
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
      />
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Library selection dialog - admins only */}
      {isAdmin && (
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
                <IconButton edge="end" aria-label="close" onClick={handleLibraryClose} sx={{ color: '#eaeaea' }}>
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
              sx={{
                bgcolor: '#252525',
                color: '#f0f0f0',
                border: '1px solid #3a3a3a',
                borderRadius: '8px',
                px: isMobile ? 2 : 2.5,
                py: isMobile ? 1.25 : 0.75,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: '#2d2d2d', borderColor: '#4a4a4a' }
              }}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      )}
      
      {/* Panel options menu */}
      <Menu
        open={Boolean(menuPosition)}
        onClose={handleMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={menuPosition || undefined}
      >
        <MenuItem onClick={handleReplaceImage}>Replace image</MenuItem>
      </Menu>

      {/* Choose input for Magic Editor: original vs frame view */}
      <Dialog
        open={chooseEditInputOpen}
        onClose={() => { setChooseEditInputOpen(false); setPendingMagicContext(null); }}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
        scroll={isMobile ? 'paper' : 'body'}
        PaperProps={{
          sx: {
            bgcolor: '#0f0f0f',
            color: '#fafafa',
            width: { xs: '100%', md: 'auto' },
            maxWidth: { xs: '100%', md: '640px' },
            maxHeight: { xs: '100%', md: '80vh' },
            m: 0,
            borderRadius: { xs: 0, md: 2 },
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }
        }}
      >
        {isMobile ? (
          <AppBar position="static" color="transparent" elevation={0} sx={{ bgcolor: '#0f0f0f' }}>
            <Toolbar sx={{ minHeight: 56 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, flex: 1 }}>Which one?</Typography>
              <IconButton edge="end" onClick={() => { setChooseEditInputOpen(false); setPendingMagicContext(null); }} aria-label="Close" sx={{ color: '#eaeaea' }}>
                <CloseIcon />
              </IconButton>
            </Toolbar>
          </AppBar>
        ) : (
          <DialogTitle sx={{ fontWeight: 800 }}>Which one?</DialogTitle>
        )}

        <DialogContent
          dividers={!isMobile}
          sx={{
            p: { xs: 2, md: 2.5 },
            bgcolor: '#0f0f0f',
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 1.5, md: 2 },
            flex: 1,
          }}
        >
          {/* Options container: mobile = vertical split, desktop = two columns */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gridTemplateRows: { xs: '1fr 1fr', md: 'auto' },
              gap: { xs: 1.5, md: 2 },
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* Original */}
            <Box
              role="button"
              aria-label="Original"
              tabIndex={0}
              onClick={async () => { setChooseEditInputOpen(false); await openMagicWithOriginal(); setPendingMagicContext(null); }}
              onKeyDown={async (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setChooseEditInputOpen(false); await openMagicWithOriginal(); setPendingMagicContext(null); } }}
              sx={{
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: { xs: 1.5, md: 2 },
                bgcolor: '#121212',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                outline: 'none',
                '&:hover': { borderColor: 'rgba(255,255,255,0.28)' },
                '&:focus-visible': { boxShadow: '0 0 0 3px rgba(255,255,255,0.24)' },
                minHeight: { xs: 0, md: 'min(50vh, 420px)' },
              }}
            >
              <Box sx={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0d0d0d' }}>
                {editPreviewLoading ? (
                  <Box sx={{ width: '60%', height: '60%', bgcolor: '#1f1f1f', borderRadius: 1 }} />
                ) : (
                  editOriginalPreview ? (
                    <Box component="img" alt="Original" src={editOriginalPreview} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>—</Typography>
                  )
                )}
                <Box sx={{ position: 'absolute', bottom: 12, left: 12, bgcolor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.24)', color: '#fff', px: 1, py: 0.25, borderRadius: 2, fontWeight: 800, fontSize: 12, letterSpacing: 0.2 }}>
                  Original
                </Box>
              </Box>
            </Box>

            {/* Cropped */}
            <Box
              role="button"
              aria-label="Cropped"
              tabIndex={0}
              onClick={async () => { setChooseEditInputOpen(false); await openMagicWithFrameView(); setPendingMagicContext(null); }}
              onKeyDown={async (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setChooseEditInputOpen(false); await openMagicWithFrameView(); setPendingMagicContext(null); } }}
              sx={{
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: { xs: 1.5, md: 2 },
                bgcolor: '#121212',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                outline: 'none',
                '&:hover': { borderColor: 'rgba(255,255,255,0.28)' },
                '&:focus-visible': { boxShadow: '0 0 0 3px rgba(255,255,255,0.24)' },
                minHeight: { xs: 0, md: 'min(50vh, 420px)' },
              }}
            >
              <Box sx={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0d0d0d' }}>
                {editPreviewLoading ? (
                  <Box sx={{ width: '60%', height: '60%', bgcolor: '#1f1f1f', borderRadius: 1 }} />
                ) : (
                  editFramePreview ? (
                    <Box component="img" alt="Cropped" src={editFramePreview} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>—</Typography>
                  )
                )}
                <Box sx={{ position: 'absolute', bottom: 12, left: 12, bgcolor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.24)', color: '#fff', px: 1, py: 0.25, borderRadius: 2, fontWeight: 800, fontSize: 12, letterSpacing: 0.2 }}>
                  Cropped
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Magic Editor Dialog */}
      <Dialog
        open={isMagicOpen}
        onClose={() => {
          const hasUnappliedPrompt = Boolean(magicPromptState.value && magicPromptState.value.trim().length > 0);
          const hasUnsavedEdits = Boolean(magicChosenSrc && magicCurrentSrc && magicChosenSrc !== magicCurrentSrc);
          if (hasUnappliedPrompt || hasUnsavedEdits) {
            setConfirmMagicCancelOpen(true);
          } else {
            setIsMagicOpen(false);
            setMagicChosenSrc(null);
            setMagicCurrentSrc(null);
            setMagicPromptState({ value: '', focused: false });
          }
        }}
        fullWidth
        maxWidth="lg"
        scroll={isMobile ? 'paper' : 'body'}
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            bgcolor: '#0f0f0f',
            // Avoid 100vw on iOS which can exceed the visual viewport
            width: { xs: '100%', md: 'auto' },
            maxWidth: { xs: '100%', md: 'calc(100% - 64px)' },
            m: 0,
            borderRadius: 0,
            overflowX: 'hidden',
          }
        }}
      >
        <DialogTitle sx={{ color: '#eaeaea', pt: 2.5, pb: 1.25 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Magic Editor
          </Typography>
        </DialogTitle>
        {/* Mobile subtitle under the title, aligned to the same left padding */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1, px: 2, pb: 0.5 }}>
          <AutoFixHighRounded sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            Ask for edits in plain English
          </Typography>
        </Box>
        {/* Desktop action bar (MagicEditor shows its own Save/Cancel on mobile unless overridden) */}
        {isMagicOpen && (
          <Box sx={{ display: { xs: 'none', md: 'block' }, px: 0, pt: 1 }}>
            <Box
              sx={{
                width: '100%',
                px: 2,
                py: 1,
                borderRadius: 2,
                backgroundColor: '#000',
                boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, gap: 1.25 }}>
                  <AutoFixHighRounded sx={{ color: 'primary.main' }} />
                  <Typography
                    variant="subtitle1"
                    sx={{ color: 'common.white', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    Ask for edits in plain English
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    size="large"
                    variant="outlined"
                    onClick={() => {
                      const hasUnappliedPrompt = Boolean(magicPromptState.value && magicPromptState.value.trim().length > 0);
                      const hasUnsavedEdits = Boolean(magicChosenSrc && magicCurrentSrc && magicChosenSrc !== magicCurrentSrc);
                      if (hasUnappliedPrompt || hasUnsavedEdits) {
                        setConfirmMagicCancelOpen(true);
                      } else {
                        setIsMagicOpen(false);
                        setMagicChosenSrc(null);
                        setMagicCurrentSrc(null);
                        setMagicPromptState({ value: '', focused: false });
                      }
                    }}
                    disabled={magicProcessing}
                    sx={{ minHeight: 44, fontWeight: 700, textTransform: 'none', color: 'rgba(255,255,255,0.92)', borderColor: 'rgba(255,255,255,0.35)', '&:hover': { borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.08)' } }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="large"
                    variant="contained"
                    onClick={async () => {
                      if (!magicCurrentSrc || activePanelId == null) return;
                      if (magicPromptState.value && magicPromptState.value.trim().length > 0) {
                        setConfirmMagicDiscardOpen(true);
                        return;
                      }
                      try {
                        const libraryKey = await saveImageToLibrary(magicCurrentSrc, 'magic-edit.jpg', { level: 'protected', metadata: { source: 'magic-editor' } });
                        const res = await fetch(magicCurrentSrc);
                        const srcBlob = await res.blob();
                        const uploadBlob = await resizeImage(srcBlob, UPLOAD_IMAGE_MAX_DIMENSION_PX);
                        const toDataUrl = (blob) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
                        const originalUrl = await toDataUrl(uploadBlob);
                        const editorBlob = await resizeImage(uploadBlob, EDITOR_IMAGE_MAX_DIMENSION_PX);
                        const displayUrl = await toDataUrl(editorBlob);
                        const idx = panelImageMapping?.[activePanelId];
                        if (typeof idx === 'number') {
                          await replaceImage(idx, { originalUrl, displayUrl, metadata: { libraryKey } });
                        }
                        setIsMagicOpen(false);
                        setMagicChosenSrc(null);
                        setMagicCurrentSrc(null);
                        setMagicPromptState({ value: '', focused: false });
                      } catch (e) {
                        console.error('Failed to save magic edit', e);
                      }
                    }}
                    disabled={!magicCurrentSrc || magicProcessing}
                    sx={{ minHeight: 44, fontWeight: 700, textTransform: 'none', background: 'linear-gradient(45deg, #6b42a1 0%, #7b4cb8 50%, #8b5cc7 100%)', border: '1px solid #8b5cc7', color: '#fff', boxShadow: 'none', '&:hover': { background: 'linear-gradient(45deg, #5e3992 0%, #6b42a1 50%, #7b4cb8 100%)' } }}
                  >
                    Save
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
        {/* Mobile action bar placed outside scroll area for persistent access */}
        {isMagicOpen && (
          <Box sx={{ display: { xs: 'grid', md: 'none' }, gridTemplateColumns: '1fr 1fr', gap: 1, px: 2, pt: 0.5, pb: 1 }}>
            <Button
              size="large"
              fullWidth
              variant="outlined"
              onClick={() => {
                const hasUnappliedPrompt = Boolean(magicPromptState.value && magicPromptState.value.trim().length > 0);
                const hasUnsavedEdits = Boolean(magicChosenSrc && magicCurrentSrc && magicChosenSrc !== magicCurrentSrc);
                if (hasUnappliedPrompt || hasUnsavedEdits) {
                  setConfirmMagicCancelOpen(true);
                } else {
                  setIsMagicOpen(false);
                  setMagicChosenSrc(null);
                  setMagicCurrentSrc(null);
                  setMagicPromptState({ value: '', focused: false });
                }
              }}
              disabled={magicProcessing}
              sx={{
                minHeight: 44,
                fontWeight: 700,
                textTransform: 'none',
                color: 'rgba(255,255,255,0.92)',
                borderColor: 'rgba(255,255,255,0.35)',
                '&:hover': { borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.08)' }
              }}
            >
              Cancel
            </Button>
            <Button
              size="large"
              fullWidth
              variant="contained"
              onClick={async () => {
                if (!magicCurrentSrc || activePanelId == null) return;
                if (magicPromptState.value && magicPromptState.value.trim().length > 0) {
                  setConfirmMagicDiscardOpen(true);
                  return;
                }
                try {
                  const libraryKey = await saveImageToLibrary(magicCurrentSrc, 'magic-edit.jpg', { level: 'protected', metadata: { source: 'magic-editor' } });
                  const res = await fetch(magicCurrentSrc);
                  const srcBlob = await res.blob();
                  const uploadBlob = await resizeImage(srcBlob, UPLOAD_IMAGE_MAX_DIMENSION_PX);
                  const toDataUrl = (blob) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
                  const originalUrl = await toDataUrl(uploadBlob);
                  const editorBlob = await resizeImage(uploadBlob, EDITOR_IMAGE_MAX_DIMENSION_PX);
                  const displayUrl = await toDataUrl(editorBlob);
                  const idx = panelImageMapping?.[activePanelId];
                  if (typeof idx === 'number') {
                    await replaceImage(idx, { originalUrl, displayUrl, metadata: { libraryKey } });
                  }
                  setIsMagicOpen(false);
                  setMagicChosenSrc(null);
                  setMagicCurrentSrc(null);
                  setMagicPromptState({ value: '', focused: false });
                } catch (e) {
                  console.error('Failed to save magic edit', e);
                }
              }}
              disabled={!magicCurrentSrc || magicProcessing}
              sx={{
                minHeight: 44,
                fontWeight: 700,
                textTransform: 'none',
                background: 'linear-gradient(45deg, #6b42a1 0%, #7b4cb8 50%, #8b5cc7 100%)',
                border: '1px solid #8b5cc7',
                color: '#fff',
                boxShadow: 'none',
                '&:hover': { background: 'linear-gradient(45deg, #5e3992 0%, #6b42a1 50%, #7b4cb8 100%)' },
              }}
            >
              Save
            </Button>
          </Box>
        )}
        <DialogContent
          dividers={!isMobile}
          sx={{
            bgcolor: '#0f0f0f',
            p: { xs: 0, md: 2 },
            overflowX: 'hidden',
            // Ensure content fits within viewport width on mobile
            maxWidth: { xs: '100%', md: 'initial' },
            boxSizing: 'border-box',
          }}
        >
          {magicChosenSrc && (
            <Box sx={{ width: '100%', overflowX: 'hidden' }}>
            <MagicEditor
              imageSrc={magicChosenSrc}
              onImageChange={setMagicCurrentSrc}
              onProcessingChange={setMagicProcessing}
              onPromptStateChange={setMagicPromptState}
              showHeader={false}
              onSave={async (src) => {
                if (!src || activePanelId == null) return;
                try {
                  const libraryKey = await saveImageToLibrary(src, 'magic-edit.jpg', { level: 'protected', metadata: { source: 'magic-editor' } });
                  const res = await fetch(src);
                  const srcBlob = await res.blob();
                  const uploadBlob = await resizeImage(srcBlob, UPLOAD_IMAGE_MAX_DIMENSION_PX);
                  const toDataUrl = (blob) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
                  const originalUrl = await toDataUrl(uploadBlob);
                  const editorBlob = await resizeImage(uploadBlob, EDITOR_IMAGE_MAX_DIMENSION_PX);
                  const displayUrl = await toDataUrl(editorBlob);
                  const idx = panelImageMapping?.[activePanelId];
                  if (typeof idx === 'number') {
                    await replaceImage(idx, { originalUrl, displayUrl, metadata: { libraryKey } });
                  }
                  setIsMagicOpen(false);
                  setMagicChosenSrc(null);
                  setMagicCurrentSrc(null);
                  setMagicPromptState({ value: '', focused: false });
                } catch (e) {
                  console.error('Failed to save magic edit', e);
                }
              }}
              onCancel={() => {
                const hasUnappliedPrompt = Boolean(magicPromptState.value && magicPromptState.value.trim().length > 0);
                const hasUnsavedEdits = Boolean(magicChosenSrc && magicCurrentSrc && magicChosenSrc !== magicCurrentSrc);
                if (hasUnappliedPrompt || hasUnsavedEdits) {
                  setConfirmMagicCancelOpen(true);
                } else {
                  setIsMagicOpen(false);
                  setMagicChosenSrc(null);
                  setMagicCurrentSrc(null);
                  setMagicPromptState({ value: '', focused: false });
                }
              }}
              showActions={false}
            />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm discard of unapplied prompt when saving from desktop controls */}
      <Dialog open={confirmMagicDiscardOpen} onClose={() => setConfirmMagicDiscardOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Discard Unapplied Edit?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Do you want to discard your unapplied edit "
            <Box component="span" sx={{ fontWeight: 700 }}>{magicPromptState.value}</Box>
            "?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmMagicDiscardOpen(false)}>Keep Editing</Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              setConfirmMagicDiscardOpen(false);
              if (!magicCurrentSrc || activePanelId == null) return;
              try {
                const libraryKey = await saveImageToLibrary(magicCurrentSrc, 'magic-edit.jpg', { level: 'protected', metadata: { source: 'magic-editor' } });
                const res = await fetch(magicCurrentSrc);
                const srcBlob = await res.blob();
                const uploadBlob = await resizeImage(srcBlob, UPLOAD_IMAGE_MAX_DIMENSION_PX);
                const toDataUrl = (blob) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
                const originalUrl = await toDataUrl(uploadBlob);
                const editorBlob = await resizeImage(uploadBlob, EDITOR_IMAGE_MAX_DIMENSION_PX);
                const displayUrl = await toDataUrl(editorBlob);
                const idx = panelImageMapping?.[activePanelId];
                if (typeof idx === 'number') {
                  await replaceImage(idx, { originalUrl, displayUrl, metadata: { libraryKey } });
                }
                setIsMagicOpen(false);
                setMagicChosenSrc(null);
                setMagicCurrentSrc(null);
                setMagicPromptState({ value: '', focused: false });
              } catch (e) {
                console.error('Failed to save magic edit', e);
              }
            }}
          >
            Discard and Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm cancel when there are unsaved or unapplied edits */}
      <Dialog open={confirmMagicCancelOpen} onClose={() => setConfirmMagicCancelOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Discard Changes?</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: magicPromptState.value ? 1 : 0 }}>
            You have unsaved changes. Do you want to discard them and exit the editor?
          </Typography>
          {magicPromptState.value && (
            <Typography variant="body2">
              Unapplied prompt: "<Box component="span" sx={{ fontWeight: 700 }}>{magicPromptState.value}</Box>"
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmMagicCancelOpen(false)}>Keep Editing</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setConfirmMagicCancelOpen(false);
              setIsMagicOpen(false);
              setMagicChosenSrc(null);
              setMagicCurrentSrc(null);
              setMagicPromptState({ value: '', focused: false });
            }}
          >
            Discard and Exit
          </Button>
        </DialogActions>
      </Dialog>
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
  renderSig: PropTypes.string,
  onPreviewRendered: PropTypes.func,
  onPreviewMetaChange: PropTypes.func,
  onEditingSessionChange: PropTypes.func,
};

export default CollagePreview; 

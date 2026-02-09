import React, { useState, useRef, useContext } from 'react';
import PropTypes from 'prop-types';
import {
  Menu,
  MenuItem,
  Box,
} from "@mui/material";
import { aspectRatioPresets } from '../config/CollageConfig';
import CanvasCollagePreview from './CanvasCollagePreview';
import { useNavigate, useLocation } from 'react-router-dom';
import CollageFrameSearchModal from './CollageFrameSearchModal';
import { get as getFromLibrary } from '../../../utils/library/storage';
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
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchSelectionBusy, setSearchSelectionBusy] = useState(false);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [activeExistingImageIndex, setActiveExistingImageIndex] = useState(null);
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
    setIsReplaceMode(false);
    setActiveExistingImageIndex(null);
    setActivePanelIndex(null);
    setActivePanelId(null);
  };

  const resolvePanelIdFromIndex = (index) => {
    try {
      const layoutPanel = selectedTemplate?.layout?.panels?.[index];
      const templatePanel = selectedTemplate?.panels?.[index];
      return layoutPanel?.id || templatePanel?.id || `panel-${index + 1}`;
    } catch (_) {
      return `panel-${index + 1}`;
    }
  };

  // Handle panel click - pro/admin users get memeSRC search picker, others use file picker fallback
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
      if (hasLibraryAccess) {
        setIsSearchModalOpen(true);
      } else {
        // Non-admins: open system file picker (legacy behavior)
        fileInputRef.current?.click();
      }
    } else {
      // Frame has image
      setIsReplaceMode(true);
      setActiveExistingImageIndex(imageIndex);
      if (hasLibraryAccess) {
        setIsSearchModalOpen(true);
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
      const panelId = resolvePanelIdFromIndex(activePanelIndex);

      setActivePanelId(panelId);
      const existingIdx = panelImageMapping?.[panelId];
      setActiveExistingImageIndex(typeof existingIdx === 'number' ? existingIdx : null);
      setIsReplaceMode(true);
      if (hasLibraryAccess) {
        setIsSearchModalOpen(true);
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

  // Handle selecting an image from memeSRC search results for the active panel
  const handleSearchResultSelect = async (selection) => {
    if (!selection || activePanelIndex === null || searchSelectionBusy) {
      return;
    }

    setSearchSelectionBusy(true);

    const clickedPanelId = activePanelId || resolvePanelIdFromIndex(activePanelIndex);

    const selected = {
      url: selection.imageUrl,
      metadata: {
        source: 'memesrc-search',
        cid: selection.cid,
        season: selection.season,
        episode: selection.episode,
        frame: selection.frame,
        searchTerm: selection.searchTerm,
      },
    };

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
      // Prefer fetching by library key to get a Blob we can normalize.
      if (libraryKey) {
        try {
          const blob = await getFromLibrary(libraryKey);
          return await buildNormalizedFromBlob(blob);
        } catch (e) {
          // Fall back to treating the URL directly below
        }
      }
      // For memeSRC search selections, fetch the frame URL and normalize to editor-safe image blobs.
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
        // Replace existing image in place.
        const normalized = await ensureNormalized(selected);
        const previousImage = selectedImages?.[activeExistingImageIndex];
        await replaceImage(activeExistingImageIndex, { ...normalized, metadata: selected?.metadata || {} });
        committed = true;
        setTimeout(() => revokeImageObjectUrls(previousImage), 0);
      } else {
        // Assign to empty panel.
        const currentLength = selectedImages.length;
        const normalized = await ensureNormalized(selected);
        const imageObj = { ...normalized, metadata: selected?.metadata || {} };
        await addMultipleImages([imageObj]);
        committed = true;
        const newMapping = {
          ...panelImageMapping,
          [clickedPanelId]: currentLength,
        };
        updatePanelImageMapping(newMapping);
      }
      setIsSearchModalOpen(false);
      clearActivePanelSelection();
    } finally {
      if (!committed) {
        try { tempBlobUrls.forEach(u => URL.revokeObjectURL(u)); } catch {}
      }
      setSearchSelectionBusy(false);
    }
  };

  // Close the search dialog and reset active state.
  const handleSearchModalClose = () => {
    if (searchSelectionBusy) return;
    setIsSearchModalOpen(false);
    clearActivePanelSelection();
  };


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

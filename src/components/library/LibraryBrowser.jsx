import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, Snackbar, Popover, List, ListItemButton, ListItemIcon, ListItemText, Divider, Collapse, RadioGroup, FormControlLabel, Radio, ListSubheader } from '@mui/material';
import { MoreVert, Refresh, Clear, DeleteForever, Sort, ExpandMore, ExpandLess, CloudUpload } from '@mui/icons-material';
import useLibraryData from '../../hooks/library/useLibraryData';
import useSelection from '../../hooks/library/useSelection';
import { get } from '../../utils/library/storage';
import UploadTile from './UploadTile';
import LibraryGrid from './LibraryGrid';
import LibraryTile from './LibraryTile';
import PreviewDialog from './PreviewDialog';
import ActionBar from './ActionBar';

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function LibraryBrowser({
  multiple = true,
  pageSize = 10,
  onSelect,
  onError,
  uploadEnabled = true,
  deleteEnabled = true,
  storageLevel = 'protected',
  refreshTrigger,
  sx,
  instantSelectOnClick = false,
  minSelected,
  maxSelected,
  showActionBar,
  actionBarLabel = 'Use Selected',
  onActionBarPrimary,
  selectionEnabled,
  previewOnClick,
  showSelectToggle = false,
  initialSelectMode = false,
  initialSelectedKeys,
  onSelectModeChange,
}) {
  const { items, loading, hasMore, loadMore, reload, uploadMany, remove } = useLibraryData({ pageSize, storageLevel, refreshToken: refreshTrigger });
  const { selectedKeys, isSelected, toggle, clear, count, atMax, setKeys } = useSelection({ multiple, maxSelected: typeof maxSelected === 'number' ? maxSelected : Infinity });
  const [selectMode, setSelectMode] = useState(Boolean(initialSelectMode));

  const [previewKey, setPreviewKey] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'info' });
  const [optionsAnchor, setOptionsAnchor] = useState(null);
  const [sortDisclosureOpen, setSortDisclosureOpen] = useState(false);
  const [sortOption, setSortOption] = useState('newest'); // 'newest' | 'oldest' | 'az'

  const sentinelRef = useRef(null);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return undefined;
    const el = sentinelRef.current;
    const io = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !loading) {
        loadMore();
      }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore, loading]);

  const parseTimestampFromKey = (key) => {
    try {
      const m = /library\/(\d+)-/.exec(key);
      if (m && m[1]) return Number(m[1]);
    } catch (e) { /* ignore */ }
    return 0;
  };

  const displayItems = useMemo(() => {
    const arr = items.slice();
    const getTime = (it) => {
      if (it?.key) return parseTimestampFromKey(it.key);
      if (typeof it?.createdAt === 'number') return it.createdAt;
      return 0;
    };
    arr.sort((a, b) => (sortOption === 'oldest' ? getTime(a) - getTime(b) : getTime(b) - getTime(a)));
    return arr;
  }, [items, sortOption]);

  const selectedItems = useMemo(() => items.filter((i) => selectedKeys.has(i.key)), [items, selectedKeys]);

  const handleUseSelected = useCallback(async () => {
    try {
      const concurrency = 5;
      const arr = selectedItems;
      const results = new Array(arr.length);
      /* eslint-disable no-await-in-loop */
      const processIndex = async (idx) => {
        const it = arr[idx];
        try {
          const blob = await get(it.key, { level: storageLevel });
          const dataUrl = await blobToDataUrl(blob);
          results[idx] = {
            originalUrl: dataUrl,
            displayUrl: dataUrl,
            metadata: { isFromLibrary: true, libraryKey: it.key },
          };
        } catch (e) {
          results[idx] = {
            originalUrl: it.url,
            displayUrl: it.url,
            metadata: { isFromLibrary: true, libraryKey: it.key },
          };
        }
      };
      const poolSize = Math.min(concurrency, arr.length);
      await Promise.all(
        Array.from({ length: poolSize }, (_, workerIndex) => (async () => {
          for (let idx = workerIndex; idx < arr.length; idx += poolSize) {
            await processIndex(idx);
          }
        })())
      );
      /* eslint-enable no-await-in-loop */
      if (onSelect) onSelect(results.filter(Boolean));
      clear();
    } catch (e) {
      if (onError) onError(e);
      setSnack({ open: true, message: 'Failed to load selected images', severity: 'error' });
    }
  }, [clear, onError, onSelect, selectedItems, storageLevel]);

  const handlePrimary = useCallback(async () => {
    if (typeof onActionBarPrimary === 'function') {
      await onActionBarPrimary({ selectedItems, storageLevel, clear });
    } else {
      await handleUseSelected();
    }
  }, [clear, handleUseSelected, onActionBarPrimary, selectedItems, storageLevel]);

  const handleDelete = useCallback(async (keys) => {
    try {
      await Promise.all(keys.map((k) => remove(k)));
      setSnack({ open: true, message: `Deleted ${keys.length} item(s)`, severity: 'success' });
    } catch (e) {
      setSnack({ open: true, message: 'Delete failed', severity: 'error' });
    } finally {
      setConfirm(null);
      clear();
      if (previewKey && keys.includes(previewKey)) {
        setPreviewKey(null);
      }
    }
  }, [clear, remove, previewKey]);

  const onTileClick = (key) => setPreviewKey(key);

  const previewIndex = useMemo(() => displayItems.findIndex((i) => i.key === previewKey), [displayItems, previewKey]);

  const handlePrev = useCallback(() => {
    if (previewIndex > 0) setPreviewKey(displayItems[previewIndex - 1]?.key ?? null);
  }, [displayItems, previewIndex]);

  const handleNext = useCallback(() => {
    if (previewIndex >= 0 && previewIndex < displayItems.length - 1) setPreviewKey(displayItems[previewIndex + 1]?.key ?? null);
  }, [displayItems, previewIndex]);

  const previewItem = useMemo(() => displayItems.find((i) => i.key === previewKey), [displayItems, previewKey]);

  const openOptions = (e) => setOptionsAnchor(e.currentTarget);
  const closeOptions = () => setOptionsAnchor(null);

  const handleClearSelected = () => {
    clear();
    closeOptions();
  };

  const handleDeleteSelected = () => {
    const keys = Array.from(selectedKeys);
    if (keys.length > 0) setConfirm({ keys });
    closeOptions();
  };

  const handleSetSort = (opt) => {
    setSortOption(opt);
    try {
      // Reload backing data from the correct end so pagination aligns with UI sort
      reload({ fromEnd: opt === 'oldest' });
    } catch (_) { /* ignore */ }
    closeOptions();
  };
  
  // Keyboard navigation for preview
  useEffect(() => {
    if (!previewKey) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') {
        setPreviewKey(null);
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [previewKey, handlePrev, handleNext]);

  // Rely on MUI Dialog's built-in scroll lock; no manual overrides to avoid sticky states
  
  // Apply initialSelectedKeys on mount or when keys change.
  // Re-apply if current selection doesn't match the requested keys (handles reopen/reset flows).
  const appliedInitialSelRef = useRef(null);
  useEffect(() => {
    if (!Array.isArray(initialSelectedKeys) || initialSelectedKeys.length === 0) return;
    const keySig = initialSelectedKeys.slice().sort().join('|');
    const currentSig = Array.from(selectedKeys).sort().join('|');
    // If we've already applied this signature AND current selection already matches, skip
    if (appliedInitialSelRef.current === keySig && currentSig === keySig) return;
    // Enable selection mode
    setSelectMode(true);
    if (typeof onSelectModeChange === 'function') onSelectModeChange(true);
    // Ensure selection exactly matches the provided keys atomically
    setKeys(initialSelectedKeys.filter(Boolean));
    appliedInitialSelRef.current = keySig;
  }, [initialSelectedKeys, onSelectModeChange, selectedKeys, setKeys]);

  // If we were given initialSelectedKeys but they aren't visible yet,
  // keep loading more pages until all selected keys are present or no more items.
  useEffect(() => {
    if (!Array.isArray(initialSelectedKeys) || initialSelectedKeys.length === 0) return;
    const itemKeySet = new Set(items.map((i) => i.key).filter(Boolean));
    const missing = initialSelectedKeys.filter((k) => k && !itemKeySet.has(k));
    if (missing.length > 0 && hasMore && !loading) {
      loadMore();
    }
  }, [initialSelectedKeys, items, hasMore, loading, loadMore]);
  
  // Instant select a single item when used as a picker with multiple={false}
  const handleInstantSelect = useCallback((item) => {
    // Optimistic selection: use the signed URL immediately to avoid delays
    const it = item;
    const result = {
      originalUrl: it.url,
      displayUrl: it.url,
      metadata: { isFromLibrary: true, libraryKey: it.key },
    };
    if (onSelect) onSelect([result]);
    clear();
  }, [clear, onSelect]);

  const effectiveSelectionEnabled = typeof selectionEnabled === 'boolean' ? selectionEnabled : selectMode;
  const effectivePreviewOnClick = typeof previewOnClick === 'boolean' ? previewOnClick : !effectiveSelectionEnabled;

  return (
    <Box sx={{ mt: 3, ...(sx || {}) }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        {/* Left: Upload button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {uploadEnabled && (
            <Button
              size="small"
              startIcon={<CloudUpload fontSize="small" />}
              onClick={async () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.multiple = multiple;
                input.onchange = async (e) => {
                  const files = Array.from(e.target.files || []);
                  const results = await uploadMany(files);
                  const successes = results.filter(Boolean);
                  const last = successes[successes.length - 1];
                  if (!multiple && instantSelectOnClick && last && last.key) {
                    await handleInstantSelect({ key: last.key, url: last.url });
                  }
                };
                input.click();
              }}
              sx={{
                minHeight: 34,
                px: 1.5,
                py: 0.5,
                borderRadius: 1.5,
                fontWeight: 700,
                textTransform: 'none',
                letterSpacing: 0.2,
                background: 'linear-gradient(45deg, #3d2459 30%, #6b42a1 90%)',
                border: '1px solid #8b5cc7',
                color: '#ffffff',
                boxShadow: '0 6px 16px rgba(107,66,161,0.35)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #472a69 30%, #7b4cb8 90%)',
                  borderColor: '#9f7ae0',
                  boxShadow: '0 8px 18px rgba(127,86,190,0.45)'
                },
                '& .MuiButton-startIcon': { mr: 1 },
                '& .MuiButton-startIcon > *:nth-of-type(1)': { color: '#ffffff' },
                '&.Mui-disabled': {
                  opacity: 0.5,
                  color: '#ffffff',
                  borderColor: 'rgba(255,255,255,0.3)'
                }
              }}
            >
              Upload
            </Button>
          )}
        </Box>

        {/* Right: Select toggle button and options */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {showSelectToggle && (
            <Button
              size="small"
              onClick={() => {
                const next = !effectiveSelectionEnabled;
                setSelectMode(next);
                if (!next) {
                  try { clear(); } catch (_) { /* ignore */ }
                }
                if (typeof onSelectModeChange === 'function') onSelectModeChange(next);
              }}
              sx={{
                minHeight: 34,
                px: 1.5,
                py: 0.5,
                borderRadius: 1.5,
                fontWeight: 800,
                textTransform: 'none',
                letterSpacing: 0.2,
                border: effectiveSelectionEnabled ? '1px solid #4b5563' : '1px solid rgba(255,255,255,0.28)',
                color: '#e5e7eb',
                background: effectiveSelectionEnabled ? 'linear-gradient(45deg, #1f2937 30%, #374151 90%)' : 'transparent',
                '&:hover': {
                  background: effectiveSelectionEnabled ? 'linear-gradient(45deg, #253042 30%, #3f4856 90%)' : 'rgba(255,255,255,0.06)',
                },
              }}
            >
              {effectiveSelectionEnabled ? 'Select: On' : 'Select: Off'}
            </Button>
          )}
          <IconButton
            aria-label="Library options"
            onClick={openOptions}
            size="small"
            sx={{
              color: '#8b5cc7',
              border: '1px solid rgba(139,92,199,0.45)',
              bgcolor: 'rgba(139,92,199,0.08)',
              '&:hover': { bgcolor: 'rgba(139,92,199,0.18)', borderColor: 'rgba(139,92,199,0.75)' }
            }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
          <Popover
            open={Boolean(optionsAnchor)}
            anchorEl={optionsAnchor}
            onClose={closeOptions}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{ sx: { width: 300, borderRadius: 2, mt: 1, maxHeight: '70vh', overflowY: 'auto' } }}
          >
            <List
              dense
              disablePadding
              subheader={
                <ListSubheader component="div" sx={{ bgcolor: 'transparent', fontWeight: 700 }}>
                  Library options
                </ListSubheader>
              }
            >
              <ListItemButton onClick={() => { reload(); closeOptions(); }}>
                <ListItemIcon><Refresh fontSize="small" /></ListItemIcon>
                <ListItemText primary="Refresh" />
              </ListItemButton>
              <Divider sx={{ my: 0.5 }} />

              {count > 0 && (
                <>
                  <ListSubheader component="div" sx={{ bgcolor: 'transparent', fontWeight: 700, lineHeight: 2 }}>
                    Selection
                  </ListSubheader>
                  <ListItemButton onClick={handleClearSelected}>
                    <ListItemIcon><Clear fontSize="small" /></ListItemIcon>
                    <ListItemText primary="Clear selected" />
                  </ListItemButton>
                  {deleteEnabled && (
                    <ListItemButton onClick={handleDeleteSelected} sx={{ color: 'error.main' }}>
                      <ListItemIcon><DeleteForever fontSize="small" color="error" /></ListItemIcon>
                      <ListItemText primary="Delete selected" />
                    </ListItemButton>
                  )}
                  <Divider sx={{ my: 0.5 }} />
                </>
              )}

              {items.length > 1 && (
                <ListItemButton onClick={() => setSortDisclosureOpen((v) => !v)}>
                <ListItemIcon><Sort fontSize="small" /></ListItemIcon>
                  <ListItemText primary="Sorting" secondary={
                    sortOption === 'newest' ? 'Newest first' : 'Oldest first'
                  } />
                {sortDisclosureOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
              )}
              {items.length > 1 && (
                <Collapse in={sortDisclosureOpen} timeout="auto" unmountOnExit>
                  <Box sx={{ pl: 6, pb: 1 }}>
                    <RadioGroup
                      aria-label="Sort order"
                      value={sortOption}
                      onChange={(e) => handleSetSort(e.target.value)}
                    >
                      <FormControlLabel value="newest" control={<Radio size="small" />} label="Newest first" />
                      <FormControlLabel value="oldest" control={<Radio size="small" />} label="Oldest first" />
                    </RadioGroup>
                  </Box>
                </Collapse>
              )}
            </List>
          </Popover>
        </Box>
      </Box>

      <LibraryGrid
        items={displayItems}
        showUploadTile={uploadEnabled}
        uploadTile={<UploadTile disabled={loading} onFiles={async (files) => {
          const results = await uploadMany(files);
          const successes = results.filter(Boolean);
          const last = successes[successes.length - 1];
          // If single-select instant mode, auto-select the last uploaded image
          if (!multiple && instantSelectOnClick && last && last.key) {
            await handleInstantSelect({ key: last.key, url: last.url });
          }
        }} />}
        renderTile={(item) => (
          <LibraryTile
            item={item}
            selected={effectiveSelectionEnabled ? isSelected(item.key) : false}
            disabled={effectiveSelectionEnabled ? (Boolean(maxSelected) && atMax && !isSelected(item.key)) : false}
            showPreviewIcon={effectiveSelectionEnabled}
            selectionMode={effectiveSelectionEnabled}
            onClick={() => {
              if (effectivePreviewOnClick) {
                onTileClick(item.key);
              } else if (!multiple && instantSelectOnClick) {
                handleInstantSelect(item);
              } else if (effectiveSelectionEnabled) {
                toggle(item.key);
              }
            }}
            onPreview={() => item.key && onTileClick(item.key)}
          />
        )}
      />

      {/* infinite scroll sentinel */}
      <Box ref={sentinelRef} sx={{ height: 1 }} aria-hidden />

      <PreviewDialog
        open={Boolean(previewKey)}
        onClose={() => setPreviewKey(null)}
        imageUrl={previewItem?.url}
        imageKey={previewItem?.key}
        storageLevel={storageLevel}
        onDelete={deleteEnabled ? () => setConfirm({ keys: [previewKey] }) : undefined}
        titleId="library-preview-title"
        onPrev={handlePrev}
        onNext={handleNext}
        hasPrev={previewIndex > 0}
        hasNext={previewIndex >= 0 && previewIndex < displayItems.length - 1}
        isSelected={previewKey ? isSelected(previewKey) : false}
        onToggleSelected={previewKey ? async () => {
          // In single-select mode, immediately pass selection to caller and close
          if (multiple === false) {
            try {
              await handleInstantSelect({ key: previewItem?.key, url: previewItem?.url });
            } finally {
              setPreviewKey(null);
            }
            return;
          }
          // Multi-select: ensure select mode is enabled, toggle selection, then close
          if (!effectiveSelectionEnabled) {
            setSelectMode(true);
            if (typeof onSelectModeChange === 'function') onSelectModeChange(true);
          }
          toggle(previewKey);
          setPreviewKey(null);
        } : undefined}
        footerMode={!multiple ? 'single' : 'default'}
      />

      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} aria-labelledby="confirm-delete-title">
        <DialogTitle id="confirm-delete-title">Delete image{confirm?.keys?.length > 1 ? 's' : ''}?</DialogTitle>
        <DialogContent>
          <DialogContentText>This cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button color="error" onClick={() => handleDelete(confirm.keys)}>Delete</Button>
        </DialogActions>
      </Dialog>

      {(showActionBar || false) && (
        <ActionBar
          open={count > 0}
          primaryLabel={actionBarLabel}
          count={count}
          onPrimary={handlePrimary}
          disabled={typeof minSelected === 'number' ? count < minSelected : false}
        />
      )}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))} message={snack.message} />
    </Box>
  );
}

LibraryBrowser.propTypes = {
  multiple: PropTypes.bool,
  pageSize: PropTypes.number,
  onSelect: PropTypes.func.isRequired,
  onError: PropTypes.func,
  uploadEnabled: PropTypes.bool,
  deleteEnabled: PropTypes.bool,
  storageLevel: PropTypes.oneOf(['private', 'protected']),
  refreshTrigger: PropTypes.any,
  sx: PropTypes.any,
    instantSelectOnClick: PropTypes.bool,
  minSelected: PropTypes.number,
  maxSelected: PropTypes.number,
  showActionBar: PropTypes.bool,
  actionBarLabel: PropTypes.string,
  onActionBarPrimary: PropTypes.func,
  selectionEnabled: PropTypes.bool,
  previewOnClick: PropTypes.bool,
  showSelectToggle: PropTypes.bool,
  initialSelectMode: PropTypes.bool,
  initialSelectedKeys: PropTypes.arrayOf(PropTypes.string),
  onSelectModeChange: PropTypes.func,
};

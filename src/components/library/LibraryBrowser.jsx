import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, Snackbar, Popover, List, ListItemButton, ListItemIcon, ListItemText, Divider, Collapse, RadioGroup, FormControlLabel, Radio, ListSubheader, TextField, InputAdornment, Switch } from '@mui/material';
import { MoreVert, Refresh, Clear, DeleteForever, Sort, ExpandMore, ExpandLess, Search } from '@mui/icons-material';
import useLibraryData from '../../hooks/library/useLibraryData';
import useSelection from '../../hooks/library/useSelection';
import { get } from '../../utils/library/storage';
import UploadTile from './UploadTile';
import LibraryGrid from './LibraryGrid';
import LibraryTile from './LibraryTile';
import PreviewDialog from './PreviewDialog';
import ActionBar from './ActionBar';
import { normalizeString } from '../../utils/search/normalize';
import { getMetadataForKey, DEFAULT_LIBRARY_METADATA } from '../../utils/library/metadata';

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
  storageLevel = 'private',
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
  onSelectModeChange,
  onSelectionChange,
  exposeActions,
}) {
  const { items, loading, hasMore, loadMore, reload, uploadMany, remove } = useLibraryData({ pageSize, storageLevel, refreshToken: refreshTrigger });
  const { selectedKeys, orderedKeys, isSelected, toggle, clear, count, atMax } = useSelection({ multiple, maxSelected: typeof maxSelected === 'number' ? maxSelected : Infinity });
  const [selectMode, setSelectMode] = useState(Boolean(initialSelectMode));

  const [previewKey, setPreviewKey] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'info' });
  const [optionsAnchor, setOptionsAnchor] = useState(null);
  const [sortDisclosureOpen, setSortDisclosureOpen] = useState(false);
  const [sortOption, setSortOption] = useState('newest'); // 'newest' | 'oldest' | 'az'
  const [searchQuery, setSearchQuery] = useState('');
  const [metaByKey, setMetaByKey] = useState({}); // { [key]: { tags, description, defaultCaption } }

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

  // Background-load metadata for visible items so search can include tags/description/captions
  useEffect(() => {
    let cancelled = false;
    const keys = displayItems.map((i) => i.key).filter(Boolean);
    const missing = keys.filter((k) => !(k in metaByKey));
    if (missing.length === 0) return undefined;
    const worker = async () => {
      // Small concurrency to avoid hammering storage
      const pool = 4;
      await Promise.all(Array.from({ length: Math.min(pool, missing.length) }, async (_, wi) => {
        for (let idx = wi; idx < missing.length; idx += pool) {
          const k = missing[idx];
          try {
            const meta = await getMetadataForKey(k, { level: storageLevel });
            if (!cancelled) setMetaByKey((prev) => (prev[k] ? prev : { ...prev, [k]: meta }));
          } catch (_) {
            if (!cancelled) setMetaByKey((prev) => (prev[k] ? prev : { ...prev, [k]: { ...DEFAULT_LIBRARY_METADATA } }));
          }
        }
      }));
    };
    worker();
    return () => { cancelled = true; };
  }, [displayItems, metaByKey, storageLevel]);

  const normalizedQuery = useMemo(() => normalizeString(searchQuery), [searchQuery]);

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return displayItems;
    return displayItems.filter((it) => {
      const meta = metaByKey[it.key] || DEFAULT_LIBRARY_METADATA;
      const combined = [
        it.key || '',
        it.url || '',
        ...(Array.isArray(meta?.tags) ? meta.tags : []),
        meta?.description || '',
        meta?.defaultCaption || '',
      ].join(' ');
      return normalizeString(combined).includes(normalizedQuery);
    });
  }, [displayItems, metaByKey, normalizedQuery]);

  const getItemId = useCallback((it) => (it?.id ?? it?.key), []);
  const orderIndexByKey = useMemo(() => {
    const m = new Map();
    orderedKeys.forEach((k, i) => m.set(k, i + 1));
    return m;
  }, [orderedKeys]);
  // Preserve user selection order by mapping ordered keys to items
  const selectedItems = useMemo(() => {
    if (!orderedKeys || orderedKeys.length === 0) return [];
    const byId = new Map(items.map((i) => [getItemId(i), i]));
    return orderedKeys.map((k) => byId.get(k)).filter(Boolean);
  }, [items, orderedKeys, getItemId]);

  const handleUseSelected = useCallback(async () => {
    try {
      const concurrency = 5;
      // Only operate on fully uploaded items (with a storage key)
      const arr = selectedItems.filter((i) => Boolean(i?.key));
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

  // Expose selection count to parent (for external action bars)
  useEffect(() => {
    if (typeof onSelectionChange === 'function') {
      // Report only fully ready selections (with keys) so parents can enable actions accurately
      const readyCount = items.filter((i) => selectedKeys.has(getItemId(i)) && Boolean(i?.key)).length;
      onSelectionChange({ count: readyCount, minSelected: typeof minSelected === 'number' ? minSelected : 0 });
    }
  }, [items, selectedKeys, getItemId, minSelected, onSelectionChange]);

  // Expose primary/clear actions to parent for external bottom bar control
  useEffect(() => {
    if (typeof exposeActions === 'function') {
      exposeActions({ primary: handlePrimary, clearSelection: clear });
    }
  }, [exposeActions, handlePrimary, clear]);

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

  const previewIndex = useMemo(() => filteredItems.findIndex((i) => i.key === previewKey), [filteredItems, previewKey]);

  const handlePrev = useCallback(() => {
    if (previewIndex > 0) setPreviewKey(filteredItems[previewIndex - 1]?.key ?? null);
  }, [filteredItems, previewIndex]);

  const handleNext = useCallback(() => {
    if (previewIndex >= 0 && previewIndex < filteredItems.length - 1) setPreviewKey(filteredItems[previewIndex + 1]?.key ?? null);
  }, [filteredItems, previewIndex]);

  const previewItem = useMemo(() => filteredItems.find((i) => i.key === previewKey), [filteredItems, previewKey]);

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
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'column' }, gap: 1.25, mb: 1 }}>
        {/* Full-width Search */}
        <TextField
          size="medium"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search your library..."
          aria-label="Search library items"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {searchQuery ? (
                    <IconButton size="small" aria-label="Clear search" onClick={() => setSearchQuery('')}>
                      <Clear fontSize="small" />
                    </IconButton>
                  ) : null}
                  <IconButton
                    size="small"
                    aria-label="Library options"
                    onClick={openOptions}
                    sx={{
                      color: '#8b5cc7',
                      border: '1px solid rgba(139,92,199,0.45)',
                      bgcolor: 'rgba(139,92,199,0.08)',
                      '&:hover': { bgcolor: 'rgba(139,92,199,0.18)', borderColor: 'rgba(139,92,199,0.75)' }
                    }}
                  >
                    <MoreVert fontSize="small" />
                  </IconButton>
                </Box>
              </InputAdornment>
            ),
          }}
          sx={{
            width: '100%',
            '& .MuiInputBase-root': {
              borderRadius: 2,
              backgroundColor: 'rgba(255,255,255,0.04)',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
            },
          }}
        />

        {/* Full-width Multi-select toggle */}
        {showSelectToggle && (
          <Box sx={{ width: '100%' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 1.5,
                py: 1,
                borderRadius: 1.5,
                border: effectiveSelectionEnabled ? '1px solid #4b5563' : '1px solid rgba(255,255,255,0.18)',
                bgcolor: effectiveSelectionEnabled ? 'rgba(79,70,229,0.15)' : 'rgba(255,255,255,0.04)',
                transition: 'all 0.2s ease',
              }}
            >
              <Box sx={{ fontWeight: 800, color: '#e5e7eb' }}>
                {effectiveSelectionEnabled ? 'Multi-select enabled' : 'Enable multi-select'}
              </Box>
              <Switch
                checked={effectiveSelectionEnabled}
                onChange={() => {
                  const next = !effectiveSelectionEnabled;
                  setSelectMode(next);
                  if (!next) {
                    try { clear(); } catch (_) { /* ignore */ }
                  }
                  if (typeof onSelectModeChange === 'function') onSelectModeChange(next);
                }}
                inputProps={{ 'aria-label': 'Enable multi-select' }}
              />
            </Box>
          </Box>
        )}

        {/* Options popover */}
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

      <LibraryGrid
        items={filteredItems}
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
            selected={effectiveSelectionEnabled ? isSelected(getItemId(item)) : false}
            disabled={effectiveSelectionEnabled ? (Boolean(maxSelected) && atMax && !isSelected(getItemId(item))) : false}
            showPreviewIcon={effectiveSelectionEnabled}
            selectionMode={effectiveSelectionEnabled}
            selectionIndex={effectiveSelectionEnabled ? (orderIndexByKey.get(getItemId(item)) || null) : null}
            onClick={() => {
              if (effectivePreviewOnClick) {
                onTileClick(item.key);
              } else if (!multiple && instantSelectOnClick) {
                handleInstantSelect(item);
              } else if (effectiveSelectionEnabled) {
                toggle(getItemId(item));
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
        isSelected={previewItem ? isSelected(getItemId(previewItem)) : false}
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
          toggle(getItemId(previewItem));
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
  onSelectModeChange: PropTypes.func,
  onSelectionChange: PropTypes.func,
  exposeActions: PropTypes.func,
};

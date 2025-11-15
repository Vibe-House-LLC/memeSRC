import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API } from 'aws-amplify';
import PropTypes from 'prop-types';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, Snackbar, Popover, List, ListItemButton, ListItemIcon, ListItemText, Divider, Collapse, RadioGroup, FormControlLabel, Radio, ListSubheader, TextField, InputAdornment } from '@mui/material';
import { MoreVert, MoreHoriz, Refresh, Clear, DeleteForever, Sort, ExpandMore, ExpandLess, Search, DoneAll } from '@mui/icons-material';
import useLibraryData from '../../hooks/library/useLibraryData';
import useSelection from '../../hooks/library/useSelection';
import { get } from '../../utils/library/storage';
import { trackUsageEvent } from '../../utils/trackUsageEvent';
import UploadSection from './UploadSection';
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
  renderHeader,
}) {
  const { items, loading, hasMore, loadMore, reload, uploadMany, removeFromState } = useLibraryData({ pageSize, storageLevel, refreshToken: refreshTrigger });
  const { selectedKeys, orderedKeys, isSelected, toggle, clear, count, atMax } = useSelection({ multiple, maxSelected: typeof maxSelected === 'number' ? maxSelected : Infinity });
  const [selectMode, setSelectMode] = useState(Boolean(initialSelectMode));

  const [previewKey, setPreviewKey] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'info' });
  const [optionsAnchor, setOptionsAnchor] = useState(null);
  const [optionsPlacement, setOptionsPlacement] = useState('below'); // 'below' | 'above'
  const [sortDisclosureOpen, setSortDisclosureOpen] = useState(false);
  const [sortOption, setSortOption] = useState('newest'); // 'newest' | 'oldest' | 'az'
  const [searchQuery, setSearchQuery] = useState('');
  const [metaByKey, setMetaByKey] = useState({}); // { [key]: LibraryMetadata }
  const [deletingKeys, setDeletingKeys] = useState(() => new Set());

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
    const arr = items.map((item) => {
      if (!item?.key) return item;
      const meta = metaByKey[item.key];
      if (!meta) return item;
      return { ...item, metadata: { ...DEFAULT_LIBRARY_METADATA, ...meta } };
    });
    const getTime = (it) => {
      if (it?.key) return parseTimestampFromKey(it.key);
      if (typeof it?.createdAt === 'number') return it.createdAt;
      return 0;
    };
    arr.sort((a, b) => (sortOption === 'oldest' ? getTime(a) - getTime(b) : getTime(b) - getTime(a)));
    return arr;
  }, [items, metaByKey, sortOption]);

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

  const ensureMetadataForKey = useCallback(async (key) => {
    if (!key) return { ...DEFAULT_LIBRARY_METADATA };
    if (metaByKey[key]) return metaByKey[key];
    try {
      const meta = await getMetadataForKey(key, { level: storageLevel });
      setMetaByKey((prev) => ({ ...prev, [key]: meta }));
      return meta;
    } catch (_) {
      const fallback = { ...DEFAULT_LIBRARY_METADATA };
      setMetaByKey((prev) => ({ ...prev, [key]: fallback }));
      return fallback;
    }
  }, [metaByKey, storageLevel]);

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
    return orderedKeys
      .map((k) => {
        const item = byId.get(k);
        if (!item) return null;
        if (!item.key) return item;
        const meta = metaByKey[item.key];
        if (!meta) return item;
        return { ...item, metadata: { ...DEFAULT_LIBRARY_METADATA, ...meta } };
      })
      .filter(Boolean);
  }, [items, metaByKey, orderedKeys, getItemId]);

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
          const meta = await ensureMetadataForKey(it.key);
          const mergedMeta = { ...DEFAULT_LIBRARY_METADATA, ...(meta || {}) };
          results[idx] = {
            originalUrl: dataUrl,
            displayUrl: dataUrl,
            metadata: { ...mergedMeta, isFromLibrary: true, libraryKey: it.key },
          };
        } catch (e) {
          const meta = await ensureMetadataForKey(it.key);
          const mergedMeta = { ...DEFAULT_LIBRARY_METADATA, ...(meta || {}) };
          results[idx] = {
            originalUrl: it.url,
            displayUrl: it.url,
            metadata: { ...mergedMeta, isFromLibrary: true, libraryKey: it.key },
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
  }, [clear, ensureMetadataForKey, onError, onSelect, selectedItems, storageLevel]);

  const handlePrimary = useCallback(async () => {
    const prepareItems = async () => Promise.all(
      (selectedItems || []).map(async (item) => {
        if (!item?.key) return item;
        const meta = await ensureMetadataForKey(item.key);
        return { ...item, metadata: { ...DEFAULT_LIBRARY_METADATA, ...(meta || {}) } };
      })
    );

    if (typeof onActionBarPrimary === 'function') {
      const enriched = await prepareItems();
      await onActionBarPrimary({ selectedItems: enriched, storageLevel, clear });
    } else {
      await handleUseSelected();
    }
  }, [clear, ensureMetadataForKey, handleUseSelected, onActionBarPrimary, selectedItems, storageLevel]);

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
      await API.post('publicapi', '/library/delete', {
        body: { keys },
      });
      trackUsageEvent('library_delete', {
        source: 'LibraryBrowser',
        storageLevel,
        deletedCount: keys.length,
        keys,
      });
      // Surgically remove deleted items from local state to avoid full reload
      try { removeFromState(keys); } catch (_) { /* ignore */ }
      setSnack({ open: true, message: `Deleted ${keys.length} item(s)`, severity: 'success' });
    } catch (e) {
      setSnack({ open: true, message: 'Delete failed', severity: 'error' });
    } finally {
      // Remove from deleting set
      setDeletingKeys((prev) => {
        const next = new Set(prev);
        keys.forEach((k) => next.delete(k));
        return next;
      });
      clear();
      if (previewKey && keys.includes(previewKey)) {
        setPreviewKey(null);
      }
    }
  }, [clear, previewKey, removeFromState, storageLevel]);

  const onTileClick = (key) => setPreviewKey(key);

  const previewIndex = useMemo(() => filteredItems.findIndex((i) => i.key === previewKey), [filteredItems, previewKey]);

  const handlePrev = useCallback(() => {
    if (previewIndex > 0) setPreviewKey(filteredItems[previewIndex - 1]?.key ?? null);
  }, [filteredItems, previewIndex]);

  const handleNext = useCallback(() => {
    if (previewIndex >= 0 && previewIndex < filteredItems.length - 1) setPreviewKey(filteredItems[previewIndex + 1]?.key ?? null);
  }, [filteredItems, previewIndex]);

  const previewItem = useMemo(() => filteredItems.find((i) => i.key === previewKey), [filteredItems, previewKey]);

  const openOptions = (e, opts = {}) => {
    setOptionsAnchor(e.currentTarget);
    if (opts && opts.preferAbove) {
      setOptionsPlacement('above');
    } else {
      setOptionsPlacement('below');
    }
  };
  const closeOptions = () => setOptionsAnchor(null);

  const handleClearSelected = () => {
    clear();
    closeOptions();
  };

  const handleDeleteSelected = () => {
    // Use actual storage keys for deletion, not selection IDs
    const keys = Array.from(new Set(selectedItems.map((i) => i?.key).filter(Boolean)));
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

  const handleToggleSelectMode = React.useCallback(() => {
    const next = !effectiveSelectionEnabled;
    setSelectMode(next);
    if (!next) {
      try { clear(); } catch (_) { /* ignore */ }
    }
    if (typeof onSelectModeChange === 'function') onSelectModeChange(next);
  }, [effectiveSelectionEnabled, clear, onSelectModeChange]);

  const headerNode = useMemo(() => {
    if (typeof renderHeader !== 'function') return null;
    return renderHeader({
      count,
      minSelected: typeof minSelected === 'number' ? minSelected : 0,
      maxSelected: typeof maxSelected === 'number' ? maxSelected : null,
      selectionEnabled: effectiveSelectionEnabled,
    });
  }, [renderHeader, count, minSelected, maxSelected, effectiveSelectionEnabled]);

  return (
    <Box sx={{ mt: { xs: 0.25, sm: 3 }, ...(sx || {}) }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'column' }, gap: 1.25, mb: 1 }}>
        {headerNode ? (
          <Box>
            {headerNode}
          </Box>
        ) : null}
        {/* Upload section (moved from grid tile) */}
        {uploadEnabled && (
          <UploadSection
            disabled={loading}
            onFiles={async (files) => {
              const results = await uploadMany(files);
              const indexedSuccesses = results
                .map((result, index) => ({ result, index }))
                .filter(({ result }) => Boolean(result?.key));

              if (indexedSuccesses.length > 0) {
                const filesForEvent = indexedSuccesses.map(({ result, index }) => {
                  const file = files[index];
                  const meta = { key: result.key };
                  if (file?.name) meta.fileName = file.name;
                  if (typeof file?.size === 'number') meta.fileSize = file.size;
                  if (file?.type) meta.fileType = file.type;
                  return meta;
                });

                trackUsageEvent('library_upload', {
                  source: 'LibraryBrowser',
                  storageLevel,
                  uploadedCount: indexedSuccesses.length,
                  batchSize: files.length,
                  files: filesForEvent,
                });
              }

              const lastSuccess = indexedSuccesses[indexedSuccesses.length - 1]?.result;
              if (!multiple && instantSelectOnClick && lastSuccess && lastSuccess.key) {
                await handleInstantSelect({ key: lastSuccess.key, url: lastSuccess.url });
              }
            }}
          />
        )}
        {/* Search with inline controls */}
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
                  {showSelectToggle && (
                    <IconButton
                      size="small"
                      aria-label={effectiveSelectionEnabled ? 'Disable multi-select' : 'Enable multi-select'}
                      onClick={handleToggleSelectMode}
                      sx={{
                        color: effectiveSelectionEnabled ? '#ffffff' : '#8b5cc7',
                        border: effectiveSelectionEnabled ? '1px solid rgba(139,92,199,0.85)' : '1px solid rgba(139,92,199,0.45)',
                        bgcolor: effectiveSelectionEnabled ? 'rgba(139,92,199,0.35)' : 'rgba(139,92,199,0.08)',
                        '&:hover': {
                          bgcolor: effectiveSelectionEnabled ? 'rgba(139,92,199,0.45)' : 'rgba(139,92,199,0.18)',
                          borderColor: 'rgba(139,92,199,0.75)'
                        }
                      }}
                    >
                      <DoneAll fontSize="small" />
                    </IconButton>
                  )}
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

        {/* Options popover */}
        <Popover
          open={Boolean(optionsAnchor)}
          anchorEl={optionsAnchor}
          onClose={closeOptions}
          anchorOrigin={optionsPlacement === 'above' ? { vertical: 'top', horizontal: 'right' } : { vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={optionsPlacement === 'above' ? { vertical: 'bottom', horizontal: 'right' } : { vertical: 'top', horizontal: 'right' }}
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
        showUploadTile={false}
        uploadTile={null}
        renderTile={(item) => (
          <LibraryTile
            item={deletingKeys.has(item.key) ? { ...item, loading: true } : item}
            selected={effectiveSelectionEnabled ? isSelected(getItemId(item)) : false}
            disabled={(deletingKeys.has(item.key)) || (effectiveSelectionEnabled ? (Boolean(maxSelected) && atMax && !isSelected(getItemId(item))) : false)}
            showPreviewIcon={effectiveSelectionEnabled}
            selectionMode={effectiveSelectionEnabled}
            selectionIndex={effectiveSelectionEnabled ? (orderIndexByKey.get(getItemId(item)) || null) : null}
            onClick={() => {
              if (deletingKeys.has(item.key)) {
                return;
              }
              if (effectivePreviewOnClick) {
                onTileClick(item.key);
              } else if (!multiple && instantSelectOnClick) {
                handleInstantSelect(item);
              } else if (effectiveSelectionEnabled) {
                toggle(getItemId(item));
              }
            }}
            onPreview={() => !deletingKeys.has(item.key) && item.key && onTileClick(item.key)}
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
          <Button color="error" onClick={() => {
            const keys = (confirm?.keys || []).slice();
            setConfirm(null); // close immediately
            if (keys.length === 0) return;
            setDeletingKeys((prev) => {
              const next = new Set(prev);
              keys.forEach((k) => next.add(k));
              return next;
            });
            // fire and forget; UI shows spinners while we await removal
            void handleDelete(keys);
          }}>Delete</Button>
        </DialogActions>
      </Dialog>

      {(showActionBar || false) && (
        <ActionBar
          open={count > 0}
          primaryLabel={actionBarLabel}
          count={count}
          onPrimary={handlePrimary}
          disabled={typeof minSelected === 'number' ? count < minSelected : false}
          onSecondary={(e) => openOptions(e, { preferAbove: true })}
          secondaryAriaLabel="More options"
          secondaryIcon={<MoreHoriz />}
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
  renderHeader: PropTypes.func,
};

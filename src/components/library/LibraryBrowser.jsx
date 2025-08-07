import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, Snackbar, Typography, Popover, List, ListItemButton, ListItemIcon, ListItemText, Divider, Collapse, RadioGroup, FormControlLabel, Radio, ListSubheader } from '@mui/material';
import { MoreVert, Refresh, Clear, DeleteForever, Sort, ExpandMore, ExpandLess } from '@mui/icons-material';
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
  isAdmin,
  sx,
}) {
  const { items, loading, hasMore, loadMore, reload, upload, remove } = useLibraryData({ pageSize, storageLevel, refreshToken: refreshTrigger });
  const { selectedKeys, isSelected, toggle, clear, count } = useSelection({ multiple });

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
    if (sortOption === 'oldest') {
      arr.sort((a, b) => parseTimestampFromKey(a.key) - parseTimestampFromKey(b.key));
    } else {
      // newest first (default)
      arr.sort((a, b) => parseTimestampFromKey(b.key) - parseTimestampFromKey(a.key));
    }
    return arr;
  }, [items, sortOption]);

  const selectedItems = useMemo(() => items.filter((i) => selectedKeys.has(i.key)), [items, selectedKeys]);

  const handleUseSelected = useCallback(async () => {
    try {
      const limit = 5;
      const arr = selectedItems;
      const results = new Array(arr.length);
      let cursor = 0;
      const startWorker = async () => {
        if (cursor >= arr.length) return;
        const idx = cursor + 1 - 1; // use numeric operations without ++
        cursor += 1;
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
        await startWorker();
      };
      await Promise.all(Array.from({ length: Math.min(limit, arr.length) }, () => startWorker()));
      if (onSelect) onSelect(results.filter(Boolean));
      clear();
    } catch (e) {
      if (onError) onError(e);
      setSnack({ open: true, message: 'Failed to load selected images', severity: 'error' });
    }
  }, [clear, onError, onSelect, selectedItems, storageLevel]);

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
    if (previewIndex > 0) setPreviewKey(items[previewIndex - 1]?.key ?? null);
  }, [items, previewIndex]);

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

  return (
    <Box sx={{ mt: 3, ...(sx || {}) }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>My Library</Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>{items.length} item{items.length === 1 ? '' : 's'} • {count} selected</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
        showUploadTile={uploadEnabled && isAdmin}
        uploadTile={<UploadTile disabled={loading} onFiles={async (files) => {
          await files.reduce(async (p, f) => {
            await p;
            await upload(f);
          }, Promise.resolve());
        }} />}
        renderTile={(item) => (
          <LibraryTile
            item={item}
            selected={isSelected(item.key)}
            onClick={() => toggle(item.key)}
            onPreview={() => onTileClick(item.key)}
          />
        )}
      />

      {/* infinite scroll sentinel */}
      <Box ref={sentinelRef} sx={{ height: 1 }} aria-hidden />

      <PreviewDialog
        open={Boolean(previewKey)}
        onClose={() => setPreviewKey(null)}
        imageUrl={previewItem?.url}
        onDelete={deleteEnabled ? () => setConfirm({ keys: [previewKey] }) : undefined}
        titleId="library-preview-title"
        onPrev={handlePrev}
        onNext={handleNext}
        hasPrev={previewIndex > 0}
        hasNext={previewIndex >= 0 && previewIndex < displayItems.length - 1}
        isSelected={previewKey ? isSelected(previewKey) : false}
        onToggleSelected={previewKey ? () => toggle(previewKey) : undefined}
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

      {isAdmin && (
        <ActionBar open={count > 0} primaryLabel="Make Collage" count={count} onPrimary={handleUseSelected} />
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
  isAdmin: PropTypes.bool,
  sx: PropTypes.any,
};
import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Snackbar, Typography } from '@mui/material';
import { Add } from '@mui/icons-material';
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
  favoriteEnabled = true,
  storageLevel = 'protected',
  refreshTrigger,
  userSub,
  isAdmin,
  sx,
}) {
  const { items, loading, loadMore, reload, upload, remove, toggleFavorite, favorites } = useLibraryData({ pageSize, storageLevel, refreshToken: refreshTrigger, userSub });
  const { selectedKeys, isSelected, toggle, clear, count } = useSelection({ multiple });

  const [previewKey, setPreviewKey] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'info' });

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
    }
  }, [clear, remove]);

  const onTileClick = (key) => setPreviewKey(key);

  const previewItem = useMemo(() => items.find((i) => i.key === previewKey), [items, previewKey]);

  return (
    <Box sx={{ mt: 3, ...(sx || {}) }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">My Library</Typography>
        {favoriteEnabled && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button size="small" startIcon={<Add />} onClick={() => reload()} aria-label="Refresh library">Refresh</Button>
          </Box>
        )}
      </Box>

      <LibraryGrid
        items={items}
        showUploadTile={uploadEnabled && isAdmin}
        uploadTile={<UploadTile disabled={loading} onFiles={async (files) => {
          // Upload sequentially using promise chaining to satisfy lint rules
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
            onToggleFavorite={() => toggleFavorite(item.key)}
            isFavorite={Boolean(favorites[item.key])}
            onPreview={() => onTileClick(item.key)}
          />
        )}
      />

      {/* Infinite sentry */}
      {!loading && items.length > 0 && (
        <Box sx={{ height: 1 }} aria-hidden onMouseEnter={() => loadMore()} />
      )}

      {/* Preview */}
      <PreviewDialog
        open={Boolean(previewKey)}
        onClose={() => setPreviewKey(null)}
        imageUrl={previewItem?.url}
        onDelete={deleteEnabled ? () => setConfirm({ keys: [previewKey] }) : undefined}
        titleId="library-preview-title"
      />

      {/* Confirm Dialog */}
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

      {/* Action bar (admin) */}
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
  favoriteEnabled: PropTypes.bool,
  storageLevel: PropTypes.oneOf(['private', 'protected']),
  refreshTrigger: PropTypes.any,
  userSub: PropTypes.string,
  isAdmin: PropTypes.bool,
  sx: PropTypes.any,
};
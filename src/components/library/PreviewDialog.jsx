import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Box, Dialog, IconButton, Typography, useMediaQuery, Button, Popover, TextField, Chip, Stack, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { Delete, Close, KeyboardArrowLeft, KeyboardArrowRight, CheckCircle, CheckCircleOutline, Info, MoreHoriz } from '@mui/icons-material';
import { getMetadataForKey, putMetadataForKey } from '../../utils/library/metadata';

export default function PreviewDialog({ open, onClose, imageUrl, imageKey, storageLevel = 'protected', onDelete, titleId, onPrev, onNext, hasPrev, hasNext, isSelected, onToggleSelected, footerMode = 'default', title = 'Image Preview', ctaLabel, onCta, showInfo = true }) {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const [infoAnchor, setInfoAnchor] = useState(null);
  const [meta, setMeta] = useState({ tags: [], description: '', defaultCaption: '' });
  const canEdit = showInfo && Boolean(imageKey);
  const [moreAnchorEl, setMoreAnchorEl] = useState(null);
  const moreMenuOpen = Boolean(moreAnchorEl);

  useEffect(() => {
    let cancelled = false;
    async function loadMetadata() {
      if (!open || !imageKey) return;
      try {
        const m = await getMetadataForKey(imageKey, { level: storageLevel });
        if (!cancelled) setMeta(m);
      } catch (_) { /* ignore */ }
    }
    loadMetadata();
    return () => { cancelled = true; };
  }, [open, imageKey, storageLevel]);

  const handleSaveMeta = async () => {
    if (!imageKey) return;
    try { await putMetadataForKey(imageKey, meta, { level: storageLevel }); } catch (_) { /* ignore */ }
  };

  const [swipeOffsetY, setSwipeOffsetY] = useState(0);
  const touchStartYRef = useRef(null);

  const handleTouchStart = (e) => {
    if (!isMobile) return;
    touchStartYRef.current = e.touches?.[0]?.clientY ?? 0;
    setSwipeOffsetY(0);
  };

  const handleTouchMove = (e) => {
    if (!isMobile) return;
    if (touchStartYRef.current == null) return;
    const currentY = e.touches?.[0]?.clientY ?? 0;
    const deltaY = Math.max(0, currentY - touchStartYRef.current);
    setSwipeOffsetY(deltaY);
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    if (swipeOffsetY > 120) {
      onClose?.();
    }
    setSwipeOffsetY(0);
    touchStartYRef.current = null;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth={false}
      fullScreen={isMobile}
      fullWidth={!isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          maxWidth: isMobile ? '100%' : '90vw',
          height: isMobile ? '100dvh' : '90vh',
          display: 'flex',
          flexDirection: 'column',
          margin: isMobile ? 0 : 2,
          bgcolor: '#0f0f10',
          overscrollBehavior: 'contain',
          overflow: 'hidden',
        },
      }}
      BackdropProps={{ sx: { backdropFilter: 'blur(1px)' } }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: isMobile ? 2 : 3,
          borderBottom: '1px solid',
          borderColor: 'rgba(255,255,255,0.12)',
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: '#0f0f10',
        }}
      >
        <Typography id={titleId} variant={isMobile ? 'h6' : 'h5'} sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
          {title}
        </Typography>
        {!isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {canEdit && (
              <IconButton
                onClick={(e) => setInfoAnchor(e.currentTarget)}
                aria-label="Image info"
                sx={{ color: 'rgba(255,255,255,0.9)', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }}
              >
                <Info />
              </IconButton>
            )}
            {typeof isSelected === 'boolean' && onToggleSelected && (
              <IconButton
                onClick={onToggleSelected}
                aria-label={isSelected ? 'Deselect image' : 'Select image'}
                aria-pressed={isSelected}
                sx={{
                  color: isSelected ? '#0a0' : 'rgba(255,255,255,0.9)',
                  bgcolor: isSelected ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)',
                  '&:hover': { bgcolor: isSelected ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.16)' },
                }}
              >
                {isSelected ? <CheckCircle /> : <CheckCircleOutline />}
              </IconButton>
            )}
            {onDelete && (
              <IconButton
                onClick={onDelete}
                aria-label="Delete image"
                sx={{ color: '#ff5252', bgcolor: 'rgba(255,82,82,0.1)', '&:hover': { bgcolor: 'rgba(255,82,82,0.2)' } }}
              >
                <Delete />
              </IconButton>
            )}
            {footerMode !== 'collage' && ctaLabel && typeof onCta === 'function' && (
              <Button
                onClick={onCta}
                variant="contained"
                sx={{
                  textTransform: 'none',
                  fontWeight: 800,
                  borderRadius: 1.25,
                  color: '#0b0f0c',
                  background: 'linear-gradient(45deg, #16a34a 10%, #22c55e 90%)',
                  border: '1px solid rgba(34,197,94,0.65)',
                  boxShadow: '0 6px 16px rgba(34,197,94,0.25)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #12813c 10%, #1fb455 90%)',
                    boxShadow: '0 8px 18px rgba(34,197,94,0.35)'
                  }
                }}
              >
                {ctaLabel}
              </Button>
            )}
            <IconButton
              onClick={onClose}
              aria-label="Close preview"
              sx={{ color: 'rgba(255,255,255,0.9)', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }}
            >
              <Close />
            </IconButton>
          </Box>
        )}
      </Box>
      {/* Content (image area) */}
      <Box
        sx={{
          p: isMobile ? 1.5 : 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#111214',
          position: 'relative',
          flexGrow: 1,
          minHeight: 0,
          touchAction: 'none',
          overflow: 'hidden',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={(e) => { handleTouchMove(e); e.preventDefault(); }}
        onTouchEnd={handleTouchEnd}
      >
        {imageUrl && (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `translateY(${swipeOffsetY}px)`,
              opacity: swipeOffsetY ? Math.max(0.3, 1 - swipeOffsetY / 300) : 1,
              transition: swipeOffsetY ? 'none' : 'transform 0.2s ease, opacity 0.2s ease',
              position: 'relative',
            }}
          >
            <img
              src={imageUrl}
              alt="Preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
              }}
            />
            {isSelected && (
              <Box sx={{ position: 'absolute', inset: 0, border: '2px solid #22c55e', borderRadius: 2, pointerEvents: 'none' }} />
            )}
          </Box>
        )}
        {!isMobile && hasPrev && (
          <IconButton
            aria-label="Previous image"
            onClick={onPrev}
            sx={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              bgcolor: 'rgba(0,0,0,0.35)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.45)' },
              borderRadius: 1.5,
            }}
            size="large"
          >
            <KeyboardArrowLeft />
          </IconButton>
        )}
        {!isMobile && hasNext && (
          <IconButton
            aria-label="Next image"
            onClick={onNext}
            sx={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              bgcolor: 'rgba(0,0,0,0.35)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.45)' },
              borderRadius: 1.5,
            }}
            size="large"
          >
            <KeyboardArrowRight />
          </IconButton>
        )}
      </Box>

      {/* Footer controls on mobile */}
      {isMobile && footerMode !== 'collage' && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            p: 1.5,
            borderTop: '1px solid',
            borderColor: 'rgba(255,255,255,0.12)',
            bgcolor: '#0f0f10',
          }}
        >
          {canEdit && (
            <IconButton
              aria-label="Image info"
              onClick={(e) => setInfoAnchor(e.currentTarget)}
              sx={{ color: 'rgba(255,255,255,0.9)', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }}
            >
              <Info />
            </IconButton>
          )}
          {footerMode === 'single' ? (
            <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
              <Button
                onClick={onClose}
                variant="contained"
                fullWidth
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 1.25,
                  color: '#e5e7eb',
                  bgcolor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.24)',
                  boxShadow: 'none',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.10)',
                    borderColor: 'rgba(255,255,255,0.36)'
                  }
                }}
                startIcon={<Close />}
              >
                Close
              </Button>
              {ctaLabel && typeof onCta === 'function' && (
                <Button
                  onClick={onCta}
                  variant="contained"
                  fullWidth
                  sx={{
                    textTransform: 'none',
                    fontWeight: 800,
                    borderRadius: 1.25,
                    color: '#0b0f0c',
                    background: 'linear-gradient(45deg, #16a34a 10%, #22c55e 90%)',
                    border: '1px solid rgba(34,197,94,0.65)',
                    boxShadow: '0 6px 16px rgba(34,197,94,0.25)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #12813c 10%, #1fb455 90%)',
                      boxShadow: '0 8px 18px rgba(34,197,94,0.35)'
                    }
                  }}
                >
                  {ctaLabel}
                </Button>
              )}
              {onToggleSelected && (
                <Button
                  onClick={onToggleSelected}
                  variant="contained"
                  fullWidth
                  sx={{
                    textTransform: 'none',
                    fontWeight: 800,
                    borderRadius: 1.25,
                    color: '#0b0f0c',
                    background: 'linear-gradient(45deg, #16a34a 10%, #22c55e 90%)',
                    border: '1px solid rgba(34,197,94,0.65)',
                    boxShadow: '0 6px 16px rgba(34,197,94,0.25)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #12813c 10%, #1fb455 90%)',
                      boxShadow: '0 8px 18px rgba(34,197,94,0.35)'
                    }
                  }}
                  startIcon={<CheckCircle />}
                >
                  Select
                </Button>
              )}
            </Box>
          ) : (
            <>
              <IconButton
                aria-label="Previous image"
                onClick={onPrev}
                disabled={!hasPrev}
                sx={{ color: 'rgba(255,255,255,0.9)', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }}
              >
                <KeyboardArrowLeft />
              </IconButton>
              {typeof isSelected === 'boolean' && onToggleSelected && (
                <IconButton
                  onClick={onToggleSelected}
                  aria-label={isSelected ? 'Deselect image' : 'Select image'}
                  aria-pressed={isSelected}
                  sx={{
                    color: isSelected ? '#22c55e' : 'rgba(255,255,255,0.9)',
                    bgcolor: isSelected ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)',
                    '&:hover': { bgcolor: isSelected ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.16)' },
                  }}
                >
                  {isSelected ? <CheckCircle /> : <CheckCircleOutline />}
                </IconButton>
              )}
              {onDelete && (
                <IconButton onClick={onDelete} aria-label="Delete image" sx={{ color: '#ff5252', bgcolor: 'rgba(255,82,82,0.1)', '&:hover': { bgcolor: 'rgba(255,82,82,0.2)' } }}>
                  <Delete />
                </IconButton>
              )}
              <IconButton
                aria-label="Next image"
                onClick={onNext}
                disabled={!hasNext}
                sx={{ color: 'rgba(255,255,255,0.9)', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }}
              >
                <KeyboardArrowRight />
              </IconButton>
              {ctaLabel && typeof onCta === 'function' && (
                <Button
                  onClick={onCta}
                  variant="contained"
                  sx={{
                    textTransform: 'none',
                    fontWeight: 800,
                    borderRadius: 1.25,
                    color: '#0b0f0c',
                    background: 'linear-gradient(45deg, #16a34a 10%, #22c55e 90%)',
                    border: '1px solid rgba(34,197,94,0.65)',
                    boxShadow: '0 6px 16px rgba(34,197,94,0.25)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #12813c 10%, #1fb455 90%)',
                      boxShadow: '0 8px 18px rgba(34,197,94,0.35)'
                    }
                  }}
                >
                  {ctaLabel}
                </Button>
              )}
              <IconButton onClick={onClose} aria-label="Close preview" sx={{ color: 'rgba(255,255,255,0.9)', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }}>
                <Close />
              </IconButton>
            </>
          )}
        </Box>
      )}

      {/* Collage-style bottom action bar */}
      {footerMode === 'collage' && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: isMobile ? 1.5 : 2,
            borderTop: '1px solid',
            borderColor: 'rgba(255,255,255,0.12)',
            bgcolor: '#0f0f10',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.15)'
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 960, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              onClick={onClose}
              variant="contained"
              aria-label="Close"
              sx={{
                minHeight: 48,
                minWidth: isMobile ? 48 : 120,
                px: isMobile ? 1.25 : 2,
                fontWeight: 700,
                textTransform: 'none',
                background: 'linear-gradient(45deg, #1f1f1f 30%, #2a2a2a 90%)',
                border: '1px solid #3a3a3a',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.35)',
                color: '#e0e0e0',
                '&:hover': { background: 'linear-gradient(45deg, #262626 30%, #333333 90%)' }
              }}
              startIcon={!isMobile ? <Close sx={{ color: '#e0e0e0' }} /> : undefined}
            >
              {isMobile ? <Close sx={{ color: '#e0e0e0' }} /> : 'Close'}
            </Button>
            <Button
              onClick={onCta}
              disabled={!onCta}
              variant="contained"
              size="large"
              sx={{
                flex: 1,
                minHeight: 48,
                fontWeight: 800,
                textTransform: 'none',
                background: 'linear-gradient(45deg, #3d2459 30%, #6b42a1 90%)',
                border: '1px solid #8b5cc7',
                boxShadow: '0 6px 20px rgba(107, 66, 161, 0.4)',
                color: '#fff',
                '&:hover': { background: 'linear-gradient(45deg, #472a69 30%, #7b4cb8 90%)' }
              }}
              aria-label={ctaLabel || 'Edit Collage'}
            >
              {ctaLabel || 'Edit Collage'}
            </Button>
            <IconButton
              aria-label="More options"
              onClick={(e) => setMoreAnchorEl(e.currentTarget)}
              sx={{ color: 'rgba(255,255,255,0.9)', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }}
            >
              <MoreHoriz />
            </IconButton>
            <Menu
              anchorEl={moreAnchorEl}
              open={moreMenuOpen}
              onClose={() => setMoreAnchorEl(null)}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              {onDelete && (
                <MenuItem onClick={() => { setMoreAnchorEl(null); onDelete(); }}>
                  <ListItemIcon>
                    <Delete fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Delete project</ListItemText>
                </MenuItem>
              )}
            </Menu>
          </Box>
        </Box>
      )}

      {/* Info / metadata editor */}
      <Popover
        open={Boolean(infoAnchor)}
        anchorEl={infoAnchor}
        onClose={() => setInfoAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { p: 2, width: 360 } }}
      >
        <Stack spacing={1.25}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Image info</Typography>
          <TextField
            label="Tags (comma separated)"
            size="small"
            placeholder="e.g. south park, cartman"
            value={Array.isArray(meta.tags) ? meta.tags.join(', ') : (meta.tags || '')}
            onChange={(e) => setMeta((m) => ({ ...m, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) }))}
          />
          <TextField
            label="Description"
            size="small"
            multiline
            minRows={2}
            value={meta.description || ''}
            onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
          />
          <TextField
            label="Default caption"
            size="small"
            multiline
            minRows={2}
            value={meta.defaultCaption || ''}
            onChange={(e) => setMeta((m) => ({ ...m, defaultCaption: e.target.value }))}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setInfoAnchor(null)}>Close</Button>
            <Button variant="contained" onClick={async () => { await handleSaveMeta(); setInfoAnchor(null); }}>Save</Button>
          </Box>
          {Array.isArray(meta.tags) && meta.tags.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {meta.tags.map((t) => (<Chip key={t} label={t} size="small" />))}
            </Box>
          )}
        </Stack>
      </Popover>
    </Dialog>
  );
}

PreviewDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  imageUrl: PropTypes.string,
  imageKey: PropTypes.string,
  storageLevel: PropTypes.oneOf(['private', 'protected']),
  onDelete: PropTypes.func,
  titleId: PropTypes.string,
  onPrev: PropTypes.func,
  onNext: PropTypes.func,
  hasPrev: PropTypes.bool,
  hasNext: PropTypes.bool,
  isSelected: PropTypes.bool,
  onToggleSelected: PropTypes.func,
  footerMode: PropTypes.oneOf(['default', 'single', 'collage']),
};
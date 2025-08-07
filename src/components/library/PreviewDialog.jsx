import React from 'react';
import PropTypes from 'prop-types';
import { Box, Dialog, IconButton, Typography, useMediaQuery } from '@mui/material';
import { Delete, Close, KeyboardArrowLeft, KeyboardArrowRight, CheckCircle, CheckCircleOutline } from '@mui/icons-material';

export default function PreviewDialog({ open, onClose, imageUrl, onDelete, titleId, onPrev, onNext, hasPrev, hasNext, isSelected, onToggleSelected }) {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));

  const [swipeOffsetY, setSwipeOffsetY] = React.useState(0);
  const touchStartYRef = React.useRef(null);

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
          maxHeight: isMobile ? '100%' : '90vh',
          margin: isMobile ? 0 : 2,
          bgcolor: '#0f0f10',
        },
      }}
    >
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
          Image Preview
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
          <IconButton
            onClick={onClose}
            aria-label="Close preview"
            sx={{ color: 'rgba(255,255,255,0.9)', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }}
          >
            <Close />
          </IconButton>
        </Box>
      </Box>
      <Box
        sx={{ p: isMobile ? 1.5 : 3, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#111214', position: 'relative' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {imageUrl && (
          <Box
            sx={{
              width: '100%',
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
                maxWidth: '100%',
                maxHeight: isMobile ? 'calc(100vh - 160px)' : 'calc(90vh - 160px)',
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

        {hasPrev && (
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
        {hasNext && (
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
    </Dialog>
  );
}

PreviewDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  imageUrl: PropTypes.string,
  onDelete: PropTypes.func,
  titleId: PropTypes.string,
  onPrev: PropTypes.func,
  onNext: PropTypes.func,
  hasPrev: PropTypes.bool,
  hasNext: PropTypes.bool,
};
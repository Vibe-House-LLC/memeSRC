import React from 'react';
import PropTypes from 'prop-types';
import { Box, Skeleton, CircularProgress } from '@mui/material';
import { Check } from '@mui/icons-material';

export default function LibraryTile({
  item,
  selected,
  onClick,
  onPreview,
  disabled,
  selectionMode,
  selectionIndex,
  onImageError,
}) {
  const hasImageError = Boolean(item?.imageError);
  const loaded = Boolean(item?.url) && !item?.loading && !hasImageError;
  return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%', cursor: disabled ? 'not-allowed' : 'pointer', overflow: 'hidden', borderRadius: 1.5, outline: 'none', '&:focus-visible': { boxShadow: '0 0 0 2px #8b5cc7' } }}>
      <Box onClick={disabled ? undefined : onClick} onDoubleClick={disabled ? undefined : onPreview} aria-label={selected ? 'Unselect image' : 'Select image'} role="button" tabIndex={disabled ? -1 : 0} sx={{ width: '100%', height: '100%', pointerEvents: disabled ? 'none' : 'auto' }}>
        {!loaded && (
          <Skeleton variant="rectangular" animation="wave" width="100%" height="100%" sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
        )}
        {item?.url && !hasImageError && (
          <>
            <img src={item.url} alt="library item" loading="lazy" onError={onImageError} style={{ objectFit: 'cover', width: '100%', height: '100%', display: loaded ? 'block' : 'none' }} />
            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.0) 40%, rgba(0,0,0,0.35) 100%)', pointerEvents: 'none' }} />
          </>
        )}
      </Box>
      {item?.loading && typeof item?.progress !== 'number' && !item?.error && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={24} sx={{ color: '#8b5cc7' }} />
        </Box>
      )}
      {item?.error && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.35)' }}>
          <Box sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: 'error.main', color: '#000', fontWeight: 700, fontSize: 12, border: '1px solid rgba(255,255,255,0.7)' }}>
            Upload failed
          </Box>
        </Box>
      )}
      {/* Preview icon removed per design */}
      {item?.loading && typeof item?.progress === 'number' && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Track ring */}
          <CircularProgress
            variant="determinate"
            value={100}
            size={28}
            thickness={4}
            sx={{ color: 'rgba(255,255,255,0.18)', position: 'absolute' }}
          />
          {/* Progress ring */}
          <CircularProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, item.progress))}
            size={28}
            thickness={4}
            sx={{ color: '#8b5cc7' }}
          />
        </Box>
      )}
      {selected && (
        <>
          <Box sx={{ position: 'absolute', inset: 0, border: '2px solid', borderColor: '#22c55e', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.6)', pointerEvents: 'none', borderRadius: 1.2 }} />
          <Box
            sx={{
              position: 'absolute',
              bottom: 6,
              right: 6,
              px: 1,
              minWidth: 22,
              height: 22,
              borderRadius: 1.2,
              bgcolor: '#22c55e',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.7)',
              fontSize: 12,
              fontWeight: 800,
              lineHeight: 1,
            }}
            aria-label={typeof selectionIndex === 'number' ? `Selected ${selectionIndex}` : 'Selected'}
          >
            {typeof selectionIndex === 'number' ? selectionIndex : <Check sx={{ fontSize: 16 }} />}
          </Box>
        </>
      )}
      {disabled && !selected && (
        <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.35)', borderRadius: 1.2, pointerEvents: 'none' }} />
      )}
      {selectionMode && !selected && (
        <Box sx={{ position: 'absolute', inset: 0, border: '2px solid', borderColor: 'rgba(255,255,255,0.5)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.6)', pointerEvents: 'none', borderRadius: 1.2 }} />
      )}
    </Box>
  );
}

LibraryTile.propTypes = {
  item: PropTypes.object.isRequired,
  selected: PropTypes.bool,
  onClick: PropTypes.func,
  onPreview: PropTypes.func,
  disabled: PropTypes.bool,
  selectionMode: PropTypes.bool,
  selectionIndex: PropTypes.number,
  onImageError: PropTypes.func,
};

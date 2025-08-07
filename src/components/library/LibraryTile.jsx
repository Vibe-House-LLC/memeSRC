import React from 'react';
import PropTypes from 'prop-types';
import { Box, CircularProgress, IconButton } from '@mui/material';
import { Check, Star, StarBorder, OpenInNew } from '@mui/icons-material';

export default function LibraryTile({ item, selected, onClick, onToggleFavorite, isFavorite, onPreview }) {
  const loaded = Boolean(item?.url) && !item?.loading;
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', cursor: 'pointer', overflow: 'hidden', borderRadius: 1 }}>
      <Box onClick={onClick} aria-label={selected ? 'Unselect image' : 'Select image'} role="button" tabIndex={0} sx={{ width: '100%', height: '100%' }}>
        {!loaded && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover' }}>
            <CircularProgress size={22} />
          </Box>
        )}
        {item?.url && (
          <img src={item.url} alt="library item" loading="lazy" style={{ objectFit: 'cover', width: '100%', height: '100%', display: loaded ? 'block' : 'none' }} />
        )}
      </Box>
      <IconButton size="small" onClick={onToggleFavorite} aria-label={isFavorite ? 'Unfavorite image' : 'Favorite image'} sx={{ position: 'absolute', top: 4, left: 4, bgcolor: 'rgba(0,0,0,0.35)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.45)' } }}>
        {isFavorite ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
      </IconButton>
      <IconButton size="small" onClick={onPreview} aria-label="Preview image" sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.35)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.45)' } }}>
        <OpenInNew fontSize="small" />
      </IconButton>
      {selected && (
        <>
          <Box sx={{ position: 'absolute', inset: 0, border: '2px solid', borderColor: 'success.main', pointerEvents: 'none' }} />
          <Box sx={{ position: 'absolute', bottom: 6, right: 6, width: 22, height: 22, borderRadius: '50%', bgcolor: 'success.main', color: 'common.white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white' }}>
            <Check sx={{ fontSize: 14 }} />
          </Box>
        </>
      )}
    </Box>
  );
}

LibraryTile.propTypes = {
  item: PropTypes.object.isRequired,
  selected: PropTypes.bool,
  onClick: PropTypes.func,
  onToggleFavorite: PropTypes.func,
  isFavorite: PropTypes.bool,
  onPreview: PropTypes.func,
};
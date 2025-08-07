import React from 'react';
import PropTypes from 'prop-types';
import { Box, CircularProgress, IconButton } from '@mui/material';
import { Check, OpenInNew } from '@mui/icons-material';

export default function LibraryTile({ item, selected, onClick, onPreview }) {
  const loaded = Boolean(item?.url) && !item?.loading;
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', cursor: 'pointer', overflow: 'hidden', borderRadius: 1.5, outline: 'none', '&:focus-visible': { boxShadow: '0 0 0 2px #8b5cc7' } }}>
      <Box onClick={onClick} aria-label={selected ? 'Unselect image' : 'Select image'} role="button" tabIndex={0} sx={{ width: '100%', height: '100%' }}>
        {!loaded && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.06)' }}>
            <CircularProgress size={22} sx={{ color: 'rgba(255,255,255,0.85)' }} />
          </Box>
        )}
        {item?.url && (
          <>
            <img src={item.url} alt="library item" loading="lazy" style={{ objectFit: 'cover', width: '100%', height: '100%', display: loaded ? 'block' : 'none' }} />
            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.0) 40%, rgba(0,0,0,0.35) 100%)', pointerEvents: 'none' }} />
          </>
        )}
      </Box>
      <IconButton size="small" onClick={onPreview} aria-label="Preview image" sx={{ position: 'absolute', top: 6, right: 6, bgcolor: 'rgba(0,0,0,0.35)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.45)' }, borderRadius: 1.5 }}>
        <OpenInNew fontSize="small" />
      </IconButton>
      {selected && (
        <>
          <Box sx={{ position: 'absolute', inset: 0, border: '2px solid', borderColor: '#22c55e', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.6)', pointerEvents: 'none', borderRadius: 1.2 }} />
          <Box sx={{ position: 'absolute', bottom: 6, right: 6, px: 1, height: 22, borderRadius: 1.2, bgcolor: '#22c55e', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 700 }}>
            <Check sx={{ fontSize: 16 }} />
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
  onPreview: PropTypes.func,
};
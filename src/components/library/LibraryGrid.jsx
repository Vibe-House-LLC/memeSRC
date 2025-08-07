import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, ImageList, ImageListItem, useMediaQuery } from '@mui/material';

export default function LibraryGrid({ items, renderTile, showUploadTile, uploadTile }) {
  const isServer = typeof window === 'undefined';
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const windowWidth = isServer ? 1024 : window.innerWidth;
  const gap = 2;
  const containerPadding = isMobile ? 48 : 64;
  const availableWidth = windowWidth - containerPadding;
  const targetSize = isMobile ? 92 : 128;
  const minSize = isMobile ? 72 : 92;
  const idealCols = Math.floor((availableWidth + gap) / (targetSize + gap));
  const cols = Math.max(isMobile ? 3 : 4, idealCols);
  const rowHeight = useMemo(() => Math.max(minSize, Math.floor((availableWidth - (cols - 1) * gap) / cols)), [availableWidth, cols, minSize]);

  return (
    <Box sx={{ p: 0 }}>
      <ImageList cols={cols} gap={gap} rowHeight={rowHeight} sx={{ m: 0, width: '100%' }}>
        {showUploadTile && (
          <ImageListItem key="upload">
            {uploadTile}
          </ImageListItem>
        )}
        {items.map((item) => (
          <ImageListItem key={item.key}>
            {renderTile(item)}
          </ImageListItem>
        ))}
      </ImageList>
    </Box>
  );
}

LibraryGrid.propTypes = {
  items: PropTypes.array.isRequired,
  renderTile: PropTypes.func.isRequired,
  showUploadTile: PropTypes.bool,
  uploadTile: PropTypes.node,
};
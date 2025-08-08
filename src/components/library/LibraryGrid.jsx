import React, { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, ImageList, ImageListItem, useMediaQuery } from '@mui/material';

export default function LibraryGrid({ items, renderTile, showUploadTile, uploadTile }) {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const gap = 2;

  // Measure actual container width to keep tiles perfectly square at all breakpoints
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1024);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    const update = () => setContainerWidth(node.clientWidth || node.offsetWidth || 1024);
    update();
    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(node);
    } else {
      window.addEventListener('resize', update);
    }
    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      else window.removeEventListener('resize', update);
    };
  }, []);

  const availableWidth = containerWidth;
  const targetSize = isMobile ? 92 : 128;
  const minSize = isMobile ? 72 : 92;
  const idealCols = Math.floor((availableWidth + gap) / (targetSize + gap));
  const cols = Math.max(isMobile ? 3 : 4, idealCols || (isMobile ? 3 : 4));
  const rowHeight = useMemo(
    () => Math.max(minSize, Math.floor((availableWidth - (cols - 1) * gap) / Math.max(cols, 1))),
    [availableWidth, cols, minSize]
  );

  return (
    <Box ref={containerRef} sx={{ p: 0, width: '100%' }}>
      <ImageList cols={cols} gap={gap} rowHeight={rowHeight} sx={{ m: 0, width: '100%' }}>
        {items.map((item) => (
          <ImageListItem key={item.key || item.id}>
            {renderTile(item)}
          </ImageListItem>
        ))}
        {showUploadTile && (
          <ImageListItem key="upload">
            {uploadTile}
          </ImageListItem>
        )}
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
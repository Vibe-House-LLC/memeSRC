import React from 'react';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import { IconButton, Tooltip, Typography } from '@mui/material';
import PropTypes from 'prop-types';

const ImageEditorControls = ({ index, moveLayerUp, moveLayerDown, src }) => (
  <>
    <Typography variant="h5" marginY={1}><b>Layer {index + 1} (image)</b></Typography>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ marginLeft: '10px', height: '50px', width: '50px', overflow: 'hidden' }}>
        <img loading="lazy" src={src} alt={`thumbnail-${index}`} style={{ height: '100%', objectFit: 'cover' }} />
      </div>
      {/* <Tooltip title="Delete Layer">
          <IconButton aria-label="delete" onClick={() => deleteLayer(index)}>
          <Delete />
          </IconButton>
      </Tooltip> */}
      <Tooltip title="Move Layer Up">
        <IconButton aria-label="move up" onClick={() => moveLayerUp(index)}>
          <ArrowUpward />
        </IconButton>
      </Tooltip>
      <Tooltip title="Move Layer Down">
        <IconButton aria-label="move down" onClick={() => moveLayerDown(index)}>
          <ArrowDownward />
        </IconButton>
      </Tooltip>
      {/* Add more controls as needed */}
    </div>
  </>
);

ImageEditorControls.propTypes = {
  index: PropTypes.number.isRequired,
  moveLayerUp: PropTypes.func.isRequired,
  moveLayerDown: PropTypes.func.isRequired,
  src: PropTypes.string.isRequired,
};

export default ImageEditorControls;

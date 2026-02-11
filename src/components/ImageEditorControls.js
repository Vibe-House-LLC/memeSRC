import React from 'react';
import { ArrowDownward, ArrowUpward } from '@mui/icons-material';
import { IconButton, Tooltip, Typography } from '@mui/material';
import PropTypes from 'prop-types';

const ImageEditorControls = ({ index, moveLayerUp, moveLayerDown, src, label }) => (
  <>
    <Typography variant="h5" marginY={1}><b>Layer {index + 1} ({label})</b></Typography>
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div
        style={{
          marginLeft: '10px',
          height: '50px',
          width: '50px',
          overflow: 'hidden',
          borderRadius: '6px',
          backgroundColor: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {src ? (
          <img src={src} alt={`thumbnail-${index}`} style={{ height: '100%', width: '100%', objectFit: 'cover' }} />
        ) : (
          <Typography variant="caption" sx={{ color: '#d1d5db', fontSize: '0.55rem', textAlign: 'center' }}>
            Preview
          </Typography>
        )}
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
  src: PropTypes.string,
  label: PropTypes.string,
};

ImageEditorControls.defaultProps = {
  src: '',
  label: 'image',
};

export default ImageEditorControls;

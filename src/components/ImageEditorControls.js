import React from 'react';
import { ArrowDownward, ArrowUpward, Delete } from '@mui/icons-material';
import { IconButton } from '@mui/material';

const ImageEditorControls = ({ index, deleteLayer, moveLayerUp, moveLayerDown }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <IconButton aria-label="delete" onClick={() => deleteLayer(index)}>
        <Delete />
      </IconButton>
      <IconButton aria-label="move up" onClick={() => moveLayerUp(index)}>
        <ArrowUpward />
      </IconButton>
      <IconButton aria-label="move down" onClick={() => moveLayerDown(index)}>
        <ArrowDownward />
      </IconButton>
      {/* Add more controls as needed */}
    </div>
  );
};

export default ImageEditorControls;

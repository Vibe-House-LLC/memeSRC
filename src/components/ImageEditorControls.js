import React from 'react';
import { ArrowDownward, ArrowUpward, Delete } from '@mui/icons-material';
import { IconButton, Tooltip, Typography } from '@mui/material';

const ImageEditorControls = ({ index, deleteLayer, moveLayerUp, moveLayerDown, src }) => {
  // Assume src is the data URL of the image
  return (
    <>
        <Typography variant="h5" marginY={1}><b>Layer {index+1} (image)</b></Typography>
        <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ marginLeft: '10px', height: '50px', width: '50px', overflow: 'hidden' }}>
            <img src={src} alt={`thumbnail-${index}`} style={{ height: '100%', objectFit: 'cover' }} />
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
};

export default ImageEditorControls;

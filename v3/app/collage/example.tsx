import React from 'react';
import { Box } from '@mui/material';
import CanvasCollagePreview from './components/CanvasCollagePreview';
import { useCollagePayload, type CollagePayload } from './hooks/useCollagePayload';

// Your exact payload
const yourPayload: CollagePayload = {
  "selectedTemplate": {
    "id": "split-vertical",
    "name": "Split Vertical"
  },
  "selectedAspectRatio": "portrait",
  "panelCount": 2,
  "images": [
    {
      "index": 0,
      "originalUrl": "https://v2-dev.memesrc.com/frame/backtothefuture/1/1/31620",
      "displayUrl": "https://v2-dev.memesrc.com/frame/backtothefuture/1/1/31620",
      "subtitle": "This is truly amazing.",
      "subtitleShowing": true,
      "metadata": {
        "season": 1,
        "episode": 1,
        "frame": 31620,
        "timestamp": "00:52:42"
      }
    },
    {
      "index": 1,
      "originalUrl": "https://v2-dev.memesrc.com/frame/airplane/1/1/30010",
      "displayUrl": "https://v2-dev.memesrc.com/frame/airplane/1/1/30010",
      "subtitle": "Doctor, I've checked everyone.\nMr. Striker's the only one.",
      "subtitleShowing": true,
      "metadata": {
        "season": 1,
        "episode": 1,
        "frame": 30010,
        "timestamp": "00:50:01"
      }
    }
  ],
  "panelImageMapping": {
    "panel-1": 0,
    "panel-2": 1
  },
  "panelTransforms": {},
  "panelTexts": {
    "panel-1": {
      "content": "This is truly amazing.",
      "fontSize": 20,
      "fontWeight": 400,
      "fontFamily": "Arial",
      "color": "#ffffff",
      "strokeWidth": 2,
      "autoAssigned": true,
      "subtitleShowing": true
    },
    "panel-2": {
      "content": "Doctor, I've checked everyone.\nMr. Striker's the only one.",
      "fontSize": 20,
      "fontWeight": 400,
      "fontFamily": "Arial",
      "color": "#ffffff",
      "strokeWidth": 2,
      "autoAssigned": true,
      "subtitleShowing": true
    }
  },
  "lastUsedTextSettings": {
    "fontSize": 20,
    "fontWeight": 400,
    "fontFamily": "Arial",
    "color": "#ffffff",
    "strokeWidth": 2
  },
  "borderThickness": 1.5,
  "borderColor": "#FFFFFF",
  "aspectRatioValue": 1,
  "isCreatingCollage": false
};

const CollageExample: React.FC = () => {
  // Use the hook to manage the payload state
  const {
    payload,
    panelTransforms,
    panelTexts,
    lastUsedTextSettings,
    updatePanelTransform,
    updatePanelText,
  } = useCollagePayload(yourPayload);

  // Optional callback functions
  const handlePanelClick = (index: number, panelId: string) => {
    console.log(`Panel clicked: ${panelId} (index: ${index})`);
  };

  const handleMenuOpen = () => {
    console.log('Menu opened');
  };

  return (
    <Box sx={{ width: 400, height: 400 }}>
      <CanvasCollagePreview
        selectedTemplate={payload.selectedTemplate}
        selectedAspectRatio={payload.selectedAspectRatio}
        panelCount={payload.panelCount}
        images={payload.images}
        onPanelClick={handlePanelClick}
        onMenuOpen={handleMenuOpen}
        aspectRatioValue={payload.aspectRatioValue}
        panelImageMapping={payload.panelImageMapping}
        borderThickness={payload.borderThickness}
        borderColor={payload.borderColor}
        panelTransforms={panelTransforms}
        updatePanelTransform={updatePanelTransform}
        panelTexts={panelTexts}
        updatePanelText={updatePanelText}
        lastUsedTextSettings={lastUsedTextSettings}
        isGeneratingCollage={payload.isCreatingCollage}
      />
    </Box>
  );
};

export default CollageExample; 
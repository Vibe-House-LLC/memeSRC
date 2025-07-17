'use client';

import React from 'react';
import { Box, Container, Typography, Paper, Button } from '@mui/material';
import CanvasCollagePreview from '../components/CanvasCollagePreview';
import { useCollagePayload, type CollagePayload } from '../hooks/useCollagePayload';

// Sample payload
const initialPayload: CollagePayload = {
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

const CollageDemo: React.FC = () => {
  // Use the custom hook for state management
  const {
    payload,
    panelTransforms,
    panelTexts,
    lastUsedTextSettings,
    updatePanelTransform,
    updatePanelText,
    loadPayload,
    resetAllPanels,
    exportPayload
  } = useCollagePayload(initialPayload);

  // Callback functions for the component
  const handlePanelClick = (index: number, panelId: string) => {
    console.log(`Panel clicked: ${panelId} (index: ${index})`);
  };

  const handleMenuOpen = () => {
    console.log('Menu opened');
  };

  const handleReset = () => {
    resetAllPanels();
  };

  const handleExport = () => {
    const exportedPayload = exportPayload();
    console.log('Exported payload:', exportedPayload);
    // You could save this to a file or send to an API
    navigator.clipboard.writeText(JSON.stringify(exportedPayload, null, 2));
    alert('Payload copied to clipboard!');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Collage Demo
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        This demo shows the CanvasCollagePreview component working with the provided payload.
        You can interact with the panels to transform images and edit text.
      </Typography>

      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          maxWidth: 600, 
          mx: 'auto',
          backgroundColor: 'background.default'
        }}
      >
        <Box sx={{ aspectRatio: '1/1', width: '100%' }}>
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
        
        <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button variant="outlined" onClick={handleReset}>
            Reset All Panels
          </Button>
          <Button variant="contained" onClick={handleExport}>
            Export Payload
          </Button>
        </Box>
      </Paper>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Instructions:
        </Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
          <li>Click on any panel to select it</li>
          <li>Use the transform button (⊕) to enable image positioning and scaling</li>
          <li>Double-click on a panel with an image to edit text</li>
          <li>Use pinch gestures on mobile to scale images</li>
          <li>Drag images to reposition them within panels</li>
        </Typography>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Current State:
        </Typography>
        <Paper sx={{ p: 2, backgroundColor: 'grey.100' }}>
          <Typography variant="caption" component="pre" sx={{ fontSize: '0.75rem', overflow: 'auto' }}>
            {JSON.stringify({
              panelTransforms,
              panelTexts,
              lastUsedTextSettings
            }, null, 2)}
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default CollageDemo; 
# CanvasCollagePreview Component Setup

This guide shows how to set up and use the `CanvasCollagePreview` component with your payload data.

## Quick Start

### 1. Import the necessary components and hooks

```tsx
import CanvasCollagePreview from './components/CanvasCollagePreview';
import { useCollagePayload, type CollagePayload } from './hooks/useCollagePayload';
```

### 2. Define your payload

Your payload structure should match the `CollagePayload` interface:

```tsx
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
      "originalUrl": "https://example.com/image1.jpg",
      "displayUrl": "https://example.com/image1.jpg",
      "subtitle": "Caption text here",
      "subtitleShowing": true,
      "metadata": {
        "season": 1,
        "episode": 1,
        "frame": 31620,
        "timestamp": "00:52:42"
      }
    }
    // ... more images
  ],
  "panelImageMapping": {
    "panel-1": 0,
    "panel-2": 1
  },
  "panelTransforms": {},
  "panelTexts": {
    "panel-1": {
      "content": "Text content",
      "fontSize": 20,
      "fontWeight": 400,
      "fontFamily": "Arial",
      "color": "#ffffff",
      "strokeWidth": 2
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
```

### 3. Use the hook and component

```tsx
const MyCollageComponent: React.FC = () => {
  // Use the hook to manage state
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
    console.log(`Panel clicked: ${panelId}`);
  };

  return (
    <CanvasCollagePreview
      selectedTemplate={payload.selectedTemplate}
      selectedAspectRatio={payload.selectedAspectRatio}
      panelCount={payload.panelCount}
      images={payload.images}
      onPanelClick={handlePanelClick}
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
  );
};
```

## Payload Properties

### Required Properties

- **selectedTemplate**: Template configuration with `id` and `name`
- **selectedAspectRatio**: String defining the aspect ratio
- **panelCount**: Number of panels in the collage
- **images**: Array of image objects with URLs and metadata
- **panelImageMapping**: Maps panel IDs to image indices
- **panelTransforms**: Image transform settings (scale, position)
- **panelTexts**: Text content and styling for each panel
- **lastUsedTextSettings**: Default text settings
- **borderThickness**: Border width as percentage
- **borderColor**: Border color in hex format
- **aspectRatioValue**: Numeric aspect ratio (width/height)
- **isCreatingCollage**: Boolean flag for generation state

### Available Templates

The component supports various layout templates:

- `split-vertical`: Two panels stacked vertically
- `split-horizontal`: Two panels side by side
- `grid-2x2`: Four panels in a 2x2 grid
- `1x1`: Single panel
- And many more (see `layouts.tsx` for full list)

## Interactive Features

### Panel Interactions

- **Click**: Select a panel
- **Transform Mode**: Click the transform button to enable image positioning
- **Text Editing**: Double-click to edit text (when panel has an image)
- **Touch Gestures**: Pinch to zoom, drag to pan on mobile

### Text Editing

The component provides a comprehensive text editor with:
- Content editing
- Font size and family selection
- Color selection (presets + custom)
- Text positioning and rotation
- Font weight and style options
- Stroke width control

### Transform Controls

When transform mode is enabled:
- **Drag**: Move image within panel
- **Pinch (mobile)**: Scale image
- **Mouse wheel**: Scale image (desktop)

## Hook Functions

The `useCollagePayload` hook provides these utility functions:

- `updatePanelTransform(panelId, transform)`: Update image transform
- `updatePanelText(panelId, text)`: Update text content/styling
- `loadPayload(newPayload)`: Load a completely new payload
- `resetPanel(panelId)`: Reset specific panel to defaults
- `resetAllPanels()`: Reset all panels
- `exportPayload()`: Get current state as payload object

## Examples

### Basic Usage
See `example.tsx` for a minimal implementation.

### Full Demo
See `demo/page.tsx` for a complete example with controls and state display.

### Custom Integration
```tsx
// Load payload from API
const [payload, setPayload] = useState(null);

useEffect(() => {
  fetchPayloadFromAPI().then(setPayload);
}, []);

if (!payload) return <Loading />;

return <CollageExample payload={payload} />;
```

## Troubleshooting

### Images not loading
- Ensure image URLs are accessible
- Check CORS settings for external images
- Verify `displayUrl` and `originalUrl` are valid

### Layout issues
- Confirm template ID exists in `layouts.tsx`
- Check `panelCount` matches template expectations
- Verify `aspectRatioValue` is positive number

### Text not appearing
- Ensure panel has an associated image
- Check text content is not empty
- Verify text color contrasts with background

## TypeScript Support

The component is fully typed. Import types as needed:

```tsx
import type { 
  CollagePayload, 
  PanelTransform, 
  PanelText, 
  TextSettings 
} from './hooks/useCollagePayload';
``` 
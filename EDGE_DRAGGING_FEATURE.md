# Collage Edge Dragging Feature

## Overview

I've implemented an interactive edge dragging feature for the collage preview component that allows users to resize panels by dragging the edges between them, similar to popular iOS collage editors like Express.

## Implementation Details

### Files Modified

1. **`/workspace/src/components/collage/components/CanvasCollagePreview.js`**
   - Added edge detection and dragging functionality
   - Added state management for edge dragging
   - Updated mouse and touch event handlers
   - Added visual feedback for hovering and dragging edges

### Key Features

1. **Edge Detection**
   - Detects when the mouse/touch is near internal edges between panels
   - Provides visual feedback with a dashed blue line when hovering
   - Changes cursor to resize mode (ns-resize or ew-resize)

2. **Edge Dragging**
   - Click and drag edges to resize adjacent panels
   - Maintains proportional sizing using CSS Grid fractional units (fr)
   - Enforces minimum panel size (0.2fr) to prevent panels from becoming too small
   - Shows orange highlight while dragging

3. **Layout Persistence**
   - Custom layouts are stored in component state
   - Resets when switching to a different template
   - Can be extended to save/load custom layouts

4. **Touch Support**
   - Full touch support for mobile devices
   - Single finger drag for edges
   - Prevents page scrolling while dragging

### How It Works

1. **Grid Template Parsing**
   - Parses CSS Grid template strings (e.g., "1fr 2fr") into fractional values
   - Calculates pixel positions based on container size and fr values

2. **Edge Detection Algorithm**
   - Groups panel positions to find internal edges
   - Checks mouse/touch position against edge positions with threshold
   - Returns edge information (type, index, bounds)

3. **Resize Calculation**
   - Converts pixel drag distance to fractional unit changes
   - Updates adjacent panel sizes while maintaining total size
   - Clamps values to enforce minimum sizes

### Usage

1. Move cursor over edges between panels - they'll be highlighted in blue
2. Click and drag to resize the panels
3. The layout automatically updates in real-time
4. Works with any grid-based layout (layouts using gridTemplateAreas require additional handling)

### Test Demo

A standalone test demo is available at `/workspace/test-collage-edge-dragging.html` that demonstrates the core functionality with a simple 2x2 grid.

### Future Enhancements

1. **Support for Named Grid Areas**
   - Currently works best with simple grid layouts
   - Can be extended to support complex layouts with gridTemplateAreas

2. **Layout Saving**
   - Add ability to save custom layouts
   - Allow users to create and name their own layout presets

3. **Snap to Grid**
   - Add snapping behavior for common ratios (1:1, 2:1, 3:1, etc.)

4. **Visual Guides**
   - Show size ratios while dragging
   - Add alignment guides

### Integration Notes

The feature is integrated into the existing CanvasCollagePreview component and works seamlessly with:
- Image uploads and panel mapping
- Border thickness and color settings
- Transform mode for individual images
- Text overlays
- Export functionality

The implementation maintains backward compatibility and doesn't affect existing functionality.
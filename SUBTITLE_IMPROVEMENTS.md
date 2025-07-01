# Subtitle Editing Improvements for CanvasCollagePreview

## Overview
Improved the subtitle editing experience in the CanvasCollagePreview component with true in-place editing directly on the canvas - no full-screen overlays or complex UI that gets in the way.

## Key Improvements

### 1. Transparent Placeholder Text
- Added "Tap to add text" placeholder that appears when a frame doesn't have a subtitle
- Placeholder is rendered with 40% opacity white text
- No stroke outline on placeholder text for cleaner appearance

### 2. True In-Place Text Editing
- **Text input appears directly over the panel** where the text will be displayed
- **No full-screen overlays** - you can see the collage while editing
- **Auto-focus and keyboard shortcuts** (Enter to save, Escape to cancel)
- Text input is positioned in the text area of the panel

### 3. Minimal Mobile Controls
- **Simple bottom bar** with just the essentials: Bold, Italic, 4 colors, Done button
- **Only appears during text editing** - doesn't interfere with normal usage
- **Small footprint** - doesn't cover the preview

### 4. Visual Feedback
- Text editing button changes color and icon based on content:
  - **Orange + Text icon**: No text yet (add mode)
  - **Green + Edit icon**: Has text (edit mode)

### 5. Simplified User Flow
1. Tap the text button on any panel
2. Text input appears directly over the panel
3. Type your text (can see the collage behind it)
4. Use bottom controls for basic formatting (mobile only)
5. Tap "Done" or press Enter to finish

## Technical Implementation

### In-Place Text Input
- Positioned absolutely over the panel using calculated coordinates
- Semi-transparent white background so you can see the image behind
- Auto-focus for immediate typing
- Keyboard shortcuts for quick editing

### Mobile Controls Bar
- Fixed position at bottom of screen
- Only visible during text editing
- Contains essential formatting: Bold/Italic toggles, 4 color swatches, Done button
- Minimal height to preserve screen real estate

### No Desktop Changes
- Desktop users continue to use the text button as before
- Clean, focused experience without unnecessary complexity

## Benefits
- **True in-place editing**: Edit text exactly where it will appear
- **No UI obstruction**: Can see the full collage while editing
- **Mobile-optimized**: Touch-friendly controls without taking over the screen
- **Fast workflow**: Click, type, done - no navigation through complex menus
- **Visual clarity**: Placeholder text guides behavior, button states show content status

## Files Modified
- `/src/components/collage/components/CanvasCollagePreview.js`
  - Removed full-screen overlay approach
  - Added positioned text input over panels
  - Added minimal mobile controls bar
  - Simplified state management
  - Enhanced visual feedback for text editing buttons
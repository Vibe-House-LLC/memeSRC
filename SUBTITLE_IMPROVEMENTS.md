# Subtitle Editing Improvements for CanvasCollagePreview

## Overview
Improved the subtitle editing experience in the CanvasCollagePreview component with a focus on mobile-first, minimalistic design and ease of use.

## Key Improvements

### 1. Transparent Placeholder Text
- Added "Tap to add text" placeholder that appears when a frame doesn't have a subtitle
- Placeholder is rendered with 40% opacity white text
- No stroke outline on placeholder text for cleaner appearance

### 2. Mobile-First Text Editing Interface
- **Mobile**: Full-screen overlay with large text input area and simple controls
- **Desktop**: Compact popover with essential controls
- Automatically detects device type using Material-UI's `useMediaQuery`

### 3. Direct Canvas Text Editing
- On mobile, tapping in the text area (bottom third of panel) opens the text editor directly
- No need to tap a separate button for basic text editing
- Text editing button changes color and icon based on whether text exists (green edit icon vs orange add icon)

### 4. Simplified Controls (V2FramePage Style)
- **Font Size**: Slider with 12-48px range (mobile-optimized)
- **Text Color**: 6-8 predefined colors for quick selection
- **Bold/Italic**: Simple toggle buttons
- **Clear Button**: Easy way to remove text completely

### 5. Mobile UX Enhancements
- Full-screen text editing overlay prevents interface obstruction
- Large touch targets for all controls
- Autofocus on text input when editing begins
- Clear visual hierarchy with dark overlay background
- Action buttons at bottom (Clear/Done) for easy thumb access

### 6. Desktop Compatibility
- Maintains existing popover-style editing for desktop users
- Simplified controls compared to previous complex interface
- Smaller, more focused control panel

## Technical Implementation

### New State Variables
- `directEditingPanel`: Tracks which panel is being edited in mobile mode
- `directEditText`: Stores the text being edited before committing changes
- `isMobile`: Responsive breakpoint detection

### Enhanced Canvas Rendering
- Added support for `fontStyle` (italic) in canvas text rendering
- Placeholder text rendering with transparency
- Improved font property handling

### Touch/Click Handling
- Smart detection of text area clicks (bottom third of panel)
- Separate handling for mobile vs desktop interactions
- Maintains existing transform mode functionality

### Styling Improvements
- Mobile overlay uses fixed positioning with high z-index
- Consistent Material-UI theming
- Responsive button sizing and spacing
- Visual feedback for text existence (button color changes)

## User Experience Flow

### Mobile
1. User sees "Tap to add text" placeholder on empty frames
2. Tapping placeholder or text area opens full-screen editor
3. Large text input with simple formatting controls below
4. Clear/Done buttons at bottom for easy access
5. Changes apply immediately when Done is pressed

### Desktop
1. User clicks text editing button (orange for add, green for edit)
2. Compact popover appears with essential controls
3. Inline editing with live preview
4. Click outside or close button to finish

## Benefits
- **Faster text editing**: Direct canvas interaction reduces steps
- **Mobile-optimized**: Full-screen editing prevents UI obstruction
- **Visual clarity**: Placeholder text guides user behavior
- **Simplified controls**: Focus on essential formatting options
- **Consistent UX**: Follows V2FramePage patterns users already know
- **Responsive design**: Optimal experience on all device sizes

## Files Modified
- `/src/components/collage/components/CanvasCollagePreview.js`
  - Added mobile detection and responsive behavior
  - Implemented full-screen mobile text editing overlay
  - Enhanced canvas text rendering with placeholder support
  - Simplified desktop text editing popover
  - Added direct canvas text area interaction
# PR #419 Layout Shift Issue - Fix Summary

## Issue Identified

Based on Austin's review comment in PR #419, there was a layout shift problem in the `V2FramePage.js` file:

- **Problem**: When users click on the textfield to edit subtitles, a banner ad appears for non-subscribers
- **Result**: This causes the "Add to Collection" button to jump down, requiring users to click it twice
- **Trigger**: Only happens after adding at least one image with a subtitle to the collection
- **Root Cause**: Conditional rendering of `FixedMobileBannerAd` component causing sudden layout shifts

## Technical Analysis

The problematic code was located around line 1086-1091 in `V2FramePage.js`:

```javascript
{textFieldFocused && user?.userDetails?.subscriptionStatus !== 'active' && (
  <Box sx={{ mt: 2 }}>
    <FixedMobileBannerAd />
  </Box>
)}
```

When `textFieldFocused` becomes `true`, the banner ad would instantly appear, pushing all content below it downward.

## Solution Implemented

### Branch Created
- **Branch**: `fix-subtitle-layout-shift` (from `collector-edits`)
- **PR**: #420 (targeting `collector-edits` branch)

### Fix Details
Replaced instant appearance with smooth CSS transitions:

```javascript
<Box 
  sx={{ 
    mt: 2,
    maxHeight: textFieldFocused && user?.userDetails?.subscriptionStatus !== 'active' ? '200px' : '0px',
    opacity: textFieldFocused && user?.userDetails?.subscriptionStatus !== 'active' ? 1 : 0,
    overflow: 'hidden',
    transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out'
  }}
>
  {textFieldFocused && user?.userDetails?.subscriptionStatus !== 'active' && (
    <FixedMobileBannerAd />
  )}
</Box>
```

### Technical Benefits
1. **Smooth Animation**: Container expands from 0px to 200px height gradually
2. **Opacity Transition**: Fades in/out for smoother visual effect
3. **Predictable Movement**: Button repositioning is gradual, not sudden
4. **Better UX**: Users can anticipate button movement and click accurately

## Testing Recommendations

1. Test with non-subscriber accounts to verify banner ad behavior
2. Test subtitle editing workflow with images in collection
3. Verify "Add to Collection" button is clickable on first attempt
4. Check animation smoothness on different devices/browsers

## Files Modified
- `src/pages/V2FramePage.js` - Added CSS transitions for banner ad container

## PR Links
- **Original Issue**: PR #419 (review comment by Austin)
- **Fix**: PR #420 (`fix-subtitle-layout-shift` → `collector-edits`)

The fix maintains all existing functionality while providing a significantly better user experience when editing subtitles.
import React, { useRef, useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  Box, 
  IconButton, 
  Typography, 
  TextField, 
  Slider, 
  FormControl, 
  Select, 
  MenuItem, 
  Button, 
  Tooltip, 
  ToggleButtonGroup, 
  ToggleButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions 
} from "@mui/material";
import { useTheme, styled } from "@mui/material/styles";
import {
  FormatSize, 
  FormatBold, 
  FormatItalic, 
  FormatUnderlined,
  Palette,
  SwapHoriz, 
  SwapVert, 
  Colorize, 
  ChevronLeft, 
  RotateLeft,
  Restore,
  DeleteOutline as DeleteIcon,
  ControlCamera,
} from '@mui/icons-material';
import fonts from '../../../utils/fonts';
import {
  buildIndexMaps,
  getActiveFormatsFromRanges,
  parseFormattedText,
  resolveSelectionBounds,
  serializeRangesToMarkup,
  toggleStyleInRanges,
  SELECTION_CACHE_TTL_MS,
} from '../../../utils/inlineFormatting';

// Color presets for text colors
const TEXT_COLOR_PRESETS = [
  { color: '#ffffff', name: 'White' },
  { color: '#000000', name: 'Black' },
  { color: '#ff0000', name: 'Red' },
  { color: '#00ff00', name: 'Green' },
  { color: '#0000ff', name: 'Blue' },
  { color: '#ffff00', name: 'Yellow' },
  { color: '#ff00ff', name: 'Magenta' },
  { color: '#00ffff', name: 'Cyan' },
];

// Horizontal scrollable container for horizontal scrolling sections
const HorizontalScroller = styled(Box)(({ theme }) => ({
  display: 'flex',
  overflowX: 'auto',
  overflowY: 'hidden', // Explicitly prevent vertical scrolling
  scrollbarWidth: 'none',  // Firefox
  '&::-webkit-scrollbar': {
    display: 'none',  // Chrome, Safari, Opera
  },
  msOverflowStyle: 'none',  // IE, Edge
  gap: theme.spacing(1),
  padding: theme.spacing(0.75, 0),
  position: 'relative',
  scrollBehavior: 'smooth',
  alignItems: 'center',  // Center items vertically
  justifyContent: 'flex-start',  // Start alignment for consistent scrolling
  minHeight: 32,
  maxWidth: '100%', // Ensure it doesn't exceed container width
  width: '100%', // Take full width of parent
  boxSizing: 'border-box', // Include padding in width calculation
  // Contain content to prevent layout shift
  contain: 'layout style',
  // Smoother momentum scrolling (for Safari)
  WebkitOverflowScrolling: 'touch',
  // Show that content is scrollable on mobile
  overscrollBehavior: 'contain',
  // Prevent accidental touch interactions
  touchAction: 'pan-x', // Allow horizontal panning only
  // Ensure proper mobile touch scrolling
  '@media (hover: none)': {
    // Mobile-specific styles
    overflowX: 'scroll', // Force scroll on mobile
    '-webkit-overflow-scrolling': 'touch',
    scrollSnapType: 'x mandatory',
    scrollSnapAlign: 'start',
  },
}));


// Improved ScrollIndicator with subtle gradient
const ScrollIndicator = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isVisible'
})(({ theme, direction, isVisible }) => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: 30,
  pointerEvents: 'none',
  zIndex: 2,
  opacity: isVisible ? 1 : 0,
  transition: 'opacity 0.3s ease',
  background: direction === 'left'
    ? `linear-gradient(90deg, ${theme.palette.mode === 'dark' 
        ? 'rgba(0,0,0,0.9)' 
        : 'rgba(255,255,255,0.9)'} 0%, transparent 100%)`
    : `linear-gradient(270deg, ${theme.palette.mode === 'dark' 
        ? 'rgba(0,0,0,0.9)' 
        : 'rgba(255,255,255,0.9)'} 0%, transparent 100%)`,
  ...(direction === 'left' ? { left: 0 } : { right: 0 })
}));

// Create a color swatch component for text color selection
const ColorSwatch = styled(Box)(({ theme, selected, size = 'medium' }) => {
  const sizeMap = {
    small: { width: 24, height: 24, borderWidth: selected ? 2 : 1 },
    medium: { width: 36, height: 36, borderWidth: selected ? 3 : 2 },
  };
  const dimensions = sizeMap[size] || sizeMap.medium;
  
  return {
    width: dimensions.width,
    height: dimensions.height,
    borderRadius: '50%',
    cursor: 'pointer',
    boxSizing: 'border-box',
    border: selected ? `${dimensions.borderWidth}px solid ${theme.palette.primary.main}` : `${dimensions.borderWidth}px solid #ffffff`,
    boxShadow: selected 
      ? `0 0 0 ${Math.max(1, dimensions.borderWidth - 1)}px ${theme.palette.primary.main}` 
      : '0 0 0 1px rgba(0,0,0,0.1)',
    transition: theme.transitions.create(
      ['transform', 'box-shadow'],
      { duration: theme.transitions.duration.shorter }
    ),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    '&:hover': {
      transform: size === 'small' ? 'scale(1.2)' : 'scale(1.15)',
      boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
    },
    '&:active': {
      transform: 'scale(0.95)',
    }
  };
});

// Helper function to determine if a color is dark (for contrast)
const isDarkColor = (hexColor) => {
  // Convert hex to RGB
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  
  // Calculate brightness (YIQ formula)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Return true if color is dark
  return brightness < 128;
};

const CaptionEditor = ({
  panelId,
  panelTexts,
  lastUsedTextSettings,
  updatePanelText,
  panelRects,
  calculateOptimalFontSize,
  textScaleFactor,
  onClose,
  rect,
  componentWidth,
}) => {
  const theme = useTheme();
  // Current text color for UI bindings (e.g., toolbar swatch)
  const currentTextColor = panelTexts[panelId]?.color || lastUsedTextSettings.color || '#ffffff';
  // Single unified editor view (tabs removed)
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetDialogData, setResetDialogData] = useState({ type: null, panelId: null, propertyName: null });
  const [activeSlider, setActiveSlider] = useState(null);
  const [positioningOnly, setPositioningOnly] = useState(false);
  // Inline toggle between format controls and color selector
  const [showInlineColor, setShowInlineColor] = useState(false);
  
  const textFieldRefs = useRef({});
  const selectionCacheRef = useRef({});
  const [activeInlineFormats, setActiveInlineFormats] = useState([]);

  // State for text color scroll indicators
  const [textColorLeftScroll, setTextColorLeftScroll] = useState(false);
  const [textColorRightScroll, setTextColorRightScroll] = useState(false);
  
  // Refs for text color picker
  const textColorScrollerRef = useRef(null);
  const textColorPickerRef = useRef(null);
  
  // Saved custom text color state
  const [savedCustomTextColor, setSavedCustomTextColor] = useState(() => {
    const storedColor = localStorage.getItem('memeTextCustomColor');
    return storedColor || '#ffffff';
  });

  const getRawTextValue = useCallback(() => (
    panelTexts[panelId]?.rawContent ?? panelTexts[panelId]?.content ?? ''
  ), [panelTexts, panelId]);

  const getParsedText = useCallback(() => {
    const rawValue = getRawTextValue();
    const parsed = parseFormattedText(rawValue);
    return { rawValue, ...parsed };
  }, [getRawTextValue]);

  // Check if there's a saved custom color that's different from preset colors
  const hasSavedCustomTextColor = savedCustomTextColor && !TEXT_COLOR_PRESETS.some(c => c.color === savedCustomTextColor);

  // Calculate responsive dimensions based on panel size with mobile-friendly minimums
  const minPanelSize = Math.min(rect.width, rect.height);
  const isMobileSize = minPanelSize < 200;
  const sidePadding = Math.max(isMobileSize ? 6 : 4, Math.min(12, rect.width * 0.02));
  const borderRadius = Math.max(3, Math.min(8, minPanelSize * 0.02));

  // Text color scroll handling uses native gestures and indicators

  const checkTextColorScrollPosition = useCallback(() => {
    if (!textColorScrollerRef.current) return;
    
    const container = textColorScrollerRef.current;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    
    const threshold = 5;
    const hasLeft = scrollLeft > threshold;
    const hasRight = scrollLeft < scrollWidth - clientWidth - threshold;
    
    setTextColorLeftScroll(hasLeft);
    setTextColorRightScroll(hasRight);
  }, []);

  const handleTextColorScroll = useCallback(() => {
    checkTextColorScrollPosition();
  }, [checkTextColorScrollPosition]);

  // Handle custom text color selection
  const handleCustomTextColorChange = (e) => {
    const newColor = e.target.value;
    setSavedCustomTextColor(newColor);
    localStorage.setItem('memeTextCustomColor', newColor);
    handleTextChange('color', newColor);
    // Auto-close color picker after choosing a custom color
    setShowInlineColor(false);
  };

  const handleTextChange = useCallback((property, value, rawValueOverride) => {
    if (!updatePanelText) return;

    const currentText = panelTexts[panelId] || {};
    let updatedText = { ...currentText };

    if (property === 'content') {
      const rawValue = rawValueOverride ?? value ?? '';
      const { cleanText } = parseFormattedText(rawValue);
      const cleanValue = value ?? cleanText ?? '';
      const previousParsed = parseFormattedText(currentText.rawContent ?? currentText.content ?? '');

      updatedText = {
        ...updatedText,
        content: cleanValue,
        rawContent: rawValue,
      };

      const hadPreviousContent = previousParsed.cleanText && previousParsed.cleanText.trim();
      const hasExplicitFontSize = currentText.fontSize !== undefined;

      if (cleanValue && cleanValue.trim() && !hadPreviousContent && !hasExplicitFontSize) {
        updatedText = {
          ...updatedText,
          fontSize: lastUsedTextSettings.fontSize || 26
        };
      }
    } else {
      updatedText[property] = value;

      // Normalize font weight to numbers for better canvas compatibility
      if (property === 'fontWeight') {
        if (value === 'normal' || value === '400') {
          updatedText[property] = 400;
        } else if (value === 'bold' || value === '700') {
          updatedText[property] = 700;
        } else if (typeof value === 'string') {
          const numValue = parseInt(value, 10);
          updatedText[property] = Number.isNaN(numValue) ? 400 : numValue;
        } else {
          updatedText[property] = value;
        }
      }
    }

    updatePanelText(panelId, updatedText);
  }, [panelTexts, updatePanelText, panelId, lastUsedTextSettings]);

  // Reset dialog handlers
  const handleResetClick = useCallback((type, propertyName) => {
    setResetDialogData({ type, panelId, propertyName });
    setResetDialogOpen(true);
  }, [panelId]);

  const handleResetConfirm = useCallback(() => {
    const { propertyName } = resetDialogData;
    
    if (propertyName === 'fontSize') {
      const currentText = panelTexts[panelId] || {};
      const currentRaw = currentText.rawContent ?? currentText.content ?? '';
      const hasActualText = parseFormattedText(currentRaw).cleanText.trim();
      
      if (hasActualText) {
        handleTextChange(propertyName, undefined);
      } else {
        handleTextChange(propertyName, lastUsedTextSettings.fontSize || 26);
      }
    } else {
      handleTextChange(propertyName, undefined);
    }
    
    setResetDialogOpen(false);
    setResetDialogData({ type: null, panelId: null, propertyName: null });
  }, [resetDialogData, handleTextChange, panelTexts, panelId, lastUsedTextSettings]);

  const handleResetCancel = useCallback(() => {
    setResetDialogOpen(false);
    setResetDialogData({ type: null, panelId: null, propertyName: null });
  }, []);

  // Helper function to check if a value matches its default
  const isValueAtDefault = useCallback((propertyName) => {
    const currentValue = panelTexts[panelId]?.[propertyName];
    
    if (propertyName === 'fontSize') {
      return currentValue === undefined || currentValue === (lastUsedTextSettings.fontSize || 26);
    }
    
    if (propertyName === 'strokeWidth') {
      const defaultStrokeWidth = lastUsedTextSettings.strokeWidth || 2;
      return currentValue === undefined || currentValue === defaultStrokeWidth;
    }
    
    if (propertyName === 'textPositionX') {
      const defaultPositionX = lastUsedTextSettings.textPositionX || 0;
      return currentValue === undefined || currentValue === defaultPositionX;
    }
    
    if (propertyName === 'textPositionY') {
      const defaultPositionY = lastUsedTextSettings.textPositionY || 0;
      return currentValue === undefined || currentValue === defaultPositionY;
    }
    
    if (propertyName === 'textRotation') {
      const defaultRotation = lastUsedTextSettings.textRotation || 0;
      return currentValue === undefined || currentValue === defaultRotation;
    }
    
    return false;
  }, [panelTexts, panelId, lastUsedTextSettings]);

  // Helper function to get current value for display
  const getCurrentValue = useCallback((propertyName) => {
    const currentValue = panelTexts[panelId]?.[propertyName];
    
    if (propertyName === 'fontSize') {
      const panelText = panelTexts[panelId] || {};
      const { cleanText } = getParsedText();
      const hasActualText = cleanText && cleanText.trim();
      
      let baseFontSize;
      if (hasActualText && !panelText.fontSize) {
        const panel = panelRects.find(p => p.panelId === panelId);
        if (panel && calculateOptimalFontSize) {
          baseFontSize = calculateOptimalFontSize(cleanText, panel.width, panel.height);
        } else {
          baseFontSize = lastUsedTextSettings.fontSize || 26;
        }
      } else {
        baseFontSize = panelText.fontSize || lastUsedTextSettings.fontSize || 26;
      }
      
      return Math.round(baseFontSize * textScaleFactor);
    }
    
    if (propertyName === 'strokeWidth') {
      return currentValue || lastUsedTextSettings.strokeWidth || 2;
    }
    
    if (propertyName === 'textPositionX') {
      return currentValue !== undefined ? currentValue : (lastUsedTextSettings.textPositionX || 0);
    }
    
    if (propertyName === 'textPositionY') {
      const textPositionY = currentValue !== undefined ? currentValue : (lastUsedTextSettings.textPositionY || 0);
      if (textPositionY <= 0) {
        return `${Math.round(5 + (textPositionY / 100) * 5)}%`;
      }
      return `${Math.round(5 + (textPositionY / 100) * 95)}%`;
    }
    
    if (propertyName === 'textRotation') {
      return `${currentValue !== undefined ? currentValue : (lastUsedTextSettings.textRotation || 0)}°`;
    }
    
    return currentValue || 0;
  }, [panelTexts, panelId, lastUsedTextSettings, panelRects, calculateOptimalFontSize, textScaleFactor, getParsedText]);

  const syncActiveFormatsFromSelection = useCallback((overrideSelection) => {
    const inputEl = textFieldRefs.current[panelId];
    if (!inputEl) return;

    const { rawValue, cleanText, ranges } = getParsedText();

    if (cleanText.length === 0) {
      setActiveInlineFormats([]);
      return;
    }

    const selectionStart = overrideSelection ? overrideSelection.start : inputEl.selectionStart ?? 0;
    const selectionEnd = overrideSelection ? overrideSelection.end : inputEl.selectionEnd ?? selectionStart;

    selectionCacheRef.current = {
      start: selectionStart,
      end: selectionEnd,
      timestamp: Date.now(),
      hadFocus: true,
    };

    const { rawToPlain } = buildIndexMaps(rawValue);
    const { start, end } = resolveSelectionBounds(
      ranges,
      cleanText.length,
      selectionStart,
      selectionEnd,
      rawToPlain,
    );

    const activeFormats = getActiveFormatsFromRanges(ranges, start, end);
    setActiveInlineFormats(activeFormats);
  }, [getParsedText, panelId]);

  const syncActiveFormatsRef = React.useRef(syncActiveFormatsFromSelection);
  React.useEffect(() => {
    syncActiveFormatsRef.current = syncActiveFormatsFromSelection;
  }, [syncActiveFormatsFromSelection]);

  const applyInlineStyleToggle = useCallback((styleKey) => {
    const inputEl = textFieldRefs.current[panelId];
    if (!inputEl) return false;

    const { rawValue, cleanText, ranges } = getParsedText();

    if (cleanText.length === 0) {
      return false;
    }

    const hadFocus = document.activeElement === inputEl;
    const cache = selectionCacheRef.current || {};
    const now = Date.now();
    const cacheIsUsable = cache && typeof cache.start === 'number' && typeof cache.end === 'number';
    const cacheIsFresh = cacheIsUsable && now - cache.timestamp < SELECTION_CACHE_TTL_MS;
    const cacheIsMeaningful = cacheIsUsable && (cache.start !== 0 || cache.end !== rawValue.length);
    const usedCachedSelection = !hadFocus && (cacheIsFresh || cacheIsMeaningful);

    const selectionStart = hadFocus && inputEl.selectionStart !== null
      ? inputEl.selectionStart
      : usedCachedSelection
        ? cache.start
        : 0;
    const selectionEnd = hadFocus && inputEl.selectionEnd !== null
      ? inputEl.selectionEnd
      : usedCachedSelection
        ? cache.end
        : rawValue.length;
    const { rawToPlain } = buildIndexMaps(rawValue);
    const selectionIsCollapsed = selectionStart === selectionEnd;
    const originalPlainStart = rawToPlain[Math.min(selectionStart, rawToPlain.length - 1)] ?? 0;
    const originalPlainEnd = rawToPlain[Math.min(selectionEnd, rawToPlain.length - 1)] ?? originalPlainStart;
    const caretPlain = rawToPlain[Math.min(selectionStart, rawToPlain.length - 1)] ?? 0;
    const resolved = resolveSelectionBounds(
      ranges,
      cleanText.length,
      selectionStart,
      selectionEnd,
      rawToPlain,
    );

    let selectionStartPlain = resolved.start;
    let selectionEndPlain = resolved.end;

    if (selectionIsCollapsed) {
      const caretRange = ranges.find(
        (range) => caretPlain >= range.start && caretPlain < range.end,
      );
      if (caretRange) {
        selectionStartPlain = caretRange.start;
        selectionEndPlain = caretRange.end;
      }
    }

    if (selectionEndPlain <= selectionStartPlain) {
      return false;
    }

    const updatedRanges = toggleStyleInRanges(
      ranges,
      selectionStartPlain,
      selectionEndPlain,
      styleKey,
    );
    const nextValue = serializeRangesToMarkup(cleanText, updatedRanges);
    const nextIndexMaps = buildIndexMaps(nextValue);
    const finalPlainStart = selectionIsCollapsed ? caretPlain : originalPlainStart;
    const finalPlainEnd = selectionIsCollapsed ? caretPlain : originalPlainEnd;
    const nextSelectionStart = nextIndexMaps.plainToRaw[finalPlainStart] ?? nextValue.length;
    const nextSelectionEnd = nextIndexMaps.plainToRaw[finalPlainEnd] ?? nextValue.length;
    const activeFormats = getActiveFormatsFromRanges(
      updatedRanges,
      selectionStartPlain,
      selectionEndPlain,
    );

    handleTextChange('content', cleanText, nextValue);

    requestAnimationFrame(() => {
      if (hadFocus) {
        inputEl.focus();
        inputEl.setSelectionRange(nextSelectionStart, nextSelectionEnd);
      }
      selectionCacheRef.current = {
        start: nextSelectionStart,
        end: nextSelectionEnd,
        timestamp: Date.now(),
        hadFocus: hadFocus || usedCachedSelection,
      };
      setActiveInlineFormats(activeFormats);
    });

    return true;
  }, [getParsedText, panelId, handleTextChange]);

  // Slider interaction handlers
  const handleSliderMouseDown = useCallback((propertyName) => {
    setActiveSlider(`${panelId}-${propertyName}`);
  }, [panelId]);

  const handleSliderMouseUp = useCallback(() => {
    setActiveSlider(null);
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      const activeEl = document.activeElement;
      const inputEl = textFieldRefs.current[panelId];
      if (!activeEl || activeEl !== inputEl || !inputEl) {
        return;
      }

      if (inputEl.selectionStart == null || inputEl.selectionEnd == null) {
        return;
      }

      selectionCacheRef.current = {
        start: inputEl.selectionStart,
        end: inputEl.selectionEnd,
        timestamp: Date.now(),
        hadFocus: true,
      };
      syncActiveFormatsFromSelection({
        start: inputEl.selectionStart,
        end: inputEl.selectionEnd,
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [panelId, syncActiveFormatsFromSelection]);

  // Text color scroll event handling
  useEffect(() => {
    const textColorElement = textColorScrollerRef.current;
    
    if (textColorElement) {
      textColorElement.addEventListener('scroll', handleTextColorScroll);
      setTimeout(() => {
        handleTextColorScroll();
      }, 100);
    }
    
    const handleResize = () => {
      handleTextColorScroll();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      if (textColorElement) {
        textColorElement.removeEventListener('scroll', handleTextColorScroll);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [handleTextColorScroll]);

  // Ensure scroll indicators settle after mount
  useEffect(() => {
    if (textColorScrollerRef.current) {
      setTimeout(() => handleTextColorScroll(), 50);
      setTimeout(() => handleTextColorScroll(), 200);
      setTimeout(() => handleTextColorScroll(), 500);
    }
  }, [handleTextColorScroll]);

  // Re-evaluate indicators when toggling inline color view
  useEffect(() => {
    setTimeout(() => handleTextColorScroll(), 50);
    setTimeout(() => handleTextColorScroll(), 200);
  }, [showInlineColor, handleTextColorScroll]);

  // Effect to update localStorage when custom text color changes
  useEffect(() => {
    const currentTextColor = panelTexts[panelId]?.color || lastUsedTextSettings.color || '#ffffff';
    const isCustomTextColor = !TEXT_COLOR_PRESETS.some(c => c.color === currentTextColor);
    
    if (isCustomTextColor) {
      setSavedCustomTextColor(currentTextColor);
      localStorage.setItem('memeTextCustomColor', currentTextColor);
    }
  }, [panelTexts, lastUsedTextSettings, panelId]);

  // Focus text field when caption editor opens
  useEffect(() => {
    let focusTimeout;
    let selectionTimeout;
    let touchTimeout;

    focusTimeout = setTimeout(() => {
      const inputElement = textFieldRefs.current[panelId];
      if (inputElement) {
        inputElement.focus();
        const textLength = inputElement.value.length;
        selectionTimeout = setTimeout(() => {
          inputElement.setSelectionRange(textLength, textLength);
          syncActiveFormatsRef.current?.({
            start: textLength,
            end: textLength,
          });
          if ('ontouchstart' in window) {
            inputElement.click();
            touchTimeout = setTimeout(() => {
              inputElement.setSelectionRange(textLength, textLength);
            }, 100);
          }
        }, 50);
      }
    }, 300);

    return () => {
      clearTimeout(focusTimeout);
      clearTimeout(selectionTimeout);
      clearTimeout(touchTimeout);
    };
  }, [panelId]);

  const parsedText = getParsedText();
  const rawTextValue = parsedText.rawValue;
  const cleanTextValue = parsedText.cleanText;

  return (
    <Box
      data-text-editor-container
      sx={{
        position: 'absolute',
        top: rect.y + rect.height,
        left: sidePadding,
        width: componentWidth - (sidePadding * 2),
        zIndex: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.97)',
        borderRadius: `${borderRadius}px`,
        border: '1px solid rgba(255, 255, 255, 0.3)',
        transition: 'all 0.3s ease-in-out',
        // Prevent double scroll and avoid covering bottom fixed bar
        maxHeight: 'calc(100vh - 140px)',
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <Box sx={{ p: 1 }}>

        {/* Editor Content */}
        <Box sx={{ mb: 1 }}>
          {!positioningOnly && (
            <>
              {/* Text input field */}
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Add Caption"
                value={rawTextValue}
                onChange={(e) => {
                  handleTextChange('content', e.target.value);
                  syncActiveFormatsFromSelection();
                }}
                inputRef={(el) => {
                  if (el) {
                    textFieldRefs.current[panelId] = el;
                  }
                }}
                onFocus={() => syncActiveFormatsFromSelection()}
                onSelect={() => syncActiveFormatsFromSelection()}
                onKeyUp={() => syncActiveFormatsFromSelection()}
                onMouseUp={() => syncActiveFormatsFromSelection()}
                size="small"
                sx={{
                  mb: 1,
                  '& .MuiInputBase-root': {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    color: '#000000',
                    p: 0,
                  },
                  '& .MuiInputBase-input': {
                    textAlign: 'center',
                  },
                  '& .MuiInputBase-inputMultiline': {
                    padding: '8px 12px',
                    lineHeight: 1.35,
                  },
                }}
              />

              {/* Bold/Italic + Font Family OR Inline Color (toggleable, no layout shift) */}
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0, mb: 1, height: 42 }}>
              {!showInlineColor && (
                <>
              <ToggleButtonGroup
                value={(() => {
                  const result = [...activeInlineFormats];
                  // Mark color toggle as selected when non-default color is active
                  const defaultColor = (lastUsedTextSettings.color || '#ffffff').toLowerCase();
                  if (currentTextColor && currentTextColor.toLowerCase() !== defaultColor) {
                    result.push('color');
                  }
                  return result;
                })()}
                onChange={(event) => {
                  const clicked = event?.currentTarget?.value;
                  if (clicked === 'bold' || clicked === 'italic' || clicked === 'underline') {
                    applyInlineStyleToggle(clicked === 'underline' ? 'underline' : clicked);
                  } else if (clicked === 'color') {
                    setShowInlineColor(true);
                  }
                }}
                aria-label="text formatting"
                sx={{ 
                  flexShrink: 0,
                  mr: 1,
                  height: '42px',
                  '& .MuiToggleButton-root': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    height: '42px',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: '#ffffff',
                    },
                  }
                }}
              >
                <ToggleButton size='small' value="bold" aria-label="bold">
                  <FormatBold />
                </ToggleButton>
                <ToggleButton size='small' value="italic" aria-label="italic">
                  <FormatItalic />
                </ToggleButton>
                <ToggleButton size='small' value="underline" aria-label="underline">
                  <FormatUnderlined />
                </ToggleButton>
                {/* Inline color toggle within the group */}
                <ToggleButton
                  size='small'
                  value="color"
                  aria-label="color"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowInlineColor(true); }}
                >
                  <Palette sx={{ color: currentTextColor }} />
                </ToggleButton>
              </ToggleButtonGroup>
              <FormControl sx={{ flex: 1 }}>
                <Select
                  value={panelTexts[panelId]?.fontFamily || lastUsedTextSettings.fontFamily || 'Arial'}
                  onChange={(e) => handleTextChange('fontFamily', e.target.value)}
                  sx={{ 
                    color: '#ffffff',
                    fontFamily: panelTexts[panelId]?.fontFamily || lastUsedTextSettings.fontFamily || 'Arial',
                    height: '42px',
                    '& .MuiSelect-select': {
                      textAlign: 'left',
                      padding: '8px 14px',
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#ffffff',
                    },
                    '& .MuiSvgIcon-root': {
                      color: '#ffffff',
                    }
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: { 
                        maxHeight: 200,
                        bgcolor: 'rgba(0, 0, 0, 0.9)',
                        '& .MuiMenuItem-root': {
                          color: '#ffffff',
                        }
                      }
                    }
                  }}
                >
                  {fonts.map((font) => (
                    <MenuItem 
                      key={font} 
                      value={font}
                      sx={{ fontFamily: font }}
                    >
                      {font}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              </>
              )}

              {showInlineColor && (
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', height: 42 }}>
                  {/* Square button on left to go back to formatting */}
                  <Tooltip title="Back" placement="top">
                    <IconButton
                      size="small"
                      onClick={() => setShowInlineColor(false)}
                      sx={{
                        mr: 1,
                        color: '#ffffff',
                        border: '1px solid rgba(255,255,255,0.3)',
                        bgcolor: 'transparent',
                        borderRadius: '6px !important',
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.6)' },
                        width: 36,
                        height: 36,
                        flexShrink: 0,
                      }}
                      aria-label="Back to formatting"
                    >
                      <ChevronLeft fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {/* Inline color scroller (same size as main) with indicators */}
                  <Box
                    ref={textColorScrollerRef}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      maxWidth: '100%',
                      overflowX: 'auto',
                      overflowY: 'hidden',
                      position: 'relative',
                      flex: 1,
                    }}
                  >
                    <Box sx={{ flex: 1, position: 'relative' }}>
                      <HorizontalScroller
                        onScroll={handleTextColorScroll}
                        sx={{
                          pt: 0,
                          pb: 0,
                          mt: 0,
                          minHeight: 42,
                          alignItems: 'center',
                          gap: theme.spacing(1),
                        }}
                      >
                      {/* Custom color picker */}
                      <Tooltip title="Pick Custom Color" arrow>
                        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <ColorSwatch
                            onClick={() => textColorPickerRef.current && textColorPickerRef.current.click()}
                            selected={false}
                            sx={{
                              position: 'relative',
                              flexShrink: 0,
                              backgroundColor: savedCustomTextColor,
                              backgroundImage:
                                'linear-gradient(45deg, rgba(200,200,200,0.2) 25%, transparent 25%), linear-gradient(-45deg, rgba(200,200,200,0.2) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(200,200,200,0.2) 75%), linear-gradient(-45deg, transparent 75%, rgba(200,200,200,0.2) 75%)',
                              backgroundSize: '8px 8px',
                              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                            }}
                          >
                            <Colorize fontSize="inherit" sx={{ fontSize: 18, color: isDarkColor(savedCustomTextColor) ? '#fff' : '#000' }} />
                          </ColorSwatch>
                          <input
                            type="color"
                            value={savedCustomTextColor}
                            onChange={handleCustomTextColorChange}
                            ref={textColorPickerRef}
                            style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                          />
                        </Box>
                      </Tooltip>

                      {/* Saved custom color (if not in presets) */}
                      {hasSavedCustomTextColor && (
                        <Tooltip title="Custom Color" arrow>
                          <ColorSwatch
                            onClick={() => { handleTextChange('color', savedCustomTextColor); setShowInlineColor(false); }}
                            selected={(panelTexts[panelId]?.color || lastUsedTextSettings.color || '#ffffff') === savedCustomTextColor}
                            sx={{ backgroundColor: savedCustomTextColor, flexShrink: 0 }}
                          />
                        </Tooltip>
                      )}

                      {/* Preset colors */}
                      {TEXT_COLOR_PRESETS.map((colorOption) => (
                        <Tooltip key={colorOption.color} title={colorOption.name} arrow>
                          <ColorSwatch
                            onClick={() => { handleTextChange('color', colorOption.color); setShowInlineColor(false); }}
                            selected={(panelTexts[panelId]?.color || lastUsedTextSettings.color || '#ffffff') === colorOption.color}
                            sx={{ backgroundColor: colorOption.color, flexShrink: 0 }}
                          />
                        </Tooltip>
                      ))}
                        <Box sx={{ minWidth: 4, flexShrink: 0 }} />
                      </HorizontalScroller>
                      {/* Visual indicators for scrolling */}
                      <ScrollIndicator direction="left" isVisible={textColorLeftScroll} />
                      <ScrollIndicator direction="right" isVisible={textColorRightScroll} />
                    </Box>
                  </Box>
                </Box>
              )}
              </Box>
            </>
          )}

            {/* Full-width color section removed: color options only show when toggled inline */}

            {/* Font Size */}
            {!positioningOnly && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.25, mb: 0.25 }}>
              <Tooltip title="Font Size" placement="left">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 40 }}>
                  <FormatSize sx={{ color: '#ffffff' }} />
                </Box>
              </Tooltip>
              <Slider
                value={(() => {
                  const panelText = panelTexts[panelId] || {};
                  const hasActualText = cleanTextValue && cleanTextValue.trim();
                  let baseFontSize;
                  if (hasActualText && !panelText.fontSize) {
                    const panel = panelRects.find(p => p.panelId === panelId);
                    if (panel && calculateOptimalFontSize) {
                      baseFontSize = calculateOptimalFontSize(cleanTextValue, panel.width, panel.height);
                    } else {
                      baseFontSize = lastUsedTextSettings.fontSize || 26;
                    }
                  } else {
                    baseFontSize = panelText.fontSize || lastUsedTextSettings.fontSize || 26;
                  }
                  return Math.round(baseFontSize * textScaleFactor);
                })()}
                onChange={(e, value) => {
                  if (e.type === 'mousedown') {
                    return;
                  }
                  const baseFontSize = value / textScaleFactor;
                  handleTextChange('fontSize', baseFontSize);
                }}
                onMouseDown={() => handleSliderMouseDown('fontSize')}
                onMouseUp={handleSliderMouseUp}
                onTouchStart={() => handleSliderMouseDown('fontSize')}
                onTouchEnd={handleSliderMouseUp}
                min={Math.round(8 * textScaleFactor)}
                max={Math.round(72 * textScaleFactor)}
                step={1}
                sx={{ 
                  flex: 1,
                  color: '#ffffff',
                  mx: 1,
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 40 }}>
                {activeSlider === `${panelId}-fontSize` ? (
                  <Typography variant="caption" sx={{ color: '#ffffff', textAlign: 'center' }}>
                    {getCurrentValue('fontSize')}
                  </Typography>
                ) : (
                  <IconButton
                    size="small"
                    onClick={() => handleResetClick('format', 'fontSize')}
                    disabled={isValueAtDefault('fontSize')}
                    sx={{ 
                      color: '#ffffff', 
                      p: 0.5,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                      '&.Mui-disabled': {
                        color: 'rgba(255, 255, 255, 0.3)',
                      }
                    }}
                  >
                    <Restore fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </Box>
            )}

            {/* Placement controls (shown only in positioning mode) */}
            {positioningOnly && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.25 }}>
              <Tooltip title="Vertical Position" placement="left">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 40 }}>
                  <SwapVert sx={{ color: '#ffffff' }} />
                </Box>
              </Tooltip>
              <Slider
                value={(() => {
                  const textPositionY = panelTexts[panelId]?.textPositionY !== undefined ? panelTexts[panelId].textPositionY : (lastUsedTextSettings.textPositionY || 0);
                  if (textPositionY <= 0) {
                    return 5 + (textPositionY / 100) * 5;
                  }
                  return 5 + (textPositionY / 100) * 95;
                })()}
                onChange={(e, value) => {
                  if (e.type === 'mousedown') {
                    return;
                  }
                  let textPositionY;
                  if (value <= 5) {
                    textPositionY = ((value - 5) / 5) * 100;
                  } else {
                    textPositionY = ((value - 5) / 95) * 100;
                  }
                  handleTextChange('textPositionY', textPositionY);
                }}
                onMouseDown={() => handleSliderMouseDown('textPositionY')}
                onMouseUp={handleSliderMouseUp}
                onTouchStart={() => handleSliderMouseDown('textPositionY')}
                onTouchEnd={handleSliderMouseUp}
                min={0}
                max={100}
                step={1}
                marks={[{ value: 5 }]}
                sx={{ 
                  flex: 1,
                  color: '#ffffff',
                  mx: 1,
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 40 }}>
                {activeSlider === `${panelId}-textPositionY` ? (
                  <Typography variant="caption" sx={{ color: '#ffffff', textAlign: 'center' }}>
                    {getCurrentValue('textPositionY')}
                  </Typography>
                ) : (
                  <IconButton
                    size="small"
                    onClick={() => handleResetClick('placement', 'textPositionY')}
                    disabled={isValueAtDefault('textPositionY')}
                    sx={{ 
                      color: '#ffffff', 
                      p: 0.5,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                      '&.Mui-disabled': {
                        color: 'rgba(255, 255, 255, 0.3)',
                      }
                    }}
                  >
                    <Restore fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </Box>
            )}

            {positioningOnly && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.25 }}>
              <Tooltip title="Horizontal Position" placement="left">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 40 }}>
                  <SwapHoriz sx={{ color: '#ffffff' }} />
                </Box>
              </Tooltip>
              <Slider
                value={panelTexts[panelId]?.textPositionX !== undefined ? panelTexts[panelId].textPositionX : (lastUsedTextSettings.textPositionX || 0)}
                onChange={(e, value) => {
                  if (e.type === 'mousedown') {
                    return;
                  }
                  handleTextChange('textPositionX', value);
                }}
                onMouseDown={() => handleSliderMouseDown('textPositionX')}
                onMouseUp={handleSliderMouseUp}
                onTouchStart={() => handleSliderMouseDown('textPositionX')}
                onTouchEnd={handleSliderMouseUp}
                min={-100}
                max={100}
                step={1}
                marks={[{ value: 0 }]}
                sx={{ 
                  flex: 1,
                  color: '#ffffff',
                  mx: 1,
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 40 }}>
                {activeSlider === `${panelId}-textPositionX` ? (
                  <Typography variant="caption" sx={{ color: '#ffffff', textAlign: 'center' }}>
                    {getCurrentValue('textPositionX')}%
                  </Typography>
                ) : (
                  <IconButton
                    size="small"
                    onClick={() => handleResetClick('placement', 'textPositionX')}
                    disabled={isValueAtDefault('textPositionX')}
                    sx={{ 
                      color: '#ffffff', 
                      p: 0.5,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                      '&.Mui-disabled': {
                        color: 'rgba(255, 255, 255, 0.3)',
                      }
                    }}
                  >
                    <Restore fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </Box>
            )}

            {positioningOnly && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title="Rotation" placement="left">
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 40 }}>
                  <RotateLeft sx={{ color: '#ffffff' }} />
                </Box>
              </Tooltip>
              <Slider
                value={panelTexts[panelId]?.textRotation !== undefined ? panelTexts[panelId].textRotation : (lastUsedTextSettings.textRotation || 0)}
                onChange={(e, value) => {
                  if (e.type === 'mousedown') {
                    return;
                  }
                  handleTextChange('textRotation', value);
                }}
                onMouseDown={() => handleSliderMouseDown('textRotation')}
                onMouseUp={handleSliderMouseUp}
                onTouchStart={() => handleSliderMouseDown('textRotation')}
                onTouchEnd={handleSliderMouseUp}
                min={-180}
                max={180}
                step={1}
                marks={[{ value: 0 }]}
                sx={{ 
                  flex: 1,
                  color: '#ffffff',
                  mx: 1,
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 40 }}>
                {activeSlider === `${panelId}-textRotation` ? (
                  <Typography variant="caption" sx={{ color: '#ffffff', textAlign: 'center' }}>
                    {getCurrentValue('textRotation')}
                  </Typography>
                ) : (
                  <IconButton
                    size="small"
                    onClick={() => handleResetClick('placement', 'textRotation')}
                    disabled={isValueAtDefault('textRotation')}
                    sx={{ 
                      color: '#ffffff', 
                      p: 0.5,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                      '&.Mui-disabled': {
                        color: 'rgba(255, 255, 255, 0.3)',
                      }
                    }}
                  >
                    <Restore fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </Box>
            )}

          </Box>

        

        

        

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Position toggle on the left */}
            <Tooltip title={positioningOnly ? 'Show formatting controls' : 'Show positioning controls'} placement="top">
              <IconButton
                aria-label="Toggle positioning"
                onClick={() => setPositioningOnly(v => !v)}
                sx={{
                  width: 40,
                  height: 40,
                  color: positioningOnly ? '#111' : '#ffffff',
                  border: '1px solid rgba(255,255,255,0.35)',
                  borderRadius: 1,
                  bgcolor: positioningOnly ? '#fff' : 'transparent',
                  '&:hover': { bgcolor: positioningOnly ? '#f0f0f0' : 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.6)' },
                }}
              >
                <ControlCamera fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Done fills remaining space */}
            <Button
              variant="contained"
              onClick={onClose}
              sx={{
                flex: 1,
                height: 40,
                backgroundColor: '#4CAF50',
                '&:hover': { backgroundColor: '#45a049' },
                textTransform: 'none',
                fontWeight: 800,
              }}
            >
              Done
            </Button>

            {/* Delete on the right; always visible and closes editor */}
            <IconButton
              aria-label="Clear caption"
              onClick={() => {
                const currentText = panelTexts[panelId] || {};
                if (updatePanelText) {
                  updatePanelText(panelId, { ...currentText, content: '', rawContent: '' });
                }
                if (typeof onClose === 'function') onClose();
              }}
              sx={{
                width: 40,
                height: 40,
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: 1,
                bgcolor: 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.6)' },
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
        </Box>
      </Box>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={handleResetCancel}
        maxWidth="xs"
        fullWidth
        BackdropProps={{
          sx: {
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(2px)'
          }
        }}
        PaperProps={{
          elevation: 16,
          sx: theme => ({
            bgcolor: theme.palette.mode === 'dark' ? '#1f2126' : '#ffffff',
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 12px 32px rgba(0,0,0,0.7)'
              : '0 12px 32px rgba(0,0,0,0.25)'
          })
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider', px: 3, py: 2, letterSpacing: 0, lineHeight: 1.3 }}>
          Reset to Default
        </DialogTitle>
        <DialogContent sx={{ color: 'text.primary', '&&': { px: 3, pt: 2, pb: 2 } }}>
          <Typography variant="body1" sx={{ m: 0, lineHeight: 1.5 }}>
            Are you sure you want to reset this setting to its default value? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', px: 3, py: 1.5, gap: 1 }}>
          <Button onClick={handleResetCancel}>
            Cancel
          </Button>
          <Button onClick={handleResetConfirm} color="error" variant="contained" autoFocus>
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

CaptionEditor.propTypes = {
  panelId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  panelTexts: PropTypes.object.isRequired,
  lastUsedTextSettings: PropTypes.object.isRequired,
  updatePanelText: PropTypes.func.isRequired,
  panelRects: PropTypes.array.isRequired,
  calculateOptimalFontSize: PropTypes.func.isRequired,
  textScaleFactor: PropTypes.number,
  onClose: PropTypes.func.isRequired,
  rect: PropTypes.object,
  componentWidth: PropTypes.number,
};

export default CaptionEditor;

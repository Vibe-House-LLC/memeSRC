/* eslint-disable no-unused-vars, react/prop-types */
import { useState, useRef, useEffect, useContext } from "react";
import { useTheme, styled, alpha } from "@mui/material/styles";
import {
  Box,
  Button,
  Typography,
  Grid,
  Paper,
  Alert,
  Chip,
  IconButton,
  useMediaQuery,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";
import {
  KeyboardArrowLeft,
  KeyboardArrowRight,
  ChevronLeft,
  ChevronRight,
  AspectRatio,
  GridView,
  Check,
  Add,
  Remove,
  Tag,
  BorderAll,
  Palette,
  Colorize
} from "@mui/icons-material";
import { UserContext } from "../../../UserContext";

// Import styled components
import { TemplateCard } from "../styled/CollageStyled";

// Import layout configuration
import { aspectRatioPresets, layoutTemplates, getLayoutsForPanelCount } from "../config/CollageConfig";

// Color presets for border colors
const COLOR_PRESETS = [
  { color: '#FFFFFF', name: 'White' },
  { color: '#000000', name: 'Black' },
  { color: '#FF0000', name: 'Red' },
  { color: '#0000FF', name: 'Blue' },
  { color: '#FFFF00', name: 'Yellow' },
  { color: '#00FF00', name: 'Green' }
];

// Create a new styled component for aspect ratio cards
const AspectRatioCard = styled(Paper)(({ theme, selected }) => ({
  cursor: 'pointer',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  transition: theme.transitions.create(
    ['border-color', 'background-color', 'box-shadow'],
    { duration: theme.transitions.duration.shorter }
  ),
  border: selected 
    ? `2px solid ${theme.palette.primary.main}` 
    : `1px solid ${theme.palette.divider}`,
  backgroundColor: selected 
    ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.15 : 0.08)
    : theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  '&:hover': {
    boxShadow: selected 
      ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
      : theme.palette.mode === 'dark'
        ? '0 4px 12px rgba(0,0,0,0.25)'
        : '0 4px 12px rgba(0,0,0,0.1)',
    borderColor: selected ? theme.palette.primary.main : theme.palette.primary.light
  },
  // Card dimensions
  width: 80,
  height: 80,
  padding: theme.spacing(1),
  flexShrink: 0,
  // Subtle animation on click
  '&:active': {
    transform: 'scale(0.98)',
    transition: 'transform 0.1s',
  }
}));

// Panel Counter component for panel count selector
const PanelCounter = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(1.25), // Reduced padding to decrease height
  backgroundColor: alpha(theme.palette.background.paper, 0.6),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  marginTop: 0,
  marginBottom: theme.spacing(2) // Reduced bottom margin
}));

// Panel Count Button
const PanelCountButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.primary.main, 0.08),
  color: theme.palette.primary.main,
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.3) : alpha(theme.palette.primary.main, 0.15),
  },
  '&.Mui-disabled': {
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.action.disabled, 0.2) : alpha(theme.palette.action.disabled, 0.1),
    color: theme.palette.action.disabled,
  }
}));

// Create a new styled component for the action buttons container
const ActionButtonsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  marginTop: theme.spacing(3),
}));

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
  gap: theme.spacing(2),
  padding: theme.spacing(1, 0, 1.25, 0), // Added more bottom padding to accommodate hanging chips
  position: 'relative',
  scrollBehavior: 'smooth',
  alignItems: 'center',  // Center items vertically
  justifyContent: 'flex-start',  // Start alignment for consistent scrolling
  minHeight: 80,  // Reduced height to match content better
  maxWidth: '100%', // Ensure it doesn't exceed container width
  width: '100%', // Take full width of parent
  boxSizing: 'border-box', // Include padding in width calculation
  // Contain content to prevent layout shift
  contain: 'content',
  // Smoother momentum scrolling (for Safari)
  WebkitOverflowScrolling: 'touch',
  // Show that content is scrollable on mobile
  overscrollBehavior: 'contain',
  // Consistent spacing across devices
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(1, 0, 1.25, 0), // Added more bottom padding to accommodate hanging chips
    gap: theme.spacing(2), // Consistent gap
  }
}));

// Improved ScrollButton for consistent appearance
const ScrollButton = styled(IconButton)(({ theme, direction }) => ({
  position: 'absolute',
  top: 'calc(50% - 8px)', // Further adjusted to account for the increased bottom padding
  transform: 'translateY(-50%)',
  zIndex: 10,
  // Consistent styling across all devices
  backgroundColor: theme.palette.mode === 'dark' 
    ? alpha(theme.palette.background.paper, 0.8)
    : alpha(theme.palette.background.paper, 0.9),
  // Better shadow for depth without overwhelming the UI
  boxShadow: `0 2px 8px ${theme.palette.mode === 'dark' 
    ? 'rgba(0,0,0,0.3)' 
    : 'rgba(0,0,0,0.15)'}`,
  // Clean border
  border: `1px solid ${theme.palette.mode === 'dark'
    ? alpha(theme.palette.divider, 0.5)
    : theme.palette.divider}`,
  // Primary color for better visibility
  color: theme.palette.primary.main,
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? alpha(theme.palette.background.paper, 0.9)
      : alpha(theme.palette.background.default, 0.95),
    color: theme.palette.primary.dark,
    transform: 'translateY(-50%) scale(1.05)',
    boxShadow: `0 3px 10px ${theme.palette.mode === 'dark' 
      ? 'rgba(0,0,0,0.4)' 
      : 'rgba(0,0,0,0.2)'}`,
  },
  // Consistent positioning for both directions
  ...(direction === 'left' ? { left: -8 } : { right: -8 }),
  // Consistent sizing across devices
  width: 32,
  height: 32,
  minWidth: 'unset',
  padding: 0,
  // Consistent circular shape on all devices
  borderRadius: '50%',
  // Better transition for hover states
  transition: theme.transitions.create(
    ['background-color', 'color', 'box-shadow', 'transform', 'opacity'], 
    { duration: theme.transitions.duration.shorter }
  ),
  // Same styling for mobile and desktop
  [theme.breakpoints.up('sm')]: {
    width: 36,
    height: 36,
    // Consistent positioning for desktop
    ...(direction === 'left' ? { left: -12 } : { right: -12 }),
  }
}));

// Improved ScrollIndicator with subtle gradient
const ScrollIndicator = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isVisible'
})(({ theme, direction, isVisible }) => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: 40, // Slightly narrower for subtlety
  pointerEvents: 'none',
  zIndex: 2,
  opacity: isVisible ? 1 : 0,
  transition: 'opacity 0.3s ease',
  background: direction === 'left'
    ? `linear-gradient(90deg, ${theme.palette.mode === 'dark' 
        ? 'rgba(25,25,25,0.9)' 
        : 'rgba(255,255,255,0.9)'} 0%, transparent 100%)`
    : `linear-gradient(270deg, ${theme.palette.mode === 'dark' 
        ? 'rgba(25,25,25,0.9)' 
        : 'rgba(255,255,255,0.9)'} 0%, transparent 100%)`,
  ...(direction === 'left' ? { left: 0 } : { right: 0 })
}));

const StepSectionHeading = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(0.75),
  paddingLeft: theme.spacing(0.5),
  paddingRight: theme.spacing(0.5),
}));

const MobileSettingsTypeScroller = styled(Box)(({ theme }) => ({
  display: 'flex',
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollbarWidth: 'none',
  '&::-webkit-scrollbar': {
    display: 'none',
  },
  msOverflowStyle: 'none',
  gap: theme.spacing(1),
  paddingBottom: theme.spacing(0.25),
  WebkitOverflowScrolling: 'touch',
}));

const MobileSettingsTypeButton = styled(Button, {
  shouldForwardProp: (prop) => prop !== 'selected',
})(({ theme, selected }) => ({
  flexShrink: 0,
  borderRadius: 999,
  textTransform: 'none',
  fontWeight: selected ? 700 : 600,
  letterSpacing: 0.1,
  minHeight: 36,
  minWidth: 0,
  padding: theme.spacing(0.5, 1.6),
  color: selected ? theme.palette.primary.main : theme.palette.text.secondary,
  border: `1px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
  backgroundColor: selected
    ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.12)
    : alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.3 : 0.8),
  '&:hover': {
    backgroundColor: selected
      ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.3 : 0.2)
      : alpha(theme.palette.action.hover, theme.palette.mode === 'dark' ? 0.25 : 0.7),
    borderColor: selected ? theme.palette.primary.main : theme.palette.text.disabled,
  },
  '&.Mui-focusVisible': {
    outline: `2px solid ${alpha(theme.palette.primary.main, 0.6)}`,
    outlineOffset: 1,
  },
}));

const MOBILE_SETTING_OPTIONS = [
  { id: 'aspect-ratio', label: 'Ratio', panelId: 'collage-settings-panel-aspect-ratio' },
  { id: 'layout', label: 'Layout', panelId: 'collage-settings-panel-layout' },
  { id: 'borders', label: 'Borders', panelId: 'collage-settings-panel-borders' },
  { id: 'panel-count', label: 'Panels', panelId: 'collage-settings-panel-panel-count' },
];

// Helper function to convert aspect ratio value to a friendly format
const getFriendlyAspectRatio = (value) => {
  if (value === 1) return '1:1';
  
  // Common aspect ratios with friendly names
  if (Math.abs(value - 0.8) < 0.01) return '4:5';      // Portrait
  if (Math.abs(value - 2/3) < 0.01) return '2:3';      // Added 2:3 ratio
  if (Math.abs(value - 0.5625) < 0.01) return '9:16';  // Instagram Story
  if (Math.abs(value - 1.33) < 0.01) return '4:3';     // Classic
  if (Math.abs(value - 1.5) < 0.01) return '3:2';      // Added 3:2 ratio
  if (Math.abs(value - 1.78) < 0.01) return '16:9';    // Landscape
  
  // For other values, find the closest simple fraction
  if (value > 1) {
    // Landscape orientation
    return `${Math.round(value)}:1`;
  }
  // Portrait orientation
  return `1:${Math.round(1/value)}`;
};

// Create a color swatch component for border color selection
const ColorSwatch = styled(Box)(({ theme, selected }) => ({
  width: 36,
  height: 36,
  borderRadius: '50%',
  cursor: 'pointer',
  boxSizing: 'border-box',
  border: selected ? `3px solid ${theme.palette.primary.main}` : '2px solid #ffffff',
  boxShadow: selected 
    ? `0 0 0 2px ${theme.palette.primary.main}` 
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
    transform: 'scale(1.15)',
    boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
  },
  '&:active': {
    transform: 'scale(0.95)',
  }
}));

// Custom color picker input - hidden but accessible
const ColorPickerInput = styled('input')(({ theme }) => ({
  opacity: 0,
  position: 'absolute',
  pointerEvents: 'none',
  height: 0,
  width: 0,
}));

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

// Renamed component to CollageLayoutSettings
const CollageLayoutSettings = ({
  selectedImages, 
  selectedTemplate, 
  setSelectedTemplate, 
  selectedAspectRatio, 
  setSelectedAspectRatio,
  panelCount,
  setPanelCount,
  handleNext,
  aspectRatioPresets,
  layoutTemplates,
  borderThickness,
  setBorderThickness,
  borderColor,
  setBorderColor,
  borderThicknessOptions,
  // New props for safe panel reduction
  panelImageMapping,
  removeImage,
}) => {
  // State for scroll indicators
  const [aspectLeftScroll, setAspectLeftScroll] = useState(false);
  const [aspectRightScroll, setAspectRightScroll] = useState(false);
  const [layoutLeftScroll, setLayoutLeftScroll] = useState(false);
  const [layoutRightScroll, setLayoutRightScroll] = useState(false);
  const [borderLeftScroll, setBorderLeftScroll] = useState(false);
  const [borderRightScroll, setBorderRightScroll] = useState(false);
  const [colorLeftScroll, setColorLeftScroll] = useState(false);
  const [colorRightScroll, setColorRightScroll] = useState(false);
  // Confirm dialog state for panel reduction when last panel has an image
  const [confirmState, setConfirmState] = useState({ open: false, imageIndex: null, onConfirm: null });
  const [activeMobileSetting, setActiveMobileSetting] = useState(null);
  
  // Refs for scrollable containers
  const aspectRatioRef = useRef(null);
  const layoutsRef = useRef(null);
  const borderThicknessRef = useRef(null);
  const borderColorRef = useRef(null);
  const colorPickerRef = useRef(null);
  
  // Theme and responsive helpers
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useContext(UserContext);
  const isAdmin = user?.['cognito:groups']?.includes('admins');

  const isSectionVisible = (sectionId) => !isMobile || activeMobileSetting === sectionId;

  const handleMobileSettingKeyDown = (event, currentIndex) => {
    if (!isMobile) return;

    const { key } = event;
    const supportsKey = key === 'ArrowRight' || key === 'ArrowLeft' || key === 'Home' || key === 'End';
    if (!supportsKey) return;

    event.preventDefault();
    const lastIndex = MOBILE_SETTING_OPTIONS.length - 1;
    let nextIndex = currentIndex;

    if (key === 'ArrowRight') {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    } else if (key === 'ArrowLeft') {
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    } else if (key === 'Home') {
      nextIndex = 0;
    } else if (key === 'End') {
      nextIndex = lastIndex;
    }

    const nextSettingId = MOBILE_SETTING_OPTIONS[nextIndex].id;
    setActiveMobileSetting(nextSettingId);
    const nextTab = document.getElementById(`collage-settings-tab-${nextSettingId}`);
    if (nextTab) nextTab.focus();
  };
  
  // Get aspect ratio value based on selected preset
  const getAspectRatioValue = () => {
    const preset = aspectRatioPresets.find(p => p.id === selectedAspectRatio);
    return preset ? preset.value : 1;
  };
  
  // Get compatible templates based on panel count
  const getCompatibleTemplates = () => {
    // Use our new getLayoutsForPanelCount function if it exists, otherwise fall back
    if (typeof getLayoutsForPanelCount === 'function') {
      return getLayoutsForPanelCount(panelCount, selectedAspectRatio);
    }
    
    // Legacy fallback (should not be needed once updated)
    return layoutTemplates.filter(template => 
      template.minImages <= panelCount && template.maxImages >= panelCount
    );
  };
  
  // Handle aspect ratio change
  const handleSelectAspectRatio = (aspectRatioId) => {
    setSelectedAspectRatio(aspectRatioId);
    
    // Get templates optimized for the new aspect ratio
    const newCompatibleTemplates = (typeof getLayoutsForPanelCount === 'function') 
      ? getLayoutsForPanelCount(panelCount, aspectRatioId)
      : compatibleTemplates;
      
    // If we have templates, select the most suitable one
    if (newCompatibleTemplates.length > 0) {
      // The templates should already be prioritized based on aspect ratio suitability
      // The most suitable template for this aspect ratio will be first in the list
      setSelectedTemplate(newCompatibleTemplates[0]);
    }
  };
  
  // Handle template selection
  const handleTemplateClick = (template) => {
    // Check compatibility - templates from getLayoutsForPanelCount are always compatible
    const isCompatible = template.minImages <= panelCount && template.maxImages >= panelCount;
    if (isCompatible) {
      setSelectedTemplate(template);
    }
  };

  // Handle panel count changes
  const handlePanelCountIncrease = () => {
    if (panelCount < 5) {
      const newCount = panelCount + 1;
      setPanelCount(newCount);
      
      // Get optimized templates for the new panel count
      const newTemplates = (typeof getLayoutsForPanelCount === 'function')
        ? getLayoutsForPanelCount(newCount, selectedAspectRatio)
        : layoutTemplates.filter(t => t.minImages <= newCount && t.maxImages >= newCount);
      
      // Select the best template for the new panel count
      if (newTemplates.length > 0) {
        setSelectedTemplate(newTemplates[0]);
      } else {
        setSelectedTemplate(null);
      }
    }
  };

  const handlePanelCountDecrease = () => {
    if (panelCount <= 1) return;

    const newCount = panelCount - 1;

    // Identify the panel that would be removed (last panel in current layout)
    let lastPanelId = null;
    try {
      const panelsArr = selectedTemplate?.layout?.panels || selectedTemplate?.panels || [];
      lastPanelId = panelsArr?.[panelCount - 1]?.id ?? `panel-${panelCount}`;
    } catch (_) {
      lastPanelId = `panel-${panelCount}`;
    }

    const imageIndexToRemove = panelImageMapping?.[lastPanelId];
    const hasImageToRemove = typeof imageIndexToRemove === 'number' && imageIndexToRemove >= 0;

    const proceedToDecrease = () => {
      setPanelCount(newCount);

      // Get optimized templates for the new panel count
      const newTemplates = (typeof getLayoutsForPanelCount === 'function')
        ? getLayoutsForPanelCount(newCount, selectedAspectRatio)
        : layoutTemplates.filter(t => t.minImages <= newCount && t.maxImages >= newCount);

      // Select the best template for the new panel count
      if (newTemplates.length > 0) {
        setSelectedTemplate(newTemplates[0]);
      } else {
        setSelectedTemplate(null);
      }
    };

    if (hasImageToRemove && typeof removeImage === 'function') {
      setConfirmState({
        open: true,
        imageIndex: imageIndexToRemove,
        onConfirm: () => {
          try { removeImage(imageIndexToRemove); } catch (_) { /* ignore */ }
          proceedToDecrease();
        },
      });
    } else {
      proceedToDecrease();
    }
  };
  
  // Function to improve scroll experience - refactored for smooth and consistent behavior
  const scrollLeft = (ref) => {
    if (ref.current) {
      // Calculate a consistent scroll distance based on container width
      const scrollDistance = Math.min(ref.current.clientWidth * 0.5, 250);
      ref.current.scrollBy({ left: -scrollDistance, behavior: 'smooth' });
      
      // Update scroll indicators after scrolling
      setTimeout(() => {
        if (ref === aspectRatioRef) {
          handleAspectScroll();
        } else if (ref === layoutsRef) {
          handleLayoutScroll();
        } else if (ref === borderThicknessRef) {
          handleBorderScroll();
        } else if (ref === borderColorRef) {
          handleColorScroll();
        }
      }, 350); // Slightly longer timeout to ensure scroll completes
    }
  };
  
  const scrollRight = (ref) => {
    if (ref.current) {
      // Calculate a consistent scroll distance based on container width
      const scrollDistance = Math.min(ref.current.clientWidth * 0.5, 250);
      ref.current.scrollBy({ left: scrollDistance, behavior: 'smooth' });
      
      // Update scroll indicators after scrolling
      setTimeout(() => {
        if (ref === aspectRatioRef) {
          handleAspectScroll();
        } else if (ref === layoutsRef) {
          handleLayoutScroll();
        } else if (ref === borderThicknessRef) {
          handleBorderScroll();
        } else if (ref === borderColorRef) {
          handleColorScroll();
        }
      }, 350); // Slightly longer timeout to ensure scroll completes
    }
  };

  // Check if scrolling is needed and update indicator states
  const checkScrollPosition = (ref, setLeftScroll, setRightScroll) => {
    if (!ref.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = ref.current;
    const hasLeft = scrollLeft > 5; // Use a small threshold to detect left scrollability
    const hasRight = scrollLeft < scrollWidth - clientWidth - 5; // Use a small threshold to detect right scrollability
    
    setLeftScroll(hasLeft);
    setRightScroll(hasRight);
  };

  // Define scroll handler functions outside useEffect for accessibility in cleanup
  const handleAspectScroll = () => {
    checkScrollPosition(aspectRatioRef, setAspectLeftScroll, setAspectRightScroll);
  };
  
  const handleLayoutScroll = () => {
    checkScrollPosition(layoutsRef, setLayoutLeftScroll, setLayoutRightScroll);
  };

  // Handle border thickness change
  const handleBorderScroll = () => {
    checkScrollPosition(borderThicknessRef, setBorderLeftScroll, setBorderRightScroll);
  };
  
  // Handle scrolling for color options
  const handleColorScroll = () => {
    checkScrollPosition(borderColorRef, setColorLeftScroll, setColorRightScroll);
  };
  
  // Handle custom color selection
  const handleCustomColorChange = (e) => {
    const newColor = e.target.value;
    setBorderColor(newColor);
    setSavedCustomColor(newColor);
    localStorage.setItem('memeCollageBorderCustomColor', newColor);
  };
  
  // Check scroll positions on initial render and window resize
  useEffect(() => {
    // Initial check of scroll positions
    handleAspectScroll();
    handleLayoutScroll();
    handleBorderScroll();
    handleColorScroll();
    
    // Add resize listener to update scroll indicators
    const handleResize = () => {
      handleAspectScroll();
      handleLayoutScroll();
      handleBorderScroll();
      handleColorScroll();
    };
    
    // Add scroll event listeners to both containers
    const aspectRatioElement = aspectRatioRef.current;
    const layoutsElement = layoutsRef.current;
    const borderThicknessElement = borderThicknessRef.current;
    const borderColorElement = borderColorRef.current;
    
    if (aspectRatioElement) {
      aspectRatioElement.addEventListener('scroll', handleAspectScroll);
    }
    
    if (layoutsElement) {
      layoutsElement.addEventListener('scroll', handleLayoutScroll);
    }
    
    if (borderThicknessElement) {
      borderThicknessElement.addEventListener('scroll', handleBorderScroll);
    }
    
    if (borderColorElement) {
      borderColorElement.addEventListener('scroll', handleColorScroll);
    }
    
    window.addEventListener('resize', handleResize);
    
    // Clean up event listeners
    return () => {
      if (aspectRatioElement) {
        aspectRatioElement.removeEventListener('scroll', handleAspectScroll);
      }
      
      if (layoutsElement) {
        layoutsElement.removeEventListener('scroll', handleLayoutScroll);
      }
      
      if (borderThicknessElement) {
        borderThicknessElement.removeEventListener('scroll', handleBorderScroll);
      }
      
      if (borderColorElement) {
        borderColorElement.removeEventListener('scroll', handleColorScroll);
      }
      
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Update scroll indicators when content or panel count changes
  useEffect(() => {
    handleAspectScroll();
    
    // Small delay to ensure layout has updated
    setTimeout(() => {
      handleAspectScroll();
    }, 100);
  }, [selectedAspectRatio, panelCount]);
  
  // Update layout scroll indicators when templates or panel count changes
  useEffect(() => {
    handleLayoutScroll();
    
    // Small delay to ensure layout has updated
    setTimeout(() => {
      handleLayoutScroll();
    }, 100);
  }, [selectedTemplate, panelCount]);
  
  // Update border thickness scroll indicators when options change
  useEffect(() => {
    handleBorderScroll();
    
    // Small delay to ensure layout has updated
    setTimeout(() => {
      handleBorderScroll();
    }, 100);
  }, [borderThickness, borderThicknessOptions]);
  
  // Update border color scroll indicators
  useEffect(() => {
    handleColorScroll();
    
    // Small delay to ensure layout has updated
    setTimeout(() => {
      handleColorScroll();
    }, 100);
  }, [borderColor]);

  useEffect(() => {
    if (!isMobile) return;

    const refreshActiveSectionScroll = () => {
      if (activeMobileSetting === 'aspect-ratio') {
        handleAspectScroll();
      } else if (activeMobileSetting === 'layout') {
        handleLayoutScroll();
      } else if (activeMobileSetting === 'borders') {
        handleBorderScroll();
        handleColorScroll();
      }
    };

    refreshActiveSectionScroll();
    const timer = setTimeout(refreshActiveSectionScroll, 120);
    return () => clearTimeout(timer);
  }, [activeMobileSetting, isMobile, panelCount, selectedAspectRatio, borderThickness, borderColor]);
  
  // Render aspect ratio preview
  const renderAspectRatioPreview = (preset) => {
    const { value, name } = preset;
    
    // Calculate dimensions based on the aspect ratio value
    const friendlyRatio = getFriendlyAspectRatio(value);
  
    // Determine box dimensions to exactly match the aspect ratio
    const isPortrait = value < 1;
    let width;
    let height;
    
    if (isPortrait) {
      // For portrait: height is fixed at 60%, width is calculated to match aspect ratio
      height = 60; 
      width = height * value; // width = height * (width/height)
    } else {
      // For landscape or square: width is fixed at 60%, height is calculated to match aspect ratio
      width = 60;
      height = width / value; // height = width / (width/height)
    }
    
    return (
      <Box sx={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        padding: 0.5
      }}>
        <Box 
          sx={{
            width: `${width}%`,
            height: `${height}%`,
            border: theme => `2px solid ${alpha(
              theme.palette.mode === 'dark' 
                ? theme.palette.primary.light 
                : theme.palette.primary.main, 
              0.8
            )}`,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: theme => alpha(
              theme.palette.mode === 'dark' 
                ? theme.palette.primary.dark 
                : theme.palette.primary.light, 
              0.15
            ),
            boxShadow: '0px 2px 4px rgba(0,0,0,0.1)'
          }}
        />
      </Box>
    );
  };

  const compatibleTemplates = getCompatibleTemplates();
  const selectedAspectRatioObj = aspectRatioPresets.find(p => p.id === selectedAspectRatio);
  
  // Clean up all the duplicate state variables and use a single savedCustomColor state
  const [savedCustomColor, setSavedCustomColor] = useState(() => {
    // Initialize from localStorage or use white as default
    const storedColor = localStorage.getItem('memeCollageBorderCustomColor');
    return storedColor || '#FFFFFF';
  });
  
  // Check if current color is a custom color (not in the preset colors)
  const isCustomColor = !COLOR_PRESETS.some(c => c.color === borderColor);
  
  // Check if there's a saved custom color that's different from preset colors
  const hasSavedCustomColor = savedCustomColor && !COLOR_PRESETS.some(c => c.color === savedCustomColor);
  
  // Effect to update localStorage when custom color changes
  useEffect(() => {
    if (isCustomColor) {
      setSavedCustomColor(borderColor);
      localStorage.setItem('memeCollageBorderCustomColor', borderColor);
    }
  }, [borderColor, isCustomColor]);
  
  return (
    <Box sx={{ pt: isMobile ? 0.5 : 0, pb: isMobile ? 0.25 : 0 }}>
      {/* Confirm removal when reducing panel count hides an image */}
      <Dialog
        open={!!confirmState.open}
        onClose={() => setConfirmState({ open: false, imageIndex: null, onConfirm: null })}
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
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 12px 32px rgba(0,0,0,0.7)'
              : '0 12px 32px rgba(0,0,0,0.25)'
          })
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid', borderColor: 'divider', px: 3, py: 2, letterSpacing: 0, lineHeight: 1.3 }}>Remove panel?</DialogTitle>
        <DialogContent sx={{ color: 'text.primary', '&&': { px: 3, pt: 2, pb: 2 } }}>
          <Typography variant="body1" sx={{ m: 0, letterSpacing: 0, lineHeight: 1.5 }}>
            This removes a panel and image {panelCount}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', px: 3, py: 1.5, gap: 1 }}>
          <Button onClick={() => setConfirmState({ open: false, imageIndex: null, onConfirm: null })}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              const fn = confirmState.onConfirm;
              setConfirmState({ open: false, imageIndex: null, onConfirm: null });
              if (typeof fn === 'function') fn();
            }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {isMobile && (
        <Box sx={{ mb: 1.25 }}>
          <MobileSettingsTypeScroller role="tablist" aria-label="Collage settings categories">
            {MOBILE_SETTING_OPTIONS.map(({ id, label, panelId }, index) => {
              const isSelected = activeMobileSetting === id;
              const defaultFocusable = activeMobileSetting === null && index === 0;
              return (
                <MobileSettingsTypeButton
                  key={id}
                  id={`collage-settings-tab-${id}`}
                  role="tab"
                  type="button"
                  selected={isSelected}
                  aria-selected={isSelected}
                  aria-controls={panelId}
                  tabIndex={isSelected || defaultFocusable ? 0 : -1}
                  onClick={() => setActiveMobileSetting((prev) => (prev === id ? null : id))}
                  onKeyDown={(event) => handleMobileSettingKeyDown(event, index)}
                >
                  {label}
                </MobileSettingsTypeButton>
              );
            })}
          </MobileSettingsTypeScroller>
        </Box>
      )}

      {/* Panel Count Selector - Moved to the top */}
      <Box
        id="collage-settings-panel-panel-count"
        role={isMobile ? 'tabpanel' : undefined}
        aria-labelledby={isMobile ? 'collage-settings-tab-panel-count' : undefined}
        hidden={!isSectionVisible('panel-count')}
        sx={{
          display: isSectionVisible('panel-count') ? 'block' : 'none',
          mb: isMobile ? 0.75 : 1,
        }}
      >
        {!isMobile && (
          <StepSectionHeading>
            <Tag sx={{ mr: 1.5, color: '#fff', fontSize: '1.3rem' }} />
            <Typography variant="h5" fontWeight={600} sx={{ color: '#fff' }}>
              Panel Count
            </Typography>
          </StepSectionHeading>
        )}
        
        <PanelCounter>
          <PanelCountButton 
            aria-label="Decrease panel count" 
            disabled={panelCount <= 1}
            onClick={handlePanelCountDecrease}
            size="medium"
            sx={{
              color: isMobile ? 'text.primary' : '#fff',
              bgcolor: isMobile ? alpha(theme.palette.primary.main, 0.12) : 'rgba(255, 255, 255, 0.15)',
              '&:hover': {
                bgcolor: isMobile ? alpha(theme.palette.primary.main, 0.22) : 'rgba(255, 255, 255, 0.25)',
              },
              width: 32,
              height: 32,
              padding: 0.5
            }}
          >
            <Remove />
          </PanelCountButton>
          
          <Typography variant="h4" sx={{ 
            minWidth: 50, 
            textAlign: 'center',
            fontWeight: 700,
            color: isMobile ? 'text.primary' : '#fff',
            fontSize: '2rem',
            textShadow: '0px 2px 3px rgba(0,0,0,0.1)'
          }}>
            {panelCount}
          </Typography>
          
          <PanelCountButton 
            aria-label="Increase panel count" 
            disabled={panelCount >= 5}
            onClick={handlePanelCountIncrease}
            size="medium"
            sx={{
              color: isMobile ? 'text.primary' : '#fff',
              bgcolor: isMobile ? alpha(theme.palette.primary.main, 0.12) : 'rgba(255, 255, 255, 0.15)',
              '&:hover': {
                bgcolor: isMobile ? alpha(theme.palette.primary.main, 0.22) : 'rgba(255, 255, 255, 0.25)',
              },
              width: 32,
              height: 32,
              padding: 0.5
            }}
          >
            <Add />
          </PanelCountButton>
        </PanelCounter>
      </Box>
    
      {/* Aspect Ratio Section - with horizontal scrolling */}
      <Box
        id="collage-settings-panel-aspect-ratio"
        role={isMobile ? 'tabpanel' : undefined}
        aria-labelledby={isMobile ? 'collage-settings-tab-aspect-ratio' : undefined}
        hidden={!isSectionVisible('aspect-ratio')}
        sx={{
          display: isSectionVisible('aspect-ratio') ? 'block' : 'none',
          mb: isMobile ? 0.75 : 2,
        }}
      >
        {!isMobile && (
          <StepSectionHeading>
            <AspectRatio sx={{ mr: 1.5, color: '#fff', fontSize: '1.3rem' }} />
            <Typography variant="h5" fontWeight={600} sx={{ color: '#fff' }}>
              Aspect Ratio
            </Typography>
          </StepSectionHeading>
        )}
        
        <Box sx={{ 
          position: 'relative', 
          width: '100%',
          // Consistent padding for container
          mt: 1,
          pt: 0.5, 
          pb: 0.5,
          // Consistent styling across devices
          [theme.breakpoints.up('sm')]: {
            width: '100%', // Full width container
            mt: 1, // Consistent margin
            pt: 0.5,
            pb: 0.5
          }
        }}>
          <ScrollButton 
            direction="left" 
            onClick={() => scrollLeft(aspectRatioRef)} 
            size="small"
            aria-label="Scroll left"
            sx={{ 
              // Always display buttons for consistency, just disable them
              display: 'flex',
              visibility: aspectLeftScroll ? 'visible' : 'hidden',
              opacity: aspectLeftScroll ? 1 : 0,
            }}
          >
            <ChevronLeft fontSize="small" />
          </ScrollButton>
          
          <ScrollButton 
            direction="right" 
            onClick={() => scrollRight(aspectRatioRef)} 
            size="small"
            aria-label="Scroll right"
            sx={{ 
              // Always display buttons for consistency, just disable them
              display: 'flex',
              visibility: aspectRightScroll ? 'visible' : 'hidden',
              opacity: aspectRightScroll ? 1 : 0,
            }}
          >
            <ChevronRight fontSize="small" />
          </ScrollButton>
          
          <HorizontalScroller 
            ref={aspectRatioRef}
            sx={{ pt: 0, mt: 0 }}
          >
            {aspectRatioPresets.map(preset => (
              <AspectRatioCard
                key={preset.id}
                selected={selectedAspectRatio === preset.id}
                onClick={() => handleSelectAspectRatio(preset.id)}
                elevation={selectedAspectRatio === preset.id ? 3 : 1}
                sx={{ mb: 0 }} // Remove margin bottom as the HorizontalScroller now has padding
              >
                {renderAspectRatioPreview(preset)}
                
                {selectedAspectRatio === preset.id && (
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      top: 4, 
                      right: 4, 
                      bgcolor: 'primary.main',
                      borderRadius: '50%',
                      width: 20,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Check sx={{ fontSize: 14, color: 'white' }} />
                  </Box>
                )}
                
                <Chip
                  label={getFriendlyAspectRatio(preset.value)}
                  size="small"
                  variant="filled"
                  sx={{
                    position: 'absolute',
                    bottom: -8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    height: 18,
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    px: 0.75,
                    backgroundColor: theme => selectedAspectRatio === preset.id 
                      ? theme.palette.primary.main
                      : theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.15)' 
                        : 'rgba(0, 0, 0, 0.08)',
                    color: theme => selectedAspectRatio === preset.id 
                      ? theme.palette.primary.contrastText
                      : theme.palette.text.primary,
                    '& .MuiChip-label': {
                      px: 0.75,
                      py: 0
                    }
                  }}
                />
              </AspectRatioCard>
            ))}
            
            {/* Spacer to ensure last items can be centered when scrolled fully */}
            <Box sx={{ minWidth: 4, flexShrink: 0 }} />
          </HorizontalScroller>
          
          {/* Visual indicators for scrolling - simplified with no icons */}
          <ScrollIndicator 
            direction="left" 
            isVisible={aspectLeftScroll}
          />
          
          <ScrollIndicator 
            direction="right" 
            isVisible={aspectRightScroll}
          />
        </Box>
      </Box>
      
      {/* Layout Section - shows compatible layouts based on panel count */}
      <Box
        id="collage-settings-panel-layout"
        role={isMobile ? 'tabpanel' : undefined}
        aria-labelledby={isMobile ? 'collage-settings-tab-layout' : undefined}
        hidden={!isSectionVisible('layout')}
        sx={{
          display: isSectionVisible('layout') ? 'block' : 'none',
          mb: isMobile ? 0.75 : 2,
        }}
      >
        {!isMobile && (
          <StepSectionHeading>
            <GridView sx={{ mr: 1.5, color: '#fff', fontSize: '1.3rem' }} />
            <Typography variant="h5" fontWeight={600} sx={{ color: '#fff' }}>
              Layout
            </Typography>
          </StepSectionHeading>
        )}
        
        {compatibleTemplates.length === 0 ? (
          <Alert severity="info" sx={{ mb: 1 }}>
            No templates match the current panel count ({panelCount}). Try a different number of panels.
          </Alert>
        ) : (
          <Box sx={{ 
            position: 'relative', 
            width: '100%',
            // Consistent padding for container
            mt: 1,
            pt: 0.5, 
            pb: 0.5,
            // Consistent styling across devices
            [theme.breakpoints.up('sm')]: {
              width: '100%', // Full width container
              mt: 1, // Consistent margin
              pt: 0.5,
              pb: 0.5
            }
          }}>
            <ScrollButton 
              direction="left" 
              onClick={() => scrollLeft(layoutsRef)} 
              size="small"
              aria-label="Scroll left"
              sx={{ 
                // Always display buttons for consistency, just disable them
                display: 'flex',
                visibility: layoutLeftScroll ? 'visible' : 'hidden',
                opacity: layoutLeftScroll ? 1 : 0,
              }}
            >
              <ChevronLeft fontSize="small" />
            </ScrollButton>
            
            <ScrollButton 
              direction="right" 
              onClick={() => scrollRight(layoutsRef)} 
              size="small"
              aria-label="Scroll right"
              sx={{ 
                // Always display buttons for consistency, just disable them
                display: 'flex',
                visibility: layoutRightScroll ? 'visible' : 'hidden',
                opacity: layoutRightScroll ? 1 : 0,
              }}
            >
              <ChevronRight fontSize="small" />
            </ScrollButton>
            
            <HorizontalScroller 
              ref={layoutsRef}
              sx={{ pt: 0, mt: 0 }}
            >
              {compatibleTemplates.map(template => {
                const isSelected = selectedTemplate?.id === template.id;
                const aspectRatioValue = getAspectRatioValue();
                
                return (
                  <Box
                    key={template.id}
                    sx={{ 
                      flexShrink: 0,
                      // Use same dimensions as AspectRatioCard for consistency
                      width: 80,
                      height: 80,
                    }}
                  >
                    <TemplateCard
                      selected={isSelected}
                      onClick={() => handleTemplateClick(template)}
                      sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: theme.spacing(1),
                        transition: theme.transitions.create(
                          ['border-color', 'background-color', 'box-shadow'],
                          { duration: theme.transitions.duration.shorter }
                        ),
                        '&:hover': {
                          boxShadow: isSelected 
                            ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
                            : theme.palette.mode === 'dark'
                              ? '0 4px 12px rgba(0,0,0,0.25)'
                              : '0 4px 12px rgba(0,0,0,0.1)',
                        },
                        '&:active': {
                          transform: 'scale(0.98)',
                          transition: 'transform 0.1s',
                        }
                      }}
                    >
                      {/* Container to properly handle aspect ratio */}
                      <Box 
                        sx={{ 
                          position: 'relative',
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {/* Aspect ratio constraining box */}
                        <Box
                          sx={{
                            position: 'relative',
                            width: aspectRatioValue >= 1 ? '85%' : `${85 * aspectRatioValue}%`,
                            height: aspectRatioValue >= 1 ? `${85 / aspectRatioValue}%` : '85%',
                          }}
                        >
                          {template.renderPreview(aspectRatioValue, theme, panelCount)}
                        </Box>
                      </Box>
                      
                      {isSelected && (
                        <Box 
                          sx={{ 
                            position: 'absolute', 
                            top: 4, 
                            right: 4, 
                            bgcolor: 'primary.main',
                            borderRadius: '50%',
                            width: 20,
                            height: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Check sx={{ fontSize: 14, color: 'white' }} />
                        </Box>
                      )}
                    </TemplateCard>
                  </Box>
                );
              })}
              
              {/* Spacer to ensure last items can be centered when scrolled fully */}
              <Box sx={{ minWidth: 4, flexShrink: 0 }} />
            </HorizontalScroller>
            
            {/* Visual indicators for scrolling - simplified with no icons */}
            <ScrollIndicator 
              direction="left" 
              isVisible={layoutLeftScroll}
            />
            
            <ScrollIndicator 
              direction="right" 
              isVisible={layoutRightScroll}
            />
          </Box>
        )}
      </Box>
      
      
      
      {/* Border Thickness UI with Horizontal Scroller - Moved below Choose Layout */}
      <Box
        id="collage-settings-panel-borders"
        role={isMobile ? 'tabpanel' : undefined}
        aria-labelledby={isMobile ? 'collage-settings-tab-borders' : undefined}
        hidden={!isSectionVisible('borders')}
        sx={{
          display: isSectionVisible('borders') ? 'block' : 'none',
          mb: isMobile ? 0.75 : 0.5,
          position: 'relative',
        }}
      >
        {!isMobile && (
          <StepSectionHeading sx={{ mb: 0.5 }}>
            <BorderAll sx={{ mr: 1, color: '#fff', fontSize: '1.3rem' }} />
            <Typography variant="h5" fontWeight={600} sx={{ color: '#fff' }}>
              Borders
            </Typography>
          </StepSectionHeading>
        )}

        <Box sx={{ 
          position: 'relative', 
          width: '100%',
          mt: 0.5,
          pt: 0, 
          pb: 0,
          [theme.breakpoints.up('sm')]: {
            width: '100%',
            mt: 0.5,
            pt: 0,
            pb: 0
          }
        }}>
          {/* Border Width Scroller */}
          <Box sx={{ position: 'relative', mb: 0 }}>
            <ScrollButton 
              direction="left" 
              onClick={() => scrollLeft(borderThicknessRef)} 
              size="small"
              aria-label="Scroll left"
              sx={{ 
                display: 'flex',
                visibility: borderLeftScroll ? 'visible' : 'hidden',
                opacity: borderLeftScroll ? 1 : 0,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <ChevronLeft fontSize="small" />
            </ScrollButton>
            
            <ScrollButton 
              direction="right" 
              onClick={() => scrollRight(borderThicknessRef)} 
              size="small"
              aria-label="Scroll right"
              sx={{ 
                display: 'flex',
                visibility: borderRightScroll ? 'visible' : 'hidden',
                opacity: borderRightScroll ? 1 : 0,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <ChevronRight fontSize="small" />
            </ScrollButton>

            <Box 
              ref={borderThicknessRef}
              onScroll={handleBorderScroll}
              sx={{ 
                display: 'flex',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
                gap: theme.spacing(1),
                py: 0.25,
                mt: 0,
                minHeight: 40
              }}
            >
              {borderThicknessOptions.map((option, index) => {
                // Progressive font weight: None=400, then each option gets progressively bolder
                const fontWeight = option.label === "None" ? 400 : 400 + (index * 100);
                
                return (
                  <Chip
                    key={option.label}
                    label={option.label}
                    clickable
                    color={borderThickness === option.label.toLowerCase() ? 'primary' : 'default'}
                    onClick={() => setBorderThickness(option.label.toLowerCase())}
                    sx={{ 
                      fontWeight // Same weight whether selected or not
                    }}
                  />
                );
              })}
            </Box>
            
            <ScrollIndicator 
              direction="left" 
              isVisible={borderLeftScroll}
            />
            
            <ScrollIndicator 
              direction="right" 
              isVisible={borderRightScroll}
            />
          </Box>

          {/* Border Color Scroller */}
          <Box sx={{ position: 'relative' }}>
            <ScrollButton 
              direction="left" 
              onClick={() => scrollLeft(borderColorRef)} 
              size="small"
              aria-label="Scroll left"
              sx={{ 
                display: 'flex',
                visibility: colorLeftScroll ? 'visible' : 'hidden',
                opacity: colorLeftScroll ? 1 : 0,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <ChevronLeft fontSize="small" />
            </ScrollButton>
            
            <ScrollButton 
              direction="right" 
              onClick={() => scrollRight(borderColorRef)} 
              size="small"
              aria-label="Scroll right"
              sx={{ 
                display: 'flex',
                visibility: colorRightScroll ? 'visible' : 'hidden',
                opacity: colorRightScroll ? 1 : 0,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <ChevronRight fontSize="small" />
            </ScrollButton>

            <HorizontalScroller 
              ref={borderColorRef}
              onScroll={handleColorScroll}
              sx={{ 
                pt: 0, 
                mt: 0, 
                pb: 0, 
                pr: 2,
                minHeight: 50,
                gap: theme.spacing(1)
              }}
            >
              {/* Custom color picker - as first option, always using saved custom color */}
              <Tooltip title="Pick Custom Color" arrow>
                <Box sx={{ 
                  position: 'relative', 
                  display: 'flex', 
                  alignItems: 'center',
                  height: '60%' // Match the height of the color swatches
                }}>
                  <ColorSwatch
                    onClick={() => colorPickerRef.current && colorPickerRef.current.click()}
                    selected={false} // Never show this as selected
                    sx={{ 
                      position: 'relative',
                      // Always use the saved custom color from localStorage as background
                      backgroundColor: savedCustomColor,
                      // Add subtle checkerboard pattern for the color picker
                      backgroundImage: 'linear-gradient(45deg, rgba(200,200,200,0.2) 25%, transparent 25%), linear-gradient(-45deg, rgba(200,200,200,0.2) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(200,200,200,0.2) 75%), linear-gradient(-45deg, transparent 75%, rgba(200,200,200,0.2) 75%)',
                      backgroundSize: '8px 8px',
                      backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                    }}
                  >
                    <Colorize fontSize="small" sx={{ color: isDarkColor(savedCustomColor) ? '#fff' : '#000' }} />
                  </ColorSwatch>
                  <input
                    type="color"
                    value={savedCustomColor}
                    onChange={handleCustomColorChange}
                    ref={colorPickerRef}
                    style={{ 
                      position: 'absolute',
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer'
                    }}
                  />
                </Box>
              </Tooltip>
              
              {/* Show the saved custom color as second option if it exists and is different from presets */}
              {hasSavedCustomColor && (
                <Tooltip title="Custom Color" arrow>
                  <ColorSwatch
                    onClick={() => setBorderColor(savedCustomColor)}
                    selected={borderColor === savedCustomColor}
                    sx={{ backgroundColor: savedCustomColor }}
                  />
                </Tooltip>
              )}
              
              {/* Preset colors */}
              {COLOR_PRESETS.map((colorOption) => (
                <Tooltip key={colorOption.color} title={colorOption.name} arrow>
                  <ColorSwatch
                    onClick={() => setBorderColor(colorOption.color)}
                    selected={borderColor === colorOption.color}
                    sx={{ backgroundColor: colorOption.color }}
                  />
                </Tooltip>
              ))}
              
              {/* Spacer to ensure last items can be centered when scrolled fully */}
              <Box sx={{ minWidth: 4, flexShrink: 0 }} />
            </HorizontalScroller>
            
            {/* Visual indicators for scrolling */}
            <ScrollIndicator 
              direction="left" 
              isVisible={colorLeftScroll}
            />
            
            <ScrollIndicator 
              direction="right" 
              isVisible={colorRightScroll}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default CollageLayoutSettings; 

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
  TextField,
  useMediaQuery,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
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
  BorderAll,
  Palette,
  Colorize,
  EmojiEmotions,
  ArrowUpward,
  ArrowDownward,
  DeleteOutline,
  AddPhotoAlternate,
  MoreHoriz,
  Crop,
  DragIndicator,
  Image as ImageIcon,
  Subtitles,
  Add,
} from "@mui/icons-material";
import { UserContext } from "../../../UserContext";
import { LibraryPickerDialog } from "../../library";

// Import styled components
import { TemplateCard } from "../styled/CollageStyled";

// Import layout configuration
import { aspectRatioPresets, layoutTemplates, getLayoutsForPanelCount, getLayoutDirection } from "../config/CollageConfig";

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
  transition: 'none',
  border: selected 
    ? `2px solid ${alpha('#ffffff', 0.95)}`
    : `1px solid ${alpha('#f5f5f5', 0.26)}`,
  backgroundColor: alpha('#f5f5f5', theme.palette.mode === 'dark' ? 0.08 : 0.12),
  boxShadow: 'none',
  borderRadius: theme.shape.borderRadius,
  // Card dimensions
  width: 80,
  height: 80,
  padding: theme.spacing(1),
  flexShrink: 0,
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': {
      boxShadow: 'none',
      borderColor: selected ? alpha('#ffffff', 0.95) : alpha('#f5f5f5', 0.38),
      backgroundColor: alpha('#f5f5f5', theme.palette.mode === 'dark' ? 0.1 : 0.16),
    },
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
    ? alpha(theme.palette.background.paper, 0.7)
    : alpha(theme.palette.background.paper, 0.92),
  boxShadow: 'none',
  // Clean border
  border: `1px solid ${theme.palette.mode === 'dark'
    ? alpha('#f5f5f5', 0.3)
    : alpha('#101214', 0.2)}`,
  color: theme.palette.mode === 'dark' ? alpha('#f5f5f5', 0.85) : alpha('#101214', 0.78),
  // Consistent positioning for both directions
  ...(direction === 'left' ? { left: -8 } : { right: -8 }),
  // Consistent sizing across devices
  width: 32,
  height: 32,
  minWidth: 'unset',
  padding: 0,
  // Consistent circular shape on all devices
  borderRadius: '50%',
  transition: 'none',
  '@media (hover: hover) and (pointer: fine)': {
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark'
        ? alpha(theme.palette.background.paper, 0.82)
        : alpha(theme.palette.background.paper, 0.98),
      color: theme.palette.mode === 'dark' ? '#ffffff' : alpha('#101214', 0.95),
      transform: 'translateY(-50%)',
      boxShadow: 'none',
    },
  },
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
  gap: theme.spacing(0.9),
  paddingBottom: theme.spacing(0.35),
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
  minHeight: 38,
  minWidth: 0,
  padding: theme.spacing(0.6, 1.9),
  color: selected ? '#111213' : alpha('#f5f5f5', 0.66),
  border: `1px solid ${selected ? alpha('#ffffff', 0.95) : alpha('#f5f5f5', 0.2)}`,
  backgroundColor: selected
    ? alpha('#f5f5f5', theme.palette.mode === 'dark' ? 0.95 : 0.98)
    : alpha('#f5f5f5', theme.palette.mode === 'dark' ? 0.08 : 0.18),
  boxShadow: 'none',
  transition: 'none',
  WebkitTapHighlightColor: 'transparent',
  '&:hover': {
    color: selected ? '#111213' : alpha('#f5f5f5', 0.66),
    borderColor: selected ? alpha('#ffffff', 0.95) : alpha('#f5f5f5', 0.2),
    backgroundColor: selected
      ? alpha('#f5f5f5', theme.palette.mode === 'dark' ? 0.95 : 0.98)
      : alpha('#f5f5f5', theme.palette.mode === 'dark' ? 0.08 : 0.18),
    boxShadow: 'none',
  },
  '&:active': {
    transform: 'none',
    boxShadow: 'none',
  },
  '&.Mui-focusVisible': {
    outline: `2px solid ${alpha('#ffffff', 0.4)}`,
    outlineOffset: 1,
  },
  '& .MuiTouchRipple-root': {
    display: 'none',
  },
}));

export const MOBILE_SETTING_OPTIONS = [
  { id: 'panels', label: 'Panels', panelId: 'collage-settings-panel-panels' },
  { id: 'aspect-ratio', label: 'Size/Ratio', panelId: 'collage-settings-panel-aspect-ratio' },
  { id: 'layout', label: 'Layout', panelId: 'collage-settings-panel-layout' },
  { id: 'borders', label: 'Borders', panelId: 'collage-settings-panel-borders' },
  { id: 'stickers', label: 'Stickers', panelId: 'collage-settings-panel-stickers' },
];

const normalizeCustomAspectRatio = (value, fallback = 1) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return fallback;
  return Math.max(0.1, Math.min(10, numericValue));
};

const ratioToEditorInputs = (ratio) => {
  const safeRatio = normalizeCustomAspectRatio(ratio, 1);
  if (safeRatio >= 1) {
    return {
      width: Number((safeRatio * 100).toFixed(2)),
      height: 100,
    };
  }
  return {
    width: 100,
    height: Number((100 / safeRatio).toFixed(2)),
  };
};

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
  border: selected ? `3px solid ${alpha('#ffffff', 0.95)}` : `2px solid ${alpha(theme.palette.background.paper, 0.95)}`,
  boxShadow: selected 
    ? `0 0 0 2px ${alpha('#ffffff', 0.35)}` 
    : `0 0 0 1px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.28 : 0.14)}`,
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
    boxShadow: `0 4px 10px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.36 : 0.2)}`
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
  customAspectRatio = 1,
  setCustomAspectRatio,
  panelCount,
  panelImageMapping,
  panelTexts,
  handleNext,
  aspectRatioPresets,
  layoutTemplates,
  borderThickness,
  setBorderThickness,
  borderColor,
  setBorderColor,
  borderThicknessOptions,
  stickers = [],
  canManageStickers = false,
  onStickerLibraryOpenChange,
  onAddStickerFromLibrary,
  onMoveSticker,
  onRemoveSticker,
  onMovePanel,
  canAddPanel = false,
  onAddPanelRequest,
  onOpenPanelSource,
  onOpenPanelText,
  onOpenPanelTransform,
  onOpenPanelReorder,
  onRemovePanelRequest,
  showMobileTabs = true,
  mobileActiveSetting,
  onMobileActiveSettingChange,
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
  const [uncontrolledActiveMobileSetting, setUncontrolledActiveMobileSetting] = useState('aspect-ratio');
  const [stickerLibraryOpen, setStickerLibraryOpen] = useState(false);
  const [stickerLoading, setStickerLoading] = useState(false);
  const [stickerError, setStickerError] = useState('');
  const [customRatioWidthInput, setCustomRatioWidthInput] = useState('100');
  const [customRatioHeightInput, setCustomRatioHeightInput] = useState('100');
  const [panelActionAnchorEl, setPanelActionAnchorEl] = useState(null);
  const [panelActionTarget, setPanelActionTarget] = useState(null);
  
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
  const isMobileSettingControlled = mobileActiveSetting !== undefined;
  const activeMobileSetting = isMobileSettingControlled ? mobileActiveSetting : uncontrolledActiveMobileSetting;
  const setActiveMobileSetting = (nextSettingIdOrUpdater) => {
    const nextSettingId = typeof nextSettingIdOrUpdater === 'function'
      ? nextSettingIdOrUpdater(activeMobileSetting)
      : nextSettingIdOrUpdater;
    if (!isMobileSettingControlled) {
      setUncontrolledActiveMobileSetting(nextSettingId);
    }
    if (typeof onMobileActiveSettingChange === 'function') {
      onMobileActiveSettingChange(nextSettingId);
    }
  };

  const isSectionVisible = (sectionId) => !isMobile || activeMobileSetting === sectionId;

  const toggleMobileSetting = (settingId) => {
    setActiveMobileSetting((prev) => (prev === settingId ? null : settingId));
  };

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

  useEffect(() => {
    if (typeof onStickerLibraryOpenChange === 'function') {
      onStickerLibraryOpenChange(Boolean(stickerLibraryOpen));
    }
  }, [stickerLibraryOpen, onStickerLibraryOpenChange]);

  useEffect(() => () => {
    if (typeof onStickerLibraryOpenChange === 'function') {
      onStickerLibraryOpenChange(false);
    }
  }, [onStickerLibraryOpenChange]);
  
  // Get aspect ratio value based on selected preset
  const getAspectRatioValue = () => {
    if (selectedAspectRatio === 'custom') {
      return normalizeCustomAspectRatio(customAspectRatio, 1);
    }
    const preset = aspectRatioPresets.find(p => p.id === selectedAspectRatio);
    return preset ? preset.value : 1;
  };

  useEffect(() => {
    const { width, height } = ratioToEditorInputs(customAspectRatio);
    setCustomRatioWidthInput(String(width));
    setCustomRatioHeightInput(String(height));
  }, [customAspectRatio]);
  
  // Get compatible templates based on panel count
  const getCompatibleTemplates = () => {
    // Use our new getLayoutsForPanelCount function if it exists, otherwise fall back
    if (typeof getLayoutsForPanelCount === 'function') {
      return getLayoutsForPanelCount(
        panelCount,
        selectedAspectRatio,
        selectedAspectRatio === 'custom' ? customAspectRatio : null
      );
    }
    
    // Legacy fallback (should not be needed once updated)
    return layoutTemplates.filter(template => 
      template.minImages <= panelCount && template.maxImages >= panelCount
    );
  };
  
  // Handle aspect ratio change
  const handleSelectAspectRatio = (aspectRatioId) => {
    setSelectedAspectRatio(aspectRatioId);

    const currentCompatibleTemplates = (typeof getLayoutsForPanelCount === 'function')
      ? getLayoutsForPanelCount(
        panelCount,
        selectedAspectRatio,
        selectedAspectRatio === 'custom' ? customAspectRatio : null
      )
      : compatibleTemplates;
    const currentDefaultTemplateId = currentCompatibleTemplates?.[0]?.id || null;
    const selectedTemplateId = selectedTemplate?.id || null;
    const isManualNonDefaultSelection = Boolean(
      selectedTemplateId &&
      currentDefaultTemplateId &&
      selectedTemplateId !== currentDefaultTemplateId
    );
    const preferredDirection = isManualNonDefaultSelection
      ? getLayoutDirection(selectedTemplateId)
      : null;

    // Get templates optimized for the new aspect ratio
    const newCompatibleTemplates = (typeof getLayoutsForPanelCount === 'function') 
      ? getLayoutsForPanelCount(
        panelCount,
        aspectRatioId,
        aspectRatioId === 'custom' ? customAspectRatio : null
      )
      : compatibleTemplates;
      
    // If we have templates, select the most suitable one.
    // Preserve manual non-default stack direction when we can.
    if (newCompatibleTemplates.length > 0) {
      let nextTemplate = newCompatibleTemplates[0];
      if (preferredDirection) {
        const directionMatchedTemplate = newCompatibleTemplates.find((template) => (
          getLayoutDirection(template?.id) === preferredDirection
        ));
        if (directionMatchedTemplate) {
          nextTemplate = directionMatchedTemplate;
        }
      }
      setSelectedTemplate(nextTemplate);
    }
  };

  const applyCustomRatioInputs = () => {
    const widthValue = Number(customRatioWidthInput);
    const heightValue = Number(customRatioHeightInput);
    if (!Number.isFinite(widthValue) || !Number.isFinite(heightValue) || widthValue <= 0 || heightValue <= 0) {
      const { width, height } = ratioToEditorInputs(customAspectRatio);
      setCustomRatioWidthInput(String(width));
      setCustomRatioHeightInput(String(height));
      return;
    }
    const ratio = normalizeCustomAspectRatio(widthValue / heightValue, customAspectRatio);
    if (typeof setCustomAspectRatio === 'function') {
      setCustomAspectRatio(ratio);
    }
    const normalizedInputs = ratioToEditorInputs(ratio);
    setCustomRatioWidthInput(String(normalizedInputs.width));
    setCustomRatioHeightInput(String(normalizedInputs.height));
  };
  
  // Handle template selection
  const handleTemplateClick = (template) => {
    // Check compatibility - templates from getLayoutsForPanelCount are always compatible
    const isCompatible = template.minImages <= panelCount && template.maxImages >= panelCount;
    if (isCompatible) {
      setSelectedTemplate(template);
    }
  };

  const openStickerLibrary = () => {
    if (!canManageStickers) return;
    setStickerError('');
    setStickerLibraryOpen(true);
  };

  const closeStickerLibrary = () => {
    if (stickerLoading) return;
    setStickerLibraryOpen(false);
  };

  const handleStickerLibrarySelect = async (items) => {
    const selected = Array.isArray(items) ? items[0] : null;
    if (!selected || typeof onAddStickerFromLibrary !== 'function') return;
    setStickerLoading(true);
    setStickerError('');
    try {
      await onAddStickerFromLibrary(selected);
      setStickerLibraryOpen(false);
    } catch (error) {
      console.error('Failed to add sticker from library', error);
      setStickerError('Unable to add that sticker right now.');
    } finally {
      setStickerLoading(false);
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
  }, [selectedAspectRatio, customAspectRatio, panelCount]);
  
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
  }, [activeMobileSetting, isMobile, panelCount, selectedAspectRatio, customAspectRatio, borderThickness, borderColor]);
  
  // Render aspect ratio preview
  const renderAspectRatioPreview = (preset) => {
    const value = preset.id === 'custom'
      ? normalizeCustomAspectRatio(customAspectRatio, 1)
      : preset.value;
  
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
                      '#f5f5f5',
                      theme.palette.mode === 'dark' ? 0.72 : 0.55
                    )}`,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: theme => alpha(
                      '#f5f5f5',
                      theme.palette.mode === 'dark' ? 0.12 : 0.18
                    ),
                    boxShadow: 'none'
                  }}
                />
              </Box>
    );
  };

  const compatibleTemplates = getCompatibleTemplates();
  const selectedAspectRatioObj = aspectRatioPresets.find(p => p.id === selectedAspectRatio);
  const stickerLayers = Array.isArray(stickers) ? [...stickers].reverse() : [];
  const panelLayers = Array.from({ length: Math.max(1, Number(panelCount) || 1) }).map((_, panelIndex) => {
    const panelId = `panel-${panelIndex + 1}`;
    const imageIndex = panelImageMapping?.[panelId];
    const mappedImage = (
      typeof imageIndex === 'number' &&
      Array.isArray(selectedImages) &&
      imageIndex >= 0
    ) ? selectedImages[imageIndex] : null;
    return {
      panelId,
      panelIndex,
      imageIndex,
      image: mappedImage,
    };
  });
  const panelActionMenuOpen = Boolean(panelActionAnchorEl);
  const panelActionLayer = panelActionTarget
    ? panelLayers.find((layer) => layer.panelId === panelActionTarget.panelId)
    : null;
  const panelActionHasImage = Boolean(
    panelActionLayer &&
    typeof panelActionLayer.imageIndex === 'number' &&
    panelActionLayer.image
  );
  const panelActionText = panelActionLayer
    ? panelTexts?.[panelActionLayer.panelId]
    : null;
  const panelActionHasCaption = Boolean(
    panelActionText &&
    typeof panelActionText.content === 'string' &&
    panelActionText.content.trim().length > 0
  );

  const closePanelActionMenu = () => {
    setPanelActionAnchorEl(null);
    setPanelActionTarget(null);
  };

  const openPanelActionMenu = (event, panelLayer) => {
    event.stopPropagation();
    setPanelActionAnchorEl(event.currentTarget);
    setPanelActionTarget({
      panelId: panelLayer.panelId,
      panelIndex: panelLayer.panelIndex,
    });
  };

  const triggerPanelAction = (callback) => {
    if (!panelActionTarget || typeof callback !== 'function') {
      closePanelActionMenu();
      return;
    }
    const { panelId, panelIndex } = panelActionTarget;
    closePanelActionMenu();
    callback(panelId, panelIndex);
  };

  useEffect(() => {
    if (activeMobileSetting !== 'panels' && panelActionMenuOpen) {
      closePanelActionMenu();
    }
  }, [activeMobileSetting, panelActionMenuOpen]);
  
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
      {isMobile && showMobileTabs && (
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
                  disableRipple
                  disableTouchRipple
                  disableFocusRipple
                  aria-selected={isSelected}
                  aria-controls={panelId}
                  tabIndex={isSelected || defaultFocusable ? 0 : -1}
                  onClick={() => toggleMobileSetting(id)}
                  onKeyDown={(event) => handleMobileSettingKeyDown(event, index)}
                >
                  {label}
                </MobileSettingsTypeButton>
              );
            })}
          </MobileSettingsTypeScroller>
        </Box>
      )}

      {isMobile && (
        <Box
          id="collage-settings-panel-panels"
          role="tabpanel"
          aria-labelledby="collage-settings-tab-panels"
          hidden={!isSectionVisible('panels')}
          sx={{
            display: isSectionVisible('panels') ? 'block' : 'none',
            mb: 0.75,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.25,
              mb: 1.1,
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1, minWidth: 180 }}>
              Rearrange panel order and image placement.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Add fontSize="small" />}
              disabled={!canAddPanel || typeof onAddPanelRequest !== 'function'}
              onClick={() => typeof onAddPanelRequest === 'function' && onAddPanelRequest()}
              sx={{
                borderRadius: 999,
                textTransform: 'none',
                fontWeight: 700,
                minHeight: 34,
                px: 1.6,
              }}
            >
              Add panel
            </Button>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {panelLayers.map((panelLayer) => {
              const { panelId, panelIndex, imageIndex, image } = panelLayer;
              const canMoveUp = panelIndex > 0;
              const canMoveDown = panelIndex < panelLayers.length - 1;
              const thumbSrc = image?.displayUrl || image?.originalUrl || '';
              const hasImage = (
                typeof thumbSrc === 'string' &&
                thumbSrc.length > 0 &&
                thumbSrc !== '__START_FROM_SCRATCH__'
              );
              const panelLabel = `Panel ${panelIndex + 1}`;

              return (
                <Box
                  key={`panel-layer-row-${panelId}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    borderRadius: 1.5,
                    border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.95 : 0.82)}`,
                    backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.62 : 0.9),
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                      bgcolor: alpha(theme.palette.common.black, 0.08),
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {hasImage ? (
                      <Box
                        component="img"
                        src={thumbSrc}
                        alt={panelLabel}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <GridView sx={{ color: 'text.disabled', fontSize: 20 }} />
                    )}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      {panelLabel}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {hasImage
                        ? `Image ${Number(imageIndex) + 1}`
                        : 'No image assigned'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35 }}>
                    <IconButton
                      size="small"
                      onClick={(event) => openPanelActionMenu(event, panelLayer)}
                      aria-label={`Panel actions for ${panelLabel}`}
                    >
                      <MoreHoriz fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => canMoveUp && typeof onMovePanel === 'function' && onMovePanel(panelId, 1)}
                      disabled={!canMoveUp}
                      aria-label={`Move ${panelLabel} up`}
                    >
                      <ArrowUpward fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => canMoveDown && typeof onMovePanel === 'function' && onMovePanel(panelId, -1)}
                      disabled={!canMoveDown}
                      aria-label={`Move ${panelLabel} down`}
                    >
                      <ArrowDownward fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Menu
            anchorEl={panelActionAnchorEl}
            open={panelActionMenuOpen}
            onClose={closePanelActionMenu}
            PaperProps={{ sx: { minWidth: 200 } }}
          >
            <MenuItem
              onClick={() => triggerPanelAction(onOpenPanelTransform)}
              disabled={!panelActionHasImage || typeof onOpenPanelTransform !== 'function'}
            >
              <ListItemIcon>
                <Crop fontSize="small" />
              </ListItemIcon>
              Crop & Zoom
            </MenuItem>
            <MenuItem
              onClick={() => triggerPanelAction(onOpenPanelReorder)}
              disabled={!panelActionHasImage || typeof onOpenPanelReorder !== 'function'}
            >
              <ListItemIcon>
                <DragIndicator fontSize="small" />
              </ListItemIcon>
              Rearrange
            </MenuItem>
            <MenuItem
              onClick={() => triggerPanelAction(onOpenPanelSource)}
              disabled={typeof onOpenPanelSource !== 'function'}
            >
              <ListItemIcon>
                <ImageIcon fontSize="small" />
              </ListItemIcon>
              {panelActionHasImage ? 'Replace Image' : 'Add Image'}
            </MenuItem>
            <MenuItem
              onClick={() => triggerPanelAction(onOpenPanelText)}
              disabled={!panelActionHasImage || typeof onOpenPanelText !== 'function'}
            >
              <ListItemIcon>
                <Subtitles fontSize="small" />
              </ListItemIcon>
              {panelActionHasCaption ? 'Edit caption' : 'Add caption'}
            </MenuItem>
            <MenuItem
              onClick={() => triggerPanelAction(onRemovePanelRequest)}
              disabled={panelCount <= 1 || typeof onRemovePanelRequest !== 'function'}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon sx={{ color: 'inherit' }}>
                <DeleteOutline fontSize="small" />
              </ListItemIcon>
              Remove Panel
            </MenuItem>
          </Menu>
        </Box>
      )}
    
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
            <AspectRatio sx={{ mr: 1.5, color: 'text.secondary', fontSize: '1.3rem' }} />
            <Typography variant="h5" fontWeight={600} sx={{ color: 'text.primary' }}>
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
                
                <Chip
                  label={preset.id === 'custom' ? 'Custom' : getFriendlyAspectRatio(preset.value)}
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
                    border: '1px solid',
                    borderColor: theme => selectedAspectRatio === preset.id
                      ? alpha('#ffffff', 0.9)
                      : alpha('#f5f5f5', theme.palette.mode === 'dark' ? 0.52 : 0.42),
                    backgroundColor: theme => selectedAspectRatio === preset.id
                      ? alpha('#f5f5f5', theme.palette.mode === 'dark' ? 0.98 : 0.94)
                      : alpha('#f5f5f5', theme.palette.mode === 'dark' ? 0.38 : 0.32),
                    color: theme => selectedAspectRatio === preset.id
                      ? '#101214'
                      : (theme.palette.mode === 'dark' ? alpha('#f5f5f5', 0.95) : alpha('#101214', 0.86)),
                    boxShadow: 'none',
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

        {selectedAspectRatio === 'custom' && (
          <Box
            sx={{
              mt: 1.25,
              p: 1.25,
              borderRadius: 1.5,
              border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
              backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.35 : 0.9),
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Custom Ratio
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                label="Width"
                type="number"
                size="small"
                value={customRatioWidthInput}
                inputProps={{ min: 0.1, step: 0.1 }}
                onChange={(event) => setCustomRatioWidthInput(event.target.value)}
                onBlur={applyCustomRatioInputs}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    applyCustomRatioInputs();
                  }
                }}
              />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 0.5 }}>:</Typography>
              <TextField
                label="Height"
                type="number"
                size="small"
                value={customRatioHeightInput}
                inputProps={{ min: 0.1, step: 0.1 }}
                onChange={(event) => setCustomRatioHeightInput(event.target.value)}
                onBlur={applyCustomRatioInputs}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    applyCustomRatioInputs();
                  }
                }}
              />
              <Chip
                size="small"
                label={getFriendlyAspectRatio(getAspectRatioValue())}
                sx={{ ml: 0.5 }}
              />
            </Box>
          </Box>
        )}
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
            <GridView sx={{ mr: 1.5, color: 'text.secondary', fontSize: '1.3rem' }} />
            <Typography variant="h5" fontWeight={600} sx={{ color: 'text.primary' }}>
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
                        transition: 'none',
                        border: isSelected
                          ? `2px solid ${alpha('#ffffff', 0.95)}`
                          : `1px solid ${alpha('#f5f5f5', 0.26)}`,
                        backgroundColor: alpha('#f5f5f5', theme.palette.mode === 'dark' ? 0.08 : 0.12),
                        boxShadow: 'none',
                        '@media (hover: hover) and (pointer: fine)': {
                          '&:hover': {
                            boxShadow: 'none',
                            borderColor: isSelected ? alpha('#ffffff', 0.95) : alpha('#f5f5f5', 0.38),
                            backgroundColor: alpha('#f5f5f5', theme.palette.mode === 'dark' ? 0.1 : 0.16),
                          },
                        },
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
            <BorderAll sx={{ mr: 1, color: 'text.secondary', fontSize: '1.3rem' }} />
            <Typography variant="h5" fontWeight={600} sx={{ color: 'text.primary' }}>
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
                const isSelected = borderThickness === option.label.toLowerCase();
                
                return (
                  <Chip
                    key={option.label}
                    label={option.label}
                    clickable
                    onClick={() => setBorderThickness(option.label.toLowerCase())}
                    sx={{ 
                      fontWeight,
                      height: 34,
                      borderRadius: 999,
                      px: 1.1,
                      transition: 'none',
                      border: '1px solid',
                      borderColor: isSelected ? alpha('#ffffff', 0.95) : alpha('#f5f5f5', 0.2),
                      color: isSelected ? '#111213' : alpha('#f5f5f5', 0.7),
                      backgroundColor: isSelected
                        ? alpha('#f5f5f5', theme.palette.mode === 'dark' ? 0.95 : 0.98)
                        : alpha('#f5f5f5', theme.palette.mode === 'dark' ? 0.08 : 0.15),
                      '& .MuiChip-label': {
                        px: 1.25,
                      },
                      '@media (hover: hover) and (pointer: fine)': {
                        '&:hover': {
                          backgroundColor: isSelected
                            ? alpha('#f5f5f5', theme.palette.mode === 'dark' ? 0.95 : 0.98)
                            : alpha('#f5f5f5', theme.palette.mode === 'dark' ? 0.1 : 0.2),
                          borderColor: isSelected ? alpha('#ffffff', 0.95) : alpha('#f5f5f5', 0.3),
                        },
                      },
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
                    <Colorize fontSize="small" sx={{ color: isDarkColor(savedCustomColor) ? 'common.white' : 'common.black' }} />
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

      <Box
        id="collage-settings-panel-stickers"
        role={isMobile ? 'tabpanel' : undefined}
        aria-labelledby={isMobile ? 'collage-settings-tab-stickers' : undefined}
        hidden={!isSectionVisible('stickers')}
        sx={{
          display: isSectionVisible('stickers') ? 'block' : 'none',
          mb: isMobile ? 0.75 : 0.5,
        }}
      >
        {!isMobile && (
          <StepSectionHeading sx={{ mb: 0.75 }}>
            <EmojiEmotions sx={{ mr: 1, color: 'text.secondary', fontSize: '1.3rem' }} />
            <Typography variant="h5" fontWeight={600} sx={{ color: 'text.primary' }}>
              Stickers
            </Typography>
          </StepSectionHeading>
        )}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.25,
            mb: 1.1,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1, minWidth: 180 }}>
            Global sticker layers over the full collage.
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddPhotoAlternate />}
            onClick={openStickerLibrary}
            disabled={!canManageStickers}
            sx={{
              borderRadius: 999,
              textTransform: 'none',
              fontWeight: 700,
              minHeight: 40,
              px: 2.25,
            }}
          >
            Add sticker
          </Button>
        </Box>

        {!canManageStickers && (
          <Alert severity="info" sx={{ mb: 1.25 }}>
            Log in with library access to add sticker layers.
          </Alert>
        )}

        {canManageStickers && stickerLayers.length === 0 && (
          <Box
            sx={{
              px: 1.5,
              py: 1.4,
              borderRadius: 1.5,
              border: `1px dashed ${alpha(theme.palette.divider, 0.9)}`,
              color: 'text.secondary',
              fontSize: '0.9rem',
            }}
          >
            No stickers yet. Add one from your library.
          </Box>
        )}

        {canManageStickers && stickerLayers.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {stickerLayers.map((sticker, displayIndex) => {
              if (!sticker?.id) return null;
              const canMoveUp = displayIndex > 0;
              const canMoveDown = displayIndex < stickerLayers.length - 1;
              const layerLabel = `Sticker ${stickerLayers.length - displayIndex}`;
              const thumbSrc = sticker.thumbnailUrl || sticker.originalUrl || '';
              return (
                <Box
                  key={`sticker-layer-row-${sticker.id}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    borderRadius: 1.5,
                    border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.95 : 0.82)}`,
                    backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.62 : 0.9),
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                      bgcolor: alpha(theme.palette.common.black, 0.08),
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {thumbSrc ? (
                      <Box
                        component="img"
                        src={thumbSrc}
                        alt={layerLabel}
                        sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <EmojiEmotions sx={{ color: 'text.disabled', fontSize: 20 }} />
                    )}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      {layerLabel}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {displayIndex === 0 ? 'Top layer' : (displayIndex === stickerLayers.length - 1 ? 'Bottom layer' : 'Middle layer')}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35 }}>
                    <IconButton
                      size="small"
                      onClick={() => canMoveUp && typeof onMoveSticker === 'function' && onMoveSticker(sticker.id, 1)}
                      disabled={!canMoveUp}
                      aria-label={`Move ${layerLabel} up`}
                    >
                      <ArrowUpward fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => canMoveDown && typeof onMoveSticker === 'function' && onMoveSticker(sticker.id, -1)}
                      disabled={!canMoveDown}
                      aria-label={`Move ${layerLabel} down`}
                    >
                      <ArrowDownward fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => typeof onRemoveSticker === 'function' && onRemoveSticker(sticker.id)}
                      aria-label={`Delete ${layerLabel}`}
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      <LibraryPickerDialog
        open={stickerLibraryOpen}
        onClose={closeStickerLibrary}
        title="Choose a sticker from your library"
        onSelect={(arr) => { void handleStickerLibrarySelect(arr); }}
        busy={stickerLoading}
        errorText={stickerError}
        browserProps={{
          multiple: false,
          uploadEnabled: true,
          deleteEnabled: false,
          showActionBar: false,
          selectionEnabled: true,
          previewOnClick: true,
          showSelectToggle: true,
          initialSelectMode: true,
        }}
      />
    </Box>
  );
};

export default CollageLayoutSettings; 

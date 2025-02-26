import { useState, useRef, useEffect } from "react";
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
  useMediaQuery
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
  Settings
} from "@mui/icons-material";

// Import styled components
import { TemplateCard } from "../styled/CollageStyled";

// Import layout configuration
import { aspectRatioPresets, layoutTemplates, getLayoutsForPanelCount } from "../config/CollageConfig";

// Create a new styled component for aspect ratio cards
const AspectRatioCard = styled(Paper)(({ theme, selected }) => ({
  padding: theme.spacing(0.5),
  cursor: 'pointer',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
  border: selected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
  backgroundColor: selected 
    ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.06)
    : theme.palette.background.paper,
  '&:hover': {
    borderColor: selected ? theme.palette.primary.main : theme.palette.primary.light
  },
  // Changed size from 100x100 to 75x75 pixels for both card types
  width: 75,
  height: 75,
  flexShrink: 0
}));

// Panel Counter component for panel count selector
const PanelCounter = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: alpha(theme.palette.background.paper, 0.6),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  marginTop: 0,
  marginBottom: theme.spacing(3)
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
  scrollbarWidth: 'none',  // Firefox
  '&::-webkit-scrollbar': {
    display: 'none',  // Chrome, Safari, Opera
  },
  '-ms-overflow-style': 'none',  // IE, Edge
  gap: theme.spacing(2),
  padding: 0, // Removed padding
  position: 'relative',
  scrollBehavior: 'smooth',
  alignItems: 'center',  // Center items vertically
  justifyContent: 'flex-start',  // Start alignment for consistent scrolling
  minHeight: 95,  // Reduced height to match smaller cards
  maxWidth: '100%', // Ensure it doesn't exceed container width
  width: '100%', // Take full width of parent
  boxSizing: 'border-box', // Include padding in width calculation
  // Contain content to prevent layout shift
  contain: 'content',
  // Smoother momentum scrolling (for Safari)
  WebkitOverflowScrolling: 'touch',
  // Add custom styling for desktop
  [theme.breakpoints.up('sm')]: {
    padding: 0, // Removed padding
    // Wider gap on desktop for better spacing
    gap: theme.spacing(2.5),
  }
}));

// Scroll button for scrollers
const ScrollButton = styled(IconButton)(({ theme, direction }) => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 10,
  backgroundColor: theme.palette.mode === 'dark' 
    ? alpha(theme.palette.background.paper, 0.85)
    : alpha(theme.palette.background.paper, 0.95),
  boxShadow: 'none', // Remove shadow
  color: theme.palette.text.secondary,
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? alpha(theme.palette.background.paper, 0.95)
      : theme.palette.background.paper,
    color: theme.palette.text.primary,
  },
  // Position the buttons
  ...(direction === 'left' ? { left: 0 } : { right: 0 }),
  // Size for mobile
  width: 28,
  height: 28,
  minWidth: 'unset',
  padding: 0,
  // Styles for desktop
  [theme.breakpoints.up('sm')]: {
    width: 32,
    height: 32,
    // Position flush with container edge
    ...(direction === 'left' ? { left: 0 } : { right: 0 }),
    // Semi-circular shape on desktop
    borderRadius: direction === 'left' ? '0 50% 50% 0' : '50% 0 0 50%',
    border: 'none',
    opacity: 0.7, // Make buttons more subtle
    '&:hover': {
      opacity: 1,
      backgroundColor: theme.palette.mode === 'dark' 
        ? alpha(theme.palette.background.paper, 0.95)
        : theme.palette.background.paper,
      color: theme.palette.text.primary,
    },
    // Add transition for smooth hover
    transition: theme.transitions.create(['background-color', 'color', 'opacity'], {
      duration: theme.transitions.duration.shorter,
    }),
  }
}));

// Scroll indicator for horizontal scrollers - REMOVING THESE COMPLETELY
const ScrollIndicator = styled(Box)(({ theme, direction, visible }) => ({
  display: 'none', // Hide completely - no more gradient shadows
}));

const StepSectionHeading = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(1.25),
  paddingLeft: theme.spacing(0.5),
  paddingRight: theme.spacing(0.5),
}));

// Helper function to convert aspect ratio value to a friendly format
const getFriendlyAspectRatio = (value) => {
  if (value === 1) return '1:1';
  if (value === 'custom') return 'Custom';
  
  // Common aspect ratios with friendly names
  if (Math.abs(value - 0.8) < 0.01) return '4:5';      // Portrait
  if (Math.abs(value - 0.5625) < 0.01) return '9:16';  // Instagram Story
  if (Math.abs(value - 1.33) < 0.01) return '4:3';     // Classic
  if (Math.abs(value - 1.78) < 0.01) return '16:9';    // Landscape
  
  // For other values, find the closest simple fraction
  if (value > 1) {
    // Landscape orientation
    return `${Math.round(value)}:1`;
  }
  // Portrait orientation
  return `1:${Math.round(1/value)}`;
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
  layoutTemplates 
}) => {
  // State for scroll indicators
  const [aspectLeftScroll, setAspectLeftScroll] = useState(false);
  const [aspectRightScroll, setAspectRightScroll] = useState(false);
  const [layoutLeftScroll, setLayoutLeftScroll] = useState(false);
  const [layoutRightScroll, setLayoutRightScroll] = useState(false);
  
  // Refs for scrollable containers
  const aspectRatioRef = useRef(null);
  const layoutsRef = useRef(null);
  
  // Theme and responsive helpers
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
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
    if (panelCount > 2) {
      const newCount = panelCount - 1;
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
  
  // Function to improve scroll experience - refactored to smooth the experience
  const scrollLeft = (ref) => {
    if (ref.current) {
      // Calculate a smoother scroll distance - approx 2 items
      const scrollDistance = Math.min(ref.current.clientWidth * 0.65, 300);
      ref.current.scrollBy({ left: -scrollDistance, behavior: 'smooth' });
    }
  };
  
  const scrollRight = (ref) => {
    if (ref.current) {
      // Calculate a smoother scroll distance - approx 2 items
      const scrollDistance = Math.min(ref.current.clientWidth * 0.65, 300);
      ref.current.scrollBy({ left: scrollDistance, behavior: 'smooth' });
    }
  };

  // Check if scrolling is needed and update indicator states
  const checkScrollPosition = (ref, setLeftScroll, setRightScroll) => {
    if (!ref.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = ref.current;
    const hasLeft = scrollLeft > 0;
    const hasRight = scrollLeft < scrollWidth - clientWidth - 2; // 2px buffer for rounding
    
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

  // Monitor scroll position changes for aspect ratio
  useEffect(() => {
    const aspectRatioElement = aspectRatioRef.current;
    
    if (aspectRatioElement) {
      // Initial check
      handleAspectScroll();
      
      // Add scroll event listener
      aspectRatioElement.addEventListener('scroll', handleAspectScroll);
      
      // Recheck on window resize
      window.addEventListener('resize', handleAspectScroll);
    }
    
    return () => {
      if (aspectRatioElement) {
        aspectRatioElement.removeEventListener('scroll', handleAspectScroll);
      }
      window.removeEventListener('resize', handleAspectScroll);
    };
  }, []);
  
  // Monitor scroll position changes for layouts
  useEffect(() => {
    const layoutsElement = layoutsRef.current;
    
    if (layoutsElement) {
      // Initial check
      handleLayoutScroll();
      
      // Add scroll event listener
      layoutsElement.addEventListener('scroll', handleLayoutScroll);
      
      // Recheck on window resize
      window.addEventListener('resize', handleLayoutScroll);
    }
    
    return () => {
      if (layoutsElement) {
        layoutsElement.removeEventListener('scroll', handleLayoutScroll);
      }
      window.removeEventListener('resize', handleLayoutScroll);
    };
  }, [getCompatibleTemplates()]);
  
  // Render aspect ratio preview
  const renderAspectRatioPreview = (preset) => {
    const { value, name } = preset;
    // For custom value, show a different preview
    if (value === 'custom') {
      return (
        <Box sx={{ 
          width: '80%', 
          height: '80%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: theme => `1px dashed ${theme.palette.divider}`,
          borderRadius: 1,
        }}>
          <Typography variant="caption">Custom</Typography>
        </Box>
      );
    }
    
    // Calculate dimensions based on the aspect ratio value
    const friendlyRatio = getFriendlyAspectRatio(value);
  
    // Size the preview to fill 85% of the container while maintaining aspect ratio
    const containerSize = 85;
    
    let previewWidth;
    let previewHeight;
    
    if (value >= 1) {
      // Landscape or square orientation (wider than tall)
      previewWidth = containerSize;
      previewHeight = containerSize / value;
    } else {
      // Portrait orientation (taller than wide)
      previewHeight = containerSize;
      previewWidth = containerSize * value;
    }
    
    return (
      <Box sx={{ 
        display: 'flex',
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100%',
        width: '100%',
      }}>
        <Box 
          sx={{ 
            width: `${previewWidth}%`,
            height: `${previewHeight}%`,
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            borderRadius: '2px',
            border: theme => `1px solid ${theme.palette.divider}`,
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Display aspect ratio with friendly format - smaller text for smaller cards */}
          <Typography variant="caption" fontWeight="medium" color="text.primary" sx={{ opacity: 0.9 }}>
            {friendlyRatio}
          </Typography>
        </Box>
      </Box>
    );
  };

  const compatibleTemplates = getCompatibleTemplates();
  const selectedAspectRatioObj = aspectRatioPresets.find(p => p.id === selectedAspectRatio);
  
  return (
    <Box sx={{ pt: isMobile ? 3 : 4 }}>
      {/* Panel Count Selector - Moved to the top */}
      <Box sx={{ mb: isMobile ? 0 : 1 }}>
        <StepSectionHeading>
          <Settings sx={{ 
            mr: 1.5, 
            color: 'text.secondary', 
            fontSize: '1.1rem' 
          }} />
          <Typography variant="subtitle1" fontWeight={500}>
            Number of Panels
          </Typography>
        </StepSectionHeading>
        
        <PanelCounter>
          <PanelCountButton 
            aria-label="Decrease panel count" 
            disabled={panelCount <= 2}
            onClick={handlePanelCountDecrease}
            size="medium"
          >
            <Remove />
          </PanelCountButton>
          
          <Typography variant="h5" sx={{ 
            minWidth: 40, 
            textAlign: 'center',
            fontWeight: 600
          }}>
            {panelCount}
          </Typography>
          
          <PanelCountButton 
            aria-label="Increase panel count" 
            disabled={panelCount >= 5}
            onClick={handlePanelCountIncrease}
            size="medium"
          >
            <Add />
          </PanelCountButton>
        </PanelCounter>
      </Box>
    
      {/* Aspect Ratio Section - with horizontal scrolling */}
      <Box sx={{ mb: isMobile ? 1 : 2 }}>
        <StepSectionHeading>
          <AspectRatio sx={{ 
            mr: 1.5, 
            color: 'text.secondary', 
            fontSize: '1.1rem' 
          }} />
          <Typography variant="subtitle1" fontWeight={500}>
            Aspect Ratio
          </Typography>
        </StepSectionHeading>
        
        <Box sx={{ 
          position: 'relative', 
          width: '100%',
          // Remove any extra margin
          mt: 0,
          pt: 0, // Explicitly set padding-top to 0
          // Desktop specific styling
          [theme.breakpoints.up('sm')]: {
            width: 'calc(100% + 8px)', // Slightly wider to accommodate buttons
            marginLeft: '-4px', // Center the expanded container
            mt: 0, // Ensure no margin on desktop either
            pt: 0, // Ensure no padding on desktop either
          }
        }}>
          {!isMobile && (
            <>
              <ScrollButton 
                direction="left" 
                onClick={() => scrollLeft(aspectRatioRef)} 
                size="small"
                aria-label="Scroll left"
                sx={{ 
                  display: aspectLeftScroll ? 'flex' : 'none',
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
                  display: aspectRightScroll ? 'flex' : 'none',
                }}
              >
                <ChevronRight fontSize="small" />
              </ScrollButton>
            </>
          )}
          
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
              </AspectRatioCard>
            ))}
            
            {/* Spacer to ensure last items can be centered when scrolled fully */}
            <Box sx={{ minWidth: 4, flexShrink: 0 }} />
          </HorizontalScroller>
          
          {/* Visual indicators for scrolling - simplified with no icons */}
          <ScrollIndicator 
            direction="left" 
            visible={aspectLeftScroll}
          />
          
          <ScrollIndicator 
            direction="right" 
            visible={aspectRightScroll}
          />
        </Box>
      </Box>
      
      {/* Layout Section - shows compatible layouts based on panel count */}
      <Box sx={{ mb: isMobile ? 2 : 3 }}>
        <StepSectionHeading>
          <GridView sx={{ 
            mr: 1.5, 
            color: 'text.secondary', 
            fontSize: '1.1rem' 
          }} />
          <Typography variant="subtitle1" fontWeight={500}>
            Choose Layout
          </Typography>
        </StepSectionHeading>
        
        {compatibleTemplates.length === 0 ? (
          <Alert severity="info" sx={{ mb: 1 }}>
            No templates match the current panel count ({panelCount}). Try a different number of panels.
          </Alert>
        ) : (
          <Box sx={{ 
            position: 'relative', 
            width: '100%',
            // Remove any extra margin
            mt: 0,
            pt: 0, // Explicitly set padding-top to 0
            // Desktop specific styling
            [theme.breakpoints.up('sm')]: {
              width: 'calc(100% + 8px)', // Slightly wider to accommodate buttons
              marginLeft: '-4px', // Center the expanded container
              mt: 0, // Ensure no margin on desktop either
              pt: 0, // Ensure no padding on desktop either
            }
          }}>
            {!isMobile && (
              <>
                <ScrollButton 
                  direction="left" 
                  onClick={() => scrollLeft(layoutsRef)} 
                  size="small"
                  aria-label="Scroll left"
                  sx={{ 
                    display: layoutLeftScroll ? 'flex' : 'none',
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
                    display: layoutRightScroll ? 'flex' : 'none',
                  }}
                >
                  <ChevronRight fontSize="small" />
                </ScrollButton>
              </>
            )}
            
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
                      // Changed size from 100x100 to 75x75 pixels to match aspect ratio cards
                      width: 75,
                      height: 75,
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
                        padding: theme.spacing(0.5),
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
              visible={layoutLeftScroll}
            />
            
            <ScrollIndicator 
              direction="right" 
              visible={layoutRightScroll}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default CollageLayoutSettings; 
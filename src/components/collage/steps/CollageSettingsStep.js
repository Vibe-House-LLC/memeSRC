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
  padding: theme.spacing(1.5),
  cursor: 'pointer',
  position: 'relative',
  height: '100%',
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
  minWidth: 100
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
  padding: theme.spacing(1, 0),
  position: 'relative',
  scrollBehavior: 'smooth'
}));

// Scroll button for scrollers
const ScrollButton = styled(IconButton)(({ theme, direction }) => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 10,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[4],
  '&:hover': {
    backgroundColor: theme.palette.grey[800],
  },
  ...(direction === 'left' ? { left: -4 } : { right: -4 }),
}));

// Scroll indicator for horizontal scrollers
const ScrollIndicator = styled(Box)(({ theme, direction, visible }) => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  width: { xs: 30, sm: 40 },
  background: `linear-gradient(to ${direction}, transparent, ${alpha(theme.palette.background.default, 0.9)})`,
  display: visible ? 'flex' : 'none',
  alignItems: 'center',
  justifyContent: direction === 'right' ? 'flex-end' : 'flex-start',
  paddingLeft: direction === 'left' ? 4 : 0,
  paddingRight: direction === 'right' ? 4 : 0,
  pointerEvents: 'none',
  zIndex: 2,
  ...(direction === 'left' ? { left: 0 } : { right: 0 }),
}));

const StepSectionHeading = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
}));

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
  
  // Scroll handlers for scrollers
  const scrollLeft = (ref) => {
    if (ref.current) {
      ref.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };
  
  const scrollRight = (ref) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 200, behavior: 'smooth' });
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
          width: '100%', 
          height: 60, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: theme => `1px dashed ${theme.palette.divider}`,
          borderRadius: 1,
          mb: 1
        }}>
          <Typography variant="caption">Custom Size</Typography>
        </Box>
      );
    }
    
    // Calculate dimensions based on the aspect ratio value
    // Keep the height at a fixed value, and adjust width based on aspect ratio
    const maxHeight = 60;
    const maxWidth = 100; // 100% of the container
    
    let previewWidth;
    let previewHeight;
    
    if (value >= 1) {
      // Landscape or square orientation (wider than tall)
      previewHeight = maxHeight;
      previewWidth = maxHeight * value;
      
      // Constrain width if it exceeds container
      if (previewWidth > maxWidth) {
        previewWidth = maxWidth;
        previewHeight = previewWidth / value;
      }
    } else {
      // Portrait orientation (taller than wide)
      previewWidth = maxWidth;
      previewHeight = maxWidth / value;
      
      // Constrain height if it exceeds max height
      if (previewHeight > maxHeight) {
        previewHeight = maxHeight;
        previewWidth = previewHeight * value;
      }
    }
    
    return (
      <Box sx={{ 
        display: 'flex',
        alignItems: 'center', 
        justifyContent: 'center',
        height: maxHeight,
        width: '100%',
        mb: 1
      }}>
        <Box 
          sx={{ 
            width: `${previewWidth}px`,
            height: `${previewHeight}px`,
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            borderRadius: '2px',
            border: theme => `1px solid ${theme.palette.divider}`,
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Optional: Display aspect ratio value */}
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', opacity: 0.8 }}>
            {value === 1 ? '1:1' : value > 1 ? `${value.toFixed(1)}:1` : `1:${(1/value).toFixed(1)}`}
          </Typography>
        </Box>
      </Box>
    );
  };

  const compatibleTemplates = getCompatibleTemplates();
  const selectedAspectRatioObj = aspectRatioPresets.find(p => p.id === selectedAspectRatio);
  
  return (
    <Box sx={{ pt: 2 }}>
      {/* Panel Count Selector - New section */}
      <Box sx={{ mb: 4 }}>
        <StepSectionHeading>
          <Settings sx={{ mr: 1.5, color: 'primary.main' }} />
          <Typography variant="h6">
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
      <Box sx={{ mb: 4 }}>
        <StepSectionHeading>
          <AspectRatio sx={{ mr: 1.5, color: 'primary.main' }} />
          <Typography variant="h6">
            Aspect Ratio
          </Typography>
        </StepSectionHeading>
        
        <Box sx={{ position: 'relative', px: { xs: 1, sm: 3 } }}>
          {!isMobile && (
            <>
              <ScrollButton 
                direction="left" 
                onClick={() => scrollLeft(aspectRatioRef)} 
                size="small"
                aria-label="Scroll left"
                sx={{ display: aspectLeftScroll ? 'flex' : 'none' }}
              >
                <ChevronLeft />
              </ScrollButton>
              
              <ScrollButton 
                direction="right" 
                onClick={() => scrollRight(aspectRatioRef)} 
                size="small"
                aria-label="Scroll right"
                sx={{ display: aspectRightScroll ? 'flex' : 'none' }}
              >
                <ChevronRight />
              </ScrollButton>
            </>
          )}
          
          <HorizontalScroller 
            ref={aspectRatioRef}
          >
            {aspectRatioPresets.map(preset => (
              <AspectRatioCard
                key={preset.id}
                selected={selectedAspectRatio === preset.id}
                onClick={() => handleSelectAspectRatio(preset.id)}
                elevation={selectedAspectRatio === preset.id ? 3 : 1}
                sx={{ 
                  minWidth: { xs: 110, sm: 130, md: 150 },
                  flexShrink: 0 
                }}
              >
                {renderAspectRatioPreview(preset)}
                <Typography variant="caption" align="center">
                  {preset.name}
                </Typography>
                
                {selectedAspectRatio === preset.id && (
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8, 
                      bgcolor: 'primary.main',
                      borderRadius: '50%',
                      width: 16,
                      height: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Check sx={{ fontSize: 12, color: 'white' }} />
                  </Box>
                )}
              </AspectRatioCard>
            ))}
            
            {/* Spacer to ensure last items can be centered when scrolled fully */}
            <Box sx={{ minWidth: 4, flexShrink: 0 }} />
          </HorizontalScroller>
          
          {/* Visual indicators for scrolling */}
          <ScrollIndicator 
            direction="left" 
            visible={aspectLeftScroll}
          >
            <ChevronLeft fontSize="small" sx={{ opacity: 0.7, color: 'text.secondary' }} />
          </ScrollIndicator>
          
          <ScrollIndicator 
            direction="right" 
            visible={aspectRightScroll}
          >
            <ChevronRight fontSize="small" sx={{ opacity: 0.7, color: 'text.secondary' }} />
          </ScrollIndicator>
        </Box>
      </Box>
      
      {/* Layout Section - shows compatible layouts based on panel count */}
      <Box sx={{ mb: 4 }}>
        <StepSectionHeading>
          <GridView sx={{ mr: 1.5, color: 'primary.main' }} />
          <Typography variant="h6">
            Choose Layout
          </Typography>
        </StepSectionHeading>
        
        {compatibleTemplates.length === 0 ? (
          <Alert severity="info" sx={{ mb: 1 }}>
            No templates match the current panel count ({panelCount}). Try a different number of panels.
          </Alert>
        ) : (
          <Box sx={{ position: 'relative', px: { xs: 1, sm: 3 } }}>
            {!isMobile && (
              <>
                <ScrollButton 
                  direction="left" 
                  onClick={() => scrollLeft(layoutsRef)} 
                  size="small"
                  aria-label="Scroll left"
                  sx={{ display: layoutLeftScroll ? 'flex' : 'none' }}
                >
                  <ChevronLeft />
                </ScrollButton>
                
                <ScrollButton 
                  direction="right" 
                  onClick={() => scrollRight(layoutsRef)} 
                  size="small"
                  aria-label="Scroll right"
                  sx={{ display: layoutRightScroll ? 'flex' : 'none' }}
                >
                  <ChevronRight />
                </ScrollButton>
              </>
            )}
            
            <HorizontalScroller 
              ref={layoutsRef}
            >
              {compatibleTemplates.map(template => {
                const isSelected = selectedTemplate?.id === template.id;
                const aspectRatioValue = getAspectRatioValue();
                
                return (
                  <Box
                    key={template.id}
                    sx={{ 
                      flexShrink: 0,
                      minWidth: { xs: 180, sm: 220, md: 250 }
                    }}
                  >
                    <TemplateCard
                      selected={isSelected}
                      onClick={() => handleTemplateClick(template)}
                    >
                      <Box 
                        sx={{ 
                          position: 'relative',
                          '&:before': {
                            content: '""',
                            display: 'block',
                            paddingTop: `${100 / aspectRatioValue}%`,
                          }
                        }}
                      >
                        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                          {template.renderPreview(aspectRatioValue, theme, panelCount)}
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: isSelected ? 600 : 400
                          }}
                        >
                          {template.name}
                        </Typography>
                        <Chip 
                          size="small" 
                          label={`${template.minImages} panel${template.minImages !== 1 ? 's' : ''}`}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Box>
                      {isSelected && (
                        <Box 
                          sx={{ 
                            position: 'absolute', 
                            top: 8, 
                            right: 8, 
                            bgcolor: 'primary.main',
                            borderRadius: '50%',
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Check sx={{ fontSize: 18, color: 'white' }} />
                        </Box>
                      )}
                    </TemplateCard>
                  </Box>
                );
              })}
              
              {/* Spacer to ensure last items can be centered when scrolled fully */}
              <Box sx={{ minWidth: 4, flexShrink: 0 }} />
            </HorizontalScroller>
            
            {/* Visual indicators for scrolling */}
            <ScrollIndicator 
              direction="left" 
              visible={layoutLeftScroll}
            >
              <ChevronLeft fontSize="small" sx={{ opacity: 0.7, color: 'text.secondary' }} />
            </ScrollIndicator>
            
            <ScrollIndicator 
              direction="right" 
              visible={layoutRightScroll}
            >
              <ChevronRight fontSize="small" sx={{ opacity: 0.7, color: 'text.secondary' }} />
            </ScrollIndicator>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default CollageLayoutSettings; 
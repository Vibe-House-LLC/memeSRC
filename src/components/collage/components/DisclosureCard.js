import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Collapse,
} from "@mui/material";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";

/**
 * Reusable disclosure card component for collapsible content sections
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - The title displayed in the header
 * @param {React.ReactNode} props.icon - Icon component to display next to the title
 * @param {React.ReactNode} props.children - Content to be displayed when expanded
 * @param {boolean} props.defaultOpen - Whether the card should be open by default (uncontrolled)
 * @param {boolean} props.open - Whether the card should be open (controlled - overrides defaultOpen)
 * @param {string} props.subtitle - Optional subtitle/description text
 * @param {Function} props.onToggle - Optional callback when toggle state changes
 * @param {Object} props.sx - Additional styling for the paper container
 * @param {Object} props.contentSx - Additional styling for the content area
 * @param {boolean} props.isMobile - Whether to apply mobile-specific styling
 * @param {string} props.variant - Visual variant: 'default' | 'outlined' | 'elevated'
 * @returns {JSX.Element} - The rendered disclosure card
 */
const DisclosureCard = ({
  title,
  icon: IconComponent,
  children,
  defaultOpen = false,
  open: controlledOpen,
  subtitle,
  onToggle,
  sx = {},
  contentSx = {},
  isMobile = false,
  variant = 'default',
  ...paperProps
}) => {
  const theme = useTheme();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  // Use controlled open if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const isControlled = controlledOpen !== undefined;

  const handleToggle = () => {
    const newState = !isOpen;
    
    // Only update internal state if not controlled
    if (!isControlled) {
      setInternalOpen(newState);
    }
    
    // Always call onToggle callback
    onToggle?.(newState);
  };

  // Determine elevation and styling based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'outlined':
        return {
          elevation: 0,
          border: 1,
          borderColor: 'divider',
        };
      case 'elevated':
        return {
          elevation: 3,
          border: 'none',
        };
      default:
        return {
          elevation: 1,
          border: 1,
          borderColor: 'divider',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Paper
      {...variantStyles}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        width: '100%',
        ...sx
      }}
      {...paperProps}
    >
      {/* Collapsible Header */}
      <Box
        onClick={handleToggle}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          cursor: 'pointer',
          bgcolor: 'background.paper',
          borderBottom: isOpen ? 1 : 0,
          borderColor: 'divider',
          transition: 'background-color 0.2s ease',
          '&:hover': {
            bgcolor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(0, 0, 0, 0.02)'
          }
        }}
      >
        {/* Left side: Icon + Title/Subtitle */}
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
          {IconComponent && (
            <IconComponent 
              sx={{ 
                mr: 1.5, 
                color: theme.palette.primary.main,
                fontSize: '1.5rem',
                flexShrink: 0
              }} 
            />
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography 
              variant="h6" 
              fontWeight={600}
              sx={{ 
                color: 'text.primary',
                fontSize: isMobile ? '1.1rem' : '1.25rem'
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography 
                variant="body2" 
                sx={{ 
                  color: 'text.secondary',
                  fontSize: '0.85rem',
                  mt: 0.25
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
        
        {/* Right side: Expand/Collapse Arrow */}
        <IconButton
          size="small"
          sx={{
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            color: 'text.secondary',
            flexShrink: 0,
            ml: 1
          }}
        >
          <KeyboardArrowDown />
        </IconButton>
      </Box>

      {/* Collapsible Content */}
      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        <Box 
          sx={{ 
            p: isMobile ? 2 : 3, 
            pt: 2,
            ...contentSx
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Paper>
  );
};

DisclosureCard.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  children: PropTypes.node,
  defaultOpen: PropTypes.bool,
  open: PropTypes.bool,
  subtitle: PropTypes.string,
  onToggle: PropTypes.func,
  sx: PropTypes.object,
  contentSx: PropTypes.object,
  isMobile: PropTypes.bool,
  variant: PropTypes.string,
};

export default DisclosureCard;
import { styled } from "@mui/material/styles";
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import alpha from '@mui/material/alpha';

// Container for the page
export const PageContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: '1200px',
  margin: '0 auto',
  padding: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1.5),
  }
}));

// Template card
export const TemplateCard = styled(Paper)(({ theme, selected }) => ({
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
  borderRadius: theme.shape.borderRadius,
  border: selected 
    ? `2px solid ${theme.palette.primary.main}` 
    : `1px solid ${theme.palette.divider}`,
  backgroundColor: selected 
    ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.15 : 0.08)
    : theme.palette.background.paper,
  '&:hover': {
    boxShadow: selected 
      ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
      : theme.palette.mode === 'dark'
        ? '0 4px 12px rgba(0,0,0,0.25)'
        : '0 4px 12px rgba(0,0,0,0.1)',
    borderColor: selected ? theme.palette.primary.main : theme.palette.primary.light
  },
  // Subtle animation on click
  '&:active': {
    transform: 'scale(0.98)',
    transition: 'transform 0.1s',
  }
}));

// Image dropzone
export const ImageDropzone = styled(Box)(({ theme, isDragActive, hasImages }) => ({
  border: `2px dashed ${
    isDragActive 
      ? theme.palette.primary.main 
      : alpha(theme.palette.mode === 'dark' ? '#fff' : '#000', 0.15)
  }`,
  borderRadius: theme.shape.borderRadius * 1.5,
  backgroundColor: isDragActive
    ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06)
    : alpha(theme.palette.mode === 'dark' ? '#fff' : '#000', 0.02),
  padding: hasImages ? theme.spacing(3) : theme.spacing(5),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  minHeight: hasImages ? 120 : 200,
  [theme.breakpoints.down('sm')]: {
    minHeight: hasImages ? 100 : 160,
    padding: hasImages ? theme.spacing(2) : theme.spacing(3),
  },
  '&:hover': {
    backgroundColor: alpha(theme.palette.mode === 'dark' ? '#fff' : '#000', 0.04),
    borderColor: isDragActive
      ? theme.palette.primary.main
      : alpha(theme.palette.mode === 'dark' ? '#fff' : '#000', 0.25)
  }
}));

// Preview of selected images
export const SelectedImagePreview = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
  [theme.breakpoints.down('sm')]: {
    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
    gap: theme.spacing(1),
  }
}));

// Thumbnail container
export const ImageThumb = styled(Box)(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  aspectRatio: '1/1',
  boxShadow: theme.shadows[1],
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: theme.shadows[3],
    transform: 'scale(1.02)'
  },
  '&:hover .image-actions': {
    opacity: 1
  }
}));

// Actions overlay for image thumbnails
export const ImageActions = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0,
  transition: 'opacity 0.3s ease',
  [theme.breakpoints.down('sm')]: {
    // On mobile, always show the action buttons with reduced opacity
    opacity: 0.8
  }
}));

// Thumbnail image
export const ThumbImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover'
});

// Preview container for the final result
export const PreviewContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: 600,
  margin: '0 auto',
  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
  borderRadius: theme.shape.borderRadius * 1.5,
  overflow: 'hidden',
  backgroundColor: theme.palette.mode === 'dark' ? alpha('#fff', 0.04) : '#fff',
  boxShadow: theme.shadows[2]
}));

// SVG Template Preview Component with dynamic aspect ratio
export const SVGTemplatePreview = styled('svg')(({ theme }) => ({
  width: '100%',
  height: 'auto',
  backgroundColor: theme.palette.mode === 'dark' 
    ? alpha('#fff', 0.04) 
    : alpha('#000', 0.02),
  borderRadius: theme.shape.borderRadius,
  transition: 'all 0.3s ease',
}));

// Section divider for visual separation
export const SectionDivider = styled(Box)(({ theme }) => ({
  height: 1,
  backgroundColor: alpha(theme.palette.divider, 0.1),
  margin: `${theme.spacing(4)} 0`,
  width: '100%'
}));

// Aspect ratio option button
export const AspectRatioOption = styled(Box)(({ theme, selected }) => ({
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  border: `2px solid ${selected 
    ? theme.palette.primary.main 
    : alpha(theme.palette.divider, 0.2)
  }`,
  backgroundColor: selected 
    ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.06)
    : 'transparent',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1),
  '&:hover': {
    backgroundColor: selected 
      ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.08)
      : alpha(theme.palette.divider, 0.05)
  }
})); 
import { styled } from "@mui/system";
import { Box } from "@mui/material";

// Styled components for the page
export const PageContainer = styled(Box)(({ theme }) => ({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: theme.spacing(2),
}));

export const TemplateCard = styled(Box)(({ theme, selected, disabled }) => ({
  border: `2px solid ${selected ? theme.palette.primary.main : disabled ? theme.palette.grey[700] : 'transparent'}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2),
  background: theme.palette.mode === 'dark' 
    ? selected ? 'rgba(25, 118, 210, 0.15)' : disabled ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.03)'
    : selected ? 'rgba(25, 118, 210, 0.08)' : disabled ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.02)',
  transition: 'all 0.2s ease',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1,
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    transform: disabled ? 'none' : 'translateY(-2px)',
    boxShadow: disabled ? 'none' : theme.shadows[3],
    backgroundColor: theme.palette.mode === 'dark'
      ? selected ? 'rgba(25, 118, 210, 0.2)' : 'rgba(255, 255, 255, 0.05)'
      : selected ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)',
  }
}));

export const ImageDropzone = styled(Box)(({ theme, isDragActive, hasImages }) => ({
  border: `2px dashed ${isDragActive 
    ? theme.palette.primary.main 
    : hasImages 
      ? theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)' 
      : theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  minHeight: '200px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: isDragActive 
    ? theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.05)'
    : 'transparent',
  transition: 'all 0.2s ease',
  position: 'relative',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
    borderColor: theme.palette.primary.main,
  }
}));

export const SelectedImagePreview = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
}));

export const ImageThumb = styled(Box)(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  width: '100px',
  height: '100px',
  background: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
  boxShadow: theme.shadows[1],
  '&:hover .image-actions': {
    opacity: 1,
  }
}));

export const ImageActions = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  opacity: 0,
  transition: 'opacity 0.2s ease',
  zIndex: 2,
}));

export const ThumbImage = styled('img')({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const PreviewContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
}));

// SVG Template Preview Component with dynamic aspect ratio
export const SVGTemplatePreview = styled('svg')(({ theme }) => ({
  width: '100%',
  height: 'auto',
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
  borderRadius: theme.shape.borderRadius,
  transition: 'all 0.3s ease',
})); 
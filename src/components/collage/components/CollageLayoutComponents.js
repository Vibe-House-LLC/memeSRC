import React from 'react';
import { useTheme } from "@mui/material/styles";
import {
  Box,
  Grid,
  Paper,
  Typography,
  Divider,
  Container,
  Button
} from "@mui/material";
import { Settings, PhotoLibrary } from "@mui/icons-material";

import CollageSettingsStep from "../steps/CollageSettingsStep";
import CollageImagesStep from "../steps/CollageImagesStep";
import { SectionHeading, SectionPaper } from './CollageUIComponents';

// Common styles for consistent containers
const commonContainerStyles = {
  width: '100%',
  overflowX: 'auto'
};

// Common settings step container styles
const settingsContainerStyle = theme => ({
  width: '100%', 
  overflowX: 'auto',
  position: 'relative',
  mx: -1,
  px: 1,
  [theme.breakpoints.up('sm')]: {
    mx: -1.5,
    px: 1.5
  }
});

/**
 * Main container for the collage page content
 */
export const MainContainer = ({ children, isMobile, isMediumScreen }) => {
  return (
    <Box component="main" sx={{ 
      flexGrow: 1,
      pb: 6,
      width: '100%',
      overflowX: 'hidden'
    }}>
      <Container 
        maxWidth={isMediumScreen ? "xl" : "lg"} 
        sx={{ 
          pt: isMobile ? 2 : 3,
          px: isMobile ? 2 : 3,
          width: '100%'
        }}
        disableGutters={isMobile}
      >
        {children}
      </Container>
    </Box>
  );
};

/**
 * Paper container for the main content
 */
export const ContentPaper = ({ children, isMobile, sx = {} }) => {
  const theme = useTheme();
  
  return (
    <Paper 
      elevation={isMobile ? 0 : 1} 
      sx={{ 
        p: isMobile ? 0 : 2,
        pb: isMobile ? 0 : 2,
        borderRadius: isMobile ? 0 : 2,
        backgroundColor: theme.palette.background.default,
        border: isMobile ? 'none' : undefined,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        ...sx
      }}
    >
      {children}
    </Paper>
  );
};

/**
 * Mobile layout for the collage tool
 */
export const MobileLayout = ({ settingsStepProps, imagesStepProps, theme }) => {
  return (
    <>
      {/* Settings */}
      <Box sx={{ 
        px: 1, 
        pb: 1,
        maxWidth: '100vw',
        ...commonContainerStyles
      }}>
        <Typography variant="body2" color="text.secondary" sx={{ 
          mb: 1.5,
          px: 0.5
        }}>
          Merge images together to create multi-panel memes
        </Typography>
        
        <CollageSettingsStep 
          {...settingsStepProps}
          containerSx={settingsContainerStyle(theme)}
        />
      </Box>

      {/* Images */}
      <Box sx={{ 
        px: 1, 
        pb: 2,
        maxWidth: '100vw',
        ...commonContainerStyles
      }}>
        <SectionHeading icon={PhotoLibrary} title="Images" />
        
        <CollageImagesStep {...imagesStepProps} />
      
        <Divider sx={{ my: 1 }} />
      </Box>
    </>
  );
};

/**
 * Desktop layout for the collage tool
 */
export const DesktopLayout = ({ settingsStepProps, imagesStepProps, theme }) => {
  return (
    <Grid container spacing={3} sx={{ width: '100%', margin: 0 }}>
      {/* Settings Section */}
      <Grid item xs={12} md={6} lg={6}>
        <SectionPaper>
          <Typography variant="h6" gutterBottom sx={{ 
            display: 'flex', 
            alignItems: 'center',
            mb: 1
          }}>
            <Settings sx={{ mr: 1, color: 'text.secondary' }} /> Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0 }}>
            Merge images together to create multi-panel memes
          </Typography>
          
          <CollageSettingsStep 
            {...settingsStepProps}
            containerSx={settingsContainerStyle(theme)}
          />
        </SectionPaper>
      </Grid>
      
      {/* Images Section */}
      <Grid item xs={12} md={6} lg={6}>
        <SectionPaper>
          <SectionHeading icon={PhotoLibrary} title="Images" />
          
          <CollageImagesStep {...imagesStepProps} />
          
          <Divider sx={{ my: 2 }} />
        </SectionPaper>
      </Grid>
    </Grid>
  );
};

/**
 * Component for displaying the final collage result
 */
export const CollageResult = ({ finalImage, setFinalImage, isMobile, isMediumScreen, isLoading = false }) => {
  const theme = useTheme();
  
  const resultTitleStyle = {
    px: 3, 
    py: 1, 
    borderRadius: 5,
    backgroundColor: theme.palette.success.main,
    color: '#fff'
  };
  
  const resultPaperStyle = {
    p: isMobile ? 2 : 3, 
    maxWidth: isMediumScreen ? '900px' : '700px',
    mx: 'auto', 
    bgcolor: theme.palette.background.paper,
    borderRadius: 2,
    border: `1px solid ${theme.palette.success.main}`,
    boxShadow: `0 0 20px ${theme.palette.mode === 'dark' ? 'rgba(0,200,83,0.2)' : 'rgba(0,200,83,0.1)'}`
  };
  
  const buttonContainerStyle = {
    mt: 2, 
    display: 'flex', 
    justifyContent: 'center', 
    gap: 2,
    flexWrap: 'wrap'
  };
  
  return (
    <Box sx={{ 
      mt: 2,
      pb: 3,
      width: '100%',
      overflowX: 'hidden'
    }}>
      <Divider sx={{ mb: 3 }}>
        <Paper
          elevation={3}
          sx={resultTitleStyle}
        >
          <Typography variant="h6" sx={{ fontWeight: 500 }}>
            {isLoading ? 'Creating Your Collage...' : 'Your Collage Is Ready!'}
          </Typography>
        </Paper>
      </Divider>
      
      <Paper 
        elevation={isMobile ? 1 : 3}
        sx={resultPaperStyle}
      >
        <img 
          src={finalImage} 
          alt="Final Collage" 
          style={{ 
            width: '100%', 
            borderRadius: theme.shape.borderRadius, 
            marginBottom: 16,
            opacity: isLoading ? 0.7 : 1
          }} 
        />
        <Box sx={buttonContainerStyle}>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<Box component="span" sx={{ fontSize: 18 }}>📥</Box>}
            disabled={isLoading}
          >
            Download Collage
          </Button>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={() => setFinalImage(null)}
            disabled={isLoading}
          >
            Create New Collage
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}; 
import React, { useRef } from 'react';
import { useTheme } from "@mui/material/styles";
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Stack, 
  Button, 
  Container, 
  useMediaQuery,
  Chip
} from "@mui/material";
import { 
  Dashboard,
  Stars,
  RocketLaunch,
  CheckCircle,
  Build,
  Feedback,
  AutoAwesome
} from "@mui/icons-material";

// Define keyframes for animations (same as UpgradeMessage)
const floatingAnimation = {
  '@keyframes floating': {
    '0%': {
      transform: 'perspective(1200px) rotateX(5deg) rotateY(-2deg) scale(1.0) translateY(0px)',
    },
    '50%': {
      transform: 'perspective(1200px) rotateX(5deg) rotateY(-2deg) scale(1.0) translateY(-8px)',
    },
    '100%': {
      transform: 'perspective(1200px) rotateX(5deg) rotateY(-2deg) scale(1.0) translateY(0px)',
    },
  },
  '@keyframes gentleRotate': {
    '0%': {
      transform: 'perspective(1200px) rotateX(5deg) rotateY(-2deg) scale(1.0) translateY(0px)',
    },
    '25%': {
      transform: 'perspective(1200px) rotateX(6deg) rotateY(-1deg) scale(1.0) translateY(-4px)',
    },
    '50%': {
      transform: 'perspective(1200px) rotateX(4deg) rotateY(-3deg) scale(1.0) translateY(-8px)',
    },
    '75%': {
      transform: 'perspective(1200px) rotateX(6deg) rotateY(-1deg) scale(1.0) translateY(-4px)',
    },
    '100%': {
      transform: 'perspective(1200px) rotateX(5deg) rotateY(-2deg) scale(1.0) translateY(0px)',
    },
  },
  '@keyframes glowPulse': {
    '0%': {
      boxShadow: '0 20px 40px rgba(0,0,0,0.25), 0 0 20px rgba(138, 43, 226, 0.1)',
    },
    '50%': {
      boxShadow: '0 25px 50px rgba(0,0,0,0.3), 0 0 30px rgba(138, 43, 226, 0.2)',
    },
    '100%': {
      boxShadow: '0 20px 40px rgba(0,0,0,0.25), 0 0 20px rgba(138, 43, 226, 0.1)',
    },
  },
  '@keyframes glowPulseDark': {
    '0%': {
      boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(138, 43, 226, 0.15)',
    },
    '50%': {
      boxShadow: '0 25px 50px rgba(0,0,0,0.7), 0 0 30px rgba(138, 43, 226, 0.25)',
    },
    '100%': {
      boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(138, 43, 226, 0.15)',
    },
  },
  '@keyframes floatingMobile': {
    '0%': {
      transform: 'perspective(1000px) rotateX(3deg) scale(0.95) translateY(0px)',
    },
    '50%': {
      transform: 'perspective(1000px) rotateX(3deg) scale(0.95) translateY(-8px)',
    },
    '100%': {
      transform: 'perspective(1000px) rotateX(3deg) scale(0.95) translateY(0px)',
    },
  },
  '@keyframes bounce': {
    '0%, 20%, 50%, 80%, 100%': {
      transform: 'translateY(0)',
    },
    '40%': {
      transform: 'translateY(-4px)',
    },
    '60%': {
      transform: 'translateY(-2px)',
    },
  },
  '@keyframes introBlur': {
    '0%': {
      opacity: 0,
      filter: 'blur(20px)',
      transform: 'perspective(1200px) rotateX(5deg) rotateY(-2deg) scale(0.9) translateY(20px)',
    },
    '100%': {
      opacity: 1,
      filter: 'blur(0px)',
      transform: 'perspective(1200px) rotateX(5deg) rotateY(-2deg) scale(1.0) translateY(0px)',
    },
  },
  '@keyframes introBlurMobile': {
    '0%': {
      opacity: 0,
      filter: 'blur(15px)',
      transform: 'perspective(1000px) rotateX(3deg) scale(0.9) translateY(20px)',
    },
    '100%': {
      opacity: 1,
      filter: 'blur(0px)',
      transform: 'perspective(1000px) rotateX(3deg) scale(0.95) translateY(0px)',
    },
  },
};

/**
 * WelcomeMessage component displays a welcome message for existing Pro users
 * introducing them to the new v2.7 collage tool overhaul.
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onContinue - Function to continue to the tool
 * @param {string} props.featureName - Name of the feature (default: "Collage Tool")
 * @param {string} props.previewImage - Path to preview image (default: "/assets/images/products/collage-tool.png")
 * @returns {JSX.Element} - The rendered component
 */
const WelcomeMessage = ({ 
  onContinue, 
  featureName = "Collage Tool",
  previewImage = "/assets/images/products/collage-tool.png"
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('md'));
  const isStacked = useMediaQuery(theme.breakpoints.down('md')); // Elements are stacked when below md breakpoint
  const isTabletConstrained = useMediaQuery(theme.breakpoints.between('sm', 800)); // Constrain card width on tablets
  
  // Add ref for the welcome card
  const welcomeCardRef = useRef(null);
  
  // Function to scroll to the welcome card
  const scrollToWelcomeCard = () => {
    if (welcomeCardRef.current) {
      welcomeCardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  return (
    <Box 
      component="main" 
      sx={{ 
        flexGrow: 1,
        pb: isMobile ? 3 : 6,
        width: '100%',
        overflowX: 'hidden',
        minHeight: '100vh',
        bgcolor: 'background.default'
      }}
    >
      <Container 
        maxWidth={isMobile ? "xl" : "lg"} 
        sx={{ 
          pt: isMobile ? 1 : 3,
          px: isMobile ? 2 : 3,
          width: '100%'
        }}
        disableGutters={false}
      >
        {/* Page Header */}
        <Box sx={{ mb: isMobile ? 2 : 3 }}>
          <Typography variant="h3" gutterBottom sx={{ 
            display: 'flex', 
            alignItems: 'center',
            fontWeight: '700', 
            mb: isMobile ? 0.75 : 1.5,
            pl: isMobile ? 1 : 0,
            color: '#fff',
            fontSize: isMobile ? '2.2rem' : '2.5rem',
            textShadow: '0px 2px 4px rgba(0,0,0,0.15)'
          }}>
            <Dashboard sx={{ mr: 2, color: 'inherit', fontSize: 40 }} /> 
            {featureName}
          </Typography>
          <Typography variant="subtitle1" sx={{ 
            color: 'text.secondary',
            mb: isMobile ? 2 : 2.5,
            pl: isMobile ? 1 : 5,
            maxWidth: '85%'
          }}>
            Merge images together to create multi-panel memes
          </Typography>
        </Box>

        

        
        <Grid 
          container 
          spacing={isMobile ? 0 : 3}
          justifyContent="center" 
          alignItems="stretch"
        >
          {/* Feature Preview Image */}
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: isStacked ? '50vh' : '60vh',
              mx: (isStacked && !isMobile) ? '10%' : 0,
              my: (isStacked && !isMobile) ? 2 : 0,
              px: isStacked ? (isSmall ? 2 : 3) : 0
            }}>
              <Paper 
                elevation={isStacked ? 12 : 8} 
                sx={{ 
                  ...floatingAnimation,
                  p: 2,
                  borderRadius: isStacked ? 4 : 3,
                  width: '100%',
                  maxWidth: isStacked ? 'none' : (isSmall ? 580 : 600),
                  backgroundColor: theme.palette.mode === 'dark' ? '#000000' : '#000000',
                  border: `3px solid ${theme.palette.primary.main}${isStacked ? '30' : '40'}`,
                  overflow: 'hidden',
                  boxShadow: theme.palette.mode === 'dark' 
                    ? `0 ${isStacked ? 25 : 18}px ${isStacked ? 50 : 35}px rgba(0,0,0,${isStacked ? '0.7' : '0.6'}), 0 0 ${isStacked ? 30 : 18}px rgba(138, 43, 226, ${isStacked ? '0.2' : '0.15'})`
                    : `0 ${isStacked ? 25 : 18}px ${isStacked ? 50 : 35}px rgba(0,0,0,${isStacked ? '0.4' : '0.25'}), 0 0 ${isStacked ? 30 : 18}px rgba(138, 43, 226, ${isStacked ? '0.15' : '0.1'})`,
                  transform: isStacked 
                    ? 'perspective(1000px) rotateX(3deg) scale(0.95)'
                    : 'perspective(1200px) rotateX(5deg) rotateY(-2deg) scale(1.0)',
                  transformOrigin: 'center center',
                  transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  cursor: 'pointer',
                  animation: isStacked
                    ? 'introBlurMobile 1.2s ease-out, floatingMobile 6s ease-in-out infinite 1.2s, glowPulse 4s ease-in-out infinite 1.2s'
                    : theme.palette.mode === 'dark' 
                      ? 'introBlur 1.2s ease-out, gentleRotate 8s ease-in-out infinite 1.2s, glowPulseDark 4s ease-in-out infinite 1.2s'
                      : 'introBlur 1.2s ease-out, gentleRotate 8s ease-in-out infinite 1.2s, glowPulse 4s ease-in-out infinite 1.2s',
                  animationFillMode: 'both',
                  '&:hover': {
                    transform: isStacked 
                      ? 'perspective(1000px) rotateX(3deg) scale(0.9)'
                      : 'perspective(1200px) rotateX(2deg) rotateY(-1deg) scale(0.95)',
                  },
                  '&::before': isStacked ? {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.1) 0%, rgba(138, 43, 226, 0) 30%)',
                    pointerEvents: 'none',
                    zIndex: 1
                  } : {},
                  '&::after': !isStacked ? {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.1) 0%, rgba(138, 43, 226, 0) 30%)',
                    pointerEvents: 'none',
                    zIndex: 1
                  } : {}
                }}
                onClick={isStacked ? scrollToWelcomeCard : onContinue}
              >
                {/* New v2.7 Corner Banner */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 24,
                    right: -50,
                    width: 180,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #4CAF50 0%, #45A049 50%, #388E3C 100%)',
                    color: '#fff',
                    py: 1.2,
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    transform: 'rotate(45deg)',
                    transformOrigin: 'center',
                    zIndex: 10,
                    boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                      animation: 'shimmer 3s infinite',
                    },
                    '@keyframes shimmer': {
                      '0%': { left: '-100%' },
                      '100%': { left: '100%' }
                    }
                  }}
                >
                  New v2.7!
                </Box>
                
                <img 
                  src={previewImage} 
                  alt={`${featureName} Preview`} 
                  style={{ 
                    width: '100%', 
                    height: 'auto',
                    display: 'block',
                    objectFit: 'cover',
                    borderRadius: '8px',
                  }}
                />
              </Paper>
            </Box>
          </Grid>

          {/* Scroll Indicator - Only show when stacked */}
          {isStacked && (
            <Grid item xs={12}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center',
                mt: 0.5,
                mb: 0.5
              }}>
                <Box
                  onClick={scrollToWelcomeCard}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    py: 0.5,
                    transition: 'opacity 0.3s ease',
                    '&:hover': {
                      opacity: 0.7,
                    }
                  }}
                >
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'text.secondary',
                      fontSize: '0.9rem',
                      fontWeight: 400,
                      mb: 0.5
                    }}
                  >
                    Welcome to the new tool!
                  </Typography>
                  <Box sx={{ 
                    animation: 'bounce 2s infinite',
                    color: 'text.secondary',
                    fontSize: '1.2rem'
                  }}>
                    ↓
                  </Box>
                </Box>
              </Box>
            </Grid>
          )}

          {/* Welcome Card */}
          <Grid item xs={12} md={6}>
            <Box sx={{ 
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: isStacked ? 'auto' : '60vh',
              px: isSmall ? 2 : 3,
              py: isStacked ? 2 : (isSmall ? 3 : 0),
              pt: isStacked ? 2 : (isSmall ? 3 : 0)
            }}>
              <Paper 
                ref={welcomeCardRef}
                elevation={0} 
                sx={{ 
                  p: isStacked ? 4 : (isSmall ? 4 : 5),
                  borderRadius: 4, 
                  textAlign: 'center',
                  background: theme.palette.mode === 'dark' 
                    ? `linear-gradient(135deg, 
                        rgba(30,30,40,0.95) 0%, 
                        rgba(20,20,30,0.98) 25%,
                        rgba(25,25,35,1) 50%,
                        rgba(15,15,25,0.98) 75%,
                        rgba(20,20,30,0.95) 100%)` 
                    : `linear-gradient(135deg, 
                        rgba(255,255,255,0.95) 0%, 
                        rgba(250,250,255,0.98) 25%,
                        rgba(245,245,255,1) 50%,
                        rgba(240,240,250,0.98) 75%,
                        rgba(250,250,255,0.95) 100%)`,
                  maxWidth: isStacked ? (isTabletConstrained ? '500px' : '100%') : (isSmall ? 600 : 520),
                  width: '100%',
                  border: theme.palette.mode === 'dark' 
                    ? `2px solid rgba(138, 43, 226, 0.3)`
                    : `2px solid rgba(138, 43, 226, 0.15)`,
                  boxShadow: theme.palette.mode === 'dark'
                    ? `0 25px 60px rgba(0,0,0,0.6), 
                       0 15px 35px rgba(0,0,0,0.4),
                       0 5px 15px rgba(138, 43, 226, 0.3),
                       inset 0 1px 0 rgba(255,255,255,0.1)`
                    : `0 25px 60px rgba(0,0,0,0.08), 
                       0 15px 35px rgba(0,0,0,0.05),
                       0 5px 15px rgba(138, 43, 226, 0.15),
                       inset 0 1px 0 rgba(255,255,255,0.8)`,
                  backdropFilter: 'blur(20px) saturate(150%)',
                  position: 'relative',
                  overflow: 'hidden',
                                    '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '1px',
                    background: theme.palette.mode === 'dark'
                      ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)'
                      : 'linear-gradient(90deg, transparent, rgba(138, 43, 226, 0.3), transparent)',
                  }
                }}
              >
                <Stack spacing={isStacked ? 3 : (isSmall ? 3.5 : 4)} justifyContent="center" alignItems="center">
                  
                  {/* Clean Logo Section */}
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center',
                    mb: 1
                  }}>
                    <img
                      src="/assets/memeSRC-white.svg"
                      alt="memeSRC logo"
                      style={{ 
                        height: isStacked ? 52 : 56,
                        filter: theme.palette.mode === 'dark' ? 'none' : 'brightness(0.1)'
                      }}
                    />
                  </Box>
                  
                  {/* Enhanced Title Section */}
                  <Box sx={{ textAlign: 'center', position: 'relative' }}>
                    <Typography 
                      variant={isStacked ? "h4" : (isSmall ? "h4" : "h3")}
                      fontWeight="800" 
                      sx={{
                        fontSize: isStacked ? '1.8rem' : (isSmall ? '2rem' : '2.2rem'),
                        background: theme.palette.mode === 'dark'
                          ? 'linear-gradient(135deg, #BB86FC 0%, #7C4DFF 50%, #651FFF 100%)'
                          : 'linear-gradient(135deg, #7B1FA2 0%, #8E24AA 50%, #9C27B0 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: 'none',
                        mb: 1,
                        letterSpacing: '-0.02em',
                        lineHeight: 1.1
                      }}
                    >
                      WELCOME TO V2.7!
                    </Typography>

                    
                    <Typography 
                      variant={isStacked ? "h6" : (isSmall ? "h6" : "h5")}
                      sx={{ 
                        maxWidth: isStacked ? 'none' : '450px', 
                        mx: 'auto', 
                        textAlign: isStacked ? 'center' : 'left',
                        fontSize: isStacked ? '1.1rem' : (isSmall ? '1.2rem' : '1.3rem'),
                        lineHeight: 1.4,
                        mb: 2,
                        fontWeight: 500,
                        color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)'
                      }}
                    >
                      {isStacked 
                        ? "The collage tool has been rebuilt in Early Access!" 
                        : "The collage tool has been completely rebuilt in Early Access with new features, better control, and a fresh design."
                      }
                    </Typography>

                  </Box>
                  
                  {/* Enhanced Call-to-Action Button */}
                  <Box sx={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
                    <Button
                      onClick={onContinue}
                      variant="contained"
                      size="large"
                      startIcon={<RocketLaunch />}
                      sx={{ 
                        fontSize: isStacked ? '1.2rem' : (isSmall ? '1.25rem' : '1.3rem'), 
                        px: 4,
                        py: 2,
                        borderRadius: 4,
                        fontWeight: 700,
                        textTransform: 'none',
                        width: '100%',
                        position: 'relative',
                        overflow: 'hidden',
                        background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 50%, #81C784 100%)',
                        border: '2px solid rgba(255,255,255,0.2)',
                        boxShadow: `0 10px 30px rgba(76, 175, 80, 0.4), 
                                   0 5px 15px rgba(76, 175, 80, 0.3),
                                   inset 0 1px 0 rgba(255,255,255,0.3)`,
                        color: '#fff',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #388E3C 0%, #4CAF50 50%, #66BB6A 100%)',
                          boxShadow: `0 15px 40px rgba(76, 175, 80, 0.6), 
                                     0 8px 25px rgba(76, 175, 80, 0.4),
                                     inset 0 1px 0 rgba(255,255,255,0.4)`,
                          transform: 'translateY(-3px) scale(1.02)',
                        },
                        '&:active': {
                          transform: 'translateY(-1px) scale(0.98)',
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Make a Collage
                      </Box>
                    </Button>
                  </Box>

                  {/* Enhanced Features Grid */}
                  <Box sx={{ 
                    width: '100%', 
                    pt: 0.5,
                    maxWidth: isStacked ? 'none' : '480px'
                  }}>
                    
                    
                    <Grid container spacing={1.5}>
                      {[
                        { icon: "🎨", text: "Rebuilt interface", highlight: false }, 
                        { icon: "📐", text: "Easy process", highlight: false }, 
                        { icon: "⚡", text: "Enhanced controls", highlight: false },
                        { icon: "📱", text: "Mobile optimized", highlight: false }
                      ].map((feature, index) => (
                        <Grid item xs={12} sm={6} key={index}>
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              p: 2,
                              borderRadius: 3,
                              background: feature.highlight 
                                ? (theme.palette.mode === 'dark' 
                                  ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.08) 100%)' 
                                  : 'linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(76, 175, 80, 0.03) 100%)')
                                : (theme.palette.mode === 'dark' 
                                  ? 'rgba(255,255,255,0.04)' 
                                  : 'rgba(0,0,0,0.03)'),
                              border: feature.highlight 
                                ? (theme.palette.mode === 'dark' 
                                  ? '1px solid rgba(76, 175, 80, 0.25)' 
                                  : '1px solid rgba(76, 175, 80, 0.15)')
                                : (theme.palette.mode === 'dark' 
                                  ? '1px solid rgba(255,255,255,0.08)' 
                                  : '1px solid rgba(0,0,0,0.06)'),
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              transform: 'translateY(0)',
                              '&:hover': {
                                backgroundColor: feature.highlight 
                                  ? (theme.palette.mode === 'dark' 
                                    ? 'rgba(76, 175, 80, 0.2)' 
                                    : 'rgba(76, 175, 80, 0.12)')
                                  : (theme.palette.mode === 'dark' 
                                    ? 'rgba(255,255,255,0.08)' 
                                    : 'rgba(0,0,0,0.06)'),
                                transform: 'translateY(-2px)',
                                boxShadow: feature.highlight 
                                  ? '0 8px 25px rgba(76, 175, 80, 0.2)'
                                  : '0 4px 15px rgba(0,0,0,0.1)'
                              }
                            }}
                          >
                            <Box sx={{ 
                              fontSize: '1.2rem', 
                              mr: 1.5, 
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: feature.highlight 
                                ? 'rgba(76, 175, 80, 0.2)' 
                                : 'rgba(138, 43, 226, 0.1)'
                            }}>
                              {feature.icon}
                            </Box>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontSize: '0.9rem',
                                fontWeight: feature.highlight ? 600 : 500,
                                color: feature.highlight 
                                  ? (theme.palette.mode === 'dark' ? '#81C784' : '#2E7D32')
                                  : 'text.primary'
                              }}
                            >
                              {feature.text}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        textAlign: 'center',
                        mt: 2.5,
                        fontWeight: 600,
                        color: 'text.secondary',
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      ✅ Early Access with Pro
                    </Typography>
                  </Box>


                </Stack>
              </Paper>
            </Box>
          </Grid>
        </Grid>


      </Container>
    </Box>
  );
};

export default WelcomeMessage; 
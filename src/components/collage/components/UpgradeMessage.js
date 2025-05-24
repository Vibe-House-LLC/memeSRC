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
  LockOpen,
  CheckCircle,
  Rocket
} from "@mui/icons-material";

// Define keyframes for animations
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
 * UpgradeMessage component displays a message prompting users to upgrade to Pro
 * to access premium features like the Collage Tool.
 * 
 * @param {Object} props - Component props
 * @param {Function} props.openSubscriptionDialog - Function to open the subscription dialog
 * @param {string} props.featureName - Name of the premium feature (default: "Collage Tool")
 * @param {string} props.previewImage - Path to preview image (default: "/assets/images/products/collage-tool.png")
 * @returns {JSX.Element} - The rendered component
 */
const UpgradeMessage = ({ 
  openSubscriptionDialog, 
  featureName = "Collage Tool",
  previewImage = "/assets/images/collage-tool.png"
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('md'));
  const isStacked = useMediaQuery(theme.breakpoints.down('md')); // Elements are stacked when below md breakpoint
  
  // Add ref for the PRO EARLY ACCESS card
  const proCardRef = useRef(null);
  
  // Function to scroll to the PRO EARLY ACCESS card
  const scrollToProCard = () => {
    if (proCardRef.current) {
      proCardRef.current.scrollIntoView({
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
              my: (isStacked && !isMobile) ? 2 : 0
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
                onClick={isStacked ? scrollToProCard : openSubscriptionDialog}
              >
                {/* Early Access Corner Banner */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 24,
                    right: -50,
                    width: 180,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #FFD23F 100%)',
                    color: '#000',
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
                  Early Access
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
                  onClick={scrollToProCard}
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
                    Get Early Access
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

          {/* Pro Card */}
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
                ref={proCardRef}
                elevation={isStacked ? 6 : 3} 
                sx={{ 
                  p: isStacked ? 3 : (isSmall ? 3 : 4),
                  borderRadius: 3, 
                  textAlign: 'center',
                  background: theme.palette.mode === 'dark' 
                    ? `linear-gradient(145deg, rgba(35,35,45,${isStacked ? '0.95' : '1'}) 0%, rgba(25,25,35,${isStacked ? '0.95' : '1'}) 100%)` 
                    : `linear-gradient(145deg, rgba(255,255,255,${isStacked ? '0.95' : '1'}) 0%, rgba(245,245,245,${isStacked ? '0.95' : '1'}) 100%)`,
                  maxWidth: isStacked ? 420 : (isSmall ? 580 : 500),
                  width: isStacked ? '98%' : '100%',
                  border: `1px solid ${theme.palette.primary.main}${isStacked ? '30' : '20'}`,
                  boxShadow: `0 ${isStacked ? 15 : 10}px ${isStacked ? 35 : 30}px ${theme.palette.mode === 'dark' ? `rgba(0,0,0,${isStacked ? '0.4' : '0.3'})` : `rgba(0,0,0,${isStacked ? '0.15' : '0.1'})`}`,
                  backdropFilter: isStacked ? 'blur(10px)' : 'none'
                }}
              >
                <Stack spacing={isStacked ? 2.5 : (isSmall ? 2.5 : 3)} justifyContent="center" alignItems="center">
                  
                  <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                    <img
                      src="/assets/memeSRC-white.svg"
                      alt="memeSRC logo"
                      style={{ height: isStacked ? 44 : 48 }}
                    />
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: isStacked ? -8 : -10, 
                        right: isStacked ? -8 : -10, 
                        bgcolor: theme.palette.secondary.main,
                        color: '#fff',
                        borderRadius: '50%',
                        width: isStacked ? 24 : 28,
                        height: isStacked ? 24 : 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <LockOpen sx={{ fontSize: isStacked ? 14 : 16 }} />
                    </Box>
                  </Box>
                  
                  <Box>
                    <Typography 
                      variant={isStacked ? "h5" : (isSmall ? "h5" : "h4")}
                      fontWeight="700" 
                      color="primary" 
                      gutterBottom
                      sx={isStacked ? { fontSize: '1.4rem' } : {}}
                    >
                      PRO EARLY ACCESS
                    </Typography>
                    
                    <Typography 
                      variant={isStacked ? "body1" : (isSmall ? "body1" : "h6")}
                      color="text.secondary"
                      sx={{ 
                        maxWidth: isStacked ? 'none' : '400px', 
                        mx: 'auto', 
                        textAlign: isStacked ? 'center' : 'left',
                        fontSize: isStacked ? '0.95rem' : undefined,
                        lineHeight: isStacked ? 1.5 : undefined
                      }}
                    >
                      {isStacked 
                        ? "Unlock this feature and more with Pro!" 
                        : "Upgrade to unlock this feature and get exclusive access to all premium tools!"
                      }
                    </Typography>
                  </Box>
                  
                  <Button
                    onClick={openSubscriptionDialog}
                    variant="contained"
                    size="large"
                    color="primary"
                    sx={{ 
                      fontSize: isStacked ? '1.1rem' : (isSmall ? 16 : 18), 
                      px: isStacked ? undefined : 4,
                      py: 1.5,
                      borderRadius: isStacked ? 2.5 : 3,
                      fontWeight: 700,
                      textTransform: 'none',
                      width: isStacked ? '100%' : '100%',
                      maxWidth: isStacked ? undefined : '300px',
                      background: 'linear-gradient(45deg, #3d2459 30%, #6b42a1 90%)',
                      border: '1px solid #8b5cc7',
                      boxShadow: '0 6px 20px rgba(107, 66, 161, 0.4)',
                      color: '#fff',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #472a69 30%, #7b4cb8 90%)',
                        boxShadow: '0 8px 25px rgba(107, 66, 161, 0.6)',
                        transform: 'translateY(-2px) scale(1.02)',
                      },
                      '&:active': {
                        transform: 'translateY(0) scale(0.98)',
                      }
                    }}
                  >
                    Upgrade to Pro
                  </Button>

                  <Box sx={{ 
                    width: '100%', 
                    pt: 1,
                    maxWidth: isStacked ? 'none' : '400px'
                  }}>
                    <Stack spacing={1.5}>
                      {[
                        "Multi-panel layouts", 
                        "Common aspect ratios", 
                        "Colored borders",
                        "Ad-free experience",
                        "All premium features"
                      ].map((feature, index) => (
                        <Box 
                          key={index}
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            py: 1,
                            px: 1.5,
                            borderRadius: 2,
                            backgroundColor: theme.palette.mode === 'dark' 
                              ? 'rgba(255,255,255,0.03)' 
                              : 'rgba(0,0,0,0.02)',
                            border: `1px solid ${theme.palette.mode === 'dark' 
                              ? 'rgba(255,255,255,0.08)' 
                              : 'rgba(0,0,0,0.08)'}`,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: theme.palette.mode === 'dark' 
                                ? 'rgba(255,255,255,0.06)' 
                                : 'rgba(0,0,0,0.04)'
                            }
                          }}
                        >
                          <CheckCircle 
                            color="success" 
                            sx={{ fontSize: 18, mr: 1.5, flexShrink: 0 }} 
                          />
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontSize: '0.85rem',
                              fontWeight: 500
                            }}
                          >
                            {feature}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            </Box>
          </Grid>
        </Grid>

        {/* Coming Soon Badge - Only show when not stacked */}
        {!isStacked && (
          <Box sx={{ 
            mt: isSmall ? 3 : 4,
            display: 'flex', 
            justifyContent: 'center',
          }}>
            <Chip
              icon={<Dashboard sx={{ fontSize: '1rem !important' }} />}
              label="Coming soon for all users • Pro subscribers get early access"
              color="default"
              variant="outlined"
              sx={{ 
                py: isSmall ? 2 : 2.5,
                px: 1, 
                borderRadius: 3,
                fontSize: isSmall ? '0.8rem' : '0.9rem',
                fontWeight: 'medium',
                backdropFilter: 'blur(8px)',
                background: theme.palette.mode === 'dark' 
                  ? 'rgba(35,35,45,0.3)' 
                  : 'rgba(255,255,255,0.5)',
                borderColor: theme.palette.divider,
                '& .MuiChip-icon': { 
                  color: theme.palette.primary.main
                }
              }}
            />
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default UpgradeMessage;
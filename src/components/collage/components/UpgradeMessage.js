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
      transform: 'perspective(1200px) rotateX(5deg) rotateY(-2deg) scale(0.85) translateY(0px)',
    },
    '50%': {
      transform: 'perspective(1200px) rotateX(5deg) rotateY(-2deg) scale(0.85) translateY(-8px)',
    },
    '100%': {
      transform: 'perspective(1200px) rotateX(5deg) rotateY(-2deg) scale(0.85) translateY(0px)',
    },
  },
  '@keyframes gentleRotate': {
    '0%': {
      transform: 'perspective(1200px) rotateX(5deg) rotateY(-2deg) scale(0.85) translateY(0px)',
    },
    '25%': {
      transform: 'perspective(1200px) rotateX(6deg) rotateY(-1deg) scale(0.85) translateY(-4px)',
    },
    '50%': {
      transform: 'perspective(1200px) rotateX(4deg) rotateY(-3deg) scale(0.85) translateY(-8px)',
    },
    '75%': {
      transform: 'perspective(1200px) rotateX(6deg) rotateY(-1deg) scale(0.85) translateY(-4px)',
    },
    '100%': {
      transform: 'perspective(1200px) rotateX(5deg) rotateY(-2deg) scale(0.85) translateY(0px)',
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
  const isSmall = useMediaQuery(theme.breakpoints.down('md'));
  
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
        maxWidth="xl" 
        sx={{ 
          pt: isMobile ? 1 : 3,
          px: isMobile ? 1 : 3,
          width: '100%'
        }}
        disableGutters={isMobile}
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

        {/* Early Access Badge - Mobile Only */}
        {isMobile && (
          <Box textAlign="center" mb={1}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              mb: 1
            }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 0.8,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #FFD23F 100%)',
                  boxShadow: '0 4px 20px rgba(255, 107, 53, 0.4), 0 0 30px rgba(247, 147, 30, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  color: '#000',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  position: 'relative',
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
                <Rocket sx={{ 
                  fontSize: '1rem',
                  color: '#000',
                  animation: 'bounce 2s infinite'
                }} />
                Early Access
              </Box>
            </Box>
          </Box>
        )}
        
        <Grid 
          container 
          spacing={isMobile ? 0 : 3}
          justifyContent="center" 
          alignItems="center"
          sx={{ maxWidth: isMobile ? '100%' : '1200px', mx: 'auto' }}
        >
          {/* Mobile layout: Hero-style design */}
          {isMobile && (
            <>
              {/* Hero Preview Section */}
              <Grid item xs={12}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  minHeight: '50vh',
                  justifyContent: 'center'
                }}>
                  <Paper 
                    elevation={12} 
                    sx={{ 
                      ...floatingAnimation,
                      p: 2,
                      borderRadius: 4,
                      maxWidth: 380,
                      width: '95%',
                      backgroundColor: theme.palette.mode === 'dark' ? '#000000' : '#000000',
                      border: `3px solid ${theme.palette.primary.main}40`,
                      overflow: 'hidden',
                      boxShadow: theme.palette.mode === 'dark' 
                        ? `0 25px 50px rgba(0,0,0,0.7), 0 0 30px rgba(138, 43, 226, 0.2)`
                        : `0 25px 50px rgba(0,0,0,0.4), 0 0 30px rgba(138, 43, 226, 0.15)`,
                      transform: 'perspective(1000px) rotateX(3deg) scale(0.95)',
                      transformOrigin: 'center center',
                      position: 'relative',
                      cursor: 'pointer',
                      animation: 'floatingMobile 6s ease-in-out infinite, glowPulse 4s ease-in-out infinite',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.1) 0%, rgba(138, 43, 226, 0) 30%)',
                        pointerEvents: 'none',
                        zIndex: 1
                      }
                    }}
                    onClick={scrollToProCard}
                  >
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

              {/* Upgrade Info Section */}
              <Grid item xs={12}>
                <Box sx={{ 
                  pt: 2,
                  pb: 2,
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  <Paper 
                    ref={proCardRef}
                    elevation={6} 
                    sx={{ 
                      p: 3, 
                      borderRadius: 3, 
                      textAlign: 'center',
                      background: theme.palette.mode === 'dark' 
                        ? 'linear-gradient(145deg, rgba(35,35,45,0.95) 0%, rgba(25,25,35,0.95) 100%)' 
                        : 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(245,245,245,0.95) 100%)',
                      maxWidth: 360,
                      width: '95%',
                      border: `1px solid ${theme.palette.primary.main}30`,
                      boxShadow: `0 15px 35px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)'}`,
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <Stack spacing={2.5} justifyContent="center" alignItems="center">
                      <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                        <img
                          src="/assets/memeSRC-white.svg"
                          alt="memeSRC logo"
                          style={{ height: 44 }}
                        />
                        <Box 
                          sx={{ 
                            position: 'absolute', 
                            top: -8, 
                            right: -8, 
                            bgcolor: theme.palette.secondary.main,
                            color: '#fff',
                            borderRadius: '50%',
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <LockOpen sx={{ fontSize: 14 }} />
                        </Box>
                      </Box>
                      
                      <Box>
                        <Typography 
                          variant="h5" 
                          fontWeight="700" 
                          color="primary" 
                          gutterBottom
                          sx={{ fontSize: '1.4rem' }}
                        >
                          PRO EARLY ACCESS
                        </Typography>
                        
                        <Typography 
                          variant="body1" 
                          color="text.secondary"
                          sx={{ fontSize: '0.95rem', lineHeight: 1.5 }}
                        >
                          Unlock this feature and more with Pro!
                        </Typography>
                      </Box>
                      
                      <Button
                        onClick={openSubscriptionDialog}
                        variant="contained"
                        size="large"
                        color="primary"
                        fullWidth
                        sx={{ 
                          fontSize: '1.1rem', 
                          py: 1.5,
                          borderRadius: 2.5,
                          fontWeight: 'bold',
                          boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                          textTransform: 'none'
                        }}
                      >
                        Upgrade to Pro
                      </Button>

                      <Box sx={{ 
                        width: '100%', 
                        pt: 1
                      }}>
                        <Typography 
                          variant="subtitle2" 
                          fontWeight="600" 
                          color="text.primary"
                          gutterBottom
                          sx={{ mb: 1.5, fontSize: '0.9rem' }}
                        >
                          What You'll Get:
                        </Typography>
                        
                        <Grid container spacing={1}>
                          {[
                            "Multi-panel layouts", 
                            "Common aspect ratios", 
                            "Colored borders",
                            "Ad-free experience",
                            "All premium features"
                          ].map((feature, index) => (
                            <Grid item xs={12} key={index}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                                <CheckCircle 
                                  color="success" 
                                  sx={{ fontSize: 18, mr: 1.5 }} 
                                />
                                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                  {feature}
                                </Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    </Stack>
                  </Paper>
                </Box>
              </Grid>
            </>
          )}

          {/* Desktop/Tablet Layout: Centered Hero Style */}
          {!isMobile && (
            <>
              {/* Feature Preview Image - Left Side */}
              <Grid item xs={12} md={6}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '60vh'
                }}>
                  <Paper 
                    elevation={8} 
                    sx={{ 
                      ...floatingAnimation,
                      p: 2,
                      borderRadius: 3,
                      maxWidth: isSmall ? 500 : 600,
                      width: '100%',
                      backgroundColor: theme.palette.mode === 'dark' ? '#000000' : '#000000',
                      border: `3px solid ${theme.palette.primary.main}40`,
                      overflow: 'hidden',
                      boxShadow: theme.palette.mode === 'dark' 
                        ? `0 18px 35px rgba(0,0,0,0.6), 0 0 18px rgba(138, 43, 226, 0.15)`
                        : `0 18px 35px rgba(0,0,0,0.25), 0 0 18px rgba(138, 43, 226, 0.1)`,
                      transform: 'perspective(1200px) rotateX(5deg) rotateY(-2deg) scale(0.95)',
                      transformOrigin: 'center center',
                      transition: 'transform 0.3s ease',
                      cursor: 'pointer',
                      animation: theme.palette.mode === 'dark' 
                        ? 'gentleRotate 8s ease-in-out infinite, glowPulseDark 4s ease-in-out infinite'
                        : 'gentleRotate 8s ease-in-out infinite, glowPulse 4s ease-in-out infinite',
                      '&:hover': {
                        transform: 'perspective(1200px) rotateX(2deg) rotateY(-1deg) scale(0.98)',
                        animation: 'none',
                      },
                      position: 'relative',
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.1) 0%, rgba(138, 43, 226, 0) 30%)',
                        pointerEvents: 'none',
                        zIndex: 1
                      }
                    }}
                    onClick={scrollToProCard}
                  >
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

              {/* Pro Card - Right Side */}
              <Grid item xs={12} md={6}>
                <Box sx={{ 
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '60vh'
                }}>
                  <Paper 
                    ref={proCardRef}
                    elevation={3} 
                    sx={{ 
                      p: isSmall ? 3 : 4,
                      borderRadius: 3, 
                      textAlign: 'center',
                      background: theme.palette.mode === 'dark' 
                        ? 'linear-gradient(145deg, rgba(35,35,45,1) 0%, rgba(25,25,35,1) 100%)' 
                        : 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',
                      maxWidth: isSmall ? 450 : 500,
                      width: '100%',
                      border: `1px solid ${theme.palette.primary.main}20`,
                      boxShadow: `0 10px 30px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'}`
                    }}
                  >
                    <Stack spacing={isSmall ? 2.5 : 3} justifyContent="center" alignItems="center">
                      {/* Early Access Badge */}
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 1,
                          px: 2.5,
                          py: 1,
                          borderRadius: 8,
                          background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #FFD23F 100%)',
                          boxShadow: '0 4px 20px rgba(255, 107, 53, 0.4), 0 0 30px rgba(247, 147, 30, 0.2)',
                          border: '2px solid rgba(255, 255, 255, 0.2)',
                          color: '#000',
                          fontWeight: 'bold',
                          fontSize: '0.9rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          position: 'relative',
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
                        <Rocket sx={{ 
                          fontSize: '1.1rem',
                          color: '#000',
                          animation: 'bounce 2s infinite'
                        }} />
                        Early Access
                      </Box>
                      
                      <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                        <img
                          src="/assets/memeSRC-white.svg"
                          alt="memeSRC logo"
                          style={{ height: 48 }}
                        />
                        <Box 
                          sx={{ 
                            position: 'absolute', 
                            top: -10, 
                            right: -10, 
                            bgcolor: theme.palette.secondary.main,
                            color: '#fff',
                            borderRadius: '50%',
                            width: 28,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <LockOpen sx={{ fontSize: 16 }} />
                        </Box>
                      </Box>
                      
                      <Box>
                        <Typography 
                          variant={isSmall ? "h5" : "h4"}
                          fontWeight="700" 
                          color="primary" 
                          gutterBottom
                        >
                          PRO EARLY ACCESS
                        </Typography>
                        
                        <Typography 
                          variant={isSmall ? "body1" : "h6"}
                          color="text.secondary"
                          sx={{ maxWidth: '400px', mx: 'auto' }}
                        >
                          Upgrade to unlock this feature and get exclusive access to all premium tools!
                        </Typography>
                      </Box>
                      
                      <Button
                        onClick={openSubscriptionDialog}
                        variant="contained"
                        size="large"
                        color="primary"
                        sx={{ 
                          fontSize: isSmall ? 16 : 18, 
                          px: 4,
                          py: 1.5,
                          borderRadius: 3,
                          fontWeight: 'bold',
                          boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                          textTransform: 'none',
                          width: '100%',
                          maxWidth: '300px'
                        }}
                      >
                        Upgrade to Pro
                      </Button>

                      <Box sx={{ 
                        width: '100%', 
                        pt: 1,
                        maxWidth: '400px'
                      }}>
                        <Typography 
                          variant={isSmall ? "subtitle1" : "h6"}
                          fontWeight="600" 
                          color="text.primary"
                          gutterBottom
                          sx={{ mb: 2 }}
                        >
                          What You'll Get:
                        </Typography>
                        
                        <Grid container spacing={1.5}>
                          {[
                            "Multi-panel layouts", 
                            "Common aspect ratios", 
                            "Colored borders",
                            "Ad free memeSRC",
                            "All pro features"
                          ].map((feature, index) => (
                            <Grid item xs={12} key={index}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                                <CheckCircle 
                                  color="success" 
                                  sx={{ fontSize: 20, mr: 1.5 }} 
                                />
                                <Typography variant="body1">
                                  {feature}
                                </Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    </Stack>
                  </Paper>
                </Box>
              </Grid>
            </>
          )}
        </Grid>

        {/* Coming Soon Badge - Tablet and Desktop only */}
        {!isMobile && (
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
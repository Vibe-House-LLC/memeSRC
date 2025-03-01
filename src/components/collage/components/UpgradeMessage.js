import React from 'react';
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
  Chip,
  Divider
} from "@mui/material";
import { 
  Dashboard,
  Stars,
  LockOpen,
  CheckCircle
} from "@mui/icons-material";

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
  const isMedium = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box component="main" sx={{ 
      flexGrow: 1,
      pb: isMobile ? 4 : 6,
      width: '100%',
      overflowX: 'hidden',
      background: theme.palette.mode === 'dark' 
        ? 'linear-gradient(135deg, rgba(25,25,35,1) 0%, rgba(15,15,25,1) 100%)' 
        : 'linear-gradient(135deg, #f8f8f8 0%, #eaeaea 100%)',
    }}>
      <Container maxWidth="lg" sx={{
        pt: isMobile ? 3 : 4,
        width: '100%'
      }}>
        <Box textAlign="center" mb={isMobile ? 2 : 3}>
          <Typography variant="h4" component="h1" sx={{ 
            display: 'inline-flex', 
            alignItems: 'center',
            fontWeight: '600',
            color: theme.palette.mode === 'dark' ? '#fff' : '#333'
          }}>
            <Dashboard sx={{ mr: 1.5, color: theme.palette.primary.main }} /> 
            {featureName}
            <Chip 
              icon={<Stars sx={{ fontSize: '0.9rem' }} />}
              label="Early Access" 
              color="secondary" 
              size="small"
              sx={{ 
                ml: 2, 
                fontWeight: 'bold',
                '& .MuiChip-icon': { color: 'inherit' }
              }} 
            />
          </Typography>
        </Box>
        
        <Grid container spacing={isMobile ? 2 : 4} justifyContent="center" alignItems="center">
          {/* Mobile layout: image on top, text below */}
          {isMobile && (
            <Grid item xs={12} sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Paper 
                  elevation={8} 
                  sx={{ 
                    p: 0,
                    borderRadius: 3,
                    maxWidth: 340,
                    width: '90%',
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    border: `1px solid ${theme.palette.common.white}30`,
                    overflow: 'hidden',
                    boxShadow: `0 15px 30px rgba(0,0,0,0.5)`,
                    transform: 'perspective(1000px) rotateX(5deg) scale(0.9)',
                    transformOrigin: 'center top',
                    position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 20%)',
                      pointerEvents: 'none',
                      zIndex: 1
                    }
                  }}
                >
                  <img 
                    src={previewImage} 
                    alt={`${featureName} Preview`} 
                    style={{ 
                      width: '100%', 
                      height: '100%',
                      display: 'block',
                      objectFit: 'cover',
                    }}
                  />
                </Paper>
              </Box>
            </Grid>
          )}

          {/* Pro Message */}
          <Grid item xs={12} md={6} lg={5} sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            order: { xs: 2, md: 1 }
          }}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: isMobile ? 3 : 4, 
                borderRadius: 2, 
                textAlign: 'center',
                background: theme.palette.mode === 'dark' 
                  ? 'linear-gradient(145deg, rgba(35,35,45,1) 0%, rgba(25,25,35,1) 100%)' 
                  : 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%)',
                maxWidth: 450,
                width: '100%',
                border: `1px solid ${theme.palette.primary.main}20`,
                boxShadow: `0 10px 30px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'}`
              }}
            >
              <Stack spacing={isMobile ? 2.5 : 3} justifyContent="center" alignItems="center">
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
                  <Typography variant="h5" fontWeight="600" color="primary" gutterBottom>
                    PRO EARLY ACCESS
                  </Typography>
                  
                  <Typography 
                    variant="body1" 
                    color="text.secondary"
                    sx={{ maxWidth: '360px', mx: 'auto' }}
                  >
                    Upgrade to unlock this feature today!
                  </Typography>
                </Box>
                
                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <Button
                    onClick={openSubscriptionDialog}
                    variant="contained"
                    size="large"
                    color="primary"
                    sx={{ 
                      fontSize: 16, 
                      width: isMobile ? '100%' : '80%',
                      py: 1.2,
                      borderRadius: 2,
                      fontWeight: 'bold',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      mx: 'auto'
                    }}
                  >
                    Upgrade to Pro
                  </Button>
                </Box>

                <Box sx={{ 
                  width: '100%', 
                  pt: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'flex-start',
                  px: isMobile ? 1 : 2
                }}>
                  <Typography 
                    variant="subtitle2" 
                    fontWeight="600" 
                    color="text.primary"
                    gutterBottom
                    sx={{ alignSelf: 'center', mb: 1.5 }}
                  >
                    What You'll Get:
                  </Typography>
                  
                  <Grid container spacing={1.5}>
                    {[
                      "Multi-panel layouts", 
                      "Custom aspect ratios", 
                      "One-click downloads",
                      "Early access to new features"
                    ].map((feature, index) => (
                      <Grid item xs={12} key={index}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CheckCircle 
                            color="success" 
                            sx={{ fontSize: 20, mr: 1.5 }} 
                          />
                          <Typography variant="body2" textAlign="left">
                            {feature}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Stack>
            </Paper>
          </Grid>
          
          {/* Feature Preview Image - Desktop only */}
          <Grid item md={6} lg={6} sx={{ 
            display: { xs: 'none', md: 'flex' }, 
            justifyContent: 'center',
            order: { xs: 1, md: 2 }
          }}>
            <Paper 
              elevation={8} 
              sx={{ 
                p: 0,
                borderRadius: 3,
                maxWidth: 480,
                width: '90%',
                backgroundColor: 'rgba(0,0,0,0.75)',
                border: `1px solid ${theme.palette.common.white}30`,
                overflow: 'hidden',
                boxShadow: `0 20px 40px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.25)'}`,
                transform: 'perspective(1200px) rotateX(5deg) rotateY(-2deg) scale(0.9)',
                transformOrigin: 'center center',
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'perspective(1200px) rotateX(2deg) rotateY(-1deg) scale(0.92)',
                },
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 20%)',
                  pointerEvents: 'none',
                  zIndex: 1
                }
              }}
            >
              <img 
                src={previewImage} 
                alt={`${featureName} Preview`} 
                style={{ 
                  width: '100%', 
                  height: '100%',
                  display: 'block',
                  objectFit: 'cover',
                }}
              />
            </Paper>
          </Grid>
        </Grid>

        {/* Coming Soon Badge - Desktop only */}
        {!isMobile && (
          <Box sx={{ 
            mt: 4, 
            display: 'flex', 
            justifyContent: 'center',
          }}>
            <Chip
              icon={<Dashboard sx={{ fontSize: '1rem !important' }} />}
              label="Coming soon for all users • Pro subscribers get early access"
              color="default"
              variant="outlined"
              sx={{ 
                py: 2.5,
                px: 1, 
                borderRadius: 3,
                fontSize: '0.9rem',
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
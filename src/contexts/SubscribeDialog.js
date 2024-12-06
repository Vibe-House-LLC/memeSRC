import { AutoFixHighRounded, Block, Close, Favorite, Star, SupportAgent, ExpandMore, Clear, Check, Bolt, Share, ThumbUp, Feedback } from '@mui/icons-material';
import { Box, Button, Card, Checkbox, Chip, CircularProgress, Collapse, Dialog, DialogContent, DialogTitle, Divider, Fade, Grid, IconButton, LinearProgress, Typography, useMediaQuery, FormControlLabel, Fab, Stack } from '@mui/material';
import { API, graphqlOperation } from 'aws-amplify';
import { createContext, useState, useRef, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoadingButton } from '@mui/lab';
import { UserContext } from '../UserContext';
import useUserLocation from '../utils/geo/useUserLocation';
import { createLocationLeads } from '../graphql/mutations';

export const SubscribeDialogContext = createContext();

const DISCOUNT = 0.5;
const HOLIDAY = DISCOUNT > 0;

const SnowflakeDot = () => (
  <Box
    sx={{
      position: 'absolute',
      width: '3px',
      height: '3px',
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      borderRadius: '50%',
      animation: 'snowfall linear infinite',
      animationDuration: props => `${5 + Math.random() * 5}s`,  // Random duration between 5-10s
      '@keyframes snowfall': {
        '0%': {
          transform: props => `translateY(-20px) translateX(${-15 + Math.random() * 30}px)`,
          opacity: 1,
        },
        '100%': {
          transform: props => `translateY(80px) translateX(${-15 + Math.random() * 30}px)`,
          opacity: 1,
        },
      },
    }}
  />
);

export const DialogProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMd = useMediaQuery(theme => theme.breakpoints.up('sm'));
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('pro69');
  const [loading, setLoading] = useState(false);
  const { user } = useContext(UserContext);
  const [checkoutLink, setCheckoutLink] = useState();
  const [billingAgreement, setBillingAgreement] = useState(false);

  const [askedAboutCredits, setAskedAboutCredits] = useState(false);

  const [selectedTitleSubtitle, setSelectedTitleSubtitle] = useState(null);

  const { countryCode, countryName } = useUserLocation();

  useEffect(() => {
    if (location.pathname === '/pro' && user !== null) {
      if (user.userDetails?.subscriptionStatus === 'active') {
        navigate('/account');
      } else {
        setSubscriptionDialogOpen(true);
        navigate('/', { replace: true });
      }
    }
  }, [user, location, navigate]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * titleSubtitlePairs.length);
    setSelectedTitleSubtitle(titleSubtitlePairs[randomIndex]);
  }, []);

  const subscribeButtonRef = useRef(null);

  const setSelectedPlanAndScroll = (plan) => {
    setSelectedPlan(plan);
    setAskedAboutCredits(false);
    subscribeButtonRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const openDialog = (content) => {
    setSubscriptionDialogOpen(true);
  };

  const closeDialog = () => {
    setSubscriptionDialogOpen(false);
    setLoading(false)
    setCheckoutLink()
    setBillingAgreement(false)
  };

  const buySubscription = () => {
    // console.log(selectedPlan)
    setLoading(true)
    API.post('publicapi', '/user/update/getCheckoutSession', {
      body: {
        currentUrl: window.location.href.replace('pro', ''),
        priceKey: selectedPlan
      }
    }).then(results => {
      // console.log(results)
      setCheckoutLink(results)
      setLoading(false)
    }).catch(error => {
      console.log(error.response)
      setLoading(false)
    })
  }

  const titleSubtitlePairs = [
    {
      title: 'Get memeSRC Pro!',
      subtitle: 'Or don\'t. I don\'t care.',
    },
    {
      title: 'Get Pro. Be a Hero.',
      subtitle: 'Or stay basic I guess. Your choice.',
    },
    {
      title: 'Unlock memeSRC Pro!',
      subtitle: "Or forget you ever saw this.",
    },
    {
      title: "Pro is for pros.",
      subtitle: "But don't let that stop you.",
    },
  ];

  const getCreditCount = () => {
    switch (selectedPlan) {
      case 'pro5':
        return 5;
      case 'pro25':
        return 25;
      case 'pro69':
        return 69;
      default:
        return 5;
    }
  };

  const getPrice = () => {
    const basePrice = (() => {
      switch (selectedPlan) {
        case 'pro5':
          return 2.99;
        case 'pro25':
          return 4.99;
        case 'pro69':
          return 6.99;
        default:
          return 2.99;
      }
    })();

    const discountedPrice = HOLIDAY ? basePrice * (1 - DISCOUNT) : basePrice;
    return { 
      base: basePrice,
      final: `$${discountedPrice.toFixed(2)}`
    };
  };

  const getColor = () => {
    switch (selectedPlan) {
      case 'pro5':
        return 'primary.main';
      case 'pro25':
        return '#ff6900';
      case 'pro69':
        return 'rgb(84, 214, 44)';
      default:
        return 'primary.main';
    }
  };

  const getTextColor = () => {
    switch (selectedPlan) {
      case 'pro5':
        return 'common.white';
      case 'pro25':
      case 'pro69':
        return 'common.black';
      default:
        return 'common.white';
    }
  };

  const getRandomTitleSubtitle = () => {
    const randomIndex = Math.floor(Math.random() * titleSubtitlePairs.length);
    return titleSubtitlePairs[randomIndex];
  };

  const openSubscriptionDialog = () => {
    setSubscriptionDialogOpen(true)
  }

  const handleLogin = () => {
    setSubscriptionDialogOpen(false);
    navigate('/login?dest=%2Fpro')
  }

  useEffect(() => {
    if (countryCode !== 'US' && countryCode !== 'AU' && countryCode !== 'CA' && checkoutLink) {
      API.graphql(
        graphqlOperation(createLocationLeads, { input: { countryCode } })
      ).then().catch(error => {
        console.log(error)
      })
    }
  }, [countryCode, checkoutLink]);

  // Helper function to format price delta
  const formatPriceDelta = (amount) => {
    const price = amount * DISCOUNT;
    return `${amount >= 0 ? '+' : '-'}$${price % 1 === 0 ? Math.floor(Math.abs(price)) : Math.abs(price).toFixed(2)}`;
  };

  return (
    <SubscribeDialogContext.Provider value={{ openSubscriptionDialog }}>
      {children}
      <Dialog
        open={subscriptionDialogOpen}
        onClose={closeDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        maxWidth="md"
        fullWidth
        fullScreen={!isMd}
        scroll="paper"
        PaperProps={{
          sx: {
            borderRadius: isMd ? 5 : 0,
            backgroundColor: (theme) => theme.palette.common.black,
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            pt: isMd ? 2 : 1.2,
            pb: isMd ? 2 : 1.2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img
              src="/assets/memeSRC-white.svg"
              alt="memeSRC logo"
              style={{ height: isMd ? 36 : 24 }}
            />
            <Typography fontSize={isMd ? 28 : 22} fontWeight={700}>
              memeSRC Pro
            </Typography>
          </Box>
          <IconButton onClick={closeDialog} size="small" sx={{ position: 'absolute', top: isMd ? 8 : 4, right: 10, zIndex: 1000, opacity: 0.4 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <Divider />
          <>
          {!loading && !checkoutLink && (
            <Fade in timeout={400}>
              <DialogContent sx={{ py: 4, pb: 6 }}>
                {HOLIDAY && (
                  <Box
                    sx={{
                      position: 'relative',
                      backgroundColor: '#1a365d',
                      borderRadius: 2,
                      p: 2,
                      mb: 3,
                      overflow: 'hidden',
                      border: '1px solid #2a4a7d',
                    }}
                  >
                    {[...Array(30)].map((_, i) => (
                      <Box
                        key={i}
                        sx={{
                          position: 'absolute',
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,  // Initial random vertical position
                          animationDelay: `${Math.random() * 5}s`,  // Random start time
                        }}
                      >
                        <SnowflakeDot />
                      </Box>
                    ))}
                    <Typography
                      fontSize={16}
                      fontWeight={600}
                      color="common.white"
                      textAlign="center"
                    >
                      Holiday Sale - 30% Off All Plans
                    </Typography>
                    <Typography
                      fontSize={14}
                      color="grey.300"
                      textAlign="center"
                      mt={0.5}
                    >
                      Limited time offer. Get Pro for less!
                    </Typography>
                  </Box>
                )}
                <Box
                  p={2.5}
                  sx={{
                    backgroundColor: getColor(),
                    borderRadius: 4,
                    mb: 3,
                    // mt: isMd ? -4 : 0,
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  onClick={() => {
                    subscribeButtonRef.current.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography 
                      fontSize={22}
                      fontWeight={700} 
                      color={getTextColor()}
                    >
                      {selectedTitleSubtitle?.title}
                    </Typography>
                    {HOLIDAY && (
                      <Chip
                        label={`${(DISCOUNT * 100).toFixed(0)}% OFF`}
                        color="error"
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          backgroundColor: '#ff1744',
                        }}
                      />
                    )}
                  </Box>
                  <Typography 
                    variant={isMd ? 'h2' : 'h1'} 
                    mb={0.75}
                    color={getTextColor()}
                  >
                    {HOLIDAY && (
                      <span style={{ textDecoration: 'line-through', fontSize: '0.7em', opacity: 0.7, marginRight: '8px' }}>
                        ${getPrice().base.toFixed(2)}
                      </span>
                    )}
                    {getPrice().final} / mo.
                  </Typography>
                  <Typography 
                    fontSize={15} /* reduced from 16 */
                    fontWeight={600} 
                    color={getTextColor()}
                  >
                    {selectedTitleSubtitle?.subtitle}
                  </Typography>
                </Box>
                <Grid container spacing={4} alignItems="center">
                  <Grid item xs={12} md={5}>
                    <Box display="flex" alignItems="center" mb={2} ml={2}>
                      <Box
                        sx={{
                          backgroundColor: getColor(),
                          borderRadius: '50%',
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2,
                        }}
                      >
                        <Check sx={{ color: getTextColor() }} />
                      </Box>
                      <Typography fontSize={18} fontWeight={500}>
                        Zero Ads
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" mb={2} ml={2}>
                      <Box
                        sx={{
                          backgroundColor: getColor(),
                          borderRadius: '50%',
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2,
                        }}
                      >
                        <SupportAgent sx={{ color: getTextColor() }} />
                      </Box>
                      <Typography fontSize={18} fontWeight={500}>
                        Pro Support
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" mb={2} ml={2}>
                      <Box
                        sx={{
                          backgroundColor: getColor(),
                          borderRadius: '50%',
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2,
                        }}
                      >
                        <Bolt sx={{ color: getTextColor() }} />
                      </Box>
                      <Typography fontSize={18} fontWeight={500}>
                        Exclusive Features
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" ml={2}>
                      <Box
                        sx={{
                          backgroundColor: getColor(),
                          borderRadius: '50%',
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2,
                        }}
                      >
                        <AutoFixHighRounded sx={{ color: getTextColor() }} />
                      </Box>
                      <Typography fontSize={18} fontWeight={500} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {getCreditCount()} Magic Credits / mo
                        <ExpandMore sx={{ fontSize: 20 }} />
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={7}>
                    {isMd ? (
                      <Box sx={{ px: 2 }}>
                        {[
                          { plan: 'pro5', credits: 5, color: 'grey.500', hoverColor: 'grey.500', activeColor: 'grey.500' },
                          { plan: 'pro25', credits: 25, color: '#ff6900', hoverColor: '#ff6900', activeColor: '#e65c00' },
                          { plan: 'pro69', credits: 69, color: 'rgb(84, 214, 44)', hoverColor: 'rgb(84, 214, 44)', activeColor: 'rgb(71, 181, 37)' }
                        ].map(({ plan, credits, color, hoverColor, activeColor }) => (
                          <Card
                            key={plan}
                            variant="outlined"
                            sx={{
                              mb: 2,
                              cursor: 'pointer',
                              borderColor: selectedPlan === plan ? color : 'divider',
                              '&:hover': { borderColor: hoverColor },
                              position: 'relative',
                              overflow: 'hidden',
                            }}
                            onClick={() => setSelectedPlanAndScroll(plan)}
                          >
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: 8,
                                height: '100%',
                                backgroundColor: color,
                              }}
                            />
                            <Box
                              sx={{
                                p: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: selectedPlan === plan ? activeColor : 'transparent',
                                color: selectedPlan === plan ? 'common.black' : 'common.white',
                              }}
                            >
                              <Typography fontSize={18} fontWeight={700} sx={{ ml: 2 }}>
                                {credits} credits / mo.
                              </Typography>
                              <Typography fontSize={18} fontWeight={700} sx={{ mr: 1 }}>
                                {selectedPlan === plan ? 'included' : 
                                 plan === 'pro5' ? 
                                   (selectedPlan === 'pro25' ? formatPriceDelta(-2) : formatPriceDelta(-4)) :
                                 plan === 'pro25' ? 
                                   (selectedPlan === 'pro5' ? formatPriceDelta(2) : formatPriceDelta(-2)) :
                                 (selectedPlan === 'pro5' ? formatPriceDelta(4) : formatPriceDelta(2))}
                              </Typography>
                            </Box>
                          </Card>
                        ))}
                      </Box>
                    ) : (
                      <Stack
                        direction="row" 
                        spacing={1}
                        sx={{ 
                          width: '100%', 
                          justifyContent: 'center',
                        }}
                      >
                        {[
                          { plan: 'pro5', credits: 5, color: 'grey.500', textColor: 'common.black' },
                          { plan: 'pro25', credits: 25, color: '#ff6900', textColor: 'common.black' },
                          { plan: 'pro69', credits: 69, color: 'rgb(84, 214, 44)', textColor: 'common.black' }
                        ].map(({ plan, credits, color, textColor }) => (
                          <Box 
                            key={plan} 
                            sx={{ 
                              textAlign: 'center',
                              flex: '1 1 0',
                              minWidth: 0,
                              maxWidth: 160,
                              position: 'relative',
                            }}
                          >
                            <Card
                              variant="outlined"
                              onClick={() => setSelectedPlanAndScroll(plan)}
                              sx={{
                                height: { xs: 60, sm: 80 },
                                cursor: 'pointer',
                                borderColor: 'divider',
                                backgroundColor: selectedPlan === plan ? color : 'grey.800',
                                position: 'relative',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                '&::before': {
                                  content: '""',
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '4px',
                                  backgroundColor: color,
                                  display: selectedPlan === plan ? 'none' : 'block'
                                }
                              }}
                            >
                              <Box 
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  color: selectedPlan === plan ? textColor : 'common.white',
                                  fontSize: { xs: '1.25rem', sm: '1.5rem' },
                                  fontWeight: 600,
                                }}
                              >
                                <AutoFixHighRounded sx={{ fontSize: 25, mx: 0.5 }} />
                                {credits}
                              </Box>
                            </Card>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mt: 1, 
                                color: selectedPlan === plan ? 'common.white' : 'grey.500',
                                fontWeight: selectedPlan === plan ? 800 : 550,
                                gap: 0.5,
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                              }}
                            >
                              {selectedPlan === plan ? 'included' : 
                               plan === 'pro5' ? 
                                 (selectedPlan === 'pro25' ? `${formatPriceDelta(-2)}/mo` : `${formatPriceDelta(-4)}/mo`) :
                               plan === 'pro25' ? 
                                 (selectedPlan === 'pro5' ? `${formatPriceDelta(2)}/mo` : `${formatPriceDelta(-2)}/mo`) :
                               (selectedPlan === 'pro5' ? `${formatPriceDelta(4)}/mo` : `${formatPriceDelta(2)}/mo`)}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Grid>
                </Grid>
                <Box mt={4} textAlign="center">
                  {/* {console.log(user)} */}
                  {user?.userDetails ? <Button
                    ref={subscribeButtonRef}
                    variant="contained"
                    size="large"
                    onClick={() => {
                      if (countryCode === 'US' || countryCode === 'AU' || countryCode === 'CA') {
                        buySubscription();
                      } else {
                        setCheckoutLink('unsupported_country');
                        console.log('unsupported_country')
                      }
                    }}
                    fullWidth
                    sx={{
                      borderRadius: 50,
                      px: 4,
                      py: 1.5,
                      fontSize: 20,
                      backgroundColor: getColor(),
                      color: getTextColor(),
                    }}
                  >
                    {HOLIDAY ? "Subscribe with 30% OFF: " : "Subscribe: "}{getPrice().final}/mo
                  </Button>
                    :
                    <Button
                      ref={subscribeButtonRef}
                      variant="contained"
                      size="large"
                      onClick={handleLogin}
                      fullWidth
                      sx={{
                        borderRadius: 50,
                        px: 4,
                        py: 1.5,
                        fontSize: 20,
                        backgroundColor: getColor(),
                        color: getTextColor(),
                      }}
                    >
                      Please Log In
                    </Button>
                  }
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    mx={3}
                    mt={1}
                    sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}
                  >
                    <span>Payments to&nbsp;</span>
                    <a
                      href="https://vibehouse.net"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#9e9e9e', textDecoration: 'none' }}
                    >
                      <b>Vibe House</b>
                    </a>
                    <span>&nbsp;secured by&nbsp;</span>
                    <a
                      href="https://stripe.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#9e9e9e', textDecoration: 'none' }}
                    >
                      <b>Stripe</b>
                    </a>
                  </Typography>
                </Box>
              </DialogContent>
            </Fade>
          )}
          {(loading || checkoutLink) && (
            <>
            {countryCode !== 'US' && countryCode !== 'AU' && countryCode !== 'CA' && (
          <DialogContent sx={{ py: 4 }}>
            <Box
              p={3}
              sx={{
                backgroundColor: 'error.main',
                borderRadius: 4,
                mb: 4,
              }}
            >
              <Typography fontSize={23} fontWeight={700} color="common.white" gutterBottom>
                Pro is currently not available in your country.
              </Typography>
              <Typography fontSize={14} color="common.white">
                We appreciate your interest and support, but memeSRC&nbsp;Pro is currently unavailable to purchase in your country.
              </Typography>
            </Box>
            <Box sx={{ mt: 4, mx: 2 }}>
              <Typography variant="h6" gutterBottom>
                Other ways to support memeSRC:
              </Typography>
              <Box sx={{ pl: 4, mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      backgroundColor: 'primary.main',
                      borderRadius: '50%',
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                    }}
                  >
                    <Share sx={{ color: 'common.white' }} />
                  </Box>
                  <Typography variant="body1">Help spread the word</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box
                    sx={{
                      backgroundColor: 'primary.main',
                      borderRadius: '50%',
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                    }}
                  >
                    <ThumbUp sx={{ color: 'common.white' }} />
                  </Box>
                  <Typography variant="body1">Make and share more memes</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      backgroundColor: 'primary.main', 
                      borderRadius: '50%',
                      width: 32,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                    }}
                  >
                    <Feedback sx={{ color: 'common.white' }} />
                  </Box>
                  <Typography variant="body1">Give feedback and contribute</Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ mt: 4, mx: 1 }}>
              <Typography variant="body1">
                We love our community around the world and want to keep making these tools more accessible to everyone. We're always trying to support more regions and have noted your interest. Thanks for understanding! 
              </Typography>
            </Box>
            <Button
              ref={subscribeButtonRef}
              variant="contained"
              size="small"
              onClick={closeDialog}
              fullWidth
              sx={{
                borderRadius: 50,
                px: 4,
                fontSize: 17,
                mt: 5,
                // backgroundColor: getColor(),
                // color: getTextColor(),
              }}
            >
              Dismiss
            </Button>
          </DialogContent>
        )}
        {(countryCode === 'US' || countryCode === 'AU' || countryCode === 'CA') && (
          <DialogContent sx={{ minHeight: 500, display: 'flex', flexDirection: 'column', mb: 5 }}>
          <Box sx={{ m: 'auto' }}>
            <Typography fontSize={20} textAlign='center' fontWeight={700}>
              Powered by
            </Typography>
            <Typography fontSize={45} textAlign='center' fontWeight={700} pt={0.5}>
              Vibe House
            </Typography>
          </Box>
          <Box sx={{ mx: 'auto', mt: 'auto', textAlign: 'center' }}>
            <LoadingButton
              loading={loading || !checkoutLink}
              loadingIndicator={
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <CircularProgress color="inherit" size={16} sx={{ mr: 1 }} />
                  <span>Preparing&nbsp;Checkout...</span>
                </Box>
              }
              variant="contained"
              size="large"
              fullWidth
              sx={{
                borderRadius: 50,
                px: 0,
                py: 1.5,
                fontSize: 20,
                backgroundColor: getColor(),
                color: getTextColor(),
              }}
              onClick={() => {
                window.location.href = checkoutLink;
              }}
            >
              {!loading && checkoutLink ? 'Agree & Continue' : ''}
            </LoadingButton>
            <Typography variant="caption" sx={{ mt: 2, lineHeight: 1.2, }}>
              I am a U.S. resident and understand memeSRC&nbsp;Pro is billed as Vibe&nbsp;House&nbsp;LLC and agree to the{' '}
              <a href="/termsofservice" target="_blank" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>
                Terms&nbsp;of&nbsp;Service
              </a>{' '}
              and{' '}
              <a href="/privacypolicy" target="_blank" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>
                Privacy&nbsp;Policy
              </a>
              .
            </Typography>
          </Box>
        </DialogContent>
        )}
            </>
            )}
          </>
      </Dialog>
    </SubscribeDialogContext.Provider>
  );
};


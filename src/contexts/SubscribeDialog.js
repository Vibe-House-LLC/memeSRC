import { AutoFixHighRounded, Block, Close, Favorite, Star, SupportAgent, ExpandMore, Clear, Check, Bolt, Share, ThumbUp, Feedback } from '@mui/icons-material';
import { Box, Button, Card, Checkbox, Chip, CircularProgress, Collapse, Dialog, DialogContent, DialogTitle, Divider, Fade, Grid, IconButton, LinearProgress, Typography, useMediaQuery, FormControlLabel, Fab, Stack } from '@mui/material';
import { API, graphqlOperation } from 'aws-amplify';
import { createContext, useState, useRef, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoadingButton } from '@mui/lab';
import { UserContext } from '../UserContext';
import useUserLocation from '../utils/geo/useUserLocation';
import { createLocationLeads } from '../graphql/mutations';
import { CountdownTimer } from '../components/CountdownTimer';
import { CURRENT_SALE } from '../constants/sales';

export const SubscribeDialogContext = createContext();

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
      if (user.userDetails) {
        if (user.userDetails?.subscriptionStatus === 'active') {
          navigate('/account');
        } else {
          setSubscriptionDialogOpen(true);
          navigate('/', { replace: true });
        }
      }
    }
  }, [user, location, navigate, user?.userDetails?.subscriptionStatus]);

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

  const planPrices = {
    pro5: 2.99,
    pro25: 4.99,
    pro69: 6.99,
  };

  const getPriceForPlan = (plan) => {
    const basePrice = planPrices[plan];
    const discountedPrice = CURRENT_SALE.isActive 
      ? basePrice * CURRENT_SALE.discountMultiplier 
      : basePrice;
    return discountedPrice;
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

  const formatPriceDelta = (amount) => {
    const sign = amount >= 0 ? '+' : '-';
    const absAmount = Math.abs(amount);
    const formattedPrice = absAmount % 1 === 0 ? absAmount.toFixed(0) : absAmount.toFixed(2);
    return `${sign}$${formattedPrice}`;
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
                {CURRENT_SALE.isActive && <CountdownTimer />}
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
                    {CURRENT_SALE.isActive && (
                      <Chip
                        label={`${(CURRENT_SALE.discountPercent).toFixed(0)}% OFF`}
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
                    {CURRENT_SALE.isActive && (
                      <span style={{ textDecoration: 'line-through', fontSize: '0.7em', opacity: 0.7, marginRight: '8px' }}>
                        ${planPrices[selectedPlan].toFixed(2)}
                      </span>
                    )}
                    ${getPriceForPlan(selectedPlan).toFixed(2)} / mo.
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
                                {selectedPlan === plan
                                  ? 'included'
                                  : formatPriceDelta(getPriceForPlan(plan) - getPriceForPlan(selectedPlan))}
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
                                 (selectedPlan === 'pro25' ? `${formatPriceDelta(getPriceForPlan('pro25') - getPriceForPlan('pro5'))}/mo` : `${formatPriceDelta(getPriceForPlan('pro69') - getPriceForPlan('pro5'))}/mo`) :
                               plan === 'pro25' ? 
                                 (selectedPlan === 'pro5' ? `${formatPriceDelta(getPriceForPlan('pro5') - getPriceForPlan('pro25'))}/mo` : `${formatPriceDelta(getPriceForPlan('pro69') - getPriceForPlan('pro25'))}/mo`) :
                               (selectedPlan === 'pro5' ? `${formatPriceDelta(getPriceForPlan('pro69') - getPriceForPlan('pro5'))}/mo` : `${formatPriceDelta(getPriceForPlan('pro69') - getPriceForPlan('pro25'))}/mo`)}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Grid>
                </Grid>
                <Box mt={4} textAlign="center">
                  {/* {console.log(user)} */}
                  {user?.userDetails ? (
                    <Button
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
                      Subscribe: {CURRENT_SALE.isActive ? (
                        <>
                          <span style={{ textDecoration: 'line-through', marginRight: '4px' }}>${planPrices[selectedPlan].toFixed(2)}</span>
                          ${getPriceForPlan(selectedPlan).toFixed(2)}
                        </>
                      ) : (
                        `$${getPriceForPlan(selectedPlan).toFixed(2)}`
                      )}/mo
                    </Button>
                  ) : (
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
                      Subscribe: {CURRENT_SALE.isActive ? (
                        <>
                          <span style={{ textDecoration: 'line-through', marginRight: '4px' }}>${planPrices[selectedPlan].toFixed(2)}</span>
                          ${getPriceForPlan(selectedPlan).toFixed(2)}
                        </>
                      ) : (
                        `$${getPriceForPlan(selectedPlan).toFixed(2)}`
                      )}/mo
                    </Button>
                  )}
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
            <Box
              sx={{
                mt: 3,
                mx: 'auto',
                p: 2,
                maxWidth: 320,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Typography 
                fontSize={13}
                color="text.secondary"
                sx={{ 
                  mb: 1,
                  fontWeight: 500
                }}
              >
                Your subscription to memeSRC Pro will show on your statement as:
              </Typography>
              <Typography 
                fontFamily="'Roboto Mono', monospace"
                fontSize={16}
                fontWeight={700}
                sx={{
                  p: 1.5,
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                  borderRadius: 1.5,
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  letterSpacing: '0.5px',
                  position: 'relative',
                  '&::after': {
                    content: '"...................."',
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    opacity: 0.3,
                    letterSpacing: '3px',
                  }
                }}
              >
                <span>${getPriceForPlan(selectedPlan).toFixed(2)}</span>
                <span style={{ opacity: 0.85 }}>VIBE HOUSE LLC</span>
              </Typography>
            </Box>
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

import { AutoFixHighRounded, Block, Close, Favorite, Star, SupportAgent, ExpandMore, Clear, Check, Bolt, Share, ThumbUp, Feedback } from '@mui/icons-material';
import { Box, Button, Card, Checkbox, Chip, CircularProgress, Collapse, Dialog, DialogContent, DialogTitle, Divider, Fade, Grid, IconButton, LinearProgress, Typography, useMediaQuery, FormControlLabel } from '@mui/material';
import { API } from 'aws-amplify';
import { createContext, useState, useRef, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoadingButton } from '@mui/lab';
import { UserContext } from '../UserContext';
import useUserLocation from '../utils/geo/useUserLocation';

export const SubscribeDialogContext = createContext();

export const DialogProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMd = useMediaQuery(theme => theme.breakpoints.up('md'));
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('pro5');
  const [loading, setLoading] = useState(false);
  const [creditOptionsOpen, setCreditOptionsOpen] = useState(false);
  const { user } = useContext(UserContext);
  const [checkoutLink, setCheckoutLink] = useState();
  const [billingAgreement, setBillingAgreement] = useState(false);

  const [askedAboutCredits, setAskedAboutCredits] = useState(false);

  const [selectedTitleSubtitle, setSelectedTitleSubtitle] = useState(null);

  const { countryCode, countryName } = useUserLocation();

  useEffect(() => {
    if (
      location.pathname === '/pro' &&
      user !== null &&
      user.userDetails?.subscriptionStatus !== 'active'
    ) {
      console.log(user.userDetails);
      setSubscriptionDialogOpen(true);
    }
  }, [user, location]);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * titleSubtitlePairs.length);
    setSelectedTitleSubtitle(titleSubtitlePairs[randomIndex]);
  }, []);

  const subscribeButtonRef = useRef(null);
  const upgradeCreditsRef = useRef(null);

  useEffect(() => {
    setCreditOptionsOpen(isMd);
  }, [isMd]);

  const setSelectedPlanAndScroll = (plan) => {
    setSelectedPlan(plan);
    setAskedAboutCredits(false);
    subscribeButtonRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const setCreditOptionsOpenAndScroll = (setting) => {
    setCreditOptionsOpen(setting);
    setTimeout(() => {
      upgradeCreditsRef.current.scrollIntoView({ behavior: 'smooth' });
    }, 200)
  }

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
    console.log(selectedPlan)
    setLoading(true)
    API.post('publicapi', '/user/update/getCheckoutSession', {
      body: {
        currentUrl: window.location.href.replace('pro', ''),
        priceKey: selectedPlan
      }
    }).then(results => {
      console.log(results)
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
    switch (selectedPlan) {
      case 'pro5':
        return '$2.99';
      case 'pro25':
        return '$4.99';
      case 'pro69':
        return '$6.99';
      default:
        return '$2.99';
    }
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
            pt: isMd ? 3 : 2,
            pb: isMd ? 1 : 0.5,
          }}
        >
          <img
            src="/assets/memeSRC-white.svg"
            alt="memeSRC logo"
            style={{ height: isMd ? 48 : 40, marginBottom: 8 }}
          />
          <Typography fontSize={isMd ? 32 : 24} fontWeight={700}>
            memeSRC Pro
          </Typography>
          <IconButton onClick={closeDialog} size="large" sx={{ position: 'absolute', top: isMd ? 10 : 5, right: 10 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <Divider />
          <>
          {!loading && !checkoutLink && (
            <Fade in timeout={400}>
              <DialogContent sx={{ py: 4, pb: 6 }}>
                <Box
                  p={3}
                  sx={{
                    backgroundColor: getColor(),
                    borderRadius: 4,
                    mb: 4,
                    mt: isMd ? -4 : 0,
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    subscribeButtonRef.current.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <Typography fontSize={25} fontWeight={700} color={getTextColor()} gutterBottom>
                    {selectedTitleSubtitle?.title}
                  </Typography>
                  <Typography variant={isMd ? 'h2' : 'h1'} gutterBottom mb={1.25} color={getTextColor()}>
                    {getPrice()} / mo.
                  </Typography>
                  <Typography fontSize={16} fontWeight={600} color={getTextColor()} gutterBottom>
                    {selectedTitleSubtitle?.subtitle}
                  </Typography>
                </Box>
                <Grid container spacing={4} alignItems="center">
                  <Grid item xs={12} md={5}>
                    <Box display="flex" alignItems="center" mx={2} mb={3} mt={-1}>
                      <Typography variant='body2' sx={{ color: '#C2C2C2', fontSize: isMd ? '20px' : '16px' }}>
                        <b>memeSRC&nbsp;Pro</b>&nbsp;helps support&nbsp;the&nbsp;site and unlocks these&nbsp;perks:
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
                        <Check sx={{ color: getTextColor() }} />
                      </Box>
                      <Typography fontSize={18} fontWeight={500}>
                        No Ads
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
                        Early Access Features
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
                      <Typography fontSize={18} fontWeight={500}>
                        {getCreditCount()} Magic Credits / mo
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={7}>
                    <Box
                      onClick={() => setCreditOptionsOpenAndScroll(!creditOptionsOpen)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                        ml: 2,
                      }}
                    >
                      <Typography variant="h6" sx={{ textDecoration: 'underline' }} mr={1} ref={upgradeCreditsRef}>
                        Want more magic credits?
                      </Typography>
                      <ExpandMore
                        sx={{
                          transform: creditOptionsOpen ? 'rotate(180deg)' : 'rotate(0)',
                          transition: '0.2s',
                        }}
                      />
                    </Box>
                    <Collapse in={creditOptionsOpen} sx={{ mt: 2 }}>
                      <Card
                        variant="outlined"
                        sx={{
                          mb: 2,
                          cursor: 'pointer',
                          borderColor: selectedPlan === 'pro5' ? 'grey.500' : 'divider',
                          '&:hover': { borderColor: 'grey.500' },
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                        onClick={() => setSelectedPlanAndScroll('pro5')}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: 8,
                            height: '100%',
                            backgroundColor: 'grey.500',
                          }}
                        />
                        <Box
                          sx={{
                            p: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: selectedPlan === 'pro5' ? 'grey.500' : 'transparent',
                            color: selectedPlan === 'pro5' ? 'common.black' : 'common.white',
                          }}
                        >
                          <Typography fontSize={18} fontWeight={700} sx={{ ml: 2 }}>
                            5 credits / mo.
                          </Typography>
                          <Typography fontSize={18} fontWeight={700} sx={{ mr: 1 }}>
                            {selectedPlan === 'pro5' ? 'included' : selectedPlan === 'pro25' ? '-$2' : '-$4'}
                          </Typography>
                        </Box>
                      </Card>
                      <Card
                        variant="outlined"
                        sx={{
                          mb: 2,
                          cursor: 'pointer',
                          borderColor: selectedPlan === 'pro25' ? '#ff6900' : 'divider',
                          '&:hover': { borderColor: '#ff6900' },
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                        onClick={() => setSelectedPlanAndScroll('pro25')}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: 8,
                            height: '100%',
                            backgroundColor: '#ff6900',
                          }}
                        />
                        <Box
                          sx={{
                            p: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: selectedPlan === 'pro25' ? '#e65c00' : 'transparent',
                            color: selectedPlan === 'pro25' ? 'common.black' : 'common.white',
                          }}
                        >
                          <Typography fontSize={18} fontWeight={700} sx={{ ml: 2 }}>
                            25 credits / mo.
                          </Typography>
                          <Typography fontSize={18} fontWeight={700} sx={{ mr: 1 }}>
                            {selectedPlan === 'pro25' ? 'included' : selectedPlan === 'pro5' ? '+$2' : '-$2'}
                          </Typography>
                        </Box>
                      </Card>
                      <Card
                        variant="outlined"
                        sx={{
                          cursor: 'pointer',
                          borderColor: selectedPlan === 'pro69' ? 'rgb(84, 214, 44)' : 'divider',
                          '&:hover': { borderColor: 'rgb(84, 214, 44)' },
                          position: 'relative',
                          overflow: 'hidden',
                          mb: 3,
                        }}
                        onClick={() => setSelectedPlanAndScroll('pro69')}
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: 8,
                            height: '100%',
                            backgroundColor: 'rgb(84, 214, 44)',
                          }}
                        />
                        <Box
                          sx={{
                            p: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: selectedPlan === 'pro69' ? 'rgb(71, 181, 37)' : 'transparent',
                            color: selectedPlan === 'pro69' ? 'common.black' : 'common.white',
                          }}
                        >
                          <Typography fontSize={18} fontWeight={700} sx={{ ml: 2 }}>
                            69 credits / mo.
                          </Typography>
                          <Typography fontSize={18} fontWeight={700} sx={{ mr: 1 }}>
                            {selectedPlan === 'pro69' ? 'included' : selectedPlan === 'pro5' ? '+$4' : '+$2'}
                          </Typography>
                        </Box>
                      </Card>
                    </Collapse>
                  </Grid>
                </Grid>
                <Box mt={4} textAlign="center">
                  {console.log(user)}
                  {user?.userDetails ? <Button
                    ref={subscribeButtonRef}
                    variant="contained"
                    size="large"
                    onClick={() => {
                      if (countryCode === 'US') {
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
                    Subscribe: {getPrice()}/mo
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
            {countryCode !== 'US' && (
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
                memeSRC Pro is currently unavailable in your country.
              </Typography>
              <Typography fontSize={14} color="common.white">
                We really appreciate your interest and support, but sadly memeSRC&nbsp;Pro is currently unavailable to buy in your country.
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
                Thanks for understanding! We love our community around the world and want to keep making these tools more accessible to everyone.
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
        {countryCode === 'US' && (
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
              I understand memeSRC Pro is billed as Vibe&nbsp;House&nbsp;LLC and agree to the{' '}
              <a href="/termsofservice" target="_blank" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacypolicy" target="_blank" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>
                Privacy Policy
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

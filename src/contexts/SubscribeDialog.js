import { AutoFixHighRounded, Block, Close, Favorite, Star, SupportAgent, ExpandMore, Clear, Check, Bolt } from '@mui/icons-material';
import { Box, Button, Card, Checkbox, Chip, CircularProgress, Collapse, Dialog, DialogContent, DialogTitle, Divider, Fade, Grid, IconButton, LinearProgress, Typography, useMediaQuery } from '@mui/material';
import { API } from 'aws-amplify';
import { createContext, useState, useRef, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingButton } from '@mui/lab';
import { UserContext } from '../UserContext';

export const SubscribeDialogContext = createContext();

export const DialogProvider = ({ children }) => {
  const navigate = useNavigate();
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
        currentUrl: window.location.href,
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
    navigate('/login')
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
                  onClick={buySubscription}
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
          <DialogContent sx={{ minHeight: 500, display: 'flex', flexDirection: 'column', mb: 5 }}>

            <Box sx={{ m: 'auto' }}>
            <Typography fontSize={30} textAlign='center' fontWeight={700}>
              You will be billed by Vibe House LLC through Stripe
            </Typography>
            <Typography fontSize={20} textAlign='center' fontWeight={700} pt={2}>
              Please check the box below the button to proceed
            </Typography>
            </Box>
            <Box sx={{ mx: 'auto', mt: 'auto' }}>
              <LoadingButton
                loading={loading || !checkoutLink}
                loadingIndicator={
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <CircularProgress color="inherit" size={16} sx={{ mr: 1 }} />
                    <span>Preparing&nbsp;Checkout...</span>
                  </Box>
                }
                disabled={loading || !billingAgreement || !checkoutLink}
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
                  window.location.href = checkoutLink
                }}
              >
                {!loading && checkoutLink ? 'Proceed to Checkout' : ''}
              </LoadingButton>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <Checkbox
                  checked={billingAgreement}
                  onChange={(e) => setBillingAgreement(e.target.checked)}
                  color="primary"
                />
                <Typography variant="body2">
                  I understand that I will be billed monthly by Vibe House LLC through Stripe.
                </Typography>
              </Box>
            </Box>
          </DialogContent>
        )}
      </Dialog>
    </SubscribeDialogContext.Provider>
  );
};
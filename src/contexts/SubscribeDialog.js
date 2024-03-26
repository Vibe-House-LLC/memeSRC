import { AutoFixHighRounded, Block, Close, Favorite, Star, SupportAgent, ExpandMore } from '@mui/icons-material';
import { Box, Button, Card, Chip, Collapse, Dialog, DialogContent, DialogTitle, Divider, Fade, Grid, IconButton, LinearProgress, Typography, useMediaQuery } from '@mui/material';
import { API } from 'aws-amplify';
import { createContext, useState, useRef, useEffect } from 'react';

export const DialogContext = createContext();

export const DialogProvider = ({ children }) => {
  const isMd = useMediaQuery(theme => theme.breakpoints.up('md'));
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('pro5');
  const [loading, setLoading] = useState(false);
  const [creditOptionsOpen, setCreditOptionsOpen] = useState(false);

  const [askedAboutCredits, setAskedAboutCredits] = useState(false);

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
  };

  const buySubscription = () => {
    setLoading(true)
    API.post('publicapi', '/user/update/getCheckoutSession', {
      body: {
        currentUrl: window.location.href,
        priceKey: selectedPlan
      }
    }).then(results => {
      console.log(results)
      window.location.href = results
    }).catch(error => {
      console.log(error.response)
      setLoading(false)
    })
  }

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

  return (
    <DialogContext.Provider value={{ subscriptionDialogOpen, setSubscriptionDialogOpen }}>
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
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <img
            src="https://beta.memesrc.com/assets/memeSRC-white.svg"
            alt="memeSRC logo"
            style={{ height: isMd ? 40 : 32, marginRight: 16 }}
          />
          <Typography fontSize={isMd ? 32 : 24} fontWeight={700}>
            memeSRC Pro
          </Typography>
          <IconButton onClick={closeDialog} size="large" sx={{ position: 'absolute', top: isMd ? 15 : 8, right: 10 }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <Divider />
        {!loading && (
          <Fade in timeout={400}>
            <DialogContent sx={{ mb: 5, py: 4 }}>
              <Grid container spacing={4} alignItems="center">
                <Grid item xs={12} md={5}>
                  <Box p={3} sx={{ backgroundColor: getColor(), borderRadius: 4, mb: 4 }}>
                    <Typography fontSize={28} fontWeight={700} color={getTextColor()} gutterBottom>
                      Subscribe to Pro!
                    </Typography>
                    <Typography fontSize={15} fontWeight={700} color={getTextColor()} gutterBottom>
                      Or don't. I don't care.
                    </Typography>
                  </Box>
                  <Typography variant="h2" gutterBottom ml={2}>
                    {getPrice()}/month
                  </Typography>
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
                      <Block sx={{ color: getTextColor() }} />
                    </Box>
                    <Typography fontWeight={500}>No Ads</Typography>
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
                    <Typography fontWeight={500}>Premium Support</Typography>
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
                    <Typography fontWeight={500}>{getCreditCount()} Credits for Magic Tools</Typography>
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
                        <Typography fontSize={18} fontWeight={700} sx={{ml: 2}}>
                          5 credits / mo.
                        </Typography>
                        <Typography fontSize={18} fontWeight={700} sx={{mr: 1}}>
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
                        <Typography fontSize={18} fontWeight={700} sx={{ml: 2}}>
                          25 credits / mo.
                        </Typography>
                        <Typography fontSize={18} fontWeight={700} sx={{mr: 1}}>
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
                        <Typography fontSize={18} fontWeight={700} sx={{ml: 2}}>
                          69 credits / mo.
                        </Typography>
                        <Typography fontSize={18} fontWeight={700} sx={{mr: 1}}>
                          {selectedPlan === 'pro69' ? 'included' : selectedPlan === 'pro5' ? '+$4' : '+$2'}
                        </Typography>
                      </Box>
                    </Card>
                  </Collapse>
                </Grid>
              </Grid>
              <Box mt={4} textAlign="center">
                <Button
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
              </Box>
            </DialogContent>
          </Fade>
        )}
        {loading && (
          <DialogContent sx={{ minHeight: 500, display: 'flex', mb: 5 }}>
            <Box sx={{ m: 'auto' }}>
              <Typography fontSize={30} fontWeight={700} textAlign="center" mb={7}>
                Prepping checkout...
              </Typography>
              <LinearProgress />
            </Box>
          </DialogContent>
        )}
      </Dialog>
    </DialogContext.Provider>
  );
};

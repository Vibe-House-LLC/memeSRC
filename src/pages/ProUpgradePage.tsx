import { Context, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import CheckIcon from '@mui/icons-material/Check';
import BoltIcon from '@mui/icons-material/Bolt';
import ShareIcon from '@mui/icons-material/Share';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import FeedbackIcon from '@mui/icons-material/Feedback';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Fade,
  Grid,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { LoadingButton } from '@mui/lab';
import { API, graphqlOperation } from 'aws-amplify';
import { useLocation, useNavigate } from 'react-router-dom';

import { CountdownTimer } from '../components/CountdownTimer';
import { CURRENT_SALE } from '../constants/sales';
import { UserContext } from '../UserContext';
import useUserLocation from '../utils/geo/useUserLocation';
import { createLocationLeads } from '../graphql/mutations';

type PlanKey = 'pro5' | 'pro25' | 'pro69';

type TitleSubtitlePair = {
  title: string;
  subtitle: string;
};

const titleSubtitlePairs: TitleSubtitlePair[] = [
  {
    title: 'Get memeSRC Pro!',
    subtitle: "Or don't. I don't care.",
  },
  {
    title: 'Get Pro. Be a Hero.',
    subtitle: "Or stay basic I guess. Your choice.",
  },
  {
    title: 'Unlock memeSRC Pro!',
    subtitle: "Or forget you ever saw this.",
  },
  {
    title: 'Pro is for pros.',
    subtitle: "But don't let that stop you.",
  },
];

const planPrices: Record<PlanKey, number> = {
  pro5: 2.99,
  pro25: 4.99,
  pro69: 6.99,
};

const supportedCountries = ['US', 'AU', 'CA'];

const getInitialPlan = (): PlanKey => {
  const storedPlan = localStorage.getItem('defaultProPlan') as PlanKey | null;
  if (storedPlan && (storedPlan === 'pro5' || storedPlan === 'pro25' || storedPlan === 'pro69')) {
    return storedPlan;
  }

  const random = Math.random();
  let selectedPlan: PlanKey;

  if (random < 0.2) {
    selectedPlan = 'pro5';
  } else if (random < 0.75) {
    selectedPlan = 'pro25';
  } else {
    selectedPlan = 'pro69';
  }

  localStorage.setItem('defaultProPlan', selectedPlan);
  return selectedPlan;
};

const getCreditCount = (plan: PlanKey): number => {
  switch (plan) {
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

const getPlanColor = (plan: PlanKey): string => {
  switch (plan) {
    case 'pro5':
      return 'primary.main';
    case 'pro25':
      return 'rgb(84, 214, 44)';
    case 'pro69':
      return '#ff6900';
    default:
      return 'primary.main';
  }
};

const getPlanTextColor = (plan: PlanKey): string => {
  switch (plan) {
    case 'pro5':
      return 'common.white';
    case 'pro25':
    case 'pro69':
      return 'common.black';
    default:
      return 'common.white';
  }
};

const formatPriceDelta = (amount: number): string => {
  const sign = amount >= 0 ? '+' : '-';
  const absAmount = Math.abs(amount);
  const formattedPrice = Number.isInteger(absAmount) ? absAmount.toFixed(0) : absAmount.toFixed(2);
  return `${sign}$${formattedPrice}`;
};

const sanitizeDest = (maybeDest: string | null): string => {
  if (!maybeDest) {
    return '/';
  }

  const trimmed = maybeDest.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('/pro')) {
    return '/';
  }

  return trimmed;
};

const buildReturnUrl = (dest: string): string => {
  try {
    return new URL(dest, window.location.origin).toString();
  } catch (error) {
    console.error('Failed to build return URL', error);
    return window.location.origin;
  }
};

const ProUpgradePage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const isCompact = useMediaQuery('(max-width:850px)');
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(() => getInitialPlan());
  const [loading, setLoading] = useState<boolean>(false);
  const [checkoutLink, setCheckoutLink] = useState<string | undefined>();
  const [selectedTitleSubtitle, setSelectedTitleSubtitle] = useState<TitleSubtitlePair | null>(null);
  const [creditOptionsExpanded, setCreditOptionsExpanded] = useState<boolean>(!isCompact);
  const subscribeButtonRef = useRef<HTMLButtonElement | null>(null);
  const { user } = useContext(UserContext as unknown as Context<{ user: any }>);
  const { countryCode } = useUserLocation();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const dest = useMemo(() => sanitizeDest(searchParams.get('dest')), [searchParams]);
  const destLabel = dest === '/' ? 'Home' : 'Previous Page';

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * titleSubtitlePairs.length);
    setSelectedTitleSubtitle(titleSubtitlePairs[randomIndex]);
  }, []);

  useEffect(() => {
    setCreditOptionsExpanded(!isCompact);
  }, [isCompact]);

  useEffect(() => {
    if (user?.userDetails?.subscriptionStatus === 'active') {
      navigate('/account', { replace: true });
    }
  }, [navigate, user?.userDetails?.subscriptionStatus]);

  useEffect(() => {
    if (!supportedCountries.includes(countryCode) && checkoutLink && checkoutLink !== 'unsupported_country') {
      const submitUnsupportedLead = async () => {
        try {
          await (API.graphql(
            graphqlOperation(createLocationLeads, { input: { countryCode } })
          ) as Promise<unknown>);
        } catch (error) {
          console.error(error);
        }
      };

      submitUnsupportedLead();
    }
  }, [checkoutLink, countryCode]);

  const setSelectedPlanAndScroll = useCallback((plan: PlanKey) => {
    setSelectedPlan(plan);
    if (isCompact) {
      setCreditOptionsExpanded(false);
    }
    subscribeButtonRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isCompact]);

  const getPriceForPlan = useCallback((plan: PlanKey): number => {
    const basePrice = planPrices[plan];
    if (CURRENT_SALE.isActive) {
      return basePrice * CURRENT_SALE.discountMultiplier;
    }
    return basePrice;
  }, []);

  const toggleCreditOptions = useCallback(() => {
    if (isCompact) {
      setCreditOptionsExpanded((prev) => !prev);
    }
  }, [isCompact]);

  const handleClose = useCallback(() => {
    navigate(dest, { replace: true });
  }, [dest, navigate]);

  const handleLogin = useCallback(() => {
    const encodedDest = encodeURIComponent(`/pro?dest=${encodeURIComponent(dest)}`);
    navigate(`/login?dest=${encodedDest}`);
  }, [dest, navigate]);

  const buySubscription = useCallback(() => {
    setLoading(true);
    const returnUrl = buildReturnUrl(dest);

    API.post('publicapi', '/user/update/getCheckoutSession', {
      body: {
        currentUrl: returnUrl,
        priceKey: selectedPlan,
      },
    })
      .then((results) => {
        setCheckoutLink(results);
        setLoading(false);
      })
      .catch((error) => {
        console.error(error?.response || error);
        setLoading(false);
      });
  }, [dest, selectedPlan]);

  const showUnsupportedCountry = checkoutLink === 'unsupported_country' || (!supportedCountries.includes(countryCode) && (loading || checkoutLink));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'radial-gradient(140% 120% at 50% 0%, rgba(102, 126, 234, 0.18) 0%, rgba(0, 0, 0, 0.92) 55%, #000 100%)',
        color: 'common.white',
        display: 'flex',
        alignItems: 'flex-start',
        pt: { xs: '64px', md: '72px' },
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          py: { xs: 4, md: 8 },
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Stack spacing={{ xs: 3, md: 5 }} sx={{ flexGrow: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" rowGap={2}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <img
                src="/assets/memeSRC-white.svg"
                alt="memeSRC logo"
                loading="lazy"
                style={{ height: isCompact ? 28 : 36 }}
              />
              <Typography fontSize={isCompact ? 26 : 32} fontWeight={700}>
                memeSRC Pro
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="inherit"
              onClick={handleClose}
              startIcon={<ArrowBackIcon />}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.24)',
                color: 'common.white',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.45)',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                },
              }}
            >
              Back to {destLabel}
            </Button>
          </Box>

          <Box sx={{ maxWidth: 560 }}>
            <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.1 }}>
              Unlock the full memeSRC toolbox.
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mt: 1.5,
                color: 'rgba(255, 255, 255, 0.72)',
              }}
            >
              Upgrade in seconds, keep your flow, and jump straight back to what you were doing.
            </Typography>
          </Box>

          <Paper
            elevation={0}
            sx={{
              flexGrow: 1,
              borderRadius: { xs: 3, md: 4 },
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(9, 12, 16, 0.92)',
              backdropFilter: 'blur(14px)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.42)',
              overflow: 'hidden',
              p: { xs: 3, md: 5 },
            }}
          >
            {!loading && !checkoutLink && (
              <Fade in timeout={300}>
                <Box>
                  {(CURRENT_SALE.isActive && (isXs || isCompact)) && <CountdownTimer />}
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={CURRENT_SALE.isActive ? (isCompact ? 12 : 6) : 12}>
                      <Box
                        p={isCompact ? 2 : 2.5}
                        sx={{
                          backgroundColor: CURRENT_SALE.isActive ? 'rgba(0, 0, 0, 0.2)' : getPlanColor(selectedPlan),
                          borderRadius: 4,
                          mb: 2,
                          cursor: 'pointer',
                          position: 'relative',
                          border: CURRENT_SALE.isActive ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                        }}
                        onClick={() => {
                          subscribeButtonRef.current?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            fontSize={isCompact ? 18 : 22}
                            fontWeight={700}
                            color={CURRENT_SALE.isActive ? 'common.white' : getPlanTextColor(selectedPlan)}
                          >
                            {selectedTitleSubtitle?.title}
                          </Typography>
                          {CURRENT_SALE.isActive && (
                            <Chip
                              label={`${CURRENT_SALE.discountPercent.toFixed(0)}% OFF`}
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
                          variant={isCompact ? 'h2' : 'h3'}
                          mb={0.75}
                          sx={{ color: CURRENT_SALE.isActive ? getPlanColor(selectedPlan) : getPlanTextColor(selectedPlan) }}
                        >
                          {CURRENT_SALE.isActive && (
                            <span
                              style={{
                                textDecoration: 'line-through',
                                fontSize: '0.7em',
                                opacity: 0.7,
                                marginRight: '8px',
                                color: 'white',
                              }}
                            >
                              ${planPrices[selectedPlan].toFixed(2)}
                            </span>
                          )}
                          ${getPriceForPlan(selectedPlan).toFixed(2)} / mo.
                        </Typography>
                        <Typography
                          fontSize={isCompact ? 15 : 13}
                          fontWeight={600}
                          color={CURRENT_SALE.isActive ? 'common.white' : getPlanTextColor(selectedPlan)}
                        >
                          {selectedTitleSubtitle?.subtitle}
                        </Typography>
                      </Box>
                    </Grid>

                    {CURRENT_SALE.isActive && !isXs && !isCompact && (
                      <Grid item sm={6}>
                        <CountdownTimer />
                      </Grid>
                    )}
                  </Grid>

                  <Grid container spacing={isCompact ? 2 : 4} alignItems="center">
                    <Grid item xs={12} sm={isCompact ? 12 : 5}>
                      <Box display="flex" alignItems="center" mb={isCompact ? 1.5 : 2} ml={2}>
                        <Box
                          sx={{
                            backgroundColor: getPlanColor(selectedPlan),
                            borderRadius: '50%',
                            width: isCompact ? 28 : 32,
                            height: isCompact ? 28 : 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 2,
                          }}
                        >
                          <CheckIcon sx={{ color: getPlanTextColor(selectedPlan), fontSize: isCompact ? 20 : 24 }} />
                        </Box>
                        <Typography fontSize={isCompact ? 16 : 18} fontWeight={500}>
                          Zero Ads
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" mb={isCompact ? 1.5 : 2} ml={2}>
                        <Box
                          sx={{
                            backgroundColor: getPlanColor(selectedPlan),
                            borderRadius: '50%',
                            width: isCompact ? 28 : 32,
                            height: isCompact ? 28 : 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 2,
                          }}
                        >
                          <SupportAgentIcon sx={{ color: getPlanTextColor(selectedPlan), fontSize: isCompact ? 20 : 24 }} />
                        </Box>
                        <Typography fontSize={isCompact ? 16 : 18} fontWeight={500}>
                          Pro Support
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" mb={isCompact ? 1.5 : 2} ml={2}>
                        <Box
                          sx={{
                            backgroundColor: getPlanColor(selectedPlan),
                            borderRadius: '50%',
                            width: isCompact ? 28 : 32,
                            height: isCompact ? 28 : 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 2,
                          }}
                        >
                          <BoltIcon sx={{ color: getPlanTextColor(selectedPlan), fontSize: isCompact ? 20 : 24 }} />
                        </Box>
                        <Typography fontSize={isCompact ? 16 : 18} fontWeight={500}>
                          Exclusive Features
                        </Typography>
                      </Box>
                      <Box
                        display="flex"
                        alignItems="center"
                        ml={2}
                        onClick={isCompact ? toggleCreditOptions : undefined}
                        sx={{ cursor: isCompact ? 'pointer' : 'default' }}
                      >
                        <Box
                          sx={{
                            backgroundColor: getPlanColor(selectedPlan),
                            borderRadius: '50%',
                            width: isCompact ? 28 : 32,
                            height: isCompact ? 28 : 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 2,
                          }}
                        >
                          <AutoFixHighRoundedIcon sx={{ color: getPlanTextColor(selectedPlan), fontSize: isCompact ? 20 : 24 }} />
                        </Box>
                        <Typography fontSize={isCompact ? 16 : 18} fontWeight={500} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {getCreditCount(selectedPlan)} Magic Credits
                          {isCompact && !creditOptionsExpanded && (
                            <Box
                              component="span"
                              sx={{
                                color: 'rgba(255, 255, 255, 0.5)',
                                cursor: 'pointer',
                                ml: 1,
                                fontSize: '0.75em',
                                fontWeight: 600,
                                userSelect: 'none',
                                transition: 'all 0.2s',
                                textDecoration: 'underline',
                                '&:hover': {
                                  color: 'rgba(255, 255, 255, 0.8)',
                                },
                              }}
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleCreditOptions();
                              }}
                            >
                              change
                            </Box>
                          )}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={isCompact ? 12 : 7}>
                      <Collapse in={creditOptionsExpanded} timeout={300}>
                        {!isCompact ? (
                          <Box sx={{ px: 2 }}>
                            {[
                              { plan: 'pro5', credits: 5, color: 'grey.500', hoverColor: 'grey.500', activeColor: 'grey.500' },
                              { plan: 'pro25', credits: 25, color: 'rgb(84, 214, 44)', hoverColor: 'rgb(84, 214, 44)', activeColor: 'rgb(71, 181, 37)' },
                              { plan: 'pro69', credits: 69, color: '#ff6900', hoverColor: '#ff6900', activeColor: '#e65c00' },
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
                                onClick={() => setSelectedPlanAndScroll(plan as PlanKey)}
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
                                  }}
                                >
                                  <Typography fontSize={20} fontWeight={700}>
                                    {credits} Magic Credits
                                  </Typography>
                                  <Typography fontSize={20} fontWeight={700}>
                                    ${getPriceForPlan(plan as PlanKey).toFixed(2)}
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    p: 2,
                                    backgroundColor: selectedPlan === plan ? `rgba(255, 255, 255, 0.05)` : 'transparent',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                  }}
                                >
                                  <Typography fontSize={14} color="text.secondary">
                                    {selectedPlan === plan
                                      ? 'This is your default plan'
                                      : `Switching saves ${formatPriceDelta(getPriceForPlan(plan as PlanKey) - getPriceForPlan(selectedPlan))}`}
                                  </Typography>
                                </Box>
                              </Card>
                            ))}
                          </Box>
                        ) : (
                          <Stack direction="row" gap={1} justifyContent="center">
                            {[
                              { plan: 'pro5', credits: 5, color: '#616161', textColor: 'common.white' },
                              { plan: 'pro25', credits: 25, color: 'rgb(84, 214, 44)', textColor: 'common.black' },
                              { plan: 'pro69', credits: 69, color: '#ff6900', textColor: 'common.black' },
                            ].map(({ plan, credits, color, textColor }) => (
                              <Box key={plan} sx={{ textAlign: 'center' }}>
                                <Card
                                  onClick={() => setSelectedPlan(plan as PlanKey)}
                                  sx={{
                                    backgroundColor: selectedPlan === plan ? color : 'rgba(255, 255, 255, 0.04)',
                                    color: selectedPlan === plan ? textColor : 'common.white',
                                    width: 90,
                                    height: 80,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    border: selectedPlan === plan ? `2px solid ${color}` : '1px solid rgba(255, 255, 255, 0.08)',
                                    position: 'relative',
                                    overflow: 'visible',
                                  }}
                                >
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: '100%',
                                      height: '4px',
                                      backgroundColor: color,
                                      display: selectedPlan === plan ? 'none' : 'block',
                                    }}
                                  />
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      color: selectedPlan === plan ? textColor : 'common.white',
                                      fontSize: isCompact ? '1.2rem' : '1.5rem',
                                      fontWeight: 600,
                                    }}
                                  >
                                    <AutoFixHighRoundedIcon sx={{ fontSize: isCompact ? 23 : 28, mx: 0.5 }} />
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
                                    fontSize: isCompact ? '0.7rem' : '0.75rem',
                                  }}
                                >
                                  {selectedPlan === plan
                                    ? 'included'
                                    : formatPriceDelta(getPriceForPlan(plan as PlanKey) - getPriceForPlan(selectedPlan))}
                                </Typography>
                              </Box>
                            ))}
                          </Stack>
                        )}
                      </Collapse>
                    </Grid>
                  </Grid>
                  <Box mt={creditOptionsExpanded || isCompact ? 2 : 4} textAlign="center">
                    {user?.userDetails ? (
                      <Button
                        ref={subscribeButtonRef}
                        variant="contained"
                        size="large"
                        onClick={() => {
                          if (supportedCountries.includes(countryCode)) {
                            buySubscription();
                          } else {
                            setCheckoutLink('unsupported_country');
                          }
                        }}
                        fullWidth
                        sx={{
                          borderRadius: 50,
                          px: 4,
                          py: isCompact ? 1.25 : 1.5,
                          fontSize: isCompact ? 18 : 20,
                          backgroundColor: getPlanColor(selectedPlan),
                          color: getPlanTextColor(selectedPlan),
                        }}
                      >
                        Upgrade Account
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
                          py: isCompact ? 1.25 : 1.5,
                          fontSize: isCompact ? 18 : 20,
                          backgroundColor: getPlanColor(selectedPlan),
                          color: getPlanTextColor(selectedPlan),
                        }}
                      >
                        Upgrade Account
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
                </Box>
              </Fade>
            )}
            {(loading || checkoutLink) && !showUnsupportedCountry && (
              <Box sx={{ minHeight: 500, display: 'flex', flexDirection: 'column', mb: 5, p: { xs: 2.5, md: 4 } }}>
                <Button
                  onClick={() => {
                    setCheckoutLink(undefined);
                    setLoading(false);
                  }}
                  sx={{
                    color: 'white',
                    opacity: 0.7,
                    alignSelf: 'flex-start',
                    mb: 2,
                    '&:hover': {
                      opacity: 1,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                  startIcon={<ArrowBackIcon />}
                >
                  Go Back
                </Button>
                <Box sx={{ m: 'auto' }}>
                  <Typography fontSize={20} textAlign="center" fontWeight={700}>
                    Powered by
                  </Typography>
                  <Typography fontSize={45} textAlign="center" fontWeight={700} pt={0.5}>
                    Vibe House
                  </Typography>
                  <Box
                    sx={{
                      mt: 3,
                      mb: 3,
                      mx: 'auto',
                      p: 2.5,
                      maxWidth: 360,
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: 2.5,
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    <Typography
                      fontSize={13}
                      color="text.secondary"
                      sx={{
                        mb: 1.5,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        position: 'relative',
                      }}
                    >
                      <Typography
                        component="span"
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 24,
                          transform: 'translateY(-50%)',
                          backgroundColor: 'background.paper',
                          px: 1,
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'text.secondary',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: 'success.main',
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                              '0%': { opacity: 0.4 },
                              '50%': { opacity: 1 },
                              '100%': { opacity: 0.4 },
                            },
                          }}
                        />
                        <b>Reminder</b>
                      </Typography>
                      Your subscription to memeSRC Pro will be billed monthly and appear on your statement as:
                    </Typography>
                    <Box
                      sx={{
                        p: 1.5,
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        borderRadius: 1.5,
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          position: 'relative',
                          zIndex: 1,
                        }}
                      >
                        <Typography
                          fontFamily="'Roboto Mono', monospace"
                          fontSize={{ xs: 13, sm: 16 }}
                          fontWeight={700}
                          sx={{ letterSpacing: '0.5px', mx: 1 }}
                        >
                          ${getPriceForPlan(selectedPlan).toFixed(2)}
                        </Typography>
                        <Typography
                          fontFamily="'Roboto Mono', monospace"
                          fontSize={{ xs: 13, sm: 16 }}
                          fontWeight={700}
                          sx={{
                            letterSpacing: '0.5px',
                            opacity: 0.85,
                            color: 'white',
                            mx: 1,
                          }}
                        >
                          VIBE HOUSE LLC
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          top: '50%',
                          width: '100%',
                          height: 1,
                          borderBottom: '2px dotted rgba(255, 255, 255, 0.1)',
                          transform: 'translateY(-50%)',
                        }}
                      />
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: 'block',
                        mt: 1.5,
                        textAlign: 'center',
                        opacity: 0.7,
                      }}
                    >
                      Processed securely through Stripe
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ mx: 'auto', mt: 'auto', textAlign: 'center', width: '100%', maxWidth: 420 }}>
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
                      backgroundColor: getPlanColor(selectedPlan),
                      color: getPlanTextColor(selectedPlan),
                    }}
                    onClick={() => {
                      if (checkoutLink) {
                        window.location.href = checkoutLink;
                      }
                    }}
                  >
                    {!loading && checkoutLink ? 'Agree & Continue' : ''}
                  </LoadingButton>
                  <Typography variant="caption" sx={{ mt: 2, lineHeight: 1.2 }}>
                    By continuing, you are confirming: (1) you are a U.S. resident, (2) you understand memeSRC&nbsp;Pro is billed as Vibe&nbsp;House&nbsp;LLC, and you agree to the{' '}
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
              </Box>
            )}
            {showUnsupportedCountry && (
              <Box sx={{ py: 4, px: { xs: 2.5, md: 4 } }}>
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
                        <ShareIcon sx={{ color: 'common.white' }} />
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
                        <ThumbUpIcon sx={{ color: 'common.white' }} />
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
                        <FeedbackIcon sx={{ color: 'common.white' }} />
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
                  variant="contained"
                  size="small"
                  onClick={handleClose}
                  fullWidth
                  sx={{
                    borderRadius: 50,
                    px: 4,
                    fontSize: 17,
                    mt: 5,
                  }}
                >
                  Dismiss
                </Button>
              </Box>
            )}
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
};

export default ProUpgradePage;

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
  Container,
  Divider,
  Fade,
  Grid,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
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
    title: 'Create at the speed of culture.',
    subtitle: 'Unlock the full memeSRC studio built for 2025 creators.',
  },
  {
    title: 'Upgrade once. Ship faster forever.',
    subtitle: 'Stay in flow with a workspace tuned for rapid drops.',
  },
  {
    title: 'Design, remix, and go live instantly.',
    subtitle: 'Pro gives you the launchpad for every trend cycle.',
  },
  {
    title: 'Make every meme feel premium.',
    subtitle: 'The best templates, tools, and support without friction.',
  },
];

const planPrices: Record<PlanKey, number> = {
  pro5: 2.99,
  pro25: 4.99,
  pro69: 6.99,
};

const supportedCountries = ['US', 'AU', 'CA'];

type PlanDetail = {
  label: string;
  headline: string;
  description: string;
};

const planDetails: Record<PlanKey, PlanDetail> = {
  pro5: {
    label: 'Creator',
    headline: 'Start building momentum',
    description: '5 Magic Credits every month for personal workflows and experimentation.',
  },
  pro25: {
    label: 'Studio',
    headline: 'Scale new drops effortlessly',
    description: '25 Magic Credits every month to keep your team shipping consistently.',
  },
  pro69: {
    label: 'Agency',
    headline: 'Stay ahead of every trend',
    description: '69 Magic Credits every month for power users managing multiple launches.',
  },
};

type FeatureHighlight = {
  icon: typeof BoltIcon;
  title: string;
  description: string;
};

const featureHighlights: FeatureHighlight[] = [
  {
    icon: BoltIcon,
    title: 'Lightning workflow',
    description: 'Remove the ads and unlock faster renders so you never miss a trending moment.',
  },
  {
    icon: AutoFixHighRoundedIcon,
    title: 'Magic tools first',
    description: 'Jump into experimental generative updates the day they launch.',
  },
  {
    icon: SupportAgentIcon,
    title: 'Priority creator support',
    description: 'Get direct access to the memeSRC team for feedback, requests, and fixes.',
  },
  {
    icon: CheckIcon,
    title: 'Flexible membership',
    description: 'Cancel anytime and keep your benefits through the end of your cycle.',
  },
];

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

const getPlanGradient = (plan: PlanKey): string => {
  switch (plan) {
    case 'pro5':
      return 'linear-gradient(135deg, rgba(37, 99, 235, 0.95) 0%, rgba(14, 165, 233, 0.9) 100%)';
    case 'pro25':
      return 'linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(163, 230, 53, 0.9) 100%)';
    case 'pro69':
      return 'linear-gradient(135deg, rgba(249, 115, 22, 0.95) 0%, rgba(251, 191, 36, 0.9) 100%)';
    default:
      return 'linear-gradient(135deg, rgba(37, 99, 235, 0.95) 0%, rgba(14, 165, 233, 0.9) 100%)';
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
  const navigate = useNavigate();
  const location = useLocation();
  const isCompact = useMediaQuery('(max-width:850px)');
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(() => getInitialPlan());
  const [loading, setLoading] = useState<boolean>(false);
  const [checkoutLink, setCheckoutLink] = useState<string | undefined>();
  const [selectedTitleSubtitle, setSelectedTitleSubtitle] = useState<TitleSubtitlePair | null>(null);
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
    subscribeButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const getPriceForPlan = useCallback((plan: PlanKey): number => {
    const basePrice = planPrices[plan];
    if (CURRENT_SALE.isActive) {
      return basePrice * CURRENT_SALE.discountMultiplier;
    }
    return basePrice;
  }, []);

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
  const currentPlanPrice = useMemo(() => getPriceForPlan(selectedPlan), [getPriceForPlan, selectedPlan]);
  const heroTitle = selectedTitleSubtitle?.title ?? titleSubtitlePairs[0].title;
  const heroSubtitle = selectedTitleSubtitle?.subtitle ?? titleSubtitlePairs[0].subtitle;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'radial-gradient(160% 120% at 50% 0%, rgba(32, 56, 140, 0.28) 0%, rgba(3, 7, 18, 0.94) 55%, #010104 100%)',
        color: 'common.white',
        display: 'flex',
        alignItems: 'flex-start',
        pt: { xs: '64px', md: '72px' },
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          py: { xs: 5, md: 8 },
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 4, md: 6 },
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" rowGap={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <img
              src="/assets/memeSRC-white.svg"
              alt="memeSRC logo"
              loading="lazy"
              style={{ height: isCompact ? 28 : 36 }}
            />
            <Typography fontSize={isCompact ? 26 : 32} fontWeight={700}>
              memeSRC Pro
            </Typography>
            <Chip
              label="2025 Edition"
              size="small"
              sx={{
                fontWeight: 600,
                letterSpacing: 0.6,
                color: 'rgba(255, 255, 255, 0.9)',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              }}
            />
          </Stack>
          <Button
            variant="outlined"
            color="inherit"
            onClick={handleClose}
            startIcon={<ArrowBackIcon />}
            sx={{
              borderColor: 'rgba(255, 255, 255, 0.24)',
              color: 'common.white',
              backdropFilter: 'blur(8px)',
              borderRadius: '999px',
              px: 2.5,
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.45)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Back to {destLabel}
          </Button>
        </Box>
        <Paper
          elevation={0}
          sx={{
            flexGrow: 1,
            borderRadius: { xs: 3, md: 4 },
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(8, 12, 24, 0.78)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 45px 120px rgba(0, 0, 0, 0.55)',
            overflow: 'hidden',
            p: { xs: 3.5, md: 5 },
          }}
        >
          {!loading && !checkoutLink && (
            <Fade in timeout={320}>
              <Box>
                <Grid container spacing={{ xs: 4, md: 6 }}>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={{ xs: 3, md: 4 }}>
                      <Stack spacing={1.5}>
                        {CURRENT_SALE.isActive && (
                          <Chip
                            label={`${CURRENT_SALE.discountPercent.toFixed(0)}% limited pricing`}
                            color="primary"
                            sx={{
                              alignSelf: 'flex-start',
                              fontWeight: 700,
                              letterSpacing: 0.4,
                              backgroundColor: 'rgba(79, 70, 229, 0.18)',
                              color: 'rgba(199, 210, 254, 0.95)',
                            }}
                          />
                        )}
                        <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.1 }}>
                          {heroTitle}
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.74)' }}>
                          {heroSubtitle}
                        </Typography>
                      </Stack>
                      <Stack spacing={2.5}>
                        {(Object.keys(planDetails) as PlanKey[]).map((plan) => {
                          const details = planDetails[plan];
                          const credits = getCreditCount(plan);
                          const isSelected = selectedPlan === plan;
                          const planPrice = getPriceForPlan(plan);
                          return (
                            <Card
                              key={plan}
                              component="button"
                              type="button"
                              onClick={() => setSelectedPlanAndScroll(plan)}
                              sx={{
                                textAlign: 'left',
                                borderRadius: 3,
                                px: { xs: 3, md: 3.5 },
                                py: { xs: 3, md: 3.5 },
                                cursor: 'pointer',
                                border: '1px solid',
                                borderColor: isSelected ? 'transparent' : 'rgba(255, 255, 255, 0.08)',
                                background: isSelected ? getPlanGradient(plan) : 'rgba(255, 255, 255, 0.04)',
                                color: isSelected ? getPlanTextColor(plan) : 'rgba(255, 255, 255, 0.92)',
                                boxShadow: isSelected ? '0 30px 80px rgba(0, 0, 0, 0.45)' : 'none',
                                transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
                                position: 'relative',
                                overflow: 'hidden',
                                '&:hover': {
                                  transform: 'translateY(-4px)',
                                  boxShadow: '0 28px 80px rgba(0, 0, 0, 0.45)',
                                },
                                '&:focus-visible': {
                                  outline: '2px solid rgba(255, 255, 255, 0.6)',
                                  outlineOffset: '2px',
                                },
                              }}
                            >
                              <Stack spacing={2}>
                                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
                                  <Box>
                                    <Typography
                                      variant="overline"
                                      sx={{
                                        letterSpacing: 1.1,
                                        opacity: isSelected ? 0.95 : 0.65,
                                      }}
                                    >
                                      {details.label}
                                    </Typography>
                                    <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                                      {details.headline}
                                    </Typography>
                                  </Box>
                                  <Box textAlign="right">
                                    {CURRENT_SALE.isActive && (
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          textDecoration: 'line-through',
                                          opacity: 0.7,
                                        }}
                                      >
                                        ${planPrices[plan].toFixed(2)}
                                      </Typography>
                                    )}
                                    <Typography variant="h4" fontWeight={800}>
                                      ${planPrice.toFixed(2)}
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.75 }}>
                                      per month
                                    </Typography>
                                  </Box>
                                </Stack>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: isSelected ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.7)',
                                  }}
                                >
                                  {details.description}
                                </Typography>
                                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.14)' }} />
                                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
                                  <Stack direction="row" alignItems="center" spacing={1.25}>
                                    <AutoFixHighRoundedIcon sx={{ fontSize: 22 }} />
                                    <Typography variant="subtitle2" fontWeight={600}>
                                      {credits} Magic Credits / mo
                                    </Typography>
                                  </Stack>
                                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                    {isSelected
                                      ? 'Current selection'
                                      : `Switch & ${formatPriceDelta(planPrice - currentPlanPrice)} / mo`}
                                  </Typography>
                                </Stack>
                              </Stack>
                            </Card>
                          );
                        })}
                      </Stack>
                      <Stack spacing={2.5}>
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
                            sx={{
                              alignSelf: 'stretch',
                              borderRadius: '999px',
                              px: 4,
                              py: { xs: 1.4, md: 1.6 },
                              fontSize: { xs: 18, md: 20 },
                              backgroundImage: getPlanGradient(selectedPlan),
                              color: getPlanTextColor(selectedPlan),
                              boxShadow: '0 35px 90px rgba(0, 0, 0, 0.55)',
                              '&:hover': {
                                backgroundImage: getPlanGradient(selectedPlan),
                                filter: 'brightness(1.05)',
                                boxShadow: '0 45px 110px rgba(0, 0, 0, 0.6)',
                              },
                            }}
                          >
                            Upgrade Now
                          </Button>
                        ) : (
                          <Button
                            ref={subscribeButtonRef}
                            variant="contained"
                            size="large"
                            onClick={handleLogin}
                            sx={{
                              alignSelf: 'stretch',
                              borderRadius: '999px',
                              px: 4,
                              py: { xs: 1.4, md: 1.6 },
                              fontSize: { xs: 18, md: 20 },
                              backgroundImage: getPlanGradient(selectedPlan),
                              color: getPlanTextColor(selectedPlan),
                              boxShadow: '0 35px 90px rgba(0, 0, 0, 0.55)',
                              '&:hover': {
                                backgroundImage: getPlanGradient(selectedPlan),
                                filter: 'brightness(1.05)',
                                boxShadow: '0 45px 110px rgba(0, 0, 0, 0.6)',
                              },
                            }}
                          >
                            Sign in to upgrade
                          </Button>
                        )}
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ textAlign: 'center', display: 'block', mx: 'auto', maxWidth: 320 }}
                        >
                          Payments go to{' '}
                          <a
                            href="https://vibehouse.net"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'inherit', fontWeight: 700, textDecoration: 'none' }}
                          >
                            Vibe House
                          </a>{' '}
                          and are secured by{' '}
                          <a
                            href="https://stripe.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'inherit', fontWeight: 700, textDecoration: 'none' }}
                          >
                            Stripe
                          </a>
                          .
                        </Typography>
                        <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="center">
                          <CheckIcon sx={{ fontSize: 20, color: 'rgba(129, 212, 250, 0.9)' }} />
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.76)' }}>
                            Keep access through the end of your billing cycle - cancel anytime.
                          </Typography>
                        </Stack>
                      </Stack>
                    </Stack>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={{ xs: 3, md: 4 }}>
                      <Box>
                        <Typography
                          variant="overline"
                          sx={{ letterSpacing: 1.6, color: 'rgba(255, 255, 255, 0.65)' }}
                        >
                          Why creators choose Pro
                        </Typography>
                        <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.15 }}>
                          A streamlined studio for the next wave of meme culture.
                        </Typography>
                        <Typography
                          variant="body1"
                          sx={{ mt: 1.5, color: 'rgba(255, 255, 255, 0.74)', maxWidth: 420 }}
                        >
                          Build and ship ideas without friction. memeSRC Pro gives you premium tooling, early feature access, and human support to stay ahead in 2025.
                        </Typography>
                      </Box>
                      <Stack spacing={2.5}>
                        {featureHighlights.map(({ icon: Icon, title, description }) => (
                          <Card
                            key={title}
                            elevation={0}
                            sx={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 2,
                              p: { xs: 2.5, md: 3 },
                              borderRadius: 3,
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              background: 'rgba(255, 255, 255, 0.04)',
                              backdropFilter: 'blur(12px)',
                            }}
                          >
                            <Box
                              sx={{
                                width: 46,
                                height: 46,
                                borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.12)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <Icon sx={{ fontSize: 24, color: 'rgba(199, 210, 254, 0.95)' }} />
                            </Box>
                            <Box>
                              <Typography variant="subtitle1" fontWeight={700}>
                                {title}
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.74)' }}>
                                {description}
                              </Typography>
                            </Box>
                          </Card>
                        ))}
                      </Stack>
                      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />
                      <Stack spacing={1.5}>
                        <Stack direction="row" alignItems="center" spacing={1.25}>
                          <CheckIcon sx={{ fontSize: 20, color: 'rgba(129, 212, 250, 0.9)' }} />
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.74)' }}>
                            Early drops roll out to Pro first - including brand new magic tools.
                          </Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={1.25}>
                          <CheckIcon sx={{ fontSize: 20, color: 'rgba(129, 212, 250, 0.9)' }} />
                          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.74)' }}>
                            Save templates, projects, and series so your team can remix instantly.
                          </Typography>
                        </Stack>
                      </Stack>
                      {CURRENT_SALE.isActive && <CountdownTimer />}
                    </Stack>
                  </Grid>
                </Grid>
              </Box>
            </Fade>
          )}
          {(loading || checkoutLink) && !showUnsupportedCountry && (
            <Box sx={{ minHeight: 520, display: 'flex', flexDirection: 'column' }}>
              <Button
                onClick={() => {
                  setCheckoutLink(undefined);
                  setLoading(false);
                }}
                sx={{
                  color: 'common.white',
                  opacity: 0.7,
                  alignSelf: 'flex-start',
                  mb: 3,
                  borderRadius: '999px',
                  '&:hover': {
                    opacity: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  },
                }}
                startIcon={<ArrowBackIcon />}
              >
                Choose another plan
              </Button>
              <Stack spacing={4} alignItems="center" justifyContent="center" sx={{ flexGrow: 1 }}>
                <Stack spacing={1.5} alignItems="center" textAlign="center">
                  <Typography variant="h5" fontWeight={700}>
                    Preparing your secure checkout
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.72)', maxWidth: 360 }}>
                    We're connecting to Stripe to confirm your membership. This only takes a moment.
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: 420,
                    borderRadius: 3,
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(10, 14, 28, 0.8)',
                    p: 3,
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1,
                      fontFamily: "'Roboto Mono', monospace",
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ letterSpacing: 0.8 }}>
                      memeSRC Pro
                    </Typography>
                    <Typography variant="subtitle2" sx={{ letterSpacing: 0.8 }}>
                      ${currentPlanPrice.toFixed(2)} / mo
                    </Typography>
                  </Box>
                  <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', my: 1.5 }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.68)' }}>
                    Billing label: VIBE HOUSE LLC - Secured by Stripe
                  </Typography>
                </Box>
                <Box sx={{ width: '100%', maxWidth: 420 }}>
                  <LoadingButton
                    loading={loading || !checkoutLink}
                    loadingIndicator={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CircularProgress color="inherit" size={18} sx={{ mr: 1 }} />
                        <span>Creating checkout...</span>
                      </Box>
                    }
                    variant="contained"
                    size="large"
                    fullWidth
                    sx={{
                      borderRadius: '999px',
                      py: 1.5,
                      fontSize: 18,
                      backgroundImage: getPlanGradient(selectedPlan),
                      color: getPlanTextColor(selectedPlan),
                      boxShadow: '0 30px 80px rgba(0, 0, 0, 0.55)',
                      '&:hover': {
                        backgroundImage: getPlanGradient(selectedPlan),
                        filter: 'brightness(1.05)',
                      },
                    }}
                    onClick={() => {
                      if (checkoutLink) {
                        window.location.href = checkoutLink;
                      }
                    }}
                  >
                    {!loading && checkoutLink ? 'Agree & continue' : ''}
                  </LoadingButton>
                  <Typography
                    variant="caption"
                    sx={{ mt: 2, lineHeight: 1.4, display: 'block', color: 'rgba(255, 255, 255, 0.65)' }}
                  >
                    By continuing you confirm you are a U.S. resident, understand memeSRC Pro is billed as Vibe House LLC, and agree to the{' '}
                    <a href="/termsofservice" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 700 }}>
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacypolicy" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none', fontWeight: 700 }}>
                      Privacy Policy
                    </a>
                    .
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
          {showUnsupportedCountry && (
            <Box sx={{ py: 4, px: { xs: 2.5, md: 4 } }}>
              <Box
                p={3}
                sx={{
                  background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.9) 0%, rgba(229, 57, 53, 0.85) 100%)',
                  borderRadius: 4,
                  mb: 4,
                  boxShadow: '0 30px 80px rgba(244, 67, 54, 0.4)',
                }}
              >
                <Typography fontSize={23} fontWeight={700} color="common.white" gutterBottom>
                  Pro is currently not available in your country.
                </Typography>
                <Typography fontSize={14} color="common.white">
                  We appreciate your interest and support. memeSRC Pro is not available to purchase in your region yet, but we have noted it and will reach out when that changes.
                </Typography>
              </Box>
              <Box sx={{ mt: 4, mx: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Other ways to stay involved:
                </Typography>
                <Box sx={{ pl: 3, mt: 2 }}>
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
                    <Typography variant="body1">Share memeSRC with your community</Typography>
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
                    <Typography variant="body1">Keep creating and showcasing your memes</Typography>
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
                    <Typography variant="body1">Send us feedback so we can expand faster</Typography>
                  </Box>
                </Box>
              </Box>
              <Box sx={{ mt: 4, mx: 1 }}>
                <Typography variant="body1">
                  We're actively working on bringing Pro to more regions. Thanks for being part of the community - more access is coming.
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
      </Container>
    </Box>
  );
};

export default ProUpgradePage;

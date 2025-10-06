// FullScreenSearch.js

import styled from '@emotion/styled';
import { Grid, Typography, useMediaQuery, useTheme, IconButton, Slide, Paper } from '@mui/material';
import { Box } from '@mui/system';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import { UserContext } from '../../UserContext';
import useSearchDetails from '../../hooks/useSearchDetails';
import { searchPropTypes } from './SearchPropTypes';
import HomePageBannerAd from '../../ads/HomePageBannerAd';
import useSearchDetailsV2 from '../../hooks/useSearchDetailsV2';
import AddCidPopup from '../../components/ipfs/add-cid-popup';
import FavoriteToggle from '../../components/FavoriteToggle';

import Logo from '../../components/logo';
import FixedMobileBannerAd from '../../ads/FixedMobileBannerAd';
import UnifiedSearchBar from '../../components/search/UnifiedSearchBar';
import FloatingActionButtons from '../../components/floating-action-buttons/FloatingActionButtons';
import {
  fetchLatestRelease,
  getReleaseType,
  formatRelativeTimeCompact,
  setDismissedVersion,
  getDismissedVersion,
  formatReleaseDisplay,
} from '../../utils/githubReleases';
import { safeGetItem, safeSetItem } from '../../utils/storage';
import useLoadRandomFrame from '../../utils/loadRandomFrame';
import { trackUsageEvent } from '../../utils/trackUsageEvent';
import { isColorNearBlack } from '../../utils/colors';
import FeedSection from './FeedSection';


/* --------------------------------- GraphQL -------------------------------- */

// Height of the fixed navbar on mobile
const NAVBAR_HEIGHT = 45;
const AUTO_DISMISS_TOTAL_MS = 30 * 1000;
const AUTO_DISMISS_MIN_VISIBLE_MS = 3 * 1000;
const VISIBILITY_STORAGE_PREFIX = 'recentUpdateVisible:';
const MOBILE_SECTION_GUTTER = 6;
const DESKTOP_CARD_PADDING = 32;
const DESKTOP_NAVBAR_HEIGHT = NAVBAR_HEIGHT;
const DESKTOP_STICKY_TOP_OFFSET = DESKTOP_NAVBAR_HEIGHT + DESKTOP_CARD_PADDING;
const DESKTOP_STICKY_HEIGHT = `calc(100vh - ${DESKTOP_NAVBAR_HEIGHT + DESKTOP_CARD_PADDING * 2}px)`;
const MOBILE_CARD_OFFSET = NAVBAR_HEIGHT + MOBILE_SECTION_GUTTER;
const MOBILE_MAX_CARD_HEIGHT = `calc(100svh - ${MOBILE_CARD_OFFSET}px)`;
const MOBILE_CARD_TARGET_HEIGHT = `calc(90svh - ${MOBILE_CARD_OFFSET}px)`;
const MOBILE_CARD_MIN_HEIGHT = `clamp(280px, ${MOBILE_CARD_TARGET_HEIGHT}, ${MOBILE_MAX_CARD_HEIGHT})`;
const SHORT_VIEWPORT_MEDIA_QUERY = '@media (max-height: 720px)';
// Standalone mode: vertical padding inside the hero surface box
const STANDALONE_HERO_PADDING_TOP_XS = 12;
const STANDALONE_HERO_PADDING_BOTTOM_XS = 14;
const STANDALONE_HERO_PADDING_TOP_MD = 14;
const STANDALONE_HERO_PADDING_BOTTOM_MD = 16;
const STANDALONE_TOTAL_VERTICAL_PADDING_XS = STANDALONE_HERO_PADDING_TOP_XS + STANDALONE_HERO_PADDING_BOTTOM_XS;
const STANDALONE_TOTAL_VERTICAL_PADDING_MD = STANDALONE_HERO_PADDING_TOP_MD + STANDALONE_HERO_PADDING_BOTTOM_MD;
// Container heights account for navbar only
// Use svh (small viewport height) on mobile - represents viewport when browser UI is fully visible (smallest size)
// This prevents content overflow when address bar shows/hides on mobile browsers
const STANDALONE_CONTAINER_HEIGHT_XS = `100svh`;
const STANDALONE_CONTAINER_MIN_HEIGHT_XS = `calc(${STANDALONE_CONTAINER_HEIGHT_XS} - ${NAVBAR_HEIGHT}px)`;
const STANDALONE_CONTAINER_MIN_HEIGHT_MD = `calc(100vh - ${DESKTOP_NAVBAR_HEIGHT}px)`;
// Paper heights match container (no extra padding at this level)
const STANDALONE_PAPER_HEIGHT_XS = STANDALONE_CONTAINER_MIN_HEIGHT_XS;
const STANDALONE_PAPER_MIN_HEIGHT_XS = MOBILE_CARD_MIN_HEIGHT;
const STANDALONE_PAPER_MIN_HEIGHT_MD = STANDALONE_CONTAINER_MIN_HEIGHT_MD;
// Surface heights account for internal padding to prevent overflow
const STANDALONE_SURFACE_MIN_HEIGHT_XS = `calc(${STANDALONE_CONTAINER_HEIGHT_XS} - ${NAVBAR_HEIGHT + STANDALONE_TOTAL_VERTICAL_PADDING_XS}px)`;
const STANDALONE_SURFACE_MIN_HEIGHT_MD = `calc(100vh - ${DESKTOP_NAVBAR_HEIGHT + STANDALONE_TOTAL_VERTICAL_PADDING_MD}px)`;

// Simplified grid container
const StyledGridContainer = styled(Grid)`
  ${({ theme }) => `
    /* Use dynamic viewport height on supported browsers to avoid
       extra scroll space caused by mobile browser chrome.
       Use min-height so content can extend when needed. */
    min-height: 100vh;
    min-height: 100svh;
    background-color: #080808;
    padding: 0;
    margin: 0 !important;
    width: 100%;
    /* Edge-to-edge hero gradient lives inside the surface container */
    box-sizing: border-box;
  `}
`;

FullScreenSearch.propTypes = searchPropTypes;

// Theme Defaults
const defaultTitleText = 'memeSRC';
const defaultBragText = 'Search 85 million+ templates';
const defaultFontColor = '#FFFFFF';
const defaultBackground = `linear-gradient(45deg,
  #5461c8 12.5%,
  #c724b1 0, #c724b1 25%,
  #e4002b 0, #e4002b 37.5%,
  #ff6900 0, #ff6900 50%,
  #f6be00 0, #f6be00 62.5%,
  #97d700 0, #97d700 75%,
  #00ab84 0, #00ab84 87.5%,
  #00a3e0 0)`;
const defaultBackgroundColor = '#080808';

export default function FullScreenSearch({ searchTerm, setSearchTerm, seriesTitle, setSeriesTitle, searchFunction, metadata, persistSearchTerm }) {
  const { savedCids, cid, setCid, setSearchQuery: setCidSearchQuery, setShowObj } = useSearchDetailsV2()
  const { setShow, setSearchQuery } = useSearchDetails();
  const isMd = useMediaQuery((theme) => theme.breakpoints.up('sm'));
  const [addNewCidOpen, setAddNewCidOpen] = useState(false);
  const { user, shows, defaultShow, handleUpdateDefaultShow, showFeed = false } = useContext(UserContext);
  const isFeedEnabled = Boolean(showFeed);
  const { pathname } = useLocation();

  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const { loadRandomFrame, loadingRandom } = useLoadRandomFrame();
  const theme = useTheme();
  const showAd = user?.userDetails?.subscriptionStatus !== 'active';

  // Recent update indicator state
  const [latestRelease, setLatestRelease] = useState(null);
  const [dismissedVersion, setDismissedVersionState] = useState(() => getDismissedVersion());
  const visibilityAccumulatedRef = useRef(0);
  const visibilitySessionStartRef = useRef(null);
  const autoDismissTimeoutRef = useRef(null);

  const hasRecentUndismissedUpdate = useMemo(() => {
    if (!latestRelease) return false;
    if (!latestRelease.tag_name) return false;
    if (dismissedVersion === latestRelease.tag_name) return false;
    if (!latestRelease.published_at) return false;
    const published = new Date(latestRelease.published_at).getTime();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    return Date.now() - published <= threeDaysMs;
  }, [latestRelease, dismissedVersion]);

  const statusDotColor = useMemo(() => {
    if (!latestRelease) return '#22c55e';
    const isDraft = Boolean(latestRelease.draft);
    const isPrerelease = Boolean(latestRelease.prerelease);
    const type = getReleaseType(latestRelease.tag_name);
    if (isDraft) return (theme?.palette?.error?.main) || '#ef4444';
    if (isPrerelease) return (theme?.palette?.warning?.main) || '#f59e0b';
    switch (type) {
      case 'major':
        return (theme?.palette?.error?.main) || '#ef4444';
      case 'minor':
        return (theme?.palette?.success?.main) || '#22c55e';
      default:
        return (theme?.palette?.info?.main) || '#3b82f6';
    }
  }, [latestRelease, theme]);

  const releaseVisibilityStorageKey = useMemo(() => {
    if (!latestRelease?.tag_name) return null;
    return `${VISIBILITY_STORAGE_PREFIX}${latestRelease.tag_name}`;
  }, [latestRelease?.tag_name]);

  useEffect(() => {
    if (!releaseVisibilityStorageKey) {
      visibilityAccumulatedRef.current = 0;
      return;
    }
    const stored = safeGetItem(releaseVisibilityStorageKey);
    if (!stored) {
      visibilityAccumulatedRef.current = 0;
      return;
    }
    const parsed = Number.parseInt(stored, 10);
    visibilityAccumulatedRef.current = Number.isFinite(parsed) ? parsed : 0;
  }, [releaseVisibilityStorageKey]);

  const releaseLinkStyle = useMemo(
    () => ({
      color: '#bfdbfe',
      textDecoration: 'none',
      whiteSpace: isMobile ? 'normal' : 'nowrap',
      fontWeight: 600,
      display: 'inline-flex',
      gap: 4,
      alignItems: 'center'
    }),
    [isMobile]
  );

  const updateBannerSx = useMemo(
    () => ({
      width: '100%',
      maxWidth: { xs: 'min(440px, 100%)', sm: 'min(520px, 100%)' },
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: { xs: 1, sm: 1.25 },
      flexWrap: 'wrap',
      px: { xs: 1.6, sm: 2.1 },
      py: { xs: 1.05, sm: 1.15 },
      borderRadius: '16px',
      backgroundColor: 'rgba(15,23,42,0.74)',
      backdropFilter: 'blur(18px) saturate(140%)',
      color: '#e2e8f0',
      border: '1px solid rgba(148,163,184,0.18)',
      boxShadow: '0 18px 36px rgba(15,23,42,0.28)',
      pointerEvents: 'auto',
    }),
    []
  );

  useEffect(() => {
    let didCancel = false;
    const load = async () => {
      try {
        const latest = await fetchLatestRelease();
        if (!didCancel) setLatestRelease(latest);
      } catch (e) {
        // silent fail
      }
    };
    load();
    return () => { didCancel = true };
  }, []);

  const handleDismissUpdateBanner = useCallback(() => {
    if (latestRelease?.tag_name) {
      try {
        setDismissedVersion(latestRelease.tag_name);
        setDismissedVersionState(latestRelease.tag_name);
      } catch (e) {
        // no-op
      }
    }
  }, [latestRelease]);

  const persistVisibilityTime = useCallback(() => {
    if (!releaseVisibilityStorageKey) return;
    const clamped = Math.min(
      visibilityAccumulatedRef.current,
      AUTO_DISMISS_TOTAL_MS + AUTO_DISMISS_MIN_VISIBLE_MS
    );
    safeSetItem(releaseVisibilityStorageKey, String(Math.round(clamped)));
  }, [releaseVisibilityStorageKey]);

  useEffect(() => {
    if (!hasRecentUndismissedUpdate || !releaseVisibilityStorageKey) {
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
        autoDismissTimeoutRef.current = null;
      }
      if (visibilitySessionStartRef.current) {
        visibilityAccumulatedRef.current += Math.max(0, Date.now() - visibilitySessionStartRef.current);
        visibilitySessionStartRef.current = null;
        persistVisibilityTime();
      }
      return undefined;
    }

    if (typeof window === 'undefined') {
      return undefined;
    }

    visibilitySessionStartRef.current = Date.now();

    const remaining = Math.max(AUTO_DISMISS_TOTAL_MS - visibilityAccumulatedRef.current, 0);
    const delay = Math.max(remaining, AUTO_DISMISS_MIN_VISIBLE_MS);

    if (autoDismissTimeoutRef.current) {
      clearTimeout(autoDismissTimeoutRef.current);
    }
    autoDismissTimeoutRef.current = window.setTimeout(() => {
      autoDismissTimeoutRef.current = null;
      handleDismissUpdateBanner();
    }, delay);

    return () => {
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current);
        autoDismissTimeoutRef.current = null;
      }
      if (visibilitySessionStartRef.current) {
        visibilityAccumulatedRef.current += Math.max(0, Date.now() - visibilitySessionStartRef.current);
        visibilitySessionStartRef.current = null;
        persistVisibilityTime();
      }
    };
  }, [hasRecentUndismissedUpdate, handleDismissUpdateBanner, persistVisibilityTime, releaseVisibilityStorageKey]);

  // Scroll to top when arriving at this page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [])

  // Theme States
  const [currentThemeBragText, setCurrentThemeBragText] = useState(metadata?.frameCount ? `Search over ${metadata?.frameCount.toLocaleString('en-US')} meme templates from ${metadata?.title}` : defaultBragText);
  const [currentThemeTitleText, setCurrentThemeTitleText] = useState(metadata?.title || defaultTitleText);
  const [currentThemeFontFamily, setCurrentThemeFontFamily] = useState(metadata?.fontFamily || theme?.typography?.fontFamily);
  const [currentThemeFontColor, setCurrentThemeFontColor] = useState(metadata?.colorSecondary || defaultFontColor);
  const [currentThemeBackground, setCurrentThemeBackground] = useState(
    metadata?.colorMain
      ? { backgroundColor: `${metadata?.colorMain}` }
      : { backgroundImage: defaultBackground, backgroundColor: defaultBackgroundColor },
  );

  const { seriesId } = useParams();

  const navigate = useNavigate();

  // The handleChangeSeries function now only handles theme updates
  const handleChangeSeries = useCallback(
    (newSeriesTitle) => {
      const selectedSeriesProperties =
        shows.find((object) => object.id === newSeriesTitle) || savedCids?.find((object) => object.id === newSeriesTitle);
      if (!selectedSeriesProperties) {
        navigate('/');
      }
    },
    [shows, savedCids, navigate]
  );

  // This useEffect ensures the theme is applied based on the seriesId once the data is loaded
  useEffect(() => {
    // Check if shows have been loaded
    if (shows.length > 0) {
      // Determine the series to use based on the URL or default to '_universal'
      const currentSeriesId = seriesId || (shows.some(show => show.isFavorite) ? defaultShow : '_universal');
      setShow(currentSeriesId)

      if (currentSeriesId !== seriesTitle) {
        setSeriesTitle(currentSeriesId); // Update the series title based on the URL parameter
        handleChangeSeries(currentSeriesId); // Update the theme

        // Navigation logic
        navigate((currentSeriesId === '_universal') ? '/' : `/${currentSeriesId}`);
      }
    }
  }, [seriesId, seriesTitle, shows, handleChangeSeries, navigate, defaultShow, setSeriesTitle, setShow]);

  useEffect(() => {
    if (pathname === '/_favorites') {
      setCurrentThemeBragText(defaultBragText)
      setCurrentThemeTitleText(defaultTitleText)
      setCurrentThemeFontColor(defaultFontColor)
      setCurrentThemeFontFamily(theme?.typography?.fontFamily)
      setCurrentThemeBackground({
        backgroundImage: defaultBackground,
        backgroundColor: defaultBackgroundColor,
      })
    }
  }, [pathname, theme?.typography?.fontFamily])

  useEffect(() => {

    setCid(seriesId || metadata?.id || (shows.some(show => show.isFavorite) ? defaultShow : '_universal'))

    return () => {
      if (pathname === '/') {
        setShowObj(null)
        setSearchQuery(null)
        setCidSearchQuery('')
      }
    }
  }, [pathname, defaultShow, metadata?.id, seriesId, setCid, setCidSearchQuery, setSearchQuery, setShowObj, shows]);

  const hasFavoriteShows = useMemo(() => shows.some((s) => s.isFavorite), [shows]);

  const currentValueId = useMemo(() => {
    const fallback = cid || seriesTitle || (hasFavoriteShows ? defaultShow : '_universal');
    return fallback || '_universal';
  }, [cid, seriesTitle, hasFavoriteShows, defaultShow]);

  const includeAllFavorites = hasFavoriteShows;

  const currentSeries = useMemo(() => {
    if (!currentValueId || currentValueId.startsWith('_')) {
      return undefined;
    }
    const fromShows = Array.isArray(shows) ? shows.find((item) => item.id === currentValueId) : undefined;
    if (fromShows) {
      return fromShows;
    }
    if (Array.isArray(savedCids)) {
      return savedCids.find((item) => item.id === currentValueId);
    }
    return undefined;
  }, [currentValueId, shows, savedCids]);

  const unifiedSearchAppearance = useMemo(() => {
    const candidateColor = currentSeries?.colorSecondary || currentThemeFontColor;
    if (!candidateColor) {
      return 'light';
    }
    return isColorNearBlack(candidateColor) ? 'dark' : 'light';
  }, [currentSeries, currentThemeFontColor]);

  const handleRandomSearch = useCallback(() => {
    const scope = currentValueId || '_universal';
    trackUsageEvent('random_frame', {
      source: 'UnifiedSearchBar',
      scope,
      showCount: Array.isArray(shows) ? shows.length : 0,
      hasAd: showAd,
    });
    loadRandomFrame(scope);
  }, [currentValueId, loadRandomFrame, shows, showAd]);

  const handleSelect = useCallback(
    (selectedId) => {
      const nextId = selectedId || '_universal';
      persistSearchTerm(searchTerm);
      setCid(nextId);
      setSeriesTitle(nextId);
      handleChangeSeries(nextId);
      if (nextId === '_universal' || nextId === '_favorites') {
        handleUpdateDefaultShow(nextId);
      }
      navigate(nextId === '_universal' ? '/' : `/${nextId}`);
    },
    [handleChangeSeries, handleUpdateDefaultShow, navigate, persistSearchTerm, searchTerm, setCid, setSeriesTitle]
  );

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    persistSearchTerm('');
  }, [setSearchTerm, persistSearchTerm]);

  const handleSearchTermChange = useCallback(
    (value) => {
      let nextValue = value;
      nextValue = nextValue.replace(/[\u2018\u2019]/g, "'");
      nextValue = nextValue.replace(/[\u201C\u201D]/g, '"');
      nextValue = nextValue.replace(/[\u2013\u2014]/g, '-');
      setSearchTerm(nextValue);
    },
    [setSearchTerm],
  );

  const heroSurfaceSx = useMemo(() => {
    const base = {
      width: '100%',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      gap: { xs: 1.4, md: 1.8 },
      ...currentThemeBackground,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      borderRadius: 'inherit',
      border: 'none',
      boxShadow: 'none',
      boxSizing: 'border-box',
      flex: 1,
    };

    if (isFeedEnabled) {
      return {
        ...base,
        justifyContent: 'center',
        minHeight: { xs: MOBILE_CARD_MIN_HEIGHT, md: '100%' },
        paddingTop: { xs: 12, md: 16 },
        paddingBottom: { xs: 12, md: 16 },
      };
    }

    return {
      ...base,
      justifyContent: 'center',
      paddingTop: { xs: STANDALONE_HERO_PADDING_TOP_XS, md: STANDALONE_HERO_PADDING_TOP_MD },
      paddingBottom: { xs: STANDALONE_HERO_PADDING_BOTTOM_XS, md: STANDALONE_HERO_PADDING_BOTTOM_MD },
    };
  }, [currentThemeBackground, isFeedEnabled]);

  const heroPaperSx = useMemo(() => {
    const sharedBorderRadius = { xs: '28px', md: 4 };

    const shared = {
      borderRadius: sharedBorderRadius,
      border: '1px solid rgba(70,70,70,0.22)',
      background: 'rgba(10,10,10,0.92)',
      boxShadow: 'none',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    };

    if (isFeedEnabled) {
      return {
        ...shared,
        position: { xs: 'relative', md: 'sticky' },
        top: { md: DESKTOP_STICKY_TOP_OFFSET },
        alignSelf: { xs: 'stretch', md: 'start' },
        maxHeight: { xs: MOBILE_MAX_CARD_HEIGHT, md: DESKTOP_STICKY_HEIGHT },
        minHeight: { xs: MOBILE_CARD_MIN_HEIGHT, md: DESKTOP_STICKY_HEIGHT },
        height: { xs: 'auto', md: DESKTOP_STICKY_HEIGHT },
        boxSizing: 'border-box',
        [SHORT_VIEWPORT_MEDIA_QUERY]: {
          minHeight: 'auto',
          height: 'auto',
        },
      };
    }

    return {
      ...shared,
      position: 'relative',
      top: 0,
      alignSelf: 'stretch',
      minHeight: { xs: STANDALONE_PAPER_MIN_HEIGHT_XS, md: STANDALONE_PAPER_MIN_HEIGHT_MD },
      boxSizing: 'border-box',
      borderBottomLeftRadius: { xs: '28px', sm: 0 },
      borderBottomRightRadius: { xs: '28px', sm: 0 },
      [SHORT_VIEWPORT_MEDIA_QUERY]: {
        minHeight: 'auto',
      },
    };
  }, [isFeedEnabled]);

  const heroInnerSx = useMemo(
    () => ({
      position: 'relative',
      zIndex: 2,
      width: '100%',
      maxWidth: 'min(1040px, 100%)',
      mx: 'auto',
      px: { xs: 1.4, sm: 2.2, md: 2.6 },
      py: { xs: 0, sm: 0, md: 0 },
      mt: { xs: 1, md: 0 },
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      justifyContent: 'center',
      gap: { xs: 1.2, md: 1.8 },
    }),
    []
  );

  const heroContentSx = useMemo(
    () => ({
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: { xs: 1.4, md: 2 },
    }),
    []
  );


  return (
    <>
      <StyledGridContainer
        container
        sx={{
          minHeight: isFeedEnabled
            ? undefined
            : { xs: STANDALONE_CONTAINER_MIN_HEIGHT_XS, md: STANDALONE_CONTAINER_MIN_HEIGHT_MD },
        }}
      >
        <Box
          sx={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: isFeedEnabled
              ? {
                  xs: '1fr',
                  md: 'minmax(0, 3fr) minmax(0, 1fr)',
                }
              : { xs: '1fr' },
            gap: isFeedEnabled ? { xs: 0.25, md: 3 } : 0,
            alignItems: 'stretch',
            px: isFeedEnabled
              ? { xs: 0, sm: 2, md: 3 }
              : { xs: 0, sm: 0 },
            paddingTop: isFeedEnabled
              ? {
                  xs: `calc(${NAVBAR_HEIGHT}px - 40px)`,
                  md: `${DESKTOP_CARD_PADDING}px`,
                }
              : 0,
            paddingBottom: isFeedEnabled
              ? {
                  xs: `calc(${NAVBAR_HEIGHT}px - 48px)`,
                  md: 0,
                }
              : 0,
            minHeight: isFeedEnabled
              ? undefined
              : {
                  xs: STANDALONE_CONTAINER_MIN_HEIGHT_XS,
                  md: STANDALONE_CONTAINER_MIN_HEIGHT_MD,
                },
            backgroundColor: '#000',
          }}
        >
          <Paper elevation={0} sx={heroPaperSx}>
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 55%)',
                pointerEvents: 'none',
                display: { xs: 'block', md: 'none' },
              }}
            />
            <Box
              sx={{
                position: 'relative',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: isFeedEnabled ? 'hidden' : 'visible',
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  overflowY: isFeedEnabled ? 'hidden' : 'visible',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <Box sx={heroSurfaceSx}>
                  {latestRelease?.tag_name && (
                    <Slide
                      in={hasRecentUndismissedUpdate}
                      direction={isMobile ? 'down' : 'left'}
                      mountOnEnter
                      unmountOnExit
                      timeout={{ appear: 420, enter: 420, exit: 360 }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          top: { xs: 12, sm: 16 },
                          left: 0,
                          right: 0,
                          display: 'flex',
                          justifyContent: 'center',
                          px: { xs: 1.5, sm: 3 },
                          zIndex: 3,
                        }}
                      >
                        <Box sx={updateBannerSx}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: { xs: 1.05, sm: 1.15 },
                              minWidth: 0,
                              flex: '1 1 auto',
                            }}
                          >
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                backgroundColor: statusDotColor,
                                boxShadow: '0 0 0 3px rgba(148,163,184,0.2)',
                              }}
                            />
                            <Typography
                              variant="subtitle2"
                              component="span"
                              noWrap={!isMobile}
                              sx={{
                                fontSize: { xs: '0.95rem', sm: '0.98rem' },
                                fontWeight: 600,
                                color: '#f8fafc',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              Updated to{' '}
                              <Link to="/releases" style={releaseLinkStyle}>
                                {formatReleaseDisplay(latestRelease?.tag_name)}
                              </Link>
                            </Typography>
                          </Box>
                          <Box
                            component="span"
                            sx={{
                              px: 1,
                              py: 0.28,
                              borderRadius: '999px',
                              backgroundColor: 'rgba(148,163,184,0.16)',
                              color: 'rgba(226,232,240,0.88)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              letterSpacing: 0.5,
                              textTransform: 'uppercase',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            {formatRelativeTimeCompact(latestRelease?.published_at)}
                          </Box>
                          <IconButton
                            aria-label="Dismiss update"
                            size="small"
                            onClick={handleDismissUpdateBanner}
                            sx={{
                              color: 'rgba(226,232,240,0.72)',
                              backgroundColor: 'transparent',
                              p: 0.4,
                              transition: 'color 160ms ease, background-color 160ms ease',
                              flexShrink: 0,
                              '&:hover': {
                                color: '#f8fafc',
                                backgroundColor: 'rgba(148,163,184,0.16)',
                              },
                            }}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </Slide>
                  )}
                  <Box
                    sx={{
                      ...heroInnerSx,
                      maxWidth: 'min(960px, 100%)',
                      px: { xs: 3, sm: 5, md: 6 },
                      mt: 0,
                    }}
                  >
                      <Box
                        sx={{
                          ...heroContentSx,
                        }}
                      >
                      <Grid
                        container
                        justifyContent="center"
                        pb={isMd ? 0 : 1.4}
                        sx={{
                          flexGrow: 1,
                          alignContent: 'center',
                          rowGap: { xs: 1.2, md: 2 },
                          position: 'relative',
                        }}
                      >
                        <Grid container justifyContent="center">
                          <Grid item textAlign="center" marginBottom={0.6}>
                            <Box onClick={() => handleChangeSeries(safeGetItem(`defaultsearch${user?.sub}`) || '_universal')}>
                              <Logo
                                color={currentThemeFontColor || 'white'}
                                sx={{
                                  objectFit: 'contain',
                                  cursor: 'pointer',
                                  display: 'block',
                                  width: { xs: '92px', sm: '110px' },
                                  height: 'auto',
                                  margin: '0 auto',
                                  color: 'yellow',
                                }}
                              />
                            </Box>
                            <Typography
                              component="h1"
                              variant="h1"
                              fontSize={{ xs: 26, sm: 30, md: 32 }}
                              fontFamily={currentThemeFontFamily}
                              sx={{
                                color: currentThemeFontColor,
                                textShadow: '1px 1px 1px rgba(0, 0, 0, 0.20)',
                                display: 'grid',
                                gridTemplateColumns: { xs: '26px 1fr 26px', sm: '30px 1fr 30px' },
                                alignItems: 'center',
                                gap: 0.75,
                                lineHeight: 1.1,
                              }}
                            >
                              {cid && cid !== '_universal' && cid !== '_favorites' && shows.length > 0 ? (
                                <FavoriteToggle
                                  indexId={cid}
                                  initialIsFavorite={shows.find((singleShow) => singleShow.id === cid)?.isFavorite || false}
                                />
                              ) : (
                                <span />
                              )}
                              {`${currentThemeTitleText} ${currentThemeTitleText === 'memeSRC' ? (user?.userDetails?.magicSubscription === 'true' ? 'Pro' : '') : ''}`}
                              <span />
                            </Typography>
                          </Grid>
                        </Grid>
                        <Grid container justifyContent="center">
                          <Grid item xs={12}>
                            <UnifiedSearchBar
                              value={searchTerm}
                              onValueChange={handleSearchTermChange}
                              onSubmit={(event) => searchFunction(event)}
                              onClear={handleClearSearch}
                              onRandom={handleRandomSearch}
                              isRandomLoading={loadingRandom}
                              shows={shows}
                              savedCids={savedCids}
                              currentValueId={currentValueId}
                              includeAllFavorites={includeAllFavorites}
                              onSelectSeries={handleSelect}
                              appearance={unifiedSearchAppearance}
                            />
                          </Grid>
                        </Grid>
                        <Grid item xs={12} textAlign="center" color={currentThemeFontColor} marginBottom={0.8} marginTop={0.4}>
                          <Typography component="h2" variant="h4" sx={{ fontSize: { xs: '1.05rem', sm: '1.25rem', md: '1.35rem' }, fontWeight: 700 }}>
                            {currentThemeBragText}
                          </Typography>
                        </Grid>
                        {showAd && (
                          <Grid item xs={12} mt={1}>
                            <center>
                              <Box>
                                {isMobile ? <FixedMobileBannerAd /> : <HomePageBannerAd />}
                                <Link to="/pro" style={{ textDecoration: 'none' }}>
                                  <Typography variant="body2" textAlign="center" sx={{ marginTop: 1, color: currentThemeFontColor }}>
                                    ☝️ Remove ads with <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>memeSRC Pro</span>
                                  </Typography>
                                </Link>
                              </Box>
                            </center>
                          </Grid>
                        )}
                      </Grid>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 3,
                px: { xs: 3, md: 6 },
                pb: { xs: 2.5, md: 3.5 },
                pointerEvents: 'none',
                '& *': {
                  pointerEvents: 'auto',
                },
              }}
            >
              <FloatingActionButtons
                shows={currentValueId || '_universal'}
                showAd={showAd}
                variant="inline"
              />
            </Box>
          </Paper>

          {isFeedEnabled && (
            <FeedSection />
          )}
        </Box>
      </StyledGridContainer>
      <AddCidPopup open={addNewCidOpen} setOpen={setAddNewCidOpen} />
    </>
  );
}

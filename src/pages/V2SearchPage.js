// V2SearchPage.js

import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react';
import { Grid, CircularProgress, Card, Chip, Typography, Button, Dialog, DialogContent, DialogActions, Box, CardContent, TextField, Link as MuiLink, Collapse, Container } from '@mui/material';
import styled from '@emotion/styled';
import { API, graphqlOperation } from 'aws-amplify';
import { Link, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@emotion/react';
import sanitizeHtml from 'sanitize-html';
import useSearchDetailsV2 from '../hooks/useSearchDetailsV2';
import { useSearchFilterGroups } from '../hooks/useSearchFilterGroups';
import { UserContext } from '../UserContext';

import { getWebsiteSetting } from '../graphql/queries';

import ImageSkeleton from '../components/ImageSkeleton.tsx';
import SearchPageResultsAd from '../ads/SearchPageResultsAd';
import FixedMobileBannerAd from '../ads/FixedMobileBannerAd';
import HomePageBannerAd from '../ads/HomePageBannerAd';
import { useTrackImageSaveIntent } from '../hooks/useTrackImageSaveIntent';
import Page404 from './Page404';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const ADVANCED_SYNTAX_TIPS = [
  {
    title: 'Exact phrases',
    description: 'Wrap words in double quotes to search for the exact line.',
    example: '"surely you can\'t be serious"',
  },
  {
    title: 'Operators',
    description: 'Use OR for choices. Use + for strict requirements (better than AND).',
    example: '(shirley +serious) OR "movies about gladiators"',
  },
  {
    title: 'Group logic',
    description: 'Parentheses control the order when mixing operators.',
    example: '(shirley OR serious) +cockpit',
  },
  {
    title: 'Require or exclude',
    description: 'Prefix a word with + to require it, or - to exclude it entirely.',
    example: '"+shirley" -serious',
  },
  {
    title: 'Target fields',
    description: 'Focus on seasons or episodes using field filters.',
    example: 'season:1 AND episode:1 AND "cockpit"',
  },
  {
    title: 'Wildcards',
    description: 'Use * and ? to cover unknown endings or characters.',
    example: 'shir* OR ser?ous',
  },
];



const StyledCard = styled(Card)`
  border: 3px solid transparent;
  box-sizing: border-box;
  position: relative;

  &:hover {
    border: 3px solid orange;
  }
`;

const StyledCardVideoContainer = styled.div`
  width: 100%;
  height: 0;
  padding-bottom: 56.25%;
  overflow: hidden;
  position: relative;
  background-color: black;
`;

const StyledCardImageContainer = styled.div`
  width: 100%;
  height: 0;
  padding-bottom: 56.25%;
  overflow: hidden;
  position: relative;
  background-color: black;
`;

const StyledCardImage = styled.img`
  width: 100%;
  height: 100%;
  position: absolute;
  object-fit: contain;
`;

const StyledCardMedia = styled.video`
  width: 100%;
  height: 100%;
  position: absolute;
  object-fit: contain;
`;

const BottomCardCaption = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  ${props => props.theme.breakpoints.up("xs")} {
    font-size: clamp(1em, 1.5vw, 1.5em);
    }
  ${props => props.theme.breakpoints.up("md")} {
  font-size: clamp(1em, 1.5vw, 1.5em);
  }
  font-weight: 800;
  padding: 18px 10px;
  text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;
`;

const BottomCardLabel = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 3px 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${props => props.theme.palette.common.white};
  text-align: left;
`;

const normalizeShortcutText = (input = '') =>
  String(input ?? '')
    .toLowerCase()
    .trim()
    .replace(/^the\s+/, '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

const buildShortcutTokens = (...values) => {
  const tokens = [];
  values.forEach((value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        const normalized = normalizeShortcutText(item);
        if (normalized) tokens.push(normalized);
      });
      return;
    }
    const normalized = normalizeShortcutText(value);
    if (normalized) tokens.push(normalized);
  });
  return Array.from(new Set(tokens));
};

const evaluateShortcutScore = (tokens, query) => {
  if (!Array.isArray(tokens) || tokens.length === 0) return Number.POSITIVE_INFINITY;
  const normalizedQuery = normalizeShortcutText(query);
  if (!normalizedQuery) return Number.POSITIVE_INFINITY;
  let best = Number.POSITIVE_INFINITY;
  tokens.forEach((token) => {
    if (!token) return;
    if (token === normalizedQuery) {
      best = Math.min(best, 0);
      return;
    }
    if (token.startsWith(normalizedQuery)) {
      best = Math.min(best, 1);
      return;
    }
    const index = token.indexOf(normalizedQuery);
    if (index >= 0) {
      best = Math.min(best, 2 + index / 100);
    }
  });
  return best;
};

const buildScopeShortcutOptions = (shows = [], groups = [], includeAllFavorites = false) => {
  const map = new Map();

  const upsert = (option) => {
    if (!option?.id || !option?.primary) return;
    map.set(option.id, option);
  };

  shows.forEach((show) => {
    if (!show?.id) return;
    const label = show.title || show.name;
    if (!label) return;
    upsert({
      id: show.id,
      primary: label,
      secondary: 'Show',
      emoji: show.emoji?.trim(),
      tokens: buildShortcutTokens(label, show.name, show.id, show.slug, show.cleanTitle),
      rank: 3,
    });
  });

  groups.forEach((group) => {
    if (!group?.id) return;
    const label = group.name;
    if (!label) return;
    let parsed = {};
    try {
      parsed = JSON.parse(group.filters || '{}');
    } catch {
      parsed = {};
    }
    upsert({
      id: group.id,
      primary: label,
      secondary: 'Custom filter',
      emoji: parsed.emoji || '📁',
      // Only allow direct filter names/ids to match mentions so internal raw indexes do not trigger suggestions.
      tokens: buildShortcutTokens(label, group.id),
      rank: 2,
    });
  });

  if (includeAllFavorites) {
    upsert({
      id: '_favorites',
      primary: 'All Favorites',
      secondary: 'Every saved favorite quote',
      emoji: '⭐',
      tokens: buildShortcutTokens('favorites', 'favorite', 'fav', 'all favorites'),
      rank: 1,
    });
  }

  upsert({
    id: '_universal',
    primary: 'All Shows & Movies',
    secondary: 'Entire catalog',
    emoji: '🌈',
    tokens: buildShortcutTokens('all', 'everything', 'universal', 'movies', 'shows'),
    rank: 0,
  });

  return Array.from(map.values()).sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.primary.localeCompare(b.primary);
  });
};

const MENTION_RESULT_LIMIT = 6;

const SearchResultMedia = ({
  result,
  resultId,
  resultIndex,
  searchTerm,
  mediaSrc,
  isMediaLoaded,
  onMediaLoad,
  addVideoRef,
  animationsEnabled,
}) => {
  const frameCandidate = Number.isFinite(Number(result?.start_frame)) && Number.isFinite(Number(result?.end_frame))
    ? Math.round(((Number(result.start_frame) + Number(result.end_frame)) / 2) / 10) * 10
    : undefined;

  const saveIntentMeta = useMemo(() => {
    const meta = {
      source: 'V2SearchPage',
      intentTarget: 'SearchResultThumbnail',
      position: resultIndex,
      resultId,
    };

    if (result?.cid) {
      meta.cid = result.cid;
    }

    if (result?.season) {
      meta.season = result.season;
    }

    if (result?.episode) {
      meta.episode = result.episode;
    }

    if (typeof frameCandidate === 'number' && Number.isFinite(frameCandidate)) {
      meta.frame = frameCandidate;
    }

    if (typeof searchTerm === 'string' && searchTerm.length > 0) {
      meta.searchTerm = searchTerm;
    }

    return meta;
  }, [frameCandidate, result, resultId, resultIndex, searchTerm]);

  const saveIntentHandlers = useTrackImageSaveIntent(saveIntentMeta);

  if (animationsEnabled) {
    return (
      <StyledCardVideoContainer>
        {!isMediaLoaded && <ImageSkeleton />}
        <StyledCardMedia
          ref={addVideoRef}
          src={mediaSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onError={() => console.error('Error loading video:', JSON.stringify(result))}
          key={`${resultId}-video`}
          style={{ display: isMediaLoaded ? 'block' : 'none' }}
          onLoad={onMediaLoad}
          {...saveIntentHandlers}
        />
      </StyledCardVideoContainer>
    );
  }

  return (
    <StyledCardImageContainer>
      {!isMediaLoaded && <ImageSkeleton />}
      <StyledCardImage
        src={mediaSrc}
        alt={`Frame from S${result?.season} E${result?.episode}`}
        key={`${resultId}-image`}
        style={{ display: isMediaLoaded ? 'block' : 'none' }}
        onLoad={onMediaLoad}
        draggable
        {...saveIntentHandlers}
      />
    </StyledCardImageContainer>
  );
};

export default function SearchPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const params = useParams();
  const location = useLocation();

  const { user, shows } = useContext(UserContext);

  const RESULTS_PER_PAGE = 8;

  // ===== Upgraded Index Banner States ===== 
  const [animationsEnabled] = useState(false);
  // const [animationsEnabled, setAnimationsEnabled] = useState(
  //   localStorage.getItem('animationsEnabled') === 'true' || false
  // );
  // ===== ===== ===== ===== ===== ===== ===== 

  const [universalSearchMaintenance, setUniversalSearchMaintenance] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [availableShows, setAvailableShows] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [displayedResults, setDisplayedResults] = useState(RESULTS_PER_PAGE / 2);
  const [newResults, setNewResults] = useState();
  const hasResults = Array.isArray(newResults) && newResults.length > 0;
  const { setShowObj, cid } = useSearchDetailsV2();
  const { groups, fetchGroups } = useSearchFilterGroups();
  const [loadingResults, setLoadingResults] = useState(true);
  const [videoUrls, setVideoUrls] = useState({});
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('searchTerm');
  const paramsCid = params?.cid;
  const resolvedCid = paramsCid || cid;
  const favoritesForSearch = resolvedCid === '_favorites' ? shows : null;
  const locationKey = location.key;
  const encodedSearchQuery = useMemo(
    () => (searchQuery ? encodeURIComponent(searchQuery) : ''),
    [searchQuery],
  );
  const normalizedSearchTerm = useMemo(
    () => (typeof searchQuery === 'string' ? searchQuery.trim() : ''),
    [searchQuery],
  );
  const hasSearchQuery = normalizedSearchTerm.length > 0;
  const searchScopeInfo = useMemo(() => {
    if (!resolvedCid || resolvedCid === '_universal') {
      return { label: 'All Shows & Movies', path: '/', emoji: '🌈' };
    }
    if (resolvedCid === '_favorites') {
      return { label: 'All Favorites', path: '/_favorites', emoji: '⭐' };
    }
    const customFilter = Array.isArray(groups) ? groups.find((group) => group.id === resolvedCid) : undefined;
    if (customFilter) {
      let emoji = '📁';
      try {
        const parsed = JSON.parse(customFilter.filters || '{}');
        if (parsed?.emoji) {
          emoji = parsed.emoji;
        }
      } catch {
        // Ignore parse errors
      }
      return {
        label: customFilter.name || 'Custom Filter',
        path: `/${customFilter.id}`,
        emoji,
      };
    }
    const showMatch = Array.isArray(shows)
      ? shows.find((showItem) => {
        if (!showItem) {
          return false;
        }
        const identifiers = [showItem.id, showItem.slug, showItem.cid];
        return identifiers.some((identifier) => identifier && String(identifier) === resolvedCid);
      })
      : undefined;
    if (showMatch) {
      const routeSegment = String(showMatch.slug || showMatch.id || showMatch.cid || resolvedCid);
      const normalizedPath = routeSegment.startsWith('/') ? routeSegment : `/${routeSegment}`;
      return {
        label: showMatch.title || showMatch.name || resolvedCid,
        path: normalizedPath,
        emoji: showMatch.emoji,
      };
    }
    const fallbackPath = resolvedCid === '_universal' ? '/' : `/${resolvedCid}`;
    return {
      label: resolvedCid.replace(/^_/, '') || resolvedCid,
      path: fallbackPath,
    };
  }, [groups, resolvedCid, shows]);
  const scopeLabel = searchScopeInfo?.label || 'All Shows & Movies';
  const scopePath = searchScopeInfo?.path || '/';
  const scopeEmoji = searchScopeInfo?.emoji;
  const highlightTermSx = {
    color: '#ffffff',
    fontWeight: 800,
    fontSize: { xs: '1.02rem', md: '1.12rem' },
  };
  const indexLinkSx = {
    color: '#ffffff',
    fontWeight: 800,
    textDecoration: 'underline',
    textUnderlineOffset: 4,
    textDecorationThickness: 2,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.4,
    fontSize: { xs: '1.02rem', md: '1.12rem' },
  };
  const indexLinkNode = (
    <Box component="span" sx={indexLinkSx} onClick={() => navigate(scopePath)} style={{ cursor: 'pointer' }}>
      {scopeEmoji && <span style={{ fontSize: '1.2em' }}>{scopeEmoji}</span>}
      {scopeLabel}
    </Box>
  );
  const queryHighlightNode = (
    <Box component="span" sx={highlightTermSx}>
      {normalizedSearchTerm}
    </Box>
  );

  const backToHome = !resolvedCid || resolvedCid === '_universal' || resolvedCid === '_favorites';
  const backLabel = backToHome ? 'Back to Home' : `Back to ${scopeLabel}`;
  const backPath = backToHome ? '/' : scopePath;

  // Always show the back link, matching alignment of V2FramePage
  const resultsSummary = (
    <Box sx={{ width: '100%', px: { xs: 2, md: 6 } }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(backPath)}
        sx={{
          mb: 2,
          color: 'text.secondary',
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.95rem',
          '&:hover': {
            color: 'text.primary',
            backgroundColor: 'transparent',
            textDecoration: 'underline'
          }
        }}
      >
        {backLabel}
      </Button>
    </Box>
  );

  const [autoplay] = useState(true);
  const [customFilterNotFound, setCustomFilterNotFound] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const videoRefs = useRef([]);
  const latestSearchKeyRef = useRef('');
  const groupsRef = useRef(groups);

  const addVideoRef = (element) => {
    if (element && !videoRefs.current.includes(element)) {
      videoRefs.current.push(element);
    }
  };

  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  const [videoLoadedStates, setVideoLoadedStates] = useState({});

  const handleMediaLoad = (resultId) => {
    setVideoLoadedStates((prevState) => ({
      ...prevState,
      [resultId]: true,
    }));
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            if (autoplay) {
              entry.target.play();
            }
          } else {
            entry.target.pause();
          }
        });
      },
      {
        rootMargin: '0px',
        threshold: 0.1
      }
    );

    videoRefs.current.forEach(video => observer.observe(video));

    return () => {
      videoRefs.current.forEach(video => observer.unobserve(video));
    };
  }, [newResults, autoplay]);

  // const checkBannerDismissed = () => {
  //   const dismissedBanner = localStorage.getItem(`dismissedBanner`);
  //   if (dismissedBanner === 'true') {
  //     setIsBannerMinimized(true);
  //     setShowBanner(false);
  //   } else {
  //     setIsBannerMinimized(false);
  //     setShowBanner(true);
  //   }
  // };

  useEffect(() => {
    async function initialize(cid = null) {
      const selectedCid = cid;
      if (!selectedCid) {
        alert("Please enter a valid CID.");
        return;
      }
      setShowObj([]);

      // checkBannerDismissed(selectedCid);
    }

    async function getMaintenanceMode() {
      try {
        const response = await API.graphql({
          ...graphqlOperation(getWebsiteSetting, { id: 'globalSettings' }),
          authMode: 'API_KEY',
        });
        // console.log("setUniversalSearchMaintenance to: ", response?.data?.getWebsiteSetting?.universalSearchMaintenance);
        return response?.data?.getWebsiteSetting?.universalSearchMaintenance;
      } catch (error) {
        console.log(error);
        return false;
      }
    }

    async function fetchData() {
      const maintenance = await getMaintenanceMode();
      setUniversalSearchMaintenance(maintenance);

      if (!maintenance || params.cid !== '_universal') {
        initialize(params.cid);
      } else {
        setMaintenanceDialogOpen(true);
        // const shows = await fetchShows();
        setAvailableShows(shows);
      }
    }

    fetchData();
  }, [params.cid]);

  // useEffect(() => {
  //   if (cid) {
  //     checkBannerDismissed(cid);
  //   }
  // }, [cid]);

  useEffect(() => {
    if (newResults) {
      newResults.forEach((result) => loadVideoUrl(result, cid));
    }
  }, [animationsEnabled, newResults, cid]);

  const loadVideoUrl = async (result, metadataCid) => {
    const resultCid = result.cid || metadataCid;
    const thumbnailUrl = animationsEnabled
      ? `unsupported`
      : `https://v2-${process.env.REACT_APP_USER_BRANCH}.memesrc.com/frame/${resultCid}/${result.season}/${result.episode}/${Math.round(((parseInt(result.start_frame, 10) + parseInt(result.end_frame, 10)) / 2) / 10) * 10}`;
    const resultId = `${result.season}-${result.episode}-${result.subtitle_index}`;
    setVideoUrls((prevVideoUrls) => ({ ...prevVideoUrls, [resultId]: thumbnailUrl }));
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const resultIndex = entry.target.getAttribute("data-result-index");
            const result = newResults[resultIndex];
            const resultId = `${result.season}-${result.episode}-${result.subtitle_index}`;
            if (resultIndex && !videoUrls[resultId]) {
              loadVideoUrl(result, result);
            }
          }
        });
      },
      {
        rootMargin: "0px",
        threshold: 0.1,
      }
    );

    const resultElements = document.querySelectorAll(".result-item");
    resultElements.forEach((element) => observer.observe(element));

    return () => {
      resultElements.forEach((element) => observer.unobserve(element));
    };
  }, [newResults, videoUrls, cid]);

  const injectAds = (results, adInterval) => {
    const injectedResults = [];

    for (let i = 0; i < results.length; i += 1) {
      injectedResults.push(results[i]);

      if ((i + 1) % adInterval === 0 && i !== results.length - 1) {
        injectedResults.push({ isAd: true });
      }
    }

    return injectedResults;
  };

  useEffect(() => {
    const activeCid = resolvedCid;
    const normalizedSearch = (searchQuery || '').trim();
    const encodedSearchTerm = normalizedSearch ? encodeURIComponent(normalizedSearch) : '';
    const abortController = new AbortController();
    let isCancelled = false;
    const searchKey = `${activeCid}|${encodedSearchTerm}`;

    const searchText = async () => {
      setCustomFilterNotFound(false);

      if (!normalizedSearch) {
        latestSearchKeyRef.current = '';
        setCustomFilterNotFound(false);
        setLoadingResults(false);
        setNewResults([]);
        return;
      }

      if (!activeCid) {
        setLoadingResults(false);
        return;
      }

      if (activeCid === '_universal' && universalSearchMaintenance) {
        setLoadingResults(false);
        return;
      }

      latestSearchKeyRef.current = searchKey;

      setNewResults(null);
      setLoadingResults(true);
      setDisplayedResults(RESULTS_PER_PAGE / 2);

      let latestGroups = [];
      try {
        latestGroups = await fetchGroups({ force: true });
      } catch (err) {
        latestGroups = groupsRef.current || [];
      }

      if (isCancelled || latestSearchKeyRef.current !== searchKey) {
        return;
      }

      const customFilter = latestGroups.find((g) => g.id === activeCid);
      const isCustomFilterRequest = activeCid?.startsWith('custom_') || Boolean(customFilter);

      if (isCustomFilterRequest && !customFilter) {
        setLoadingResults(false);
        setNewResults([]);
        setCustomFilterNotFound(true);
        return;
      }

      let customFilterItems = [];
      if (customFilter) {
        try {
          const parsed = JSON.parse(customFilter.filters);
          customFilterItems = parsed.items || [];
        } catch (e) {
          console.error('Error parsing custom filter', e);
        }
      }

      let seriesToSearch;
      if (activeCid === '_favorites') {
        const favoriteShows = Array.isArray(favoritesForSearch) ? favoritesForSearch : [];
        seriesToSearch = favoriteShows.filter((show) => show.isFavorite).map((show) => show.id).join(',');
      } else if (customFilter) {
        seriesToSearch = customFilterItems.join(',');
      } else {
        seriesToSearch = activeCid;
      }

      if (isCustomFilterRequest && !seriesToSearch) {
        setLoadingResults(false);
        setNewResults([]);
        return;
      }

      try {
        const response = await fetch(
          `https://v2-${process.env.REACT_APP_USER_BRANCH}.memesrc.com/search/${seriesToSearch}/${encodedSearchTerm}`,
          { signal: abortController.signal }
        );

        if (!response.ok) {
          if (response.status === 404 && isCustomFilterRequest) {
            setCustomFilterNotFound(true);
            setLoadingResults(false);
            setNewResults([]);
            return;
          }
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const results = await response.json();
        const adInterval = user?.userDetails?.subscriptionStatus !== 'active' ? 5 : Infinity;
        const resultsWithAds = injectAds(results.results, adInterval);

        if (isCancelled || latestSearchKeyRef.current !== searchKey) {
          return;
        }

        setNewResults(resultsWithAds);
        setLoadingResults(false);
      } catch (error) {
        if (abortController.signal.aborted || isCancelled) {
          return;
        }
        console.error('Error searching:', error);
        setMaintenanceDialogOpen(true);
        setAvailableShows(shows);
        setUniversalSearchMaintenance(true);
        setLoadingResults(false);
      }
    };

    searchText();

    return () => {
      isCancelled = true;
      abortController.abort();
      latestSearchKeyRef.current = '';
    };
  }, [resolvedCid, searchQuery, universalSearchMaintenance, fetchGroups, favoritesForSearch, locationKey]);

  // useEffect(() => {
  //   console.log(newResults);
  // }, [newResults]);


  const [indexFilterQuery, setIndexFilterQuery] = useState('');
  const includeAllFavorites = useMemo(
    () => Array.isArray(shows) && shows.some((show) => show?.isFavorite),
    [shows],
  );
  const scopeShortcutOptions = useMemo(
    () => buildScopeShortcutOptions(shows || [], groups || [], includeAllFavorites),
    [shows, groups, includeAllFavorites],
  );

  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));

  const mentionState = useMemo(() => {
    if (typeof searchQuery !== 'string' || !searchQuery.includes('@')) {
      return null;
    }
    const mentionRegex = /(^|\s)@([^\s]+)/g;
    let match;
    let latest = null;
    while ((match = mentionRegex.exec(searchQuery)) !== null) {
      const matchStart = match.index;
      const matchEnd = mentionRegex.lastIndex;
      latest = {
        query: match[2],
        matchStart,
        matchEnd,
      };
    }
    return latest;
  }, [searchQuery]);

  const mentionSuggestions = useMemo(() => {
    if (!mentionState) return [];
    const normalizedQuery = normalizeShortcutText(mentionState.query);
    if (!normalizedQuery) return [];
    return scopeShortcutOptions
      .map((option) => ({
        option,
        score: evaluateShortcutScore(option.tokens, normalizedQuery),
      }))
      .filter(({ score }) => Number.isFinite(score) && score !== Number.POSITIVE_INFINITY)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        if (a.option.rank !== b.option.rank) return a.option.rank - b.option.rank;
        return a.option.primary.localeCompare(b.option.primary);
      })
      .slice(0, MENTION_RESULT_LIMIT)
      .map(({ option }) => option);
  }, [mentionState, scopeShortcutOptions]);

  const handleMentionOptionClick = useCallback(
    (option) => {
      if (!option || !mentionState) return;
      const rawSearch = searchQuery || '';
      const before = rawSearch.slice(0, mentionState.matchStart);
      const after = rawSearch.slice(mentionState.matchEnd);
      const nextSearch = `${before}${after}`.replace(/\s{2,}/g, ' ').trim();
      const searchParam = nextSearch ? `?searchTerm=${encodeURIComponent(nextSearch)}` : '';
      navigate(`/search/${option.id}${searchParam}`);
    },
    [mentionState, navigate, searchQuery],
  );

  const handleIndexFilterChange = (event) => {
    setIndexFilterQuery(event.target.value);
  };

  const filteredShows = availableShows.filter(show =>
    show.title.toLowerCase().includes(indexFilterQuery.toLowerCase())
  );
  if (customFilterNotFound) {
    return <Page404 />;
  }

  return (
    <>
      {/* Add the ad section here */}
      {user?.userDetails?.subscriptionStatus !== 'active' && (
        <Grid item xs={12} mb={3}>
          <center>
            <Box>
              {isMobile ? <FixedMobileBannerAd /> : <HomePageBannerAd />}
              <Link to="/pro" style={{ textDecoration: 'none' }}>
                <Typography variant="body2" textAlign="center" color="white" sx={{ marginTop: 1 }}>
                  ☝️ Remove ads with <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>memeSRC Pro</span>
                </Typography>
              </Link>
            </Box>
          </center>
        </Grid>
      )}

      {resultsSummary}

      {mentionSuggestions.length > 0 && (
        <Grid item xs={12} sx={{ px: { xs: 2, md: 6 }, mb: 3 }}>
          <Box
            sx={{
              borderRadius: 2,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              backdropFilter: 'blur(18px)',
              p: { xs: 1.5, md: 2 },
            }}
          >
            <Typography
              variant="overline"
              sx={{ fontWeight: 700, letterSpacing: 1.2, color: 'text.secondary' }}
            >
              Filter your results
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, mb: 1, color: 'text.secondary' }}>
              {mentionState ? `Matches for @${mentionState.query}` : 'Jump to a show or filter'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {mentionSuggestions.map((option) => (
                <Chip
                  key={option.id}
                  label={`${option.emoji ? `${option.emoji} ` : ''}${option.primary}`}
                  onClick={() => handleMentionOptionClick(option)}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.14)',
                    color: 'rgba(255, 255, 255, 0.92)',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    },
                  }}
                />
              ))}
            </Box>
          </Box>
        </Grid>
      )}

      {loadingResults ? (
        <Grid container spacing={2} alignItems="stretch" paddingX={{ xs: 2, md: 6 }} mt={1}>
          {[...Array(RESULTS_PER_PAGE)].map((_, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <StyledCard>
                <StyledCardImageContainer>
                  <ImageSkeleton />
                </StyledCardImageContainer>
              </StyledCard>
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          {newResults && newResults.length > 0 ? (
            <>
              <InfiniteScroll
                dataLength={displayedResults}
                next={() => {
                  if (!isLoading) {
                    setIsLoading(true);
                    setTimeout(() => {
                      setDisplayedResults((prevDisplayedResults) =>
                        Math.min(
                          prevDisplayedResults + RESULTS_PER_PAGE,
                          newResults.length
                        )
                      );
                      setIsLoading(false);
                    }, 1000);
                  }
                }}
                hasMore={displayedResults < newResults.length}
                loader={
                  <>
                    <Grid item xs={12} textAlign="center" mt={4}>
                      <Button
                        variant="contained"
                        color="primary"
                        sx={{
                          padding: '10px',
                          fontSize: '1rem',
                          fontWeight: 'bold',
                          borderRadius: '8px',
                          maxWidth: { xs: '90%', sm: '40%', md: '25%' },
                          margin: '0 auto',
                          px: 3,
                          py: 1.5,
                          mt: 10,
                          mb: 10,
                        }}
                        onClick={() => setDisplayedResults(displayedResults + RESULTS_PER_PAGE * 2)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <CircularProgress size={24} style={{ marginRight: '8px' }} />
                            Loading More
                          </>
                        ) : (
                          'Load More'
                        )}
                      </Button>
                    </Grid>
                  </>
                }
                scrollThreshold={0.90}
              >
                <Grid container spacing={2} alignItems="stretch" paddingX={{ xs: 2, md: 6 }}>
                  {newResults.slice(0, displayedResults).map((result, index) => {
                    const resultId = `${result.season}-${result.episode}-${result.subtitle_index}`;
                    const isMediaLoaded = videoLoadedStates[resultId] || false;
                    const sanitizedSubtitleText = sanitizeHtml(result.subtitle_text, {
                      allowedTags: [], // Allow no tags
                      allowedAttributes: {}, // Allow no attributes
                    });

                    return (
                      <Grid item xs={12} sm={6} md={3} key={index} className="result-item" data-result-index={index}>
                        {result.isAd ? (
                          <StyledCard>
                            <SearchPageResultsAd />
                          </StyledCard>
                        ) : (
                          <Link
                            to={`/frame/${result.cid}/${result.season}/${result.episode}/${Math.round(((parseInt(result.start_frame, 10) + parseInt(result.end_frame, 10)) / 2) / 10) * 10}${encodedSearchQuery ? `?searchTerm=${encodedSearchQuery}` : ''}`}
                            style={{ textDecoration: 'none' }}
                          >
                            <StyledCard>
                              <SearchResultMedia
                                result={result}
                                resultId={resultId}
                                resultIndex={index}
                                searchTerm={searchQuery}
                                mediaSrc={videoUrls[resultId]}
                                isMediaLoaded={isMediaLoaded}
                                onMediaLoad={() => handleMediaLoad(resultId)}
                                addVideoRef={addVideoRef}
                                animationsEnabled={animationsEnabled}
                              />
                              <BottomCardCaption>{sanitizedSubtitleText}</BottomCardCaption>
                              <BottomCardLabel>
                                <Chip
                                  size="small"
                                  label={result.cid}
                                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', color: 'white', fontWeight: 'bold' }}
                                />
                                <Chip
                                  size="small"
                                  label={`S${result.season} E${result.episode}`}
                                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', color: 'white', fontWeight: 'bold' }}
                                />
                              </BottomCardLabel>
                            </StyledCard>
                          </Link>
                        )}
                      </Grid>
                    );
                  })}
                </Grid>
              </InfiniteScroll>
            </>
          ) : (
            <>
              {newResults?.length <= 0 && !loadingResults && (
                <Box sx={{ width: '100%', px: { xs: 2, md: 6 }, my: 6, display: 'flex', justifyContent: 'center' }}>
                  <Box sx={{ textAlign: 'center', maxWidth: 600 }}>
                    {hasSearchQuery ? (
                      <>
                        <Typography variant="h4" fontWeight={800} sx={{ mb: 3 }}>
                          No results found
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 400, mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 1, lineHeight: 1.5 }}>
                          There are no results for
                          <Chip
                            label={normalizedSearchTerm}
                            sx={{
                              fontWeight: 800,
                              fontSize: '1rem',
                              backgroundColor: 'rgba(255, 255, 255, 0.10)',
                              color: '#fff',
                              height: 'auto',
                              py: 0.5,
                              '& .MuiChip-label': {
                                display: 'block',
                                whiteSpace: 'normal',
                                maxWidth: '100%',
                                textAlign: 'center',
                                paddingLeft: 2,
                                paddingRight: 2
                              }
                            }}
                          />
                          in
                          <Chip
                            icon={scopeEmoji ? <span style={{ fontSize: '1.1rem' }}>{scopeEmoji}</span> : undefined}
                            label={scopeLabel}
                            onClick={() => navigate(scopePath)}
                            sx={{
                              fontWeight: 800,
                              fontSize: '1rem',
                              backgroundColor: 'rgba(255, 255, 255, 0.10)',
                              color: '#fff',
                              cursor: 'pointer',
                              height: 'auto',
                              py: 0.5,
                              '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.20)',
                              },
                              '& .MuiChip-label': {
                                display: 'block',
                                whiteSpace: 'normal',
                                maxWidth: '100%',
                                textAlign: 'center',
                                paddingLeft: 2,
                                paddingRight: 2
                              }
                            }}
                          />
                        </Typography>

                        <Box sx={{ mt: 4 }}>
                          <Button
                            onClick={() => setShowTips(!showTips)}
                            startIcon={<HelpOutlineIcon />}
                            endIcon={showTips ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                            sx={{
                              color: 'rgba(255, 255, 255, 0.7)',
                              textTransform: 'none',
                              fontWeight: 600,
                              fontSize: '0.95rem',
                              '&:hover': {
                                color: '#fff',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)'
                              }
                            }}
                          >
                            Search Tips
                          </Button>

                          <Collapse in={showTips}>
                            <Box sx={{ mt: 3, p: 3, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                              <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: '#fff' }}>
                                Advanced Search Syntax
                              </Typography>
                              <Grid container spacing={2}>
                                {ADVANCED_SYNTAX_TIPS.map((tip, index) => (
                                  <Grid item xs={12} sm={6} key={index}>
                                    <Box sx={{ mb: 1 }}>
                                      <Typography variant="subtitle2" sx={{ color: '#4fc3f7', fontWeight: 700 }}>
                                        {tip.title}
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 0.5 }}>
                                        {tip.description}
                                      </Typography>
                                      <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'rgba(0,0,0,0.3)', px: 0.5, py: 0.25, borderRadius: 0.5, color: 'rgba(255,255,255,0.9)' }}>
                                        {tip.example}
                                      </Typography>
                                    </Box>
                                  </Grid>
                                ))}
                              </Grid>
                            </Box>
                          </Collapse>
                        </Box>
                      </>
                    ) : (
                      <Typography fontSize={30} fontWeight={700} textAlign="center">
                        No Results
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </>
          )}
        </>
      )}
      <Dialog open={maintenanceDialogOpen} onClose={() => setMaintenanceDialogOpen(false)} maxWidth="sm" fullWidth fullScreen={fullScreen}>
        <Box
          sx={{
            position: 'relative',
            backgroundImage: 'url("https://api-prod-minimal-v510.vercel.app/assets/images/cover/cover_7.jpg")',
            backgroundSize: 'fill',
            backgroundPosition: 'center',
            py: 4,
            px: 3,
            textAlign: 'center',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 1,
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 2 }}>
            <Typography variant="h2" sx={{ mb: 2, fontWeight: 'bold', color: 'common.white' }}>
              Let's narrow it down
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'common.white' }}>
              ⚠️ Universal Search is temporarily offline.
            </Typography>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', color: 'common.white' }}>
              Pick one or try again later
            </Typography>
          </Box>
        </Box>
        <DialogContent sx={{ pt: 4 }}>
          <TextField
            label="Type to filter..."
            variant="outlined"
            fullWidth
            value={indexFilterQuery}
            onChange={handleIndexFilterChange}
            sx={{ mb: 3 }}
          />
          <Grid container spacing={2}>
            {filteredShows.map(show => (
              <Grid item xs={12} key={show.id}>
                <Card
                  onClick={() => {
                    window.location.href = `/search/${show.cid}${encodedSearchQuery ? `?searchTerm=${encodedSearchQuery}` : ''}`;
                  }}
                  sx={{
                    backgroundColor: show.colorMain,
                    color: show.colorSecondary,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 150,
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" sx={{ mb: 1 }}>
                      {show.emoji} {show.title}
                    </Typography>
                    <Typography variant="caption">
                      {show.frameCount.toLocaleString()} frames
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/')} sx={{ color: "white" }}>Return to home</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

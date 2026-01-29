// V2SearchPage.js

import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { Grid, CircularProgress, Card, Chip, Typography, Button, Dialog, DialogContent, DialogActions, Box, CardContent, TextField, Collapse, Container } from '@mui/material';
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
import { useFilterRecommendations } from '../hooks/useFilterRecommendations';
import RecommendedFilters from '../components/RecommendedFilters';

import { getWebsiteSetting } from '../graphql/queries';

import ImageSkeleton from '../components/ImageSkeleton.tsx';
import SearchPageResultsAd from '../ads/SearchPageResultsAd';
import FixedMobileBannerAd from '../ads/FixedMobileBannerAd';
import HomePageBannerAd from '../ads/HomePageBannerAd';
import { shouldShowAds } from '../utils/adsenseLoader';
import { useTrackImageSaveIntent } from '../hooks/useTrackImageSaveIntent';
import Page404 from './Page404';
import { useSearchSettings } from '../contexts/SearchSettingsContext';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CancelIcon from '@mui/icons-material/Cancel';

const ADVANCED_SYNTAX_TIPS = [
  {
    title: 'Exact phrases',
    description: 'Wrap words in double quotes to search for the exact line.',
    example: '"surely you can\'t be serious"',
  },
  {
    title: 'Operators',
    description: 'Use OR for choices. Use + for strict requirements (better than AND).',
    example: '(surely OR shirley) AND serious',
  },
  {
    title: 'Group logic',
    description: 'Parentheses control the order when mixing operators.',
    example: '(surely OR shirley) +cockpit',
  },
  {
    title: 'Require or exclude',
    description: 'Prefix a word with + to require it, or - to exclude it entirely.',
    example: '"+shirley" -serious',
  },
  {
    title: 'Wildcards',
    description: 'Use * and ? to cover unknown endings or characters.',
    example: 'shir* OR ser?ous',
  },
  {
    title: 'Fuzzy Search',
    description: 'Use ~ to match similar terms.',
    example: 'shirley~',
  },
  {
    title: 'Proximity Search',
    description: 'Use ~N to find words within N distance.',
    example: '"surely serious"~5',
  },
  {
    title: 'Boosting',
    description: 'Use ^N to increase term relevance.',
    example: 'speak jive^5',
  },
];



const StyledCard = styled(Card)`
  box-sizing: border-box;
  position: relative;
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
  const { compactMode, setCompactMode } = useSearchSettings();
  const initialCompactModeRef = useRef(compactMode);
  const latestCompactModeRef = useRef(compactMode);

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
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const hasResults = Array.isArray(newResults) && newResults.length > 0;
  const { setShowObj, cid } = useSearchDetailsV2();
  const { groups, fetchGroups } = useSearchFilterGroups();
  const [loadingResults, setLoadingResults] = useState(true);
  const [videoUrls, setVideoUrls] = useState({});
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('searchTerm');
  const originalQuery = searchParams.get('originalQuery');
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
  const suggestionDisplay = useMemo(() => {
    if (!Array.isArray(searchSuggestions) || searchSuggestions.length === 0) {
      return null;
    }

    const hasReplacement = searchSuggestions.some((item) => item?.suggested);
    if (!hasReplacement) {
      return null;
    }

    const parts = searchSuggestions
      .map((item) => {
        const text = (item?.suggested ?? item?.original ?? '').trim();
        if (!text) {
          return null;
        }
        return {
          text,
          isSuggested: Boolean(item?.suggested),
        };
      })
      .filter(Boolean);

    if (parts.length === 0) {
      return null;
    }

    const suggestedQuery = parts.map((part) => part.text).join(' ').trim();
    if (!suggestedQuery) {
      return null;
    }

    return { parts, suggestedQuery };
  }, [searchSuggestions]);

  // Get filter recommendations based on the search query
  const recommendedFilters = useFilterRecommendations({
    query: normalizedSearchTerm,
    shows,
    customFilters: groups,
    currentValueId: resolvedCid,
    includeAllFavorites: true,
  });
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
  const backToHome = !resolvedCid || resolvedCid === '_universal' || resolvedCid === '_favorites';
  const backLabel = backToHome ? 'Back to Home' : `Back to ${scopeLabel}`;
  const backPath = backToHome ? '/' : scopePath;

  useEffect(() => {
    // Reset scroll so new searches always start at the top of the page
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [resolvedCid, searchQuery, locationKey]);

  const [autoplay] = useState(true);
  const [customFilterNotFound, setCustomFilterNotFound] = useState(false);
  const [showTips, setShowTips] = useState(false);
  useEffect(() => {
    latestCompactModeRef.current = compactMode;
  }, [compactMode]);

  // Keep the unified search bar large (not compact) on the search page and restore the previous preference on exit if unchanged.
  useEffect(() => {
    if (initialCompactModeRef.current !== false) {
      setCompactMode(false);
    }
    return () => {
      if (
        initialCompactModeRef.current !== false &&
        latestCompactModeRef.current === false
      ) {
        setCompactMode(initialCompactModeRef.current);
      }
    };
  }, [setCompactMode]);

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
      setSearchSuggestions([]);

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
        // NOTE: Search Endpoint
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
        const parsedResponse = await response.json();
        const suggestionList = Array.isArray(parsedResponse?.suggestions) ? parsedResponse.suggestions : [];
        const resultItems = Array.isArray(parsedResponse?.results)
          ? parsedResponse.results
          : Array.isArray(parsedResponse)
            ? parsedResponse
            : [];
        const adInterval = user?.userDetails?.subscriptionStatus !== 'active' ? 5 : Infinity;
        const resultsWithAds = injectAds(resultItems, adInterval);

        if (isCancelled || latestSearchKeyRef.current !== searchKey) {
          return;
        }

        setSearchSuggestions(suggestionList);
        // setSearchSuggestions([
        //   {
        //     "original": "im",
        //     "suggested": null
        //   },
        //   {
        //     "original": "not",
        //     "suggested": null
        //   },
        //   {
        //     "original": "redy",
        //     "suggested": "ready"
        //   }
        // ]);
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
        setSearchSuggestions([]);
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
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const showAds = shouldShowAds(user);

  const handleSuggestionClick = (suggestedQueryString) => {
    if (!suggestedQueryString) {
      return;
    }

    const params = new URLSearchParams();
    params.set('searchTerm', suggestedQueryString);

    if (normalizedSearchTerm) {
      params.set('originalQuery', normalizedSearchTerm);
    }

    const searchParam = params.toString();
    navigate(`/search/${resolvedCid}${searchParam ? `?${searchParam}` : ''}`);
  };

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
    <Container maxWidth="xl" disableGutters sx={{ px: { xs: 2, sm: 3, md: 6, lg: 8, xl: 12 } }}>
      {/* Add the ad section here */}
      {showAds && (
        <Box sx={{ width: '100%', mb: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {isMobile ? <FixedMobileBannerAd /> : <HomePageBannerAd />}
            <Link to="/pro" style={{ textDecoration: 'none' }}>
              <Typography variant="body2" textAlign="center" color="white" sx={{ marginTop: 1 }}>
                ☝️ Remove ads with <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>memeSRC Pro</span>
              </Typography>
            </Link>
          </Box>
        </Box>
      )}


      {originalQuery && (
        <Box sx={{ width: '100%', mb: 2 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
            {searchQuery ? (
              <>Showing results for <b>{searchQuery}</b>. </>
            ) : (
              <>Showing all results. </>
            )}
            Search instead for <Link to={`/search/${resolvedCid}?searchTerm=${encodeURIComponent(originalQuery)}`} style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'underline' }}><b>{originalQuery}</b></Link>?
          </Typography>
        </Box>
      )}

      {/*
      {suggestionDisplay && (
        <Box sx={{ width: '100%', mb: 2 }}>
          <Box
            role="button"
            tabIndex={0}
            onClick={() => handleSuggestionClick(suggestionDisplay.suggestedQuery)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleSuggestionClick(suggestionDisplay.suggestedQuery);
              }
            }}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 1,
              borderRadius: 1,
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease, border-color 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderColor: 'rgba(255,255,255,0.2)',
              },
            }}
          >
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
              Did you mean:
            </Typography>
            <Typography
              variant="body2"
              component="div"
              sx={{
                color: 'rgba(255,255,255,0.95)',
                fontWeight: 600,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 0.35,
              }}
            >
              <u>
              {suggestionDisplay.parts.map((part, idx) => (
                <React.Fragment key={`${part.text}-${idx}`}>
                  {idx > 0 && ' '}
                  <span
                    style={{
                      fontWeight: part.isSuggested ? 800 : 600,
                      fontStyle: part.isSuggested ? 'italic' : 'normal',
                    }}
                  >
                    {part.text}
                  </span>
                </React.Fragment>
              ))}
              </u>
            </Typography>
          </Box>
        </Box>
      )}
      */}

      {hasSearchQuery && recommendedFilters && recommendedFilters.length > 0 && (
        <RecommendedFilters
          recommendations={recommendedFilters}
          currentSearchQuery={searchQuery}
          currentFilterId={resolvedCid}
          userId={user?.id}
        />
      )}

      {loadingResults ? (
        <Box sx={{ py: 2 }}>
          <Grid container spacing={2} alignItems="stretch">
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
        </Box>
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
                <Box sx={{ py: 2 }}>
                  <Grid container spacing={2} alignItems="stretch">
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
                </Box>
              </InfiniteScroll>
            </>
          ) : (
            <>
              {newResults?.length <= 0 && !loadingResults && (
                <Box sx={{ width: '100%', my: 6, display: 'flex', justifyContent: 'center' }}>
                  <Box sx={{ textAlign: 'center', maxWidth: 600 }}>
                    {hasSearchQuery ? (
                      <>
                        <Typography variant="h4" fontWeight={800} sx={{ mb: 3 }}>
                          No results found
                        </Typography>
                        {/* <Typography variant="h6" sx={{ fontWeight: 400, mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 1, lineHeight: 1.5 }}>
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
                        </Typography> */}

                        {resolvedCid && resolvedCid !== '_universal' && (
                          <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                              Currently filtering to:
                            </Typography>
                            <Chip
                              icon={scopeEmoji ? <span style={{ fontSize: '1em' }}>{scopeEmoji}</span> : undefined}
                              label={scopeLabel}
                              onDelete={() => navigate(`/search/_universal?searchTerm=${encodedSearchQuery}`)}
                              deleteIcon={<CancelIcon style={{ color: 'rgba(255,255,255,0.7)' }} />}
                              sx={{
                                height: 'auto',
                                py: 0.75,
                                px: 1.5,
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                color: 'white',
                                borderRadius: 1.5,
                                border: '1px solid rgba(255,255,255,0.15)',
                                '& .MuiChip-deleteIcon': {
                                  color: 'rgba(255, 255, 255, 0.5)',
                                  fontSize: '1.1rem',
                                  '&:hover': {
                                    color: 'rgba(255, 255, 255, 0.8)'
                                  }
                                },
                                '&:hover': {
                                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                                }
                              }}
                            />
                            <Button
                              variant="text"
                              size="small"
                              onClick={() => navigate(`/search/_universal?searchTerm=${encodedSearchQuery}`)}
                              sx={{
                                color: 'rgba(255,255,255,0.6)',
                                textTransform: 'none',
                                fontWeight: 500,
                                fontSize: '0.85rem',
                                '&:hover': {
                                  color: 'rgba(255,255,255,0.9)',
                                  backgroundColor: 'transparent'
                                }
                              }}
                            >
                              Search all shows instead
                            </Button>
                          </Box>
                        )}

                        <Box sx={{ mt: 3 }}>
                          <Button
                            onClick={() => setShowTips(!showTips)}
                            startIcon={<HelpOutlineIcon sx={{ fontSize: '1rem' }} />}
                            endIcon={showTips ? <ExpandMoreIcon sx={{ fontSize: '1rem' }} /> : <ChevronRightIcon sx={{ fontSize: '1rem' }} />}
                            size="small"
                            sx={{
                              color: 'rgba(255, 255, 255, 0.5)',
                              textTransform: 'none',
                              fontWeight: 500,
                              fontSize: '0.85rem',
                              '&:hover': {
                                color: 'rgba(255, 255, 255, 0.8)',
                                backgroundColor: 'rgba(255, 255, 255, 0.03)'
                              }
                            }}
                          >
                            Advanced Search Tips
                          </Button>

                          <Collapse in={showTips}>
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.15)', borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                              <Typography variant="body2" fontWeight={600} gutterBottom sx={{ color: 'rgba(255,255,255,0.8)', mb: 1.5, fontSize: '0.9rem' }}>
                                Advanced Search Syntax
                              </Typography>
                              <Grid container spacing={1.5}>
                                {ADVANCED_SYNTAX_TIPS.map((tip, index) => (
                                  <Grid item xs={12} sm={6} key={index}>
                                    <Box>
                                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, fontSize: '0.85rem' }}>
                                        {tip.title}
                                      </Typography>
                                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', mb: 0.5, display: 'block', fontSize: '0.75rem' }}>
                                        {tip.description}
                                      </Typography>
                                      <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'rgba(0,0,0,0.25)', px: 0.75, py: 0.4, borderRadius: 0.5, color: 'rgba(255,255,255,0.85)', fontSize: '0.7rem', display: 'inline-block' }}>
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
    </Container>
  );
}

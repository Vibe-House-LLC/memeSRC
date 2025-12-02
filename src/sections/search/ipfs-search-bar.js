import { Children, cloneElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Container, Link as MuiLink, Stack, Typography } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { Link as RouterLink, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { searchPropTypes } from './SearchPropTypes';
import useSearchDetailsV2 from '../../hooks/useSearchDetailsV2';
import AddCidPopup from '../../components/ipfs/add-cid-popup';
import { UserContext } from '../../UserContext';
import { trackUsageEvent } from '../../utils/trackUsageEvent';
import UnifiedSearchBar from '../../components/search/UnifiedSearchBar';
import FixedMobileBannerAd from '../../ads/FixedMobileBannerAd';
import useLoadRandomFrame from '../../utils/loadRandomFrame';
import FloatingActionButtons from '../../components/floating-action-buttons/FloatingActionButtons';
import { useSearchFilterGroups } from '../../hooks/useSearchFilterGroups';
import { shouldShowAds } from '../../utils/adsenseLoader';
import { useAdFreeDecember } from '../../contexts/AdFreeDecemberContext';

const sanitizeSearchValue = (value) => {
  if (value === undefined || value === null) {
    return '';
  }
  let nextValue = String(value);
  nextValue = nextValue.replace(/[\u2018\u2019]/g, "'");
  nextValue = nextValue.replace(/[\u201C\u201D]/g, '"');
  nextValue = nextValue.replace(/[\u2013\u2014]/g, '-');
  return nextValue;
};

export default function IpfsSearchBar({ children, showSearchBar = true }) {
  const params = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('searchTerm');

  const { user, shows: contextShows, defaultShow } = useContext(UserContext);
  const { groups } = useSearchFilterGroups();
  const {
    searchQuery,
    setSearchQuery,
    cid,
    setCid,
    selectedFrameIndex,
    setSelectedFrameIndex,
    savedCids,
  } = useSearchDetailsV2();

  const [search, setSearch] = useState(() => sanitizeSearchValue(searchTerm));
  const latestSearchRef = useRef(search);
  const latestOriginalQueryRef = useRef(sanitizeSearchValue(searchParams.get('originalQuery')).trim());
  const [addNewCidOpen, setAddNewCidOpen] = useState(false);
  const { loadRandomFrame, loadingRandom } = useLoadRandomFrame();
  const encodedSearchQuery = useMemo(
    () => (searchQuery ? encodeURIComponent(searchQuery) : ''),
    [searchQuery],
  );

  const shows = useMemo(() => (Array.isArray(contextShows) ? contextShows : []), [contextShows]);
  const savedSeries = useMemo(() => (Array.isArray(savedCids) ? savedCids : []), [savedCids]);
  const { triggerDialog } = useAdFreeDecember();

  const hasFavoriteShows = useMemo(() => shows.some((show) => show.isFavorite), [shows]);
  const resolvedCid = useMemo(() => {
    if (cid) return cid;
    if (params?.cid) return params.cid;
    if (hasFavoriteShows) {
      return defaultShow || '_favorites';
    }
    return '_universal';
  }, [cid, defaultShow, hasFavoriteShows, params?.cid]);

  useEffect(() => {
    if (!cid) {
      const fallback = hasFavoriteShows ? params?.cid || defaultShow : params?.cid || '_universal';
      setCid(fallback);
    }
  }, [cid, defaultShow, hasFavoriteShows, params?.cid, setCid]);

  useEffect(() => {
    const normalized = sanitizeSearchValue(searchTerm);
    const normalizedOriginal = sanitizeSearchValue(searchParams.get('originalQuery'));
    latestSearchRef.current = normalized;
    latestOriginalQueryRef.current = normalizedOriginal.trim();
    setSearch(normalized);
    setSearchQuery(normalized);
  }, [searchParams, searchTerm, setSearchQuery]);

  useEffect(() => {
    latestSearchRef.current = search;
  }, [search]);

  useEffect(() => {
    setSelectedFrameIndex(undefined);
  }, [params?.subtitleIndex, setSelectedFrameIndex]);

  const buildSearchUrl = useCallback(
    (cidValue, normalizedSearch) => {
      const params = new URLSearchParams();
      const trimmedSearch = sanitizeSearchValue(normalizedSearch).trim();
      const effectiveOriginal = sanitizeSearchValue(latestOriginalQueryRef.current).trim();

      if (trimmedSearch) params.set('searchTerm', trimmedSearch);
      if (effectiveOriginal && effectiveOriginal !== trimmedSearch) {
        params.set('originalQuery', effectiveOriginal);
      }

      const searchPart = params.toString();
      return `/search/${cidValue}` + (searchPart ? `?${searchPart}` : '');
    },
    [],
  );

  const handleSelectSeries = useCallback(
    (selectedId) => {
      if (!selectedId) {
        return;
      }

      if (selectedId === 'addNewCid') {
        setAddNewCidOpen(true);
        return;
      }

      const nextCid = selectedId;
      const liveSearch = sanitizeSearchValue(latestSearchRef.current || '').trim();

      if (pathname.split('/')[1] === 'search') {
        navigate(buildSearchUrl(nextCid, liveSearch));
      }

      setCid(nextCid);
    },
    [buildSearchUrl, navigate, pathname, setCid],
  );

  const handleClearSearch = useCallback(() => {
    latestSearchRef.current = '';
    latestOriginalQueryRef.current = '';
    setSearch('');
  }, []);

  const handleSearchChange = useCallback((value) => {
    const nextValue = sanitizeSearchValue(value);
    latestSearchRef.current = nextValue;
    latestOriginalQueryRef.current = '';
    setSearch(nextValue);
  }, []);

  const handleClarifySearch = useCallback(
    ({ original, stripped }) => {
      const normalizedOriginal = sanitizeSearchValue(original).trim();
      const normalizedStripped = sanitizeSearchValue(stripped).trim();

      latestOriginalQueryRef.current = normalizedOriginal;
      latestSearchRef.current = normalizedStripped;
      setSearch(normalizedStripped);
      setSearchQuery(normalizedStripped);

      navigate(buildSearchUrl(resolvedCid, normalizedStripped));
    },
    [buildSearchUrl, navigate, resolvedCid, setSearchQuery],
  );

  const handleSubmit = useCallback(
    (event) => {
      event?.preventDefault();
      const selectedCidValue = resolvedCid;
      const normalizedSearch = sanitizeSearchValue(latestSearchRef.current).trim();
      const resolvedIndex = selectedCidValue === '_favorites'
        ? shows
            .filter((show) => show.isFavorite)
            .map((show) => show.id)
            .join(',') || '_favorites'
        : selectedCidValue;

      trackUsageEvent('search', {
        index: selectedCidValue,
        searchTerm: normalizedSearch,
        resolvedIndex,
        source: 'UnifiedSearchBar',
      });

      setSearchQuery(normalizedSearch);
      navigate(buildSearchUrl(selectedCidValue, normalizedSearch));
      return false;
    },
    [buildSearchUrl, navigate, resolvedCid, setSearchQuery, shows],
  );

  const showAd = shouldShowAds(user);

  const handleRandomSearch = useCallback(() => {
    const scope = resolvedCid || '_universal';
    trackUsageEvent('random_frame', {
      source: 'UnifiedSearchBar',
      scope,
      showCount: Array.isArray(shows) ? shows.length : 0,
      hasAd: showAd,
    });
    triggerDialog();
    loadRandomFrame(scope);
  }, [resolvedCid, loadRandomFrame, shows, showAd, triggerDialog]);

  const activeIndexInfo = useMemo(() => {
    if (!resolvedCid) {
      return null;
    }

    if (resolvedCid === '_universal') {
      return {
        label: 'All Shows & Movies',
        emoji: '🌈',
        path: '/',
      };
    }

    if (resolvedCid === '_favorites') {
      return {
        label: 'All Favorites',
        emoji: '⭐',
        path: '/_favorites',
      };
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
        // no-op
      }
      return {
        label: customFilter.name || 'Custom Filter',
        emoji,
        path: `/${customFilter.id}`,
      };
    }

    const showList = Array.isArray(shows) ? shows : [];
    const showMatch = showList.find((showItem) => {
      if (!showItem) {
        return false;
      }
      const candidates = [showItem.id, showItem.slug, showItem.cid];
      return candidates.some((candidate) => candidate && String(candidate) === resolvedCid);
    });

    if (showMatch) {
      const routeSegment = String(showMatch.slug || showMatch.id || showMatch.cid || resolvedCid);
      const normalizedPath = routeSegment.startsWith('/') ? routeSegment : `/${routeSegment}`;
      return {
        label: showMatch.title || showMatch.name || resolvedCid,
        emoji: showMatch.emoji,
        path: normalizedPath,
      };
    }

    const fallbackPath = resolvedCid === '_universal' ? '/' : `/${resolvedCid}`;
    return {
      label: resolvedCid.replace(/^_/, '') || resolvedCid,
      path: fallbackPath,
    };
  }, [resolvedCid, groups, shows]);

  const backTargetInfo = useMemo(() => {
    if (activeIndexInfo?.path) {
      return activeIndexInfo;
    }
    return {
      label: 'Home',
      emoji: null,
      path: '/',
    };
  }, [activeIndexInfo]);

  return (
    <>
      {showSearchBar && (
        <Box component="header" sx={{ width: '100%', zIndex: 1000, pb: 2 }}>
          <Container
            maxWidth="xl"
            disableGutters
            sx={{
              px: { xs: 2, sm: 3, md: 6, lg: 8, xl: 12 },
              pt: { xs: 2, sm: 3 },
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            <UnifiedSearchBar
              value={search}
              onValueChange={handleSearchChange}
              onSubmit={handleSubmit}
              onClear={handleClearSearch}
              onRandom={handleRandomSearch}
              isRandomLoading={loadingRandom}
              shows={shows}
              savedCids={savedSeries}
              currentValueId={resolvedCid}
              includeAllFavorites={hasFavoriteShows}
              onSelectSeries={handleSelectSeries}
              appearance="dark"
              onClarifySearch={handleClarifySearch}
            />
          </Container>
        </Box>
      )}

      {pathname.startsWith('/frame') && (
        <Container maxWidth="xl" disableGutters sx={{ px: { xs: 2, sm: 3, md: 6, lg: 8, xl: 12 } }}>
          <Box sx={{ width: '100%' }}>
            <MuiLink
              component={RouterLink}
              to={searchQuery
                ? `/search/${resolvedCid}${encodedSearchQuery ? `?searchTerm=${encodedSearchQuery}` : ''}`
                : '/'}
              sx={{
                color: 'white',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              <Stack direction="row" alignItems="center">
                <ArrowBack fontSize="small" />
                <Typography variant="body1" ml={1}>
                  Back to {searchQuery ? 'search results' : 'home'}
                </Typography>
              </Stack>
            </MuiLink>
          </Box>
          <Typography variant="h2" mt={1}>
            {savedSeries
              ? `${
                  shows.find((obj) => obj.id === params?.cid)?.emoji
                    || savedSeries.find((obj) => obj.id === params?.cid)?.emoji
                    || ''
                } ${
                  shows.find((obj) => obj.id === params?.cid)?.title
                    || savedSeries.find((obj) => obj.id === params?.cid)?.title
                    || ''
                }`
              : ''}
          </Typography>
        </Container>
      )}

      {pathname.startsWith('/editor') && (
        <Container maxWidth="xl" disableGutters sx={{ px: { xs: 2, sm: 3, md: 6, lg: 8, xl: 12 } }}>
          <Box sx={{ width: '100%' }}>
            <MuiLink
              component={RouterLink}
              to={`/frame/${params?.cid}/${params?.season}/${params?.episode}/${params?.frame}${
                selectedFrameIndex ? `/${selectedFrameIndex}` : ''
              }${encodedSearchQuery ? `?searchTerm=${encodedSearchQuery}` : ''}`}
              sx={{
                color: 'white',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              <Stack direction="row" alignItems="center">
                <ArrowBack fontSize="small" />
                <Typography variant="body1" ml={1}>
                  Back to frame
                </Typography>
              </Stack>
            </MuiLink>
          </Box>
        </Container>
      )}

      {Children.map(children, (child) => cloneElement(child, { shows }))}

      <FloatingActionButtons shows={resolvedCid} showAd={showAd} />

      {showAd && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'black',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1299,
          }}
        >
          <FixedMobileBannerAd />
        </Box>
      )}

      <AddCidPopup open={addNewCidOpen} setOpen={setAddNewCidOpen} />
    </>
  );
}

IpfsSearchBar.propTypes = {
  ...searchPropTypes,
  showSearchBar: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

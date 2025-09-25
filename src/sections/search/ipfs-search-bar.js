import { Children, cloneElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Box, Container, Link as MuiLink, Stack, Typography } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import { Link as RouterLink, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { searchPropTypes } from './SearchPropTypes';
import useSearchDetailsV2 from '../../hooks/useSearchDetailsV2';
import AddCidPopup from '../../components/ipfs/add-cid-popup';
import { UserContext } from '../../UserContext';
import FixedMobileBannerAd from '../../ads/FixedMobileBannerAd';
import FloatingActionButtons from '../../components/floating-action-buttons/FloatingActionButtons';
import { trackUsageEvent } from '../../utils/trackUsageEvent';
import UnifiedSearchBar from '../../components/search/UnifiedSearchBar';

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

IpfsSearchBar.propTypes = searchPropTypes;

export default function IpfsSearchBar(props) {
  const params = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get('searchTerm');

  const { user, shows: contextShows, defaultShow } = useContext(UserContext);
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
  const [addNewCidOpen, setAddNewCidOpen] = useState(false);

  const shows = useMemo(() => (Array.isArray(contextShows) ? contextShows : []), [contextShows]);
  const savedSeries = useMemo(() => (Array.isArray(savedCids) ? savedCids : []), [savedCids]);

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
    setSearch(normalized);
    setSearchQuery(normalized);
  }, [searchTerm, setSearchQuery]);

  useEffect(() => {
    setSelectedFrameIndex(undefined);
  }, [params?.subtitleIndex, setSelectedFrameIndex]);

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
      const encodedSearch = search ? `?searchTerm=${encodeURIComponent(search)}` : '';

      if (pathname.split('/')[1] === 'search') {
        navigate(`/search/${nextCid}/${encodedSearch}`);
      }

      setCid(nextCid);
    },
    [navigate, pathname, search, setCid],
  );

  const handleClearSearch = useCallback(() => {
    setSearch('');
  }, []);

  const handleSearchChange = useCallback((value) => {
    setSearch(sanitizeSearchValue(value));
  }, []);

  const handleSubmit = useCallback(
    (event) => {
      event?.preventDefault();
      const selectedCidValue = resolvedCid;
      const normalizedSearch = sanitizeSearchValue(search).trim();
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
      const encodedSearch = encodeURIComponent(search || '');
      navigate(`/search/${selectedCidValue}/?searchTerm=${encodedSearch}`);
      return false;
    },
    [navigate, resolvedCid, search, setSearchQuery, shows],
  );

  const showAd = user?.userDetails?.subscriptionStatus !== 'active';

  return (
    <>
      <Box component="header" sx={{ width: '100%', zIndex: 1000, pb: 2 }}>
        <Container
          maxWidth="xl"
          disableGutters
          sx={{
            px: { xs: 2, sm: 3, md: 4 },
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
            shows={shows}
            savedCids={savedSeries}
            currentValueId={resolvedCid}
            includeAllFavorites={hasFavoriteShows}
            onSelectSeries={handleSelectSeries}
            appearance="dark"
          />
        </Container>
      </Box>

      {pathname.startsWith('/frame') && (
        <Container maxWidth="xl" disableGutters sx={{ px: 1 }}>
          <Box sx={{ width: '100%', px: 2 }}>
            <MuiLink
              component={RouterLink}
              to={searchQuery ? `/search/${resolvedCid}${searchQuery ? `?searchTerm=${searchQuery}` : ''}` : '/'}
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
          <Typography variant="h2" mt={1} pl={2}>
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
        <Container maxWidth="xl" disableGutters sx={{ px: 1 }}>
          <Box sx={{ width: '100%', px: 2 }}>
            <MuiLink
              component={RouterLink}
              to={`/frame/${params?.cid}/${params?.season}/${params?.episode}/${params?.frame}${
                selectedFrameIndex ? `/${selectedFrameIndex}` : ''
              }${searchQuery ? `?searchTerm=${searchQuery}` : ''}`}
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

      {Children.map(props.children, (child) => cloneElement(child, { shows }))}
      <FloatingActionButtons shows={cid} showAd={showAd} />

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

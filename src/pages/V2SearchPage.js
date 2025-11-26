// V2SearchPage.js

import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { Grid, CircularProgress, Card, Chip, Typography, Button, Dialog, DialogContent, DialogActions, Box, CardContent, TextField } from '@mui/material';
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

  const [autoplay] = useState(true);
  const [customFilterNotFound, setCustomFilterNotFound] = useState(false);

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

  const handleIndexFilterChange = (event) => {
    setIndexFilterQuery(event.target.value);
  };

  const filteredShows = availableShows.filter(show =>
    show.title.toLowerCase().includes(indexFilterQuery.toLowerCase())
  );


  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));

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

      {loadingResults && (
        <Grid item xs={12} textAlign="center" mt={4}>
          <CircularProgress size={40} />
          <Typography variant="h6" mt={2}>
            Searching...
          </Typography>
        </Grid>
      )}
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
            <Typography textAlign="center" fontSize={30} fontWeight={700} my={8}>
              No Results
            </Typography>
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

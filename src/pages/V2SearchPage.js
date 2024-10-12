// V2SearchPage.js

import React, { useState, useEffect, useRef, useContext } from 'react';
import { Grid, CircularProgress, Card, Chip, Typography, Button, Collapse, IconButton, FormControlLabel, Switch, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText, DialogActions, Box, CardContent, TextField } from '@mui/material';
import styled from '@emotion/styled';
import { API, graphqlOperation } from 'aws-amplify';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import JSZip from 'jszip';
import { ReportProblem, Settings } from '@mui/icons-material';
import InfiniteScroll from 'react-infinite-scroll-component';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@emotion/react';
import sanitizeHtml from 'sanitize-html';
import HomePageBannerAd from '../ads/HomePageBannerAd';
import useSearchDetails from '../hooks/useSearchDetails';
import IpfsSearchBar from '../sections/search/ipfs-search-bar';
import useSearchDetailsV2 from '../hooks/useSearchDetailsV2';
import getV2Metadata from '../utils/getV2Metadata';

import SearchPageBannerAd from '../ads/SearchPageBannerAd';
import SearchPageResultsAd from '../ads/SearchPageResultsAd';
import { UserContext } from '../UserContext';

import fetchShows from '../utils/fetchShows';
import { getWebsiteSetting } from '../graphql/queries';

import ImageSkeleton from '../components/ImageSkeleton';



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

const UpgradedIndexBanner = styled.div`
  background-image: url('https://api-prod-minimal-v510.vercel.app/assets/images/cover/cover_3.jpg');
  background-size: cover;
  background-position: center;
  padding: ${props => props.show ? '40px 20px' : '10px'};
  text-align: center;
  position: relative;
  border-radius: 8px;
  margin: 0 20px 20px 20px;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: ${props => props.show ? '200px' : '50px'};
  transition: all 0.3s ease-in-out;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 8px;
  }
`;

const UpgradedIndexText = styled(Typography)`
  font-size: 30px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #fff;
  position: relative;
  z-index: 1;
`;

const UpgradedIndexSubtext = styled(Typography)`
  font-size: 16px;
  font-weight: 600;
  color: #E2e2e3;
  position: relative;
  z-index: 1;
  margin-bottom: 10px;
  margin-left: 10px;
  margin-right: 10px;

  a {
    color: #f0f0f0;
    text-decoration: underline;

    &:hover {
      color: #fff;
    }
  }
`;

const MinimizedBanner = styled.div`
  background-image: url('https://api-prod-minimal-v510.vercel.app/assets/images/cover/cover_3.jpg');
  background-size: cover;
  background-position: center;
  padding: 10px;
  text-align: center;
  position: relative;
  border-radius: 8px;
  margin: 0 20px 20px 20px;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50px;
  cursor: pointer;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 8px;
  }
`;

const MinimizedBannerText = styled(Typography)`
  font-size: 16px;
  font-weight: bold;
  color: #fff;
  position: relative;
  z-index: 1;
`;

export default function SearchPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  const params = useParams();

  const { user, shows } = useContext(UserContext);

  const RESULTS_PER_PAGE = 8;

  const [loadingCsv, setLoadingCsv] = useState(false);

  // ===== Upgraded Index Banner States ===== 
  const [isBannerMinimized, setIsBannerMinimized] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(false);
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
  const { showObj, setShowObj, cid } = useSearchDetailsV2();
  const [loadingResults, setLoadingResults] = useState(true);
  const [videoUrls, setVideoUrls] = useState({});
  const [showBanner, setShowBanner] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('searchTerm');

  const [autoplay, setAutoplay] = useState(true);

  const videoRefs = useRef([]);

  const addVideoRef = (element) => {
    if (element && !videoRefs.current.includes(element)) {
      videoRefs.current.push(element);
    }
  };


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
      setLoadingCsv(false);
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
    async function searchText() {
      // const shows = await fetchShows();
      setNewResults(null);
      setLoadingResults(true);
      setDisplayedResults(RESULTS_PER_PAGE / 2);
      const searchTerm = encodeURIComponent(searchQuery.trim().toLowerCase());
      if (searchTerm === "") {
        console.log("Search term is empty.");
        return;
      }

      // Block loading results when _universal is the CID and universalSearchMaintenance is true
      if (cid === '_universal' && universalSearchMaintenance) {
        setLoadingResults(false);
        return;
      }

      try {
        let seriesToSearch;
        if (cid === '_favorites' || params?.cid === '_favorites') {
          // console.log(shows)
          seriesToSearch = shows.filter(show => show.isFavorite).map(show => show.id).join(',');
        } else {
          seriesToSearch = cid || params?.cid
        }

        const response = await fetch(`https://v2-${process.env.REACT_APP_USER_BRANCH}.memesrc.com/search/${seriesToSearch}/${searchTerm}`);
        
        // const response = await fetch(`http://the-internet.herokuapp.com/status_codes/500`);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const results = await response.json();
        const adInterval = user?.userDetails?.subscriptionStatus !== 'active' ? 5 : Infinity;
        const resultsWithAds = injectAds(results.results, adInterval);
        setNewResults(resultsWithAds);
        setLoadingResults(false);
      } catch (error) {
        console.error("Error searching:", error);
        setMaintenanceDialogOpen(true);
        // const shows = await fetchShows();
        setAvailableShows(shows);
        setUniversalSearchMaintenance(true)
      }
    }

    // if (cid !== '_universal') {
    if (searchQuery) {
      searchText();
    } else {
      setLoadingResults(false);
      setNewResults([]);
    }
    // }
  }, [loadingCsv, showObj, searchQuery, cid, universalSearchMaintenance]);

  // useEffect(() => {
  //   console.log(newResults);
  // }, [newResults]);

  const ReportProblemButton = styled(IconButton)`
    top: 10px;
    right: 10px;
    color: #fff;
    z-index: 1;
  `;

  const [indexFilterQuery, setIndexFilterQuery] = useState('');

  const handleIndexFilterChange = (event) => {
    setIndexFilterQuery(event.target.value);
  };

  const filteredShows = availableShows.filter(show =>
    show.title.toLowerCase().includes(indexFilterQuery.toLowerCase())
  );

  return (
    <>
      {/* <Collapse in={showBanner}>
        <UpgradedIndexBanner show={showBanner}>
          {showBanner && (
            <>
              <UpgradedIndexText>Upgraded!</UpgradedIndexText>
              <UpgradedIndexSubtext>
                You're searching an upgraded index.{' '}
                <a href="https://forms.gle/8CETtVbwYoUmxqbi7" target="_blank" rel="noopener noreferrer">
                  Report&nbsp;a&nbsp;problem
                </a>
                .
              </UpgradedIndexSubtext>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <Button
                  variant="contained"
                  onClick={() => {
                    const newAnimationsEnabled = !animationsEnabled;
                    setAnimationsEnabled(newAnimationsEnabled);
                    localStorage.setItem('animationsEnabled', newAnimationsEnabled.toString());
                  }}
                  style={{
                    marginTop: '15px',
                    borderRadius: '20px',
                    padding: '6px 16px',
                    backgroundColor: '#fff',
                    color: '#000',
                    position: 'relative',
                    zIndex: 1,
                    '&:hover': {
                      backgroundColor: '#eee',
                    },
                  }}
                >
                  {animationsEnabled ? 'Disable Animations' : 'Enable Animations'}
                </Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    setIsBannerMinimized(true);
                    setShowBanner(false);
                    localStorage.setItem(`dismissedBanner`, 'true');
                  }}
                  style={{
                    marginTop: '15px',
                    borderRadius: '20px',
                    padding: '6px 16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    color: '#000',
                    position: 'relative',
                    zIndex: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    },
                  }}
                >
                  Minimize
                </Button>
              </div>
            </>
          )}
        </UpgradedIndexBanner>
      </Collapse>
      {!showBanner && (
        <MinimizedBanner
          onClick={() => {
            setShowBanner(true);
            setIsBannerMinimized(false);
            localStorage.removeItem(`dismissedBanner`);
          }}
        >
          <MinimizedBannerText style={{ fontWeight: 'bold' }}>You're using a V2 index!</MinimizedBannerText>
          <MinimizedBannerText
            style={{
              textDecoration: 'underline',
              fontWeight: 'normal',
              marginLeft: '10px',
            }}
          >
            Settings
          </MinimizedBannerText>
        </MinimizedBanner>
      )} */}
    {user?.userDetails?.subscriptionStatus !== 'active' && (
      <Grid item xs={12} mt={2}>
        <center>
          <Box sx={{ maxWidth: '800px', backgroundColor: 'black', borderRadius: 2, margin: 2, padding: 2 }}>
            <HomePageBannerAd />
            <Link to="/pro" sx={{ mt: 2 }} style={{ textDecoration: 'none' }}>
              <Typography variant="body2" textAlign="center" color="#696969">
                ☝️ Remove ads with <span style={{ fontWeight: 'bold', textDecoration: 'underline' }}>memeSRC Pro</span>
              </Typography>
            </Link>
          </Box>
        </center>
      </Grid>
    )}
    <Grid item xs={12} mt={2}>
      <Typography variant="h3" textAlign="center" mb={2}>
        {newResults && 
          <>
            Found <b>{newResults.filter(result => !result.isAd).length}</b> results
          </>
        }
      </Typography>
    </Grid>
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
                {/* {user?.userDetails?.subscriptionStatus !== 'active' && (
                  <Grid item xs={12} mt={2}>
                    <center>
                      <Box sx={{ maxWidth: '800px' }}>
                        <SearchPageBannerAd />
                      </Box>
                    </center>
                  </Grid>
                )} */}
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
                        to={`/frame/${result.cid}/${result.season}/${result.episode}/${Math.round(((parseInt(result.start_frame, 10) + parseInt(result.end_frame, 10)) / 2) / 10) * 10}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`}
                        style={{ textDecoration: 'none' }}
                      >
                        <StyledCard>
                          {animationsEnabled ? (
                            <StyledCardVideoContainer>
                              {!isMediaLoaded && <ImageSkeleton />}
                              <StyledCardMedia
                                ref={addVideoRef}
                                src={videoUrls[resultId]}
                                autoPlay
                                loop
                                muted
                                playsInline
                                preload="auto"
                                onError={(e) => console.error('Error loading video:', JSON.stringify(result))}
                                key={`${resultId}-video`}
                                style={{ display: isMediaLoaded ? 'block' : 'none' }}
                                onLoad={() => handleMediaLoad(resultId)}
                              />
                            </StyledCardVideoContainer>
                          ) : (
                            <StyledCardImageContainer>
                              {!isMediaLoaded && <ImageSkeleton />}
                              <StyledCardImage
                                src={videoUrls[resultId]}
                                alt={`Frame from S${result.season} E${result.episode}`}
                                key={`${resultId}-image`}
                                style={{ display: isMediaLoaded ? 'block' : 'none' }}
                                onLoad={() => handleMediaLoad(resultId)}
                              />
                            </StyledCardImageContainer>
                          )}
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
      {newResults?.length > 0 && user?.userDetails?.subscriptionStatus !== 'active' && (
            <Grid item xs={12} mt={2}>
              <center>
                <Box sx={{ maxWidth: '800px' }}>
                  <SearchPageBannerAd />
                </Box>
              </center>
            </Grid>
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
                    window.location.href = `/search/${show.cid}${searchQuery ? `?searchTerm=${searchQuery}` : ''}`;
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

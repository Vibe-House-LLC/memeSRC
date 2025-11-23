// V2SearchPage.js

import { useCustomFilters } from '../hooks/useCustomFilters';

// ... existing imports ...

export default function SearchPage() {
  // ... existing code ...

  const { getFilterById } = useCustomFilters();

  // ... existing code ...

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
        const customFilter = getFilterById(cid || params?.cid);

        if (cid === '_favorites' || params?.cid === '_favorites') {
          // console.log(shows)
          seriesToSearch = shows.filter(show => show.isFavorite).map(show => show.id).join(',');
        } else if (customFilter) {
          seriesToSearch = customFilter.items.join(',');
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


  const [indexFilterQuery, setIndexFilterQuery] = useState('');

  const handleIndexFilterChange = (event) => {
    setIndexFilterQuery(event.target.value);
  };

  const filteredShows = availableShows.filter(show =>
    show.title.toLowerCase().includes(indexFilterQuery.toLowerCase())
  );


  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));

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

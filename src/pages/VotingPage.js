import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { API, graphqlOperation } from 'aws-amplify';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  IconButton,
  CircularProgress,
  Box,
  InputAdornment,
  TextField,
  Button,
  Badge,
  styled,
  Fab,
  Stack,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { ArrowUpward, ArrowDownward, Search, Close, ThumbUp, Whatshot, Lock, NewReleasesOutlined } from '@mui/icons-material';
import FlipMove from 'react-flip-move';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LoadingButton } from '@mui/lab';
import { GridFilterAltIcon, GridSearchIcon } from '@mui/x-data-grid';
import { debounce } from 'lodash';
import { listSeries, getSeries } from '../graphql/queries';
import { UserContext } from '../UserContext';
import TvdbSearch from '../components/TvdbSearch/TvdbSearch';
import { SnackbarContext } from '../SnackbarContext';

const StyledBadge = styled(Badge)(() => ({
  '& .MuiBadge-badge': {
    padding: '0 3px',
    backgroundColor: 'rgba(0, 0, 0, 1)',
    fontWeight: 'bold',
    fontSize: '7pt',
  },
}));

const StyledFab = styled(Fab)(() => ({
  backgroundColor: 'rgba(255, 255, 255, 0.35)',
  zIndex: 0,
}));

const StyledImg = styled('img')``;

export default function VotingPage({ shows: searchableShows }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [topVotes, setTopVotes] = useState({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [votingStatus, setVotingStatus] = useState({});
  const [searchText, setSearchText] = useState('');
  const [rankMethod, setRankMethod] = useState('upvotes');
  const [timeRemaining, setTimeRemaining] = useState('');
  const [openAddRequest, setOpenAddRequest] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState();
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [displayOption, setDisplayOption] = useState(() => {
    const savedPreference = localStorage.getItem('displayOption');
    return savedPreference || 'showAll';
  });
  const { setMessage, setOpen, setSeverity } = useContext(SnackbarContext);

  // State variables
  const [seriesMetadata, setSeriesMetadata] = useState([]);
  const [voteData, setVoteData] = useState({});
  const [isSearching, setIsSearching] = useState(false);

  // Local pagination
  const itemsPerPage = 50; // Number of items to render per page
  const [currentPage, setCurrentPage] = useState(0);

  const [sortedSeriesIds, setSortedSeriesIds] = useState([]);

  const location = useLocation();

  const theme = useTheme();

  const { user } = useContext(UserContext);

  const toggleOpenAddRequest = () => {
    setOpenAddRequest(!openAddRequest);
  };

  // Add cache variables
  const seriesCache = useRef({});

  const [allSeriesData, setAllSeriesData] = useState(null); // State to store all series data

  const [loadedImages, setLoadedImages] = useState({});

  // Initialize with true to load the top list first
  const [isTopList, setIsTopList] = useState(true);

  const [originalRanks, setOriginalRanks] = useState({});

  const [fullSortedSeriesIds, setFullSortedSeriesIds] = useState([]);

  // Add this new state to track if there are more items to load
  const [hasMore, setHasMore] = useState(true);

  // Add this new state
  const [debouncedSearchText, setDebouncedSearchText] = useState('');

  // Create a debounced function
  const debouncedSetSearchText = useCallback(
    debounce((text) => {
      setDebouncedSearchText(text);
    }, 300),
    []
  );

  const handleImageLoad = (showId) => {
    setLoadedImages(prev => ({ ...prev, [showId]: true }));
  };

  useEffect(() => {
    const savedRankMethod = localStorage.getItem('rankMethod');
    if (savedRankMethod) {
      setRankMethod(savedRankMethod);
    }
  }, []);

  const safeCompareSeriesTitles = useCallback((a, b) => {
    try {
      if (!seriesCache.current) {
        console.warn('seriesCache.current is not initialized');
        return 0;
      }
      const titleA = seriesCache.current[a]?.name;
      const titleB = seriesCache.current[b]?.name;

      if (!titleA && !titleB) return 0;
      if (!titleA) return 1;
      if (!titleB) return -1;

      return titleA.replace(/^The\s+/i, '').toLowerCase().localeCompare(
        titleB.replace(/^The\s+/i, '').toLowerCase()
      );
    } catch (error) {
      console.error('Error in safeCompareSeriesTitles:', error);
      return 0;
    }
  }, []);

  const filterShows = useCallback((show) => {
    const isSearchable = searchableShows.some((searchableShow) => searchableShow.id === show.slug);
    switch (displayOption) {
      case 'hideAvailable':
        return !isSearchable;
      case 'requested':
        return isSearchable;
      default: // 'showAll'
        return true;
    }
  }, [displayOption, searchableShows]);

  const recalculateRanks = useCallback(() => {
    let currentRank = 1;
    const newRanks = {};
    const seriesToRank = fullSortedSeriesIds.map(id => seriesCache.current[id]).filter(Boolean);

    seriesToRank.forEach((show) => {
      if (filterShows(show)) {
        newRanks[show.id] = currentRank;
        currentRank += 1;
      }
    });

    setOriginalRanks(newRanks);

    setSeriesMetadata(prevMetadata =>
      prevMetadata.map(show => ({ ...show, rank: newRanks[show.id] || null }))
    );
  }, [filterShows, fullSortedSeriesIds]);

  const fetchSeriesData = useCallback(async (sortedIds, page, isLoadingMore) => {
    try {
      // Load seriesCache.current from localStorage if available and not expired
      try {
        const cachedSeriesDataString = localStorage.getItem('seriesCache');
        if (cachedSeriesDataString) {
          const cachedSeriesData = JSON.parse(cachedSeriesDataString);
          const updatedAt = new Date(cachedSeriesData.updatedAt);
          const now = new Date();
          const diffInMinutes = (now - updatedAt) / (1000 * 60);
          if (diffInMinutes < 15) {
            // Use cached data
            seriesCache.current = cachedSeriesData.data;
          } else {
            // Remove expired cache
            localStorage.removeItem('seriesCache');
          }
        }
      } catch (error) {
        console.error('Error loading series data from localStorage:', error);
      }

      const startIdx = page * itemsPerPage;
      const endIdx = startIdx + itemsPerPage;
      const paginatedSeriesIds = sortedIds.slice(startIdx, endIdx);

      // Create placeholder data for all series in this page
      const placeholderSeriesData = paginatedSeriesIds.map(id => ({
        id,
        name: 'Loading...',
        description: 'Loading description...',
        image: '',
        rank: null
      }));

      // Update seriesMetadata immediately with placeholder data
      setSeriesMetadata((prevSeriesMetadata) => {
        if (isLoadingMore) {
          return [...prevSeriesMetadata, ...placeholderSeriesData];
        }
        return [...placeholderSeriesData];
      });

      // Check cache for available series data
      const cachedSeriesData = paginatedSeriesIds
        .filter(id => seriesCache.current[id])
        .map(id => seriesCache.current[id]);

      const idsToFetch = paginatedSeriesIds.filter(id => !seriesCache.current[id]);

      // Fetch series metadata for the IDs not in cache
      if (idsToFetch.length > 0) {
        const seriesDataPromises = idsToFetch.map((id) =>
          API.graphql({
            ...graphqlOperation(getSeries, { id }),
            authMode: 'API_KEY',
          })
        );

        const seriesDataResponses = await Promise.all(seriesDataPromises);
        const fetchedSeriesData = seriesDataResponses.map(
          (response) => response.data.getSeries
        );

        // Add fetched data to cache
        fetchedSeriesData.forEach((data) => {
          seriesCache.current[data.id] = data;
        });

        // Save seriesCache.current to localStorage
        try {
          const now = new Date();
          const cacheData = {
            updatedAt: now.toISOString(),
            data: seriesCache.current,
          };
          localStorage.setItem('seriesCache', JSON.stringify(cacheData));
        } catch (error) {
          console.error('Error saving series data to localStorage:', error);
        }

        cachedSeriesData.push(...fetchedSeriesData);
      }

      // Update seriesMetadata with actual data
      setSeriesMetadata((prevSeriesMetadata) => {
        const updatedMetadata = [...prevSeriesMetadata];
        cachedSeriesData.forEach((show) => {
          const index = updatedMetadata.findIndex(item => item.id === show.id);
          if (index !== -1) {
            updatedMetadata[index] = { ...show, rank: null };
          }
        });
        return updatedMetadata;
      });

      // Recalculate ranks after fetching data
      recalculateRanks();

      // Update hasMore based on whether there are more items
      setHasMore(endIdx < sortedIds.length);

    } catch (error) {
      console.error('Error fetching series data:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [itemsPerPage, recalculateRanks]);

  const fetchVoteData = useCallback(
    async (currentRankMethod) => {
      try {
        // Determine the API endpoint based on the rankMethod
        const apiEndpoint =
          currentRankMethod === 'upvotes'
            ? '/vote/new/top/upvotes'
            : '/vote/new/top/battleground';

        // Fetch top votes from the new endpoint
        const topVotesResponse = await API.get('publicapi', apiEndpoint);
        const topVotesData = JSON.parse(topVotesResponse);
        setTopVotes(topVotesData);

        // Create voteData object from topVotes
        const newVoteData = {};
        topVotesData.forEach((item) => {
          newVoteData[item.seriesId] = {
            totalVotesUp: item.upvotes,
            totalVotesDown: item.downvotes,
            ableToVote: true,
            userVotesUp: 0,
            userVotesDown: 0,
            lastVoteTime: null,
          };
        });

        // Fetch user-specific votes if user is logged in
        if (user) {
          const seriesIds = topVotesData.map(item => item.seriesId);
          const userVotesResponse = await API.post('publicapi', '/vote/new/user', {
            body: { seriesIds }
          });
          const userVotesData = JSON.parse(userVotesResponse);

          userVotesData.forEach((item) => {
            const seriesId = item.seriesId;
            if (newVoteData[seriesId]) {
              newVoteData[seriesId].userVotesUp = item.upvotes || 0;
              newVoteData[seriesId].userVotesDown = item.downvotes || 0;
              newVoteData[seriesId].lastVoteTime = item.lastVoteTime;
              
              // Calculate if the user is able to vote based on lastVoteTime
              const lastVoteDate = new Date(item.lastVoteTime);
              const now = new Date();
              const hoursSinceLastVote = (now - lastVoteDate) / (1000 * 60 * 60);
              newVoteData[seriesId].ableToVote = hoursSinceLastVote >= 24;
            }
          });
        }

        setVoteData(newVoteData);

        // Sort the series IDs based on the top votes
        const newSortedSeriesIds = topVotesData.map((item) => item.seriesId);

        // Update the sortedSeriesIds state
        setFullSortedSeriesIds(newSortedSeriesIds);
        setSortedSeriesIds(newSortedSeriesIds);

        // Fetch only the initial page
        fetchSeriesData(newSortedSeriesIds, 0, false);
      } catch (error) {
        console.error('Error in fetchVoteData:', error);
      }
    },
    [user, fetchSeriesData]
  );

  const filterAndSortSeriesData = useCallback((data = allSeriesData) => {
    try {
      if (!data) return;

      const searchFilteredShows = data.filter(
        (show) => show.name.toLowerCase().includes(searchText.toLowerCase())
      );

      const sortedShows = [...searchFilteredShows];

      if (sortedShows.length > 0) {
        switch (rankMethod) {
          case 'combined':
            sortedShows.sort((a, b) => {
              const voteDiffA = (voteData[a.id]?.totalVotesUp || 0) - (voteData[a.id]?.totalVotesDown || 0);
              const voteDiffB = (voteData[b.id]?.totalVotesUp || 0) - (voteData[b.id]?.totalVotesDown || 0);
              return voteDiffB - voteDiffA || safeCompareSeriesTitles(a.id, b.id);
            });
            break;
          case 'downvotes':
            sortedShows.sort((a, b) => {
              const downvoteDiff = (voteData[b.id]?.totalVotesDown || 0) - (voteData[a.id]?.totalVotesDown || 0);
              return downvoteDiff || safeCompareSeriesTitles(a.id, b.id);
            });
            break;
          default: // Upvotes
            sortedShows.sort((a, b) => {
              const upvoteDiff = (voteData[b.id]?.totalVotesUp || 0) - (voteData[a.id]?.totalVotesUp || 0);
              return upvoteDiff || safeCompareSeriesTitles(a.id, b.id);
            });
        }
      }

      setCurrentPage(0);

      // Update seriesMetadata with existing ranks
      setSeriesMetadata(sortedShows.map(show => ({ ...show, rank: originalRanks[show.id] || null })));
    } catch (error) {
      console.error('Error in filterAndSortSeriesData:', error);
      setSeriesMetadata([]);
    }
  }, [allSeriesData, searchText, rankMethod, voteData, originalRanks, safeCompareSeriesTitles]);

  const fetchAllSeriesData = useCallback(async () => {
    setLoading(true);
    try {
      const fetchSeries = async (nextToken = null, accumulatedItems = []) => {
        const result = await API.graphql({
          ...graphqlOperation(listSeries, { nextToken, limit: 1000 }),
          authMode: 'API_KEY',
        });
        const items = accumulatedItems.concat(result.data.listSeries.items);
        if (result.data.listSeries.nextToken) {
          return fetchSeries(result.data.listSeries.nextToken, items);
        }
        return items;
      };

      const fetchedSeriesData = await fetchSeries();

      // Add all series to cache
      fetchedSeriesData.forEach((show) => {
        seriesCache.current[show.id] = show;
      });

      setAllSeriesData(fetchedSeriesData);
      filterAndSortSeriesData(fetchedSeriesData);
    } catch (error) {
      console.error('Error fetching all series data:', error);
    } finally {
      setLoading(false);
    }
  }, [filterAndSortSeriesData]);

  // Modify the handleSearchChange function
  const handleSearchChange = (event) => {
    const newSearchText = event.target.value;
    setSearchText(newSearchText);
    debouncedSetSearchText(newSearchText);
  };

  // Modify the useEffect that triggers the search
  useEffect(() => {
    if (debouncedSearchText) {
      setIsSearching(true);
      if (allSeriesData === null) {
        fetchAllSeriesData();
      } else {
        filterAndSortSeriesData(allSeriesData);
      }
    } else {
      setIsSearching(false);
      setSeriesMetadata([]);
      setSortedSeriesIds([]);
      setCurrentPage(0);
      fetchVoteData(rankMethod);
    }
  }, [debouncedSearchText, rankMethod, isTopList, allSeriesData]);

  useEffect(() => {
    if (!loading && seriesMetadata.length > 0) {
      recalculateRanks();
    }
  }, [loading, seriesMetadata.length, recalculateRanks]);

  useEffect(() => {
    let timer;
    if (fullSortedSeriesIds.length > 0) {
      timer = setTimeout(() => {
        recalculateRanks();
      }, 1500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [fullSortedSeriesIds, recalculateRanks]);

  useEffect(() => {
    recalculateRanks();
  }, [rankMethod, recalculateRanks]);

  // Modify the handleLoadMore function
  const handleLoadMore = () => {
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchSeriesData(sortedSeriesIds, nextPage, true);
  };

  const handleVote = async (seriesId, boost) => {
    setVotingStatus((prevStatus) => ({ ...prevStatus, [seriesId]: boost }));

    try {
      await API.post('publicapi', '/vote', {
        body: {
          seriesId,
          boost,
        },
      });

      // Update voteData in state
      setVoteData((prevVoteData) => {
        const updatedVoteData = { ...prevVoteData };
        const updatedSeriesData = { ...updatedVoteData[seriesId] };

        if (boost === 1) {
          updatedSeriesData.totalVotesUp = (updatedSeriesData.totalVotesUp || 0) + 1;
          updatedSeriesData.userVotesUp = (updatedSeriesData.userVotesUp || 0) + 1;
        } else if (boost === -1) {
          updatedSeriesData.totalVotesDown = (updatedSeriesData.totalVotesDown || 0) + 1;
          updatedSeriesData.userVotesDown = (updatedSeriesData.userVotesDown || 0) + 1;
        }

        updatedSeriesData.ableToVote = false;
        const now = new Date();
        now.setHours(now.getHours() + 24);
        updatedSeriesData.nextVoteTime = now.toISOString();
        updatedSeriesData.lastBoost = boost;

        updatedVoteData[seriesId] = updatedSeriesData;

        return updatedVoteData;
      });

      setVotingStatus((prevStatus) => ({ ...prevStatus, [seriesId]: false }));

    } catch (error) {
      setVotingStatus((prevStatus) => ({ ...prevStatus, [seriesId]: false }));
      console.error('Error on voting:', error);
    }
  };

  const handleUpvote = (seriesId) => {
    handleVote(seriesId, 1);
  };

  const handleDownvote = (seriesId) => {
    handleVote(seriesId, -1);
  };

  const showImageStyle = {
    maxWidth: '100px',
    maxHeight: '100px',
    objectFit: 'cover',
  };

  const descriptionStyle = {
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const handleRankMethodChange = useCallback((event, newValue) => {
    // Only update if a button is selected (newValue is not null)
    if (newValue !== null) {
      localStorage.setItem('rankMethod', newValue);
      setRankMethod(newValue);
      setCurrentPage(0);
      setSeriesMetadata([]);
    }
  }, []);

  const votesCount = (show) => {
    if (!voteData[show.id]) {
      return 0;
    }

    switch (rankMethod) {
      case 'upvotes':
        return voteData[show.id].totalVotesUp || 0;
      case 'downvotes':
        return voteData[show.id].totalVotesDown || 0;
      case 'combined':
      default:
        return (voteData[show.id].totalVotesUp || 0) - (voteData[show.id].totalVotesDown || 0);
    }
  };

  const calculateTimeRemaining = (lastVoteTime) => {
    if (!lastVoteTime) return '0:00';

    const lastVote = new Date(lastVoteTime);
    const now = new Date();
    const nextVoteTime = new Date(lastVote.getTime() + 24 * 60 * 60 * 1000); // 24 hours after last vote
    const remainingTime = nextVoteTime - now;

    if (remainingTime <= 0) {
      return '0:00';
    }

    const hours = Math.floor(remainingTime / (1000 * 60 * 60));
    const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const submitRequest = () => {
    setSubmittingRequest(true);
    API.post('publicapi', '/requests/add', {
      body: selectedRequest,
    })
      .then((response) => {
        setOpenAddRequest(false);
        setSelectedRequest();
        setMessage(response.message);
        setSeverity('success');
        setOpen(true);
        setSubmittingRequest(false);
      })
      .catch((error) => {
        console.log(error);
        console.log(error.response);
        setMessage(error.response.data.message);
        setSeverity('error');
        setOpen(true);
        setSubmittingRequest(false);
      });
  };

  const handleDisplayOptionChange = (event, newValue) => {
    if (newValue !== null) {
      setDisplayOption(newValue);
      localStorage.setItem('displayOption', newValue);
    }
  };

  // Add this function to handle clearing the search
  const clearSearch = () => {
    setSearchText('');
    debouncedSetSearchText('');
  };

  return (
    <>
      <Helmet>
        <title> Vote and Requests • TV Shows & Movies • memeSRC </title>
      </Helmet>
      <Container maxWidth="md">
        <Box my={2} sx={{ marginTop: -2 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Voting & Requests
          </Typography>
          <Typography variant="subtitle2">Upvote the most memeable shows and movies</Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 2 }}>
          <ToggleButtonGroup
            value={rankMethod}
            exclusive
            onChange={handleRankMethodChange}
            aria-label="ranking method"
            fullWidth
          >
            <ToggleButton
              value="upvotes"
              aria-label="most upvoted"
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'rgba(84, 214, 44, 0.16)',
                  color: 'success.main',
                  '&:hover': {
                    backgroundColor: 'rgba(84, 214, 44, 0.24)',
                  },
                },
              }}
            >
              <ThumbUp color="success" sx={{ mr: 1 }} />
              Most Upvoted
            </ToggleButton>
            <ToggleButton value="combined" aria-label="battleground">
              <Whatshot color="error" sx={{ mr: 1 }} />
              Battleground
            </ToggleButton>
          </ToggleButtonGroup>

          <ToggleButtonGroup
            value={displayOption}
            exclusive
            onChange={handleDisplayOptionChange}
            aria-label="display options"
            fullWidth
            size="small"
          >
            <ToggleButton value="showAll" aria-label="show all">
              <GridFilterAltIcon sx={{ mr: 1 }} />
              All
            </ToggleButton>
            <ToggleButton value="hideAvailable" aria-label="hide available">
              <NewReleasesOutlined sx={{ mr: 1 }} />
              Requested
            </ToggleButton>
            <ToggleButton value="requested" aria-label="requested">
              <GridSearchIcon sx={{ mr: 1 }} />
              Added
            </ToggleButton>
          </ToggleButtonGroup>

          <TextField
            fullWidth
            size="large"
            variant="outlined"
            value={searchText}
            onChange={handleSearchChange}
            placeholder="Filter by name..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              endAdornment: searchText && (
                <InputAdornment position="end">
                  <IconButton edge="end" onClick={clearSearch}>
                    <Close />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Grid container style={{ minWidth: '100%' }}>
          {loading && !seriesMetadata.length ? (
            <Grid
              item
              xs={12}
              style={{
                marginTop: 75,
                marginBottom: 40,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '0 20px',
              }}
            >
              <Typography variant="h6" gutterBottom>
                {isSearching ? 'Searching...' : 'Hang tight while we tally votes'}
              </Typography>
              <CircularProgress />
            </Grid>
          ) : (
            <>
              <FlipMove key={rankMethod} style={{ minWidth: '100%' }}>
                {seriesMetadata.map((show) => {
                  if (!filterShows(show)) {
                    return null;
                  }
                  const showVoteData = voteData[show.id] || {};
                  return (
                    <div key={show.id}>
                      <Grid item xs={12} style={{ marginBottom: 15 }}>
                        <Card>
                          <CardContent style={{ paddingTop: 22, paddingBottom: 22 }}>
                            <Box display="flex" alignItems="center">
                              <Box flexGrow={1} marginRight={2}>
                                <Box display="flex" alignItems="center">
                                  <Box mr={2} position="relative">
                                    <Badge
                                      badgeContent={originalRanks[show.id] ? `#${originalRanks[show.id]}` : <CircularProgress size={12} sx={{ color: 'white' }} />}
                                      color="secondary"
                                      anchorOrigin={{
                                        vertical: 'top',
                                        horizontal: 'left',
                                      }}
                                    >
                                      {!loadedImages[show.id] && (
                                        <Skeleton
                                          variant="rectangular"
                                          width={65}
                                          height={97}
                                          style={{ borderRadius: '4px' }}
                                        />
                                      )}
                                      <img
                                        src={show.image || 'path/to/placeholder-image.jpg'}
                                        alt={show.name}
                                        style={{
                                          ...showImageStyle,
                                          display: loadedImages[show.id] ? 'block' : 'none'
                                        }}
                                        onLoad={() => handleImageLoad(show.id)}
                                      />
                                    </Badge>
                                  </Box>
                                  <Stack direction="column">
                                    <Typography variant="h5">{show.name}</Typography>
                                    <Box
                                      display="flex"
                                      alignItems="center"
                                      sx={{ marginTop: '0.1rem', marginBottom: '-0.5rem' }}
                                    >
                                      {
                                        searchableShows.some(searchableShow => searchableShow.id === show.slug) && (
                                          <a
                                            href={`/${show.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ textDecoration: 'none', color: 'inherit' }}
                                          >
                                            <Chip sx={{ marginRight: 1, cursor: 'pointer' }} size='large' label="🔍 Search" color="success" variant="filled" />
                                          </a>
                                        )
                                      }
                                      <Typography
                                        variant="subtitle2"
                                        color="success.main"
                                        sx={{ fontSize: '0.7rem', opacity: 0.6 }}
                                      >
                                        <ArrowUpward fontSize="small" sx={{ verticalAlign: 'middle' }} />
                                        <b>{showVoteData.totalVotesUp || 0}</b>
                                      </Typography>
                                      {rankMethod === 'combined' && (
                                        <Typography
                                          variant="subtitle2"
                                          color="error.main"
                                          ml={1}
                                          sx={{ fontSize: '0.7rem', opacity: 0.6 }}
                                        >
                                          <ArrowDownward fontSize="small" sx={{ verticalAlign: 'middle' }} />
                                          <b>{showVoteData.totalVotesDown || 0}</b>
                                        </Typography>
                                      )}
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" mt={1} style={descriptionStyle}>
                                      {show.description}
                                    </Typography>
                                  </Stack>
                                </Box>
                              </Box>
                              <Box mr={0}>
                                {rankMethod === 'combined' ? (
                                  <>
                                    <Box display="flex" flexDirection="column" justifyContent="space-between" height="100%">
                                      {votingStatus[show.id] === 1 ? (
                                        <CircularProgress size={25} sx={{ ml: 1.2, mb: 1.5 }} />
                                      ) : (
                                        <Tooltip
                                          disableFocusListener
                                          enterTouchDelay={0}
                                          onOpen={() => {
                                            calculateTimeRemaining(showVoteData.lastVoteTime);
                                          }}
                                          title={
                                            (!showVoteData.ableToVote || votingStatus?.[show.id])
                                              ? user ? `🔒 ${calculateTimeRemaining(showVoteData.lastVoteTime)}`
                                              : 'Upvote'
                                              : 'Upvote'
                                          }
                                          componentsProps={{
                                            tooltip: {
                                              sx: {
                                                bgcolor: 'common.black',
                                                '& .MuiTooltip-arrow': {
                                                  color: 'common.black',
                                                },
                                              },
                                            },
                                          }}
                                        >
                                          <StyledBadge
                                            anchorOrigin={{
                                              vertical: 'top',
                                              horizontal: 'right',
                                            }}
                                            badgeContent={
                                              showVoteData.userVotesUp && showVoteData.userVotesUp > 0
                                                ? `+${showVoteData.userVotesUp}`
                                                : null
                                            }
                                            sx={{
                                              color: 'success.main',
                                            }}
                                          >
                                            <StyledFab
                                              aria-label="upvote"
                                              onClick={() =>
                                                user
                                                  ? handleUpvote(show.id)
                                                  : navigate(`/login?dest=${encodeURIComponent(location.pathname)}`)
                                              }
                                              disabled={
                                                user &&
                                                (!showVoteData.ableToVote || votingStatus?.[show.id])
                                              }
                                              size="small"
                                              sx={{
                                                backgroundColor: showVoteData.lastBoost === 1 ? 'success.light' : 'default',
                                              }}
                                            >
                                              {showVoteData.lastBoost === -1 &&
                                                !showVoteData.ableToVote &&
                                                rankMethod === 'upvotes' ? (
                                                <Lock />
                                              ) : (
                                                <ArrowUpward
                                                  sx={{
                                                    color:
                                                      showVoteData.lastBoost === 1 && !showVoteData.ableToVote
                                                        ? 'success.main'
                                                        : 'inherit',
                                                  }}
                                                />
                                              )}
                                            </StyledFab>
                                          </StyledBadge>
                                        </Tooltip>
                                      )}
                                    </Box>

                                    <Box alignItems="center" height="100%">
                                      <Typography variant="h5" textAlign="center" color={votesCount(show) < 0 && 'error.main'}>
                                        {votesCount(show)}
                                      </Typography>
                                    </Box>
                                    <Box>
                                      {votingStatus[show.id] === -1 ? (
                                        <CircularProgress size={25} sx={{ ml: 1.3, mt: 1.6 }} />
                                      ) : (
                                        <Tooltip
                                          disableFocusListener
                                          enterTouchDelay={0}
                                          onOpen={() => {
                                            calculateTimeRemaining(showVoteData.lastVoteTime);
                                          }}
                                          title={
                                            (!showVoteData.ableToVote || votingStatus?.[show.id])
                                              ? user ? `🔒 ${calculateTimeRemaining(showVoteData.lastVoteTime)}`
                                              : 'Downvote'
                                              : 'Downvote'
                                          }
                                          componentsProps={{
                                            tooltip: {
                                              sx: {
                                                bgcolor: 'common.black',
                                                '& .MuiTooltip-arrow': {
                                                  color: 'common.black',
                                                },
                                              },
                                            },
                                          }}
                                        >
                                          <StyledBadge
                                            anchorOrigin={{
                                              vertical: 'bottom',
                                              horizontal: 'right',
                                            }}
                                            badgeContent={
                                              showVoteData.userVotesDown && showVoteData.userVotesDown > 0
                                                ? `-${showVoteData.userVotesDown}`
                                                : null
                                            }
                                            sx={{
                                              color: 'error.main',
                                            }}
                                          >
                                            <StyledFab
                                              aria-label="downvote"
                                              onClick={() =>
                                                user
                                                  ? handleDownvote(show.id)
                                                  : navigate(`/login?dest=${encodeURIComponent(location.pathname)}`)
                                              }
                                              disabled={
                                                user &&
                                                (!showVoteData.ableToVote || votingStatus?.[show.id])
                                              }
                                              size="small"
                                              sx={{
                                                backgroundColor: showVoteData.lastBoost === -1 ? 'error.light' : 'default',
                                              }}
                                            >
                                              <ArrowDownward
                                                sx={{
                                                  color:
                                                    showVoteData.lastBoost === -1 && !showVoteData.ableToVote
                                                      ? 'error.main'
                                                      : 'inherit',
                                                }}
                                              />
                                            </StyledFab>
                                          </StyledBadge>
                                        </Tooltip>
                                      )}
                                    </Box>
                                  </>
                                ) : (
                                  <Stack alignItems="center" spacing={0.7} direction="column" height="100%">
                                    <Box display="flex" flexDirection="column" justifyContent="space-between" height="100%">
                                      {votingStatus[show.id] === 1 ? (
                                        <CircularProgress size={25} sx={{ ml: 1.2, mb: 1.5 }} />
                                      ) : (
                                        <Tooltip
                                          disableFocusListener
                                          enterTouchDelay={0}
                                          onOpen={() => {
                                            calculateTimeRemaining(showVoteData.lastVoteTime);
                                          }}
                                          title={
                                            (!showVoteData.ableToVote || votingStatus?.[show.id])
                                              ? user ? `🔒 ${calculateTimeRemaining(showVoteData.lastVoteTime)}`
                                              : 'Upvote'
                                              : 'Upvote'
                                          }
                                          componentsProps={{
                                            tooltip: {
                                              sx: {
                                                bgcolor: 'common.black',
                                                '& .MuiTooltip-arrow': {
                                                  color: 'common.black',
                                                },
                                              },
                                            },
                                          }}
                                        >
                                          <StyledBadge
                                            anchorOrigin={{
                                              vertical: 'top',
                                              horizontal: 'right',
                                            }}
                                            badgeContent={
                                              showVoteData.userVotesUp && showVoteData.userVotesUp > 0
                                                ? `+${showVoteData.userVotesUp}`
                                                : null
                                            }
                                          >
                                            <StyledFab
                                              aria-label="upvote"
                                              onClick={() =>
                                                user
                                                  ? handleUpvote(show.id)
                                                  : navigate(`/login?dest=${encodeURIComponent(location.pathname)}`)
                                              }
                                              disabled={user && (!showVoteData.ableToVote || votingStatus?.[show.id])}
                                              size="small"
                                            >
                                              {showVoteData.lastBoost === -1 &&
                                                !showVoteData.ableToVote &&
                                                rankMethod === 'upvotes' ? (
                                                <Lock />
                                              ) : (
                                                <ThumbUp
                                                  sx={{
                                                    color:
                                                      showVoteData.lastBoost === 1 && !showVoteData.ableToVote
                                                        ? 'success.main'
                                                        : 'inherit',
                                                  }}
                                                />
                                              )}
                                            </StyledFab>
                                          </StyledBadge>
                                        </Tooltip>
                                      )}
                                    </Box>
                                    <Typography variant="h5" textAlign="center" color={votesCount(show) < 0 && 'error.main'}>
                                      {showVoteData.totalVotesUp || 0}
                                    </Typography>
                                  </Stack>
                                )}
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    </div>
                  );
                })}
              </FlipMove>

              {loadingMore && (
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="center" my={2}>
                    <CircularProgress />
                  </Box>
                </Grid>
              )}

              {!isSearching && hasMore && (
                <Grid item xs={12} style={{ marginTop: 20 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleLoadMore}
                    fullWidth
                    style={{
                      backgroundColor: 'rgb(45, 45, 45)',
                      height: 100,
                      color: 'white',
                      fontSize: 'large',
                    }}
                    startIcon={<AddIcon />}
                  >
                    Load More
                  </Button>
                </Grid>
              )}

              <Grid
                item
                xs={12}
                style={{
                  marginTop: 75,
                  marginBottom: 40,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '0 20px',
                }}
              >
                <Typography variant="h6" gutterBottom>
                  What are we missing?
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    if (user) {
                      toggleOpenAddRequest();
                    } else {
                      navigate('/signup');
                    }
                  }}
                  style={{
                    marginTop: 10,
                    marginBottom: 50,
                    backgroundColor: 'rgb(84, 214, 44)',
                    color: 'black',
                  }}
                  startIcon={<AddIcon />}
                >
                  Make a request
                </Button>
              </Grid>
            </>
          )}
        </Grid>
      </Container>
      <Dialog maxWidth='md' fullWidth onClose={toggleOpenAddRequest} open={openAddRequest}>
        <DialogTitle>
          <Typography variant='h4' textAlign='center'>
            Request Series
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ paddingTop: 2 }}>
          <TvdbSearch typeFilter={['series', 'movie']} onClear={() => { setSelectedRequest(); }} onSelect={(value) => { setSelectedRequest(value); }} />
          {selectedRequest &&

            <Grid container spacing={2} alignItems='center' mt={2}>
              <Grid item>
                <StyledImg
                  src={selectedRequest.image_url}
                  alt={selectedRequest.name}
                  sx={{
                    maxWidth: '115px',
                    maxHeight: '115px',
                    objectFit: 'cover',
                    [theme.breakpoints.up('sm')]: {
                      maxWidth: '150px',
                      maxHeight: '150px',
                    },
                    [theme.breakpoints.up('md')]: {
                      maxWidth: '200px',
                      maxHeight: '200px',
                    },
                  }} />
              </Grid>
              <Grid item xs>
                <Typography variant='h4'>
                  {selectedRequest.name}
                  <Chip size='small' sx={{ ml: 1 }} label={selectedRequest.type} />
                </Typography>
                <Typography variant='body2'>
                  {selectedRequest.year}
                </Typography>
                <Typography variant='body1' mt={2} sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {selectedRequest.overview}
                </Typography>
              </Grid>
            </Grid>
          }
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <LoadingButton onClick={submitRequest} loading={submittingRequest} disabled={!selectedRequest || submittingRequest} variant='contained'>
            Submit Request
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

VotingPage.propTypes = {
  shows: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      // Add other properties of the show object if needed
    })
  ).isRequired,
};

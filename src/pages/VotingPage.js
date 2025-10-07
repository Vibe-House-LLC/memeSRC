import React, { useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { API, graphqlOperation, Auth } from 'aws-amplify';
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
  DialogContentText,
  Autocomplete,
  Switch,
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import LockIcon from '@mui/icons-material/Lock';
import NewReleasesOutlinedIcon from '@mui/icons-material/NewReleasesOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import FlipMove from 'react-flip-move';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LoadingButton } from '@mui/lab';
import { GridFilterAltIcon, GridSearchIcon } from '@mui/x-data-grid';
import { debounce } from 'lodash';
import match from 'autosuggest-highlight/match';
import parse from 'autosuggest-highlight/parse';
import { getSeries } from '../graphql/queries';
import { UserContext } from '../UserContext';
import TvdbSearch from '../components/TvdbSearch/TvdbSearch';
import { SnackbarContext } from '../SnackbarContext';
import { useShows } from '../contexts/useShows';  // Add this import if not already present
import FixedMobileBannerAd from '../ads/FixedMobileBannerAd';
import HomePageBannerAd from '../ads/HomePageBannerAd';

const StyledBadge = styled(Badge)(() => ({
  '& .MuiBadge-badge': {
    padding: '0 3px',
    backgroundColor: 'rgba(0, 0, 0, 1)',
    fontWeight: 'bold',
    fontSize: '7pt',
  },
}));

const StyledFab = styled(Fab)(() => ({
  backgroundColor: 'rgba(255, 255, 255, 0.75)',
  zIndex: 0,
}));

// Add this new wrapper component
const MagicVoteWrapper = styled('div')(({ theme, magicEnabled }) => ({
  position: 'relative',
  display: 'inline-flex',
  opacity: magicEnabled ? 1 : 1, // Default opacity
  transition: 'opacity 0.3s ease',
  '&:hover': {
    opacity: magicEnabled ? 0.7 : 1, // Only reduce opacity on hover when magic is enabled
  },
  ...(magicEnabled && {
    '&::before': {
      content: '""',
      position: 'absolute',
      top: -2,
      left: -2,
      right: -2,
      bottom: -2,
      borderRadius: '50%',
      background: `linear-gradient(45deg, ${theme.palette.success.main}, #81C784)`, // Use theme color
      opacity: 0.4,
      zIndex: -1,
      animation: 'pulse 1.5s infinite',
    },
    '@keyframes pulse': {
      '0%': {
        transform: 'scale(1)',
        opacity: 0.4,
      },
      '50%': {
        transform: 'scale(1.2)',
        opacity: 0.1,
      },
      '100%': {
        transform: 'scale(1)',
        opacity: 0.4,
      },
    },
  }),
})); 

const StyledImg = styled('img')``;

// Add this styled component after other styled components
const FloatingCard = styled(Card)(({ theme, enabled }) => ({
  position: 'fixed',
  bottom: 20,
  left: '50%',
  transform: 'translateX(-50%)',
  width: '90%',
  maxWidth: '100%',
  margin: '0 20px',
  zIndex: 1000,
  backgroundColor: enabled ? theme.palette.success.main : 'rgba(84, 214, 44, 0.16)',
  transition: 'all 0.3s ease',
  boxShadow: enabled ? '0 0 20px rgba(84, 214, 44, 0.5)' : '0 4px 20px rgba(0, 0, 0, 0.25)',
  cursor: 'pointer',
  animation: 'slideUp 0.75s',
  // Add the keyframes for the animation
  '@keyframes slideUp': {
    from: {
      transform: 'translate(-50%, 100%)',
    },
    to: {
      transform: 'translate(-50%, 0)',
    },
  },
  
  [theme.breakpoints.up('sm')]: {
    width: 'auto',
    maxWidth: '400px',
    margin: 0,
  },

  [theme.breakpoints.down('sm')]: {
    bottom: 0,
    borderRadius: '16px 16px 0 0',
    left: 0,
    transform: 'none',
    width: '100%',
    margin: 0,
    // Update animation for mobile
    animation: 'slideUpMobile 0.75s',
    '@keyframes slideUpMobile': {
      from: {
        transform: 'translateY(100%)',
        opacity: 0,
      },
      to: {
        transform: 'translateY(0)',
        opacity: 1,
      },
    },
  },
}));

// Add this new styled component for the shimmer wrapper
const ShimmerWrapper = styled('div')(({ enabled }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  overflow: 'hidden', // Contain the shimmer effect
  borderRadius: 'inherit', // Match the card's border radius

  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: enabled ? 'none' : `linear-gradient(
      -45deg,
      transparent 0%,
      rgba(84, 214, 44, .2) 50%,
      transparent 100%
    )`,
    animation: enabled ? 'none' : 'shimmer 5s infinite',
    zIndex: 1,
  },

  '@keyframes shimmer': {
    '0%': {
      transform: 'translateX(-200%)',
      opacity: .75
    },
    '100%': {
      transform: 'translateX(100%)',
      opacity: .5
    },
  },
}));


export default function VotingPage() {
  const { shows: searchableShows } = useShows();  // Add this line
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isChangingRankMethod, setIsChangingRankMethod] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [votingStatus, setVotingStatus] = useState({});
  const [searchText, setSearchText] = useState('');
  const [rankMethod, setRankMethod] = useState(null); // Set initial state to null
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

  // Replace the single itemsPerPage constant with these two
  const INITIAL_ITEMS = 50; // Number of items to show on first load
  const ITEMS_PER_LOAD = 25; // Number of additional items to load with "Load More"

  // Local pagination
  const [currentPage, setCurrentPage] = useState(0);

  const [sortedSeriesIds, setSortedSeriesIds] = useState([]);

  const location = useLocation();

  const theme = useTheme();

  const { user, setUser, forceTokenRefresh } = useContext(UserContext);

  const [hasSeenMagicVotes, setHasSeenMagicVotes] = useState(() => {
    if (user && user.username) {
      return localStorage.getItem(`hasSeenMagicVotes_${user.username}`) === 'true';
    }
    return false;
  });

  const toggleOpenAddRequest = () => {
    setOpenAddRequest(!openAddRequest);
  };

  // Add cache variables
  const seriesCache = useRef({});


  const [loadedImages, setLoadedImages] = useState({});

  // Initialize with true to load the top list first

  const [originalRanks, setOriginalRanks] = useState({});

  const [fullSortedSeriesIds, setFullSortedSeriesIds] = useState([]);

  // Add this new state to track if there are more items to load
  const [hasMore, setHasMore] = useState(true);

  // Add this new state
  const [debouncedSearchText, setDebouncedSearchText] = useState('');

  // Add this line with the other refs
  const searchInputRef = useRef(null);

  // Add these new state variables near the top with other state declarations
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);

  // Add this near other state declarations
  const [searchOptions, setSearchOptions] = useState([]);

  // Add this new state to store search result ranks
  const [searchResultRanks, setSearchResultRanks] = useState({});

  // Add these new state variables
  const [magicVoteDialogOpen, setMagicVoteDialogOpen] = useState(false);
  const [magicVoteSeries, setMagicVoteSeries] = useState(null);
  const [magicVoteBoost, setMagicVoteBoost] = useState(1);
  const [magicVoteType, setMagicVoteType] = useState(1); // 1 for upvote, -1 for downvote
  const [magicVoteMultiplier, setMagicVoteMultiplier] = useState(1);

  // Add this state variable for loading state
  const [isSubmittingMagicVote, setIsSubmittingMagicVote] = useState(false);

  // Add these state variables after other state declarations
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Add this debounced search function after other function declarations
  const debouncedSearch = useMemo(
    () => debounce(async (searchValue) => {
      if (!searchValue) {
        setSearchOptions([]);
        return;
      }

      try {
        const response = await API.get('publicapi', '/votes/search', {
          queryStringParameters: {
            prefix: searchValue
          },
        });
        
        const hits = response.hits || [];
        setSearchOptions(hits.map(hit => ({
          id: hit.id,
          label: hit.name
        })));
      } catch (error) {
        console.error('Error fetching search suggestions:', error);
        setSearchOptions([]);
      }
    }, 200),
    []
  );

  // Update handleSearchKeyDown to trigger the search
  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      setDebouncedSearchText(searchText); // Trigger the search
      setIsSearching(true); // Show loading state
      setDisplayOption('showAll'); // Reset display option to show all results
      // localStorage.setItem('displayOption', 'showAll'); // Update localStorage
      searchInputRef.current?.blur(); // Remove focus from the input
    }
  };

  const handleImageLoad = (showId) => {
    setLoadedImages(prev => ({ ...prev, [showId]: true }));
  };

  // Initialize rankMethod from localStorage
  useEffect(() => {
    const savedRankMethod = localStorage.getItem('rankMethod');
    if (savedRankMethod) {
      setRankMethod(savedRankMethod);
    } else {
      setRankMethod('upvotes');
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

  const filterShows = useCallback(
    (show) => {
      const isSearchable = searchableShows.some((searchableShow) => searchableShow.id === show.slug);
      switch (displayOption) {
        case 'hideAvailable':
          return !isSearchable;
        case 'requested':
          return isSearchable;
        default: // 'showAll'
          return true;
      }
    },
    [displayOption, searchableShows]
  );

  // **Updated recalculateRanks function**
  const recalculateRanks = useCallback(() => {
    if (isSearching) {
      // Do not recalculate ranks when searching
      return;
    }
    let currentRank = 1;
    const newRanks = {};

    const seriesToRank = fullSortedSeriesIds.map((id) => seriesCache.current[id]).filter(Boolean);

    // Apply filterShows to exclude shows based on displayOption
    const filteredSeries = seriesToRank.filter((show) => filterShows(show));

    // Sort filteredSeries based on voteData and rankMethod
    const sortedShows = [...filteredSeries];

    if (sortedShows.length > 0) {
      switch (rankMethod) {
        case 'combined':
          sortedShows.sort((a, b) => {
            const voteDiffA =
              (voteData[a.id]?.totalVotesUp || 0) - (voteData[a.id]?.totalVotesDown || 0);
            const voteDiffB =
              (voteData[b.id]?.totalVotesUp || 0) - (voteData[b.id]?.totalVotesDown || 0);
            return voteDiffB - voteDiffA || safeCompareSeriesTitles(a.id, b.id);
          });
          break;
        case 'downvotes':
          sortedShows.sort((a, b) => {
            const downvoteDiff =
              (voteData[b.id]?.totalVotesDown || 0) - (voteData[a.id]?.totalVotesDown || 0);
            return downvoteDiff || safeCompareSeriesTitles(a.id, b.id);
          });
          break;
        default: // 'upvotes'
          sortedShows.sort((a, b) => {
            const upvoteDiff =
              (voteData[b.id]?.totalVotesUp || 0) - (voteData[a.id]?.totalVotesUp || 0);
            return upvoteDiff || safeCompareSeriesTitles(a.id, b.id);
          });
      }
    }

    // Assign ranks
    sortedShows.forEach((show) => {
      newRanks[show.id] = currentRank;
      currentRank += 1;
    });

    setOriginalRanks(newRanks);
  }, [filterShows, fullSortedSeriesIds, voteData, rankMethod, safeCompareSeriesTitles, isSearching]);

  // **Call recalculateRanks whenever voteData, displayOption, or rankMethod changes**
  useEffect(() => {
    recalculateRanks();
  }, [displayOption, rankMethod, voteData, recalculateRanks]);

  // Update fetchSeriesData function
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

      const startIdx = page === 0 ? 0 : INITIAL_ITEMS + (page - 1) * ITEMS_PER_LOAD;
      const endIdx = page === 0 ? INITIAL_ITEMS : INITIAL_ITEMS + page * ITEMS_PER_LOAD;
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

      // Update hasMore check
      setHasMore(endIdx < sortedIds.length);

    } catch (error) {
      console.error('Error fetching series data:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [recalculateRanks]);

  // Update fetchVoteData function
  const fetchVoteData = useCallback(
    async (currentRankMethod) => {
      try {
        const apiEndpoint =
          currentRankMethod === 'combined'
            ? '/vote/new/top/battleground'
            : '/vote/new/top/upvotes';

        const topVotesResponse = await API.get('publicapi', apiEndpoint);
        const topVotesData = JSON.parse(topVotesResponse);

        const newVoteData = {};
        topVotesData.forEach((item) => {
          newVoteData[item.seriesId] = {
            totalVotesUp: 0,
            totalVotesDown: 0,
            ableToVote: true,
            userVotesUp: 0,
            userVotesDown: 0,
            lastVoteTime: null,
            lastBoost: null,
          };
        });

        const seriesIds = topVotesData.map(item => item.seriesId);

        // Calculate visible and next page series IDs
        const visibleSeriesIds = seriesIds.slice(0, INITIAL_ITEMS + ITEMS_PER_LOAD);

        try {
          const votesResponse = await API.post('publicapi', '/vote/new/count', {
            body: { seriesIds: visibleSeriesIds }
          });
          const votesData = JSON.parse(votesResponse);

          votesData.forEach((item) => {
            const {seriesId} = item;
            if (newVoteData[seriesId]) {
              newVoteData[seriesId].totalVotesUp = item.totalVotes.upvotes || 0;
              newVoteData[seriesId].totalVotesDown = item.totalVotes.downvotes || 0;

              if (user) {
                newVoteData[seriesId].userVotesUp = item.userVotes?.upvotes || 0;
                newVoteData[seriesId].userVotesDown = item.userVotes?.downvotes || 0;
                newVoteData[seriesId].lastVoteTime = item.userVotes?.lastVoteTime;
                newVoteData[seriesId].lastBoost = item.userVotes?.lastBoost;

                if (item.userVotes?.lastVoteTime) {
                  const lastVoteDate = new Date(item.userVotes.lastVoteTime);
                  const now = new Date();
                  const hoursSinceLastVote = (now - lastVoteDate) / (1000 * 60 * 60);
                  newVoteData[seriesId].ableToVote = hoursSinceLastVote >= 24;
                }
              }
            }
          });
        } catch (error) {
          console.error('Error fetching votes:', error);
        }

        setVoteData(newVoteData);

        const newSortedSeriesIds = topVotesData.map((item) => item.seriesId);
        setFullSortedSeriesIds(newSortedSeriesIds);
        setSortedSeriesIds(newSortedSeriesIds);

        fetchSeriesData(newSortedSeriesIds, 0, false);
      } catch (error) {
        console.error('Error in fetchVoteData:', error);
      }
    },
    [user, fetchSeriesData]
  );



  // Update the useEffect that handles search to store the ranks
  useEffect(() => {
    if (rankMethod === null) {
      return;
    }

    if (debouncedSearchText) {
      const fetchSearchResults = async () => {
        try {
          const response = await API.get('publicapi', '/votes/search', {
            queryStringParameters: {
              prefix: debouncedSearchText
            },
          });

          const {hits} = response;
          
          // Store the ranks from search results
          const newSearchRanks = {};
          hits.forEach(hit => {
            newSearchRanks[hit.id] = {
              upvotes: hit.rankUpvotes,
              battleground: hit.rankBattleground
            };
          });
          setSearchResultRanks(newSearchRanks);

          // Rest of the existing search logic...
          const seriesIds = hits.map(hit => hit.id);
          
          // Create a map of ranks from search results based on rankMethod
          const searchRanks = {};
          hits.forEach(hit => {
            searchRanks[hit.id] = rankMethod === 'combined' ? 
              hit.rankBattleground : 
              hit.rankUpvotes;
          });

          // Update originalRanks with search result ranks
          setOriginalRanks(prevRanks => ({
            ...prevRanks,
            ...searchRanks
          }));

          // Rest of the existing search logic...
          const seriesDataFromCache = seriesIds.map(id => seriesCache.current[id]).filter(Boolean);
          const idsToFetch = seriesIds.filter(id => !seriesCache.current[id]);

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

            seriesDataFromCache.push(...fetchedSeriesData);
          }

          setSeriesMetadata(seriesDataFromCache.map(show => ({
            ...show,
            rank: searchRanks[show.id] || null,
          })));
          await fetchVoteDataForSeries(seriesIds);
          
          // Only set hasMore if we have more items than itemsPerPage
          setHasMore(seriesDataFromCache.length > INITIAL_ITEMS);
          
        } catch (error) {
          console.error('Error fetching search results:', error);
        } finally {
          setIsSearching(false);
        }
      };
      fetchSearchResults();
    } else if (debouncedSearchText === '') {
      // Clear search ranks when search is cleared
      setSearchResultRanks({});
      fetchVoteData(rankMethod).finally(() => {
        setIsSearching(false);
      });
    }
  }, [debouncedSearchText, rankMethod]);

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
    if (!isSearching) {
      recalculateRanks();
    }
  }, [rankMethod, recalculateRanks, isSearching]);

  // Modify the handleLoadMore function
  const handleLoadMore = () => {
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchSeriesData(sortedSeriesIds, nextPage, true);

    // **Fetch vote data for the next page of series IDs**
    const startIdx = INITIAL_ITEMS + nextPage * ITEMS_PER_LOAD;
    const endIdx = startIdx + ITEMS_PER_LOAD;
    const nextPageSeriesIds = sortedSeriesIds.slice(startIdx, endIdx);
    fetchVoteDataForSeries(nextPageSeriesIds);
  };

  // Update the handleVote function
  const handleVote = async (seriesId, boost) => {
    if (magicVotesEnabled) {
      // Open the magic vote dialog
      setMagicVoteSeries(seriesCache.current[seriesId]);
      setMagicVoteBoost(boost);
      setMagicVoteType(boost > 0 ? 1 : -1);
      setMagicVoteMultiplier(1); // default multiplier
      setMagicVoteDialogOpen(true);
    } else {
      // Existing voting logic
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
          // ... existing state update logic
          const updatedVoteData = { ...prevVoteData };
          const updatedSeriesData = { ...updatedVoteData[seriesId] };

          if (boost > 0) {
            updatedSeriesData.totalVotesUp = (updatedSeriesData.totalVotesUp || 0) + Math.abs(boost);
            updatedSeriesData.userVotesUp = (updatedSeriesData.userVotesUp || 0) + Math.abs(boost);
          } else if (boost < 0) {
            updatedSeriesData.totalVotesDown = (updatedSeriesData.totalVotesDown || 0) + Math.abs(boost);
            updatedSeriesData.userVotesDown = (updatedSeriesData.userVotesDown || 0) + Math.abs(boost);
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
    }
  };

  // Add a new function to handle the boosted vote submission
  const handleMagicVoteSubmit = async () => {
    setIsSubmittingMagicVote(true);
    const seriesId = magicVoteSeries.id;
    const boost = magicVoteType * magicVoteMultiplier;

    // Set voting status to show spinner
    setVotingStatus((prevStatus) => ({ ...prevStatus, [seriesId]: boost > 0 ? 1 : -1 }));
  
    setMagicVoteDialogOpen(false);

    try {
      await API.post('publicapi', '/vote', {
        body: {
          seriesId,
          boost,
        },
      });

      // Calculate credit cost based on multiplier to match UI
      const creditCost = magicVoteMultiplier === 1 ? 0 : 
                        magicVoteMultiplier === 5 ? 1 : 
                        magicVoteMultiplier === 10 ? 2 : 0;

      // Deduct credits if using a multiplier
      if (creditCost > 0) {
        const newCreditAmount = user?.userDetails.credits - creditCost;
        setUser({ ...user, userDetails: { ...user?.userDetails, credits: newCreditAmount } });
        await forceTokenRefresh();
      }

      // Update voteData in state
      setVoteData((prevVoteData) => {
        const updatedVoteData = { ...prevVoteData };
        const updatedSeriesData = { ...updatedVoteData[seriesId] };

        if (boost > 0) {
          updatedSeriesData.totalVotesUp = (updatedSeriesData.totalVotesUp || 0) + Math.abs(boost);
          updatedSeriesData.userVotesUp = (updatedSeriesData.userVotesUp || 0) + Math.abs(boost);
        } else if (boost < 0) {
          updatedSeriesData.totalVotesDown = (updatedSeriesData.totalVotesDown || 0) + Math.abs(boost);
          updatedSeriesData.userVotesDown = (updatedSeriesData.userVotesDown || 0) + Math.abs(boost);
        }

        updatedSeriesData.ableToVote = false;
        const now = new Date();
        now.setHours(now.getHours() + 24);
        updatedSeriesData.nextVoteTime = now.toISOString();
        updatedSeriesData.lastBoost = boost;

        updatedVoteData[seriesId] = updatedSeriesData;

        return updatedVoteData;
      });

    } catch (error) {
      console.error('Error on voting:', error);
      // Show error message if needed
    } finally {
      setIsSubmittingMagicVote(false);
      // Clear voting status
      setVotingStatus((prevStatus) => ({ ...prevStatus, [seriesId]: false }));
    }
  };


  // Update handleUpvote and handleDownvote functions to use handleVote
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

  // Update the handleRankMethodChange function
  const handleRankMethodChange = useCallback((event, newValue) => {
    if (newValue !== null) {
      setIsChangingRankMethod(true); // Show loading state
      localStorage.setItem('rankMethod', newValue);
      setRankMethod(newValue);
      setCurrentPage(0);
      setSeriesMetadata([]);
      
      // Fetch new data with the updated rank method
      fetchVoteData(newValue).finally(() => {
        setIsChangingRankMethod(false); // Hide loading state
      });
    }
  }, [fetchVoteData]);

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
    if (!lastVoteTime) {
      setTimeRemaining('0:00');
      return;
    }

    const lastVote = new Date(lastVoteTime);
    const now = new Date();
    const nextVoteTime = new Date(lastVote.getTime() + 24 * 60 * 60 * 1000); // 24 hours after last vote
    const remainingTime = nextVoteTime - now;

    if (remainingTime <= 0) {
      setTimeRemaining('0:00');
      return;
    }

    const hours = Math.floor(remainingTime / (1000 * 60 * 60));
    const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
    const formattedTime = `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    setTimeRemaining(formattedTime);
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

  // Update clearSearch to properly reset the search
  const clearSearch = () => {
    setSearchText('');
    setDebouncedSearchText('');
    setIsSearching(true);
    searchInputRef.current?.focus();
  };

  // **Update sortedSeriesMetadata without assigning ranks**
  const sortedSeriesMetadata = useMemo(() => {
    if (seriesMetadata.length === 0) return [];

    // Only filter by search if there's a debouncedSearchText (i.e., user has pressed Enter)
    const searchFilteredShows = debouncedSearchText ? 
      seriesMetadata.filter((show) =>
        show.name.toLowerCase().includes(debouncedSearchText.toLowerCase())
      ) :
      seriesMetadata;

    const sortedShows = [...searchFilteredShows];

    // Sort the shows based on voteData and rankMethod
    if (sortedShows.length > 0) {
      switch (rankMethod) {
        case 'combined':
          sortedShows.sort((a, b) => {
            const voteDiffA =
              (voteData[a.id]?.totalVotesUp || 0) - (voteData[a.id]?.totalVotesDown || 0);
            const voteDiffB =
              (voteData[b.id]?.totalVotesUp || 0) - (voteData[b.id]?.totalVotesDown || 0);
            return voteDiffB - voteDiffA || safeCompareSeriesTitles(a.id, b.id);
          });
          break;
        case 'downvotes':
          sortedShows.sort((a, b) => {
            const downvoteDiff =
              (voteData[b.id]?.totalVotesDown || 0) - (voteData[a.id]?.totalVotesDown || 0);
            return downvoteDiff || safeCompareSeriesTitles(a.id, b.id);
          });
          break;
        default: // 'upvotes'
          sortedShows.sort((a, b) => {
            const upvoteDiff =
              (voteData[b.id]?.totalVotesUp || 0) - (voteData[a.id]?.totalVotesUp || 0);
            return upvoteDiff || safeCompareSeriesTitles(a.id, b.id);
          });
      }
    }

    return sortedShows;
  }, [seriesMetadata, debouncedSearchText, voteData, rankMethod, safeCompareSeriesTitles]);

  // Add a new function to fetch vote data for specific series IDs:

  const fetchVoteDataForSeries = useCallback(
    async (seriesIds) => {
      try {
        const votesResponse = await API.post('publicapi', '/vote/new/count', {
          body: { seriesIds },
        });

        // Check if votesResponse is a string and parse it
        const votesData = typeof votesResponse === 'string' ? JSON.parse(votesResponse) : votesResponse;

        // Ensure votesData is an array
        const votesArray = Array.isArray(votesData) ? votesData : votesData.data;

        // Update voteData in state, preserving existing user vote data
        setVoteData((prevVoteData) => {
          const updatedVoteData = { ...prevVoteData };
          votesArray.forEach((item) => {
            const {seriesId} = item;
            const existingData = updatedVoteData[seriesId] || {};
            
            updatedVoteData[seriesId] = {
              ...existingData, // Preserve existing data
              totalVotesUp: item.totalVotes.upvotes || 0,
              totalVotesDown: item.totalVotes.downvotes || 0,
              // Only update user-specific data if it exists in the response
              ...(item.userVotes && {
                ableToVote: item.userVotes.lastVoteTime ? 
                  new Date(item.userVotes.lastVoteTime).getTime() + (24 * 60 * 60 * 1000) < Date.now() : 
                  true,
                userVotesUp: item.userVotes.upvotes || 0,
                userVotesDown: item.userVotes.downvotes || 0,
                lastVoteTime: item.userVotes.lastVoteTime,
                lastBoost: item.userVotes.lastBoost,
              })
            };
          });
          return updatedVoteData;
        });
      } catch (error) {
        console.error('Error fetching votes:', error);
      }
    },
    [setVoteData]
  );

  // Add these new state variables after other state declarations
  const [isAdmin, setIsAdmin] = useState(false);

  // Add this new useEffect to check admin status
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const session = await Auth.currentSession();
        const groups = session.getAccessToken().payload['cognito:groups'] || [];
        setIsAdmin(groups.includes('admins'));
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };

    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  // Add this new function before the return statement
  const refreshVoteAggregations = async () => {
    setIsRefreshing(true);
    setShowRefreshDialog(false);
    
    try {
      // Make the actual API call to refresh votes
      await API.post('publicapi', '/votes/refresh');
      
      // After successful refresh, fetch the updated data
      await fetchVoteData(rankMethod);
      
      setMessage('Vote aggregations refreshed successfully');
      setSeverity('success');
      setOpen(true);
    } catch (error) {
      console.error('Error refreshing vote aggregations:', error);
      setMessage(error.response?.data?.message || 'Failed to refresh vote aggregations');
      setSeverity('error');
      setOpen(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Update the handleRefresh function
  const handleRefresh = () => {
    setShowRefreshDialog(true);
  };

  // After other state declarations
  const [magicVotesEnabled, setMagicVotesEnabled] = useState(() => {
    if (user && user.username) {
      const savedValue = localStorage.getItem(`magicVotesEnabled_${user.username}`);
      return savedValue === 'true';
    }
    return false;
  });

  useEffect(() => {
    if (user && user.username) {
      const savedValue = localStorage.getItem(`magicVotesEnabled_${user.username}`);
      setMagicVotesEnabled(savedValue === 'true');
      // Also load hasSeenMagicVotes from localStorage
      const seenValue = localStorage.getItem(`hasSeenMagicVotes_${user.username}`);
      setHasSeenMagicVotes(seenValue === 'true');
    } else {
      setMagicVotesEnabled(false);
      setHasSeenMagicVotes(false);
    }
  }, [user]);

  // Update the handleMagicVotesToggle function
  const handleMagicVotesToggle = () => {
    if (!user) {
      navigate(`/login?dest=${encodeURIComponent(location.pathname)}`);
      return;
    }
    const newValue = !magicVotesEnabled;
    setMagicVotesEnabled(newValue);
    if (user && user.username) {
      localStorage.setItem(`magicVotesEnabled_${user.username}`, newValue.toString());
      // Set hasSeenMagicVotes to true when enabling for the first time
      if (newValue && !hasSeenMagicVotes) {
        setHasSeenMagicVotes(true);
        localStorage.setItem(`hasSeenMagicVotes_${user.username}`, 'true');
      }
    }
  };

  return (
    <>
      <Helmet>
        <title> Vote and Requests • TV Shows & Movies • memeSRC </title>
      </Helmet>
      <Container maxWidth="md" sx={{ mt: 3 }}>  {/* Add margin top */}
        <Box my={2}>  {/* Remove the negative margin */}
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom
            sx={{ fontSize: { xs: '2rem', sm: '2rem', md: '2rem' } }}  // Add this line
          >
            Voting & Requests
          </Typography>
          <Typography variant="subtitle2">
            Upvote the most memeable shows and movies
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                <ThumbUpIcon color="success" sx={{ mr: 1 }} />
                Most Upvoted
              </ToggleButton>
              <ToggleButton value="combined" aria-label="battleground">
                <WhatshotIcon color="error" sx={{ mr: 1 }} />
                Battleground
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          
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
              <NewReleasesOutlinedIcon sx={{ mr: 1 }} />
              Requested
            </ToggleButton>
            <ToggleButton value="requested" aria-label="requested">
              <GridSearchIcon sx={{ mr: 1 }} />
              Searchable
            </ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Autocomplete
              freeSolo
              fullWidth
              options={searchOptions}
              filterOptions={(x) => x}
              value={searchText}
              onChange={(event, newValue) => {
                if (typeof newValue === 'string') {
                  setSearchText(newValue);
                } else if (newValue && newValue.label) {
                  setSearchText(newValue.label);
                  setDebouncedSearchText(newValue.label);
                  searchInputRef.current?.blur();
                }
              }}
              onInputChange={(event, newValue) => {
                setSearchText(newValue);
                debouncedSearch(newValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  fullWidth
                  size="large"
                  variant="outlined"
                  placeholder="Filter by name..."
                  inputRef={searchInputRef}
                  onKeyDown={handleSearchKeyDown}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (searchText || isSearching) && (
                      <InputAdornment position="end">
                        <IconButton 
                          edge="end" 
                          onClick={clearSearch} 
                          disabled={isSearching && !searchText}
                        >
                          {isSearching ? (
                            <CircularProgress size={20} sx={{ color: 'white' }} />
                          ) : (
                            <CloseIcon />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              )}
              renderOption={(props, option, { inputValue }) => {
                const matches = match(option.label, inputValue);
                const parts = parse(option.label, matches);
              
                return (
                  <li {...props}>
                    <Box sx={{ display: 'block' }}>
                      {parts.map((part, index) => (
                        <span
                          key={index}
                          style={{
                            fontWeight: part.highlight ? 700 : 400,
                            whiteSpace: 'pre',
                          }}
                        >
                          {part.text}
                        </span>
                      ))}
                    </Box>
                  </li>
                );
              }}
            />
            
            {isAdmin && (
              <IconButton
                onClick={handleRefresh}
                disabled={isRefreshing}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
              >
                {isRefreshing ? (
                  <CircularProgress size={24} />
                ) : (
                  <RefreshIcon />
                )}
              </IconButton>
            )}
          </Box>
        </Box>

        <Grid container style={{ minWidth: '100%' }}>
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

          {(loading && !seriesMetadata.length) || isChangingRankMethod ? (
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
                Loading
              </Typography>
              <CircularProgress />
            </Grid>
          ) : (
            <>
              <FlipMove key={rankMethod} style={{ minWidth: '100%' }}>
                {sortedSeriesMetadata.map((show) => {
                  if (!filterShows(show)) {
                    return null;
                  }
                  const showVoteData = voteData[show.id] || {};
                  const userCanVote = showVoteData.ableToVote !== false;
                  const isUpvoted = showVoteData.lastBoost > 0 && !userCanVote;
                  const isDownvoted = showVoteData.lastBoost < 0 && !userCanVote;

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
                                      badgeContent={
                                        // First check if we're in search mode and have search ranks
                                        debouncedSearchText && searchResultRanks[show.id] ? (
                                          `#${rankMethod === 'combined' ? 
                                            searchResultRanks[show.id].battleground : 
                                            searchResultRanks[show.id].upvotes}`
                                        ) : // If not searching, use original ranks
                                        originalRanks[show.id] !== undefined || show.rank !== null ? (
                                          `#${originalRanks[show.id] || show.rank}`
                                        ) : (
                                          <CircularProgress
                                            size={12}
                                            sx={{ color: 'white' }}
                                          />
                                        )
                                      }
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
                                        loading="lazy"
                                        style={{
                                          ...showImageStyle,
                                          display: loadedImages[show.id] ? 'block' : 'none',
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
                                      {searchableShows.some(
                                        (searchableShow) => searchableShow.id === show.slug
                                      ) && (
                                        <a
                                          href={`/${show.slug}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ textDecoration: 'none', color: 'inherit' }}
                                        >
                                          <Chip
                                            sx={{ marginRight: 1, cursor: 'pointer' }}
                                            size="large"
                                            label="🔍 Search"
                                            color="success"
                                            variant="filled"
                                          />
                                        </a>
                                      )}
                                      <Typography
                                        variant="subtitle2"
                                        color="success.main"
                                        sx={{ fontSize: '0.7rem', opacity: 0.6 }}
                                      >
                                        <ArrowUpwardIcon
                                          fontSize="small"
                                          sx={{ verticalAlign: 'middle' }}
                                        />
                                        <b>{showVoteData.totalVotesUp || 0}</b>
                                      </Typography>
                                      {rankMethod === 'combined' && (
                                        <Typography
                                          variant="subtitle2"
                                          color="error.main"
                                          ml={1}
                                          sx={{ fontSize: '0.7rem', opacity: 0.6 }}
                                        >
                                          <ArrowDownwardIcon
                                            fontSize="small"
                                            sx={{ verticalAlign: 'middle' }}
                                          />
                                          <b>{showVoteData.totalVotesDown || 0}</b>
                                        </Typography>
                                      )}
                                    </Box>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                      mt={1}
                                      style={descriptionStyle}
                                    >
                                      {show.description}
                                    </Typography>
                                  </Stack>
                                </Box>
                              </Box>
                              <Box mr={0}>
                                {rankMethod === 'combined' ? (
                                  <>
                                    <Box
                                      display="flex"
                                      flexDirection="column"
                                      justifyContent="space-between"
                                      height="100%"
                                    >
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
                                            !userCanVote || votingStatus?.[show.id]
                                              ? user
                                                ? `🔒 ${timeRemaining}`
                                                : ''
                                              : ''
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
                                            badgeContent={showVoteData.userVotesUp > 0 ? `+${showVoteData.userVotesUp}` : null}
                                            sx={{
                                              color: 'success.main',
                                            }}
                                          >
                                            <MagicVoteWrapper magicEnabled={magicVotesEnabled && userCanVote && !votingStatus[show.id]}>
                                              <StyledFab
                                                aria-label="upvote"
                                                onClick={() =>
                                                  user
                                                    ? handleUpvote(show.id)
                                                    : navigate(
                                                        `/login?dest=${encodeURIComponent(
                                                          location.pathname
                                                        )}`
                                                      )
                                                }
                                                disabled={
                                                  user && (!userCanVote || votingStatus?.[show.id])
                                                }
                                                size="small"
                                                sx={{
                                                  backgroundColor: isUpvoted
                                                    ? 'success.light'
                                                    : 'default',
                                                  ...(magicVotesEnabled && userCanVote && {
                                                    backgroundColor: 'rgba(255, 255, 255, 1)',
                                                    boxShadow: '0 0 15px #4CAF50',
                                                    '&:hover': {
                                                      backgroundColor: 'rgba(255, 255, 255, 1)',
                                                      boxShadow: '0 0 20px #4CAF50',
                                                    },
                                                  }),
                                                }}
                                              >
                                                {userCanVote ? (
                                                  <ArrowUpwardIcon />
                                                ) : isUpvoted ? (
                                                  <ArrowUpwardIcon sx={{ color: 'success.main' }} />
                                                ) : (
                                                  <ArrowUpwardIcon />
                                                )}
                                              </StyledFab>
                                            </MagicVoteWrapper>
                                          </StyledBadge>
                                        </Tooltip>
                                      )}
                                    </Box>

                                    <Box alignItems="center" height="100%">
                                      <Typography
                                        variant="h5"
                                        textAlign="center"
                                        color={votesCount(show) < 0 && 'error.main'}
                                      >
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
                                            !userCanVote || votingStatus?.[show.id]
                                              ? user
                                                ? `🔒 ${timeRemaining}`
                                                : ''
                                              : ''
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
                                            badgeContent={showVoteData.userVotesDown > 0 ? `-${showVoteData.userVotesDown}` : null}
                                            sx={{
                                              color: 'error.main',
                                            }}
                                          >
                                            <MagicVoteWrapper magicEnabled={magicVotesEnabled && userCanVote && !votingStatus[show.id]}>
                                              <StyledFab
                                                aria-label="downvote"
                                                onClick={() =>
                                                  user
                                                    ? handleDownvote(show.id)
                                                    : navigate(
                                                        `/login?dest=${encodeURIComponent(
                                                          location.pathname
                                                        )}`
                                                      )
                                                }
                                                disabled={
                                                  user && (!userCanVote || votingStatus?.[show.id])
                                                }
                                                size="small"
                                                sx={{
                                                  backgroundColor: isDownvoted
                                                    ? 'error.light'
                                                    : 'default',
                                                  ...(magicVotesEnabled && userCanVote && {
                                                    backgroundColor: 'rgba(255, 255, 255, 1)',
                                                    boxShadow: '0 0 15px #4CAF50',
                                                    '&:hover': {
                                                      backgroundColor: 'rgba(255, 255, 255, 1)',
                                                      boxShadow: '0 0 20px #4CAF50',
                                                    },
                                                  }),
                                                }}
                                              >
                                                {isDownvoted ? (
                                                  <ArrowDownwardIcon sx={{ color: 'error.main' }} />
                                                ) : (
                                                  <ArrowDownwardIcon />
                                                )}
                                              </StyledFab>
                                            </MagicVoteWrapper>
                                          </StyledBadge>
                                        </Tooltip>
                                      )}
                                    </Box>
                                  </>
                                ) : (
                                  <Stack
                                    alignItems="center"
                                    spacing={0.7}
                                    direction="column"
                                    height="100%"
                                  >
                                    <Box
                                      display="flex"
                                      flexDirection="column"
                                      justifyContent="space-between"
                                      height="100%"
                                    >
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
                                            !userCanVote || votingStatus?.[show.id]
                                              ? user
                                                ? `🔒 ${timeRemaining}`
                                                : ''
                                              : ''
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
                                            badgeContent={showVoteData.userVotesUp > 0 ? `+${showVoteData.userVotesUp}` : null}
                                          >
                                            <MagicVoteWrapper magicEnabled={magicVotesEnabled && userCanVote && !votingStatus[show.id]}>
                                              <StyledFab
                                                aria-label="upvote"
                                                onClick={() =>
                                                  user
                                                    ? handleUpvote(show.id)
                                                    : navigate(
                                                        `/login?dest=${encodeURIComponent(
                                                          location.pathname
                                                        )}`
                                                      )
                                                }
                                                disabled={
                                                  user && (!userCanVote || votingStatus?.[show.id])
                                                }
                                                size="small"
                                                sx={{
                                                  backgroundColor: isUpvoted
                                                    ? 'success.light'
                                                    : 'default',
                                                  ...(magicVotesEnabled && userCanVote && {
                                                    backgroundColor: 'rgba(255, 255, 255, 1)',
                                                    boxShadow: '0 0 15px #4CAF50',
                                                    '&:hover': {
                                                      backgroundColor: 'rgba(255, 255, 255, 1)',
                                                      boxShadow: '0 0 20px #4CAF50',
                                                    },
                                                  }),
                                                }}
                                              >
                                                {userCanVote ? (
                                                  <ThumbUpIcon />
                                                ) : isUpvoted ? (
                                                  <ThumbUpIcon sx={{ color: 'success.main' }} />
                                                ) : (
                                                  <LockIcon />
                                                )}
                                              </StyledFab>
                                            </MagicVoteWrapper>
                                          </StyledBadge>
                                        </Tooltip>
                                      )}
                                    </Box>
                                    <Typography
                                      variant="h5"
                                      textAlign="center"
                                      color={votesCount(show) < 0 && 'error.main'}
                                    >
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

              {/* Add loading indicator for search */}
              {isSearching && (
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
                  <Typography variant="h6" gutterBottom>Loading</Typography>
                  <CircularProgress />
                </Grid>
              )}

              {loadingMore && (
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="center" my={2}>
                    <CircularProgress />
                  </Box>
                </Grid>
              )}

              {!isSearching && hasMore && sortedSeriesMetadata.length >= INITIAL_ITEMS && (
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
              
              {!isSearching && (
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
                    What's missing?
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
              )}
            </>
          )}
        </Grid>
      </Container>
      <Dialog maxWidth="md" fullWidth onClose={toggleOpenAddRequest} open={openAddRequest}>
        <DialogTitle>
          <Typography variant="h4" textAlign="center">
            Request Series
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ paddingTop: 2 }}>
          <TvdbSearch
            typeFilter={['series', 'movie']}
            onClear={() => {
              setSelectedRequest();
            }}
            onSelect={(value) => {
              setSelectedRequest(value);
            }}
          />
          {selectedRequest && (
            <Grid container spacing={2} alignItems="center" mt={2}>
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
                  }}
                />
              </Grid>
              <Grid item xs>
                <Typography variant="h4">
                  {selectedRequest.name}
                  <Chip size="small" sx={{ ml: 1 }} label={selectedRequest.type} />
                </Typography>
                <Typography variant="body2">{selectedRequest.year}</Typography>
                <Typography
                  variant="body1"
                  mt={2}
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {selectedRequest.overview}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <LoadingButton
            onClick={submitRequest}
            loading={submittingRequest}
            disabled={!selectedRequest || submittingRequest}
            variant="contained"
          >
            Submit Request
          </LoadingButton>
        </DialogActions>
      </Dialog>
      <Dialog
        open={showRefreshDialog}
        onClose={() => setShowRefreshDialog(false)}
      >
        <DialogTitle>Refresh Vote Aggregations</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to refresh the vote aggregations? This process may take a few minutes.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRefreshDialog(false)}>Cancel</Button>
          <Button onClick={refreshVoteAggregations} autoFocus>
            Refresh
          </Button>
        </DialogActions>
      </Dialog>
      <FloatingCard 
        enabled={magicVotesEnabled}
        onClick={handleMagicVotesToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleMagicVotesToggle();
          }
        }}
        tabIndex={0}
        role="button"
        aria-pressed={magicVotesEnabled}
        sx={{
          backgroundColor: magicVotesEnabled ? theme.palette.success.main : 'rgba(0, 0, 0, 1)',
          overflow: 'visible', // Ensure the NEW! indicator is fully visible
        }}
      >
        <ShimmerWrapper enabled={magicVotesEnabled} />
        {/* NEW! indicator */}
        {!hasSeenMagicVotes && (
          <Box
            sx={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              backgroundColor: 'red',
              color: 'white',
              padding: '2px 6px',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              borderRadius: '4px',
              boxShadow: '0 0 5px rgba(0,0,0,0.3)',
              zIndex: 1,
              transform: 'translate(0, 10%) rotate(15deg)',
              [theme.breakpoints.down('sm')]: {
                top: '8px',
                right: '8px',
                transform: 'translate(0, -50%) rotate(15deg)',
              },
            }}
          >
            NEW!
          </Box>
        )}

        <CardContent sx={{ 
          position: 'relative',
          zIndex: 2,
          display: 'flex', 
          alignItems: 'center', 
          padding: '12px 16px !important',
          gap: 2,
          '&:last-child': { pb: '12px' },
          // Add responsive padding
          [theme.breakpoints.down('sm')]: {
            padding: '16px 24px !important',
            '&:last-child': { pb: '16px' },
          }
        }}>
          <AutoFixHighRoundedIcon
            sx={{
              color: magicVotesEnabled ? 'black' : theme.palette.success.main,
              fontSize: '2rem',
            }}
          />
          <Typography 
            variant="body1" 
            sx={{ 
              color: magicVotesEnabled ? 'black' : 'white',
              flexGrow: 1
            }}
          >
            <b>{magicVotesEnabled ? 'Magic Votes ON' : 'Enable Magic Votes'}</b><br />
            Boost your voting power
          </Typography>
          <Switch
            checked={magicVotesEnabled}
            onChange={handleMagicVotesToggle}
            sx={{
              '& .MuiSwitch-switchBase': {
                color: magicVotesEnabled ? 'black' : theme.palette.success.main,
              },
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: 'black', // Always black when checked
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: 'black', // Track becomes black when enabled
              },
            }}
          />
        </CardContent>
      </FloatingCard>

      {/* Updated Boost Vote Dialog */}
      <Dialog
        open={magicVoteDialogOpen}
        onClose={() => setMagicVoteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'black',
            color: 'white',
            borderRadius: 2,
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            p: 3,
            position: 'relative',
          }}
        >
          {/* Cancel Button with X Icon */}
          <IconButton
            aria-label="close"
            onClick={() => setMagicVoteDialogOpen(false)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'white',
            }}
          >
            <CloseIcon />
          </IconButton>

          
          {/* Boost Upvote/Downvote Heading */}
          <Typography 
            variant="h3" 
            align="left" 
            gutterBottom 
            sx={{ 
              color: magicVoteBoost > 0 ? '#54d62c' : '#ff4842', // Green for upvote, red for downvote
              mb: 2,
            }}
          >
            Boost {magicVoteBoost > 0 ? 'Upvote' : 'Downvote'}
          </Typography>

          {/* Series Title */}
          <Typography variant="p" align="left" gutterBottom sx={{ color: 'white', }}>
            {magicVoteBoost > 0 ? 'Upvoting' : 'Downvoting'} <b>{magicVoteSeries?.name}</b>. Want to boost it?
          </Typography>

          {/* Multiplier Selection */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Stack 
              direction="row" 
              spacing={1} // Reduced spacing between buttons
              sx={{ width: '100%', justifyContent: 'center' }}
            >
              {[1, 5, 10].map((multiplier) => (
                <Box 
                  key={multiplier} 
                  sx={{ 
                    textAlign: 'center',
                    flex: '1 1 0',
                    minWidth: 0, // Allow shrinking below content size
                    maxWidth: 120 // Prevent buttons from getting too large
                  }}
                >
                  <Button
                    variant={magicVoteMultiplier === multiplier ? 'contained' : 'outlined'}
                    onClick={() => setMagicVoteMultiplier(multiplier)}
                    sx={{
                      fontSize: { xs: '1.25rem', sm: '1.5rem' }, // Smaller font on mobile
                      width: '100%', // Take full width of container
                      height: { xs: 60, sm: 80 }, // Smaller height on mobile
                      minWidth: 0, // Allow shrinking below content size
                      px: 1, // Minimal horizontal padding
                      color: multiplier === 1 ? 'white' : (magicVoteMultiplier === multiplier ? 'black' : 'white'),
                      borderColor: magicVoteBoost > 0 ? '#54d62c' : '#ff4842',
                      backgroundColor:
                        magicVoteMultiplier === multiplier 
                          ? (magicVoteBoost > 0 
                              ? `rgba(84, 214, 44, ${multiplier === 1 ? 0.5 : multiplier === 5 ? 0.85 : 1})`
                              : `rgba(255, 72, 66, ${multiplier === 1 ? 0.5 : multiplier === 5 ? 0.85 : 1})`)
                          : 'transparent',
                      '&:hover': {
                        backgroundColor:
                          magicVoteMultiplier === multiplier
                            ? (magicVoteBoost > 0 
                                ? `rgba(84, 214, 44, ${multiplier === 1 ? 0.5 : multiplier === 5 ? 0.85 : 1})`
                                : `rgba(255, 72, 66, ${multiplier === 1 ? 0.5 : multiplier === 5 ? 0.85 : 1})`)
                            : (magicVoteBoost > 0 ? 'rgba(84, 214, 44, 0.1)' : 'rgba(255, 72, 66, 0.1)'),
                      },
                    }}
                  >
                    {multiplier}×
                  </Button>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mt: 1, 
                      color: magicVoteMultiplier === multiplier ? 'white' : 'grey.500',
                      fontWeight: magicVoteMultiplier === multiplier ? 700 : 400,
                      gap: 0.5,
                      fontSize: { xs: '0.7rem', sm: '0.75rem' } // Slightly smaller on mobile
                    }}
                  >
                    {multiplier !== 1 && <AutoFixHighRoundedIcon sx={{ fontSize: '1rem' }} />}
                    {multiplier === 1 ? 'Free' : multiplier === 5 ? '1\u00A0credit' : '2\u00A0credits'}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Remove the old Cost Information section */}

          {/* Update the Confirm Button color based on vote type */}
          <LoadingButton
            onClick={() => {
              const requiredCredits = magicVoteMultiplier === 1 ? 0 : magicVoteMultiplier === 5 ? 1 : 2;
              const hasEnoughCredits = user?.userDetails?.credits >= requiredCredits;
              const isPro = user?.userDetails?.magicSubscription === 'true';
            
              if (!hasEnoughCredits && !isPro) {
                navigate(`/pro?dest=${encodeURIComponent(location.pathname)}`);
                return;
              }
              handleMagicVoteSubmit();
            }}
            variant="contained"
            loading={isSubmittingMagicVote}
            disabled={
              user?.userDetails?.magicSubscription === 'true' && 
              user?.userDetails?.credits < (magicVoteMultiplier === 1 ? 0 : magicVoteMultiplier === 5 ? 1 : 2)
            }
            fullWidth
            sx={{
              mt: 4,
              py: 1.5,
              fontSize: '1.2rem',
              backgroundColor: magicVoteBoost > 0 ? '#54d62c' : '#ff4842',
              color: 'black',
              '&:hover': {
                backgroundColor: magicVoteBoost > 0 ? '#45b233' : '#ff3333',
              },
            }}
          >
            {/* ThumbUp Icon if boosting upvote or ThumbDown Icon if boosting downvote */}
            {magicVoteBoost > 0 ?
              <ThumbUpIcon sx={{ fontSize: '1.5rem', mr: 1 }} /> :
              <ThumbDownIcon sx={{ fontSize: '1.5rem', mr: 1 }} />}
            {(() => {
              const requiredCredits = magicVoteMultiplier === 1 ? 0 : magicVoteMultiplier === 5 ? 1 : 2;
              const hasEnoughCredits = user?.userDetails?.credits >= requiredCredits;
              const isPro = user?.userDetails?.magicSubscription === 'true';

              if (!hasEnoughCredits) {
                if (!isPro) {
                  return 'Need Credits?';
                }
                return 'Not enough credits';
              }
              
              return `Add ${magicVoteMultiplier !== 1 ? `${magicVoteMultiplier} ` : ''} ${magicVoteBoost > 0 ? 'Upvote' : 'Downvote'}${magicVoteMultiplier !== 1 ? `s` : ''}`;
            })()}
          </LoadingButton>
        </Box>
      </Dialog>
    </>
  );
}

import React, { useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { ArrowUpward, ArrowDownward, Search, Close, ThumbUp, Whatshot, Lock, NewReleasesOutlined, Refresh } from '@mui/icons-material';
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

  // Add this line with the other refs
  const searchInputRef = useRef(null);

  // Add these new state variables near the top with other state declarations
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);

  // Create a debounced function
  const debouncedSetSearchText = useCallback(
    debounce((text) => {
      setDebouncedSearchText(text);
    }, 500),
    []
  );

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
            const seriesId = item.seriesId;
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

  // Modify handleSearchChange to show loading immediately
  const handleSearchChange = (event) => {
    const newSearchText = event.target.value;
    setSearchText(newSearchText);
    if (newSearchText) {
      setIsSearching(true); // Show loading immediately when typing
    } else {
      setIsSearching(false);
    }
    debouncedSetSearchText(newSearchText);
  };

  // Update the useEffect that handles search to properly load the initial list
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

          const hits = response.hits;
          
          // Map over the hits to get series IDs and ranks
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
          setIsSearching(false); // Remove loading state after search completes
        }
      };
      fetchSearchResults();
    } else if (debouncedSearchText === '') { // Explicitly check for empty string
      // Fetch initial data when search is cleared
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

  // Modify the clearSearch function
  const clearSearch = () => {
    setSearchText('');
    setIsSearching(true);
    debouncedSetSearchText('');
    // Focus the input field
    searchInputRef.current?.focus();
  };

  // **Update sortedSeriesMetadata without assigning ranks**
  const sortedSeriesMetadata = useMemo(() => {
    if (seriesMetadata.length === 0) return [];

    const searchFilteredShows = seriesMetadata.filter((show) =>
      show.name.toLowerCase().includes(searchText.toLowerCase())
    );

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

    // Do not assign rank here
    return sortedShows;
  }, [seriesMetadata, searchText, voteData, rankMethod, safeCompareSeriesTitles]);

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
            const seriesId = item.seriesId;
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

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      searchInputRef.current?.blur(); // Remove focus from the input
    }
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
                <ThumbUp color="success" sx={{ mr: 1 }} />
                Most Upvoted
              </ToggleButton>
              <ToggleButton value="combined" aria-label="battleground">
                <Whatshot color="error" sx={{ mr: 1 }} />
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
              <NewReleasesOutlined sx={{ mr: 1 }} />
              Requested
            </ToggleButton>
            <ToggleButton value="requested" aria-label="requested">
              <GridSearchIcon sx={{ mr: 1 }} />
              Searchable
            </ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              fullWidth
              size="large"
              variant="outlined"
              value={searchText}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown} // Add this line
              placeholder="Filter by name..."
              inputRef={searchInputRef}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: (searchText || isSearching) && (
                  <InputAdornment position="end">
                    <IconButton edge="end" onClick={clearSearch} disabled={isSearching && !searchText}>
                      {isSearching ? (
                        <CircularProgress size={20} sx={{ color: 'white' }} />
                      ) : (
                        <Close />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
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
                  <Refresh />
                )}
              </IconButton>
            )}
          </Box>
        </Box>

        <Grid container style={{ minWidth: '100%' }}>
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
                {isSearching ? 'Searching' : 'Loading'}
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
                  const isUpvoted = showVoteData.lastBoost === 1 && !userCanVote;
                  const isDownvoted = showVoteData.lastBoost === -1 && !userCanVote;

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
                                        <ArrowUpward
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
                                          <ArrowDownward
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
                                            badgeContent={showVoteData.userVotesUp > 0 ? `+${showVoteData.userVotesUp}` : null}
                                            sx={{
                                              color: 'success.main',
                                            }}
                                          >
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
                                              }}
                                            >
                                              {userCanVote ? (
                                                <ArrowUpward />
                                              ) : isUpvoted ? (
                                                <ArrowUpward sx={{ color: 'success.main' }} />
                                              ) : (
                                                <ArrowUpward />
                                              )}
                                            </StyledFab>
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
                                            badgeContent={showVoteData.userVotesDown > 0 ? `-${showVoteData.userVotesDown}` : null}
                                            sx={{
                                              color: 'error.main',
                                            }}
                                          >
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
                                              }}
                                            >
                                              {isDownvoted ? (
                                                <ArrowDownward sx={{ color: 'error.main' }} />
                                              ) : (
                                                <ArrowDownward />
                                              )}
                                            </StyledFab>
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
                                            badgeContent={showVoteData.userVotesUp > 0 ? `+${showVoteData.userVotesUp}` : null}
                                          >
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
                                              }}
                                            >
                                              {userCanVote ? (
                                                <ThumbUp />
                                              ) : isUpvoted ? (
                                                <ThumbUp sx={{ color: 'success.main' }} />
                                              ) : (
                                                <Lock />
                                              )}
                                            </StyledFab>
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

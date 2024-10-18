import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
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
  Tabs,
  Tab,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  Checkbox,
  FormControlLabel,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { ArrowUpward, ArrowDownward, Search, Close, ThumbUp, Whatshot, Lock, NewReleasesOutlined } from '@mui/icons-material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import FlipMove from 'react-flip-move';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LoadingButton } from '@mui/lab';
import { GridFilterAltIcon, GridSearchIcon } from '@mui/x-data-grid';
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
  const [votes, setVotes] = useState({});
  const [filteredSeriesData, setFilteredSeriesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [votingStatus, setVotingStatus] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [userVotesUp, setUserVotesUp] = useState({});
  const [userVotesDown, setUserVotesDown] = useState({});
  const [searchText, setSearchText] = useState('');
  const [upvotes, setUpvotes] = useState({});
  const [downvotes, setDownvotes] = useState({});
  const [ableToVote, setAbleToVote] = useState({});
  const [rankMethod, setRankMethod] = useState('upvotes');
  const [lastBoost, setLastBoost] = useState({});
  const [nextVoteTimes, setNextVoteTimes] = useState({});
  const [timeRemaining, setTimeRemaining] = useState('');
  const [openAddRequest, setOpenAddRequest] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState();
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [hideSearchable, setHideSearchable] = useState(false);
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
  const itemsPerPage = 15; // Number of items to render per page
  const [currentPage, setCurrentPage] = useState(0);

  const [sortedSeriesIds, setSortedSeriesIds] = useState([]); // New state to store sorted IDs

  const [refreshData, setRefreshData] = useState(false); // Trigger data refresh

  const location = useLocation();

  const theme = useTheme();

  const { user } = useContext(UserContext);

  const toggleOpenAddRequest = () => {
    setOpenAddRequest(!openAddRequest);
  };

  // Add cache variables
  const seriesCache = useRef({});
  const votesCache = useRef(null);

  const [allSeriesData, setAllSeriesData] = useState(null); // State to store all series data

  const [loadedImages, setLoadedImages] = useState({});

  const [ranks, setRanks] = useState({});

  const [upvotesRanks, setUpvotesRanks] = useState([]);
  const [battlegroundRanks, setBattlegroundRanks] = useState([]);

  const [isTopList, setIsTopList] = useState(true);
  const [topListExhausted, setTopListExhausted] = useState(false);

  const handleImageLoad = (showId) => {
    setLoadedImages(prev => ({ ...prev, [showId]: true }));
  };

  useEffect(() => {
    const savedRankMethod = localStorage.getItem('rankMethod');
    if (savedRankMethod) {
      setRankMethod(savedRankMethod);
    }
  }, []);

  useEffect(() => {
    if (searchText) {
      setIsSearching(true);
      if (allSeriesData === null) {
        fetchAllSeriesData();
      } else {
        filterAndSortSeriesData(allSeriesData);
      }
    } else {
      setIsSearching(false);
      setFilteredSeriesData([]);
      setSeriesMetadata([]);
      setSortedSeriesIds([]);
      setCurrentPage(0);
      fetchVoteData();
    }
  }, [searchText, rankMethod, voteData, isTopList]);

  const fetchVoteData = async () => {
    try {
      if (votesCache.current) {
        const voteDataResponse = votesCache.current;

        // Use cached data
        setVoteData(voteDataResponse);
        setVotes(voteDataResponse.votes);
        setUserVotes(user ? voteDataResponse.userVoteData?.votesUp : {});
        setUserVotesUp(user ? voteDataResponse.userVoteData?.votesUp : {});
        setUserVotesDown(user ? voteDataResponse.userVoteData?.votesDown : {});
        setAbleToVote(user ? voteDataResponse.userVoteData?.ableToVote : {});
        setLastBoost(user ? voteDataResponse.userVoteData?.lastBoost : {});
        setNextVoteTimes(voteDataResponse.userVoteData?.nextVoteTime || {});

        const seriesIds = Object.keys(voteDataResponse.votes);

        // Sort the series IDs based on the selected rank method
        let newSortedSeriesIds = [];
        switch (rankMethod) {
          case 'combined':
            newSortedSeriesIds = seriesIds.sort((a, b) => {
              const voteDiffA = voteDataResponse.votes[a].upvotes - voteDataResponse.votes[a].downvotes;
              const voteDiffB = voteDataResponse.votes[b].upvotes - voteDataResponse.votes[b].downvotes;
              return voteDiffB - voteDiffA || safeCompareSeriesTitles(a, b);
            });
            break;
          case 'downvotes':
            newSortedSeriesIds = seriesIds.sort((a, b) => {
              const downvoteDiff = voteDataResponse.votes[b].downvotes - voteDataResponse.votes[a].downvotes;
              return downvoteDiff || safeCompareSeriesTitles(a, b);
            });
            break;
          default: // Upvotes
            newSortedSeriesIds = seriesIds.sort((a, b) => {
              const upvoteDiff = voteDataResponse.votes[b].upvotes - voteDataResponse.votes[a].upvotes;
              return upvoteDiff || safeCompareSeriesTitles(a, b);
            });
        }

        // Update the sortedSeriesIds state
        setSortedSeriesIds(newSortedSeriesIds);

        // Fetch only the initial page
        fetchSeriesData(newSortedSeriesIds, 0, false);
      } else {
        if (!loadingMore) {
          setLoading(true);
        }
        try {
          // Fetch vote data from the appropriate endpoint
          const endpoint = isTopList ? '/vote/list/top' : '/vote/list';
          const voteDataResponse = await API.get('publicapi', endpoint);

          // Save to cache
          votesCache.current = voteDataResponse;

          setVoteData(voteDataResponse);
          setVotes(voteDataResponse.votes);

          setUserVotes(user ? voteDataResponse.userVoteData?.votesUp : {});
          setUserVotesUp(user ? voteDataResponse.userVoteData?.votesUp : {});
          setUserVotesDown(user ? voteDataResponse.userVoteData?.votesDown : {});
          setAbleToVote(user ? voteDataResponse.userVoteData?.ableToVote : {});
          setLastBoost(user ? voteDataResponse.userVoteData?.lastBoost : {});
          setNextVoteTimes(voteDataResponse.userVoteData?.nextVoteTime || {});

          const seriesIds = Object.keys(voteDataResponse.votes);

          // Sort the series IDs based on the selected rank method
          let newSortedSeriesIds = [];
          switch (rankMethod) {
            case 'combined':
              newSortedSeriesIds = seriesIds.sort((a, b) => {
                const voteDiffA = voteDataResponse.votes[a].upvotes - voteDataResponse.votes[a].downvotes;
                const voteDiffB = voteDataResponse.votes[b].upvotes - voteDataResponse.votes[b].downvotes;
                return voteDiffB - voteDiffA || safeCompareSeriesTitles(a, b);
              });
              break;
            case 'downvotes':
              newSortedSeriesIds = seriesIds.sort((a, b) => {
                const downvoteDiff = voteDataResponse.votes[b].downvotes - voteDataResponse.votes[a].downvotes;
                return downvoteDiff || safeCompareSeriesTitles(a, b);
              });
              break;
            default: // Upvotes
              newSortedSeriesIds = seriesIds.sort((a, b) => {
                const upvoteDiff = voteDataResponse.votes[b].upvotes - voteDataResponse.votes[a].upvotes;
                return upvoteDiff || safeCompareSeriesTitles(a, b);
              });
          }

          // Update the sortedSeriesIds state
          setSortedSeriesIds(newSortedSeriesIds);

          // Fetch only the initial page
          fetchSeriesData(newSortedSeriesIds, 0, false);
        } catch (error) {
          console.error('Error fetching vote data:', error);
        } finally {
          if (!loadingMore) {
            setLoading(false);
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchVoteData:', error);
    }
  };

  const fetchSeriesData = async (sortedIds, page, isLoadingMore) => {
    try {
      const startIdx = page * itemsPerPage;
      const endIdx = startIdx + itemsPerPage;
      const paginatedSeriesIds = sortedIds.slice(startIdx, endIdx);

      // Create placeholder data for all series in this page
      const placeholderSeriesData = paginatedSeriesIds.map(id => ({
        id,
        name: 'Loading...',
        description: 'Loading description...',
        image: '', // Empty string for placeholder image
        rank: null // Initialize rank as null
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

        cachedSeriesData.push(...fetchedSeriesData);
      }

      // Update seriesMetadata with actual data
      setSeriesMetadata((prevSeriesMetadata) => {
        const updatedMetadata = [...prevSeriesMetadata];
        cachedSeriesData.forEach((show) => {
          const index = updatedMetadata.findIndex(item => item.id === show.id);
          if (index !== -1) {
            updatedMetadata[index] = { ...show, rank: null }; // Set rank to null initially
          }
        });
        return updatedMetadata;
      });

      // Recalculate ranks after fetching data
      recalculateRanks();

    } catch (error) {
      console.error('Error fetching series data:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Update the recalculateRanks function
  const recalculateRanks = useCallback(() => {
    let currentRank = 1;
    const newRanks = {};
    const seriesToRank = sortedSeriesIds.map(id => seriesCache.current[id]);

    seriesToRank.forEach((show) => {
      if (show && (!hideSearchable || !searchableShows.some((searchableShow) => searchableShow.id === show.slug))) {
        newRanks[show.id] = currentRank;
        currentRank += 1;
      }
    });

    setRanks(newRanks);
    
    // Update seriesMetadata with new ranks
    setSeriesMetadata(prevMetadata => 
      prevMetadata.map(show => ({ ...show, rank: newRanks[show.id] || null }))
    );
  }, [hideSearchable, searchableShows, sortedSeriesIds]);

  // Call recalculateRanks after data loads
  useEffect(() => {
    if (!loading && seriesMetadata.length > 0) {
      recalculateRanks();
    }
  }, [loading, recalculateRanks]);

  // Update ranks when rankMethod changes
  useEffect(() => {
    recalculateRanks();
  }, [rankMethod, recalculateRanks]);

  // Update ranks when hideSearchable changes
  useEffect(() => {
    recalculateRanks();
  }, [hideSearchable, recalculateRanks]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);

    if (isTopList && (nextPage + 1) * itemsPerPage > 100) {
      setIsTopList(false);
      setTopListExhausted(true);
      votesCache.current = null; // Clear cache to force a new fetch
      fetchVoteData(); // Fetch the full list
    } else {
      fetchSeriesData(sortedSeriesIds, nextPage, true);
    }
  };

  const fetchAllSeriesData = async () => {
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
  };

  const filterAndSortSeriesData = (data = allSeriesData) => {
    try {
      if (!data) return;

      const searchFilteredShows = data.filter(
        (show) => show.name.toLowerCase().includes(searchText.toLowerCase())
      );

      // eslint-disable-next-line prefer-const
      let sortedShows = [...searchFilteredShows];

      if (sortedShows.length > 0) {
        switch (rankMethod) {
          case 'combined':
            sortedShows.sort((a, b) => {
              const voteDiffA = (voteData.votes[a.id]?.upvotes || 0) - (voteData.votes[a.id]?.downvotes || 0);
              const voteDiffB = (voteData.votes[b.id]?.upvotes || 0) - (voteData.votes[b.id]?.downvotes || 0);
              return voteDiffB - voteDiffA || a.name.localeCompare(b.name);
            });
            break;
          case 'downvotes':
            sortedShows.sort((a, b) => {
              const downvoteDiff = (voteData.votes[b.id]?.downvotes || 0) - (voteData.votes[a.id]?.downvotes || 0);
              return downvoteDiff || a.name.localeCompare(b.name);
            });
            break;
          default: // Upvotes
            sortedShows.sort((a, b) => {
              const upvoteDiff = (voteData.votes[b.id]?.upvotes || 0) - (voteData.votes[a.id]?.upvotes || 0);
              return upvoteDiff || a.name.localeCompare(b.name);
            });
        }
      }

      setFilteredSeriesData(sortedShows);
      setSortedSeriesIds(sortedShows.map(show => show.id));
      setCurrentPage(0);

      // Update seriesMetadata with existing ranks
      setSeriesMetadata(sortedShows.map(show => ({ ...show, rank: ranks[show.id] || null })));
    } catch (error) {
      console.error('Error in filterAndSortSeriesData:', error);
      setFilteredSeriesData([]);
      setSortedSeriesIds([]);
      setSeriesMetadata([]);
    }
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

      // Update votes locally
      setVotes((prevVotes) => {
        const newVotes = { ...prevVotes };
        if (!newVotes[seriesId]) {
          newVotes[seriesId] = { upvotes: 0, downvotes: 0 };
        }
        if (boost === 1) {
          newVotes[seriesId].upvotes += 1;
        } else if (boost === -1) {
          newVotes[seriesId].downvotes += 1;
        }
        return newVotes;
      });

      // Update user votes
      if (boost === 1) {
        setUserVotesUp((prev) => ({ ...prev, [seriesId]: (prev[seriesId] || 0) + 1 }));
      } else if (boost === -1) {
        setUserVotesDown((prev) => ({ ...prev, [seriesId]: (prev[seriesId] || 0) + 1 }));
      }

      // Update ranks
      updateRanks();

      setVotingStatus((prevStatus) => ({ ...prevStatus, [seriesId]: false }));
      setLastBoost((prevLastBoost) => ({ ...prevLastBoost, [seriesId]: boost }));

      // Update ableToVote and nextVoteTimes
      setAbleToVote((prev) => ({ ...prev, [seriesId]: (prev[seriesId] || 1) - 1 }));
      setNextVoteTimes((prev) => {
        const now = new Date();
        now.setHours(now.getHours() + 24);
        return { ...prev, [seriesId]: now.toISOString() };
      });

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

  const handleSearchChange = (event) => {
    const newSearchText = event.target.value;
    setSearchText(newSearchText);
    setIsSearching(!!newSearchText);
  };

  const handleRankMethodChange = useCallback((event, newValue) => {
    // Only update if a button is selected (newValue is not null)
    if (newValue !== null) {
      localStorage.setItem('rankMethod', newValue);
      setRankMethod(newValue);
      setCurrentPage(0);
      setSeriesMetadata([]);
      setRefreshData((prev) => !prev);
    }
  }, []);

  const votesCount = (show) => {
    if (!voteData.votes || !voteData.votes[show.id]) {
      return 0;
    }
    
    switch (rankMethod) {
      case 'upvotes':
        return voteData.votes[show.id].upvotes || 0;
      case 'downvotes':
        return voteData.votes[show.id].downvotes || 0;
      case 'combined':
      default:
        return (voteData.votes[show.id].upvotes || 0) - (voteData.votes[show.id].downvotes || 0);
    }
  };

  const calculateTimeRemaining = (targetDateTime) => {
    const targetTime = new Date(targetDateTime);
    const now = new Date();
    const remainingTime = targetTime - now;

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

  const safeCompareSeriesTitles = (a, b) => {
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
  };

  useEffect(() => {
    if (voteData.votes) {
      updateRanks();
    }
  }, [voteData.votes, hideSearchable, searchableShows]);

  const updateRanks = () => {
    const seriesIds = Object.keys(voteData.votes);
    
    const upvotesOrder = [...seriesIds].sort((a, b) => {
      const upvoteDiff = (voteData.votes[b].upvotes || 0) - (voteData.votes[a].upvotes || 0);
      return upvoteDiff || safeCompareSeriesTitles(a, b);
    });

    const battlegroundOrder = [...seriesIds].sort((a, b) => {
      const voteDiffA = (voteData.votes[a].upvotes || 0) - (voteData.votes[a].downvotes || 0);
      const voteDiffB = (voteData.votes[b].upvotes || 0) - (voteData.votes[b].downvotes || 0);
      return voteDiffB - voteDiffA || safeCompareSeriesTitles(a, b);
    });

    const filteredUpvotesRanks = upvotesOrder
      .filter(id => !hideSearchable || !searchableShows.some(show => show.id === seriesCache.current[id]?.slug))
      .reduce((acc, id, index) => {
        acc[id] = index + 1;
        return acc;
      }, {});

    const filteredBattlegroundRanks = battlegroundOrder
      .filter(id => !hideSearchable || !searchableShows.some(show => show.id === seriesCache.current[id]?.slug))
      .reduce((acc, id, index) => {
        acc[id] = index + 1;
        return acc;
      }, {});

    setUpvotesRanks(filteredUpvotesRanks);
    setBattlegroundRanks(filteredBattlegroundRanks);
  };

  // useEffect(() => {
  //   localStorage.setItem('hideSearchable', JSON.stringify(hideSearchable));
  // }, [hideSearchable]);

  const handleDisplayOptionChange = (event, newValue) => {
    // Only update if a button is selected (newValue is not null)
    if (newValue !== null) {
      setDisplayOption(newValue);
      localStorage.setItem('displayOption', newValue);
    }
  };

  // Update the filtering logic in your component
  const filterShows = (show) => {
    const isSearchable = searchableShows.some((searchableShow) => searchableShow.id === show.slug);
    switch (displayOption) {
      case 'hideAvailable':
        return !isSearchable;
      case 'requested':
        return isSearchable;
      default: // 'showAll'
        return true;
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
          <Typography variant="subtitle2">Upvote the most memeable shows and movies</Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 3 }}>
          <ToggleButtonGroup
            value={rankMethod}
            exclusive
            onChange={handleRankMethodChange}
            aria-label="ranking method"
            fullWidth
            size="large"
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
            <ToggleButton value="hideAvailable" aria-label="hide available">
              {/* Changed to AssignmentIcon for "Requested" option */}
              <NewReleasesOutlined sx={{ mr: 1 }} />
              Requested
            </ToggleButton>
            <ToggleButton value="requested" aria-label="requested">
              {/* Changed to SearchIcon for "Available" option */}
              <GridSearchIcon sx={{ mr: 1 }} />
              Available
            </ToggleButton>
            <ToggleButton value="showAll" aria-label="show all">
              {/* Changed to FilterAltIcon for "Both" option */}
              <GridFilterAltIcon sx={{ mr: 1 }} />
              Both
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
                  <IconButton edge="end" onClick={() => setSearchText('')}>
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
                  const rank = rankMethod === 'upvotes' ? upvotesRanks[show.id] : battlegroundRanks[show.id];
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
                                      badgeContent={rank ? `#${rank}` : null}
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
                                        <b>{voteData.votes[show.id]?.upvotes || 0}</b>
                                      </Typography>
                                      {rankMethod === 'combined' && (
                                        <Typography
                                          variant="subtitle2"
                                          color="error.main"
                                          ml={1}
                                          sx={{ fontSize: '0.7rem', opacity: 0.6 }}
                                        >
                                          <ArrowDownward fontSize="small" sx={{ verticalAlign: 'middle' }} />
                                          <b>{voteData.votes[show.id]?.downvotes || 0}</b>
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
                                            // TODO: Add the ISO 8601 string response here
                                            // Here's info about that: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
                                            // It's always UTC, so it shouldn't matter what their timezone is, it should show right.
                                            calculateTimeRemaining(nextVoteTimes[show.id]);
                                          }}
                                          title={
                                            // This is where we show two different options depending on vote status
                                            // TODO: Show how much time remains until the next vote
                                            (ableToVote[show.id] !== undefined && ableToVote[show.id] !== true) || votingStatus[show.id]
                                              ? user ? `🔒 ${timeRemaining}`
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
                                            badgeContent={userVotesUp[show.id] ? `+${userVotesUp[show.id] || 0}` : null}
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
                                                ((ableToVote[show.id] !== undefined &&
                                                  ableToVote[show.id] !== true) ||
                                                  !!votingStatus[show.id])
                                              }
                                              size="small"
                                            >
                                              {lastBoost[show.id] === -1 &&
                                                ableToVote[show.id] !== true &&
                                                rankMethod === 'upvotes' ? (
                                                <Lock />
                                              ) : (
                                                <ArrowUpward
                                                  sx={{
                                                    color:
                                                      lastBoost[show.id] === 1 && ableToVote[show.id] !== true
                                                        ? 'success.main'
                                                        : 'inherit',
                                                  }}
                                                />
                                              )}
                                              {/* <ArrowUpward
                                              sx={{
                                                color: lastBoost[show.id] === 1 && ableToVote[show.id] !== true ? 'success.main' : 'inherit',
                                              }}
                                            /> */}
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
                                            calculateTimeRemaining(nextVoteTimes[show.id]);
                                          }}
                                          title={
                                            (ableToVote[show.id] !== undefined && ableToVote[show.id] !== true) || votingStatus[show.id]
                                              ? user ? `🔒 ${timeRemaining}`
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
                                            badgeContent={userVotesDown[show.id] || 0}
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
                                                ((ableToVote[show.id] !== undefined &&
                                                  ableToVote[show.id] !== true) ||
                                                  !!votingStatus[show.id])
                                              }
                                              size="small"
                                            >
                                              <ArrowDownward
                                                sx={{
                                                  color:
                                                    lastBoost[show.id] === -1 && ableToVote[show.id] !== true
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
                                            // TODO: Add the ISO 8601 string response here
                                            // Here's info about that: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
                                            // It's always UTC, so it shouldn't matter what their timezone is, it should show right.
                                            calculateTimeRemaining(nextVoteTimes[show.id]);
                                          }}
                                          title={
                                            // This is where we show two different options depending on vote status
                                            // TODO: Show how much time remains until the next vote
                                            (ableToVote[show.id] !== undefined && ableToVote[show.id] !== true) || votingStatus[show.id]
                                              ? user ? `🔒 ${timeRemaining}`
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
                                            badgeContent={userVotesUp[show.id] ? `+${userVotesUp[show.id] || 0}` : null}
                                          >
                                            <StyledFab
                                              aria-label="upvote"
                                              onClick={() =>
                                                user
                                                  ? handleUpvote(show.id)
                                                  : navigate(`/login?dest=${encodeURIComponent(location.pathname)}`)
                                              }
                                              disabled={user && ((ableToVote[show.id] !== undefined && ableToVote[show.id] !== true) || votingStatus[show.id])}
                                              size="small"
                                            >
                                              {lastBoost[show.id] === -1 &&
                                                ableToVote[show.id] !== true &&
                                                rankMethod === 'upvotes' ? (
                                                <Lock />
                                              ) : (
                                                <ThumbUp
                                                  sx={{
                                                    color:
                                                      lastBoost[show.id] === 1 && ableToVote[show.id] !== true
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
                                      {voteData.votes[show.id]?.upvotes || 0}
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

              {!isSearching &&
                seriesMetadata.length < sortedSeriesIds.length && (
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
                      {topListExhausted ? 'Load More' : 'Load Full List'}
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
                        // window.open('https://forms.gle/8CETtVbwYoUmxqbi7', '_blank')
                        if (user) {
                            toggleOpenAddRequest();
                        } else {
                            navigate('/signup')
                        }
                    }}
                    style={{
                        marginTop: 10,
                        marginBottom: 50,
                        backgroundColor: 'rgb(84, 214, 44)',
                        color: 'black'  // Set the text color to black
                    }}
                    startIcon={<AddIcon />}  // Add the plus icon at the beginning of the button
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
          <TvdbSearch typeFilter={['series', 'movie']} onClear={(value) => { setSelectedRequest() }} onSelect={(value) => { setSelectedRequest(value) }} />
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
          <LoadingButton onClick={submitRequest} loading={submittingRequest} disabled={!!selectedRequest || submittingRequest} variant='contained'>
            Submit Request
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { ArrowUpward, ArrowDownward, Search, Close, ThumbUp, Whatshot, Lock } from '@mui/icons-material';
import FlipMove from 'react-flip-move';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LoadingButton } from '@mui/lab';
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
  const [hideSearchable, setHideSearchable] = useState(true);
  const { setMessage, setOpen, setSeverity } = useContext(SnackbarContext);

  // State variables
  const [seriesMetadata, setSeriesMetadata] = useState([]);
  const [voteData, setVoteData] = useState({});
  const [isSearching, setIsSearching] = useState(false);

  // Local pagination
  const itemsPerPage = 35; // Number of items to render per page
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
        filterAndSortSeriesData();
      }
    } else {
      setIsSearching(false);
      setSeriesMetadata([]);
      setCurrentPage(0);
      setSortedSeriesIds([]);
      fetchVoteData();
    }
  }, [searchText, rankMethod]);

  const fetchVoteData = async () => {
    if (votesCache.current) {
      const voteDataResponse = votesCache.current;

      // Use cached data
      setVoteData(voteDataResponse);
      setVotes(voteDataResponse.votes);
      setUserVotes(user ? voteDataResponse.userVotes : {});
      setUserVotesUp(user ? voteDataResponse.userVotesUp : {});
      setUserVotesDown(user ? voteDataResponse.userVotesDown : {});
      setUpvotes(voteDataResponse.votesUp);
      setDownvotes(voteDataResponse.votesDown);
      setAbleToVote(user ? voteDataResponse.ableToVote : {});
      setLastBoost(user ? voteDataResponse.lastBoost : {});
      setNextVoteTimes(voteDataResponse.nextVoteTime || {});

      const seriesIds = Object.keys(voteDataResponse.votes);

      // Sort the series IDs based on the selected rank method
      let newSortedSeriesIds = [];
      switch (rankMethod) {
        case 'combined':
          newSortedSeriesIds = seriesIds.sort((a, b) => {
            const voteDiff =
              (voteDataResponse.votes[b] || 0) - (voteDataResponse.votes[a] || 0);
            return voteDiff !== 0 ? voteDiff : a.localeCompare(b);
          });
          break;
        case 'downvotes':
          newSortedSeriesIds = seriesIds.sort((a, b) => {
            const voteDiff =
              (voteDataResponse.votesDown[a] || 0) - (voteDataResponse.votesDown[b] || 0);
            return voteDiff !== 0 ? voteDiff : a.localeCompare(b);
          });
          break;
        default: // Upvotes
          newSortedSeriesIds = seriesIds.sort((a, b) => {
            const voteDiff =
              (voteDataResponse.votesUp[b] || 0) - (voteDataResponse.votesUp[a] || 0);
            return voteDiff !== 0 ? voteDiff : a.localeCompare(b);
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
        // Fetch vote data
        const voteDataResponse = await API.get('publicapi', '/vote/list');

        // Save to cache
        votesCache.current = voteDataResponse;

        // Rest of the existing code...
        setVoteData(voteDataResponse);
        setVotes(voteDataResponse.votes);
        setUserVotes(user ? voteDataResponse.userVotes : {});
        setUserVotesUp(user ? voteDataResponse.userVotesUp : {});
        setUserVotesDown(user ? voteDataResponse.userVotesDown : {});
        setUpvotes(voteDataResponse.votesUp);
        setDownvotes(voteDataResponse.votesDown);
        setAbleToVote(user ? voteDataResponse.ableToVote : {});
        setLastBoost(user ? voteDataResponse.lastBoost : {});
        setNextVoteTimes(voteDataResponse.nextVoteTime || {});

        // Get the series IDs from the votes
        const seriesIds = Object.keys(voteDataResponse.votes);

        // Sort the series IDs based on the selected rank method
        /* eslint-disable prefer-const */
        let newSortedSeriesIds = [];
        switch (rankMethod) {
          case 'combined':
            newSortedSeriesIds = seriesIds.sort((a, b) => {
              const voteDiff =
                (voteDataResponse.votes[b] || 0) - (voteDataResponse.votes[a] || 0);
              return voteDiff !== 0 ? voteDiff : a.localeCompare(b);
            });
            break;
          case 'downvotes':
            newSortedSeriesIds = seriesIds.sort((a, b) => {
              const voteDiff =
                (voteDataResponse.votesDown[a] || 0) - (voteDataResponse.votesDown[b] || 0);
              return voteDiff !== 0 ? voteDiff : a.localeCompare(b);
            });
            break;
          default: // Upvotes
            newSortedSeriesIds = seriesIds.sort((a, b) => {
              const voteDiff =
                (voteDataResponse.votesUp[b] || 0) - (voteDataResponse.votesUp[a] || 0);
              return voteDiff !== 0 ? voteDiff : a.localeCompare(b);
            });
        }

        // Update the sortedSeriesIds state
        setSortedSeriesIds(newSortedSeriesIds);

        // Fetch only the initial page
        fetchSeriesData(newSortedSeriesIds, 0, false);
      } catch (error) {
        console.error('Error fetching series data:', error);
      } finally {
        if (!loadingMore) {
          setLoading(false);
        }
      }
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
        rank: startIdx + paginatedSeriesIds.indexOf(id) + 1
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

      // Assign rank based on their position in the sorted list
      cachedSeriesData.forEach((show, index) => {
        show.rank = startIdx + index + 1;
      });

      // Update seriesMetadata with actual data
      setSeriesMetadata((prevSeriesMetadata) => {
        const updatedMetadata = [...prevSeriesMetadata];
        cachedSeriesData.forEach((show) => {
          const index = updatedMetadata.findIndex(item => item.id === show.id);
          if (index !== -1) {
            updatedMetadata[index] = show;
          }
        });
        return updatedMetadata;
      });
    } catch (error) {
      console.error('Error fetching series data:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchSeriesData(sortedSeriesIds, nextPage, true); // Pass true when loading more
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
    if (!data) return;

    // Apply search filter
    const searchFilteredShows = data.filter(
      (show) =>
        show.statusText === 'requested' &&
        show.name.toLowerCase().includes(searchText.toLowerCase())
    );

    // Sort the filtered shows based on the selected rank method
    let sortedShows;
    switch (rankMethod) {
      case 'combined':
        sortedShows = searchFilteredShows.sort((a, b) => {
          const voteDiff = (voteData.votes[b.id] || 0) - (voteData.votes[a.id] || 0);
          return voteDiff !== 0 ? voteDiff : a.name.localeCompare(b.name);
        });
        break;
      case 'downvotes':
        sortedShows = searchFilteredShows.sort((a, b) => {
          const voteDiff = (voteData.votesDown[a.id] || 0) - (voteData.votesDown[b.id] || 0);
          return voteDiff !== 0 ? voteDiff : a.name.localeCompare(b.name);
        });
        break;
      default: // Upvotes
        sortedShows = searchFilteredShows.sort((a, b) => {
          const voteDiff = (voteData.votesUp[b.id] || 0) - (voteData.votesUp[a.id] || 0);
          return voteDiff !== 0 ? voteDiff : a.name.localeCompare(b.name);
        });
    }

    // Add rank to each show
    sortedShows.forEach((show, index) => {
      show.rank = index + 1;
    });

    // Set seriesMetadata to paginatedShows
    setSeriesMetadata(sortedShows.slice(0, itemsPerPage));
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

      setUserVotes((prevUserVotes) => ({ ...prevUserVotes, [seriesId]: boost }));

      const newUpvotes = { ...upvotes };
      const newDownvotes = { ...downvotes };

      if (boost === 1) {
        newUpvotes[seriesId] = (upvotes[seriesId] || 0) + boost;
        setUpvotes(newUpvotes);

        setUserVotesUp((prevUserVotesUp) => {
          const newUserVotesUp = { ...prevUserVotesUp };
          newUserVotesUp[seriesId] = (newUserVotesUp[seriesId] || 0) + boost;
          return newUserVotesUp;
        });
      } else if (boost === -1) {
        newDownvotes[seriesId] = (downvotes[seriesId] || 0) + boost;
        setDownvotes(newDownvotes);

        setUserVotesDown((prevUserVotesDown) => {
          const newUserVotesDown = { ...prevUserVotesDown };
          newUserVotesDown[seriesId] = (newUserVotesDown[seriesId] || 0) + boost;
          return newUserVotesDown;
        });
      }

      // Update votes after updating upvotes and downvotes
      setVotes((prevVotes) => {
        const newVotes = { ...prevVotes };
        newVotes[seriesId] = (newVotes[seriesId] || 0) + boost;

        // Re-sort the seriesMetadata based on updated votes
        let sortedSeriesData = [...seriesMetadata];
        switch (rankMethod) {
          case 'combined':
            sortedSeriesData.sort((a, b) => {
              const voteDiff = (newVotes[b.id] || 0) - (newVotes[a.id] || 0);
              return voteDiff !== 0 ? voteDiff : a.name.localeCompare(b.name);
            });
            break;
          case 'downvotes':
            sortedSeriesData.sort((a, b) => {
              const voteDiff = (newDownvotes[a.id] || 0) - (newDownvotes[b.id] || 0);
              return voteDiff !== 0 ? voteDiff : a.name.localeCompare(b.name);
            });
            break;
          default: // Upvotes
            sortedSeriesData.sort((a, b) => {
              const voteDiff = (newUpvotes[b.id] || 0) - (newUpvotes[a.id] || 0);
              return voteDiff !== 0 ? voteDiff : a.name.localeCompare(b.name);
            });
        }

        // Update ranks
        sortedSeriesData.forEach((show, index) => {
          show.rank = index + 1;
        });

        setSeriesMetadata(sortedSeriesData);

        return newVotes;
      });

      // Deduct a vote from ableToVote for that series
      setAbleToVote((prevAbleToVote) => {
        const newAbleToVote = { ...prevAbleToVote };
        newAbleToVote[seriesId] = newAbleToVote[seriesId] ? newAbleToVote[seriesId] - 1 : 0;
        return newAbleToVote;
      });

      setNextVoteTimes((prevNextVoteTimes) => {
        const newNextVoteTimes = { ...prevNextVoteTimes };
        const now = new Date();
        now.setHours(now.getHours() + 24);
        newNextVoteTimes[seriesId] = now;
        return newNextVoteTimes;
      });

      setVotingStatus((prevStatus) => ({ ...prevStatus, [seriesId]: false }));

      setLastBoost((prevLastBoost) => ({ ...prevLastBoost, [seriesId]: boost }));

      // After voting, refresh the data to update rankings
      setRefreshData((prev) => !prev); // Trigger data refresh
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
    setSearchText(event.target.value);
  };

  const handleRankMethodChange = useCallback((event, newValue) => {
    localStorage.setItem('rankMethod', newValue);
    setRankMethod(newValue);
    setCurrentPage(0); // Reset to the first page
    setSeriesMetadata([]); // Clear the current series metadata
    setRefreshData((prev) => !prev); // Trigger data refresh
  }, []);

  const votesCount = (show) => {
    switch (rankMethod) {
      case 'upvotes':
        return upvotes[show.id] || 0;
      case 'downvotes':
        return downvotes[show.id] || 0;
      case 'combined':
      default:
        return votes[show.id] || 0;
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

  useEffect(() => {
    if (selectedRequest) {
      console.log('THE SELECTED SHOW', selectedRequest.name);
    }
  }, [selectedRequest]);

  const submitRequest = () => {
    setSubmittingRequest(true);
    API.post('publicapi', '/requests/add', {
      body: selectedRequest,
    })
      .then((response) => {
        console.log(response);
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

  return (
    <>
      <Helmet>
        <title> Vote and Requests • TV Shows & Movies • memeSRC </title>
      </Helmet>
      <Container maxWidth="md">
        <Box my={2} sx={{ marginTop: -2, marginBottom: -1.5 }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Requests
          </Typography>
          <Typography variant="subtitle2">Upvote shows and movies you want on memeSRC</Typography>
        </Box>

        <Box my={2}>
          <Tabs
            value={rankMethod}
            onChange={handleRankMethodChange}
            indicatorColor="secondary"
            textColor="inherit"
          >
            <Tab
              label={
                <Box display="flex" alignItems="center">
                  <ThumbUp color="success" sx={{ mr: 1 }} />
                  Most Upvoted
                </Box>
              }
              value="upvotes"
            />
            <Tab
              label={
                <Box display="flex" alignItems="center">
                  <Whatshot color="error" sx={{ mr: 1 }} />
                  Battleground
                </Box>
              }
              value="combined"
            />
          </Tabs>
        </Box>
        <Box my={2}>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            value={searchText}
            onChange={handleSearchChange}
            placeholder="Search requests..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconButton>
                    <Search />
                  </IconButton>
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton edge="end" onClick={() => setSearchText('')} disabled={!searchText}>
                    <Close />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={hideSearchable}
                onChange={() => setHideSearchable(!hideSearchable)}
                name="hideSearchable"
                color="primary"
              />
            }
            label="Hide Searchable"
            style={{ opacity: hideSearchable ? 1 : 0.5, fontSize: '0.1rem' }}
            sx={{ margin: 0, marginBottom: -2 }}
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
                  if (
                    hideSearchable &&
                    searchableShows.some((searchableShow) => searchableShow.id === show.slug)
                  ) {
                    return null;
                  }
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
                                      badgeContent={`#${show.rank}`}
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
                                            <Chip sx={{ marginRight: 1 }} size='small' label="🔍" color="success" variant="filled" />
                                          </a>
                                        )
                                      }
                                      <Typography
                                        variant="subtitle2"
                                        color="success.main"
                                        sx={{ fontSize: '0.7rem', opacity: 0.6 }}
                                      >
                                        <ArrowUpward fontSize="small" sx={{ verticalAlign: 'middle' }} />
                                        <b>{upvotes[show.id] || 0}</b>
                                      </Typography>
                                      {rankMethod === 'combined' && (
                                        <Typography
                                          variant="subtitle2"
                                          color="error.main"
                                          ml={1}
                                          sx={{ fontSize: '0.7rem', opacity: 0.6 }}
                                        >
                                          <ArrowDownward fontSize="small" sx={{ verticalAlign: 'middle' }} />
                                          <b>{downvotes[show.id] || 0}</b>
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
                                      <Typography
                                        variant="h5"
                                        textAlign="center"
                                      // color={votesCount(show) < 0 && 'error.main'}
                                      >
                                        {votesCount(show) || 0}
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
                                      {upvotes[show.id] || 0}
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
                      {`Load More`}
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
              {console.log(selectedRequest)}
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
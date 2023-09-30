import React, { useContext, useEffect, useState } from 'react';
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
  Alert,
  AlertTitle,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import { ArrowUpward, ArrowDownward, Search, Close, ThumbUp, Whatshot, Lock } from '@mui/icons-material';
import FlipMove from 'react-flip-move';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LoadingButton } from '@mui/lab';
import { listSeries } from '../graphql/queries';
import { UserContext } from '../UserContext';
import TvdbSearch from '../components/TvdbSearch/TvdbSearch';
import { SnackbarContext } from '../SnackbarContext';
import VotingPageAd from '../ads/VotingPageAd';
import VotingPageFooterAd from '../ads/VotingPageFooterAd';

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
  const [shows, setShows] = useState([]);
  const [votes, setVotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [votingStatus, setVotingStatus] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [userVotesUp, setUserVotesUp] = useState({});
  const [userVotesDown, setUserVotesDown] = useState({});
  const [searchText, setSearchText] = useState('');
  const [upvotes, setUpvotes] = useState({});
  const [downvotes, setDownvotes] = useState({});
  const [ableToVote, setAbleToVote] = useState({});
  const [rankMethod, setRankMethod] = useState('upvotes');
  const [alertOpen, setAlertOpen] = useState(true);
  const [lastBoost, setLastBoost] = useState({});
  const [nextVoteTimes, setNextVoteTimes] = useState({});
  const [timeRemaining, setTimeRemaining] = useState('');
  const [openAddRequest, setOpenAddRequest] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState();
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [hideSearchable, setHideSearchable] = useState(true);
  const [filteredAndSortedShows, setFilteredAndSortedShows] = useState([]);
  const { setMessage, setOpen, setSeverity } = useContext(SnackbarContext)

  const location = useLocation();

  const theme = useTheme();

  const { user, setUser } = useContext(UserContext);

  const toggleOpenAddRequest = () => {
    setOpenAddRequest(!openAddRequest)
  }

  useEffect(() => {
    const savedRankMethod = localStorage.getItem('rankMethod');
    if (savedRankMethod) {
      setRankMethod(savedRankMethod);
    }
  }, []);

  useEffect(() => {
    fetchShowsAndVotes();
  }, [user]);

  // useEffect(() => {
  //   // Switch to the "Battleground" tab for users who signed up before 2023-07-07 and have voted (until they manually select a tab)
  //   // TODO: remove this in the future after this 'migration' period for the vote sorting options
  //   const savedRankMethod = localStorage.getItem('rankMethod');
  //   console.log(user);
  //   if (!savedRankMethod && Object.keys(userVotes).length > 0 && user.userDetails.createdAt < '2023-07-08') {
  //     setRankMethod('combined');
  //   }
  // }, [userVotes]);

  useEffect(() => {
    let sortedShows;

    switch (rankMethod) {
      case 'combined':
        sortedShows = [...shows].sort((a, b) => {
          const voteDiff = (votes[b.id] || 0) - (votes[a.id] || 0);
          return voteDiff !== 0 ? voteDiff : a.name.localeCompare(b.name);
        });
        break;
      case 'downvotes':
        sortedShows = [...shows].sort((a, b) => {
          const voteDiff = (downvotes[a.id] || 0) - (downvotes[b.id] || 0);
          return voteDiff !== 0 ? voteDiff : a.name.localeCompare(b.name);
        });
        break;
      default: // Upvotes
        sortedShows = [...shows].sort((a, b) => {
          const voteDiff = (upvotes[b.id] || 0) - (upvotes[a.id] || 0);
          return voteDiff !== 0 ? voteDiff : a.name.localeCompare(b.name);
        });
    }

    // If hideSearchable is true, filter out the searchable shows
    const visibleShows = hideSearchable 
      ? sortedShows.filter(show => !searchableShows.some(searchableShow => searchableShow.id === show.slug))
      : sortedShows;

    // Rank the sorted and filtered shows
    visibleShows.forEach((show, index) => {
      show.rank = index + 1;
    });

    // Apply the search filter
    const searchFilteredShows = visibleShows.filter((show) => 
      show.statusText === 'requested' && 
      show.name.toLowerCase().includes(searchText.toLowerCase())
    );

    setFilteredAndSortedShows(searchFilteredShows);
  }, [upvotes, downvotes, votes, rankMethod, hideSearchable, searchableShows, searchText]);

  const fetchShowsAndVotes = async () => {
    setLoading(true);
    try {
      // Recursive function to handle pagination
      const fetchSeries = async (nextToken = null) => {
        const result = await API.graphql({
          ...graphqlOperation(listSeries, { nextToken }),
          authMode: 'API_KEY',
        });

        let items = result.data.listSeries.items;

        if (result.data.listSeries.nextToken) {
          items = items.concat(await fetchSeries(result.data.listSeries.nextToken)); // Call fetchSeries recursively if there's a nextToken
        }

        return items;
      };

      // Fetch all series data
      const seriesData = await fetchSeries();

      const voteData = await API.get('publicapi', '/vote/list');

      // TODO: The example below pulls total votes for individual series to show the new endpoint.
      // TODO: We can use the new `id` URL param to do more efficient pagination and/or individual series pages showing votes.
      // if (voteData) {
      //     const votesPromises = Object.keys(voteData.votes).map(seriesId => 
      //         API.get('publicapi', `/vote/list?id=${seriesId}`).then(individualVoteData => {
      //             console.log(`Votes for series ${seriesId}:`, individualVoteData);
      //         })
      //     );
      //     await Promise.all(votesPromises);
      // }      

      let sortedShows;

      switch (rankMethod) {
        case 'combined':
          sortedShows = seriesData
            .filter((show) => show.statusText === 'requested')
            .sort((a, b) => {
              const voteDiff = (voteData.votes[b.id] || 0) - (voteData.votes[a.id] || 0);
              return voteDiff !== 0 ? voteDiff : a.name.localeCompare(b.name);
            });
          break;
        case 'downvotes':
          sortedShows = seriesData
            .filter((show) => show.statusText === 'requested')
            .sort((a, b) => {
              const voteDiff = (voteData.votesDown[a.id] || 0) - (voteData.votesDown[b.id] || 0);
              return voteDiff !== 0 ? voteDiff : a.name.localeCompare(b.name);
            });
          break;
        default: // Upvotes
          sortedShows = seriesData
            .filter((show) => show.statusText === 'requested')
            .sort((a, b) => {
              const voteDiff = (voteData.votesUp[b.id] || 0) - (voteData.votesUp[a.id] || 0);
              return voteDiff !== 0 ? voteDiff : a.name.localeCompare(b.name);
            });
      }

      sortedShows.forEach((show, index) => {
        show.rank = index + 1; // add a rank to each show
      });

      setShows(sortedShows);
      setVotes(voteData.votes);
      setUserVotes(user ? voteData.userVotes : 0);
      setUserVotesUp(user ? voteData.userVotesUp : 0);
      setUserVotesDown(user ? voteData.userVotesDown : 0);
      setUpvotes(voteData.votesUp);
      setDownvotes(voteData.votesDown);
      setAbleToVote(user ? voteData.ableToVote : true);
      setLastBoost(user ? voteData.lastBoost : [{}]);
      console.log('last boost');
      console.log(voteData.lastBoost)

      const nextVoteTimes = {};
      Object.keys(voteData.nextVoteTime).forEach((seriesId) => {
        nextVoteTimes[seriesId] = voteData.nextVoteTime[seriesId];
      });
      setNextVoteTimes(nextVoteTimes);  // assuming you have a state variable called nextVoteTimes

    } catch (error) {
      console.error('Error fetching series data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (seriesId, boost) => {
    setVotingStatus((prevStatus) => ({ ...prevStatus, [seriesId]: boost }));

    try {
      const result = await API.post('publicapi', '/vote', {
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

      // update votes after updating upvotes and downvotes
      setVotes((prevVotes) => {
        const newVotes = { ...prevVotes };
        newVotes[seriesId] = (newVotes[seriesId] || 0) + boost;

        let sortedShows;

        switch (rankMethod) {
          case 'combined':
            sortedShows = [...shows].sort((a, b) => (newVotes[b.id] || 0) - (newVotes[a.id] || 0));
            break;
          case 'downvotes':
            sortedShows = [...shows].sort((a, b) => (newDownvotes[a.id] || 0) - (newDownvotes[b.id] || 0));
            break;
          default: // Upvotes
            sortedShows = [...shows].sort((a, b) => (newUpvotes[b.id] || 0) - (newUpvotes[a.id] || 0));
        }

        sortedShows.forEach((show, index) => {
          show.rank = index + 1; // add a rank to each show
        });

        setShows(sortedShows);

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
    } catch (error) {
      setVotingStatus((prevStatus) => ({ ...prevStatus, [seriesId]: false }));
      console.error('Error on voting:', error);
      console.log(error.response);
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

  const handleRankMethodChange = (event, newValue) => {
    localStorage.setItem('rankMethod', newValue);
    setRankMethod(newValue);
  };

  // const filteredShows = filteredAndSortedShows
  //   .filter((show) => show.statusText === 'requested')
  //   .filter((show) => show.name.toLowerCase().includes(searchText.toLowerCase()));

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
      console.log('THE SELECTED SHOW', selectedRequest.name)
    }
  }, [selectedRequest])

  const submitRequest = () => {
    setSubmittingRequest(true)
    API.post('publicapi', '/requests/add', {
      body: selectedRequest
    }).then(response => {
      console.log(response)
      setOpenAddRequest(false)
      setSelectedRequest(false)
      setMessage(response.message)
      setSeverity('success')
      setOpen(true)
      setSubmittingRequest(false)
    }).catch(error => {
      console.log(error)
      console.log(error.response)
      setMessage(error.response.data.message)
      setSeverity('error')
      setOpen(true)
      setSubmittingRequest(false)
    })
  }

  return (
    <>
      <Helmet>
        <title> Vote and Requests • TV Shows & Movies • memeSRC </title>
      </Helmet>
      <Container maxWidth="md">
        <Box my={2} sx={{marginTop: -2, marginBottom: -1.5}}>
          <Typography variant="h3" component="h1" gutterBottom>
            Requests
          </Typography>
          <Typography variant="subtitle2">Upvote shows and movies you want on memeSRC</Typography>
        </Box>

        {/* {!localStorage.getItem('alertDismissedVotePage9667zz') && (
          <Alert
          severity="info"
          action={
              <IconButton
                color="inherit"
                size="small"
                onClick={() => {
                  localStorage.setItem('alertDismissedVotePage9667zz', 'true');
                  setAlertOpen(false);
                }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
          }
          sx={{
            marginTop: 2,
            marginBottom: -1,
            opacity: 0.9,
          }}
        >
          <b>Vote&nbsp;again&nbsp;every&nbsp;24h!</b>
        </Alert>
        )} */}

        {/* {!localStorage.getItem('alertDismissedVotePage1000zz') && (
          <Alert
          severity="success"
          action={
              <IconButton
                color="inherit"
                size="small"
                onClick={() => {
                  localStorage.setItem('alertDismissedVotePage1000zz', 'true');
                  setAlertOpen(false);
                }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
          }
          sx={{
            marginTop: 2,
            marginBottom: -1,
            opacity: 0.9,
          }}
        >
          <b>Movies&nbsp;are&nbsp;now&nbsp;supported!</b>
        </Alert>
        )} */}

        <Box my={2}>
          <Tabs value={rankMethod} onChange={handleRankMethodChange} indicatorColor="secondary" textColor="inherit">
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
          {loading ? (
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
                Hang tight while we tally votes
              </Typography>
              <CircularProgress />
            </Grid>
          ) : (         
            <FlipMove style={{ minWidth: '100%' }}>
              {filteredAndSortedShows.map((show, idx) => (
                hideSearchable && searchableShows.some(searchableShow => searchableShow.id === show.slug)
                  ? null
                  : (
                    <>
                    {
                      // Insert the VotingPageAd component every 6 shows
                      (idx % 6) - 2 === 0 && idx !== 0
                      ? (
                        <Grid item xs={12} style={{ marginBottom: 15 }}>
                          <Card>
                            <CardContent>
                              <VotingPageAd />
                            </CardContent>
                          </Card>
                        </Grid>
                      )
                      : null
                    }
                    <Grid item xs={12} key={show.id} style={{ marginBottom: 15 }}>
                      <Card>
                      <CardContent style={{ paddingTop: 22, paddingBottom: 22 }}>
                      <Box display="flex" alignItems="center">
                        <Box flexGrow={1} marginRight={2}>
                          <Box display="flex" alignItems="center">
                            <Box mr={2}>
                              <Badge
                                badgeContent={`#${show.rank}`}
                                color="secondary"
                                anchorOrigin={{
                                  vertical: 'top',
                                  horizontal: 'left',
                                }}
                              >
                                <img src={show.image} alt={show.name} style={showImageStyle} />
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
                                      href={`https://memesrc.com/${show.slug}`} 
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
                                        disabled={user && ((ableToVote[show.id] !== undefined && ableToVote[show.id] !== true || votingStatus[show.id]))}
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
                                        disabled={user && ((ableToVote[show.id] !== undefined && ableToVote[show.id] !== true) || votingStatus[show.id])}
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
                </>)
              ))}
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
            </FlipMove>
          )}
          <Grid item xs={12} style={{ marginBottom: 15 }}>
                <Card>
                  <CardContent>
                    <VotingPageFooterAd />
                  </CardContent>
                </Card>
              </Grid>
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
          <LoadingButton onClick={submitRequest} loading={submittingRequest} disabled={submittingRequest} variant='contained'>
            Submit Request
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

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
} from '@mui/material';
import { ArrowUpward, ArrowDownward, Search, Close } from '@mui/icons-material';
import FlipMove from 'react-flip-move';
import { useLocation, useNavigate } from 'react-router-dom';
import { listSeries } from '../graphql/queries';
import { UserContext } from '../UserContext';

export default function VotingPage() {
  const navigate = useNavigate();
  const [shows, setShows] = useState([]);
  const [votes, setVotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [votingStatus, setVotingStatus] = useState({});
  const [userVotes, setUserVotes] = useState({});
  const [searchText, setSearchText] = useState('');
  const [upvotes, setUpvotes] = useState({});
  const [downvotes, setDownvotes] = useState({});

  const location = useLocation();

  const { user, setUser } = useContext(UserContext);

  useEffect(() => {
    fetchShowsAndVotes();
  }, [user]);

  const fetchShowsAndVotes = async () => {
    setLoading(true);
    try {
      const seriesData = await API.graphql({
        ...graphqlOperation(listSeries),
        authMode: 'API_KEY',
      });
      const voteData = await API.get('publicapi', '/vote/list');
      const sortedShows = seriesData.data.listSeries.items
        .filter((show) => show.statusText === 'requested') // filtering shows based on statusText
        .sort((a, b) => (voteData.votes[b.id] || 0) - (voteData.votes[a.id] || 0));
      setShows(sortedShows);
      setVotes(voteData.votes);
      setUserVotes(voteData.userVotes);

      // Set upvotes and downvotes using response data
      setUpvotes(voteData.votesUp);
      setDownvotes(voteData.votesDown);
    } catch (error) {
      console.error('Error fetching series data:', error);
    }
    setLoading(false);
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

      setVotes((prevVotes) => {
        const newVotes = { ...prevVotes };
        newVotes[seriesId] = (newVotes[seriesId] || 0) + boost;

        const sortedShows = [...shows].sort((a, b) => (newVotes[b.id] || 0) - (newVotes[a.id] || 0));
        setShows(sortedShows);

        return newVotes;
      });

      if (boost === 1) {
        setUpvotes((prevUpvotes) => {
          const newUpvotes = { ...prevUpvotes };
          newUpvotes[seriesId] = (newUpvotes[seriesId] || 0) + 1;
          return newUpvotes;
        });
      } else if (boost === -1) {
        setDownvotes((prevDownvotes) => {
          const newDownvotes = { ...prevDownvotes };
          newDownvotes[seriesId] = (newDownvotes[seriesId] || 0) - 1; // subtract 1 for a downvote
          return newDownvotes;
        });
      }

      setVotingStatus((prevStatus) => ({ ...prevStatus, [seriesId]: false }));
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
    maxWidth: '125px',
    maxHeight: '125px',
    objectFit: 'cover',
  };

  const descriptionStyle = {
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const handleSearchChange = (event) => {
    setSearchText(event.target.value);
  };

  const filteredShows = shows
    .filter((show) => show.statusText === 'requested')
    .filter((show) => show.name.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <Container maxWidth="md">
      <Box my={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          Vote for New Shows
        </Typography>
        <Typography variant="subtitle2">
          Help prioritize requests by voting on your favorite shows. Upvote the shows you want to see more, and downvote
          the shows you're not interested in.
        </Typography>
      </Box>
      <Box my={2}>
        <TextField
          fullWidth
          variant="outlined"
          value={searchText}
          onChange={handleSearchChange}
          placeholder="Search requested shows..."
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
      </Box>
      <Grid container style={{ minWidth: '100%' }}>
        {loading ? (
          <CircularProgress />
        ) : (
          <FlipMove style={{ minWidth: '100%' }}>
            {filteredShows.map((show, idx) => (
              <Grid item xs={12} key={show.id} style={{ marginBottom: 15 }}>
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <Box mr={2}>
                        <Box>
                          {votingStatus[show.id] === 1 ? (
                            <CircularProgress size={20} sx={{ ml: 1.2, mb: 1.5 }} />
                          ) : (
                            <IconButton
                              aria-label="upvote"
                              onClick={() =>
                                user
                                  ? handleUpvote(show.id)
                                  : navigate(`/login?dest=${encodeURIComponent(location.pathname)}`)
                              }
                              disabled={userVotes[show.id] || votingStatus[show.id]}
                            >
                              <ArrowUpward sx={{ color: userVotes[show.id] === 1 ? 'success.main' : 'inherit' }} />
                            </IconButton>
                          )}
                        </Box>
                        <Box>
                          <Typography variant="h5" gutterBottom textAlign="center" paddingTop={0.5}>
                            {votes[show.id] || 0}
                          </Typography>
                        </Box>
                        <Box>
                          {votingStatus[show.id] === -1 ? (
                            <CircularProgress size={20} sx={{ ml: 1.2, mt: 1.5 }} />
                          ) : (
                            <IconButton
                              aria-label="downvote"
                              onClick={() =>
                                user
                                  ? handleDownvote(show.id)
                                  : navigate(`/login?dest=${encodeURIComponent(location.pathname)}`)
                              }
                              disabled={userVotes[show.id] || votingStatus[show.id]}
                            >
                              <ArrowDownward sx={{ color: userVotes[show.id] === -1 ? 'error.main' : 'inherit' }} />
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                      <Box flexGrow={1}>
                        <Box display="flex" alignItems="center">
                          <Box mr={2}>
                            <img src={show.image} alt={show.name} style={showImageStyle} />
                          </Box>
                          <Box>
                            <Typography variant="h4">{show.name}</Typography>
                            <Box display="flex" alignItems="center">
                              <Typography
                                variant="subtitle2"
                                color="success.main"
                                sx={{ fontSize: '0.7rem', opacity: 0.6 }}
                              >
                                <ArrowUpward fontSize="small" sx={{ verticalAlign: 'middle' }} />
                                <b>{upvotes[show.id] || 0}</b>
                              </Typography>
                              <Typography
                                variant="subtitle2"
                                color="error.main"
                                ml={1}
                                sx={{ fontSize: '0.7rem', opacity: 0.6 }}
                              >
                                <ArrowDownward fontSize="small" sx={{ verticalAlign: 'middle' }} />
                                <b>{downvotes[show.id] || 0}</b>
                              </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" mt={1} style={descriptionStyle}>
                              {show.description}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
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
                Looking for one not in the list? 
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => window.open('https://forms.gle/8CETtVbwYoUmxqbi7', '_blank')}
                style={{
                  marginTop: 10,
                  marginBottom: 15
                }}
              >
                Make a request
              </Button>
            </Grid>
          </FlipMove>
        )}
      </Grid>
    </Container>
  );
}

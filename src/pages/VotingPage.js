import React, { useContext, useEffect, useState } from 'react';
import { API, graphqlOperation } from 'aws-amplify';
import { Container, Grid, Card, CardContent, Typography, IconButton, CircularProgress, Box } from '@mui/material';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';
import FlipMove from 'react-flip-move';

import { listSeries } from '../graphql/queries';
import { UserContext } from '../UserContext';

export default function VotingPage() {
    const [shows, setShows] = useState([]);
    const [votes, setVotes] = useState({});
    const [loading, setLoading] = useState(true);
    const [votingStatus, setVotingStatus] = useState({});
    const [userVotes, setUserVotes] = useState({});

    const { user, setUser } = useContext(UserContext)

    useEffect(() => {
        fetchShowsAndVotes();
    }, [user]);

    const fetchShowsAndVotes = async () => {
        setLoading(true);
        try {
            const seriesData = await API.graphql(graphqlOperation(listSeries));
            const voteData = await API.get('publicapi', '/vote/list');
            const sortedShows = seriesData.data.listSeries.items.sort((a, b) => (
                voteData.votes[b.id] || 0
            ) - (voteData.votes[a.id] || 0));
            setShows(sortedShows);
            setVotes(voteData.votes);
            setUserVotes(voteData.userVotes);
        } catch (error) {
            console.error('Error fetching series data:', error);
        }
        setLoading(false);
    };

    const handleVote = async (idx, boost) => {
        const seriesId = shows[idx].id;
        setVotingStatus((prevStatus) => ({ ...prevStatus, [seriesId]: true }));
    
        try {
            const result = await API.post('publicapi', '/vote', {
                body: {
                    seriesId,
                    boost
                }
            })
    
            setUserVotes(prevUserVotes => ({ ...prevUserVotes, [seriesId]: boost }));
    
            setVotes(prevVotes => {
                const newVotes = { ...prevVotes };
                newVotes[seriesId] = (newVotes[seriesId] || 0) + boost;
    
                const sortedShows = [...shows].sort((a, b) => (
                    newVotes[b.id] || 0
                ) - (newVotes[a.id] || 0));
                setShows(sortedShows);
    
                return newVotes;
            });
    
            setVotingStatus((prevStatus) => ({ ...prevStatus, [seriesId]: false }));
        } catch (error) {
            setVotingStatus((prevStatus) => ({ ...prevStatus, [seriesId]: false }));
            console.error('Error on voting:', error);
            console.log(error.response)
        }
    };
    
    const handleUpvote = (idx) => {
        handleVote(idx, 1);
    };

    const handleDownvote = (idx) => {
        handleVote(idx, -1);
    };

    const showImageStyle = {
        maxWidth: "125px",
        maxHeight: "125px",
        objectFit: "cover"
    };

    const descriptionStyle = {
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    };

    return (
        <Container maxWidth="md">
            <Box my={4}>
                <Typography variant="h3" component="h1" gutterBottom>
                    Vote for New Shows
                </Typography>
                <Typography variant="subtitle2">
                    Help prioritize requests by voting on your favorite shows. Upvote the shows you want to see more, and downvote the shows you're not interested in.
                </Typography>
            </Box>
            <Grid container>
                {loading ? (
                    <CircularProgress />
                ) : (
                    <FlipMove>
                        {shows.map((show, idx) => (
                            <Grid item xs={12} key={show.id} style={{ marginBottom: 15 }}>
                                <Card>
                                    <CardContent>
                                        <Box display="flex" alignItems="center">
                                            <Box mr={2}>
                                                <IconButton aria-label="upvote" onClick={() => handleUpvote(idx)} disabled={userVotes[show.id] || votingStatus[show.id]}>
                                                    <ArrowUpward sx={{ color: userVotes[show.id] === 1 ? 'success.main' : 'inherit' }} />
                                                </IconButton>
                                                <Typography variant="subtitle1" gutterBottom textAlign='center'>
                                                    {votes[show.id] || 0}
                                                </Typography>
                                                <IconButton aria-label="downvote" onClick={() => handleDownvote(idx)} disabled={userVotes[show.id] || votingStatus[show.id]}>
                                                    <ArrowDownward sx={{ color: userVotes[show.id] === -1 ? 'error.main' : 'inherit' }} />
                                                </IconButton>
                                            </Box>
                                            <Box flexGrow={1}>
                                                <Box display="flex" alignItems="center">
                                                    <Box mr={2}>
                                                        <img src={show.image} alt={show.name} style={showImageStyle} />
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="h4">{show.name}</Typography>
                                                        <Typography variant="subtitle2">{show.year}</Typography>
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
                    </FlipMove>
                )}
            </Grid>
        </Container>
    );
}

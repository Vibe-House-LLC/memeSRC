import React, { useContext, useEffect, useState } from 'react';
import { API, graphqlOperation } from 'aws-amplify';
import { Container, Grid, Card, CardContent, Typography, IconButton, CircularProgress, Box } from '@mui/material';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';
import FlipMove from 'react-flip-move';

import { listSeries, listSeriesUserVotes } from '../graphql/queries';
import { UserContext } from '../UserContext';

export default function VotingPage() {
    const [shows, setShows] = useState([]);
    const [votes, setVotes] = useState([]);
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
            const result = await API.graphql(graphqlOperation(listSeries));

            const fetchAllVotes = async (nextToken) => {
                const response = await API.graphql(graphqlOperation(listSeriesUserVotes, {
                    nextToken,
                    limit: 1000 // Fetch up to 1000 items per request
                }));
                const { items, nextToken: newNextToken } = response.data.listSeriesUserVotes;
                if (newNextToken) {
                    return [...items, ...(await fetchAllVotes(newNextToken))];
                }
                return items;
            };

            // Fetch all votes using pagination and recursion
            const votesData = await fetchAllVotes();

            const votesCount = votesData.reduce((acc, vote) => {
                acc[vote.seriesUserVoteSeriesId] = (acc[vote.seriesUserVoteSeriesId] || 0) + vote.boost;
                return acc;
            }, {});

            // Record the shows the current user has voted on
            const currentUserVotes = votesData.reduce((acc, vote) => {
                if (user) {
                    if (vote.user?.id === user.userDetails.id) {
                        acc[vote.seriesUserVoteSeriesId] = vote.boost; // 1 for upvote or -1 for downvote
                    }
                }
                return acc;
            }, {});

            const sortedShows = result.data.listSeries.items.sort((a, b) => (
                votesCount[b.id] || 0
            ) - (votesCount[a.id] || 0));

            setShows(sortedShows);
            setVotes(votesCount);
            setUserVotes(currentUserVotes);
            console.log(votesCount)
        } catch (error) {
            console.error('Error fetching series data:', error);
        }
        setLoading(false);
    };

    const handleVote = async (idx, boost) => {
        const seriesId = shows[idx].id;
        setVotingStatus((prevStatus) => ({ ...prevStatus, [seriesId]: true }));

        try {
            // const result = await API.graphql(graphqlOperation(createSeriesUserVote, {
            //     input: {
            //         seriesUserVoteUserId: 'YourUserIdHere', // Add logic to get the user ID
            //         seriesUserVoteSeriesId: seriesId,
            //         boost
            //     }
            // }));

            const result = await API.post('publicapi', '/vote', {
                body: {
                    seriesId
                }
            })

            setUserVotes(prevUserVotes => ({ ...prevUserVotes, [seriesId]: true }));

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
            console.log(result);
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

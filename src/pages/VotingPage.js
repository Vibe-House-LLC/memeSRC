import React, { useEffect, useState } from 'react';
import { API, graphqlOperation } from 'aws-amplify';
import { Container, Grid, Card, CardContent, Typography, IconButton, CircularProgress, Box } from '@mui/material';
import { ArrowUpward, ArrowDownward } from '@mui/icons-material';
// import AvatarGroup from '@mui/material/AvatarGroup';
// import Avatar from '@mui/material/Avatar';

import { listSeries } from '../graphql/queries';

export default function VotingPage() {
    const [shows, setShows] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchShows = async () => {
            try {
                const result = await API.graphql(graphqlOperation(listSeries));
                setShows(result.data.listSeries.items);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching series data:', error);
                setLoading(false);
            }
        };

        fetchShows();
    }, []);

    const handleUpvote = (idx) => {
        // Handle your upvoting logic
        console.log('Upvote for show:', shows[idx].name);
    };

    const handleDownvote = (idx) => {
        // Handle your downvoting logic
        console.log('Downvote for show:', shows[idx].name);
    };

    // Add a CSS style object for the show images
    const showImageStyle = {
        maxWidth: "125px",
        maxHeight: "125px",
        objectFit: "cover"
    };

    // Add a CSS style object for the description
    const descriptionStyle = {
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    };

    return (
        <Container maxWidth="md">
            <Grid container spacing={3}>
                {loading ? (
                    <CircularProgress />
                ) : (
                    shows.map((show, idx) => (
                        <Grid item xs={12} key={show.id}>
                            <Card>
                                <CardContent>
                                    <Box display="flex" alignItems="center">
                                        <Box mr={2}>
                                            <IconButton aria-label="upvote" onClick={() => handleUpvote(idx)}>
                                                <ArrowUpward />
                                            </IconButton>
                                            <Typography variant="subtitle1" gutterBottom textAlign='center'>
                                                69
                                            </Typography>
                                            <IconButton aria-label="downvote" onClick={() => handleDownvote(idx)}>
                                                <ArrowDownward />
                                            </IconButton>
                                        </Box>
                                        <Box flexGrow={1}>
                                            <Box display="flex" alignItems="center">
                                                <Box mr={2}>
                                                    {/* Apply the CSS style to the show images */}
                                                    <img src={show.image} alt={show.name} style={showImageStyle} />
                                                </Box>
                                                <Box>
                                                    <Typography variant="h4">{show.name}</Typography>
                                                    <Typography variant="subtitle2">{show.year}</Typography>
                                                    {/* Apply the CSS style to the description */}
                                                    <Typography variant="body2" color="text.secondary" mt={1} style={descriptionStyle}>
                                                        {show.description}
                                                    </Typography>
                                                    {/* <AvatarGroup total={69} sx={{ height: 10, width: 10}}>
                                                        <Avatar alt="User 1" src="/static/images/avatar/1.jpg" sx={{ height: 10, width: 10}} />
                                                        <Avatar alt="User 2" src="/static/images/avatar/2.jpg" sx={{ height: 10, width: 10}} />
                                                        <Avatar alt="User 3" src="/static/images/avatar/4.jpg" sx={{ height: 10, width: 10}} />
                                                        <Avatar alt="User 4" src="/static/images/avatar/5.jpg" sx={{ height: 10, width: 10}} />
                                                    </AvatarGroup> */}
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))
                )}
            </Grid>
        </Container>
    );
}

import React, { useEffect, useState } from 'react';
import { API, graphqlOperation } from 'aws-amplify';

import { listProSupportMessages, getUserDetails } from '../graphql/queries';

export default function ProSupportAdmin() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextToken, setNextToken] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await API.graphql(
        graphqlOperation(listProSupportMessages, {
          limit: 10,
          nextToken,
        })
      );
      const newSubmissions = response.data.listProSupportMessages.items;
      const submissionsWithUserDetails = await Promise.all(
        newSubmissions.map(async (submission) => {
          const userDetails = await fetchUserDetails(submission.userDetailsProSupportMessagesId);
          return { ...submission, user: userDetails };
        })
      );
      setSubmissions((prevSubmissions) => [...prevSubmissions, ...submissionsWithUserDetails]);
      setNextToken(response.data.listProSupportMessages.nextToken);
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  const fetchUserDetails = async (userId) => {
    try {
      const response = await API.graphql(graphqlOperation(getUserDetails, { id: userId }));
      return response.data.getUserDetails;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  const loadMore = async () => {
    await fetchSubmissions();
  };

  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSortBy = (event) => {
    setSortBy(event.target.value);
  };

  const filteredSubmissions = submissions.filter((submission) => {
    const { user, message } = submission;
    const searchTerm = searchQuery.toLowerCase();
    return (
      (user?.email && user.email.toLowerCase().includes(searchTerm)) ||
      (user?.username && user.username.toLowerCase().includes(searchTerm)) ||
      (message && message.toLowerCase().includes(searchTerm))
    );
  });

  const sortedSubmissions = filteredSubmissions.sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    if (sortBy === 'email') {
      return (a.user?.email || '').localeCompare(b.user?.email || '');
    }
    if (sortBy === 'status') {
      return (a.user?.subscriptionStatus || '').localeCompare(b.user?.subscriptionStatus || '');
    }
    return 0;
  });  

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Pro Support Submissions
      </Typography>
      <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Search"
            variant="outlined"
            fullWidth
            value={searchQuery}
            onChange={handleSearch}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Select value={sortBy} onChange={handleSortBy} fullWidth>
            <MenuItem value="date">Sort by Date</MenuItem>
            <MenuItem value="email">Sort by Email</MenuItem>
            <MenuItem value="status">Sort by Subscription Status</MenuItem>
          </Select>
        </Grid>
      </Grid>
      {loading && submissions.length === 0 ? (
        <Grid container justifyContent="center">
          <CircularProgress />
        </Grid>
      ) : (
        <>
          <Grid container spacing={2}>
            {sortedSubmissions.map((submission) => (
              <Grid item xs={12} key={submission.id}>
                <Card>
                  <CardHeader
                    title={submission.user?.email || 'Unknown User'}
                    subheader={new Date(submission.createdAt).toLocaleString()}
                  />
                  <CardContent>
                    <Typography variant="body1" gutterBottom>
                      {submission.message}
                    </Typography>
                    <Typography variant="subtitle2" color="textSecondary">
                      User Details:
                    </Typography>
                    <Typography variant="body2">
                      Username: {submission.user?.username || 'Unknown'}
                      <br />
                      User ID: {submission.userDetailsProSupportMessagesId}
                      <br />
                      Subscription Status: {submission.user?.subscriptionStatus || 'Unknown'}
                    </Typography>
                    <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={() => {alert("TODO: message status not implemented yet")}}>
                      Mark as Resolved
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          {nextToken && (
            <Grid container justifyContent="center" sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={loadMore}>
                Load More
              </Button>
            </Grid>
          )}
        </>
      )}
    </Container>
  );
}

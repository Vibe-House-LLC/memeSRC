import React, { useState, useEffect } from 'react';
import { API, graphqlOperation, Auth } from 'aws-amplify';
import { Grid, Card, CardContent, Typography, Button, CircularProgress } from '@mui/material';
import { createFavorite, deleteFavorite } from '../graphql/mutations';
import { listFavorites } from '../graphql/queries';
import fetchShows from '../utils/fetchShows'; // Adjust as necessary

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState([]);
  const [availableIndexes, setAvailableIndexes] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFavorites();
    fetchAvailableIndexes();
  }, []);

  const fetchAvailableIndexes = async () => {
    try {
      const shows = await fetchShows(); // Assuming this function returns the format you expect
      setAvailableIndexes(shows); // Assuming shows is an array of { id: string, title: string }
    } catch (err) {
      console.error('Error fetching available indexes:', err);
      setError('Failed to fetch available indexes.');
    }
  };

  const fetchFavorites = async () => {
    try {
      const currentUser = await Auth.currentAuthenticatedUser();
      const currentUserUsername = currentUser.username; // Adjust if you use a different field for the owner
  
      let nextToken = null;
      let allFavorites = [];
  
      do {
        // eslint-disable-next-line no-await-in-loop
        const result = await API.graphql(graphqlOperation(listFavorites, {
          limit: 10,
          nextToken,
        }));
  
        allFavorites = allFavorites.concat(result.data.listFavorites.items);
        nextToken = result.data.listFavorites.nextToken;
  
      } while (nextToken);
      
      setFavorites(allFavorites);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError('Failed to fetch favorites.');
    }
  };

  const addFavorite = async (indexId) => {
    try {
      setIsSaving(true);
      const input = { cid: indexId };
      await API.graphql(graphqlOperation(createFavorite, { input }));
      fetchFavorites(); // Refresh the list after adding
    } catch (err) {
      console.error('Error adding favorite:', err);
      setError('Failed to add favorite.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeFavorite = async (id) => {
    try {
      setIsSaving(true);
      const input = { id };
      await API.graphql(graphqlOperation(deleteFavorite, { input }));
      fetchFavorites(); // Refresh the list after removing
    } catch (err) {
      console.error('Error removing favorite:', err);
      setError('Failed to remove favorite.');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to check if an index is favorited
  const isIndexFavorited = (indexId) => {
    return favorites.some(favorite => favorite.cid === indexId);
  };

  // Filter available indexes to exclude favorites
  const filteredAvailableIndexes = availableIndexes.filter(
    index => !isIndexFavorited(index.id)
  );

  return (
    <div style={{ padding: '20px' }}>
      <h2>My Favorites</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4" gutterBottom>Favorite Indexes</Typography>
          {favorites.length > 0 ? (
            <Grid container spacing={2}>
              {favorites.map((favorite) => (
                <Grid item xs={12} sm={6} md={4} key={favorite.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h5">{favorite.cid}</Typography>
                      <Button 
                        variant="contained" 
                        color="error" 
                        onClick={() => removeFavorite(favorite.id)}
                        disabled={isSaving}
                        style={{ marginTop: '10px' }}
                      >
                        Remove
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : isSaving ? (
            <CircularProgress />
          ) : (
            <Typography>No favorites added yet.</Typography>
          )}
        </Grid>
        <Grid item xs={12}>
          <Typography variant="h4" gutterBottom>Available Indexes</Typography>
          {filteredAvailableIndexes.length > 0 ? (
            <Grid container spacing={2}>
              {filteredAvailableIndexes.map((index) => (
                <Grid item xs={12} sm={6} md={4} key={index.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h5">{index.title}</Typography>
                      <Button 
                        variant="contained" 
                        onClick={() => addFavorite(index.id)} 
                        disabled={isSaving}
                        style={{ marginTop: '10px' }}
                      >
                        Add to Favorites
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography>All indexes are in your favorites.</Typography>
          )}
        </Grid>
      </Grid>
    </div>
  );
};

export default FavoritesPage;

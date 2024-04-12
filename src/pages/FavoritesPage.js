// FavoritesPage.js

import React, { useState, useEffect } from 'react';
import { API, graphqlOperation, Auth } from 'aws-amplify';
import { Typography, IconButton, Badge, Fab, Grid, Card, CardContent } from '@mui/material';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import { styled } from '@mui/material/styles';
import { createFavorite, deleteFavorite } from '../graphql/mutations';
import { listFavorites } from '../graphql/queries';
import fetchShows from '../utils/fetchShows';

const StyledBadge = styled(Badge)(() => ({
  '& .MuiBadge-badge': {
    padding: '0 3px',
    backgroundColor: 'rgba(0, 0, 0, 1)',
    fontWeight: 'bold',
    fontSize: '7pt',
  },
  position: 'absolute',
  top: '8px',
  right: '8px',
}));

const StyledFab = styled(Fab)(() => ({
  backgroundColor: 'rgba(255, 255, 255, 0.35)',
  zIndex: 0,
  position: 'relative',
}));

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState([]);
  const [availableIndexes, setAvailableIndexes] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchAvailableIndexes()])
      .then(() => {
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading data:', err);
        setError('Failed to load data.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (availableIndexes.length > 0) {
      fetchFavorites();
    }
  }, [availableIndexes]);

  const fetchAvailableIndexes = async () => {
    try {
      const shows = await fetchShows();
      setAvailableIndexes(shows);
    } catch (err) {
      console.error('Error fetching available indexes:', err);
      setError('Failed to fetch available indexes.');
    }
  };

  const fetchFavorites = async () => {
    try {
      const currentUser = await Auth.currentAuthenticatedUser();

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

      console.log("YOOOO:", allFavorites);

      const enrichedFavorites = allFavorites.map(favorite => {
        const match = availableIndexes.find(index => index.id === favorite.cid);
        console.log("YO:", match ? { ...favorite, alias: match } : favorite);
        return match ? { ...favorite, alias: match } : favorite;
      });

      setFavorites(enrichedFavorites);
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
      fetchFavorites();
    } catch (err) {
      console.error('Error adding favorite:', err);
      setError('Failed to add favorite.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeFavorite = async (favoriteId) => {
    try {
      setIsSaving(true);
      await API.graphql(graphqlOperation(deleteFavorite, { input: { id: favoriteId } }));
      setFavorites(favorites.filter(favorite => favorite.id !== favoriteId));
    } catch (err) {
      console.error('Error removing favorite:', err);
      setError('Failed to remove favorite.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredAvailableIndexes = availableIndexes.filter(
    index => !favorites.find(favorite => favorite.cid === index.id)
  );

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>My Favorites</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div>
        <Typography variant="h4" gutterBottom>Favorite Indexes</Typography>
        {favorites.length > 0 ? (
          <Grid container spacing={2}>
            {favorites.map((favorite) => (
              <Grid item xs={12} key={favorite.id}>
                <Card
                  sx={{
                    backgroundColor: favorite.alias?.colorMain,
                    color: favorite.alias?.colorSecondary,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 150,
                    position: 'relative',
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <StyledBadge
                      anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }}
                    >
                      <StyledFab
                        aria-label="remove-favorite"
                        onClick={() => removeFavorite(favorite.id)}
                        disabled={isSaving}
                        size="small"
                      >
                        <StarIcon />
                      </StyledFab>
                    </StyledBadge>
                    <Typography variant="h5" sx={{ mb: 1 }}>
                      {favorite.alias?.emoji} {favorite.alias?.title}
                    </Typography>
                    <Typography variant="caption">
                      {favorite.alias?.frameCount.toLocaleString()} frames
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography>No favorites added yet.</Typography>
        )}
      </div>
      <div style={{ marginTop: 20 }}>
        <Typography variant="h4" gutterBottom>Available Indexes</Typography>
        {filteredAvailableIndexes.length > 0 ? (
          <Grid container spacing={2}>
            {filteredAvailableIndexes.map((index) => (
              <Grid item xs={12} key={index.id}>
                <Card
                  sx={{
                    backgroundColor: index.colorMain,
                    color: index.colorSecondary,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 150,
                    position: 'relative',
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <StyledBadge
                      anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }}
                    >
                      <StyledFab
                        aria-label="add-favorite"
                        onClick={() => addFavorite(index.id)}
                        disabled={isSaving}
                        size="small"
                      >
                        <StarBorderIcon />
                      </StyledFab>
                    </StyledBadge>
                    <Typography variant="h5" sx={{ mb: 1 }}>
                      {index.emoji} {index.title}
                    </Typography>
                    <Typography variant="caption">
                      {index.frameCount.toLocaleString()} frames
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography>All indexes are in your favorites.</Typography>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;

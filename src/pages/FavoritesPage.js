import React, { useState, useEffect } from 'react';
import { API, graphqlOperation, Auth } from 'aws-amplify';
import { createFavorite, deleteFavorite } from '../graphql/mutations';
import { listFavorites } from '../graphql/queries';

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState([]);
  const [newFavorite, setNewFavorite] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const currentUser = await Auth.currentAuthenticatedUser();
      const currentUserUsername = currentUser.username; // Or whichever field you use to match the owner
  
      let nextToken = null; // Initialize nextToken
      let allFavorites = []; // Initialize an array to hold all fetched favorites, including those owned by other users
  
      do {
        // eslint-disable-next-line no-await-in-loop
        const result = await API.graphql(graphqlOperation(listFavorites, {
          limit: 10, // Specify the number of items to fetch per request, adjust as needed
          nextToken // Pass the nextToken for the next page of items
        }));
  
        allFavorites = allFavorites.concat(result.data.listFavorites.items); // Concatenate the newly fetched favorites with the existing array
        nextToken = result.data.listFavorites.nextToken; // Update nextToken with the nextToken from the response
  
      } while (nextToken); // Continue fetching until there's no nextToken, indicating no more items to fetch
      
      setFavorites(allFavorites); // Update state with filtered favorites
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError('Failed to fetch favorites.');
    }
  };  
  
  const addFavorite = async () => {
    try {
      if (!newFavorite) return;
      setIsSaving(true);
      const input = { cid: newFavorite };
      await API.graphql(graphqlOperation(createFavorite, { input }));
      setNewFavorite('');
      fetchFavorites(); // Refresh the list
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
      fetchFavorites(); // Refresh the list
    } catch (err) {
      console.error('Error removing favorite:', err);
      setError('Failed to remove favorite.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <h2>My Favorites</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <input
        value={newFavorite}
        onChange={(e) => setNewFavorite(e.target.value)}
        placeholder="Add a new favorite"
        disabled={isSaving}
      />
      <button onClick={addFavorite} disabled={isSaving}>Add Favorite</button>
      <ul>
        {favorites.map((favorite) => (
          <li key={favorite.id}>
            {favorite.cid}
            <button onClick={() => removeFavorite(favorite.id)} disabled={isSaving}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FavoritesPage;

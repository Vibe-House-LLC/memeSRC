import React, { useState, useContext, useEffect, useCallback } from 'react';
import { API } from 'aws-amplify';
import { IconButton, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { UserContext } from '../UserContext';
import { trackUsageEvent } from '../utils/trackUsageEvent';

const StyledIconButton = styled(IconButton)(({ isFavorite }) => ({
  padding: '8px',
  borderRadius: '50%',
  transition: 'all 0.3s',
  backgroundColor: isFavorite ? 'transparent' : 'rgba(128, 128, 128, 0.1)',
  '&:hover': {
    backgroundColor: isFavorite ? 'transparent' : 'rgba(128, 128, 128, 0.2)',
  },
  '& .favoriteIcon': {
    fontSize: '24px',
    lineHeight: 1,
    color: isFavorite ? 'inherit' : '#808080',
  },
}));

const IconContainer = styled('div')({
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

const FavoriteToggle = ({ indexId, initialIsFavorite, onToggle }) => {
  const { user, handleUpdateUserDetails, forceTokenRefresh } = useContext(UserContext);
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const isAuthorized = !!user; // Check if user is truthy (logged in)

  useEffect(() => {
    setIsFavorite(initialIsFavorite);
  }, [initialIsFavorite]);

  const emitToggle = useCallback((nextValue) => {
    if (onToggle) {
      onToggle(nextValue);
    }
  }, [onToggle]);

  const toggleFavorite = async () => {
    if (!isAuthorized) {
      navigate('/favorites');
      return;
    }

    setIsSaving(true);
    const nextIsFavorite = !isFavorite;
    try {
      const result = await API.post('publicapi', '/user/update/updateFavorites', {
        body: {
          favoriteId: indexId,
          removeFavorite: isFavorite
        }
      });
      await forceTokenRefresh();
      handleUpdateUserDetails(result?.updatedUserDetails);
      setIsFavorite(nextIsFavorite);
      emitToggle(nextIsFavorite);

      const updatedFavoritesRaw = result?.updatedUserDetails?.favorites;
      let favoritesCount;

      if (typeof updatedFavoritesRaw === 'string') {
        try {
          const parsedFavorites = JSON.parse(updatedFavoritesRaw);
          if (Array.isArray(parsedFavorites)) {
            favoritesCount = parsedFavorites.length;
          }
        } catch (parseError) {
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.warn('Failed to parse favorites payload for tracking', parseError);
          }
        }
      }

      const eventPayload = {
        indexId,
        source: 'FavoriteToggle',
        nextIsFavorite,
      };

      if (typeof favoritesCount === 'number') {
        eventPayload.favoritesCount = favoritesCount;
      }

      trackUsageEvent(nextIsFavorite ? 'favorite_add' : 'favorite_remove', eventPayload);
    } catch (err) {
      console.error('Error toggling favorite:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <StyledIconButton
      aria-label={isFavorite ? "remove-favorite" : "add-favorite"}
      onClick={toggleFavorite}
      disabled={isSaving}
      isFavorite={isFavorite}
    >
      <IconContainer>
        {isSaving ? (
          <CircularProgress size={20} color="inherit" />
        ) : (
          <span className="favoriteIcon" role="img" aria-label={isFavorite ? "Favorite" : "Not favorite"}>
            {isAuthorized ? (isFavorite ? '⭐' : '★') : '★'}
          </span>
        )}
      </IconContainer>
    </StyledIconButton>
  );
};

FavoriteToggle.propTypes = {
  indexId: PropTypes.string.isRequired,
  initialIsFavorite: PropTypes.bool,
  onToggle: PropTypes.func,
};

export default FavoriteToggle;

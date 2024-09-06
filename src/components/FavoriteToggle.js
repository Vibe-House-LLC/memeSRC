import React, { useState, useContext, useEffect } from 'react';
import { API } from 'aws-amplify';
import { IconButton, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { UserContext } from '../UserContext';

const StyledIconButton = styled(IconButton)(({ theme, isFavorite }) => ({
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

const FavoriteToggle = ({ indexId, initialIsFavorite }) => {
  const { user, handleUpdateUserDetails } = useContext(UserContext);
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    console.log("FavoriteToggle rendered", { indexId, initialIsFavorite });
  }, [indexId, initialIsFavorite]);

  const toggleFavorite = async () => {
    setIsSaving(true);
    try {
      const result = await API.post('publicapi', '/user/update/updateFavorites', {
        body: {
          favoriteId: indexId,
          removeFavorite: isFavorite
        }
      });
      handleUpdateUserDetails(result?.updatedUserDetails);
      setIsFavorite(!isFavorite);
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
            {isFavorite ? '⭐' : '★'}
          </span>
        )}
      </IconContainer>
    </StyledIconButton>
  );
};

export default FavoriteToggle;

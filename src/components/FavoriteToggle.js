import React, { useState, useContext, useEffect } from 'react';
import { API } from 'aws-amplify';
import { Badge, IconButton } from '@mui/material';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import { styled } from '@mui/material/styles';
import { UserContext } from '../UserContext';

const StyledBadge = styled(Badge)(() => ({
  '& .MuiBadge-badge': {
    padding: '0 3px',
    backgroundColor: 'rgba(255, 255, 255, 0.8)', // Lighter background for dark mode
    fontWeight: 'bold',
    fontSize: '8pt', // Slightly larger font size
  },
}));

const StyledIconButton = styled(IconButton)(() => ({
  backgroundColor: 'rgba(255, 255, 255, 0.2)', // Darker button background for dark mode
  padding: '10px', // Increased padding for a larger clickable area
  borderRadius: '50%', // Make it circular
  transition: 'background-color 0.3s', // Smooth transition for hover effect
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.4)', // Lighter on hover for better visibility
  },
}));

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
    <StyledBadge>
      <StyledIconButton
        aria-label={isFavorite ? "remove-favorite" : "add-favorite"}
        onClick={toggleFavorite}
        disabled={isSaving}
      >
        {isFavorite ? <StarIcon /> : <StarBorderIcon />}
      </StyledIconButton>
    </StyledBadge>
  );
};

export default FavoriteToggle;

import React, { useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Link } from '@mui/material';

const FavoritesResetDialog = ({ open, onClose }) => {
  useEffect(() => {
    // Check local storage to see if the dialog has been dismissed
    const dismissed = localStorage.getItem('favoritesDialogDismissed7678uf');
    if (dismissed) {
      onClose();
    }
  }, [onClose]);

  const handleDismiss = () => {
    // Save dismissal status in local storage
    localStorage.setItem('favoritesDialogDismissed7678uf', 'true');
    onClose();
  };

  const handleLinkClick = () => {
    // Save dismissal status in local storage
    localStorage.setItem('favoritesDialogDismissed7678uf', 'true');
  };

  return (
    <Dialog open={open} onClose={handleDismiss}>
      <DialogTitle>🌟 Favorites</DialogTitle>
      <DialogContent>
        <Typography>
          We've made some improvements to the "Favorites" feature, but you'll need to re-add them.
        </Typography>
        <Typography sx={{ mt: 2 }}>
            <Link href="/favorites" onClick={handleLinkClick} sx={{color: 'white', fontWeight: 900}}>
            Click here to set your favorites.
          </Link>
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDismiss} variant="contained">
          Dismiss
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FavoritesResetDialog;

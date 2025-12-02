import { Box, Dialog, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import { AdFreeDecemberContent } from './AdFreeDecemberContent';

interface AdFreeDecemberDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AdFreeDecemberDialog({ open, onClose }: AdFreeDecemberDialogProps) {
  const theme = useTheme();
  const [showSecondChance, setShowSecondChance] = useState(false);

  useEffect(() => {
    if (!open) {
      setShowSecondChance(false);
    }
  }, [open]);

  const handleShowSecondChance = () => {
    setShowSecondChance(true);
  };

  const handleFinalClose = () => {
    setShowSecondChance(false);
    onClose();
  };

  const handleDialogClose = (_event: object, _reason: 'backdropClick' | 'escapeKeyDown') => {
    if (!showSecondChance) {
      handleShowSecondChance();
      return;
    }

    handleFinalClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      maxWidth="sm"
      fullWidth
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: 4,
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, #0d3b1f 0%, #165b33 100%)'
            : 'linear-gradient(135deg, #c41e3a 0%, #dc143c 100%)',
          border: `1px solid ${alpha('#FFD700', 0.4)}`,
          boxShadow: theme.palette.mode === 'dark'
            ? '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(255, 215, 0, 0.15)'
            : '0 20px 40px rgba(196, 30, 58, 0.4), 0 0 40px rgba(255, 215, 0, 0.2)',
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <AdFreeDecemberContent
          onClose={handleFinalClose}
          onShowSecondChance={handleShowSecondChance}
          showSecondChance={showSecondChance}
        />
      </Box>
    </Dialog>
  );
}

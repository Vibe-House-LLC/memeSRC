import { useState } from 'react';
import { Box, Button, Dialog, IconButton, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import Logo from './logo/Logo';

interface AdFreeDecemberDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AdFreeDecemberDialog({ open, onClose }: AdFreeDecemberDialogProps) {
  const [showSecondChance, setShowSecondChance] = useState(false);
  const theme = useTheme();

  const handleClose = () => {
    setShowSecondChance(false);
    onClose();
  };

  if (showSecondChance) {
    return (
      <Dialog
        open={open}
        onClose={handleClose}
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
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2.5 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 48,
                  height: 48,
                  borderRadius: 2.5,
                  backgroundColor: alpha(theme.palette.common.white, 0.15),
                  border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
                  backdropFilter: 'blur(8px)',
                  boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.15)}`,
                }}
              >
                <Logo color={theme.palette.common.white} sx={{ width: 36 }} />
              </Box>
              <Typography
                component="h3"
                variant="h4"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '1.4rem', sm: '1.5rem' },
                  lineHeight: 1.1,
                  letterSpacing: -0.5,
                  color: theme.palette.common.white,
                  textShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.3)}`,
                }}
              >
                One More Thing...
              </Typography>
            </Stack>
            <IconButton
              aria-label="Dismiss ad-free announcement"
              onClick={handleClose}
              size="small"
              sx={{
                color: theme.palette.common.white,
                backgroundColor: alpha(theme.palette.common.white, 0.15),
                border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
                backdropFilter: 'blur(8px)',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.25),
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Typography
            variant="body1"
            sx={{
              color: alpha(theme.palette.common.white, 0.95),
              fontWeight: 500,
              fontSize: { xs: '1rem', sm: '1.05rem' },
              lineHeight: 1.6,
              mb: 1.5,
              textAlign: 'center',
            }}
          >
            No worries! Just remember—every bit helps keep memeSRC free and ad-light for everyone.
          </Typography>

          <Stack spacing={{ xs: 1, sm: 1 }} sx={{ width: '100%' }}>
            <Button
              variant="contained"
              href="/pro"
              sx={{
                borderRadius: 999,
                px: { xs: 3, sm: 3.5 },
                py: { xs: 1.2, sm: 1.3 },
                textTransform: 'none',
                fontWeight: 700,
                fontSize: { xs: '1rem', sm: '1.05rem' },
                color: theme.palette.common.black,
                backgroundColor: theme.palette.common.white,
                boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.25)}`,
                border: `2px solid ${theme.palette.common.white}`,
                '&:hover': {
                  backgroundColor: theme.palette.grey[200],
                  transform: 'translateY(-2px) scale(1.01)',
                  boxShadow: `0 12px 36px ${alpha(theme.palette.common.black, 0.35)}`,
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Box component="span" sx={{ mr: 1, fontSize: '1.2em' }}>⬆️</Box>
              Check out Pro
            </Button>
            <Button
              variant="text"
              onClick={handleClose}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: { xs: '0.9rem', sm: '0.95rem' },
                color: alpha(theme.palette.common.white, 0.7),
                py: 0.8,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.1),
                  color: alpha(theme.palette.common.white, 0.95),
                },
                transition: 'all 0.2s ease',
              }}
            >
              No thanks
            </Button>
          </Stack>
        </Box>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: 2.5,
                backgroundColor: alpha(theme.palette.common.white, 0.15),
                border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
                backdropFilter: 'blur(8px)',
                boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.15)}`,
              }}
            >
              <Logo color={theme.palette.common.white} sx={{ width: 36 }} />
            </Box>
            <Stack spacing={0.3}>
              <Typography
                variant="overline"
                sx={{
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  color: alpha(theme.palette.common.white, 0.7),
                  fontSize: '0.7rem',
                  lineHeight: 1,
                }}
              >
                🎄 Happy Holidays
              </Typography>
              <Typography
                component="h3"
                variant="h4"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '1.5rem', sm: '1.65rem' },
                  lineHeight: 1.1,
                  letterSpacing: -0.5,
                  color: theme.palette.common.white,
                  textShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.3)}`,
                }}
              >
                No Ads in Dec ❄️
              </Typography>
            </Stack>
          </Stack>
          <IconButton
            aria-label="Dismiss ad-free announcement"
            onClick={handleClose}
            size="small"
            sx={{
              color: theme.palette.common.white,
              backgroundColor: alpha(theme.palette.common.white, 0.15),
              border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
              backdropFilter: 'blur(8px)',
              '&:hover': {
                backgroundColor: alpha(theme.palette.common.white, 0.25),
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Typography
          variant="body1"
          sx={{
            color: alpha(theme.palette.common.white, 0.95),
            fontWeight: 500,
            fontSize: { xs: '1rem', sm: '1.05rem' },
            lineHeight: 1.6,
            mb: 1.5,
            textAlign: 'center',
            textShadow: `0 1px 4px ${alpha(theme.palette.common.black, 0.2)}`,
          }}
        >
          We know ads suck, but they help keep memeSRC alive.{' '}
          <Box component="span" sx={{ fontWeight: 700 }}>
            We're turning them off for the holidays.
          </Box>
        </Typography>

        <Stack spacing={{ xs: 1, sm: 1 }} sx={{ width: '100%' }}>
          <Button
            variant="contained"
            href="/pro"
            sx={{
              borderRadius: 999,
              px: { xs: 3, sm: 3.5 },
              py: { xs: 1.2, sm: 1.3 },
              textTransform: 'none',
              fontWeight: 700,
              fontSize: { xs: '1rem', sm: '1.05rem' },
              color: theme.palette.common.black,
              backgroundColor: theme.palette.common.white,
              boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.25)}`,
              border: `2px solid ${theme.palette.common.white}`,
              '&:hover': {
                backgroundColor: theme.palette.grey[200],
                transform: 'translateY(-2px) scale(1.01)',
                boxShadow: `0 12px 36px ${alpha(theme.palette.common.black, 0.35)}`,
              },
              transition: 'all 0.2s ease',
            }}
          >
            <Box component="span" sx={{ mr: 1, fontSize: '1.2em' }}>⬆️</Box>
            Support with Pro
          </Button>
          <Button
            variant="contained"
            href="/donate"
            sx={{
              borderRadius: 999,
              px: { xs: 3, sm: 3.5 },
              py: { xs: 1.2, sm: 1.3 },
              textTransform: 'none',
              fontWeight: 700,
              fontSize: { xs: '1rem', sm: '1.05rem' },
              color: theme.palette.common.black,
              backgroundColor: theme.palette.common.white,
              boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.25)}`,
              border: `2px solid ${theme.palette.common.white}`,
              '&:hover': {
                backgroundColor: theme.palette.grey[200],
                transform: 'translateY(-2px) scale(1.01)',
                boxShadow: `0 12px 36px ${alpha(theme.palette.common.black, 0.35)}`,
              },
              transition: 'all 0.2s ease',
            }}
          >
            <Box component="span" sx={{ mr: 1, fontSize: '1.2em' }}>🎁</Box>
            Support with Gift
          </Button>
          <Button
            variant="text"
            onClick={() => setShowSecondChance(true)}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: { xs: '0.9rem', sm: '0.95rem' },
              color: alpha(theme.palette.common.white, 0.7),
              py: 0.8,
              '&:hover': {
                backgroundColor: alpha(theme.palette.common.white, 0.1),
                color: alpha(theme.palette.common.white, 0.95),
              },
              transition: 'all 0.2s ease',
            }}
          >
            Maybe later
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}

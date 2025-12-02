import { useState } from 'react';
import { Box, Button, IconButton, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import Logo from '../../../components/logo/Logo';
import { FeedCardSurface } from './CardSurface';

interface AdFreeDecemberCardProps {
  onDismiss: () => void;
  isRemoving: boolean;
}

const CARD_EXIT_DURATION_MS = 360;

export function AdFreeDecemberCard({ onDismiss, isRemoving }: AdFreeDecemberCardProps) {
  const [showSecondChance, setShowSecondChance] = useState(false);
  const theme = useTheme();

  if (showSecondChance) {
    return (
      <FeedCardSurface
        tone="info"
        gradient={theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #0d3b1f 0%, #165b33 100%)'
          : 'linear-gradient(135deg, #c41e3a 0%, #dc143c 100%)'}
        sx={{
          border: `1px solid ${alpha('#FFD700', 0.4)}`,
          boxShadow: theme.palette.mode === 'dark'
            ? '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(255, 215, 0, 0.15)'
            : '0 20px 40px rgba(196, 30, 58, 0.4), 0 0 40px rgba(255, 215, 0, 0.2)',
          backdropFilter: 'blur(20px) saturate(180%)',
          opacity: isRemoving ? 0 : 1,
          transform: isRemoving ? 'translateY(-28px)' : 'translateY(0)',
          transition: `opacity ${CARD_EXIT_DURATION_MS}ms ease, transform ${CARD_EXIT_DURATION_MS}ms ease`,
          pointerEvents: isRemoving ? 'none' : 'auto',
          position: 'relative',
        }}
      >
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
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
            >
              <Logo color="#ffffff" sx={{ width: 36 }} />
            </Box>
            <Typography
              component="h3"
              variant="h4"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '1.4rem', sm: '1.5rem' },
                lineHeight: 1.1,
                letterSpacing: -0.5,
                color: '#ffffff',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              }}
            >
              One More Thing...
            </Typography>
          </Stack>
          <IconButton
            aria-label="Dismiss ad-free announcement"
            onClick={onDismiss}
            size="small"
            sx={{
              color: '#ffffff',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(8px)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Typography
          variant="body1"
          sx={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: 500,
            fontSize: { xs: '1rem', sm: '1.05rem' },
            lineHeight: 1.6,
            mb: 2.5,
            textAlign: 'center',
          }}
        >
          No worries! Just remember—every bit helps keep memeSRC free and ad-light for everyone.
        </Typography>

        <Stack spacing={{ xs: 1.2, sm: 1.3 }} sx={{ width: '100%' }}>
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
              color: '#1e3a8a',
              backgroundColor: '#ffffff',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25), 0 0 50px rgba(255, 255, 255, 0.4)',
              border: '2px solid rgba(255, 255, 255, 0.9)',
              '&:hover': {
                backgroundColor: '#dbeafe',
                transform: 'translateY(-2px) scale(1.01)',
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35), 0 0 80px rgba(255, 255, 255, 0.5)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <Box component="span" sx={{ mr: 1, fontSize: '1.2em' }}>⭐</Box>
            Check out Pro
          </Button>
          <Button
            variant="text"
            onClick={onDismiss}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: { xs: '0.9rem', sm: '0.95rem' },
              color: 'rgba(255, 255, 255, 0.7)',
              py: 0.8,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.9)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            No thanks
          </Button>
        </Stack>
      </FeedCardSurface>
    );
  }

  return (
    <FeedCardSurface
      tone="info"
      gradient={theme.palette.mode === 'dark'
        ? 'linear-gradient(135deg, #0d3b1f 0%, #165b33 100%)'
        : 'linear-gradient(135deg, #c41e3a 0%, #dc143c 100%)'}
      sx={{
        border: `1px solid ${alpha('#FFD700', 0.4)}`,
        boxShadow: theme.palette.mode === 'dark'
          ? '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(255, 215, 0, 0.15)'
          : '0 20px 40px rgba(196, 30, 58, 0.4), 0 0 40px rgba(255, 215, 0, 0.2)',
        backdropFilter: 'blur(20px) saturate(180%)',
        opacity: isRemoving ? 0 : 1,
        transform: isRemoving ? 'translateY(-28px)' : 'translateY(0)',
        transition: `opacity ${CARD_EXIT_DURATION_MS}ms ease, transform ${CARD_EXIT_DURATION_MS}ms ease`,
        pointerEvents: isRemoving ? 'none' : 'auto',
        position: 'relative',
      }}
    >
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
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <Logo color="#ffffff" sx={{ width: 36 }} />
          </Box>
          <Stack spacing={0.3}>
            <Typography
              variant="overline"
              sx={{
                fontWeight: 700,
                letterSpacing: 1.5,
                color: 'rgba(255, 255, 255, 0.7)',
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
                color: '#ffffff',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              }}
            >
              No Ads in Dec ❄️
            </Typography>
          </Stack>
        </Stack>
        <IconButton
          aria-label="Dismiss ad-free announcement"
          onClick={onDismiss}
          size="small"
          sx={{
            color: '#ffffff',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(8px)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Typography
        variant="body1"
        sx={{
          color: 'rgba(255, 255, 255, 0.9)',
          fontWeight: 500,
          fontSize: { xs: '1rem', sm: '1.05rem' },
          lineHeight: 1.6,
          mb: 2.5,
          textAlign: 'center',
          textShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
        }}
      >
        We know ads suck, but they help keep the site running.{' '}
        <Box component="span" sx={{ fontWeight: 700 }}>
          We're turning them off for the holidays.
        </Box>
      </Typography>

      <Typography
        variant="overline"
        sx={{
          display: 'block',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.65)',
          fontWeight: 600,
          fontSize: { xs: '0.7rem', sm: '0.75rem' },
          letterSpacing: 1.5,
          mb: 1.5,
        }}
      >
        Other ways to support
      </Typography>

      <Stack spacing={{ xs: 1.2, sm: 1.3 }} sx={{ width: '100%' }}>
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
          <Box component="span" sx={{ mr: 1, fontSize: '1.2em' }}>⭐</Box>
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
            color: 'rgba(255, 255, 255, 0.7)',
            py: 0.8,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'rgba(255, 255, 255, 0.9)',
            },
            transition: 'all 0.2s ease',
          }}
        >
          Maybe later
        </Button>
      </Stack>
    </FeedCardSurface>
  );
}

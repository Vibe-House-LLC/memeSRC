import { useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { FeedCardSurface } from './CardSurface';
import { AdFreeDecemberContent } from '../../../components/AdFreeDecemberContent';

interface AdFreeDecemberCardProps {
  onDismiss: () => void;
  isRemoving: boolean;
}

const CARD_EXIT_DURATION_MS = 360;

export function AdFreeDecemberCard({ onDismiss, isRemoving }: AdFreeDecemberCardProps) {
  const theme = useTheme();

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
      <AdFreeDecemberContent onClose={onDismiss} />
    </FeedCardSurface>
  );
}

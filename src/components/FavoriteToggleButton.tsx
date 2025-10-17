import { useCallback, useContext, useEffect, useMemo, useState, type ReactElement } from 'react';
import { API } from 'aws-amplify';
import { Button, CircularProgress } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { useNavigate } from 'react-router-dom';
import { alpha, type SxProps } from '@mui/system';
import { type Theme } from '@mui/material/styles';
import { UserContext } from '../UserContext';
import { trackUsageEvent } from '../utils/trackUsageEvent';

interface FavoriteToggleButtonProps {
  indexId: string;
  initialIsFavorite?: boolean;
  onToggle?: (value: boolean) => void;
  backgroundColor: string;
  textColor: string;
  sx?: SxProps<Theme>;
}

interface UpdateFavoritesResponse {
  updatedUserDetails?: {
    favorites?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface UserContextValue {
  user?: unknown;
  handleUpdateUserDetails?: (details: unknown) => Promise<void> | void;
  forceTokenRefresh?: (options?: { overrideUserDetails?: unknown }) => Promise<void> | void;
}

export default function FavoriteToggleButton({
  indexId,
  initialIsFavorite = false,
  onToggle,
  backgroundColor,
  textColor,
  sx,
}: FavoriteToggleButtonProps): ReactElement {
  const userContext = useContext(UserContext) as UserContextValue | undefined;
  const [isFavorite, setIsFavorite] = useState(Boolean(initialIsFavorite));
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const isAuthorized = useMemo(() => Boolean(userContext?.user), [userContext?.user]);

  useEffect(() => {
    setIsFavorite(Boolean(initialIsFavorite));
  }, [initialIsFavorite]);

  const emitToggle = useCallback(
    (nextValue: boolean) => {
      if (onToggle) {
        onToggle(nextValue);
      }
    },
    [onToggle]
  );

  const toggleFavorite = useCallback(async () => {
    if (!isAuthorized) {
      navigate('/favorites');
      return;
    }

    const nextIsFavorite = !isFavorite;
    setIsSaving(true);

    try {
      const result = (await API.post('publicapi', '/user/update/updateFavorites', {
        body: {
          favoriteId: indexId,
          removeFavorite: isFavorite,
        },
      })) as UpdateFavoritesResponse;

      if (typeof userContext?.forceTokenRefresh === 'function') {
        await userContext.forceTokenRefresh({ overrideUserDetails: result?.updatedUserDetails });
      }

      if (typeof userContext?.handleUpdateUserDetails === 'function') {
        await userContext.handleUpdateUserDetails(result?.updatedUserDetails);
      }

      setIsFavorite(nextIsFavorite);
      emitToggle(nextIsFavorite);

      const updatedFavoritesRaw = result?.updatedUserDetails?.favorites;
      let favoritesCount: number | undefined;

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

      const eventPayload: Record<string, unknown> = {
        indexId,
        source: 'FavoriteToggleButton',
        nextIsFavorite,
      };

      if (typeof favoritesCount === 'number') {
        eventPayload.favoritesCount = favoritesCount;
      }

      trackUsageEvent(nextIsFavorite ? 'favorite_add' : 'favorite_remove', eventPayload);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsSaving(false);
    }
  }, [emitToggle, indexId, isAuthorized, isFavorite, navigate, userContext]);

  const baseSx = useMemo<SxProps<Theme>>(() => ({
    borderRadius: 999,
    px: { xs: 2.4, sm: 3 },
    py: { xs: 1, sm: 1.05 },
    textTransform: 'none',
    fontWeight: 700,
    fontSize: { xs: '1rem', sm: '1.05rem' },
    color: textColor,
    backgroundColor,
    boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
    '&:hover': {
      backgroundColor,
      opacity: 0.92,
    },
    '&.Mui-disabled': {
      color: textColor,
      opacity: 0.90,
      backgroundColor: alpha(backgroundColor, 0.80),
    },
  }), [backgroundColor, textColor]);

  const mergedSx = useMemo<SxProps<Theme>>(() => {
    if (!sx) {
      return baseSx;
    }

    const parts: SxProps<Theme>[] = [baseSx];

    if (Array.isArray(sx)) {
      parts.push(...sx);
    } else {
      parts.push(sx);
    }

    return parts as SxProps<Theme>;
  }, [baseSx, sx]);

  return (
    <Button
      variant="contained"
      onClick={toggleFavorite}
      disabled={isSaving}
      startIcon={
        isSaving ? (
          <CircularProgress size={18} sx={{ color: textColor }} />
        ) : isFavorite ? (
          <StarIcon fontSize="small" sx={{ color: '#ffd700' }} />
        ) : (
          <StarBorderIcon fontSize="small" sx={{ color: textColor }} />
        )
      }
      sx={mergedSx}
    >
      Favorite
    </Button>
  );
}

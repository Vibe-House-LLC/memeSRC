"use client";

import { Star } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';

interface FavoritesStarProps {
  showId: string;
  showTitle: string;
  showEmoji: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function FavoritesStar({
  showId,
  showTitle,
  showEmoji,
  size = 'medium',
  className,
  onClick,
}: FavoritesStarProps) {
  const { isFavorite, toggleFavorite, isLoaded } = useFavorites();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    toggleFavorite({
      id: showId,
      title: showTitle,
      emoji: showEmoji,
    });

    // Call the optional onClick prop if provided
    onClick?.(e);
  };

  const sizeClasses = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: 'w-5 h-5',
  };

  const favorite = isLoaded ? isFavorite(showId) : false;

  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center transition-colors duration-200 hover:scale-110',
        'focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 rounded',
        className
      )}
      title={favorite ? `Remove ${showTitle} from favorites` : `Add ${showTitle} to favorites`}
      aria-label={favorite ? `Remove ${showTitle} from favorites` : `Add ${showTitle} to favorites`}
    >
      <Star
        className={cn(
          sizeClasses[size],
          'transition-colors duration-200',
          favorite
            ? 'fill-yellow-500 text-yellow-500'
            : 'text-gray-400 hover:text-yellow-500'
        )}
      />
    </button>
  );
} 
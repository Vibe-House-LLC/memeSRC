"use client";

import { useState, useEffect } from 'react';

interface FavoriteShow {
  id: string;
  title: string;
  emoji: string;
}

const FAVORITES_KEY = 'memesrc-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteShow[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem(FAVORITES_KEY);
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save favorites to localStorage whenever favorites change
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      } catch (error) {
        console.error('Error saving favorites:', error);
      }
    }
  }, [favorites, isLoaded]);

  const addFavorite = (show: FavoriteShow) => {
    setFavorites(prev => {
      if (!prev.some(fav => fav.id === show.id)) {
        return [...prev, show];
      }
      return prev;
    });
  };

  const removeFavorite = (id: string) => {
    setFavorites(prev => prev.filter(fav => fav.id !== id));
  };

  const toggleFavorite = (show: FavoriteShow) => {
    if (isFavorite(show.id)) {
      removeFavorite(show.id);
    } else {
      addFavorite(show);
    }
  };

  const isFavorite = (id: string): boolean => {
    return favorites.some(fav => fav.id === id);
  };

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    isLoaded,
  };
} 
"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface FavoriteShow {
  id: string;
  title: string;
  emoji: string;
}

interface FavoritesContextType {
  favorites: FavoriteShow[];
  addFavorite: (show: FavoriteShow) => void;
  removeFavorite: (id: string) => void;
  toggleFavorite: (show: FavoriteShow) => void;
  isFavorite: (id: string) => boolean;
  isLoaded: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const FAVORITES_KEY = 'memesrc-favorites';

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteShow[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem(FAVORITES_KEY);
      if (storedFavorites) {
        const parsed = JSON.parse(storedFavorites);
        setFavorites(parsed);
      }
    } catch (error) {
      // Silent error handling
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Helper function to save to localStorage
  const saveToLocalStorage = useCallback((newFavorites: FavoriteShow[]) => {
    if (isLoaded) {
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      } catch (error) {
        // Silent error handling
      }
    }
  }, [isLoaded]);

  const addFavorite = useCallback((show: FavoriteShow) => {
    setFavorites(prev => {
      if (!prev.some(fav => fav.id === show.id)) {
        const newFavorites = [...prev, show];
        saveToLocalStorage(newFavorites);
        return newFavorites;
      }
      return prev;
    });
  }, [saveToLocalStorage]);

  const removeFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const newFavorites = prev.filter(fav => fav.id !== id);
      saveToLocalStorage(newFavorites);
      return newFavorites;
    });
  }, [saveToLocalStorage]);

  const toggleFavorite = useCallback((show: FavoriteShow) => {
    setFavorites(prev => {
      const isCurrentlyFavorite = prev.some(fav => fav.id === show.id);
      
      if (isCurrentlyFavorite) {
        // Remove from favorites
        const newFavorites = prev.filter(fav => fav.id !== show.id);
        saveToLocalStorage(newFavorites);
        return newFavorites;
      } else {
        // Add to favorites
        const newFavorites = [...prev, show];
        saveToLocalStorage(newFavorites);
        return newFavorites;
      }
    });
  }, [saveToLocalStorage]);

  const isFavorite = useCallback((id: string): boolean => {
    return favorites.some(fav => fav.id === id);
  }, [favorites]);

  const contextValue: FavoritesContextType = {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    isLoaded,
  };

  return (
    <FavoritesContext.Provider value={contextValue}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
} 
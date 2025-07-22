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
  console.log('🏗️ FavoritesProvider initialized');
  const [favorites, setFavorites] = useState<FavoriteShow[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Debug: Log whenever favorites state changes
  useEffect(() => {
    if (isLoaded) {
      console.log(`🔄 Provider favorites state changed to ${favorites.length} items:`, favorites.map(f => f.title));
    }
  }, [favorites, isLoaded]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    console.log('🔄 Provider loading favorites from localStorage...');
    try {
      const storedFavorites = localStorage.getItem(FAVORITES_KEY);
      if (storedFavorites) {
        const parsed = JSON.parse(storedFavorites);
        console.log('✅ Provider loaded favorites from localStorage:', parsed);
        setFavorites(parsed);
      } else {
        console.log('📭 Provider found no favorites in localStorage');
      }
    } catch (error) {
      console.error('❌ Provider error loading favorites:', error);
    } finally {
      setIsLoaded(true);
      console.log('🏁 Provider favorites loading complete');
    }
  }, []);

  // Helper function to save to localStorage
  const saveToLocalStorage = useCallback((newFavorites: FavoriteShow[]) => {
    if (isLoaded) {
      try {
        const timestamp = new Date().toISOString();
        console.log(`💾 Provider [${timestamp}] Saving ${newFavorites.length} favorites to localStorage:`, newFavorites.map(f => f.title));
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
        
        // Verify the save worked
        const verification = localStorage.getItem(FAVORITES_KEY);
        const verifiedData = verification ? JSON.parse(verification) : null;
        console.log(`✅ Provider [${timestamp}] Verification - localStorage now contains:`, verifiedData?.map((f: FavoriteShow) => f.title) || 'empty');
      } catch (error) {
        console.error('❌ Provider error saving favorites:', error);
      }
    } else {
      console.warn('⚠️ Provider attempted to save favorites before isLoaded=true');
    }
  }, [isLoaded]);

  const addFavorite = useCallback((show: FavoriteShow) => {
    setFavorites(prev => {
      if (!prev.some(fav => fav.id === show.id)) {
        console.log('➕ Provider adding favorite', show);
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
    const timestamp = new Date().toISOString();
    console.log(`🌟 Provider [${timestamp}] toggleFavorite called for: ${show.title} (${show.id})`);
    
    setFavorites(prev => {
      const isCurrentlyFavorite = prev.some(fav => fav.id === show.id);
      console.log(`📊 Provider [${timestamp}] Current state: ${prev.length} favorites`, prev.map(f => f.title));
      console.log(`🔍 Provider [${timestamp}] Is "${show.title}" currently favorite? ${isCurrentlyFavorite}`);
      
      if (isCurrentlyFavorite) {
        // Remove from favorites
        console.log(`➖ Provider [${timestamp}] Removing "${show.title}" from favorites`);
        const newFavorites = prev.filter(fav => fav.id !== show.id);
        console.log(`📋 Provider [${timestamp}] New favorites after removal:`, newFavorites.map(f => f.title));
        saveToLocalStorage(newFavorites);
        return newFavorites;
      } else {
        // Add to favorites
        console.log(`➕ Provider [${timestamp}] Adding "${show.title}" to favorites`);
        const newFavorites = [...prev, show];
        console.log(`📋 Provider [${timestamp}] New favorites after addition:`, newFavorites.map(f => f.title));
        saveToLocalStorage(newFavorites);
        return newFavorites;
      }
    });
  }, [saveToLocalStorage]);

  const isFavorite = useCallback((id: string): boolean => {
    const result = favorites.some(fav => fav.id === id);
    console.log(`❓ Provider isFavorite("${id}"): ${result} (from ${favorites.length} favorites: [${favorites.map(f => f.id).join(', ')}])`);
    return result;
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
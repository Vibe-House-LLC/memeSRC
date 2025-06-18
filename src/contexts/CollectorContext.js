import React, { createContext, useContext, useState, useCallback } from 'react';

const CollectorContext = createContext();

export const useCollector = () => {
  const context = useContext(CollectorContext);
  if (!context) {
    throw new Error('useCollector must be used within a CollectorProvider');
  }
  return context;
};

export const CollectorProvider = ({ children }) => {
  const [collectedItems, setCollectedItems] = useState([]);

  const addItem = useCallback((item) => {
    setCollectedItems(prev => {
      // Check if item already exists (by unique identifier)
      const exists = prev.some(existing => 
        existing.cid === item.cid && 
        existing.season === item.season && 
        existing.episode === item.episode && 
        existing.frame === item.frame
      );
      
      if (exists) {
        return prev; // Don't add duplicates
      }
      
      return [...prev, { ...item, id: Date.now() + Math.random() }];
    });
  }, []);

  const removeItem = useCallback((itemId) => {
    setCollectedItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const clearAll = useCallback(() => {
    setCollectedItems([]);
  }, []);

  const isItemCollected = useCallback((cid, season, episode, frame) => {
    return collectedItems.some(item => 
      item.cid === cid && 
      item.season === season && 
      item.episode === episode && 
      item.frame === frame
    );
  }, [collectedItems]);

  const value = {
    collectedItems,
    addItem,
    removeItem,
    clearAll,
    isItemCollected,
    count: collectedItems.length
  };

  return (
    <CollectorContext.Provider value={value}>
      {children}
    </CollectorContext.Provider>
  );
};

export default CollectorContext;

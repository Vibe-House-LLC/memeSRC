import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CollectorContext = createContext();
const STORAGE_KEY = 'memeSRC_collectedItems';

export const useCollector = () => {
  const context = useContext(CollectorContext);
  if (!context) {
    throw new Error('useCollector must be used within a CollectorProvider');
  }
  return context;
};

// Helper function to safely get items from localStorage
const getStoredItems = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading collected items from localStorage:', error);
    return [];
  }
};

// Helper function to safely save items to localStorage
const saveItemsToStorage = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Error saving collected items to localStorage:', error);
  }
};

export const CollectorProvider = ({ children }) => {
  const [collectedItems, setCollectedItems] = useState(() => getStoredItems());

  // Save to localStorage whenever collectedItems changes
  useEffect(() => {
    saveItemsToStorage(collectedItems);
  }, [collectedItems]);

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

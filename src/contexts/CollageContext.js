import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CollageContext = createContext();
const STORAGE_KEY = 'memeSRC_collageItems';

export const useCollage = () => {
  const context = useContext(CollageContext);
  if (!context) {
    throw new Error('useCollage must be used within a CollageProvider');
  }
  return context;
};

// Helper function to safely get items from localStorage
const getStoredItems = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading collage items from localStorage:', error);
    return [];
  }
};

// Helper function to safely save items to localStorage
const saveItemsToStorage = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Error saving collage items to localStorage:', error);
  }
};

export const CollageProvider = ({ children }) => {
  const [collageItems, setCollageItems] = useState(() => getStoredItems());

  // Save to localStorage whenever collageItems changes
  useEffect(() => {
    saveItemsToStorage(collageItems);
  }, [collageItems]);

  const addItem = useCallback((item) => {
    setCollageItems(prev => {
      return [...prev, { ...item, id: Date.now() + Math.random() }];
    });
  }, []);

  const removeItem = useCallback((itemId) => {
    setCollageItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const clearAll = useCallback(() => {
    setCollageItems([]);
  }, []);

  const isItemInCollage = useCallback((cid, season, episode, frame) => {
    return collageItems.some(item => 
      item.cid === cid && 
      item.season === season && 
      item.episode === episode && 
      item.frame === frame
    );
  }, [collageItems]);

  const value = {
    collageItems,
    addItem,
    removeItem,
    clearAll,
    isItemInCollage,
    count: collageItems.length
  };

  return (
    <CollageContext.Provider value={value}>
      {children}
    </CollageContext.Provider>
  );
};

export default CollageContext;
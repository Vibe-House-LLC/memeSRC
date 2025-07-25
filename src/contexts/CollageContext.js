import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';

const CollageContext = createContext();
const STORAGE_KEY = 'memeSRC_collageItems';
const OLD_STORAGE_KEY = 'memeSRC_collectedItems';

export const useCollage = () => {
  const context = useContext(CollageContext);
  if (!context) {
    throw new Error('useCollage must be used within a CollageProvider');
  }
  return context;
};

// Helper function to safely get items from localStorage with migration
const getStoredItems = () => {
  try {
    // Check if we have data in the new key
    const stored = localStorage.getItem(STORAGE_KEY);
    
    if (stored) {
      // Data exists in new key, parse and return it
      return JSON.parse(stored);
    }
    
    // Check if we have data in the old key that needs migration
    const oldStored = localStorage.getItem(OLD_STORAGE_KEY);
    if (oldStored) {
      console.log('Migrating collage items from old storage key to new key...');
      
      // Parse the old data
      const oldItems = JSON.parse(oldStored);
      
      // Save to new key
      localStorage.setItem(STORAGE_KEY, JSON.stringify(oldItems));
      
      // Remove old key to clean up
      localStorage.removeItem(OLD_STORAGE_KEY);
      
      console.log(`Successfully migrated ${oldItems.length} collage items`);
      return oldItems;
    }
    
    // No data in either key, return empty array
    return [];
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
    setCollageItems(prev => [...prev, { ...item, id: Date.now() + Math.random() }]);
  }, []);

  const removeItem = useCallback((itemId) => {
    setCollageItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const clearAll = useCallback(() => {
    setCollageItems([]);
  }, []);

  const isItemInCollage = useCallback((cid, season, episode, frame) => collageItems.some(item => 
      item.cid === cid && 
      item.season === season && 
      item.episode === episode && 
      item.frame === frame
    ), [collageItems]);

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

CollageProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default CollageContext;
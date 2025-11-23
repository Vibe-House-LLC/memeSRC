import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'memeSRC_custom_filters';

/**
 * @typedef {Object} CustomFilter
 * @property {string} id - Unique ID for the filter (e.g., 'custom_123456789')
 * @property {string} name - Display name for the filter
 * @property {string[]} items - List of series IDs included in the filter
 * @property {string} [emoji] - Optional emoji for the filter
 * @property {string} [colorMain] - Optional main color
 * @property {string} [colorSecondary] - Optional secondary color
 */

export function useCustomFilters() {
    const [customFilters, setCustomFilters] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load custom filters:', error);
            return [];
        }
    });

    // Save filters to localStorage whenever they change
    const saveFilters = useCallback((filters) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
            setCustomFilters(filters);
            window.dispatchEvent(new Event('memeSRC_custom_filters_updated'));
        } catch (error) {
            console.error('Failed to save custom filters:', error);
        }
    }, []);

    useEffect(() => {
        const handleStorageChange = () => {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                setCustomFilters(stored ? JSON.parse(stored) : []);
            } catch (error) {
                console.error('Failed to load custom filters:', error);
            }
        };

        window.addEventListener('memeSRC_custom_filters_updated', handleStorageChange);
        window.addEventListener('storage', handleStorageChange); // Also listen for cross-tab changes

        return () => {
            window.removeEventListener('memeSRC_custom_filters_updated', handleStorageChange);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const addFilter = useCallback((name, items, emoji = '📁', colorMain = null, colorSecondary = null) => {
        const newFilter = {
            id: `custom_${Date.now()}`,
            name,
            items,
            emoji,
            colorMain,
            colorSecondary
        };
        saveFilters([...customFilters, newFilter]);
        return newFilter;
    }, [customFilters, saveFilters]);

    const updateFilter = useCallback((id, updates) => {
        const newFilters = customFilters.map(filter =>
            filter.id === id ? { ...filter, ...updates } : filter
        );
        saveFilters(newFilters);
    }, [customFilters, saveFilters]);

    const removeFilter = useCallback((id) => {
        const newFilters = customFilters.filter(filter => filter.id !== id);
        saveFilters(newFilters);
    }, [customFilters, saveFilters]);

    const getFilterById = useCallback((id) => {
        return customFilters.find(filter => filter.id === id);
    }, [customFilters]);

    return {
        customFilters,
        addFilter,
        updateFilter,
        removeFilter,
        getFilterById
    };
}

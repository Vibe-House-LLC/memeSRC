import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useMediaQuery } from '@mui/material';

type ThemePreference = 'system' | 'light' | 'dark';
type SizePreference = 'small' | 'large';

interface SearchSettingsContextType {
    themePreference: ThemePreference;
    setThemePreference: (theme: ThemePreference) => void;
    sizePreference: SizePreference;
    setSizePreference: (size: SizePreference) => void;
    effectiveTheme: 'light' | 'dark';
}

const SearchSettingsContext = createContext<SearchSettingsContextType | undefined>(undefined);

export const useSearchSettings = () => {
    const context = useContext(SearchSettingsContext);
    if (!context) {
        throw new Error('useSearchSettings must be used within a SearchSettingsProvider');
    }
    return context;
};

export const SearchSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('searchThemePreference');
            return (stored as ThemePreference) || 'system';
        }
        return 'system';
    });

    const [sizePreference, setSizePreferenceState] = useState<SizePreference>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('searchSizePreference');
            return (stored as SizePreference) || 'small';
        }
        return 'small';
    });

    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    const setThemePreference = (theme: ThemePreference) => {
        setThemePreferenceState(theme);
        localStorage.setItem('searchThemePreference', theme);
    };

    const setSizePreference = (size: SizePreference) => {
        setSizePreferenceState(size);
        localStorage.setItem('searchSizePreference', size);
    };

    const effectiveTheme = useMemo(() => {
        if (themePreference === 'system') {
            return prefersDarkMode ? 'dark' : 'light';
        }
        return themePreference;
    }, [themePreference, prefersDarkMode]);

    const value = useMemo(
        () => ({
            themePreference,
            setThemePreference,
            sizePreference,
            setSizePreference,
            effectiveTheme,
        }),
        [themePreference, sizePreference, effectiveTheme]
    );

    return (
        <SearchSettingsContext.Provider value={value}>
            {children}
        </SearchSettingsContext.Provider>
    );
};

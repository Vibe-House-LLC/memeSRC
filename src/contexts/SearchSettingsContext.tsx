import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useMediaQuery } from '@mui/material';

type ThemePreference = 'system' | 'light' | 'dark';

interface SearchSettingsContextType {
    themePreference: ThemePreference;
    setThemePreference: (theme: ThemePreference) => void;
    compactMode: boolean;
    setCompactMode: (compact: boolean) => void;
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

    const [compactMode, setCompactModeState] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('searchCompactMode');
            return stored === 'true';
        }
        return false;
    });

    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    const setThemePreference = (theme: ThemePreference) => {
        setThemePreferenceState(theme);
        localStorage.setItem('searchThemePreference', theme);
    };

    const setCompactMode = (compact: boolean) => {
        setCompactModeState(compact);
        localStorage.setItem('searchCompactMode', String(compact));
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
            compactMode,
            setCompactMode,
            effectiveTheme,
        }),
        [themePreference, compactMode, effectiveTheme]
    );

    return (
        <SearchSettingsContext.Provider value={value}>
            {children}
        </SearchSettingsContext.Provider>
    );
};

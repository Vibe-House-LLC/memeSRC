import PropTypes from 'prop-types';
import { createContext, useMemo, useState } from 'react';
// @mui
import { CssBaseline, useMediaQuery } from '@mui/material';
import { ThemeProvider as MUIThemeProvider, createTheme, StyledEngineProvider } from '@mui/material/styles';
//
import paletteDark from './paletteDark';
import shadowsDark from './shadowsDark';
import typography from './typography';
import GlobalStyles from './globalStyles';
import customShadowsDark from './customShadowsDark';
import componentsOverride from './overrides';
import shadowsLight from './shadowsLight';
import customShadowsLight from './customShadowsLight';
import paletteLight from './paletteLight';

// ----------------------------------------------------------------------

ThemeProvider.propTypes = {
  children: PropTypes.node,
};

export const ColorModeContext = createContext(({ toggleColorMode: () => { },  }));

export default function ThemeProvider({ children }) {
  // const prefers = useMediaQuery('(prefers-color-scheme: dark)') ? 'dark' : 'light';
  // const themeSetting = localStorage.getItem('themeSetting') || prefers

  // TODO: fix light mode issues and re-enable automatic dark mode preference
  // For now, this forces dark mode
  const themeSetting = 'dark'
  const [mode, setMode] = useState(themeSetting);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        
        setMode((prevMode) => {
          localStorage.setItem('themeSetting', prevMode === 'light' ? 'dark' : 'light');
          return (prevMode === 'light' ? 'dark' : 'light')
        });
      },
    }),
    [],
  );

  const themeOptions = useMemo(
    () => (mode === 'dark') ? ({
      palette: paletteDark,
      shape: { borderRadius: 6 },
      typography,
      shadows: shadowsDark(),
      customShadows: customShadowsDark(),
    }) : ({
      palette: paletteLight,
      shape: { borderRadius: 6 },
      typography,
      shadows: shadowsLight(),
      customShadows: customShadowsLight(),
    }),
    [mode]
  );

  const theme = createTheme(themeOptions);
  theme.components = componentsOverride(theme);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <StyledEngineProvider injectFirst>
        <MUIThemeProvider theme={theme}>
          <CssBaseline />
          <GlobalStyles />
          {children}
        </MUIThemeProvider>
      </StyledEngineProvider>
    </ColorModeContext.Provider>
  );
}

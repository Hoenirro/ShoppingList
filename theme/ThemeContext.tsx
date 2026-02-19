// theme/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, AppTheme, DEFAULT_THEME_ID } from './theme';

const THEME_KEY = '@shopping_theme_id';

interface ThemeContextValue {
  theme: AppTheme;
  themeId: string;
  setThemeId: (id: string) => Promise<void>;
  allThemes: AppTheme[];
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: THEMES[0],
  themeId: DEFAULT_THEME_ID,
  setThemeId: async () => {},
  allThemes: THEMES,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState(DEFAULT_THEME_ID);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(saved => {
      if (saved && THEMES.find(t => t.id === saved)) {
        setThemeIdState(saved);
      }
    });
  }, []);

  const setThemeId = async (id: string) => {
    setThemeIdState(id);
    await AsyncStorage.setItem(THEME_KEY, id);
  };

  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, themeId, setThemeId, allThemes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

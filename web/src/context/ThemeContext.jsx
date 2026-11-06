import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('fc_theme');
      if (saved) return saved === 'dark';
    } catch {
      // Ignore localStorage errors (e.g. private mode)
    }
    return true; // Default to dark mode for elite tactical board aesthetic
  });

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    // Update browser tab favicon dynamically to match active theme
    const favicon = document.getElementById('app-favicon') || document.querySelector("link[rel*='icon']");
    if (favicon) {
      favicon.setAttribute('href', isDark ? '/football_ball_dark.svg' : '/football_ball_light.svg');
    }

    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
      if (body) {
        body.classList.add('dark');
        body.classList.remove('light');
      }
      try {
        localStorage.setItem('fc_theme', 'dark');
      } catch {}
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
      if (body) {
        body.classList.remove('dark');
        body.classList.add('light');
      }
      try {
        localStorage.setItem('fc_theme', 'light');
      } catch {}
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);
  const setTheme = (mode) => setIsDark(mode === 'dark');

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}

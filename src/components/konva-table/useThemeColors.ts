import { useEffect, useState } from 'react';

export interface ThemeColors {
  background: string;
  foreground: string;
  border: string;
  muted: string;
  mutedForeground: string;
  primary: string;
  selection: string;
  gridLines: string;
}

export function useThemeColors() {
  const [colors, setColors] = useState<ThemeColors>({
    background: '#ffffff',
    foreground: '#09090b',
    border: '#e4e4e7',
    muted: '#f4f4f5',
    mutedForeground: '#71717a',
    primary: '#18181b',
    selection: '#3b82f6',
    gridLines: '#e4e4e7',
  });

  useEffect(() => {
    const updateColors = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      
      const getVal = (variable: string, fallback: string) => {
        const val = computedStyle.getPropertyValue(variable);
        return val ? `hsl(${val.trim()})` : fallback;
      };

      setColors({
        background: getVal('--background', '#ffffff'),
        foreground: getVal('--foreground', '#09090b'),
        border: getVal('--border', '#e4e4e7'),
        muted: getVal('--muted', '#f4f4f5'),
        mutedForeground: getVal('--muted-foreground', '#71717a'),
        primary: getVal('--primary', '#18181b'),
        selection: getVal('--ring', '#3b82f6'), // Using ring color for selection focus
        gridLines: getVal('--border', '#e4e4e7'),
      });
    };

    updateColors();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
        // slight delay to allow CSS variables to update
        setTimeout(updateColors, 50); 
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return colors;
}

// Theme runtime — 시스템 다크모드(useColorScheme) 연동
// useTheme()이 현재 스킴의 COLORS / SHADOWS 토큰을 내려준다.
// 화면들은 `const { COLORS, SHADOWS } = useTheme();` 로 기존 참조명을 그대로 셰도잉.
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { COLORS_LIGHT, COLORS_DARK, SHADOWS } from './colors';

export type ThemeColors = typeof COLORS_LIGHT;
export type ThemeShadows = typeof SHADOWS;
export type ThemeScheme = 'light' | 'dark';

export interface ThemeValue {
  COLORS: ThemeColors;
  SHADOWS: ThemeShadows;
  scheme: ThemeScheme;
}

const ThemeContext = createContext<ThemeValue>({
  COLORS: COLORS_LIGHT,
  SHADOWS,
  scheme: 'light',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const scheme: ThemeScheme = systemScheme === 'dark' ? 'dark' : 'light';

  const value = useMemo<ThemeValue>(
    () => ({
      COLORS: scheme === 'dark' ? COLORS_DARK : COLORS_LIGHT,
      // 다크에서는 그림자가 거의 안 보이는 게 정상 — 카드 구분은
      // COLORS_DARK의 surface/surfaceElevated/border 토큰이 담당한다.
      SHADOWS,
      scheme,
    }),
    [scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}

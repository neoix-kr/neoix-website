import { useColorScheme } from 'react-native';
import { COLORS, CLOUD_SHADOW, NIGHT, LIGHT, DARK, Palette } from './colors';

// 시스템 다크모드에 따라 낮 하늘 / 밤 하늘 팔레트 반환
export function useTheme(): { C: Palette; isDark: boolean } {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return { C: isDark ? DARK : LIGHT, isDark };
}

// 간격 스케일 (4의 배수 리듬)
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// 모서리 — 깔끔하고 절제된 곡률 (Toss 톤)
export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

// 타이포 — Pretendard 온리
export const FONT = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
};

export const TYPO = {
  h1: { fontFamily: FONT.bold, fontSize: 24, lineHeight: 32, color: COLORS.text },
  h2: { fontFamily: FONT.semibold, fontSize: 20, lineHeight: 28, color: COLORS.text },
  title: { fontFamily: FONT.semibold, fontSize: 18, lineHeight: 25, color: COLORS.text },
  bodyStrong: { fontFamily: FONT.medium, fontSize: 15, lineHeight: 22, color: COLORS.text },
  body: { fontFamily: FONT.regular, fontSize: 15, lineHeight: 22, color: COLORS.textBody },
  label: { fontFamily: FONT.medium, fontSize: 13, lineHeight: 18, color: COLORS.text },
  caption: { fontFamily: FONT.regular, fontSize: 12, lineHeight: 16, color: COLORS.textCaption },
} as const;

export { COLORS, CLOUD_SHADOW, NIGHT, LIGHT, DARK };
export type { Palette };

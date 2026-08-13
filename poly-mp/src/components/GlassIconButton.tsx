import React, { useMemo } from 'react';
import {
  Insets,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useTheme, type ThemeColors, type ThemeShadows } from '../theme/ThemeContext';
import PressableScale from './PressableScale';

// iOS 26+ 네이티브 리퀴드 글라스 사용 가능 여부 — 앱 실행 중 바뀌지 않으므로 모듈 레벨 상수
const GLASS_ENABLED = Platform.OS === 'ios' && isLiquidGlassAvailable();

const lightHaptic = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
};

// ─────────────────────────────────────────────────────────────
// GlassIconButton — 원형 아이콘 버튼
//  · iOS 26+: 네이티브 리퀴드 글라스 (GlassView regular + isInteractive)
//  · 그 외(구 iOS/Android/web): 기존 앱 스타일 폴백
//    - plain   : 투명 원 (기존 헤더 아이콘 버튼과 동일)
//    - surface : 흰 원 + 보더 + 옅은 그림자 (떠 있는 컨트롤용)
//    - primary : 브랜드 인디고 원 + 컬러 섀도 (기존 FAB과 동일)
// ─────────────────────────────────────────────────────────────
export interface GlassIconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  /** 원 지름. 기본 44 */
  size?: number;
  iconSize?: number;
  /** 글라스 모드 아이콘 색. 기본 grey900 */
  iconColor?: string;
  /** 비글라스 폴백 스타일. 기본 'surface' */
  fallbackVariant?: 'plain' | 'surface' | 'primary';
  /** 폴백 아이콘 색. 기본: primary variant → 흰색, 그 외 → iconColor */
  fallbackIconColor?: string;
  /** 바깥 컨테이너(포지셔닝)용 스타일 — width/height/배경은 넣지 말 것 */
  style?: StyleProp<ViewStyle>;
  hitSlop?: Insets;
  disabled?: boolean;
  /** 원 안에 겹쳐 그릴 추가 요소 (예: 라이브 빨간 점) */
  children?: React.ReactNode;
}

export default function GlassIconButton({
  icon,
  onPress,
  size = 44,
  iconSize,
  iconColor,
  fallbackVariant = 'surface',
  fallbackIconColor,
  style,
  hitSlop,
  disabled,
  children,
}: GlassIconButtonProps) {
  const { COLORS, SHADOWS } = useTheme();
  const fallbackStyles = useMemo(() => makeFallbackStyles(COLORS, SHADOWS), [COLORS]);
  iconColor = iconColor ?? COLORS.grey900;
  const resolvedIconSize = iconSize ?? Math.round(size * 0.5);
  const circle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (GLASS_ENABLED) {
    // 글라스 모드 — 터치는 바깥 Pressable, 시각 반응(shimmer)은 isInteractive가 담당
    return (
      <Pressable
        onPress={() => {
          lightHaptic();
          onPress?.();
        }}
        disabled={disabled}
        hitSlop={hitSlop}
        style={style}
      >
        <GlassView glassEffectStyle="regular" isInteractive style={circle}>
          <Ionicons name={icon} size={resolvedIconSize} color={iconColor} />
          {children}
        </GlassView>
      </Pressable>
    );
  }

  // 폴백 — 기존 앱 문법 그대로 (PressableScale 눌림 + 햅틱)
  const variantStyle =
    fallbackVariant === 'primary'
      ? fallbackStyles.primary
      : fallbackVariant === 'surface'
        ? fallbackStyles.surface
        : undefined;
  const resolvedFallbackIconColor =
    fallbackIconColor ?? (fallbackVariant === 'primary' ? COLORS.textInverse : iconColor);

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      containerStyle={style}
      style={[circle, variantStyle]}
      scaleTo={0.94}
    >
      <Ionicons name={icon} size={resolvedIconSize} color={resolvedFallbackIconColor} />
      {children}
    </PressableScale>
  );
}

// ─────────────────────────────────────────────────────────────
// GlassPill — 라벨 있는 알약 버튼 (labelled FAB용, 예: "민원 넣기")
//  · iOS 26+: 리퀴드 글라스 알약 + 브랜드 틴트 텍스트
//  · 폴백: 기존 프라이머리 알약 FAB과 동일
// ─────────────────────────────────────────────────────────────
export interface GlassPillProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  /** 바깥 컨테이너(포지셔닝)용 스타일 */
  style?: StyleProp<ViewStyle>;
  /** 글라스 모드 아이콘·라벨 색. 기본 primary */
  tint?: string;
  disabled?: boolean;
}

export function GlassPill({
  icon,
  label,
  onPress,
  style,
  tint,
  disabled,
}: GlassPillProps) {
  const { COLORS } = useTheme();
  const pillStyles = useMemo(() => makePillStyles(COLORS), [COLORS]);
  tint = tint ?? COLORS.primary;
  if (GLASS_ENABLED) {
    return (
      <Pressable
        onPress={() => {
          lightHaptic();
          onPress?.();
        }}
        disabled={disabled}
        style={style}
      >
        <GlassView glassEffectStyle="regular" isInteractive style={pillStyles.pill}>
          <Ionicons name={icon} size={17} color={tint} />
          <Text style={[pillStyles.label, { color: tint }]}>{label}</Text>
        </GlassView>
      </Pressable>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      containerStyle={style}
      style={[pillStyles.pill, pillStyles.pillFallback]}
      scaleTo={0.94}
    >
      <Ionicons name={icon} size={17} color={COLORS.textInverse} />
      <Text style={[pillStyles.label, { color: COLORS.textInverse }]}>{label}</Text>
    </PressableScale>
  );
}

const makeFallbackStyles = (COLORS: ThemeColors, SHADOWS: ThemeShadows) => StyleSheet.create({
  surface: {
    backgroundColor: COLORS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...SHADOWS.standard,
  },
  primary: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});

const makePillStyles = (COLORS: ThemeColors) => StyleSheet.create({
  // 라벨 색은 호출부 인라인({ color: tint })이 담당 — 타이포는 전역 기본값 유지
  label: {},
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 50,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  pillFallback: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});

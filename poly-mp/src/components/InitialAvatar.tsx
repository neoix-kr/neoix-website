import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ImageStyle, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface InitialAvatarProps {
  /** Photo URL — if missing or fails to load, fallback to initial */
  photo?: string | null;
  /** Display name — first character used as initial */
  name: string;
  /** Pixel size (square). Default 48 */
  size?: number;
  /** Background color for fallback circle. Defaults to a neutral gray. */
  bgColor?: string;
  /** Optional style overrides for the container */
  style?: ViewStyle;
}

/**
 * Bulletproof avatar:
 *   - Renders the photo if URL is valid and loads
 *   - Falls back to a colored circle with the first character of `name`
 *   - Detects broken external placeholders (via.placeholder.com etc.) automatically
 */
export default function InitialAvatar({
  photo,
  name,
  size = 48,
  bgColor,
  style,
}: InitialAvatarProps) {
  const { COLORS } = useTheme();
  const [errored, setErrored] = useState(false);

  // Normalize: empty / known-broken placeholder URLs are treated as no photo
  const isBrokenPlaceholder =
    !photo ||
    typeof photo !== 'string' ||
    photo.trim() === '' ||
    photo.includes('via.placeholder.com') ||
    photo.includes('placeholder.com');

  const showFallback = isBrokenPlaceholder || errored;
  const initial = (name?.trim()?.charAt(0) || '?').toUpperCase();

  // Default background — use COLORS.primary for cohesion.
  // 글자색은 팔레트의 textInverse를 쓴다: 다크 팔레트의 primary는 밝은 색(#FAFAFA)이라
  // 흰 글자를 하드코딩하면 이니셜이 배경에 묻혀 보이지 않는다.
  const fallbackBg = bgColor || COLORS.primary;
  const fallbackFg = COLORS.textInverse;

  if (showFallback) {
    return (
      <View
        style={[
          styles.fallback,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: fallbackBg,
          },
          style,
        ]}
      >
        <Text
          style={{
            color: fallbackFg,
            fontWeight: '700',
            fontSize: Math.max(12, size * 0.42),
            letterSpacing: -0.3,
          }}
        >
          {initial}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: photo as string }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: COLORS.skeleton,
        },
        style as ImageStyle,
      ]}
      onError={() => setErrored(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

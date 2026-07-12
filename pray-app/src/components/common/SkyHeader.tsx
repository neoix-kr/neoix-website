import React from 'react';
import { Image, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, SPACING } from '../../theme';

// 앱 공통 하늘 헤더 — 실사 구름 PNG (라이트=선명, 다크=어스름).
// 메인 탭 4개(기도함/이웃/기도마당/나)의 상단을 통일한다.
const CLOUD_BIG = require('../../../assets/cloud-big.png');
const CLOUD_SMALL = require('../../../assets/cloud-small.png');

export default function SkyHeader({
  children,
  style,
  paddingBottom = 24,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  paddingBottom?: number;
}) {
  const { C, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={C.sky}
      style={[
        {
          paddingTop: insets.top + 18,
          paddingHorizontal: SPACING.xl,
          paddingBottom,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Image
        source={CLOUD_BIG}
        resizeMode="contain"
        style={{
          position: 'absolute',
          top: insets.top - 4,
          right: -60,
          width: 300,
          height: 82,
          opacity: isDark ? 0.22 : 0.9,
        }}
      />
      <Image
        source={CLOUD_SMALL}
        resizeMode="contain"
        style={{
          position: 'absolute',
          top: insets.top + 66,
          left: -34,
          width: 170,
          height: 62,
          opacity: isDark ? 0.16 : 0.65,
        }}
      />
      {children}
    </LinearGradient>
  );
}

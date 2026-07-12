import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NIGHT } from '../../theme/colors';

// 깊은 밤하늘 배경 — 그라데이션 + 잔별. 기도 모드 화면들의 공용 배경.
// 별은 고정 좌표(% 기반)라 렌더마다 흔들리지 않는다.
const STARS: { x: number; y: number; s: number; dim: boolean }[] = [
  { x: 12, y: 8, s: 2, dim: true }, { x: 78, y: 6, s: 3, dim: false },
  { x: 55, y: 12, s: 2, dim: true }, { x: 90, y: 16, s: 2, dim: true },
  { x: 30, y: 18, s: 2.5, dim: false }, { x: 66, y: 24, s: 2, dim: true },
  { x: 8, y: 30, s: 2, dim: true }, { x: 86, y: 34, s: 2.5, dim: false },
  { x: 42, y: 38, s: 2, dim: true }, { x: 20, y: 46, s: 2, dim: true },
  { x: 72, y: 52, s: 2, dim: true }, { x: 50, y: 60, s: 2, dim: true },
];

export default function NightSky({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={NIGHT.sky} style={styles.root}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {STARS.map((st, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: `${st.x}%`,
              top: `${st.y}%`,
              width: st.s,
              height: st.s,
              borderRadius: st.s,
              backgroundColor: st.dim ? NIGHT.starDim : NIGHT.star,
            }}
          />
        ))}
      </View>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

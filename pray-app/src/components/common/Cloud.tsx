import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

// 뭉게구름 — 원 여러 개를 "불투명 흰색"으로 겹치고 컨테이너에서 한 번에 투명도를 걸어
// 겹친 자리에 이음새가 보이지 않는 통구름을 만든다. (원마다 투명도를 주면 싸구려 blob이 됨)
export default function Cloud({
  size = 120,
  opacity = 0.9,
  color = '#FFFFFF',
  style,
}: {
  size?: number;
  opacity?: number;
  color?: string;
  style?: ViewStyle;
}) {
  const u = size / 100; // 기준 100 → 스케일
  const circle = (cx: number, cy: number, r: number): ViewStyle => ({
    position: 'absolute',
    left: (cx - r) * u,
    top: (cy - r) * u,
    width: r * 2 * u,
    height: r * 2 * u,
    borderRadius: r * u,
    backgroundColor: color,
  });

  return (
    <View pointerEvents="none" style={[{ width: 100 * u, height: 62 * u, opacity }, style]}>
      <View style={circle(22, 42, 17)} />
      <View style={circle(43, 32, 23)} />
      <View style={circle(66, 38, 19)} />
      <View style={circle(84, 46, 13)} />
      {/* 아랫면 평평하게 */}
      <View
        style={{
          position: 'absolute',
          left: 6 * u,
          top: 40 * u,
          width: 90 * u,
          height: 20 * u,
          borderRadius: 12 * u,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export const styles = StyleSheet.create({});

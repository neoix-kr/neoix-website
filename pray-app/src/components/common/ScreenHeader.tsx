import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, SPACING, useTheme, RADIUS, Palette } from '../../theme';

// 푸시/모달 화면 공용 헤더 — 뒤로가기 + 타이틀 + 우측 액션
export default function ScreenHeader({
  title,
  right,
  modal,
  dark,
}: {
  title?: string;
  right?: React.ReactNode;
  modal?: boolean; // 모달이면 X(닫기), 푸시면 ← (뒤로)
  dark?: boolean;
}) {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const color = dark ? '#F2F4F6' : C.text;

  return (
    // iOS 모달은 시트라 상태바 아래에서 시작하지만, 안드로이드 모달은 전체 화면이라 상단 인셋 필요
    <View style={[styles.root, { paddingTop: (modal ? (Platform.OS === 'ios' ? 10 : insets.top) : insets.top) + 6 }]}>
      <Pressable onPress={() => nav.goBack()} hitSlop={10} style={styles.btn}>
        <Ionicons name={modal ? 'close' : 'chevron-back'} size={24} color={color} />
      </Pressable>
      <Text style={[styles.title, { color }]} numberOfLines={1}>{title ?? ''}</Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: 10,
  },
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontFamily: FONT.semibold },
  right: { minWidth: 40, alignItems: 'flex-end', justifyContent: 'center' },
});

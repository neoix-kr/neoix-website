import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { FONT, RADIUS, SPACING, useTheme, CLOUD_SHADOW, Palette } from '../theme';
import { usePrayerStore } from '../store/PrayerStore';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// 기도하기 탭 — 기도할 소스를 골라 스와이프 세션 시작.
// 다른 탭과 같은 문법(좌상단 타이틀 + 카드 리스트 + 하단 버튼), 세션 화면만 다크.
type Source = {
  key: string;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  count: number;
};

export default function PrayerModeScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const store = usePrayerStore();
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  const sources: Source[] = useMemo(() => {
    const active = store.prayers.filter((p) => !p.answeredAt);
    const byPeriod = (pd: string) => active.filter((p) => p.period === pd).length;
    const list: Source[] = [
      { key: 'urgent', label: '긴급한 기도', desc: '지금 가장 급한 제목', icon: 'alert-circle-outline', count: byPeriod('urgent') },
      { key: 'week', label: '이번 주', desc: '이번 주 기도제목', icon: 'calendar-outline', count: byPeriod('week') },
      { key: 'period', label: '올해 · 이번 달', desc: '길게 품는 기도', icon: 'infinite-outline', count: byPeriod('period') },
    ];
    store.clubs.forEach((c) => {
      list.push({
        key: `club:${c.id}`,
        label: c.name,
        desc: '모임에 공유된 기도',
        icon: 'people-outline',
        count: active.filter((p) => p.clubId === c.id).length,
      });
    });
    list.push({
      key: 'community',
      label: '기도마당',
      desc: '이름 모를 성도들의 기도',
      icon: 'earth-outline',
      count: Math.min(store.posts.length, 10),
    });
    return list;
  }, [store.prayers, store.clubs, store.posts]);

  const [selected, setSelected] = useState<Set<string>>(() => {
    const s = new Set<string>();
    ['urgent', 'week', 'period'].forEach((k) => {
      if (sources.find((x) => x.key === k && x.count > 0)) s.add(k);
    });
    return s;
  });

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const totalCount = sources.filter((s) => selected.has(s.key)).reduce((sum, s) => sum + s.count, 0);
  const canStart = totalCount > 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 18 }]}>
      <View style={styles.header}>
        <Text style={styles.h1}>기도하기</Text>
        <Text style={styles.sub}>무엇을 기도할지 골라서 하나씩 넘기며 기도해요</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingBottom: 20 }}>
        <View style={[styles.group, CLOUD_SHADOW.soft]}>
          {sources.map((s, idx) => {
            const on = selected.has(s.key);
            const empty = s.count === 0;
            return (
              <Pressable
                key={s.key}
                onPress={() => !empty && toggle(s.key)}
                style={({ pressed }) => [
                  styles.row,
                  idx > 0 && styles.rowDivider,
                  pressed && !empty && { backgroundColor: C.cardMuted },
                ]}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={s.icon} size={18} color={empty ? C.textPlaceholder : C.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, empty && { color: C.textPlaceholder }]} numberOfLines={1}>{s.label}</Text>
                  <Text style={styles.rowDesc}>{empty ? '기도제목 없음' : `${s.desc} · ${s.count}개`}</Text>
                </View>
                <View style={[styles.check, on && styles.checkOn, empty && { opacity: 0.35 }]}>
                  {on && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.hint}>기도를 시작하면 화면이 어두워져요. 눈이 부시지 않게, 한 제목씩 집중할 수 있어요.</Text>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 92 }]}>
        <Pressable
          onPress={() => canStart && nav.navigate('PrayerSession', { sources: Array.from(selected) })}
          disabled={!canStart}
          style={({ pressed }) => [styles.startBtn, !canStart && { opacity: 0.4 }, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.startText}>
            {canStart ? `${totalCount}개 기도 시작` : '기도할 목록을 선택하세요'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    header: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.lg },
    h1: { fontSize: 24, color: C.textStrong, fontFamily: FONT.bold },
    sub: { fontSize: 14, color: C.textSecondary, fontFamily: FONT.regular, marginTop: 5 },

    group: { backgroundColor: C.surface, borderRadius: RADIUS.xl, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.lg, paddingVertical: 14 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.borderSoft },
    iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.cardMuted, alignItems: 'center', justifyContent: 'center' },
    rowLabel: { fontSize: 15.5, color: C.text, fontFamily: FONT.semibold },
    rowDesc: { fontSize: 12.5, color: C.textCaption, fontFamily: FONT.regular, marginTop: 3 },
    check: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: C.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: { backgroundColor: C.primary, borderColor: C.primary },

    hint: { fontSize: 12, lineHeight: 18, color: C.textPlaceholder, fontFamily: FONT.regular, marginTop: SPACING.md, paddingHorizontal: 4 },

    bottom: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm },
    startBtn: {
      height: 54,
      borderRadius: RADIUS.lg,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    startText: { fontSize: 16, color: '#fff', fontFamily: FONT.bold },
  });

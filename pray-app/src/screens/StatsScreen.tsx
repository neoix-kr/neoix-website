import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, RADIUS, SPACING, useTheme, CLOUD_SHADOW, Palette } from '../theme';
import { usePrayerStore } from '../store/PrayerStore';
import ScreenHeader from '../components/common/ScreenHeader';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function StatsScreen() {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const store = usePrayerStore();

  const weekTotal = store.weekCounts.reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...store.weekCounts, 1);
  const goalPct = Math.min(100, Math.round((weekTotal / store.weeklyGoal) * 100));
  const answeredCount = store.prayers.filter((p) => p.answeredAt).length;

  // 최근 7일 요일 라벨 (오래된 → 오늘)
  const labels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return DAY_LABELS[d.getDay()];
  });

  return (
    <View style={styles.root}>
      <ScreenHeader title="기도 현황" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* 요약 통계 */}
        <View style={[styles.statCard, CLOUD_SHADOW.soft]}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{store.streak}</Text>
            <Text style={styles.statLabel}>연속 기도일</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{weekTotal}</Text>
            <Text style={styles.statLabel}>이번 주 기도</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{answeredCount}</Text>
            <Text style={styles.statLabel}>응답된 기도</Text>
          </View>
        </View>

        {/* 주간 그래프 */}
        <Text style={styles.sectionTitle}>최근 7일</Text>
        <View style={[styles.chartCard, CLOUD_SHADOW.soft]}>
          <View style={styles.chart}>
            {store.weekCounts.map((c, i) => (
              <View key={i} style={styles.barCol}>
                <Text style={styles.barValue}>{c > 0 ? c : ''}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      { height: `${Math.max(c / maxCount, 0.04) * 100}%` },
                      i === 6 && { backgroundColor: C.primary },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, i === 6 && { color: C.primary, fontFamily: FONT.semibold }]}>{labels[i]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 주간 목표 */}
        <Text style={styles.sectionTitle}>주간 목표</Text>
        <View style={[styles.goalCard, CLOUD_SHADOW.soft]}>
          <View style={styles.goalRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.goalValue}>
                {weekTotal}
                <Text style={styles.goalTotal}> / {store.weeklyGoal}회</Text>
              </Text>
              <Text style={styles.goalDesc}>
                {goalPct >= 100 ? '이번 주 목표를 이뤘어요' : `목표까지 ${store.weeklyGoal - weekTotal}회 남았어요`}
              </Text>
            </View>
            <View style={styles.stepper}>
              <Pressable onPress={() => store.setWeeklyGoal(store.weeklyGoal - 5)} hitSlop={6} style={styles.stepBtn}>
                <Ionicons name="remove" size={17} color={C.textSecondary} />
              </Pressable>
              <Pressable onPress={() => store.setWeeklyGoal(store.weeklyGoal + 5)} hitSlop={6} style={styles.stepBtn}>
                <Ionicons name="add" size={17} color={C.textSecondary} />
              </Pressable>
            </View>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${goalPct}%` }, goalPct >= 100 && { backgroundColor: C.success }]} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingHorizontal: SPACING.xl, paddingBottom: 60 },
  sectionTitle: { fontSize: 13, color: C.textCaption, fontFamily: FONT.semibold, marginTop: SPACING.xl, marginBottom: SPACING.sm, paddingHorizontal: 2 },

  statCard: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: RADIUS.lg, paddingVertical: SPACING.xl },
  statItem: { flex: 1, alignItems: 'center', gap: 5 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: C.divider, marginVertical: 6 },
  statValue: { fontSize: 24, color: C.text, fontFamily: FONT.bold },
  statLabel: { fontSize: 12, color: C.textCaption, fontFamily: FONT.regular },

  chartCard: { backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: SPACING.lg },
  chart: { flexDirection: 'row', height: 150, alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  barValue: { fontSize: 11, color: C.textCaption, fontFamily: FONT.medium, height: 16 },
  barTrack: { flex: 1, width: 22, justifyContent: 'flex-end' },
  bar: { width: 22, borderRadius: 6, backgroundColor: C.backgroundSky },
  barLabel: { fontSize: 11.5, color: C.textCaption, fontFamily: FONT.regular, marginTop: 6 },

  goalCard: { backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: SPACING.xl },
  goalRow: { flexDirection: 'row', alignItems: 'center' },
  goalValue: { fontSize: 22, color: C.text, fontFamily: FONT.bold },
  goalTotal: { fontSize: 14, color: C.textCaption, fontFamily: FONT.medium },
  goalDesc: { fontSize: 12.5, color: C.textCaption, fontFamily: FONT.regular, marginTop: 3 },
  stepper: { flexDirection: 'row', gap: 8 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.cardMuted, alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: C.backgroundSky, marginTop: SPACING.lg, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: C.primary },
});

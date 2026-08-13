// 폴리 본체 공용 화면 문법 — poly-build ComplaintScreen/HomeScreen에서 실측 추출한 값 그대로.
// 언더라인 탭 · 검정 활성 카테고리 칩 · 엠프티 스테이트 · 히어로 카드.
// 모든 화면은 이 컴포넌트 + Header(GlassIconButton)로 조립한다. 자유 창작 금지.
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';
import { SHADOWS } from '../theme/colors';
import PressableScale from './PressableScale';

/* ── 언더라인 탭 (폴리 tabRow 문법) ── */
export function UnderlineTabs<T extends string>({ tabs, active, onChange }: {
  tabs: readonly T[]; active: T; onChange: (t: T) => void;
}) {
  const { COLORS } = useTheme();
  const s = useMemo(() => makeStyles(COLORS), [COLORS]);
  return (
    <View style={s.tabRow}>
      {tabs.map(tab => (
        <TouchableOpacity key={tab} style={[s.tab, active === tab && s.tabActive]} onPress={() => onChange(tab)}>
          <Text style={[s.tabText, active === tab && s.tabTextActive]}>{tab}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ── 카테고리 칩 (검정 활성 pill, 가로 스크롤) ── */
export function CategoryChips({ options, value, onChange, allLabel }: {
  options: { key: string; label: string }[];
  value: string | null;
  onChange: (key: string | null) => void;
  /** 전체 칩 라벨 — 넘기지 않으면 전체 칩 없음 */
  allLabel?: string;
}) {
  const { COLORS } = useTheme();
  const s = useMemo(() => makeStyles(COLORS), [COLORS]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categoryRow} contentContainerStyle={s.categoryContent}>
      {allLabel !== undefined && (
        <TouchableOpacity style={[s.categoryChip, value === null && s.categoryChipActive]} onPress={() => onChange(null)}>
          <Text style={[s.categoryText, value === null && s.categoryTextActive]}>{allLabel}</Text>
        </TouchableOpacity>
      )}
      {options.map(o => (
        <TouchableOpacity
          key={o.key}
          style={[s.categoryChip, value === o.key && s.categoryChipActive]}
          onPress={() => onChange(o.key)}
        >
          <Text style={[s.categoryText, value === o.key && s.categoryTextActive]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

/* ── 엠프티 스테이트 (아이콘 + 타이틀 + 서브 + 인디고 CTA) ── */
export function EmptyState({ icon, title, sub, ctaLabel, onCta }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub?: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  const { COLORS } = useTheme();
  const s = useMemo(() => makeStyles(COLORS), [COLORS]);
  return (
    <View style={s.emptyState}>
      <Ionicons name={icon} size={44} color={COLORS.grey300} />
      <Text style={s.emptyText}>{title}</Text>
      {!!sub && <Text style={s.emptySub}>{sub}</Text>}
      {!!ctaLabel && (
        <PressableScale style={s.emptyCta} scaleTo={0.97} onPress={onCta}>
          <Text style={s.emptyCtaText}>{ctaLabel}</Text>
        </PressableScale>
      )}
    </View>
  );
}

/* ── 히어로 카드 (화면 시그니처 — 큰 흰 카드 + 풀폭 인디고 버튼) ── */
export function HeroCard({ title, sub, btnLabel, btnIcon = 'arrow-forward', onPress }: {
  title: string;
  sub: string;
  btnLabel: string;
  btnIcon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const { COLORS } = useTheme();
  const s = useMemo(() => makeStyles(COLORS), [COLORS]);
  return (
    <View style={s.heroCard}>
      <Text style={s.heroTitle}>{title}</Text>
      <Text style={s.heroSub}>{sub}</Text>
      <PressableScale style={s.heroBtn} scaleTo={0.97} onPress={onPress}>
        <Text style={s.heroBtnText}>{btnLabel}</Text>
        <Ionicons name={btnIcon} size={16} color={COLORS.textInverse} />
      </PressableScale>
    </View>
  );
}

/* ── 스타일 — poly-build ComplaintScreen 실측값 그대로 ── */
const makeStyles = (COLORS: ThemeColors) => StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: 24,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
  },
  tab: { paddingBottom: 11, paddingTop: 2 },
  tabActive: {
    borderBottomWidth: 2.5,
    borderBottomColor: COLORS.text,
    marginBottom: -0.5,
  },
  tabText: { fontSize: 15.5, fontWeight: '600', color: COLORS.textTertiary, letterSpacing: -0.3 },
  tabTextActive: { color: COLORS.text, fontWeight: '800' },

  categoryRow: { maxHeight: 48, backgroundColor: COLORS.background },
  categoryContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  categoryChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    marginRight: 6,
    ...SHADOWS.subtle,
  },
  categoryChipActive: { backgroundColor: COLORS.text },
  categoryText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: -0.2 },
  categoryTextActive: { color: COLORS.textInverse, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 12 },
  emptyText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: -0.2 },
  emptySub: { fontSize: 13, color: COLORS.textCaption, textAlign: 'center', lineHeight: 19, marginTop: -6 },
  emptyCta: { marginTop: 6, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.primary },
  emptyCtaText: { fontSize: 14, fontWeight: '700', color: COLORS.textInverse, letterSpacing: -0.2 },

  heroCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    ...SHADOWS.subtle,
  },
  heroTitle: { fontSize: 21, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5, lineHeight: 29 },
  heroSub: { fontSize: 13.5, color: COLORS.textSecondary, letterSpacing: -0.2, lineHeight: 19, marginTop: 6, marginBottom: 16 },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
  },
  heroBtnText: { fontSize: 15.5, fontWeight: '700', color: COLORS.textInverse, letterSpacing: -0.2 },
});

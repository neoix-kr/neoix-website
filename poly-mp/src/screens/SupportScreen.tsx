// 후원회 — 읽기 전용 요약 (모금 현황·후원 통계). 관리는 polyx.kr/support 관리자 포털에서.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Linking, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useTheme } from '../theme/ThemeContext';
import { TYPO, SPACING, RADIUS } from '../theme/colors';
import { useMember } from '../contexts/MemberContext';

interface CommitteeSummary {
  politician: string | null;
  raised_this_year: number;
  annual_limit: number;
  donation_count: number;
  donor_count: number;
  receipt_pending: number;
}

const fmtWon = (n: number) => {
  if (n >= 100000000) {
    const eok = Math.floor(n / 100000000);
    const man = Math.round((n % 100000000) / 10000);
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  }
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString()}만원`;
  return `${n.toLocaleString()}원`;
};

export default function SupportScreen() {
  const { COLORS, SHADOWS } = useTheme();
  const insets = useSafeAreaInsets();
  const { member } = useMember();
  const [summary, setSummary] = useState<CommitteeSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!member?.committee_id) return;
    const { data, error } = await supabase.rpc('mp_committee_summary');
    if (error || data == null) { setFailed(true); return; }
    const row = (Array.isArray(data) ? data[0] : data) as any;
    if (!row) { setFailed(true); return; }
    setFailed(false);
    setSummary({
      politician: row.politician ?? null,
      raised_this_year: Number(row.raised_this_year ?? 0),
      annual_limit: Number(row.annual_limit ?? 0),
      donation_count: Number(row.donation_count ?? 0),
      donor_count: Number(row.donor_count ?? 0),
      receipt_pending: Number(row.receipt_pending ?? 0),
    });
  }, [member?.committee_id]);
  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const s = useMemo(() => styles(COLORS), [COLORS]);

  // ── 후원회 미연결 ──
  if (!member?.committee_id) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={[s.header, { paddingTop: insets.top + SPACING.md }]}>
          <Text style={s.h1}>후원회</Text>
        </View>
        <View style={s.empty}>
          <Text style={s.emptyTitle}>후원회가 아직 연결되지 않았어요</Text>
          <Text style={s.emptyBody}>polyx.kr/support 에서 후원회를 개설하면{'\n'}모금 현황을 이 화면에서 바로 확인할 수 있어요.</Text>
          <Pressable
            style={[s.primaryBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => Linking.openURL('https://polyx.kr/support/')}
          >
            <Text style={s.primaryBtnText}>후원회 개설하러 가기</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── 요약 로드 실패 ──
  if (failed) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={[s.header, { paddingTop: insets.top + SPACING.md }]}>
          <Text style={s.h1}>후원회</Text>
        </View>
        <View style={s.empty}>
          <Text style={s.emptyTitle}>요약을 불러오지 못했어요</Text>
          <Text style={s.emptyBody}>네트워크 상태를 확인한 뒤{'\n'}다시 시도해 주세요.</Text>
          <Pressable
            style={[s.primaryBtn, { backgroundColor: COLORS.primary }]}
            onPress={() => { setFailed(false); load(); }}
          >
            <Text style={s.primaryBtnText}>다시 시도</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const raised = summary?.raised_this_year ?? 0;
  const limit = summary?.annual_limit ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((raised / limit) * 100)) : 0;
  const pending = summary?.receipt_pending ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={[s.header, { paddingTop: insets.top + SPACING.md }]}>
        <Text style={s.h1}>후원회</Text>
        {summary?.politician ? <Text style={s.headerSub}>{summary.politician} 후원회</Text> : null}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: SPACING.base, paddingBottom: 120, gap: SPACING.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textCaption} />}
      >
        {/* 올해 모금액 */}
        <View style={[s.card, SHADOWS.standard]}>
          <Text style={s.cardLabel}>올해 모금액</Text>
          <Text style={[s.bigNumber, { color: COLORS.primary }]}>{fmtWon(raised)}</Text>
          <View style={s.gaugeTrack}>
            <View style={[s.gaugeFill, { width: `${pct}%`, backgroundColor: COLORS.primary }]} />
          </View>
          <View style={s.gaugeMeta}>
            <Text style={s.meta}>한도 대비 {pct}%</Text>
            <Text style={s.meta}>연간 한도 {fmtWon(limit)}</Text>
          </View>
        </View>

        {/* 후원 건수 · 후원자 수 */}
        <View style={{ flexDirection: 'row', gap: SPACING.md }}>
          <View style={[s.card, SHADOWS.standard, { flex: 1, marginBottom: 0 }]}>
            <Text style={s.cardLabel}>후원 건수</Text>
            <Text style={s.statNumber}>{(summary?.donation_count ?? 0).toLocaleString()}건</Text>
          </View>
          <View style={[s.card, SHADOWS.standard, { flex: 1, marginBottom: 0 }]}>
            <Text style={s.cardLabel}>후원자 수</Text>
            <Text style={s.statNumber}>{(summary?.donor_count ?? 0).toLocaleString()}명</Text>
          </View>
        </View>

        {/* 영수증 교부 대기 */}
        {pending > 0 ? (
          <View style={[s.card, SHADOWS.standard, { backgroundColor: COLORS.warningLight, marginBottom: 0 }]}>
            <Text style={[s.cardLabel, { color: COLORS.warning, fontWeight: '700' }]}>영수증 교부 대기</Text>
            <Text style={[s.statNumber, { color: COLORS.warning }]}>{pending.toLocaleString()}건</Text>
            <Text style={s.meta}>정치자금 영수증 교부가 필요한 후원이 있어요.</Text>
          </View>
        ) : (
          <View style={[s.card, SHADOWS.standard, { marginBottom: 0 }]}>
            <Text style={s.cardLabel}>영수증 교부 대기</Text>
            <Text style={s.statNumber}>0건</Text>
            <Text style={s.meta}>교부 대기 중인 영수증이 없어요.</Text>
          </View>
        )}

        {/* 관리자 포털 안내 */}
        <View style={[s.card, SHADOWS.standard, { marginBottom: 0 }]}>
          <Text style={s.portalText}>장부·명단·영수증 관리는 관리자 포털에서 하실 수 있어요.</Text>
          <Pressable
            style={[s.primaryBtn, { backgroundColor: COLORS.primary, alignSelf: 'stretch', marginTop: SPACING.md }]}
            onPress={() => Linking.openURL('https://polyx.kr/support/manage/')}
          >
            <Text style={s.primaryBtnText}>관리자 포털 열기</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = (C: any) => StyleSheet.create({
  header: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.md, backgroundColor: C.background },
  h1: { ...TYPO.displayLarge, color: C.text },
  headerSub: { ...TYPO.bodySmall, color: C.textCaption, marginTop: SPACING.xs },
  card: { backgroundColor: C.surface, borderRadius: RADIUS.comfortable, padding: SPACING.base, marginBottom: SPACING.md },
  cardLabel: { ...TYPO.caption, color: C.textCaption, marginBottom: SPACING.xs },
  bigNumber: { ...TYPO.displayHero },
  statNumber: { ...TYPO.headingLarge, color: C.text },
  gaugeTrack: { height: 8, borderRadius: RADIUS.pill, backgroundColor: C.backgroundSecondary, marginTop: SPACING.md, overflow: 'hidden' },
  gaugeFill: { height: 8, borderRadius: RADIUS.pill },
  gaugeMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.sm },
  meta: { ...TYPO.caption, color: C.textCaption, marginTop: SPACING.xs },
  portalText: { ...TYPO.bodySmall, color: C.textSecondary, lineHeight: 20 },
  primaryBtn: { alignSelf: 'center', height: 48, borderRadius: RADIUS.standard, paddingHorizontal: SPACING.xl, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.lg },
  primaryBtnText: { ...TYPO.subtitle, color: C.textInverse },
  empty: { alignItems: 'center', paddingTop: 96, gap: SPACING.sm, paddingHorizontal: SPACING.xl },
  emptyTitle: { ...TYPO.subtitle, color: C.text },
  emptyBody: { ...TYPO.bodySmall, color: C.textCaption, textAlign: 'center', lineHeight: 20 },
});

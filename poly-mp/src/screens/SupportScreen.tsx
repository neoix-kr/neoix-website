// 후원회 — 읽기 전용 요약 (모금 현황·후원 통계). 관리는 polyx.kr/support 관리자 포털에서.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Linking, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import { EmptyState, HeroCard } from '../components/PolyUI';
import PressableScale from '../components/PressableScale';
import { supabase } from '../lib/supabase';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';
import { SHADOWS } from '../theme/colors';
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
  const { COLORS } = useTheme();
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

  const s = useMemo(() => makeStyles(COLORS), [COLORS]);

  // ── 후원회 미연결 ──
  if (!member?.committee_id) {
    return (
      <View style={s.container}>
        <Header title="후원회" />
        <View style={{ paddingTop: 8 }}>
          <HeroCard
            title={'후원회가 아직\n연결되지 않았어요'}
            sub="polyx.kr/support 에서 후원회를 개설하면 모금 현황을 이 화면에서 바로 확인할 수 있어요"
            btnLabel="후원회 개설하러 가기"
            onPress={() => Linking.openURL('https://polyx.kr/support/')}
          />
        </View>
      </View>
    );
  }

  // ── 요약 로드 실패 ──
  if (failed) {
    return (
      <View style={s.container}>
        <Header title="후원회" />
        <EmptyState
          icon="cloud-offline-outline"
          title="요약을 불러오지 못했어요"
          sub={'네트워크 상태를 확인한 뒤\n다시 시도해 주세요'}
          ctaLabel="다시 시도"
          onCta={() => { setFailed(false); load(); }}
        />
      </View>
    );
  }

  const raised = summary?.raised_this_year ?? 0;
  const limit = summary?.annual_limit ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((raised / limit) * 100)) : 0;
  const pending = summary?.receipt_pending ?? 0;

  return (
    <View style={s.container}>
      <Header title="후원회" />

      <ScrollView
        contentContainerStyle={{ paddingTop: 6, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textCaption} />}
      >
        {/* 올해 모금액 — 대형 요약 카드 */}
        <View style={s.summaryCard}>
          <View style={s.summaryTopRow}>
            <Text style={s.cardLabel}>올해 모금액</Text>
            {summary?.politician ? <Text style={s.meta}>{summary.politician} 후원회</Text> : null}
          </View>
          <Text style={s.bigNumber}>{fmtWon(raised)}</Text>
          <View style={s.gaugeTrack}>
            <View style={[s.gaugeFill, { width: `${pct}%` }]} />
          </View>
          <View style={s.gaugeMeta}>
            <Text style={s.meta}>한도 대비 {pct}%</Text>
            <Text style={s.meta}>연간 한도 {fmtWon(limit)}</Text>
          </View>
        </View>

        {/* 후원 건수 · 후원자 수 — 2열 통계 */}
        <View style={s.statRow}>
          <View style={s.statCard}>
            <Text style={s.cardLabel}>후원 건수</Text>
            <Text style={s.statNumber}>{(summary?.donation_count ?? 0).toLocaleString()}건</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.cardLabel}>후원자 수</Text>
            <Text style={s.statNumber}>{(summary?.donor_count ?? 0).toLocaleString()}명</Text>
          </View>
        </View>

        {/* 영수증 교부 대기 */}
        {pending > 0 ? (
          <View style={[s.card, { backgroundColor: COLORS.warningLight }]}>
            <Text style={[s.cardLabel, { color: COLORS.warning, fontWeight: '700' }]}>영수증 교부 대기</Text>
            <Text style={[s.statNumber, { color: COLORS.warning }]}>{pending.toLocaleString()}건</Text>
            <Text style={s.cardBody}>정치자금 영수증 교부가 필요한 후원이 있어요.</Text>
          </View>
        ) : (
          <View style={s.card}>
            <Text style={s.cardLabel}>영수증 교부 대기</Text>
            <Text style={s.statNumber}>0건</Text>
            <Text style={s.cardBody}>교부 대기 중인 영수증이 없어요.</Text>
          </View>
        )}

        {/* 관리자 포털 안내 */}
        <View style={s.card}>
          <Text style={s.cardBody}>장부·명단·영수증 관리는 관리자 포털에서 하실 수 있어요.</Text>
          <PressableScale
            style={s.portalBtn}
            scaleTo={0.97}
            onPress={() => Linking.openURL('https://polyx.kr/support/manage/')}
          >
            <Ionicons name="open-outline" size={17} color={COLORS.textInverse} />
            <Text style={s.portalBtnText}>관리자 포털 열기</Text>
          </PressableScale>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (COLORS: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // 폴리 리스트 카드 문법
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 12,
    borderRadius: 18,
    ...SHADOWS.subtle,
  },
  // 요약 대형 카드 — radius 20 · padding 20
  summaryCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 20,
    borderRadius: 20,
    ...SHADOWS.subtle,
  },
  summaryTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  cardLabel: { fontSize: 12.5, fontWeight: '600', color: COLORS.textCaption, letterSpacing: -0.2, marginBottom: 4 },
  cardBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, letterSpacing: -0.2 },
  meta: { fontSize: 12, color: COLORS.textTertiary, letterSpacing: -0.2 },

  bigNumber: { fontSize: 26, fontWeight: '900', color: COLORS.primary, letterSpacing: -0.6, marginTop: 2 },
  statNumber: { fontSize: 20, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5, marginBottom: 3 },

  gaugeTrack: { height: 8, borderRadius: 999, backgroundColor: COLORS.grey200, marginTop: 14, overflow: 'hidden' },
  gaugeFill: { height: 8, borderRadius: 999, backgroundColor: COLORS.primary },
  gaugeMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },

  statRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 10 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 12,
    borderRadius: 18,
    ...SHADOWS.subtle,
  },

  portalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 14,
    marginBottom: 3,
  },
  portalBtnText: { fontSize: 15.5, fontWeight: '700', color: COLORS.textInverse, letterSpacing: -0.2 },
});

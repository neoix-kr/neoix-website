// 기타 조직 — 단체·기업·기관·언론·정당 관리. 우호도 추적 + 소속 연락처 연결.
// 화면 문법은 폴리 본체(ComplaintScreen) 실측 문법 — Header + CategoryChips + 폴리 카드/모달 그대로.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Modal, TextInput,
  Alert, RefreshControl, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';
import { SHADOWS } from '../theme/colors';
import Header from '../components/Header';
import GlassIconButton from '../components/GlassIconButton';
import PressableScale from '../components/PressableScale';
import { CategoryChips, EmptyState } from '../components/PolyUI';
import type { MpOrg, MpContact } from '../types/db';

type OrgKind = MpOrg['kind'];

const KINDS: { key: OrgKind; label: string }[] = [
  { key: 'group', label: '단체' },
  { key: 'company', label: '기업' },
  { key: 'gov', label: '기관' },
  { key: 'media', label: '언론' },
  { key: 'party', label: '정당' },
  { key: 'etc', label: '기타' },
];
const kindLabel = (k: string) => KINDS.find(x => x.key === k)?.label ?? '기타';

const FRIENDLY_LEVELS: { value: number; label: string }[] = [
  { value: 2, label: '매우 우호' },
  { value: 1, label: '우호' },
  { value: 0, label: '중립' },
  { value: -1, label: '비우호' },
  { value: -2, label: '매우 비우호' },
];
const friendlyLabel = (v: number | null) =>
  v === null ? '미평가' : FRIENDLY_LEVELS.find(f => f.value === v)?.label ?? '중립';
const friendlyColor = (C: any, v: number | null): string => {
  if (v === null) return C.grey300;
  if (v === 2) return C.success;
  if (v === 1) return C.accent;
  if (v === 0) return C.grey400;
  if (v === -1) return C.warning;
  return C.error;
};

type MemberRow = {
  contact_id: string;
  role: string | null;
  mp_contacts: { id: string; name: string; title: string | null } | null;
};

export default function OrgsScreen() {
  const { COLORS } = useTheme();
  const [orgs, setOrgs] = useState<MpOrg[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<'all' | OrgKind>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [create, setCreate] = useState(false);
  const [detail, setDetail] = useState<MpOrg | null>(null);

  const load = useCallback(async () => {
    const [o, links] = await Promise.all([
      supabase.from('mp_orgs').select('*').order('name').limit(300),
      supabase.from('mp_contact_orgs').select('org_id').limit(2000),
    ]);
    if (o.data) setOrgs(o.data as MpOrg[]);
    if (links.data) {
      const c: Record<string, number> = {};
      for (const row of links.data as { org_id: string }[]) c[row.org_id] = (c[row.org_id] ?? 0) + 1;
      setCounts(c);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = useMemo(
    () => (filter === 'all' ? orgs : orgs.filter(o => o.kind === filter)),
    [orgs, filter],
  );

  const s = useMemo(() => makeStyles(COLORS), [COLORS]);

  return (
    <View style={s.container}>
      <Header
        title="조직"
        rightElement={
          <GlassIconButton
            icon="create-outline"
            onPress={() => setCreate(true)}
            size={44}
            iconSize={20}
            fallbackVariant="surface"
          />
        }
      />

      {/* 유형 필터 — 검정 활성 칩 */}
      <CategoryChips
        options={KINDS}
        value={filter === 'all' ? null : filter}
        onChange={k => setFilter((k as OrgKind | null) ?? 'all')}
        allLabel="전체"
      />

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingTop: 2, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textCaption} />}
        ListEmptyComponent={
          <EmptyState
            icon="business-outline"
            title="등록된 조직이 없어요"
            sub={'지역 단체·기업·언론을 등록하면\n우호도와 소속 인맥을 한눈에 관리할 수 있어요.'}
            ctaLabel="조직 등록하기"
            onCta={() => setCreate(true)}
          />
        }
        renderItem={({ item }) => (
          <PressableScale style={s.card} scaleTo={0.98} onPress={() => setDetail(item)}>
            <View style={s.cardTop}>
              <View style={s.kindBadge}>
                <Text style={s.kindBadgeText}>{kindLabel(item.kind)}</Text>
              </View>
              <Text style={s.orgName} numberOfLines={1}>{item.name}</Text>
            </View>
            <View style={s.cardBottom}>
              <Text style={s.meta}>
                {item.region ? `${item.region} · ` : ''}소속 {counts[item.id] ?? 0}명
              </Text>
              <View style={s.friendlyRow}>
                <View style={[s.dot, { backgroundColor: friendlyColor(COLORS, item.friendly) }]} />
                <Text style={[s.meta, item.friendly === null && { color: COLORS.textPlaceholder }]}>
                  {friendlyLabel(item.friendly)}{item.friendly !== null ? `(${item.friendly})` : ''}
                </Text>
              </View>
            </View>
          </PressableScale>
        )}
      />

      <CreateModal visible={create} onClose={() => setCreate(false)} onSaved={() => { setCreate(false); load(); }} />
      <DetailModal org={detail} onClose={() => setDetail(null)} onChanged={load} />
    </View>
  );
}

// ── 상세 모달: 메모 · 우호도 · 소속 연락처 · 연락처 연결 ──
function DetailModal({ org, onClose, onChanged }: {
  org: MpOrg | null; onClose: () => void; onChanged: () => void;
}) {
  const { COLORS } = useTheme();
  const [friendly, setFriendly] = useState<number | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [linking, setLinking] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MpContact[]>([]);
  const [picked, setPicked] = useState<MpContact | null>(null);
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState(false);
  const s = useMemo(() => makeStyles(COLORS), [COLORS]);

  const loadMembers = useCallback(async (orgId: string) => {
    const { data } = await supabase
      .from('mp_contact_orgs')
      .select('contact_id, role, mp_contacts(id, name, title)')
      .eq('org_id', orgId);
    if (data) setMembers(data as unknown as MemberRow[]);
  }, []);

  useEffect(() => {
    if (org) {
      setFriendly(org.friendly);
      setMembers([]);
      setLinking(false); setQuery(''); setResults([]); setPicked(null); setRole('');
      loadMembers(org.id);
    }
  }, [org, loadMembers]);

  const setLevel = async (v: number) => {
    if (!org || busy) return;
    setBusy(true);
    const prev = friendly;
    setFriendly(v);
    const { error } = await supabase.from('mp_orgs').update({ friendly: v }).eq('id', org.id);
    setBusy(false);
    if (error) { setFriendly(prev); return Alert.alert('저장 실패', error.message); }
    onChanged();
  };

  const search = async (text: string) => {
    setQuery(text);
    setPicked(null);
    if (!text.trim()) { setResults([]); return; }
    const { data } = await supabase
      .from('mp_contacts')
      .select('*')
      .ilike('name', `%${text.trim()}%`)
      .order('name')
      .limit(10);
    if (data) setResults(data as MpContact[]);
  };

  const link = async () => {
    if (!org || !picked || busy) return;
    if (members.some(m => m.contact_id === picked.id)) {
      return Alert.alert('연결 확인', '이미 이 조직에 연결된 연락처예요.');
    }
    setBusy(true);
    const { error } = await supabase.from('mp_contact_orgs').insert({
      contact_id: picked.id, org_id: org.id, role: role.trim() || null,
    });
    setBusy(false);
    if (error) return Alert.alert('연결 실패', error.message);
    setLinking(false); setQuery(''); setResults([]); setPicked(null); setRole('');
    loadMembers(org.id);
    onChanged();
  };

  return (
    <Modal visible={!!org} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalSheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalHead}>
          <Pressable onPress={onClose}><Text style={s.modalCancel}>닫기</Text></Pressable>
          <Text style={s.modalTitle} numberOfLines={1}>{org?.name ?? ''}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          {/* 기본 정보 */}
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={s.kindBadge}>
                <Text style={s.kindBadgeText}>{kindLabel(org?.kind ?? 'etc')}</Text>
              </View>
              {!!org?.region && <Text style={s.meta}>{org.region}</Text>}
            </View>
            {!!org?.memo && <Text style={s.body}>{org.memo}</Text>}
          </View>

          {/* 우호도 — 검정 활성 pill */}
          <View style={{ gap: 10 }}>
            <Text style={s.sectionTitle}>우호도</Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {FRIENDLY_LEVELS.map(f => (
                <Pressable key={f.value}
                  style={[s.pillChip, friendly === f.value && s.pillChipActive]}
                  onPress={() => setLevel(f.value)}>
                  <View style={[s.dot, { backgroundColor: friendlyColor(COLORS, f.value), marginRight: 5 }]} />
                  <Text style={[s.pillChipText, friendly === f.value && s.pillChipTextActive]}>{f.label}</Text>
                </Pressable>
              ))}
            </View>
            {friendly === null && <Text style={s.meta}>아직 평가하지 않았어요. 한 단계를 선택해 주세요.</Text>}
          </View>

          {/* 소속 연락처 */}
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={s.sectionTitle}>소속 연락처 {members.length > 0 ? `${members.length}명` : ''}</Text>
              <Pressable onPress={() => setLinking(v => !v)}>
                <Text style={s.linkAction}>{linking ? '접기' : '연락처 연결'}</Text>
              </Pressable>
            </View>

            {linking && (
              <View style={{ gap: 10 }}>
                <TextInput
                  style={s.input}
                  placeholder="이름으로 검색"
                  placeholderTextColor={COLORS.textTertiary}
                  value={query}
                  onChangeText={search}
                />
                {!picked && results.map(c => (
                  <Pressable key={c.id} style={s.resultRow} onPress={() => { setPicked(c); setResults([]); }}>
                    <Text style={s.memberName}>{c.name}</Text>
                    {!!c.title && <Text style={s.meta}>{c.title}</Text>}
                  </Pressable>
                ))}
                {!picked && query.trim().length > 0 && results.length === 0 && (
                  <Text style={s.meta}>검색 결과가 없어요.</Text>
                )}
                {picked && (
                  <View style={{ gap: 10 }}>
                    <View style={s.resultRow}>
                      <Text style={s.memberName}>{picked.name}</Text>
                      {!!picked.title && <Text style={s.meta}>{picked.title}</Text>}
                    </View>
                    <TextInput
                      style={s.input}
                      placeholder="역할 (예: 회장 · 대변인 · 선택)"
                      placeholderTextColor={COLORS.textTertiary}
                      value={role}
                      onChangeText={setRole}
                    />
                    <PressableScale style={s.primaryBtn} scaleTo={0.97} onPress={link} disabled={busy}>
                      <Text style={s.primaryBtnText}>이 조직에 연결</Text>
                    </PressableScale>
                  </View>
                )}
              </View>
            )}

            {members.length === 0 ? (
              <Text style={s.meta}>연결된 연락처가 없어요. 위에서 연락처를 연결해 보세요.</Text>
            ) : (
              members.map(m => (
                <View key={m.contact_id} style={s.memberRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.memberName}>{m.mp_contacts?.name ?? '(삭제된 연락처)'}</Text>
                    {!!m.mp_contacts?.title && <Text style={s.meta}>{m.mp_contacts.title}</Text>}
                  </View>
                  {!!m.role && (
                    <View style={s.roleBadge}>
                      <Text style={s.roleBadgeText}>{m.role}</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── 등록 모달 ──
function CreateModal({ visible, onClose, onSaved }: {
  visible: boolean; onClose: () => void; onSaved: () => void;
}) {
  const { COLORS } = useTheme();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<OrgKind>('group');
  const [region, setRegion] = useState('');
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);
  const s = useMemo(() => makeStyles(COLORS), [COLORS]);

  const reset = () => { setName(''); setKind('group'); setRegion(''); setMemo(''); };

  const save = async () => {
    if (busy) return;
    if (!name.trim()) return Alert.alert('입력 확인', '조직 이름을 입력해 주세요.');
    setBusy(true);
    const { error } = await supabase.from('mp_orgs').insert({
      name: name.trim(), kind, region: region.trim() || null, memo: memo.trim() || null,
    });
    setBusy(false);
    if (error) return Alert.alert('저장 실패', error.message);
    reset(); onSaved();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalSheet} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalHead}>
          <Pressable onPress={() => { reset(); onClose(); }}><Text style={s.modalCancel}>취소</Text></Pressable>
          <Text style={s.modalTitle}>조직 등록</Text>
          <Pressable onPress={save} disabled={busy}><Text style={s.modalSave}>저장</Text></Pressable>
        </View>
        <View style={{ padding: 16, gap: 12 }}>
          <TextInput style={s.input} placeholder="조직 이름" placeholderTextColor={COLORS.textTertiary} value={name} onChangeText={setName} />
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {KINDS.map(k => (
              <Pressable key={k.key}
                style={[s.pillChip, kind === k.key && s.pillChipActive]}
                onPress={() => setKind(k.key)}>
                <Text style={[s.pillChipText, kind === k.key && s.pillChipTextActive]}>{k.label}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput style={s.input} placeholder="지역 (선택)" placeholderTextColor={COLORS.textTertiary} value={region} onChangeText={setRegion} />
          <TextInput
            style={[s.input, s.textarea]}
            placeholder="메모 (선택)" placeholderTextColor={COLORS.textTertiary}
            multiline value={memo} onChangeText={setMemo}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ── 폴리 문법 실측 스타일 ── */
const makeStyles = (COLORS: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // 리스트 카드
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
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  orgName: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  kindBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  kindBadgeText: { fontSize: 10.5, fontWeight: '700', color: COLORS.primary, letterSpacing: -0.2 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { fontSize: 12, color: COLORS.textTertiary, letterSpacing: -0.2 },
  friendlyRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // 모달 공통 — pageSheet 흰 시트 + grey50 폼
  modalSheet: { flex: 1, backgroundColor: COLORS.surface },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 16 },
  modalCancel: { fontSize: 15.5, color: COLORS.textCaption, letterSpacing: -0.2 },
  modalTitle: { flex: 1, textAlign: 'center', marginHorizontal: 8, fontSize: 17, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  modalSave: { fontSize: 15.5, fontWeight: '700', color: COLORS.primary, letterSpacing: -0.2 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  body: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, letterSpacing: -0.2 },
  linkAction: { fontSize: 13, fontWeight: '700', color: COLORS.primary, letterSpacing: -0.2 },

  input: {
    backgroundColor: COLORS.grey50,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.text,
  },
  textarea: { minHeight: 110, textAlignVertical: 'top' },

  // 선택 칩 — 검정 활성 pill
  pillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillChipActive: { backgroundColor: COLORS.text, borderColor: COLORS.text },
  pillChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: -0.2 },
  pillChipTextActive: { color: COLORS.textInverse, fontWeight: '700' },

  // 주요 버튼
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  primaryBtnText: { fontSize: 15.5, fontWeight: '700', color: COLORS.textInverse, letterSpacing: -0.2 },

  // 소속/검색 행
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.grey50, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  memberName: { fontSize: 14, fontWeight: '600', color: COLORS.text, letterSpacing: -0.2 },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.grey50, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  roleBadge: { backgroundColor: COLORS.grey100, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  roleBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: -0.2 },
});

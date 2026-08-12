// 기타 조직 — 단체·기업·기관·언론·정당 관리. 우호도 추적 + 소속 연락처 연결.
// 스타일은 ArchiveScreen(exemplar)의 헤더/카드/FAB/모달 패턴을 따른다.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Modal, TextInput,
  Alert, RefreshControl, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useTheme } from '../theme/ThemeContext';
import { TYPO, SPACING, RADIUS } from '../theme/colors';
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
  const { COLORS, SHADOWS } = useTheme();
  const insets = useSafeAreaInsets();
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

  const s = useMemo(() => styles(COLORS), [COLORS]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* 헤더 + 유형 필터 칩 */}
      <View style={[s.header, { paddingTop: insets.top + SPACING.md }]}>
        <Text style={s.h1}>기타 조직</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: SPACING.md }} contentContainerStyle={{ gap: SPACING.xs }}>
          {([{ key: 'all' as const, label: '전체' }, ...KINDS]).map(k => (
            <Pressable key={k.key}
              style={[s.chipBtn, filter === k.key && { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary }]}
              onPress={() => setFilter(k.key)}>
              <Text style={[s.chipBtnText, filter === k.key && { color: COLORS.primary, fontWeight: '700' }]}>{k.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: SPACING.base, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textCaption} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTitle}>등록된 조직이 없어요</Text>
            <Text style={s.emptyBody}>지역 단체·기업·언론을 등록하면{'\n'}우호도와 소속 인맥을 한눈에 관리할 수 있어요.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={[s.card, SHADOWS.standard]} onPress={() => setDetail(item)}>
            <View style={s.cardTop}>
              <Text style={[s.chip, { backgroundColor: COLORS.primaryLight, color: COLORS.primary }]}>{kindLabel(item.kind)}</Text>
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
          </Pressable>
        )}
      />

      {/* FAB */}
      <Pressable
        style={[s.fab, { bottom: insets.bottom + 88, backgroundColor: COLORS.primary }, SHADOWS.elevated]}
        onPress={() => setCreate(true)}
      >
        <Text style={s.fabText}>＋</Text>
      </Pressable>

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
  const s = styles(COLORS);

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
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalHead}>
          <Pressable onPress={onClose}><Text style={s.modalCancel}>닫기</Text></Pressable>
          <Text style={s.modalTitle} numberOfLines={1}>{org?.name ?? ''}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.base, gap: SPACING.lg, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          {/* 기본 정보 */}
          <View style={{ gap: SPACING.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <Text style={[s.chip, { backgroundColor: COLORS.primaryLight, color: COLORS.primary }]}>{kindLabel(org?.kind ?? 'etc')}</Text>
              {!!org?.region && <Text style={s.meta}>{org.region}</Text>}
            </View>
            {!!org?.memo && <Text style={s.body}>{org.memo}</Text>}
          </View>

          {/* 우호도 */}
          <View style={{ gap: SPACING.sm }}>
            <Text style={s.sectionTitle}>우호도</Text>
            <View style={{ flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' }}>
              {FRIENDLY_LEVELS.map(f => (
                <Pressable key={f.value}
                  style={[s.chipBtn, friendly === f.value && { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary }]}
                  onPress={() => setLevel(f.value)}>
                  <View style={[s.dot, { backgroundColor: friendlyColor(COLORS, f.value), marginRight: 5 }]} />
                  <Text style={[s.chipBtnText, friendly === f.value && { color: COLORS.primary, fontWeight: '700' }]}>{f.label}</Text>
                </Pressable>
              ))}
            </View>
            {friendly === null && <Text style={s.meta}>아직 평가하지 않았어요. 한 단계를 선택해 주세요.</Text>}
          </View>

          {/* 소속 연락처 */}
          <View style={{ gap: SPACING.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={s.sectionTitle}>소속 연락처 {members.length > 0 ? `${members.length}명` : ''}</Text>
              <Pressable onPress={() => setLinking(v => !v)}>
                <Text style={[s.linkAction, { color: COLORS.primary }]}>{linking ? '접기' : '＋ 연락처 연결'}</Text>
              </Pressable>
            </View>

            {linking && (
              <View style={{ gap: SPACING.sm }}>
                <TextInput
                  style={s.input}
                  placeholder="이름으로 검색"
                  placeholderTextColor={COLORS.textPlaceholder}
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
                  <View style={{ gap: SPACING.sm }}>
                    <View style={s.resultRow}>
                      <Text style={s.memberName}>{picked.name}</Text>
                      {!!picked.title && <Text style={s.meta}>{picked.title}</Text>}
                    </View>
                    <TextInput
                      style={s.input}
                      placeholder="역할 (예: 회장 · 대변인 · 선택)"
                      placeholderTextColor={COLORS.textPlaceholder}
                      value={role}
                      onChangeText={setRole}
                    />
                    <Pressable style={[s.primaryBtn, { backgroundColor: COLORS.primary }]} onPress={link} disabled={busy}>
                      <Text style={s.primaryBtnText}>이 조직에 연결</Text>
                    </Pressable>
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
                    <Text style={[s.chip, { backgroundColor: COLORS.backgroundSecondary, color: COLORS.textSecondary }]}>{m.role}</Text>
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
  const s = styles(COLORS);

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
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalHead}>
          <Pressable onPress={() => { reset(); onClose(); }}><Text style={s.modalCancel}>취소</Text></Pressable>
          <Text style={s.modalTitle}>조직 등록</Text>
          <Pressable onPress={save} disabled={busy}><Text style={[s.modalSave, { color: COLORS.primary }]}>저장</Text></Pressable>
        </View>
        <View style={{ padding: SPACING.base, gap: SPACING.md }}>
          <TextInput style={s.input} placeholder="조직 이름" placeholderTextColor={COLORS.textPlaceholder} value={name} onChangeText={setName} />
          <View style={{ flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' }}>
            {KINDS.map(k => (
              <Pressable key={k.key}
                style={[s.chipBtn, kind === k.key && { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary }]}
                onPress={() => setKind(k.key)}>
                <Text style={[s.chipBtnText, kind === k.key && { color: COLORS.primary, fontWeight: '700' }]}>{k.label}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput style={s.input} placeholder="지역 (선택)" placeholderTextColor={COLORS.textPlaceholder} value={region} onChangeText={setRegion} />
          <TextInput
            style={[s.input, { height: 100, textAlignVertical: 'top', paddingTop: SPACING.md }]}
            placeholder="메모 (선택)" placeholderTextColor={COLORS.textPlaceholder}
            multiline value={memo} onChangeText={setMemo}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = (C: any) => StyleSheet.create({
  header: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.md, backgroundColor: C.background },
  h1: { ...TYPO.displayLarge, color: C.text },
  card: { backgroundColor: C.surface, borderRadius: RADIUS.comfortable, padding: SPACING.base, marginBottom: SPACING.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orgName: { ...TYPO.subtitle, color: C.text, flex: 1 },
  chip: { ...TYPO.caption, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  meta: { ...TYPO.caption, color: C.textCaption },
  body: { ...TYPO.body, color: C.textBody, lineHeight: 22 },
  friendlyRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  empty: { alignItems: 'center', paddingTop: 96, gap: SPACING.sm },
  emptyTitle: { ...TYPO.subtitle, color: C.text },
  emptyBody: { ...TYPO.bodySmall, color: C.textCaption, textAlign: 'center', lineHeight: 20 },
  fab: { position: 'absolute', right: SPACING.lg, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  fabText: { color: C.textInverse, fontSize: 28, marginTop: -2 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.base },
  modalCancel: { ...TYPO.bodyLarge, color: C.textCaption },
  modalTitle: { ...TYPO.subtitle, color: C.text, flex: 1, textAlign: 'center', marginHorizontal: SPACING.sm },
  modalSave: { ...TYPO.subtitle },
  sectionTitle: { ...TYPO.subtitle, color: C.text },
  linkAction: { ...TYPO.bodySmall, fontWeight: '700' },
  input: { minHeight: 48, borderRadius: RADIUS.standard, borderWidth: 1, borderColor: C.border, paddingHorizontal: SPACING.base, color: C.text, backgroundColor: C.surface, ...TYPO.bodyLarge },
  chipBtn: { paddingHorizontal: SPACING.md, height: 34, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  chipBtnText: { ...TYPO.bodySmall, color: C.textSecondary },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: C.surface, borderRadius: RADIUS.standard, padding: SPACING.md },
  memberName: { ...TYPO.body, color: C.text, fontWeight: '600' },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface, borderRadius: RADIUS.standard, padding: SPACING.md, borderWidth: 1, borderColor: C.border },
  primaryBtn: { height: 48, borderRadius: RADIUS.standard, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { ...TYPO.subtitle, color: C.textInverse },
});

// 민원 — 접수/처리중/해결 상태 관리 + 연락처 연결 + 미팅(메모) 타임라인.
// 스타일은 ArchiveScreen(P0 exemplar)의 헤더/카드/FAB/모달 패턴을 따른다.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Modal, TextInput,
  Alert, RefreshControl, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useTheme } from '../theme/ThemeContext';
import { TYPO, SPACING, RADIUS } from '../theme/colors';
import type { MpCase, MpContact, MpMeeting, CaseStatus } from '../types/db';

type CaseRow = MpCase & { mp_contacts: { name: string } | null };

const CATEGORIES: { key: string; label: string }[] = [
  { key: 'traffic', label: '교통' },
  { key: 'env', label: '환경' },
  { key: 'welfare', label: '복지' },
  { key: 'edu', label: '교육' },
  { key: 'safety', label: '안전' },
  { key: 'econ', label: '경제' },
  { key: 'etc', label: '기타' },
];
const catLabel = (k: string) => CATEGORIES.find(c => c.key === k)?.label ?? '기타';

const STATUS_LABEL: Record<CaseStatus, string> = {
  open: '접수', progress: '처리중', resolved: '해결', closed: '종결',
};
const NEXT_STATUS: Record<CaseStatus, CaseStatus> = {
  open: 'progress', progress: 'resolved', resolved: 'open', closed: 'open',
};

const FILTERS: { key: CaseStatus | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'open', label: '접수' },
  { key: 'progress', label: '처리중' },
  { key: 'resolved', label: '해결' },
];

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function CasesScreen() {
  const { COLORS, SHADOWS } = useTheme();
  const insets = useSafeAreaInsets();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [filter, setFilter] = useState<CaseStatus | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [compose, setCompose] = useState(false);
  const [selected, setSelected] = useState<CaseRow | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('mp_cases')
      .select('*, mp_contacts(name)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (data) setCases(data as CaseRow[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const statusColors = (st: CaseStatus): { bg: string; fg: string } => {
    if (st === 'progress') return { bg: COLORS.primaryLight, fg: COLORS.primary };
    if (st === 'resolved' || st === 'closed') return { bg: COLORS.successLight, fg: COLORS.success };
    return { bg: COLORS.warningLight, fg: COLORS.warning };
  };

  const list = useMemo(
    () => (filter === 'all' ? cases : cases.filter(c => c.status === filter)),
    [cases, filter],
  );

  const s = useMemo(() => styles(COLORS), [COLORS]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* 헤더 + 상태 필터 */}
      <View style={[s.header, { paddingTop: insets.top + SPACING.md }]}>
        <Text style={s.h1}>민원</Text>
        <View style={s.seg}>
          {FILTERS.map(f => (
            <Pressable key={f.key} style={[s.segBtn, filter === f.key && { backgroundColor: COLORS.surface }]} onPress={() => setFilter(f.key)}>
              <Text style={[s.segText, filter === f.key && { color: COLORS.primary, fontWeight: '700' }]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: SPACING.base, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textCaption} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyTitle}>{filter === 'all' ? '접수된 민원이 없어요' : `${STATUS_LABEL[filter as CaseStatus]} 상태의 민원이 없어요`}</Text>
            <Text style={s.emptyBody}>+ 버튼으로 주민 민원을 등록하면{'\n'}접수부터 해결까지 상태별로 관리할 수 있어요.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sc = statusColors(item.status);
          return (
            <Pressable style={[s.card, SHADOWS.standard]} onPress={() => setSelected(item)}>
              <View style={s.cardTop}>
                <Text style={[s.chip, { backgroundColor: COLORS.primaryLight, color: COLORS.primary }]}>{catLabel(item.category)}</Text>
                <Text style={[s.chip, { backgroundColor: sc.bg, color: sc.fg }]}>{STATUS_LABEL[item.status]}</Text>
                <View style={{ flex: 1 }} />
                <Text style={s.meta}>{fmtDate(item.created_at)}</Text>
              </View>
              <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
              {item.mp_contacts?.name ? <Text style={s.meta}>연결 연락처 · {item.mp_contacts.name}</Text> : null}
            </Pressable>
          );
        }}
      />

      {/* FAB */}
      <Pressable
        style={[s.fab, { bottom: insets.bottom + 88, backgroundColor: COLORS.primary }, SHADOWS.elevated]}
        onPress={() => setCompose(true)}
      >
        <Text style={s.fabText}>＋</Text>
      </Pressable>

      <DetailModal
        item={selected}
        statusColors={statusColors}
        onClose={() => setSelected(null)}
        onChanged={(updated) => {
          setSelected(prev => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
          load();
        }}
      />
      <ComposeModal visible={compose} onClose={() => setCompose(false)} onSaved={() => { setCompose(false); load(); }} />
    </View>
  );
}

// ── 상세 모달: 내용 + 상태 순환 + 미팅 메모 타임라인 ──
function DetailModal({ item, statusColors, onClose, onChanged }: {
  item: CaseRow | null;
  statusColors: (st: CaseStatus) => { bg: string; fg: string };
  onClose: () => void;
  onChanged: (updated: Partial<MpCase> & { id: string }) => void;
}) {
  const { COLORS, SHADOWS } = useTheme();
  const insets = useSafeAreaInsets();
  const [meetings, setMeetings] = useState<MpMeeting[]>([]);
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);
  const s = styles(COLORS);

  const loadMeetings = useCallback(async (caseId: string) => {
    const { data } = await supabase
      .from('mp_meetings')
      .select('*')
      .eq('case_id', caseId)
      .order('met_at', { ascending: false })
      .limit(50);
    if (data) setMeetings(data as MpMeeting[]);
  }, []);

  useEffect(() => {
    if (item) { setMemo(''); loadMeetings(item.id); } else { setMeetings([]); }
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item) {
    return <Modal visible={false} animationType="slide" presentationStyle="pageSheet"><View /></Modal>;
  }

  const cycleStatus = async () => {
    if (busy) return;
    setBusy(true);
    const next = NEXT_STATUS[item.status];
    const patch: Partial<MpCase> = {
      status: next,
      resolved_at: next === 'resolved' ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from('mp_cases').update(patch).eq('id', item.id);
    setBusy(false);
    if (error) return Alert.alert('상태 변경 실패', error.message);
    onChanged({ id: item.id, ...patch });
  };

  const addMemo = async () => {
    if (busy) return;
    const text = memo.trim();
    if (!text) return Alert.alert('입력 확인', '메모 내용을 입력해 주세요.');
    setBusy(true);
    const { error } = await supabase.from('mp_meetings').insert({
      case_id: item.id, contact_id: item.contact_id, summary: text, met_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) return Alert.alert('메모 저장 실패', error.message);
    setMemo('');
    loadMeetings(item.id);
  };

  const sc = statusColors(item.status);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalHead}>
          <Pressable onPress={onClose}><Text style={s.modalCancel}>닫기</Text></Pressable>
          <Text style={s.modalTitle}>민원 상세</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: SPACING.base, paddingBottom: insets.bottom + SPACING.xxl, gap: SPACING.md }} keyboardShouldPersistTaps="handled">
          <View style={s.cardTop}>
            <Text style={[s.chip, { backgroundColor: COLORS.primaryLight, color: COLORS.primary }]}>{catLabel(item.category)}</Text>
            <Text style={[s.chip, { backgroundColor: sc.bg, color: sc.fg }]}>{STATUS_LABEL[item.status]}</Text>
            <View style={{ flex: 1 }} />
            <Text style={s.meta}>{fmtDate(item.created_at)}</Text>
          </View>
          <Text style={s.detailTitle}>{item.title}</Text>
          {item.mp_contacts?.name ? <Text style={s.meta}>연결 연락처 · {item.mp_contacts.name}</Text> : null}
          {item.body ? <Text style={s.body}>{item.body}</Text> : null}

          <Pressable style={[s.statusBtn, { backgroundColor: COLORS.primary }]} onPress={cycleStatus} disabled={busy}>
            <Text style={s.statusBtnText}>
              {item.status === 'resolved' || item.status === 'closed'
                ? '다시 접수 상태로'
                : `${STATUS_LABEL[NEXT_STATUS[item.status]]}(으)로 변경`}
            </Text>
          </Pressable>

          {/* 메모 추가 */}
          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="처리 메모를 남겨 주세요"
              placeholderTextColor={COLORS.textPlaceholder}
              value={memo} onChangeText={setMemo}
            />
            <Pressable style={[s.memoBtn, { borderColor: COLORS.primary }]} onPress={addMemo} disabled={busy}>
              <Text style={[s.memoBtnText, { color: COLORS.primary }]}>기록</Text>
            </Pressable>
          </View>

          {/* 타임라인 */}
          <Text style={s.sectionTitle}>처리 기록</Text>
          {meetings.length === 0 ? (
            <Text style={s.meta}>아직 기록이 없어요. 첫 메모를 남겨 보세요.</Text>
          ) : meetings.map(m => (
            <View key={m.id} style={[s.card, SHADOWS.standard, { marginBottom: 0 }]}>
              <Text style={s.meta}>{fmtDate(m.met_at)}{m.place ? ` · ${m.place}` : ''}</Text>
              {m.summary ? <Text style={[s.body, { marginTop: SPACING.xs }]}>{m.summary}</Text> : null}
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── 등록 모달: 제목·분류·내용·연락처 연결(선택) ──
function ComposeModal({ visible, onClose, onSaved }: {
  visible: boolean; onClose: () => void; onSaved: () => void;
}) {
  const { COLORS } = useTheme();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('etc');
  const [body, setBody] = useState('');
  const [contacts, setContacts] = useState<MpContact[]>([]);
  const [query, setQuery] = useState('');
  const [contactId, setContactId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const s = styles(COLORS);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const { data } = await supabase.from('mp_contacts').select('*').order('name').limit(300);
      if (data) setContacts(data as MpContact[]);
    })();
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return contacts.slice(0, 8);
    return contacts.filter(c => c.name.includes(q) || (c.title ?? '').includes(q)).slice(0, 8);
  }, [contacts, query]);

  const selectedContact = contacts.find(c => c.id === contactId) ?? null;

  const reset = () => { setTitle(''); setCategory('etc'); setBody(''); setQuery(''); setContactId(null); };

  const save = async () => {
    if (busy) return;
    if (!title.trim()) return Alert.alert('입력 확인', '민원 제목을 입력해 주세요.');
    setBusy(true);
    const { error } = await supabase.from('mp_cases').insert({
      title: title.trim(), category, body: body.trim() || null, contact_id: contactId, status: 'open',
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
          <Text style={s.modalTitle}>민원 등록</Text>
          <Pressable onPress={save} disabled={busy}><Text style={[s.modalSave, { color: COLORS.primary }]}>저장</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: SPACING.base, paddingBottom: insets.bottom + SPACING.xxl, gap: SPACING.md }} keyboardShouldPersistTaps="handled">
          <TextInput style={s.input} placeholder="민원 제목" placeholderTextColor={COLORS.textPlaceholder} value={title} onChangeText={setTitle} />
          <View style={{ flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <Pressable key={c.key}
                style={[s.chipBtn, category === c.key && { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary }]}
                onPress={() => setCategory(c.key)}>
                <Text style={[s.chipBtnText, category === c.key && { color: COLORS.primary, fontWeight: '700' }]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={[s.input, { height: 120, textAlignVertical: 'top', paddingTop: SPACING.md }]}
            placeholder="민원 내용 (선택)"
            placeholderTextColor={COLORS.textPlaceholder} multiline value={body} onChangeText={setBody}
          />

          {/* 연락처 연결 */}
          <Text style={s.sectionTitle}>연락처 연결 (선택)</Text>
          {selectedContact ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <Text style={[s.chip, { backgroundColor: COLORS.primaryLight, color: COLORS.primary }]}>{selectedContact.name}</Text>
              <Pressable onPress={() => setContactId(null)}>
                <Text style={[s.meta, { textDecorationLine: 'underline' }]}>연결 해제</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput style={s.input} placeholder="이름으로 검색" placeholderTextColor={COLORS.textPlaceholder} value={query} onChangeText={setQuery} />
              {filtered.map(c => (
                <Pressable key={c.id} style={s.contactRow} onPress={() => setContactId(c.id)}>
                  <Text style={s.contactName}>{c.name}</Text>
                  {c.title ? <Text style={s.meta}>{c.title}</Text> : null}
                </Pressable>
              ))}
              {filtered.length === 0 ? <Text style={s.meta}>검색 결과가 없어요.</Text> : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = (C: any) => StyleSheet.create({
  header: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.md, backgroundColor: C.background },
  h1: { ...TYPO.displayLarge, color: C.text },
  seg: { flexDirection: 'row', backgroundColor: C.backgroundSecondary, borderRadius: RADIUS.standard, padding: 3, marginTop: SPACING.md },
  segBtn: { flex: 1, height: 36, borderRadius: RADIUS.compact + 1, alignItems: 'center', justifyContent: 'center' },
  segText: { ...TYPO.bodySmall, color: C.textCaption, fontWeight: '600' },
  card: { backgroundColor: C.surface, borderRadius: RADIUS.comfortable, padding: SPACING.base, marginBottom: SPACING.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  cardTitle: { ...TYPO.subtitle, color: C.text, marginBottom: SPACING.xs },
  chip: { ...TYPO.caption, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  meta: { ...TYPO.caption, color: C.textCaption },
  body: { ...TYPO.body, color: C.textBody, lineHeight: 22 },
  empty: { alignItems: 'center', paddingTop: 96, gap: SPACING.sm },
  emptyTitle: { ...TYPO.subtitle, color: C.text },
  emptyBody: { ...TYPO.bodySmall, color: C.textCaption, textAlign: 'center', lineHeight: 20 },
  fab: { position: 'absolute', right: SPACING.lg, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  fabText: { color: C.textInverse, fontSize: 28, marginTop: -2 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.base },
  modalCancel: { ...TYPO.bodyLarge, color: C.textCaption },
  modalTitle: { ...TYPO.subtitle, color: C.text },
  modalSave: { ...TYPO.subtitle },
  input: { minHeight: 48, borderRadius: RADIUS.standard, borderWidth: 1, borderColor: C.border, paddingHorizontal: SPACING.base, color: C.text, backgroundColor: C.surface, ...TYPO.bodyLarge },
  chipBtn: { paddingHorizontal: SPACING.md, height: 34, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  chipBtnText: { ...TYPO.bodySmall, color: C.textSecondary },
  detailTitle: { ...TYPO.headingLarge, color: C.text },
  statusBtn: { height: 48, borderRadius: RADIUS.standard, alignItems: 'center', justifyContent: 'center' },
  statusBtnText: { ...TYPO.subtitle, color: C.textInverse },
  sectionTitle: { ...TYPO.subtitle, color: C.text, marginTop: SPACING.sm },
  memoBtn: { paddingHorizontal: SPACING.base, borderRadius: RADIUS.standard, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  memoBtnText: { ...TYPO.subtitle },
  contactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface, borderRadius: RADIUS.standard, paddingHorizontal: SPACING.base, height: 48 },
  contactName: { ...TYPO.bodyLarge, color: C.text, fontWeight: '600' },
});

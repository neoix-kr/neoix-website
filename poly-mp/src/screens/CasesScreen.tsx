// 민원 — 접수/처리중/해결 상태 관리 + 연락처 연결 + 미팅(메모) 타임라인.
// 화면 문법은 폴리 본체 ComplaintScreen을 따른다 — Header + UnderlineTabs + 폴리 카드.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Modal, TextInput,
  Alert, RefreshControl, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import GlassIconButton from '../components/GlassIconButton';
import PressableScale from '../components/PressableScale';
import { UnderlineTabs, EmptyState } from '../components/PolyUI';
import { useAuth } from '../contexts/AuthContext';
import { uploadPostImage, mediaUrl } from '../lib/media';
import { timeAgo } from '../lib/time';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';
import { SHADOWS } from '../theme/colors';
import type { MpCase, MpContact, MpMeeting, CaseStatus, CaseChannel } from '../types/db';

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

// 접수 경로 — 전화·문자·카톡 등 직접 받은 민원의 유입 채널
const CHANNELS: { key: CaseChannel; label: string }[] = [
  { key: 'call', label: '전화' },
  { key: 'sms', label: '문자' },
  { key: 'kakao', label: '카톡' },
  { key: 'visit', label: '방문' },
  { key: 'etc', label: '기타' },
];
const chanLabel = (k: CaseChannel) => CHANNELS.find(c => c.key === k)?.label ?? '기타';

const MAX_PHOTOS = 4;
type PickedPhoto = { uri: string; base64: string; w?: number; h?: number };

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
const FILTER_LABELS = FILTERS.map(f => f.label);

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function CasesScreen() {
  const { COLORS } = useTheme();
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

  // 요약 스트립 — 전체 민원 기준 상태별 집계(필터와 무관하게 전체 흐름을 보여준다)
  const stats = useMemo(() => ({
    open: cases.filter(c => c.status === 'open').length,
    progress: cases.filter(c => c.status === 'progress').length,
    done: cases.filter(c => c.status === 'resolved' || c.status === 'closed').length,
  }), [cases]);

  const s = useMemo(() => makeStyles(COLORS), [COLORS]);
  const activeLabel = FILTERS.find(f => f.key === filter)?.label ?? '전체';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header
        title="민원"
        rightElement={
          <GlassIconButton
            icon="create-outline"
            onPress={() => setCompose(true)}
            size={44}
            iconSize={20}
            fallbackVariant="surface"
          />
        }
      />

      <UnderlineTabs
        tabs={FILTER_LABELS}
        active={activeLabel}
        onChange={label => {
          const f = FILTERS.find(x => x.label === label);
          if (f) setFilter(f.key);
        }}
      />

      <FlatList
        data={list}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textCaption} />}
        ListHeaderComponent={
          cases.length === 0 ? null : (
            <View style={s.statWrap}>
              <View style={s.statCell}>
                <Text style={s.statNum}>{stats.open}</Text>
                <Text style={s.statLabel}>접수</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statCell}>
                <Text style={[s.statNum, { color: COLORS.primary }]}>{stats.progress}</Text>
                <Text style={s.statLabel}>처리중</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statCell}>
                <Text style={s.statNum}>{stats.done}</Text>
                <Text style={s.statLabel}>해결</Text>
              </View>
            </View>
          )
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title={filter === 'all' ? '접수된 민원이 없어요' : `${STATUS_LABEL[filter as CaseStatus]} 상태의 민원이 없어요`}
            sub={'전화·문자·카톡으로 받은 민원을 등록하면\n접수부터 해결까지 상태별로 관리할 수 있어요.'}
            ctaLabel="직접 등록하기"
            onCta={() => setCompose(true)}
          />
        }
        renderItem={({ item }) => {
          const sc = statusColors(item.status);
          const media = item.media ?? [];
          // 진행 흐름 — 접수(0) → 처리중(1) → 해결(2). 해결/종결은 전 구간 success.
          const done = item.status === 'resolved' || item.status === 'closed';
          const step = item.status === 'open' ? 0 : item.status === 'progress' ? 1 : 2;
          const stepColor = (i: number) => (done ? COLORS.success : i <= step ? COLORS.primary : COLORS.grey200);
          return (
            <PressableScale style={s.card} scaleTo={0.98} onPress={() => setSelected(item)}>
              <View style={s.cardTop}>
                <View style={s.catBadge}>
                  <Text style={s.catBadgeText}>{catLabel(item.category)}</Text>
                </View>
                {item.channel ? (
                  <View style={s.chanBadge}>
                    <Text style={s.chanBadgeText}>{chanLabel(item.channel)}</Text>
                  </View>
                ) : null}
                <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[s.statusBadgeText, { color: sc.fg }]}>{STATUS_LABEL[item.status]}</Text>
                </View>
                <View style={{ flex: 1 }} />
                <Text style={s.cardDate}>{timeAgo(item.created_at)}</Text>
              </View>
              <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
              {item.body ? <Text style={s.cardBody} numberOfLines={2}>{item.body}</Text> : null}
              {media.length > 0 ? (
                <View style={s.previewWrap}>
                  <Image source={{ uri: mediaUrl(media[0].path) }} style={s.previewImg} />
                  {media.length > 1 ? (
                    <View style={s.previewMore}>
                      <Text style={s.previewMoreText}>+{media.length - 1}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
              {item.mp_contacts?.name ? (
                <View style={s.cardContact}>
                  <Ionicons name="person-outline" size={12} color={COLORS.textTertiary} />
                  <Text style={s.cardContactText} numberOfLines={1}>{item.mp_contacts.name}</Text>
                </View>
              ) : null}
              <View style={s.steps}>
                <View style={[s.stepDot, { backgroundColor: stepColor(0) }]} />
                <View style={[s.stepLine, { backgroundColor: stepColor(1) }]} />
                <View style={[s.stepDot, { backgroundColor: stepColor(1) }]} />
                <View style={[s.stepLine, { backgroundColor: stepColor(2) }]} />
                <View style={[s.stepDot, { backgroundColor: stepColor(2) }]} />
              </View>
            </PressableScale>
          );
        }}
      />

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
  const { COLORS } = useTheme();
  const insets = useSafeAreaInsets();
  const [meetings, setMeetings] = useState<MpMeeting[]>([]);
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);
  const s = useMemo(() => makeStyles(COLORS), [COLORS]);

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
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12 }} keyboardShouldPersistTaps="handled">
          <View style={s.cardTop}>
            <View style={s.catBadge}>
              <Text style={s.catBadgeText}>{catLabel(item.category)}</Text>
            </View>
            {item.channel ? (
              <View style={s.chanBadge}>
                <Text style={s.chanBadgeText}>{chanLabel(item.channel)}</Text>
              </View>
            ) : null}
            <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
              <Text style={[s.statusBadgeText, { color: sc.fg }]}>{STATUS_LABEL[item.status]}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <Text style={s.cardDate}>{fmtDate(item.created_at)}</Text>
          </View>
          <Text style={s.detailTitle}>{item.title}</Text>
          {item.mp_contacts?.name ? <Text style={s.cardMeta}>연결 연락처 · {item.mp_contacts.name}</Text> : null}
          {item.body ? <Text style={s.detailBody}>{item.body}</Text> : null}

          {/* 첨부 캡처 — 가로 스크롤 */}
          {(item.media ?? []).length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {(item.media ?? []).map((m, i) => (
                <Image key={`${m.path}-${i}`} source={{ uri: mediaUrl(m.path) }} style={s.detailImg} />
              ))}
            </ScrollView>
          ) : null}

          <PressableScale style={s.primaryBtn} scaleTo={0.97} onPress={cycleStatus} disabled={busy}>
            <Text style={s.primaryBtnText}>
              {item.status === 'resolved' || item.status === 'closed'
                ? '다시 접수 상태로'
                : `${STATUS_LABEL[NEXT_STATUS[item.status]]}(으)로 변경`}
            </Text>
          </PressableScale>

          {/* 메모 추가 */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[s.formInput, { flex: 1 }]}
              placeholder="처리 메모를 남겨 주세요"
              placeholderTextColor={COLORS.textTertiary}
              value={memo} onChangeText={setMemo}
            />
            <PressableScale style={s.memoBtn} scaleTo={0.96} onPress={addMemo} disabled={busy}>
              <Text style={s.memoBtnText}>기록</Text>
            </PressableScale>
          </View>

          {/* 타임라인 */}
          <Text style={s.sectionTitle}>처리 기록</Text>
          {meetings.length === 0 ? (
            <Text style={s.metaText}>아직 기록이 없어요. 첫 메모를 남겨 보세요.</Text>
          ) : meetings.map(m => (
            <View key={m.id} style={s.memoCard}>
              <Text style={s.metaText}>{fmtDate(m.met_at)}{m.place ? ` · ${m.place}` : ''}</Text>
              {m.summary ? <Text style={s.memoBody}>{m.summary}</Text> : null}
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── 등록 모달: 접수 경로·제목·분류·내용·캡처 첨부·연락처 연결(선택) ──
function ComposeModal({ visible, onClose, onSaved }: {
  visible: boolean; onClose: () => void; onSaved: () => void;
}) {
  const { COLORS } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [channel, setChannel] = useState<CaseChannel>('call');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('etc');
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [contacts, setContacts] = useState<MpContact[]>([]);
  const [query, setQuery] = useState('');
  const [contactId, setContactId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const s = useMemo(() => makeStyles(COLORS), [COLORS]);

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

  const reset = () => {
    setChannel('call'); setTitle(''); setCategory('etc'); setBody(''); setPhotos([]);
    setQuery(''); setContactId(null);
  };

  const pickPhotos = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_PHOTOS - photos.length,
        quality: 0.7,
        base64: true, // 업로드용 — supabase RN 공식 경로가 ArrayBuffer 바디
      });
      if (res.canceled) return;
      const picked = res.assets
        .filter(a => a.base64)
        .map(a => ({ uri: a.uri, base64: a.base64!, w: a.width, h: a.height }));
      setPhotos(p => [...p, ...picked].slice(0, MAX_PHOTOS));
    } catch (e: any) {
      Alert.alert('사진 선택 실패', String(e?.message ?? e));
    }
  };

  const save = async () => {
    if (busy) return;
    if (!title.trim()) return Alert.alert('입력 확인', '민원 제목을 입력해 주세요.');
    setBusy(true);
    // 캡처 업로드 먼저 — 실패하면 민원도 만들지 않는다(첨부 없는 반쪽 저장 방지)
    let media: { path: string; w?: number; h?: number }[] = [];
    if (photos.length > 0) {
      if (!user) { setBusy(false); return Alert.alert('저장 실패', '로그인이 필요해요.'); }
      try {
        media = await Promise.all(
          photos.map((p, i) => uploadPostImage(user.id, p.base64, i).then(path => ({ path, w: p.w, h: p.h }))),
        );
      } catch (e: any) {
        setBusy(false);
        return Alert.alert('캡처 업로드 실패', String(e?.message ?? e));
      }
    }
    const { error } = await supabase.from('mp_cases').insert({
      title: title.trim(), category, body: body.trim() || null, contact_id: contactId,
      status: 'open', channel, media,
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
          <Text style={s.modalTitle}>민원 직접 등록</Text>
          <Pressable onPress={save} disabled={busy}><Text style={s.modalSave}>저장</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12 }} keyboardShouldPersistTaps="handled">
          {/* 접수 경로 — 검정 활성 pill */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CHANNELS.map(c => (
              <PressableScale
                key={c.key}
                style={[s.chipPill, channel === c.key && s.chipPillActive]}
                scaleTo={0.96}
                onPress={() => setChannel(c.key)}
              >
                <Text style={[s.chipPillText, channel === c.key && s.chipPillTextActive]}>{c.label}</Text>
              </PressableScale>
            ))}
          </View>

          <TextInput style={s.formInput} placeholder="민원 제목" placeholderTextColor={COLORS.textTertiary} value={title} onChangeText={setTitle} />

          {/* 분류 — 검정 활성 pill */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map(c => (
              <PressableScale
                key={c.key}
                style={[s.chipPill, category === c.key && s.chipPillActive]}
                scaleTo={0.96}
                onPress={() => setCategory(c.key)}
              >
                <Text style={[s.chipPillText, category === c.key && s.chipPillTextActive]}>{c.label}</Text>
              </PressableScale>
            ))}
          </View>

          <TextInput
            style={[s.formInput, s.formInputMultiline]}
            placeholder="민원 내용 (선택)"
            placeholderTextColor={COLORS.textTertiary} multiline value={body} onChangeText={setBody}
          />

          {/* 캡처 첨부 — 최대 4장 */}
          <Text style={s.photoLabel}>캡처 첨부 (문자·카톡 스크린샷)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {photos.map((p, i) => (
              <View key={`${p.uri}-${i}`}>
                <Image source={{ uri: p.uri }} style={s.thumb} />
                <Pressable style={s.thumbX} onPress={() => setPhotos(ps => ps.filter((_, j) => j !== i))}>
                  <Text style={s.thumbXText}>×</Text>
                </Pressable>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <Pressable style={s.thumbAdd} onPress={pickPhotos}>
                <Ionicons name="images-outline" size={20} color={COLORS.textCaption} />
                <Text style={s.thumbAddText}>추가</Text>
              </Pressable>
            )}
          </View>

          {/* 연락처 연결 */}
          <Text style={s.sectionTitle}>연락처 연결 (선택)</Text>
          {selectedContact ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={s.linkedChip}>
                <Text style={s.linkedChipText}>{selectedContact.name}</Text>
              </View>
              <Pressable onPress={() => setContactId(null)}>
                <Text style={s.unlinkText}>연결 해제</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput style={s.formInput} placeholder="이름으로 검색" placeholderTextColor={COLORS.textTertiary} value={query} onChangeText={setQuery} />
              {filtered.map(c => (
                <Pressable key={c.id} style={s.contactRow} onPress={() => setContactId(c.id)}>
                  <Text style={s.contactName}>{c.name}</Text>
                  {c.title ? <Text style={s.metaText}>{c.title}</Text> : null}
                </Pressable>
              ))}
              {filtered.length === 0 ? <Text style={s.metaText}>검색 결과가 없어요.</Text> : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ── 스타일 — 폴리 본체 ComplaintScreen 실측값 그대로 ── */
const makeStyles = (COLORS: ThemeColors) => StyleSheet.create({
  // 요약 스트립 — 접수/처리중/해결 3칸
  statWrap: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingVertical: 14,
    ...SHADOWS.subtle,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: COLORS.divider, marginVertical: 2 },
  statNum: { fontSize: 19, fontWeight: '800', color: COLORS.text, letterSpacing: -0.4 },
  statLabel: { fontSize: 11.5, color: COLORS.textTertiary, letterSpacing: -0.2 },

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
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  catBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.primary, letterSpacing: -0.1 },
  chanBadge: { backgroundColor: COLORS.grey100, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  chanBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: -0.1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: -0.1 },
  cardDate: { fontSize: 11.5, color: COLORS.textTertiary },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, letterSpacing: -0.2 },
  cardBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, letterSpacing: -0.2, marginTop: 4 },
  cardMeta: { fontSize: 12, color: COLORS.textTertiary, letterSpacing: -0.1 },
  cardContact: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  cardContactText: { fontSize: 12, color: COLORS.textTertiary, letterSpacing: -0.1, flexShrink: 1 },

  // 진행 흐름 미니 인디케이터 (접수→처리중→해결)
  steps: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  stepDot: { width: 7, height: 7, borderRadius: 3.5 },
  stepLine: { flex: 1, height: 1.5 },

  // 카드 하단 첨부 미리보기
  previewWrap: { marginTop: 8, alignSelf: 'flex-start' },
  previewImg: { width: 72, height: 72, borderRadius: 8, backgroundColor: COLORS.backgroundSecondary },
  previewMore: {
    position: 'absolute', right: 0, bottom: 0, left: 0, top: 0, borderRadius: 8,
    backgroundColor: COLORS.overlayStrong, alignItems: 'center', justifyContent: 'center',
  },
  previewMoreText: { fontSize: 13, fontWeight: '700', color: COLORS.textInverse, letterSpacing: -0.2 },

  // 모달 크롬 (pageSheet 헤더 — 구조 유지, 타이포만 폴리 자간)
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  modalCancel: { fontSize: 16, color: COLORS.textCaption, letterSpacing: -0.2 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.grey900, letterSpacing: -0.3 },
  modalSave: { fontSize: 16, fontWeight: '700', color: COLORS.primary, letterSpacing: -0.2 },

  // 상세
  detailTitle: { fontSize: 19, fontWeight: '700', color: COLORS.text, letterSpacing: -0.4, lineHeight: 26 },
  detailBody: { fontSize: 14, color: COLORS.textBody, lineHeight: 22, letterSpacing: -0.2 },
  detailImg: { width: 120, height: 120, borderRadius: 10, backgroundColor: COLORS.backgroundSecondary },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3, marginTop: 8 },
  metaText: { fontSize: 12, color: COLORS.textTertiary, letterSpacing: -0.1 },

  // 주요 버튼 (폴리 인디고 풀폭)
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  primaryBtnText: { fontSize: 15.5, fontWeight: '700', color: COLORS.textInverse, letterSpacing: -0.2 },

  // 폼 입력 (grey50)
  formInput: {
    backgroundColor: COLORS.grey50,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.text,
  },
  formInputMultiline: { minHeight: 110, textAlignVertical: 'top', paddingTop: 13 },
  memoBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  memoBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.textInverse, letterSpacing: -0.2 },

  // 처리 기록 카드
  memoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 11,
    ...SHADOWS.subtle,
  },
  memoBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, letterSpacing: -0.2, marginTop: 4 },

  // 분류 칩 (검정 활성 pill)
  chipPill: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16, backgroundColor: COLORS.surface, ...SHADOWS.subtle },
  chipPillActive: { backgroundColor: COLORS.text },
  chipPillText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: -0.2 },
  chipPillTextActive: { color: COLORS.textInverse, fontWeight: '700' },

  // 캡처 첨부 (컴포즈)
  photoLabel: { fontSize: 12.5, fontWeight: '600', color: COLORS.textTertiary, letterSpacing: -0.1 },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: COLORS.backgroundSecondary },
  thumbX: {
    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.overlayStrong, alignItems: 'center', justifyContent: 'center',
  },
  thumbXText: { color: COLORS.textInverse, fontSize: 13, fontWeight: '700', marginTop: -1 },
  thumbAdd: {
    width: 72, height: 72, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  thumbAddText: { fontSize: 11, color: COLORS.textCaption, letterSpacing: -0.1 },

  // 연락처 연결
  linkedChip: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  linkedChipText: { fontSize: 13, fontWeight: '700', color: COLORS.primary, letterSpacing: -0.2 },
  unlinkText: { fontSize: 12, color: COLORS.textTertiary, letterSpacing: -0.1, textDecorationLine: 'underline' },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.grey50,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  contactName: { fontSize: 15, fontWeight: '600', color: COLORS.text, letterSpacing: -0.2 },
});

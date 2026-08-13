// 연락처 — 조직관리용 연락처 탭. 검색·즐겨찾기·후원 매칭 뱃지 + 정치인용 프로필 상세 + 등록/편집.
// 화면 문법은 폴리 본체(ComplaintScreen) 실측값 — Header + GlassIconButton + PolyUI + PressableScale.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Modal, TextInput,
  Alert, RefreshControl, KeyboardAvoidingView, Platform, Linking, ScrollView,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Contacts from 'expo-contacts';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassIconButton from '../components/GlassIconButton';
import PressableScale from '../components/PressableScale';
import InitialAvatar from '../components/InitialAvatar';
import { EmptyState } from '../components/PolyUI';
import { supabase } from '../lib/supabase';
import { uploadPostImage, mediaUrl } from '../lib/media';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';
import { SHADOWS } from '../theme/colors';
import { LAYOUT } from '../theme/layout';
import type { MpContact, MpCase, MpMeeting, DonorSummary } from '../types/db';

// ── 유틸 ──
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

const fmtWon = (total: number) => {
  const man = Math.round(total / 10000);
  return man >= 1 ? `${man.toLocaleString()}만원` : `${total.toLocaleString()}원`;
};

/** date 컬럼(YYYY-MM-DD)은 문자열로 쪼갠다 — new Date()로 파싱하면 UTC 보정에 하루가 밀린다 */
const ymd = (v: string): [number, number, number] | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v.trim());
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};

/** "2024년 3월" */
const fmtYearMonth = (v: string) => {
  const p = ymd(v);
  return p ? `${p[0]}년 ${p[1]}월` : v;
};

/** "3월 15일" */
const fmtMonthDay = (v: string) => {
  const p = ymd(v);
  return p ? `${p[1]}월 ${p[2]}일` : v;
};

/** 알게 된 지 얼마나 됐는지 — "3개월 전" / "2년 전" */
const elapsedLabel = (v: string): string => {
  const p = ymd(v);
  if (!p) return '';
  const then = new Date(p[0], p[1] - 1, p[2]).getTime();
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days < 0) return '';
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(months / 12)}년 전`;
};

/** 다음 생일까지 남은 일수 (오늘 기준, 올해가 지났으면 내년) */
const daysToBirthday = (v: string): number | null => {
  const p = ymd(v);
  if (!p) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), p[1] - 1, p[2]);
  if (next.getTime() < today.getTime()) next = new Date(today.getFullYear() + 1, p[1] - 1, p[2]);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
};

/** 폼의 날짜 입력 검증 — 빈 값은 null 허용, 형식이 틀리면 ok:false */
const parseDateInput = (v: string): { ok: boolean; value: string | null } => {
  const t = v.trim();
  if (!t) return { ok: true, value: null };
  const p = ymd(t);
  if (!p || t.length !== 10) return { ok: false, value: null };
  const d = new Date(p[0], p[1] - 1, p[2]);
  if (d.getFullYear() !== p[0] || d.getMonth() !== p[1] - 1 || d.getDate() !== p[2]) {
    return { ok: false, value: null };
  }
  return { ok: true, value: t };
};

/** 전화 → phone_hash: 숫자만 추출 → 82 정규화(0 시작이면 0 떼고 82) → SHA256 hex */
export async function phoneToHash(phone: string): Promise<string | null> {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  const normalized = digits.startsWith('0') ? `82${digits.slice(1)}` : digits;
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalized);
}

type OrgLink = { org_id: string; role: string | null; name: string };
type TimelineItem = { key: string; kind: 'case' | 'meeting'; at: string; title: string; sub: string | null };

const CASE_STATUS_LABEL: Record<string, string> = {
  open: '접수', progress: '진행 중', resolved: '해결', closed: '종결',
};

const CLOSENESS_OPTS: { v: number; label: string }[] = [
  { v: 2, label: '매우 가까움' },
  { v: 1, label: '가까움' },
  { v: 0, label: '보통' },
  { v: -1, label: '서먹' },
  { v: -2, label: '먼 사이' },
];
const closenessLabel = (v: number | null) =>
  v === null || v === undefined ? '미평가' : (CLOSENESS_OPTS.find(o => o.v === v)?.label ?? '미평가');

export default function ContactsScreen() {
  const { COLORS } = useTheme();
  const [contacts, setContacts] = useState<MpContact[]>([]);
  const [orgsByContact, setOrgsByContact] = useState<Record<string, OrgLink[]>>({});
  const [donorByHash, setDonorByHash] = useState<Record<string, DonorSummary>>({});
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [compose, setCompose] = useState(false);
  const [importing, setImporting] = useState(false);
  // 상세는 id로 들고 있는다 — 편집·새로고침 후 목록이 갱신되면 화면도 같이 최신값을 본다
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('mp_contacts').select('*').order('name', { ascending: true }).limit(500);
    if (error || !data) return;
    const rows = data as MpContact[];
    setContacts(rows);

    // 소속 단체 (mp_contact_orgs → mp_orgs)
    const ids = rows.map(r => r.id);
    if (ids.length > 0) {
      const { data: links } = await supabase
        .from('mp_contact_orgs')
        .select('contact_id, org_id, role, mp_orgs(name)')
        .in('contact_id', ids);
      if (links) {
        const map: Record<string, OrgLink[]> = {};
        for (const l of links as any[]) {
          const name: string | undefined = l.mp_orgs?.name;
          if (!name) continue;
          (map[l.contact_id] ??= []).push({ org_id: l.org_id, role: l.role ?? null, name });
        }
        setOrgsByContact(map);
      }
    } else {
      setOrgsByContact({});
    }

    // 후원 매칭 — phone_hash 있는 연락처만 모아 1회 RPC. 실패는 조용히 무시.
    const hashes = Array.from(new Set(rows.map(r => r.phone_hash).filter((h): h is string => !!h)));
    if (hashes.length > 0) {
      try {
        const { data: donors, error: rpcErr } = await supabase.rpc('mp_donor_summary', { hashes });
        if (!rpcErr && donors) {
          const map: Record<string, DonorSummary> = {};
          for (const d of donors as DonorSummary[]) map[d.phone_hash] = d;
          setDonorByHash(map);
        }
      } catch {}
    } else {
      setDonorByHash({});
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const toggleFavorite = async (item: MpContact) => {
    const next = !item.favorite;
    setContacts(prev => prev.map(c => (c.id === item.id ? { ...c, favorite: next } : c)));
    const { error } = await supabase.from('mp_contacts').update({ favorite: next }).eq('id', item.id);
    if (error) {
      setContacts(prev => prev.map(c => (c.id === item.id ? { ...c, favorite: !next } : c)));
      Alert.alert('저장 실패', error.message);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? contacts.filter(c =>
          c.name.toLowerCase().includes(q) ||
          (c.phone ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, '') || ' ') ||
          c.tags.some(t => t.toLowerCase().includes(q)))
      : contacts;
    // 즐겨찾기 우선, 그 안에서는 이름순 유지
    return [...base].sort((a, b) => Number(b.favorite) - Number(a.favorite));
  }, [contacts, query]);

  // 요약 스트립 — 전체 / 후원자(매칭된 연락처 수) / 즐겨찾기
  const stats = useMemo(() => ({
    total: contacts.length,
    donors: contacts.filter(c => !!c.phone_hash && !!donorByHash[c.phone_hash]).length,
    favorites: contacts.filter(c => c.favorite).length,
  }), [contacts, donorByHash]);

  const selected = useMemo(
    () => contacts.find(c => c.id === selectedId) ?? null,
    [contacts, selectedId],
  );

  const s = useMemo(() => makeStyles(COLORS), [COLORS]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header
        title="연락처"
        rightElement={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <GlassIconButton
              icon="person-add-outline"
              onPress={() => setImporting(true)}
              size={44}
              iconSize={20}
              fallbackVariant="surface"
            />
            <GlassIconButton
              icon="create-outline"
              onPress={() => setCompose(true)}
              size={44}
              iconSize={20}
              fallbackVariant="surface"
            />
          </View>
        }
      />

      {/* 검색 */}
      <TextInput
        style={s.search}
        placeholder="이름·전화·태그 검색"
        placeholderTextColor={COLORS.textTertiary}
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        autoCorrect={false}
      />

      {/* 본문 — 요약 스트립 + 그룹 리스트(한 카드 안에 행 + hairline 구분선) */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textCaption} />}
        ListHeaderComponent={
          // 요약 스트립 — 연락처가 0건이면 렌더하지 않는다
          stats.total === 0 ? null : (
            <View style={s.statWrap}>
              <View style={s.statCell}>
                <Text style={s.statNum}>{stats.total}</Text>
                <Text style={s.statLabel}>전체</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statCell}>
                <Text style={[s.statNum, { color: COLORS.primary }]}>{stats.donors}</Text>
                <Text style={s.statLabel}>후원자</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statCell}>
                <Text style={s.statNum}>{stats.favorites}</Text>
                <Text style={s.statLabel}>즐겨찾기</Text>
              </View>
            </View>
          )
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={query ? '검색 결과가 없어요' : '첫 연락처를 등록해 보세요'}
            sub={query
              ? '다른 이름·전화번호·태그로 검색해 보세요.'
              : '지역 유지·단체 관계자를 등록하면\n민원·미팅·후원 이력이 한 화면에 모여요.'}
            ctaLabel={query ? undefined : '연락처 등록하기'}
            onCta={() => setCompose(true)}
          />
        }
        renderItem={({ item, index }) => {
          const orgs = orgsByContact[item.id] ?? [];
          const donor = item.phone_hash ? donorByHash[item.phone_hash] : undefined;
          // 한 줄 요약 — 직함 · 직장 · 소속단체 첫 개 · 태그 첫 개
          const summary = [
            item.title,
            item.company,
            orgs[0]?.name,
            item.tags[0] ? `#${item.tags[0]}` : null,
          ].filter(Boolean).join(' · ');
          return (
            // 그룹 리스트 — 한 장의 카드처럼 보이도록 행마다 같은 surface, 첫/마지막만 라운드.
            // 구분선은 각 행의 '위'에 두어(index > 0) 마지막 행 뒤에 선이 남지 않는다.
            <View
              style={[
                s.groupWrap,
                index === 0 && s.groupWrapFirst,
                index === filtered.length - 1 && s.groupWrapLast,
              ]}
            >
              {index > 0 && <View style={s.rowDivider} />}
              <PressableScale style={s.row} scaleTo={0.99} onPress={() => setSelectedId(item.id)}>
                <InitialAvatar
                  photo={item.photo_path ? mediaUrl(item.photo_path) : null}
                  name={item.name}
                  size={LAYOUT.rowAvatar}
                />
                <View style={s.rowMain}>
                  <View style={s.nameLine}>
                    <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                    {donor && (
                      <Text style={s.donorBadge} numberOfLines={1}>
                        후원 {donor.cnt}회 · {fmtWon(donor.total)}
                      </Text>
                    )}
                  </View>
                  {summary ? (
                    <Text style={s.rowSub} numberOfLines={1}>{summary}</Text>
                  ) : null}
                </View>
                <Pressable hitSlop={10} onPress={() => toggleFavorite(item)}>
                  <Text style={[s.star, { color: item.favorite ? COLORS.primary : COLORS.grey300 }]}>
                    {item.favorite ? '★' : '☆'}
                  </Text>
                </Pressable>
              </PressableScale>
            </View>
          );
        }}
      />

      <EditModal
        visible={compose}
        contact={null}
        onClose={() => setCompose(false)}
        onSaved={() => { setCompose(false); load(); }}
      />
      <ImportModal
        visible={importing}
        existing={contacts}
        onClose={() => setImporting(false)}
        onSaved={() => { setImporting(false); load(); }}
      />
      <DetailModal
        contact={selected}
        orgs={selected ? (orgsByContact[selected.id] ?? []) : []}
        donor={selected?.phone_hash ? donorByHash[selected.phone_hash] : undefined}
        onClose={() => setSelectedId(null)}
        onChanged={load}
      />
    </View>
  );
}

// ── 상세 모달 — iOS 연락처 카드 문법(사진+이름 히어로 → 정보/이력 카드) ──
function DetailModal({ contact, orgs, donor, onClose, onChanged }: {
  contact: MpContact | null;
  orgs: OrgLink[];
  donor: DonorSummary | undefined;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { COLORS } = useTheme();
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [counts, setCounts] = useState({ cases: 0, meetings: 0 });
  const [memo, setMemo] = useState('');
  const [memoBusy, setMemoBusy] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const s = useMemo(() => makeStyles(COLORS), [COLORS]);

  const contactId = contact?.id ?? null;
  const contactMemo = contact?.memo ?? '';

  useEffect(() => { setMemo(contactMemo); }, [contactId, contactMemo]);

  useEffect(() => {
    if (!contactId) return;
    setTimeline([]);
    setCounts({ cases: 0, meetings: 0 });
    (async () => {
      const [cs, ms, cCnt, mCnt] = await Promise.all([
        supabase.from('mp_cases').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }).limit(5),
        supabase.from('mp_meetings').select('*').eq('contact_id', contactId).order('met_at', { ascending: false }).limit(5),
        supabase.from('mp_cases').select('id', { count: 'exact', head: true }).eq('contact_id', contactId),
        supabase.from('mp_meetings').select('id', { count: 'exact', head: true }).eq('contact_id', contactId),
      ]);
      const items: TimelineItem[] = [];
      for (const c of ((cs.data ?? []) as MpCase[])) {
        items.push({
          key: `case-${c.id}`, kind: 'case', at: c.created_at, title: c.title,
          sub: CASE_STATUS_LABEL[c.status] ?? c.status,
        });
      }
      for (const m of ((ms.data ?? []) as MpMeeting[])) {
        items.push({
          key: `meeting-${m.id}`, kind: 'meeting', at: m.met_at, title: m.summary ?? '미팅',
          sub: m.place,
        });
      }
      items.sort((a, b) => +new Date(b.at) - +new Date(a.at));
      setTimeline(items);
      setCounts({ cases: cCnt.count ?? 0, meetings: mCnt.count ?? 0 });
    })();
  }, [contactId]);

  const saveMemo = async () => {
    if (!contact || memoBusy) return;
    setMemoBusy(true);
    const { error } = await supabase.from('mp_contacts').update({ memo: memo.trim() || null }).eq('id', contact.id);
    setMemoBusy(false);
    if (error) return Alert.alert('저장 실패', error.message);
    onChanged();
  };

  const askDelete = () => {
    if (!contact || delBusy) return;
    Alert.alert('연락처 삭제', `${contact.name} 님을 목록에서 지울까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => Alert.alert('되돌릴 수 없어요', '이름·전화·메모가 모두 지워져요.\n정말 삭제할까요?', [
          { text: '취소', style: 'cancel' },
          { text: '삭제', style: 'destructive', onPress: doDelete },
        ]),
      },
    ]);
  };

  const doDelete = async () => {
    if (!contact) return;
    setDelBusy(true);
    const { error } = await supabase.from('mp_contacts').delete().eq('id', contact.id);
    setDelBusy(false);
    if (error) return Alert.alert('삭제 실패', error.message);
    onChanged();
    onClose();
  };

  if (!contact) return null;

  const phoneDigits = (contact.phone ?? '').replace(/\D/g, '');
  const heroSub = [contact.title, contact.company].filter(Boolean).join(' · ');
  const bDays = contact.birthday ? daysToBirthday(contact.birthday) : null;

  const openUrl = (url: string, failMsg: string) =>
    Linking.openURL(url).catch(() => Alert.alert('열 수 없어요', failMsg));

  // 행 문법 — 좌측 라벨 / 우측 값, 행 사이는 hairline
  const row = (key: string, label: string, value: React.ReactNode, onPress?: () => void) => {
    const body = (
      <View style={s.infoRow}>
        <Text style={s.infoLabel}>{label}</Text>
        {typeof value === 'string'
          ? <Text style={[s.infoValue, onPress ? { color: COLORS.primary } : null]} numberOfLines={1}>{value}</Text>
          : <View style={s.infoValueWrap}>{value}</View>}
      </View>
    );
    return onPress
      ? <Pressable key={key} onPress={onPress}>{body}</Pressable>
      : <View key={key}>{body}</View>;
  };

  const stack = (nodes: React.ReactNode[]) =>
    nodes.map((n, i) => (
      <React.Fragment key={`r${i}`}>
        {i > 0 && <View style={s.hair} />}
        {n}
      </React.Fragment>
    ));

  // (b) 관계
  const relRows: React.ReactNode[] = [
    row('closeness', '친밀도', (
      <View style={s.gaugeWrap}>
        <View style={s.gaugeTrack}>
          {/* != null — 값이 없는 행에서 (undefined+2)*22.5 = NaN 이 되어 width:"NaN%"로 새는 걸 막는다 */}
          {contact.closeness != null && (
            <View
              style={[
                s.gaugeFill,
                {
                  width: `${10 + (contact.closeness + 2) * 22.5}%`,
                  backgroundColor: contact.closeness >= 1
                    ? COLORS.success
                    : contact.closeness === 0 ? COLORS.accent : COLORS.warning,
                },
              ]}
            />
          )}
        </View>
        <Text style={s.gaugeLabel}>{closenessLabel(contact.closeness)}</Text>
      </View>
    )),
    row('metAt', '알게 된 시기', contact.met_at ? (
      <View style={s.valueLine}>
        <Text style={s.infoValueText}>{fmtYearMonth(contact.met_at)}</Text>
        <Text style={s.meta}>{elapsedLabel(contact.met_at)}</Text>
      </View>
    ) : <Text style={s.infoValuePlaceholder}>미기록</Text>),
  ];
  if (contact.met_context) {
    relRows.push(
      <View key="metCtx" style={s.blockRow}>
        <Text style={s.infoLabel}>알게 된 경위</Text>
        <Text style={s.body}>{contact.met_context}</Text>
      </View>,
    );
  }

  // (c) 신상·소속
  const infoRows: React.ReactNode[] = [];
  if (contact.phone) {
    infoRows.push(row('phone', '전화', contact.phone, () => openUrl(`tel:${phoneDigits}`, '이 기기에서 전화를 걸 수 없어요.')));
  }
  if (contact.email) {
    infoRows.push(row('email', '이메일', contact.email, () => openUrl(`mailto:${contact.email}`, '메일 앱을 열 수 없어요.')));
  }
  if (contact.company) infoRows.push(row('company', '직장', contact.company));
  if (contact.address) infoRows.push(row('address', '거주지', contact.address));
  if (contact.birthday) {
    infoRows.push(row('birthday', '생일', (
      <View style={s.valueLine}>
        <Text style={s.infoValueText}>{fmtMonthDay(contact.birthday)}</Text>
        {bDays !== null && bDays <= 30 && (
          <Text style={s.ddayBadge}>{bDays === 0 ? 'D-DAY' : `D-${bDays}`}</Text>
        )}
      </View>
    )));
  }
  infoRows.push(
    <View key="orgs" style={s.blockRow}>
      <Text style={s.infoLabel}>소속 단체</Text>
      {orgs.length === 0 ? (
        <Text style={s.meta}>연결된 단체가 없어요</Text>
      ) : (
        orgs.map(o => (
          <View key={o.org_id} style={s.orgRow}>
            <Text style={s.orgName} numberOfLines={1}>{o.name}</Text>
            {o.role ? <Text style={s.orgRole} numberOfLines={1}>{o.role}</Text> : null}
          </View>
        ))
      )}
    </View>,
  );
  if (contact.tags.length > 0) {
    infoRows.push(
      <View key="tags" style={s.blockRow}>
        <Text style={s.infoLabel}>태그</Text>
        <View style={s.chipWrap}>
          {contact.tags.map(t => <Text key={t} style={s.tagChip}>#{t}</Text>)}
        </View>
      </View>,
    );
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {/* 메모 입력이 스크롤 맨 아래에 있어 KeyboardAvoidingView가 없으면 키보드에 가린다 */}
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.modalHead}>
          <Pressable onPress={onClose}><Text style={s.modalCancel}>닫기</Text></Pressable>
          <Text style={s.modalTitle} numberOfLines={1}>{contact.name}</Text>
          <Pressable onPress={() => setEditing(true)}><Text style={s.linkBtn}>편집</Text></Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* (a) 히어로 — 사진 + 이름 + 퀵액션 */}
          <View style={s.hero}>
            <InitialAvatar
              photo={contact.photo_path ? mediaUrl(contact.photo_path) : null}
              name={contact.name}
              size={96}
            />
            <Text style={s.heroName}>{contact.name}</Text>
            {heroSub ? <Text style={s.heroSub} numberOfLines={1}>{heroSub}</Text> : null}
            {donor && (
              <Text style={s.heroPill}>후원 {donor.cnt}회 · 누적 {fmtWon(donor.total)}</Text>
            )}
            <View style={s.quickRow}>
              {contact.phone ? (
                <View style={s.quickItem}>
                  <PressableScale
                    style={s.quickBtn}
                    scaleTo={0.94}
                    onPress={() => openUrl(`tel:${phoneDigits}`, '이 기기에서 전화를 걸 수 없어요.')}
                  >
                    <Ionicons name="call" size={21} color={COLORS.primary} />
                  </PressableScale>
                  <Text style={s.quickLabel}>전화</Text>
                </View>
              ) : null}
              {contact.phone ? (
                <View style={s.quickItem}>
                  <PressableScale
                    style={s.quickBtn}
                    scaleTo={0.94}
                    onPress={() => openUrl(`sms:${phoneDigits}`, '메시지 앱을 열 수 없어요.')}
                  >
                    <Ionicons name="chatbubble-outline" size={21} color={COLORS.primary} />
                  </PressableScale>
                  <Text style={s.quickLabel}>문자</Text>
                </View>
              ) : null}
              {contact.email ? (
                <View style={s.quickItem}>
                  <PressableScale
                    style={s.quickBtn}
                    scaleTo={0.94}
                    onPress={() => openUrl(`mailto:${contact.email}`, '메일 앱을 열 수 없어요.')}
                  >
                    <Ionicons name="mail-outline" size={21} color={COLORS.primary} />
                  </PressableScale>
                  <Text style={s.quickLabel}>메일</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* (b) 관계 */}
          <View style={s.card}>
            <Text style={s.secLabel}>관계</Text>
            {stack(relRows)}
          </View>

          {/* (c) 정보 */}
          <View style={s.card}>
            <Text style={s.secLabel}>정보</Text>
            {stack(infoRows)}
          </View>

          {/* (d) 이력 — 요약 스트립 + 타임라인 */}
          <View style={s.card}>
            <Text style={s.secLabel}>이력</Text>
            <View style={s.histStrip}>
              <View style={s.histCell}>
                <Text style={s.histNum}>{counts.cases}</Text>
                <Text style={s.histLabel}>민원</Text>
              </View>
              <View style={s.histDivider} />
              <View style={s.histCell}>
                <Text style={s.histNum}>{counts.meetings}</Text>
                <Text style={s.histLabel}>미팅</Text>
              </View>
              <View style={s.histDivider} />
              <View style={s.histCell}>
                <Text style={[s.histNum, { color: COLORS.primary }]}>{donor?.cnt ?? 0}</Text>
                <Text style={s.histLabel}>후원</Text>
              </View>
            </View>
            {timeline.length === 0 ? (
              <Text style={s.meta}>아직 민원·미팅 기록이 없어요</Text>
            ) : (
              stack(timeline.map(t => (
                <View key={t.key} style={s.tlRow}>
                  <Text
                    style={[
                      s.tlKind,
                      t.kind === 'case'
                        ? { backgroundColor: COLORS.primaryLight, color: COLORS.primary }
                        : { backgroundColor: COLORS.grey100, color: COLORS.textSecondary },
                    ]}
                  >
                    {t.kind === 'case' ? '민원' : '미팅'}
                  </Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.tlTitle} numberOfLines={1}>{t.title}</Text>
                    <Text style={s.metaSmall} numberOfLines={1}>
                      {fmtDate(t.at)}{t.sub ? ` · ${t.sub}` : ''}
                    </Text>
                  </View>
                </View>
              )))
            )}
          </View>

          {/* (e) 메모 */}
          <View style={s.card}>
            <Text style={s.secLabel}>메모</Text>
            <TextInput
              style={[s.input, s.inputMultiline, { marginTop: 6 }]}
              placeholder="이 연락처에 대한 메모를 남겨 보세요"
              placeholderTextColor={COLORS.textTertiary}
              multiline value={memo} onChangeText={setMemo}
            />
            <PressableScale style={[s.primaryBtn, { paddingVertical: 12, marginTop: 10 }]} scaleTo={0.97} onPress={saveMemo} disabled={memoBusy}>
              <Text style={s.primaryBtnText}>{memoBusy ? '저장 중…' : '메모 저장'}</Text>
            </PressableScale>
          </View>

          {/* (f) 삭제 */}
          <Pressable onPress={askDelete} disabled={delBusy} style={{ marginTop: 8, marginBottom: 24 }}>
            <Text style={s.delText}>{delBusy ? '삭제 중…' : '이 연락처 삭제'}</Text>
          </Pressable>
        </ScrollView>

        <EditModal
          visible={editing}
          contact={contact}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); onChanged(); }}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── 주소록 가져오기 모달 ──
// 원칙: 기기 주소록은 화면에만 보여주고, 서버에는 사용자가 체크한 연락처만 저장한다.
// 전체 선택은 '중복 아닌 항목'만 담는 편의 기능 — 체크 상태는 그대로 사용자가 확인·해제할 수 있다.
type DeviceContact = { id: string; name: string; phone: string | null };

const IMPORT_CHUNK = 100;

function ImportModal({ visible, existing, onClose, onSaved }: {
  visible: boolean; existing: MpContact[]; onClose: () => void; onSaved: () => void;
}) {
  const { COLORS } = useTheme();
  const [perm, setPerm] = useState<'loading' | 'denied' | 'granted'>('loading');
  const [device, setDevice] = useState<DeviceContact[]>([]);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const s = useMemo(() => makeStyles(COLORS), [COLORS]);

  useEffect(() => {
    if (!visible) return;
    setSel({}); setQ(''); setPerm('loading');
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') { setPerm('denied'); return; }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });
      const rows: DeviceContact[] = data
        .filter(c => (c.name ?? '').trim())
        .map((c, i) => ({
          id: c.id ?? `row-${i}`,
          name: c.name!.trim(),
          phone: c.phoneNumbers?.[0]?.number ?? null,
        }));
      setDevice(rows);
      setPerm('granted');
    })();
  }, [visible]);

  // 이미 등록된 연락처는 회색 처리(중복 방지) — 전화 숫자 또는 이름으로 대조
  const existingPhones = useMemo(
    () => new Set(existing.map(c => (c.phone ?? '').replace(/\D/g, '')).filter(Boolean)),
    [existing],
  );
  const existingNames = useMemo(() => new Set(existing.map(c => c.name)), [existing]);
  const isDup = useCallback(
    (d: DeviceContact) => (d.phone ? existingPhones.has(d.phone.replace(/\D/g, '')) : existingNames.has(d.name)),
    [existingPhones, existingNames],
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return device;
    const qd = qq.replace(/\D/g, '');
    return device.filter(d =>
      d.name.toLowerCase().includes(qq) ||
      (qd && (d.phone ?? '').replace(/\D/g, '').includes(qd)));
  }, [device, q]);

  const selCount = Object.values(sel).filter(Boolean).length;

  /** 전체 선택 — 이미 등록된(중복) 항목은 빼고 담는다 */
  const selectAll = () => {
    const next: Record<string, boolean> = {};
    for (const d of device) if (!isDup(d)) next[d.id] = true;
    setSel(next);
  };

  const doImport = async () => {
    if (busy || selCount === 0) return;
    setBusy(true);
    const chosen = device.filter(d => sel[d.id]);
    const rows = await Promise.all(chosen.map(async d => ({
      name: d.name,
      phone: d.phone,
      phone_hash: d.phone ? await phoneToHash(d.phone).catch(() => null) : null,
      tags: [] as string[],
    })));
    // 대량 가져오기 — 100건씩 잘라 순차 insert. 실패하면 그 지점에서 멈추고 저장된 건수를 알린다.
    let saved = 0;
    for (let i = 0; i < rows.length; i += IMPORT_CHUNK) {
      const chunk = rows.slice(i, i + IMPORT_CHUNK);
      const { error } = await supabase.from('mp_contacts').insert(chunk);
      if (error) {
        setBusy(false);
        // onSaved()는 모달을 닫는다 — Alert보다 먼저 닫으면 iOS에서 경고창이 같이 사라진다.
        // 확인을 누른 뒤에 닫고 새로고침한다.
        Alert.alert(
          '가져오기 중단',
          saved > 0 ? `${saved}명까지 저장됐어요.\n${error.message}` : error.message,
          [{ text: '확인', onPress: () => { if (saved > 0) onSaved(); } }],
        );
        return;
      }
      saved += chunk.length;
    }
    setBusy(false);
    onSaved();
  };

  const saveLabel = busy ? '저장 중…' : (selCount > 0 ? `${selCount}명 추가` : '추가');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={s.modalHead}>
          <Pressable onPress={onClose}><Text style={s.modalCancel}>취소</Text></Pressable>
          <Text style={s.modalTitle}>주소록 가져오기</Text>
          <Pressable onPress={doImport} disabled={busy || selCount === 0}>
            <Text style={[s.modalSave, { color: selCount > 0 && !busy ? COLORS.primary : COLORS.textTertiary }]}>
              {saveLabel}
            </Text>
          </Pressable>
        </View>

        {perm === 'denied' ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>주소록 접근이 꺼져 있어요</Text>
            <Text style={s.emptyBody}>설정 → 폴리 오피스 → 연락처에서{'\n'}접근을 허용하면 가져올 수 있어요.</Text>
          </View>
        ) : (
          <>
            <View style={{ paddingHorizontal: LAYOUT.screenX }}>
              <Text style={s.importNote}>
                체크한 연락처만 서버에 저장돼요. 전체 선택으로 한 번에 담을 수 있어요.
              </Text>
              <View style={s.bulkRow}>
                <Pressable onPress={selectAll} hitSlop={8}><Text style={s.linkBtn}>전체 선택</Text></Pressable>
                <Pressable onPress={() => setSel({})} hitSlop={8}><Text style={s.linkBtn}>선택 해제</Text></Pressable>
              </View>
              <TextInput
                style={[s.input, { marginTop: 8 }]}
                placeholder="이름·전화 검색"
                placeholderTextColor={COLORS.textTertiary}
                value={q} onChangeText={setQ} autoCorrect={false}
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={d => d.id}
              contentContainerStyle={{ paddingHorizontal: LAYOUT.screenX, paddingTop: 4, paddingBottom: 48 }}
              ListEmptyComponent={
                perm === 'loading' ? (
                  <View style={s.empty}><Text style={s.emptyBody}>주소록을 불러오는 중…</Text></View>
                ) : (
                  <View style={s.empty}><Text style={s.emptyBody}>연락처가 없어요.</Text></View>
                )
              }
              renderItem={({ item, index }) => {
                const dup = isDup(item);
                const on = !!sel[item.id];
                return (
                  // 구분선은 행 '위'에 — 마지막 행 뒤에 선이 남지 않는다
                  <Pressable
                    style={[s.importRow, index > 0 && s.importRowDivided, dup && { opacity: 0.4 }]}
                    disabled={dup}
                    onPress={() => setSel(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                  >
                    <View style={[s.importCheck, on && s.importCheckOn]}>
                      {on && <Ionicons name="checkmark" size={14} color={COLORS.textInverse} />}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                      <Text style={s.meta} numberOfLines={1}>{item.phone ?? '전화번호 없음'}{dup ? ' · 이미 등록됨' : ''}</Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          </>
        )}
      </View>
    </Modal>
  );
}

// ── 등록·편집 모달 (contact=null이면 신규) ──
function EditModal({ visible, contact, onClose, onSaved }: {
  visible: boolean; contact: MpContact | null; onClose: () => void; onSaved: () => void;
}) {
  const { COLORS } = useTheme();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [birthday, setBirthday] = useState('');
  const [metAt, setMetAt] = useState('');
  const [metContext, setMetContext] = useState('');
  const [tags, setTags] = useState('');
  const [closeness, setCloseness] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ uri: string; base64: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const s = useMemo(() => makeStyles(COLORS), [COLORS]);

  const isEdit = !!contact;

  // 모달이 열릴 때마다 대상 연락처 값으로 초기화 (신규면 빈 값)
  useEffect(() => {
    if (!visible) return;
    setName(contact?.name ?? '');
    setPhone(contact?.phone ?? '');
    setEmail(contact?.email ?? '');
    setTitle(contact?.title ?? '');
    setCompany(contact?.company ?? '');
    setAddress(contact?.address ?? '');
    setBirthday(contact?.birthday ?? '');
    setMetAt(contact?.met_at ?? '');
    setMetContext(contact?.met_context ?? '');
    setTags((contact?.tags ?? []).join(', '));
    setCloseness(contact?.closeness ?? null);
    setMemo(contact?.memo ?? '');
    setPhotoPath(contact?.photo_path ?? null);
    setPicked(null);
    // 대상 id 기준으로만 초기화한다 — 목록 새로고침으로 객체 identity가 바뀔 때
    // 입력 중이던 값이 되돌아가는 사고를 막는다.
  }, [visible, contact?.id]);

  const pickPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.7,
        base64: true, // 업로드용 — supabase RN 공식 경로가 ArrayBuffer 바디
      });
      if (res.canceled) return;
      const a = res.assets[0];
      if (!a?.base64) return;
      setPicked({ uri: a.uri, base64: a.base64 });
    } catch (e: any) {
      Alert.alert('사진 선택 실패', String(e?.message ?? e));
    }
  };

  const save = async () => {
    if (busy) return;
    if (!name.trim()) return Alert.alert('입력 확인', '이름을 입력해 주세요.');

    const bd = parseDateInput(birthday);
    if (!bd.ok) return Alert.alert('입력 확인', '생일은 YYYY-MM-DD 형식으로 적어 주세요. (예: 1975-03-15)');
    const md = parseDateInput(metAt);
    if (!md.ok) return Alert.alert('입력 확인', '알게 된 시기는 YYYY-MM-DD 형식으로 적어 주세요. (예: 2024-03-01)');

    setBusy(true);

    // 사진 먼저 업로드 — 실패하면 저장하지 않는다(사진 없는 반쪽 저장 방지)
    let nextPhotoPath = photoPath;
    if (picked) {
      if (!user) { setBusy(false); return Alert.alert('저장 실패', '로그인이 필요해요.'); }
      try {
        nextPhotoPath = await uploadPostImage(user.id, picked.base64, 0);
      } catch (e: any) {
        setBusy(false);
        return Alert.alert('사진 업로드 실패', String(e?.message ?? e));
      }
    }

    // 전화가 바뀌면 phone_hash도 다시 계산해야 후원 매칭이 유지된다
    const trimmedPhone = phone.trim();
    let phoneHash: string | null = contact?.phone_hash ?? null;
    if (!isEdit || trimmedPhone !== (contact?.phone ?? '')) {
      phoneHash = null;
      if (trimmedPhone) {
        try { phoneHash = await phoneToHash(trimmedPhone); } catch { phoneHash = null; }
      }
    }

    const payload = {
      name: name.trim(),
      phone: trimmedPhone || null,
      phone_hash: phoneHash,
      email: email.trim() || null,
      title: title.trim() || null,
      company: company.trim() || null,
      address: address.trim() || null,
      birthday: bd.value,
      met_at: md.value,
      met_context: metContext.trim() || null,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      closeness,
      memo: memo.trim() || null,
      photo_path: nextPhotoPath,
    };

    const { error } = isEdit
      ? await supabase.from('mp_contacts').update(payload).eq('id', contact!.id)
      : await supabase.from('mp_contacts').insert(payload);
    setBusy(false);
    if (error) return Alert.alert('저장 실패', error.message);
    onSaved();
  };

  const previewPhoto = picked ? picked.uri : (photoPath ? mediaUrl(photoPath) : null);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.modalHead}>
          <Pressable onPress={onClose}><Text style={s.modalCancel}>취소</Text></Pressable>
          <Text style={s.modalTitle}>{isEdit ? '연락처 편집' : '연락처 등록'}</Text>
          <Pressable onPress={save} disabled={busy}>
            <Text style={[s.modalSave, { color: busy ? COLORS.textTertiary : COLORS.primary }]}>
              {busy ? '저장 중…' : '저장'}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: LAYOUT.screenX, paddingTop: 4, paddingBottom: 64, gap: 10 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* 사진 */}
          <View style={{ alignItems: 'center', marginBottom: 4 }}>
            {/* key로 강제 리마운트 — InitialAvatar의 onError 상태는 photo가 바뀌어도 초기화되지 않아서,
                한 번 로드에 실패하면 새로 고른 사진도 이니셜로만 보인다 */}
            <InitialAvatar key={previewPhoto ?? 'none'} photo={previewPhoto} name={name || '?'} size={88} />
            <View style={s.photoBtnRow}>
              <Pressable onPress={pickPhoto} hitSlop={8}>
                <Text style={s.linkBtn}>{previewPhoto ? '사진 변경' : '사진 추가'}</Text>
              </Pressable>
              {previewPhoto ? (
                <Pressable onPress={() => { setPicked(null); setPhotoPath(null); }} hitSlop={8}>
                  <Text style={[s.linkBtn, { color: COLORS.error }]}>사진 제거</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <TextInput style={s.input} placeholder="이름 (필수)" placeholderTextColor={COLORS.textTertiary} value={name} onChangeText={setName} />
          <TextInput style={s.input} placeholder="전화번호 — 후원자 매칭에 사용돼요" placeholderTextColor={COLORS.textTertiary} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <TextInput style={s.input} placeholder="이메일" placeholderTextColor={COLORS.textTertiary} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={setEmail} />
          <TextInput style={s.input} placeholder="직함 — 회장, 지회장 등" placeholderTextColor={COLORS.textTertiary} value={title} onChangeText={setTitle} />
          <TextInput style={s.input} placeholder="직장 — 소속 회사·기관" placeholderTextColor={COLORS.textTertiary} value={company} onChangeText={setCompany} />
          <TextInput style={s.input} placeholder="거주지 — 동 단위" placeholderTextColor={COLORS.textTertiary} value={address} onChangeText={setAddress} />
          <TextInput style={s.input} placeholder="생일 — YYYY-MM-DD (예: 1975-03-15)" placeholderTextColor={COLORS.textTertiary} autoCapitalize="none" autoCorrect={false} value={birthday} onChangeText={setBirthday} />
          <TextInput style={s.input} placeholder="알게 된 시기 — YYYY-MM-DD (예: 2024-03-01)" placeholderTextColor={COLORS.textTertiary} autoCapitalize="none" autoCorrect={false} value={metAt} onChangeText={setMetAt} />
          <TextInput
            style={[s.input, s.inputMultiline]}
            placeholder="알게 된 경위 — 어디서, 누구 소개로 만났는지"
            placeholderTextColor={COLORS.textTertiary}
            multiline value={metContext} onChangeText={setMetContext}
          />
          <TextInput style={s.input} placeholder="태그 — 콤마로 구분: 체육회, 상인회" placeholderTextColor={COLORS.textTertiary} value={tags} onChangeText={setTags} autoCapitalize="none" />

          <View style={{ gap: 6 }}>
            <Text style={s.secLabel}>친밀도</Text>
            <View style={s.chipWrap}>
              {CLOSENESS_OPTS.map(o => {
                const on = closeness === o.v;
                return (
                  <Pressable
                    key={o.v}
                    onPress={() => setCloseness(on ? null : o.v)}
                    style={[s.closeChip, on && s.closeChipOn]}
                  >
                    <Text style={[s.closeChipText, on && { color: COLORS.textInverse }]}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <TextInput
            style={[s.input, s.inputMultiline]}
            placeholder="메모" placeholderTextColor={COLORS.textTertiary} multiline value={memo} onChangeText={setMemo}
          />

          <PressableScale style={s.primaryBtn} scaleTo={0.97} onPress={save} disabled={busy}>
            <Text style={s.primaryBtnText}>{busy ? '저장 중…' : (isEdit ? '변경사항 저장' : '연락처 등록')}</Text>
          </PressableScale>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── 스타일 — 폴리 실측 문법 ──
const makeStyles = (C: ThemeColors) => StyleSheet.create({
  // 검색 인풋 (리스트 상단)
  search: {
    backgroundColor: C.surface,
    borderRadius: 12,
    paddingHorizontal: LAYOUT.rowPadX,
    paddingVertical: 10,
    fontSize: 15,
    color: C.text,
    marginHorizontal: LAYOUT.screenX,
    marginBottom: 8,
    letterSpacing: -0.2,
    ...SHADOWS.subtle,
  },

  // 요약 스트립 (검색바 아래)
  statWrap: {
    flexDirection: 'row',
    marginHorizontal: LAYOUT.screenX,
    marginBottom: 8,
    backgroundColor: C.surface,
    borderRadius: LAYOUT.cardRadius,
    paddingVertical: 12,
    ...SHADOWS.subtle,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: C.divider, marginVertical: 2 },
  statNum: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  statLabel: { fontSize: 11, color: C.textTertiary, letterSpacing: -0.2 },

  // 그룹 리스트 — 한 장의 카드처럼 보이도록 행마다 같은 surface, 첫/마지막만 라운드.
  // 여기서는 FlatList가 스크롤러라 행을 한 View로 감쌀 수 없다(가상화 유지). 그래서 행 단위 래퍼인데,
  // 행마다 그림자를 주면 아래 행의 위쪽 그림자가 구분선 위에 겹쳐 hairline이 뭉개진다(255→241 그라데이션).
  // 흰 카드와 회색 캔버스의 명도 차만으로 카드로 읽히므로 그림자는 빼고 구분선을 선명하게 둔다.
  groupWrap: {
    marginHorizontal: LAYOUT.screenX,
    backgroundColor: C.surface,
  },
  groupWrapFirst: { borderTopLeftRadius: LAYOUT.cardRadius, borderTopRightRadius: LAYOUT.cardRadius },
  groupWrapLast: { borderBottomLeftRadius: LAYOUT.cardRadius, borderBottomRightRadius: LAYOUT.cardRadius },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.rowGap,
    paddingHorizontal: LAYOUT.rowPadX,
    paddingVertical: LAYOUT.rowPadY,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.divider,
    marginLeft: LAYOUT.rowDividerInset,
  },
  rowMain: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowSub: { fontSize: 12, color: C.textTertiary, letterSpacing: -0.2, marginTop: 2 },

  // 상세 모달 카드
  card: {
    backgroundColor: C.surface,
    marginHorizontal: LAYOUT.screenX,
    marginBottom: LAYOUT.cardGap,
    paddingHorizontal: LAYOUT.cardPadX,
    paddingVertical: LAYOUT.cardPadY,
    borderRadius: LAYOUT.cardRadius,
    ...SHADOWS.subtle,
  },
  name: { fontSize: 15.5, fontWeight: '700', color: C.text, letterSpacing: -0.3, flexShrink: 1 },
  body: { fontSize: 13, lineHeight: 18.5, color: C.textSecondary, letterSpacing: -0.2 },
  meta: { fontSize: 12, color: C.textTertiary, letterSpacing: -0.2 },
  metaSmall: { fontSize: 11.5, color: C.textTertiary, letterSpacing: -0.2, marginTop: 2 },
  donorBadge: {
    backgroundColor: C.primaryLight,
    color: C.primary,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    overflow: 'hidden',
    flexShrink: 0,
  },
  star: { fontSize: 18 },

  // 상세 히어로 — 사진 + 이름 + 퀵액션
  hero: { alignItems: 'center', paddingHorizontal: LAYOUT.screenX, paddingTop: 6, paddingBottom: 18 },
  heroName: { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginTop: 12, textAlign: 'center' },
  heroSub: { fontSize: 13, color: C.textTertiary, letterSpacing: -0.2, marginTop: 4, textAlign: 'center' },
  heroPill: {
    marginTop: 8,
    backgroundColor: C.primaryLight,
    color: C.primary,
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  quickRow: { flexDirection: 'row', gap: 16, marginTop: 16 },
  quickItem: { alignItems: 'center' },
  quickBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.subtle,
  },
  quickLabel: { fontSize: 11, color: C.textTertiary, letterSpacing: -0.2, marginTop: 5 },

  // 상세 정보 행
  secLabel: { fontSize: 12, fontWeight: '700', color: C.textTertiary, letterSpacing: -0.2 },
  hair: { height: StyleSheet.hairlineWidth, backgroundColor: C.divider },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  infoLabel: { fontSize: 13, fontWeight: '600', color: C.textSecondary, letterSpacing: -0.2 },
  infoValue: { flex: 1, fontSize: 13, color: C.text, letterSpacing: -0.2, textAlign: 'right' },
  infoValueWrap: { flex: 1, alignItems: 'flex-end' },
  infoValueText: { fontSize: 13, color: C.text, letterSpacing: -0.2 },
  infoValuePlaceholder: { fontSize: 13, color: C.textPlaceholder, letterSpacing: -0.2 },
  valueLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  blockRow: { paddingVertical: 9, gap: 5 },

  // 친밀도 게이지
  gaugeWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gaugeTrack: { width: 60, height: 4, borderRadius: 2, backgroundColor: C.grey200, overflow: 'hidden' },
  gaugeFill: { height: 4, borderRadius: 2 },
  gaugeLabel: { fontSize: 11.5, color: C.textTertiary, letterSpacing: -0.2 },

  ddayBadge: {
    backgroundColor: C.warningLight,
    color: C.warning,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    overflow: 'hidden',
  },

  // 이력 요약 스트립
  histStrip: { flexDirection: 'row', paddingTop: 10, paddingBottom: 12 },
  histCell: { flex: 1, alignItems: 'center', gap: 2 },
  histDivider: { width: StyleSheet.hairlineWidth, backgroundColor: C.divider, marginVertical: 2 },
  histNum: { fontSize: 17, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  histLabel: { fontSize: 11, color: C.textTertiary, letterSpacing: -0.2 },

  // 주소록 가져오기
  importNote: { fontSize: 13, lineHeight: 18.5, color: C.textSecondary, letterSpacing: -0.2 },
  bulkRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 14, marginTop: 8 },
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.rowGap,
    paddingVertical: LAYOUT.rowPadY,
  },
  importRowDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.divider,
  },
  importCheck: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.grey300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importCheckOn: { backgroundColor: C.primary, borderColor: C.primary },

  // 빈 상태 (ImportModal 전용 — 리스트 빈 상태는 PolyUI EmptyState)
  empty: { alignItems: 'center', paddingTop: 96, gap: 6 },
  emptyTitle: { fontSize: 15.5, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  emptyBody: { fontSize: 13, lineHeight: 18.5, color: C.textSecondary, textAlign: 'center', letterSpacing: -0.2 },

  // 모달 공통
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.screenX,
    paddingVertical: 12,
  },
  modalCancel: { fontSize: 15, color: C.textSecondary, letterSpacing: -0.2 },
  modalTitle: { flexShrink: 1, fontSize: 15.5, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  modalSave: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  linkBtn: { fontSize: 13, fontWeight: '600', color: C.primary, letterSpacing: -0.2 },
  delText: { fontSize: 13, fontWeight: '600', color: C.error, letterSpacing: -0.2, textAlign: 'center' },

  // 모달 폼 입력
  input: {
    backgroundColor: C.grey50,
    borderRadius: 12,
    paddingHorizontal: LAYOUT.rowPadX,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
    letterSpacing: -0.2,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  photoBtnRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  closeChip: {
    backgroundColor: C.grey100,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  closeChipOn: { backgroundColor: C.primary },
  closeChipText: { fontSize: 13, fontWeight: '600', color: C.textSecondary, letterSpacing: -0.2 },

  // 상세 — 소속 단체·태그·타임라인
  tagChip: {
    backgroundColor: C.grey100,
    color: C.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
    letterSpacing: -0.2,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    overflow: 'hidden',
  },
  orgRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 2 },
  orgName: { flex: 1, fontSize: 13, lineHeight: 18.5, color: C.textSecondary, letterSpacing: -0.2 },
  // 역할은 Yoga 기본값(flexShrink 0)이라 길면 단체명을 0폭까지 밀어낸다 — 45%로 상한을 둔다
  orgRole: { flexShrink: 1, maxWidth: '45%', fontSize: 12, color: C.textTertiary, letterSpacing: -0.2 },
  tlRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 9 },
  tlKind: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 1,
  },
  tlTitle: { fontSize: 13.5, lineHeight: 18.5, fontWeight: '600', color: C.text, letterSpacing: -0.2 },

  // 모달 주요 버튼
  primaryBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 15.5, fontWeight: '700', color: C.textInverse, letterSpacing: -0.3 },
});

// 연락처 — 조직관리용 연락처 탭. 검색·즐겨찾기·후원 매칭 뱃지 + 상세(타임라인·메모) + 등록.
// 화면 문법은 폴리 본체(ComplaintScreen) 실측값 — Header + GlassIconButton + PolyUI + PressableScale.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Modal, TextInput,
  Alert, RefreshControl, KeyboardAvoidingView, Platform, Linking, ScrollView,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import GlassIconButton from '../components/GlassIconButton';
import PressableScale from '../components/PressableScale';
import InitialAvatar from '../components/InitialAvatar';
import { EmptyState } from '../components/PolyUI';
import { supabase } from '../lib/supabase';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';
import { SHADOWS } from '../theme/colors';
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

export default function ContactsScreen() {
  const { COLORS } = useTheme();
  const [contacts, setContacts] = useState<MpContact[]>([]);
  const [orgsByContact, setOrgsByContact] = useState<Record<string, OrgLink[]>>({});
  const [donorByHash, setDonorByHash] = useState<Record<string, DonorSummary>>({});
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [compose, setCompose] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<MpContact | null>(null);

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

      {/* 요약 스트립 — 연락처가 0건이면 렌더하지 않는다 */}
      {stats.total > 0 && (
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
      )}

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textCaption} />}
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
        renderItem={({ item }) => {
          const orgs = orgsByContact[item.id] ?? [];
          const donor = item.phone_hash ? donorByHash[item.phone_hash] : undefined;
          // 한 줄 요약 — 직함 · 소속단체 첫 개 · 태그 첫 개
          const summary = [
            item.title,
            orgs[0]?.name,
            item.tags[0] ? `#${item.tags[0]}` : null,
          ].filter(Boolean).join(' · ');
          return (
            <PressableScale style={s.card} scaleTo={0.98} onPress={() => setSelected(item)}>
              <View style={s.rowTop}>
                <InitialAvatar name={item.name} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{item.name}</Text>
                  {summary ? (
                    <Text style={s.metaLine} numberOfLines={1}>{summary}</Text>
                  ) : null}
                  {donor && (
                    <View style={{ flexDirection: 'row', marginTop: 6 }}>
                      <Text style={s.donorBadge}>
                        후원 {donor.cnt}회 · 누적 {fmtWon(donor.total)}
                      </Text>
                    </View>
                  )}
                </View>
                <Pressable hitSlop={10} onPress={() => toggleFavorite(item)}>
                  <Text style={[s.star, { color: item.favorite ? COLORS.primary : COLORS.grey300 }]}>
                    {item.favorite ? '★' : '☆'}
                  </Text>
                </Pressable>
              </View>
            </PressableScale>
          );
        }}
      />

      <ComposeModal
        visible={compose}
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
        onClose={() => setSelected(null)}
        onChanged={load}
      />
    </View>
  );
}

// ── 상세 모달 ──
function DetailModal({ contact, orgs, donor, onClose, onChanged }: {
  contact: MpContact | null;
  orgs: OrgLink[];
  donor: DonorSummary | undefined;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { COLORS } = useTheme();
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [memo, setMemo] = useState('');
  const [memoBusy, setMemoBusy] = useState(false);
  const s = useMemo(() => makeStyles(COLORS), [COLORS]);

  useEffect(() => {
    if (!contact) return;
    setMemo(contact.memo ?? '');
    setTimeline([]);
    (async () => {
      const [cs, ms] = await Promise.all([
        supabase.from('mp_cases').select('*').eq('contact_id', contact.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('mp_meetings').select('*').eq('contact_id', contact.id).order('met_at', { ascending: false }).limit(5),
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
    })();
  }, [contact]);

  const saveMemo = async () => {
    if (!contact || memoBusy) return;
    setMemoBusy(true);
    const { error } = await supabase.from('mp_contacts').update({ memo: memo.trim() || null }).eq('id', contact.id);
    setMemoBusy(false);
    if (error) return Alert.alert('저장 실패', error.message);
    onChanged();
  };

  if (!contact) return null;
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={s.modalHead}>
          <Pressable onPress={onClose}><Text style={s.modalCancel}>닫기</Text></Pressable>
          <Text style={s.modalTitle}>{contact.name}</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ paddingTop: 4, paddingBottom: 48 }}>
          {/* 기본 정보 */}
          <View style={s.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.name}>{contact.name}</Text>
              {contact.title ? <Text style={s.meta}>{contact.title}</Text> : null}
            </View>
            {contact.phone ? (
              <PressableScale
                style={s.callBtn}
                scaleTo={0.97}
                onPress={() => Linking.openURL(`tel:${contact.phone!.replace(/\D/g, '')}`).catch(() => {
                  Alert.alert('전화 실패', '이 기기에서 전화를 걸 수 없어요.');
                })}
              >
                <Ionicons name="call-outline" size={15} color={COLORS.primary} />
                <Text style={s.callText}>{contact.phone} 전화 걸기</Text>
              </PressableScale>
            ) : (
              <Text style={[s.meta, { marginTop: 8 }]}>전화번호가 없어요</Text>
            )}
            {contact.tags.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 12 }}>
                {contact.tags.map(t => (
                  <Text key={t} style={s.tagChip}>#{t}</Text>
                ))}
              </View>
            )}
            {donor && (
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <Text style={s.donorBadge}>
                  후원 {donor.cnt}회 · 누적 {fmtWon(donor.total)}{donor.last_at ? ` · 최근 ${fmtDate(donor.last_at)}` : ''}
                </Text>
              </View>
            )}
          </View>

          {/* 소속 단체 */}
          <View style={s.card}>
            <Text style={s.sectionTitle}>소속 단체</Text>
            {orgs.length === 0 ? (
              <Text style={s.meta}>연결된 단체가 없어요.</Text>
            ) : (
              orgs.map(o => (
                <View key={o.org_id} style={s.orgRow}>
                  <Text style={s.orgName}>{o.name}</Text>
                  {o.role ? <Text style={s.meta}>{o.role}</Text> : null}
                </View>
              ))
            )}
          </View>

          {/* 타임라인 — 민원·미팅 최근 5건씩 */}
          <View style={s.card}>
            <Text style={s.sectionTitle}>최근 이력</Text>
            {timeline.length === 0 ? (
              <Text style={s.meta}>아직 민원·미팅 기록이 없어요.</Text>
            ) : (
              timeline.map(t => (
                <View key={t.key} style={s.tlRow}>
                  <Text style={[s.tlKind, { color: t.kind === 'case' ? COLORS.primary : COLORS.textSecondary }]}>
                    {t.kind === 'case' ? '민원' : '미팅'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.tlTitle} numberOfLines={1}>{t.title}</Text>
                    <Text style={s.meta}>{fmtDate(t.at)}{t.sub ? ` · ${t.sub}` : ''}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* 메모 */}
          <View style={s.card}>
            <Text style={s.sectionTitle}>메모</Text>
            <TextInput
              style={[s.input, s.inputMultiline]}
              placeholder="이 연락처에 대한 메모를 남겨 보세요"
              placeholderTextColor={COLORS.textTertiary}
              multiline value={memo} onChangeText={setMemo}
            />
            <PressableScale style={s.saveBtn} scaleTo={0.97} onPress={saveMemo} disabled={memoBusy}>
              <Text style={s.saveBtnText}>메모 저장</Text>
            </PressableScale>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── 주소록 가져오기 모달 ──
// 원칙: 기기 주소록은 화면에만 보여주고, 서버에는 사용자가 체크한 연락처만 저장한다.
// 전체 일괄 업로드 금지 — 제3자 개인정보 리스크 (전체선택 버튼도 두지 않는다).
type DeviceContact = { id: string; name: string; phone: string | null };

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
  const isDup = (d: DeviceContact) =>
    d.phone ? existingPhones.has(d.phone.replace(/\D/g, '')) : existingNames.has(d.name);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return device;
    const qd = qq.replace(/\D/g, '');
    return device.filter(d =>
      d.name.toLowerCase().includes(qq) ||
      (qd && (d.phone ?? '').replace(/\D/g, '').includes(qd)));
  }, [device, q]);

  const selCount = Object.values(sel).filter(Boolean).length;

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
    const { error } = await supabase.from('mp_contacts').insert(rows);
    setBusy(false);
    if (error) return Alert.alert('가져오기 실패', error.message);
    onSaved();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={s.modalHead}>
          <Pressable onPress={onClose}><Text style={s.modalCancel}>취소</Text></Pressable>
          <Text style={s.modalTitle}>주소록 가져오기</Text>
          <Pressable onPress={doImport} disabled={busy || selCount === 0}>
            <Text style={[s.modalSave, { color: selCount > 0 ? COLORS.primary : COLORS.textTertiary }]}>
              {selCount > 0 ? `${selCount}명 추가` : '추가'}
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
            <View style={{ paddingHorizontal: 16 }}>
              <Text style={s.importNote}>
                체크한 연락처만 서버에 저장돼요. 전체 주소록은 업로드하지 않아요.
              </Text>
              <TextInput
                style={[s.input, { marginTop: 10 }]}
                placeholder="이름·전화 검색"
                placeholderTextColor={COLORS.textTertiary}
                value={q} onChangeText={setQ} autoCorrect={false}
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={d => d.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 48 }}
              ListEmptyComponent={
                perm === 'loading' ? (
                  <View style={s.empty}><Text style={s.emptyBody}>주소록을 불러오는 중…</Text></View>
                ) : (
                  <View style={s.empty}><Text style={s.emptyBody}>연락처가 없어요.</Text></View>
                )
              }
              renderItem={({ item }) => {
                const dup = isDup(item);
                const on = !!sel[item.id];
                return (
                  <Pressable
                    style={[s.importRow, dup && { opacity: 0.4 }]}
                    disabled={dup}
                    onPress={() => setSel(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                  >
                    <View style={[s.importCheck, on && s.importCheckOn]}>
                      {on && <Ionicons name="checkmark" size={14} color={COLORS.textInverse} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.name}>{item.name}</Text>
                      <Text style={s.meta}>{item.phone ?? '전화번호 없음'}{dup ? ' · 이미 등록됨' : ''}</Text>
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

// ── 등록 모달 ──
function ComposeModal({ visible, onClose, onSaved }: {
  visible: boolean; onClose: () => void; onSaved: () => void;
}) {
  const { COLORS } = useTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);
  const s = useMemo(() => makeStyles(COLORS), [COLORS]);

  const reset = () => { setName(''); setPhone(''); setTitle(''); setTags(''); setMemo(''); };

  const save = async () => {
    if (busy) return;
    if (!name.trim()) return Alert.alert('입력 확인', '이름을 입력해 주세요.');
    setBusy(true);
    const trimmedPhone = phone.trim();
    let phoneHash: string | null = null;
    if (trimmedPhone) {
      try { phoneHash = await phoneToHash(trimmedPhone); } catch { phoneHash = null; }
    }
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    const { error } = await supabase.from('mp_contacts').insert({
      name: name.trim(),
      phone: trimmedPhone || null,
      phone_hash: phoneHash,
      title: title.trim() || null,
      tags: tagList,
      memo: memo.trim() || null,
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
          <Text style={s.modalTitle}>연락처 등록</Text>
          <Pressable onPress={save} disabled={busy}><Text style={[s.modalSave, { color: COLORS.primary }]}>저장</Text></Pressable>
        </View>
        <View style={{ padding: 16, gap: 12 }}>
          <TextInput style={s.input} placeholder="이름 (필수)" placeholderTextColor={COLORS.textTertiary} value={name} onChangeText={setName} />
          <TextInput style={s.input} placeholder="전화번호 (선택) — 후원자 매칭에 사용돼요" placeholderTextColor={COLORS.textTertiary} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <TextInput style={s.input} placeholder="직함 (선택) — 회장, 지회장 등" placeholderTextColor={COLORS.textTertiary} value={title} onChangeText={setTitle} />
          <TextInput style={s.input} placeholder="태그 (선택) — 콤마로 구분: 체육회, 상인회" placeholderTextColor={COLORS.textTertiary} value={tags} onChangeText={setTags} autoCapitalize="none" />
          <TextInput
            style={[s.input, s.inputMultiline]}
            placeholder="메모 (선택)" placeholderTextColor={COLORS.textTertiary} multiline value={memo} onChangeText={setMemo}
          />
        </View>
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
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: C.text,
    marginHorizontal: 16,
    marginBottom: 10,
    letterSpacing: -0.2,
    ...SHADOWS.subtle,
  },

  // 요약 스트립 (검색바 아래)
  statWrap: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: C.surface,
    borderRadius: 18,
    paddingVertical: 14,
    ...SHADOWS.subtle,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: C.divider, marginVertical: 2 },
  statNum: { fontSize: 19, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  statLabel: { fontSize: 11.5, color: C.textTertiary, letterSpacing: -0.2 },

  // 리스트 카드
  card: {
    backgroundColor: C.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 12,
    borderRadius: 18,
    ...SHADOWS.subtle,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  meta: { fontSize: 12, color: C.textTertiary, letterSpacing: -0.1 },
  metaLine: { fontSize: 12, color: C.textTertiary, letterSpacing: -0.1, marginTop: 3 },
  donorBadge: {
    backgroundColor: C.primaryLight,
    color: C.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  star: { fontSize: 20 },

  // 주소록 가져오기
  importNote: { fontSize: 12, color: C.textCaption, lineHeight: 17, letterSpacing: -0.1 },
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
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
  empty: { alignItems: 'center', paddingTop: 96, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: C.textSecondary, letterSpacing: -0.2 },
  emptyBody: { fontSize: 13, color: C.textCaption, textAlign: 'center', lineHeight: 19, letterSpacing: -0.2 },

  // 모달 공통
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  modalCancel: { fontSize: 15, color: C.textSecondary, letterSpacing: -0.2 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  modalSave: { fontSize: 15.5, fontWeight: '700', letterSpacing: -0.2 },

  // 모달 폼 입력
  input: {
    backgroundColor: C.grey50,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: C.text,
    letterSpacing: -0.2,
  },
  inputMultiline: { minHeight: 110, textAlignVertical: 'top' },

  // 상세 모달
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.text, letterSpacing: -0.2, marginBottom: 8 },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 12, paddingVertical: 4 },
  callText: { fontSize: 14, fontWeight: '600', color: C.primary, letterSpacing: -0.2 },
  tagChip: {
    backgroundColor: C.grey100,
    color: C.textSecondary,
    fontSize: 11,
    letterSpacing: -0.1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  orgRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  orgName: { fontSize: 13, color: C.textBody, letterSpacing: -0.2 },
  tlRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4 },
  tlKind: {
    backgroundColor: C.grey100,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 1,
  },
  tlTitle: { fontSize: 13, fontWeight: '600', color: C.textBody, letterSpacing: -0.2, lineHeight: 19 },

  // 모달 주요 버튼
  saveBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: { fontSize: 15.5, fontWeight: '700', color: C.textInverse, letterSpacing: -0.2 },
});

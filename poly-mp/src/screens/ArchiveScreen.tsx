// 아카이빙 — 활동 피드(게시물) + 정치일정. 페이스북 업로드/피드 문법으로 정제.
// 폴리 화면 문법: Header(GlassIconButton) + UnderlineTabs + 폴리 카드 + EmptyState. 자유 창작 금지.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Modal, TextInput, ScrollView,
  Alert, Share, RefreshControl, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useMember } from '../contexts/MemberContext';
import { uploadPostImage, mediaUrl } from '../lib/media';
import { timeAgo } from '../lib/time';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';
import { SHADOWS } from '../theme/colors';
import Header from '../components/Header';
import GlassIconButton from '../components/GlassIconButton';
import PressableScale from '../components/PressableScale';
import InitialAvatar from '../components/InitialAvatar';
import { UnderlineTabs, EmptyState } from '../components/PolyUI';
import type { MpPost, MpSchedule, PostCategory } from '../types/db';

const CATEGORIES: { key: PostCategory; label: string }[] = [
  { key: 'assembly', label: '의정' },
  { key: 'district', label: '지역구' },
  { key: 'event', label: '행사' },
  { key: 'press', label: '보도' },
  { key: 'activity', label: '활동' },
];
const catLabel = (k: string) => CATEGORIES.find(c => c.key === k)?.label ?? '활동';

const SEG_TABS = ['활동 기록', '정치일정'] as const;

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// 2장씩 끊기 — 페북식 2열 그리드 렌더용
const chunk2 = <T,>(arr: T[]): T[][] => {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) rows.push(arr.slice(i, i + 2));
  return rows;
};

export default function ArchiveScreen() {
  const { COLORS } = useTheme();
  const navigation = useNavigation<any>();
  const { member } = useMember();
  const [seg, setSeg] = useState<'feed' | 'schedule'>('feed');
  const [posts, setPosts] = useState<MpPost[]>([]);
  const [schedules, setSchedules] = useState<MpSchedule[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [compose, setCompose] = useState(false);

  const myName = member?.name ?? '나';

  const load = useCallback(async () => {
    const [p, sch] = await Promise.all([
      supabase.from('mp_posts').select('*').order('event_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(100),
      supabase.from('mp_schedules').select('*').gte('starts_at', new Date(Date.now() - 86400000 * 30).toISOString()).order('starts_at').limit(100),
    ]);
    if (p.data) setPosts(p.data as MpPost[]);
    if (sch.data) setSchedules(sch.data as MpSchedule[]);
  }, []);
  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const confirmDelete = (id: string) => {
    Alert.alert('게시물을 삭제할까요?', '삭제하면 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('mp_posts').delete().eq('id', id);
          if (error) return Alert.alert('삭제 실패', error.message);
          load();
        },
      },
    ]);
  };

  const s = useMemo(() => makeStyles(COLORS), [COLORS]);

  // ── 피드 상단 컴포저 카드 (페북 '무슨 생각을 하고 계신가요?' 문법) ──
  const FeedComposer = (
    <View style={[s.card, s.composerCard]}>
      <InitialAvatar name={myName} size={40} />
      <Pressable style={s.composerPill} onPress={() => setCompose(true)}>
        <Text style={s.composerPillText}>오늘의 활동을 기록해 보세요</Text>
      </Pressable>
      <Pressable style={s.composerPhotoBtn} hitSlop={8} onPress={() => setCompose(true)}>
        <Ionicons name="images-outline" size={22} color={COLORS.primary} />
      </Pressable>
    </View>
  );

  // ── 일정 탭 상단 소형 등록 카드 ──
  const ScheduleComposer = (
    <PressableScale style={[s.card, s.schedAddCard]} scaleTo={0.98} onPress={() => setCompose(true)}>
      <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
      <Text style={s.schedAddText}>일정 등록하기</Text>
    </PressableScale>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header
        title="아카이빙"
        rightElement={
          <GlassIconButton
            icon="settings-outline"
            onPress={() => navigation.navigate('Settings')}
            size={44}
            iconSize={20}
            iconColor={COLORS.grey700}
            fallbackVariant="plain"
          />
        }
      />

      <UnderlineTabs
        tabs={SEG_TABS}
        active={seg === 'feed' ? SEG_TABS[0] : SEG_TABS[1]}
        onChange={t => setSeg(t === SEG_TABS[0] ? 'feed' : 'schedule')}
      />

      {seg === 'feed' ? (
        <FlatList
          data={posts}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textCaption} />}
          ListHeaderComponent={FeedComposer}
          ListEmptyComponent={
            <EmptyState
              icon="images-outline"
              title="첫 활동을 기록해 보세요"
              sub={'행사·의정활동·지역구 방문을 올리면\n시간순으로 정리되고 SNS에도 공유할 수 있어요'}
              ctaLabel="첫 활동 기록하기"
              onCta={() => setCompose(true)}
            />
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              {/* 상단 — 아바타 + 이름·뱃지 / 시각·장소 (페북 게시물 헤더) */}
              <View style={s.postHead}>
                <InitialAvatar name={myName} size={36} />
                <View style={{ flex: 1 }}>
                  <View style={s.postNameRow}>
                    <Text style={s.postName} numberOfLines={1}>{myName}</Text>
                    <View style={s.catBadge}>
                      <Text style={s.catBadgeText}>{catLabel(item.category)}</Text>
                    </View>
                  </View>
                  <Text style={s.postMeta} numberOfLines={1}>
                    {timeAgo(item.event_at ?? item.created_at)}{item.place ? ` · ${item.place}` : ''}
                  </Text>
                </View>
              </View>

              <Text style={s.body}>{item.body}</Text>

              {/* 사진 — 1장 풀와이드 / 2장 2열 / 3~4장 2x2 그리드 */}
              {item.media?.length === 1 && (
                <Image source={{ uri: mediaUrl(item.media[0].path) }} style={s.mediaSingle} resizeMode="cover" />
              )}
              {item.media?.length > 1 && (
                <View style={s.mediaGridWrap}>
                  {chunk2(item.media.slice(0, 4)).map((row, ri) => (
                    <View key={ri} style={s.mediaGridRow}>
                      {row.map(m => (
                        <Image key={m.path} source={{ uri: mediaUrl(m.path) }} style={s.mediaCell} resizeMode="cover" />
                      ))}
                      {row.length === 1 && <View style={{ flex: 1 }} />}
                    </View>
                  ))}
                </View>
              )}

              {/* 하단 액션 행 — 공유 / 삭제 */}
              <View style={s.actionRow}>
                <PressableScale style={s.actionBtn} scaleTo={0.96} onPress={() => Share.share({ message: item.body })}>
                  <Ionicons name="share-social-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={s.actionText}>공유</Text>
                </PressableScale>
                <Pressable style={s.deleteBtn} hitSlop={8} onPress={() => confirmDelete(item.id)}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.textTertiary} />
                </Pressable>
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textCaption} />}
          ListHeaderComponent={ScheduleComposer}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="등록된 일정이 없어요"
              ctaLabel="일정 등록하기"
              onCta={() => setCompose(true)}
            />
          }
          renderItem={({ item }) => (
            <View style={[s.card, s.schedCard]}>
              <View style={s.dateBox}>
                <Text style={s.dateDay}>{new Date(item.starts_at).getDate()}</Text>
                <Text style={s.dateMon}>{new Date(item.starts_at).getMonth() + 1}월</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.schedTitle}>{item.title}</Text>
                <Text style={s.meta}>{fmtDate(item.starts_at)}{item.place ? ` · ${item.place}` : ''}</Text>
              </View>
            </View>
          )}
        />
      )}

      <ComposeModal visible={compose} seg={seg} onClose={() => setCompose(false)} onSaved={() => { setCompose(false); load(); }} />
    </View>
  );
}

// ── 작성 모달 (페북 컴포저 문법 — 게시물 / 일정 겸용) ──
type PickedPhoto = { uri: string; base64: string; w?: number; h?: number };
const MAX_PHOTOS = 4;

function ComposeModal({ visible, seg, onClose, onSaved }: {
  visible: boolean; seg: 'feed' | 'schedule'; onClose: () => void; onSaved: () => void;
}) {
  const { COLORS } = useTheme();
  const { user } = useAuth();
  const { member } = useMember();
  const [body, setBody] = useState('');
  const [place, setPlace] = useState('');
  const [category, setCategory] = useState<PostCategory>('activity');
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');   // YYYY-MM-DD HH:mm (P0 수기 — P1에서 피커)
  const [busy, setBusy] = useState(false);
  const [shareAfter, setShareAfter] = useState(true);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const s = useMemo(() => makeStyles(COLORS), [COLORS]);

  const myName = member?.name ?? '나';

  const reset = () => { setBody(''); setPlace(''); setTitle(''); setWhen(''); setCategory('activity'); setPhotos([]); };

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
    setBusy(true);
    if (seg === 'feed') {
      if (!body.trim()) { setBusy(false); return Alert.alert('입력 확인', '내용을 입력해 주세요.'); }
      // 사진 업로드 먼저 — 실패하면 게시물도 만들지 않는다(사진 없는 반쪽 게시 방지)
      let media: { path: string; w?: number; h?: number }[] = [];
      if (photos.length > 0) {
        if (!user) { setBusy(false); return Alert.alert('저장 실패', '로그인이 필요해요.'); }
        try {
          media = await Promise.all(
            photos.map((p, i) => uploadPostImage(user.id, p.base64, i).then(path => ({ path, w: p.w, h: p.h }))),
          );
        } catch (e: any) {
          setBusy(false);
          return Alert.alert('사진 업로드 실패', String(e?.message ?? e));
        }
      }
      const { error } = await supabase.from('mp_posts').insert({
        body: body.trim(), category, place: place.trim() || null, event_at: new Date().toISOString(), media,
      });
      setBusy(false);
      if (error) return Alert.alert('저장 실패', error.message);
      if (shareAfter) { try { await Share.share({ message: body.trim() }); } catch {} }
    } else {
      if (!title.trim()) { setBusy(false); return Alert.alert('입력 확인', '일정 제목을 입력해 주세요.'); }
      const starts = when.trim() ? new Date(when.replace(' ', 'T')) : new Date();
      if (isNaN(+starts)) { setBusy(false); return Alert.alert('입력 확인', '일시는 2026-08-15 14:00 형식으로 적어주세요.'); }
      const { error } = await supabase.from('mp_schedules').insert({
        title: title.trim(), starts_at: starts.toISOString(), place: place.trim() || null, kind: 'etc',
      });
      setBusy(false);
      if (error) return Alert.alert('저장 실패', error.message);
    }
    reset(); onSaved();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* 모달 헤더 — 취소 / 타이틀 / 올리기 pill */}
        <View style={s.modalHead}>
          <Pressable onPress={() => { reset(); onClose(); }}><Text style={s.modalCancel}>취소</Text></Pressable>
          <Text style={s.modalTitle}>{seg === 'feed' ? '새 활동' : '일정 등록'}</Text>
          <Pressable onPress={save} disabled={busy} style={[s.postPill, busy && { opacity: 0.6 }]}>
            <Text style={s.postPillText}>{seg === 'feed' ? '올리기' : '등록'}</Text>
          </Pressable>
        </View>

        {seg === 'feed' ? (
          <>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              {/* 프로필 행 — 아바타 + 이름 + 카테고리 미니 칩 */}
              <View style={s.compProfile}>
                <InitialAvatar name={myName} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={s.compName} numberOfLines={1}>{myName}</Text>
                  <View style={s.miniChipRow}>
                    {CATEGORIES.map(c => (
                      <Pressable key={c.key}
                        style={[s.miniChip, category === c.key && s.miniChipActive]}
                        onPress={() => setCategory(c.key)}>
                        <Text style={[s.miniChipText, category === c.key && s.miniChipTextActive]}>{c.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>

              {/* 본문 — 테두리 없는 플랫 입력 (페북 컴포저) */}
              <TextInput
                style={s.compBody}
                placeholder="오늘의 활동을 기록하세요…"
                placeholderTextColor={COLORS.textTertiary}
                multiline value={body} onChangeText={setBody}
              />

              {/* 사진 그리드 — 썸네일 88 + X 오버레이 + 추가 타일 */}
              <View style={s.thumbWrap}>
                {photos.map((p, i) => (
                  <View key={`${p.uri}-${i}`}>
                    <Image source={{ uri: p.uri }} style={s.thumb} />
                    <Pressable style={s.thumbX} hitSlop={6} onPress={() => setPhotos(ps => ps.filter((_, j) => j !== i))}>
                      <Text style={s.thumbXText}>×</Text>
                    </Pressable>
                  </View>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <Pressable style={s.thumbAdd} onPress={pickPhotos}>
                    <Ionicons name="image-outline" size={20} color={COLORS.textCaption} />
                    <Text style={s.thumbAddText}>사진</Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>

            {/* 하단 고정 옵션 바 — 장소 인라인 + SNS 공유 토글 */}
            <View style={s.optionBar}>
              <View style={s.placeRow}>
                <Ionicons name="location-outline" size={18} color={COLORS.textCaption} />
                <TextInput
                  style={s.placeInput}
                  placeholder="장소 추가 (선택)"
                  placeholderTextColor={COLORS.textTertiary}
                  value={place} onChangeText={setPlace}
                />
              </View>
              <Pressable style={s.toggleRow} onPress={() => setShareAfter(v => !v)}>
                <View style={[s.checkbox, shareAfter && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                  {shareAfter && <Text style={{ color: COLORS.textInverse, fontSize: 12, fontWeight: '800' }}>✓</Text>}
                </View>
                <Text style={s.toggleText}>저장 후 SNS 공유창 열기 (인스타 자동 업로드는 프로 요금제에서 순차 제공)</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={{ padding: 16, gap: 12 }}>
            <TextInput style={s.input} placeholder="일정 제목" placeholderTextColor={COLORS.textTertiary} value={title} onChangeText={setTitle} />
            <TextInput style={s.input} placeholder="일시 — 2026-08-15 14:00 (비우면 지금)" placeholderTextColor={COLORS.textTertiary} value={when} onChangeText={setWhen} />
            <TextInput style={s.input} placeholder="장소 (선택)" placeholderTextColor={COLORS.textTertiary} value={place} onChangeText={setPlace} />
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (COLORS: ThemeColors) => StyleSheet.create({
  // ── 리스트 카드 (폴리 실측) ──
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

  // ── 피드 상단 컴포저 카드 ──
  composerCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 15 },
  composerPill: { flex: 1, backgroundColor: COLORS.grey50, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  composerPillText: { fontSize: 14, color: COLORS.textTertiary, letterSpacing: -0.2 },
  composerPhotoBtn: { padding: 4 },

  // ── 피드 카드 (페북 게시물 문법) ──
  postHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 11 },
  postNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postName: { fontSize: 14.5, fontWeight: '700', color: COLORS.text, letterSpacing: -0.2, flexShrink: 1 },
  postMeta: { fontSize: 11.5, color: COLORS.textTertiary, letterSpacing: -0.1, marginTop: 2 },
  catBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catBadgeText: { fontSize: 10.5, fontWeight: '700', color: COLORS.primary, letterSpacing: -0.1 },
  body: { fontSize: 15, color: COLORS.text, lineHeight: 22, letterSpacing: -0.2 },
  mediaSingle: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, marginTop: 11, backgroundColor: COLORS.backgroundSecondary },
  mediaGridWrap: { gap: 4, marginTop: 11 },
  mediaGridRow: { flexDirection: 'row', gap: 4 },
  mediaCell: { flex: 1, aspectRatio: 1, borderRadius: 8, backgroundColor: COLORS.backgroundSecondary },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.divider,
    marginTop: 12, paddingTop: 10,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 },
  actionText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: -0.2 },
  deleteBtn: { padding: 2 },
  meta: { fontSize: 11, color: COLORS.textTertiary, letterSpacing: -0.1, flexShrink: 1 },

  // ── 일정 카드 — dateBox 날짜 강조 ──
  schedCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateBox: { width: 44, alignItems: 'center' },
  dateDay: { fontSize: 20, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.3 },
  dateMon: { fontSize: 11, color: COLORS.textTertiary, letterSpacing: -0.1, marginTop: 1 },
  schedTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, letterSpacing: -0.2, marginBottom: 3 },
  schedAddCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingBottom: 15 },
  schedAddText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: -0.2 },

  // ── 작성 모달 (페북 컴포저) ──
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  modalCancel: { fontSize: 16, color: COLORS.textCaption, letterSpacing: -0.2 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  postPill: { backgroundColor: COLORS.primary, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  postPillText: { fontSize: 13.5, fontWeight: '700', color: COLORS.textInverse, letterSpacing: -0.2 },
  compProfile: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  compName: { fontSize: 15, fontWeight: '700', color: COLORS.text, letterSpacing: -0.2, marginTop: 1 },
  miniChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  miniChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, backgroundColor: COLORS.surface, ...SHADOWS.subtle },
  miniChipActive: { backgroundColor: COLORS.text },
  miniChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: -0.2 },
  miniChipTextActive: { color: COLORS.textInverse, fontWeight: '700' },
  compBody: {
    fontSize: 17, lineHeight: 25, color: COLORS.text, letterSpacing: -0.2,
    minHeight: 140, textAlignVertical: 'top', marginTop: 14, padding: 0,
  },
  thumbWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  thumb: { width: 88, height: 88, borderRadius: 10, backgroundColor: COLORS.backgroundSecondary },
  thumbX: {
    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.overlayStrong, alignItems: 'center', justifyContent: 'center',
  },
  thumbXText: { color: COLORS.textInverse, fontSize: 13, fontWeight: '700', marginTop: -1 },
  thumbAdd: {
    width: 88, height: 88, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  thumbAddText: { fontSize: 11, color: COLORS.textCaption, letterSpacing: -0.1 },
  optionBar: {
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.divider,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, gap: 8,
  },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  placeInput: { flex: 1, fontSize: 14, color: COLORS.text, letterSpacing: -0.2, paddingVertical: 6 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: 12, color: COLORS.textCaption, flex: 1, lineHeight: 17, letterSpacing: -0.1 },

  // ── 일정 모달 입력 (기존 유지) ──
  input: {
    backgroundColor: COLORS.grey50,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.text,
    letterSpacing: -0.2,
  },
});

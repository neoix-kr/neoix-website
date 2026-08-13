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
import { LAYOUT } from '../theme/layout';
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
      <InitialAvatar name={myName} size={36} />
      <Pressable style={s.composerPill} onPress={() => setCompose(true)}>
        {/* 좁은 기기(SE)에서 두 줄로 접히면 컴포저 행 높이가 무너진다 — 한 줄 고정 */}
        <Text style={s.composerPillText} numberOfLines={1}>오늘의 활동을 기록해 보세요</Text>
      </Pressable>
      <Pressable style={s.composerPhotoBtn} hitSlop={8} onPress={() => setCompose(true)}>
        <Ionicons name="images-outline" size={20} color={COLORS.primary} />
      </Pressable>
    </View>
  );

  // ── 일정 탭 상단 소형 등록 카드 ──
  const ScheduleComposer = (
    <PressableScale style={[s.card, s.schedAddCard]} scaleTo={0.98} onPress={() => setCompose(true)}>
      <Ionicons name="calendar-outline" size={17} color={COLORS.textSecondary} />
      <Text style={s.schedAddText} numberOfLines={1}>일정 등록하기</Text>
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
          contentContainerStyle={{ paddingTop: LAYOUT.cardGap, paddingBottom: 120 }}
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
                <InitialAvatar name={myName} size={34} />
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
                  <Ionicons name="share-social-outline" size={15} color={COLORS.textSecondary} />
                  <Text style={s.actionText}>공유</Text>
                </PressableScale>
                <Pressable style={s.deleteBtn} hitSlop={8} onPress={() => confirmDelete(item.id)}>
                  <Ionicons name="trash-outline" size={15} color={COLORS.textTertiary} />
                </Pressable>
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingTop: LAYOUT.cardGap, paddingBottom: 120 }}
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
                <Text style={s.schedTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={s.meta} numberOfLines={1}>{fmtDate(item.starts_at)}{item.place ? ` · ${item.place}` : ''}</Text>
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
      {/* 컴포저는 흰 시트다 — 회색 캔버스를 그대로 쓰면 빈 화면이 미완성처럼 보인다 */}
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            {/* 본문 영역이 남은 공간을 전부 차지한다 — 빈 여백이 생기지 않고 어디를 눌러도 입력에 포커스 */}
            <View style={s.compArea}>
              <View style={s.compProfile}>
                <InitialAvatar name={myName} size={LAYOUT.rowAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={s.compName} numberOfLines={1}>{myName}</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={s.miniChipRow}
                  >
                    {CATEGORIES.map(c => (
                      <Pressable key={c.key}
                        style={[s.miniChip, category === c.key && s.miniChipActive]}
                        onPress={() => setCategory(c.key)}>
                        <Text style={[s.miniChipText, category === c.key && s.miniChipTextActive]}>{c.label}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* 열자마자 키보드가 올라와 하단 공백을 채운다(페북 컴포저와 동일) */}
              <TextInput
                style={s.compBody}
                placeholder="오늘의 활동을 기록하세요…"
                placeholderTextColor={COLORS.textTertiary}
                multiline
                autoFocus={visible}
                value={body}
                onChangeText={setBody}
              />
            </View>

            {/* 선택한 사진 — 본문 아래 가로 스트립 (없으면 아예 렌더하지 않는다) */}
            {photos.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.photoStrip}
                contentContainerStyle={s.photoStripInner}
              >
                {photos.map((p, i) => (
                  <View key={`${p.uri}-${i}`}>
                    <Image source={{ uri: p.uri }} style={s.thumb} />
                    <Pressable style={s.thumbX} hitSlop={6} onPress={() => setPhotos(ps => ps.filter((_, j) => j !== i))}>
                      <Text style={s.thumbXText}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* 하단 액션 바 — 장소 한 줄 + [사진 추가]·SNS 공유 토글 */}
            <View style={s.optionBar}>
              <View style={s.placeRow}>
                <Ionicons name="location-outline" size={16} color={COLORS.textTertiary} />
                <TextInput
                  style={s.placeInput}
                  placeholder="장소 추가 (선택)"
                  placeholderTextColor={COLORS.textTertiary}
                  value={place} onChangeText={setPlace}
                />
              </View>
              <View style={s.actionRowBar}>
                <Pressable
                  style={[s.photoBtn, photos.length >= MAX_PHOTOS && { opacity: 0.4 }]}
                  disabled={photos.length >= MAX_PHOTOS}
                  onPress={pickPhotos}
                >
                  <Ionicons name="images-outline" size={17} color={COLORS.primary} />
                  <Text style={s.photoBtnText}>
                    사진{photos.length > 0 ? ` ${photos.length}/${MAX_PHOTOS}` : ''}
                  </Text>
                </Pressable>
                <Pressable style={s.toggleRow} onPress={() => setShareAfter(v => !v)}>
                  <View style={[s.checkbox, shareAfter && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                    {shareAfter && <Ionicons name="checkmark" size={13} color={COLORS.textInverse} />}
                  </View>
                  <Text style={s.toggleText}>올린 뒤 SNS 공유</Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : (
          <View style={{ padding: LAYOUT.screenX, gap: LAYOUT.cardGap }}>
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
  // ── 리스트 카드 — LAYOUT 토큰 고정 (화면 공통 리듬) ──
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: LAYOUT.screenX,
    marginBottom: LAYOUT.cardGap,
    paddingHorizontal: LAYOUT.cardPadX,
    paddingVertical: LAYOUT.cardPadY,
    borderRadius: LAYOUT.cardRadius,
    ...SHADOWS.subtle,
  },

  // ── 피드 상단 컴포저 카드 ──
  // padding 12 — card 토큰(14/12)보다 좁게. paddingHorizontal/Vertical로 써야 card를 확실히 덮는다.
  composerCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12 },
  composerPill: { flex: 1, backgroundColor: COLORS.grey50, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  composerPillText: { fontSize: 13.5, color: COLORS.textTertiary, letterSpacing: -0.2 },
  composerPhotoBtn: { padding: 4 },

  // ── 피드 카드 (페북 게시물 문법) ──
  // gap 10 — 컴포저(12+36+10=58)와 게시물(14+34+10=58) 텍스트 시작선을 맞춘다
  postHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  postName: { fontSize: 14.5, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3, flexShrink: 1 },
  postMeta: { fontSize: 11.5, color: COLORS.textTertiary, letterSpacing: -0.2, marginTop: 1.5 },
  catBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 },
  catBadgeText: { fontSize: 10.5, fontWeight: '700', color: COLORS.primary, letterSpacing: -0.2 },
  body: { fontSize: 14.5, color: COLORS.text, lineHeight: 21, letterSpacing: -0.2, marginTop: 8 },
  mediaSingle: { width: '100%', aspectRatio: 4 / 3, borderRadius: 10, marginTop: 10, backgroundColor: COLORS.backgroundSecondary },
  mediaGridWrap: { gap: 3, marginTop: 10 },
  mediaGridRow: { flexDirection: 'row', gap: 3 },
  mediaCell: { flex: 1, aspectRatio: 1, borderRadius: 8, backgroundColor: COLORS.backgroundSecondary },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.divider,
    marginTop: 10, paddingTop: 9,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 1 },
  actionText: { fontSize: 12.5, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: -0.2 },
  deleteBtn: { padding: 2 },
  meta: { fontSize: 12, color: COLORS.textTertiary, letterSpacing: -0.2, flexShrink: 1 },

  // ── 일정 카드 — dateBox 날짜 강조 ──
  schedCard: { flexDirection: 'row', alignItems: 'center', gap: LAYOUT.rowGap },
  // 날짜 박스가 아바타 슬롯을 대신한다 — rowAvatar+rowGap로 본문 시작선이 rowDividerInset(66)과 일치
  dateBox: { width: LAYOUT.rowAvatar, alignItems: 'center' },
  dateDay: { fontSize: 19, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.4 },
  dateMon: { fontSize: 11, color: COLORS.textTertiary, letterSpacing: -0.2, marginTop: 1 },
  schedTitle: { fontSize: 15.5, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3, marginBottom: 2 },
  schedAddCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  schedAddText: { fontSize: 13.5, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: -0.2 },

  // ── 작성 모달 (페북 컴포저) ──
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: LAYOUT.screenX, paddingVertical: LAYOUT.cardPadY },
  modalCancel: { fontSize: 15.5, color: COLORS.textCaption, letterSpacing: -0.2 },
  modalTitle: { fontSize: 15.5, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  postPill: { backgroundColor: COLORS.primary, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 7 },
  postPillText: { fontSize: 13.5, fontWeight: '700', color: COLORS.textInverse, letterSpacing: -0.2 },
  compProfile: { flexDirection: 'row', alignItems: 'flex-start', gap: LAYOUT.rowGap },
  compName: { fontSize: 15.5, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3, marginTop: 1 },
  // 카테고리 칩 — 선택 상태를 피드 카드의 카테고리 뱃지와 같은 색으로 두어
  // "올리면 이런 뱃지가 붙는다"가 바로 읽히게 한다(검은 pill은 흰 시트에서 과하다).
  miniChipRow: { flexDirection: 'row', gap: 6, marginTop: 6, paddingRight: LAYOUT.screenX },
  miniChip: {
    paddingHorizontal: 10, paddingVertical: 4.5, borderRadius: 14,
    backgroundColor: COLORS.grey100,
  },
  miniChipActive: { backgroundColor: COLORS.primaryLight },
  miniChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: -0.2 },
  miniChipTextActive: { color: COLORS.primary, fontWeight: '700' },
  // 본문 영역 — 남은 공간을 전부 차지해 빈 여백이 남지 않게 한다
  compArea: { flex: 1, paddingHorizontal: LAYOUT.screenX, paddingTop: LAYOUT.cardPadY },
  compBody: {
    flex: 1,
    fontSize: 16.5, lineHeight: 24, color: COLORS.text, letterSpacing: -0.2,
    textAlignVertical: 'top', marginTop: 12, padding: 0,
  },
  photoStrip: { flexGrow: 0, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.divider },
  photoStripInner: { paddingHorizontal: LAYOUT.screenX, paddingVertical: 10, gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: COLORS.backgroundSecondary },
  thumbX: {
    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.overlayStrong, alignItems: 'center', justifyContent: 'center',
  },
  thumbXText: { color: COLORS.textInverse, fontSize: 13, fontWeight: '700', marginTop: -1 },
  optionBar: {
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.divider,
    paddingHorizontal: LAYOUT.screenX, paddingTop: 10, paddingBottom: 12, gap: 6,
  },
  placeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.divider,
    paddingBottom: 8,
  },
  placeInput: { flex: 1, fontSize: 13.5, color: COLORS.text, letterSpacing: -0.2, paddingVertical: 4 },
  actionRowBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
  photoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: COLORS.primaryLight,
  },
  photoBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary, letterSpacing: -0.2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.borderStrong, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: 12.5, color: COLORS.textSecondary, letterSpacing: -0.2 },

  // ── 일정 모달 입력 ──
  input: {
    // 흰 시트 위에서는 grey50만으로 입력칸이 안 보인다 — 테두리로 경계를 준다
    backgroundColor: COLORS.grey50,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.cardRadius,
    paddingHorizontal: LAYOUT.rowPadX,
    paddingVertical: 12,
    fontSize: 14.5,
    color: COLORS.text,
    letterSpacing: -0.2,
  },
});

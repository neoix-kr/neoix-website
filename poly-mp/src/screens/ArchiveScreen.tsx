// 아카이빙 — 활동 피드(게시물) + 정치일정. 작성 시 SNS 공유시트(P0 반자동) 연동.
// 폴리 화면 문법: Header(GlassIconButton) + UnderlineTabs + 폴리 카드 + EmptyState. 자유 창작 금지.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Modal, TextInput,
  Alert, Share, RefreshControl, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { uploadPostImage, mediaUrl } from '../lib/media';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';
import { SHADOWS } from '../theme/colors';
import Header from '../components/Header';
import GlassIconButton from '../components/GlassIconButton';
import PressableScale from '../components/PressableScale';
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

export default function ArchiveScreen() {
  const { COLORS } = useTheme();
  const navigation = useNavigation<any>();
  const [seg, setSeg] = useState<'feed' | 'schedule'>('feed');
  const [posts, setPosts] = useState<MpPost[]>([]);
  const [schedules, setSchedules] = useState<MpSchedule[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [compose, setCompose] = useState(false);

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

  const s = useMemo(() => makeStyles(COLORS), [COLORS]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header
        title="아카이빙"
        rightElement={
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <GlassIconButton
              icon="create-outline"
              onPress={() => setCompose(true)}
              size={44}
              iconSize={20}
              fallbackVariant="surface"
            />
            <GlassIconButton
              icon="settings-outline"
              onPress={() => navigation.navigate('Settings')}
              size={44}
              iconSize={20}
              iconColor={COLORS.grey700}
              fallbackVariant="plain"
            />
          </View>
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
              <View style={s.cardTop}>
                <View style={s.catBadge}>
                  <Text style={s.catBadgeText}>{catLabel(item.category)}</Text>
                </View>
                <Text style={s.meta} numberOfLines={1}>
                  {fmtDate(item.event_at ?? item.created_at)}{item.place ? ` · ${item.place}` : ''}
                </Text>
              </View>
              <Text style={s.body}>{item.body}</Text>
              {item.media?.length > 0 && (
                <View style={s.mediaWrap}>
                  {item.media.map(m => (
                    <Image
                      key={m.path}
                      source={{ uri: mediaUrl(m.path) }}
                      style={item.media.length === 1 ? s.mediaSingle : s.mediaGrid}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              )}
              <PressableScale style={s.shareBtn} scaleTo={0.97} onPress={() => Share.share({ message: item.body })}>
                <Ionicons name="share-social-outline" size={14} color={COLORS.textSecondary} />
                <Text style={s.shareText}>SNS로 공유</Text>
              </PressableScale>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textCaption} />}
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

// ── 작성 모달 (게시물 / 일정 겸용) ──
type PickedPhoto = { uri: string; base64: string; w?: number; h?: number };
const MAX_PHOTOS = 4;

function ComposeModal({ visible, seg, onClose, onSaved }: {
  visible: boolean; seg: 'feed' | 'schedule'; onClose: () => void; onSaved: () => void;
}) {
  const { COLORS } = useTheme();
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [place, setPlace] = useState('');
  const [category, setCategory] = useState<PostCategory>('activity');
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');   // YYYY-MM-DD HH:mm (P0 수기 — P1에서 피커)
  const [busy, setBusy] = useState(false);
  const [shareAfter, setShareAfter] = useState(true);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const s = useMemo(() => makeStyles(COLORS), [COLORS]);

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
        <View style={s.modalHead}>
          <Pressable onPress={() => { reset(); onClose(); }}><Text style={s.modalCancel}>취소</Text></Pressable>
          <Text style={s.modalTitle}>{seg === 'feed' ? '활동 기록' : '일정 등록'}</Text>
          <Pressable onPress={save} disabled={busy}><Text style={s.modalSave}>저장</Text></Pressable>
        </View>
        <View style={{ padding: 16, gap: 12 }}>
          {seg === 'feed' ? (
            <>
              {/* 카테고리 — 검정 활성 pill (CategoryChips 문법) */}
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {CATEGORIES.map(c => (
                  <Pressable key={c.key}
                    style={[s.chipBtn, category === c.key && s.chipBtnActive]}
                    onPress={() => setCategory(c.key)}>
                    <Text style={[s.chipBtnText, category === c.key && s.chipBtnTextActive]}>{c.label}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={[s.input, s.inputMulti]}
                placeholder="오늘의 활동을 기록하세요 — 이 내용이 그대로 SNS 공유 문구가 돼요"
                placeholderTextColor={COLORS.textTertiary} multiline value={body} onChangeText={setBody}
              />
              <TextInput style={s.input} placeholder="장소 (선택)" placeholderTextColor={COLORS.textTertiary} value={place} onChangeText={setPlace} />
              {/* 사진 첨부 — 최대 4장, 탭하면 제거 */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {photos.map((p, i) => (
                  <Pressable key={`${p.uri}-${i}`} onPress={() => setPhotos(ps => ps.filter((_, j) => j !== i))}>
                    <Image source={{ uri: p.uri }} style={s.thumb} />
                    <View style={s.thumbX}><Text style={s.thumbXText}>×</Text></View>
                  </Pressable>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <Pressable style={s.thumbAdd} onPress={pickPhotos}>
                    <Ionicons name="image-outline" size={20} color={COLORS.textCaption} />
                    <Text style={s.thumbAddText}>사진</Text>
                  </Pressable>
                )}
              </View>
              <Pressable style={s.toggleRow} onPress={() => setShareAfter(v => !v)}>
                <View style={[s.checkbox, shareAfter && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                  {shareAfter && <Text style={{ color: COLORS.textInverse, fontSize: 12, fontWeight: '800' }}>✓</Text>}
                </View>
                <Text style={s.toggleText}>저장 후 SNS 공유창 열기 (인스타 자동 업로드는 프로 요금제에서 순차 제공)</Text>
              </Pressable>
            </>
          ) : (
            <>
              <TextInput style={s.input} placeholder="일정 제목" placeholderTextColor={COLORS.textTertiary} value={title} onChangeText={setTitle} />
              <TextInput style={s.input} placeholder="일시 — 2026-08-15 14:00 (비우면 지금)" placeholderTextColor={COLORS.textTertiary} value={when} onChangeText={setWhen} />
              <TextInput style={s.input} placeholder="장소 (선택)" placeholderTextColor={COLORS.textTertiary} value={place} onChangeText={setPlace} />
            </>
          )}
        </View>
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
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9 },
  catBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.primary, letterSpacing: -0.1 },
  meta: { fontSize: 11, color: COLORS.textTertiary, letterSpacing: -0.1, flexShrink: 1 },
  body: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, letterSpacing: -0.2 },
  mediaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  mediaSingle: { width: '100%', aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: COLORS.backgroundSecondary },
  mediaGrid: { width: 96, height: 96, borderRadius: 12, backgroundColor: COLORS.backgroundSecondary },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 10, paddingVertical: 4 },
  shareText: { fontSize: 12.5, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: -0.2 },

  // ── 일정 카드 — dateBox 날짜 강조 ──
  schedCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateBox: { width: 44, alignItems: 'center' },
  dateDay: { fontSize: 20, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.3 },
  dateMon: { fontSize: 11, color: COLORS.textTertiary, letterSpacing: -0.1, marginTop: 1 },
  schedTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, letterSpacing: -0.2, marginBottom: 3 },

  // ── 작성 모달 (pageSheet — 헤더 구조 유지, 타이포만 폴리 자간) ──
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  modalCancel: { fontSize: 16, color: COLORS.textCaption, letterSpacing: -0.2 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  modalSave: { fontSize: 16, fontWeight: '700', color: COLORS.primary, letterSpacing: -0.2 },
  input: {
    backgroundColor: COLORS.grey50,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  inputMulti: { minHeight: 110, textAlignVertical: 'top' },
  chipBtn: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.surface, ...SHADOWS.subtle },
  chipBtnActive: { backgroundColor: COLORS.text },
  chipBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, letterSpacing: -0.2 },
  chipBtnTextActive: { color: COLORS.textInverse, fontWeight: '700' },
  thumb: { width: 72, height: 72, borderRadius: 12, backgroundColor: COLORS.backgroundSecondary },
  thumbX: {
    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.overlayStrong, alignItems: 'center', justifyContent: 'center',
  },
  thumbXText: { color: COLORS.textInverse, fontSize: 13, fontWeight: '700', marginTop: -1 },
  thumbAdd: {
    width: 72, height: 72, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  thumbAddText: { fontSize: 11, color: COLORS.textCaption, letterSpacing: -0.1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: 12, color: COLORS.textCaption, flex: 1, lineHeight: 17, letterSpacing: -0.1 },
});

// 아카이빙 — 활동 피드(게시물) + 정치일정. 작성 시 SNS 공유시트(P0 반자동) 연동.
// 이 화면이 P0 스타일 기준(exemplar)이다: 헤더/세그먼트/카드/FAB/모달 패턴을 다른 탭이 따른다.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Modal, TextInput,
  Alert, Share, RefreshControl, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { uploadPostImage, mediaUrl } from '../lib/media';
import { useTheme } from '../theme/ThemeContext';
import { TYPO, SPACING, RADIUS } from '../theme/colors';
import type { MpPost, MpSchedule, PostCategory } from '../types/db';

const CATEGORIES: { key: PostCategory; label: string }[] = [
  { key: 'assembly', label: '의정' },
  { key: 'district', label: '지역구' },
  { key: 'event', label: '행사' },
  { key: 'press', label: '보도' },
  { key: 'activity', label: '활동' },
];
const catLabel = (k: string) => CATEGORIES.find(c => c.key === k)?.label ?? '활동';

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function ArchiveScreen() {
  const { COLORS, SHADOWS } = useTheme();
  const insets = useSafeAreaInsets();
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

  const s = useMemo(() => styles(COLORS), [COLORS]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* 헤더 + 세그먼트 */}
      <View style={[s.header, { paddingTop: insets.top + SPACING.md }]}>
        <View style={s.headerRow}>
          <Text style={s.h1}>아카이빙</Text>
          <Pressable hitSlop={10} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={22} color={COLORS.textSecondary} />
          </Pressable>
        </View>
        <View style={s.seg}>
          {(['feed', 'schedule'] as const).map(k => (
            <Pressable key={k} style={[s.segBtn, seg === k && { backgroundColor: COLORS.surface }]} onPress={() => setSeg(k)}>
              <Text style={[s.segText, seg === k && { color: COLORS.primary, fontWeight: '700' }]}>
                {k === 'feed' ? '활동 기록' : '정치일정'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {seg === 'feed' ? (
        <FlatList
          data={posts}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: SPACING.base, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textCaption} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTitle}>첫 활동을 기록해 보세요</Text>
              <Text style={s.emptyBody}>행사·의정활동·지역구 방문을 올리면{'\n'}시간순으로 정리되고 SNS에도 공유할 수 있어요.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[s.card, SHADOWS.standard]}>
              <View style={s.cardTop}>
                <Text style={[s.chip, { backgroundColor: COLORS.primaryLight, color: COLORS.primary }]}>{catLabel(item.category)}</Text>
                <Text style={s.meta}>{fmtDate(item.event_at ?? item.created_at)}{item.place ? ` · ${item.place}` : ''}</Text>
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
              <Pressable
                style={s.shareBtn}
                onPress={() => Share.share({ message: item.body })}
              >
                <Text style={s.shareText}>SNS로 공유</Text>
              </Pressable>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: SPACING.base, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textCaption} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTitle}>등록된 일정이 없어요</Text>
              <Text style={s.emptyBody}>+ 버튼으로 의정·지역구 일정을 등록하세요.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[s.card, SHADOWS.standard, { flexDirection: 'row', alignItems: 'center', gap: SPACING.md }]}>
              <View style={s.dateBox}>
                <Text style={[s.dateDay, { color: COLORS.primary }]}>{new Date(item.starts_at).getDate()}</Text>
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

      {/* FAB */}
      <Pressable
        style={[s.fab, { bottom: insets.bottom + 88, backgroundColor: COLORS.primary }, SHADOWS.elevated]}
        onPress={() => setCompose(true)}
      >
        <Text style={s.fabText}>＋</Text>
      </Pressable>

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
  const s = styles(COLORS);

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
          <Pressable onPress={save} disabled={busy}><Text style={[s.modalSave, { color: COLORS.primary }]}>저장</Text></Pressable>
        </View>
        <View style={{ padding: SPACING.base, gap: SPACING.md }}>
          {seg === 'feed' ? (
            <>
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
                style={[s.input, { height: 140, textAlignVertical: 'top', paddingTop: SPACING.md }]}
                placeholder="오늘의 활동을 기록하세요 — 이 내용이 그대로 SNS 공유 문구가 돼요"
                placeholderTextColor={COLORS.textPlaceholder} multiline value={body} onChangeText={setBody}
              />
              <TextInput style={s.input} placeholder="장소 (선택)" placeholderTextColor={COLORS.textPlaceholder} value={place} onChangeText={setPlace} />
              {/* 사진 첨부 — 최대 4장, 탭하면 제거 */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
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
              <TextInput style={s.input} placeholder="일정 제목" placeholderTextColor={COLORS.textPlaceholder} value={title} onChangeText={setTitle} />
              <TextInput style={s.input} placeholder="일시 — 2026-08-15 14:00 (비우면 지금)" placeholderTextColor={COLORS.textPlaceholder} value={when} onChangeText={setWhen} />
              <TextInput style={s.input} placeholder="장소 (선택)" placeholderTextColor={COLORS.textPlaceholder} value={place} onChangeText={setPlace} />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = (C: any) => StyleSheet.create({
  header: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.md, backgroundColor: C.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { ...TYPO.displayLarge, color: C.text },
  seg: { flexDirection: 'row', backgroundColor: C.backgroundSecondary, borderRadius: RADIUS.standard, padding: 3, marginTop: SPACING.md },
  segBtn: { flex: 1, height: 36, borderRadius: RADIUS.compact + 1, alignItems: 'center', justifyContent: 'center' },
  segText: { ...TYPO.bodySmall, color: C.textCaption, fontWeight: '600' },
  card: { backgroundColor: C.surface, borderRadius: RADIUS.comfortable, padding: SPACING.base, marginBottom: SPACING.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  chip: { ...TYPO.caption, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  meta: { ...TYPO.caption, color: C.textCaption },
  body: { ...TYPO.body, color: C.textBody, lineHeight: 22 },
  mediaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md },
  mediaSingle: { width: '100%', aspectRatio: 4 / 3, borderRadius: RADIUS.standard, backgroundColor: C.backgroundSecondary },
  mediaGrid: { width: 96, height: 96, borderRadius: RADIUS.compact, backgroundColor: C.backgroundSecondary },
  thumb: { width: 72, height: 72, borderRadius: RADIUS.compact, backgroundColor: C.backgroundSecondary },
  thumbX: {
    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10,
    backgroundColor: C.overlayStrong, alignItems: 'center', justifyContent: 'center',
  },
  thumbXText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginTop: -1 },
  thumbAdd: {
    width: 72, height: 72, borderRadius: RADIUS.compact, borderWidth: 1, borderColor: C.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  thumbAddText: { ...TYPO.caption, color: C.textCaption },
  shareBtn: { alignSelf: 'flex-start', marginTop: SPACING.md, paddingHorizontal: SPACING.md, height: 32, borderRadius: RADIUS.compact, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  shareText: { ...TYPO.caption, color: C.textSecondary, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 96, gap: SPACING.sm },
  emptyTitle: { ...TYPO.subtitle, color: C.text },
  emptyBody: { ...TYPO.bodySmall, color: C.textCaption, textAlign: 'center', lineHeight: 20 },
  dateBox: { width: 48, alignItems: 'center' },
  dateDay: { ...TYPO.headingLarge },
  dateMon: { ...TYPO.caption, color: C.textCaption },
  schedTitle: { ...TYPO.subtitle, color: C.text },
  fab: { position: 'absolute', right: SPACING.lg, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  fabText: { color: C.textInverse, fontSize: 28, marginTop: -2 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.base },
  modalCancel: { ...TYPO.bodyLarge, color: C.textCaption },
  modalTitle: { ...TYPO.subtitle, color: C.text },
  modalSave: { ...TYPO.subtitle },
  input: { minHeight: 48, borderRadius: RADIUS.standard, borderWidth: 1, borderColor: C.border, paddingHorizontal: SPACING.base, color: C.text, backgroundColor: C.surface, ...TYPO.bodyLarge },
  chipBtn: { paddingHorizontal: SPACING.md, height: 34, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  chipBtnText: { ...TYPO.bodySmall, color: C.textSecondary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  toggleText: { ...TYPO.caption, color: C.textCaption, flex: 1, lineHeight: 17 },
});

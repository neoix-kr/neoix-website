import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { FONT, RADIUS, SPACING, useTheme, Palette } from '../theme';
import { usePrayerStore } from '../store/PrayerStore';
import ScreenHeader from '../components/common/ScreenHeader';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { PrayerPeriod, Visibility } from '../types/db';

const PERIODS: { key: PrayerPeriod; label: string }[] = [
  { key: 'urgent', label: '긴급 · 오늘' },
  { key: 'week', label: '이번 주' },
  { key: 'period', label: '올해 · 이번 달' },
];

const VISIBILITIES: { key: Visibility; label: string; desc: string }[] = [
  { key: 'private', label: '나만 보기', desc: '나에게만 보여요' },
  { key: 'neighbors', label: '이웃', desc: '이웃을 맺은 사람들에게 공유돼요' },
  { key: 'clubs', label: '모임', desc: '선택한 모임에만 공유돼요' },
];

export default function PrayerComposeScreen() {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const nav = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'PrayerCompose'>>();
  const store = usePrayerStore();

  const editing = useMemo(
    () => (route.params?.editId ? store.prayers.find((p) => p.id === route.params!.editId) : undefined),
    [route.params?.editId, store.prayers]
  );

  const [title, setTitle] = useState(editing?.title ?? '');
  const [body, setBody] = useState(editing?.body ?? '');
  const [period, setPeriod] = useState<PrayerPeriod>(editing?.period ?? 'week');
  const [visibility, setVisibility] = useState<Visibility>(editing?.visibility ?? 'private');
  const [clubId, setClubId] = useState<string | null>(editing?.clubId ?? store.clubs[0]?.id ?? null);
  const [photoUri, setPhotoUri] = useState<string | null>(editing?.photoUri ?? null);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('권한 필요', '설정에서 사진 접근을 허용해 주세요.');
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  };

  const save = () => {
    if (!title.trim()) return Alert.alert('입력 확인', '기도제목을 입력해 주세요.');
    if (visibility === 'clubs' && !clubId) return Alert.alert('입력 확인', '공유할 모임을 선택해 주세요.');
    if (editing) {
      store.updatePrayer(editing.id, { title: title.trim(), body: body.trim() || null, period, visibility, clubId: visibility === 'clubs' ? clubId : null, photoUri });
    } else {
      store.addPrayer({ title: title.trim(), body: body.trim(), period, visibility, clubId: visibility === 'clubs' ? clubId : null, photoUri });
    }
    nav.goBack();
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        modal
        title={editing ? '기도제목 수정' : '새 기도제목'}
        right={
          <Pressable onPress={save} hitSlop={8}>
            <Text style={styles.save}>저장</Text>
          </Pressable>
        }
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TextInput
            style={styles.titleInput}
            placeholder="어떤 기도가 필요하세요?"
            placeholderTextColor={C.textPlaceholder}
            value={title}
            onChangeText={setTitle}
            multiline
            autoFocus={!editing}
          />
          <TextInput
            style={styles.bodyInput}
            placeholder="자세한 내용이나 마음을 적어도 좋아요 (선택)"
            placeholderTextColor={C.textPlaceholder}
            value={body}
            onChangeText={setBody}
            multiline
          />

          {/* 사진 */}
          {photoUri ? (
            <View style={styles.photoWrap}>
              <Image source={{ uri: photoUri }} style={styles.photo} />
              <Pressable onPress={() => setPhotoUri(null)} hitSlop={8} style={styles.photoRemove}>
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={pickPhoto} style={({ pressed }) => [styles.photoAdd, pressed && { opacity: 0.8 }]}>
              <Ionicons name="image-outline" size={17} color={C.textSecondary} />
              <Text style={styles.photoAddText}>사진 추가</Text>
            </Pressable>
          )}

          {/* 기간 */}
          <Text style={styles.label}>기간</Text>
          <View style={styles.chips}>
            {PERIODS.map((p) => (
              <Pressable
                key={p.key}
                onPress={() => setPeriod(p.key)}
                style={[styles.chip, period === p.key && styles.chipOn]}
              >
                <Text style={[styles.chipText, period === p.key && styles.chipTextOn]}>{p.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* 공유 대상 */}
          <Text style={styles.label}>공유 대상</Text>
          <View style={styles.visGroup}>
            {VISIBILITIES.map((v, idx) => (
              <Pressable
                key={v.key}
                onPress={() => setVisibility(v.key)}
                style={[styles.visRow, idx > 0 && styles.visDivider]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.visLabel}>{v.label}</Text>
                  <Text style={styles.visDesc}>{v.desc}</Text>
                </View>
                <View style={[styles.radio, visibility === v.key && styles.radioOn]}>
                  {visibility === v.key && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            ))}
          </View>

          {/* 클럽 선택 */}
          {visibility === 'clubs' && (
            <>
              <Text style={styles.label}>모임 선택</Text>
              <View style={styles.chips}>
                {store.clubs.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setClubId(c.id)}
                    style={[styles.chip, clubId === c.id && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, clubId === c.id && styles.chipTextOn]}>{c.name}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  save: { fontSize: 15, color: C.primary, fontFamily: FONT.semibold, paddingHorizontal: 6 },
  scroll: { paddingHorizontal: SPACING.xl, paddingBottom: 40 },

  titleInput: { fontSize: 20, color: C.text, fontFamily: FONT.semibold, lineHeight: 28, paddingTop: SPACING.md, minHeight: 60 },
  bodyInput: { fontSize: 15, color: C.textBody, fontFamily: FONT.regular, lineHeight: 23, minHeight: 70, marginTop: 4 },

  photoWrap: { marginTop: SPACING.md, alignSelf: 'flex-start' },
  photo: { width: 120, height: 120, borderRadius: RADIUS.md },
  photoRemove: { position: 'absolute', top: -7, right: -7, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  photoAdd: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 13, height: 38, borderRadius: RADIUS.pill, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, marginTop: SPACING.sm },
  photoAddText: { fontSize: 13.5, color: C.textSecondary, fontFamily: FONT.medium },

  label: { fontSize: 13, color: C.textCaption, fontFamily: FONT.semibold, marginTop: SPACING.xxl, marginBottom: SPACING.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, height: 38, borderRadius: RADIUS.pill, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: C.primaryLight, borderColor: C.primary },
  chipText: { fontSize: 14, color: C.textSecondary, fontFamily: FONT.medium },
  chipTextOn: { color: C.primary },

  visGroup: { backgroundColor: C.surface, borderRadius: RADIUS.lg, overflow: 'hidden' },
  visRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 14, gap: 10 },
  visDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider },
  visLabel: { fontSize: 15, color: C.text, fontFamily: FONT.medium },
  visDesc: { fontSize: 12.5, color: C.textCaption, fontFamily: FONT.regular, marginTop: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: C.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: C.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.primary },
});

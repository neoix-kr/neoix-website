import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, FONT, RADIUS, SPACING, Palette } from '../theme';
import { usePrayerStore } from '../store/PrayerStore';
import { useAuth } from '../contexts/AuthContext';
import ScreenHeader from '../components/common/ScreenHeader';

// 내 계정 — 프로필 사진 · 이름 · 좋아하는 말씀 한 구절
export default function ProfileEditScreen() {
  const nav = useNavigation();
  const store = usePrayerStore();
  const { profile } = useAuth();
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  const [name, setName] = useState(store.profileName ?? profile?.display_name ?? '');
  const [verse, setVerse] = useState(store.profileVerse ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(store.profilePhotoUri);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('권한 필요', '설정에서 사진 접근을 허용해 주세요.');
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  };

  const save = () => {
    if (!name.trim()) return Alert.alert('입력 확인', '이름을 입력해 주세요.');
    store.setProfile({ name: name.trim(), verse: verse.trim() || null, photoUri });
    nav.goBack();
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="내 계정"
        right={
          <Pressable onPress={save} hitSlop={8}>
            <Text style={styles.save}>저장</Text>
          </Pressable>
        }
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* 프로필 사진 */}
          <Pressable onPress={pickPhoto} style={styles.photoWrap}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoEmpty]}>
                <Text style={styles.photoInitial}>{(name || '기').charAt(0)}</Text>
              </View>
            )}
            <View style={styles.photoBadge}>
              <Ionicons name="camera" size={13} color="#fff" />
            </View>
          </Pressable>
          {photoUri && (
            <Pressable onPress={() => setPhotoUri(null)} hitSlop={8} style={{ alignSelf: 'center', marginTop: 8 }}>
              <Text style={styles.removePhoto}>사진 지우기</Text>
            </Pressable>
          )}

          {/* 이름 */}
          <Text style={styles.label}>이름</Text>
          <TextInput
            style={styles.input}
            placeholder="이름"
            placeholderTextColor={C.textPlaceholder}
            value={name}
            onChangeText={setName}
            maxLength={12}
          />

          {/* 좋아하는 말씀 */}
          <Text style={styles.label}>나의 말씀 한 구절</Text>
          <TextInput
            style={[styles.input, styles.verseInput]}
            placeholder='예) "여호와는 나의 목자시니" — 시편 23:1'
            placeholderTextColor={C.textPlaceholder}
            value={verse}
            onChangeText={setVerse}
            multiline
            maxLength={80}
          />
          <Text style={styles.hint}>프로필에 이름과 함께 표시돼요</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    save: { fontSize: 15, color: C.primary, fontFamily: FONT.semibold, paddingHorizontal: 6 },
    scroll: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.lg, paddingBottom: 60 },

    photoWrap: { alignSelf: 'center' },
    photo: { width: 96, height: 96, borderRadius: 48 },
    photoEmpty: { backgroundColor: C.avatarBg, alignItems: 'center', justifyContent: 'center' },
    photoInitial: { fontSize: 36, color: C.avatarText, fontFamily: FONT.semibold },
    photoBadge: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: C.background,
    },
    removePhoto: { fontSize: 13, color: C.textCaption, fontFamily: FONT.regular },

    label: { fontSize: 13, color: C.textCaption, fontFamily: FONT.semibold, marginTop: SPACING.xxl, marginBottom: SPACING.sm },
    input: {
      backgroundColor: C.surface,
      borderRadius: RADIUS.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.border,
      paddingHorizontal: 14,
      height: 50,
      fontSize: 15,
      color: C.text,
      fontFamily: FONT.regular,
    },
    verseInput: { height: 84, paddingTop: 14, textAlignVertical: 'top' },
    hint: { fontSize: 12.5, color: C.textPlaceholder, fontFamily: FONT.regular, marginTop: 8 },
  });

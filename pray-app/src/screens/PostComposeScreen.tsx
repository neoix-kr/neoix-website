import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, FONT, RADIUS, SPACING, Palette } from '../theme';
import { catMeta, catTint } from '../theme/categories';
import { usePrayerStore, POST_CATEGORIES } from '../store/PrayerStore';
import ScreenHeader from '../components/common/ScreenHeader';

export default function PostComposeScreen() {
  const nav = useNavigation();
  const store = usePrayerStore();
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<string>('기타');
  const [customCategory, setCustomCategory] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [showRegion, setShowRegion] = useState(false);

  const save = () => {
    if (!title.trim()) return Alert.alert('입력 확인', '제목을 입력해 주세요.');
    if (!body.trim()) return Alert.alert('입력 확인', '내용을 입력해 주세요.');
    const finalCategory = category === '기타' && customCategory.trim() ? customCategory.trim() : category;
    store.addPost({
      title: title.trim(),
      body: body.trim(),
      isAnonymous: anonymous,
      category: finalCategory,
      region: showRegion ? store.myRegion : null,
    });
    nav.goBack();
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        modal
        title="기도 부탁하기"
        right={
          <Pressable onPress={save} hitSlop={8}>
            <Text style={styles.save}>올리기</Text>
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
            autoFocus
          />
          <TextInput
            style={styles.bodyInput}
            placeholder="상황과 마음을 나눠 주세요. 함께 기도하는 분들에게 전해져요."
            placeholderTextColor={C.textPlaceholder}
            value={body}
            onChangeText={setBody}
            multiline
          />

          {/* 분류 */}
          <Text style={styles.label}>분류</Text>
          <View style={styles.catChips}>
            {POST_CATEGORIES.map((c) => {
              const on = category === c;
              const meta = catMeta(c);
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[styles.catChip, { backgroundColor: on ? meta.color : catTint(c) }]}
                >
                  <Ionicons name={meta.icon} size={13} color={on ? '#fff' : meta.color} />
                  <Text style={[styles.catChipText, { color: on ? '#fff' : meta.color }]}>{c}</Text>
                </Pressable>
              );
            })}
          </View>
          {category === '기타' && (
            <TextInput
              style={styles.customInput}
              placeholder="분류를 직접 적어도 돼요 (예: 시험, 태아, 선교)"
              placeholderTextColor={C.textPlaceholder}
              value={customCategory}
              onChangeText={setCustomCategory}
              maxLength={8}
            />
          )}

          {/* 공개 옵션 */}
          <View style={styles.optGroup}>
            <View style={styles.optRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.optLabel}>익명으로 올리기</Text>
                <Text style={styles.optDesc}>이름 대신 ‘익명’으로 표시돼요</Text>
              </View>
              <Switch
                value={anonymous}
                onValueChange={setAnonymous}
                trackColor={{ true: C.primary, false: C.backgroundSky }}
                thumbColor="#fff"
              />
            </View>
            <View style={[styles.optRow, styles.optDivider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.optLabel}>우리동네에 보이기</Text>
                <Text style={styles.optDesc}>{store.myRegion} 이웃들의 ‘우리동네’ 탭에 함께 보여요</Text>
              </View>
              <Switch
                value={showRegion}
                onValueChange={setShowRegion}
                trackColor={{ true: C.primary, false: C.backgroundSky }}
                thumbColor="#fff"
              />
            </View>
          </View>
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
    bodyInput: { fontSize: 15, color: C.textBody, fontFamily: FONT.regular, lineHeight: 24, minHeight: 120, marginTop: 4 },

    label: { fontSize: 13, color: C.textCaption, fontFamily: FONT.semibold, marginTop: SPACING.xl, marginBottom: SPACING.sm },
    catChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, height: 36, borderRadius: RADIUS.pill },
    catChipText: { fontSize: 13.5, fontFamily: FONT.semibold },
    customInput: {
      height: 46,
      backgroundColor: C.surface,
      borderRadius: RADIUS.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: C.border,
      paddingHorizontal: 14,
      fontSize: 14.5,
      color: C.text,
      fontFamily: FONT.regular,
      marginTop: SPACING.md,
    },

    optGroup: { backgroundColor: C.surface, borderRadius: RADIUS.lg, marginTop: SPACING.xl },
    optRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: SPACING.lg },
    optDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider },
    optLabel: { fontSize: 15, color: C.text, fontFamily: FONT.medium },
    optDesc: { fontSize: 12.5, color: C.textCaption, fontFamily: FONT.regular, marginTop: 2 },
  });

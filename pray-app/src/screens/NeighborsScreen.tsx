import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { FONT, RADIUS, SPACING, useTheme, CLOUD_SHADOW, Palette } from '../theme';
import SkyHeader from '../components/common/SkyHeader';
import { usePrayerStore } from '../store/PrayerStore';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'neighbors' | 'clubs';

export default function NeighborsScreen() {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const store = usePrayerStore();
  const [tab, setTab] = useState<Tab>('neighbors');
  const [creating, setCreating] = useState(false);
  const [clubName, setClubName] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const findFromContacts = () => nav.navigate('Contacts');

  const createClub = () => {
    if (!clubName.trim()) return;
    store.createClub(clubName.trim());
    setClubName('');
    setCreating(false);
  };

  const joinClub = async () => {
    if (!joinCode.trim()) return;
    const { error } = await store.joinClub(joinCode.trim());
    if (error) return Alert.alert('참여 실패', error);
    setJoinCode('');
    setJoining(false);
    Alert.alert('참여 완료', '모임에 참여했어요. 함께 기도해요!');
  };

  return (
    <View style={styles.root}>
      <SkyHeader paddingBottom={16}>
        <Text style={styles.h1}>이웃</Text>
        {/* 세그먼트 */}
        <View style={styles.segment}>
          {(['neighbors', 'clubs'] as Tab[]).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.segBtn, tab === t && styles.segBtnOn]}>
              <Text style={[styles.segText, tab === t && styles.segTextOn]}>{t === 'neighbors' ? '이웃' : '모임'}</Text>
            </Pressable>
          ))}
        </View>
      </SkyHeader>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120, paddingTop: SPACING.lg }}>
        {tab === 'neighbors' ? (
          <>
            {/* 연락처 찾기 CTA */}
            <View style={styles.section}>
              <Pressable onPress={findFromContacts} style={({ pressed }) => [styles.cta, CLOUD_SHADOW.soft, pressed && { opacity: 0.9 }]}>
                <View style={styles.ctaIcon}><Ionicons name="person-add" size={18} color={C.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ctaTitle}>연락처로 이웃 찾기</Text>
                  <Text style={styles.ctaDesc}>같은 교회 성도를 찾아 기도제목을 나눠요</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textPlaceholder} />
              </Pressable>
            </View>

            {/* 이웃 목록 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>내 이웃 {store.neighbors.length}</Text>
              <View style={[styles.group, CLOUD_SHADOW.soft]}>
                {store.neighbors.map((n, idx) => (
                  <View key={n.id} style={[styles.row, idx > 0 && styles.rowDivider]}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{n.name.charAt(0)}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{n.name}</Text>
                      <Text style={styles.rowSub}>{n.church ?? '교회 미설정'}</Text>
                    </View>
                    <Text style={styles.rowMeta}>기도제목 {n.prayerCount}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            {/* 모임 만들기 */}
            <View style={styles.section}>
              {creating ? (
                <View style={[styles.createCard, CLOUD_SHADOW.soft]}>
                  <TextInput
                    style={styles.input}
                    placeholder="모임 이름 (예: 청년부 중보기도)"
                    placeholderTextColor={C.textPlaceholder}
                    value={clubName}
                    onChangeText={setClubName}
                    autoFocus
                  />
                  <View style={styles.createActions}>
                    <Pressable onPress={() => { setCreating(false); setClubName(''); }} style={styles.cancelBtn}>
                      <Text style={styles.cancelText}>취소</Text>
                    </Pressable>
                    <Pressable onPress={createClub} style={[styles.confirmBtn, !clubName.trim() && { opacity: 0.4 }]}>
                      <Text style={styles.confirmText}>만들기</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable onPress={() => setCreating(true)} style={({ pressed }) => [styles.cta, CLOUD_SHADOW.soft, pressed && { opacity: 0.9 }]}>
                  <View style={styles.ctaIcon}><Ionicons name="add" size={20} color={C.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ctaTitle}>모임 만들기</Text>
                    <Text style={styles.ctaDesc}>교회, 소그룹별로 기도제목을 나눠요</Text>
                  </View>
                </Pressable>
              )}
            </View>

            {/* 초대 코드로 참여 */}
            <View style={styles.section}>
              {joining ? (
                <View style={[styles.createCard, CLOUD_SHADOW.soft]}>
                  <TextInput
                    style={styles.input}
                    placeholder="초대 코드 6자리"
                    placeholderTextColor={C.textPlaceholder}
                    value={joinCode}
                    onChangeText={setJoinCode}
                    autoCapitalize="characters"
                    maxLength={6}
                    autoFocus
                  />
                  <View style={styles.createActions}>
                    <Pressable onPress={() => { setJoining(false); setJoinCode(''); }} style={styles.cancelBtn}>
                      <Text style={styles.cancelText}>취소</Text>
                    </Pressable>
                    <Pressable onPress={joinClub} style={[styles.confirmBtn, !joinCode.trim() && { opacity: 0.4 }]}>
                      <Text style={styles.confirmText}>참여하기</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable onPress={() => setJoining(true)} style={({ pressed }) => [styles.cta, CLOUD_SHADOW.soft, pressed && { opacity: 0.9 }]}>
                  <View style={styles.ctaIcon}><Ionicons name="key-outline" size={18} color={C.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ctaTitle}>초대 코드로 참여</Text>
                    <Text style={styles.ctaDesc}>받은 초대 코드를 입력해 모임에 들어가요</Text>
                  </View>
                </Pressable>
              )}
            </View>

            {/* 클럽 목록 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>내 모임 {store.clubs.length}</Text>
              <View style={[styles.group, CLOUD_SHADOW.soft]}>
                {store.clubs.map((c, idx) => (
                  <Pressable
                    key={c.id}
                    onPress={() => nav.navigate('ClubDetail', { id: c.id })}
                    style={({ pressed }) => [styles.row, idx > 0 && styles.rowDivider, pressed && { backgroundColor: C.cardMuted }]}
                  >
                    <View style={[styles.avatar, { backgroundColor: C.tier.periodBg }]}>
                      <Ionicons name="people" size={17} color={C.tier.periodText} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{c.name}</Text>
                      <Text style={styles.rowSub}>{c.description ?? '소개 없음'}</Text>
                    </View>
                    <Text style={styles.rowMeta}>{c.memberCount}명</Text>
                    <Ionicons name="chevron-forward" size={16} color={C.textPlaceholder} />
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.lg },
  h1: { fontSize: 24, color: C.text, fontFamily: FONT.bold },

  segment: { flexDirection: 'row', backgroundColor: C.backgroundSky, borderRadius: RADIUS.md, padding: 3, marginTop: SPACING.lg },
  segBtn: { flex: 1, height: 36, borderRadius: RADIUS.md - 3, alignItems: 'center', justifyContent: 'center' },
  segBtnOn: { backgroundColor: C.surface, ...CLOUD_SHADOW.soft },
  segText: { fontSize: 14, color: C.textCaption, fontFamily: FONT.medium },
  segTextOn: { color: C.text, fontFamily: FONT.semibold },

  section: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.lg },
  sectionTitle: { fontSize: 13, color: C.textCaption, fontFamily: FONT.semibold, marginBottom: SPACING.sm, paddingHorizontal: 2 },

  cta: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: SPACING.lg },
  ctaIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  ctaTitle: { fontSize: 15, color: C.text, fontFamily: FONT.semibold },
  ctaDesc: { fontSize: 12.5, color: C.textCaption, fontFamily: FONT.regular, marginTop: 2 },

  group: { backgroundColor: C.surface, borderRadius: RADIUS.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.lg, paddingVertical: 14 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.avatarBg, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, color: C.avatarText, fontFamily: FONT.semibold },
  rowTitle: { fontSize: 15, color: C.text, fontFamily: FONT.medium },
  rowSub: { fontSize: 12.5, color: C.textCaption, fontFamily: FONT.regular, marginTop: 2 },
  rowMeta: { fontSize: 12.5, color: C.textCaption, fontFamily: FONT.regular },

  createCard: { backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: SPACING.lg },
  input: { height: 46, backgroundColor: C.cardMuted, borderRadius: RADIUS.md, paddingHorizontal: 14, fontSize: 15, color: C.text, fontFamily: FONT.regular },
  createActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: SPACING.md },
  cancelBtn: { height: 38, paddingHorizontal: 16, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, color: C.textSecondary, fontFamily: FONT.medium },
  confirmBtn: { height: 38, paddingHorizontal: 18, borderRadius: RADIUS.md, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: 14, color: '#fff', fontFamily: FONT.semibold },
});

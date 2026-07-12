import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Share } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { FONT, RADIUS, SPACING, useTheme, CLOUD_SHADOW, Palette } from '../theme';
import { usePrayerStore } from '../store/PrayerStore';
import ScreenHeader from '../components/common/ScreenHeader';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ClubDetailScreen() {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'ClubDetail'>>();
  const store = usePrayerStore();
  const club = store.clubs.find((c) => c.id === route.params.id);
  const shared = store.prayers.filter((p) => p.clubId === route.params.id && !p.answeredAt);

  if (!club) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="모임" />
        <View style={styles.empty}><Text style={styles.emptyText}>모임을 찾을 수 없어요</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title={club.name} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* 클럽 정보 */}
        <View style={[styles.card, CLOUD_SHADOW.soft]}>
          <View style={styles.clubIcon}><Ionicons name="people" size={22} color={C.tier.periodText} /></View>
          <Text style={styles.clubName}>{club.name}</Text>
          {!!club.description && <Text style={styles.clubDesc}>{club.description}</Text>}
          <Text style={styles.clubMeta}>멤버 {club.memberCount}명{club.isMine ? ' · 내가 만든 모임' : ''}</Text>
          <Pressable
            onPress={() =>
              Share.share({
                message: `[기도해요] '${club.name}' 모임에서 함께 기도해요!\n앱에서 모임 참여 → 초대 코드: ${club.joinCode ?? club.id.slice(0, 6).toUpperCase()}\nhttps://neoix.kr/pray`,
              }).catch(() => {})
            }
            style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="share-outline" size={16} color="#fff" />
            <Text style={styles.shareText}>모임 초대하기</Text>
          </Pressable>
        </View>

        {/* 공유된 기도제목 */}
        <Text style={styles.sectionTitle}>공유된 기도제목 {shared.length}</Text>
        {shared.length === 0 ? (
          <View style={[styles.card, CLOUD_SHADOW.soft, { alignItems: 'center', paddingVertical: 30 }]}>
            <Text style={styles.emptyText}>아직 공유된 기도제목이 없어요{'\n'}기도제목을 쓸 때 이 모임을 선택해 보세요</Text>
          </View>
        ) : (
          <View style={[styles.group, CLOUD_SHADOW.soft]}>
            {shared.map((p, idx) => (
              <Pressable
                key={p.id}
                onPress={() => nav.navigate('PrayerDetail', { id: p.id })}
                style={({ pressed }) => [styles.row, idx > 0 && styles.rowDivider, pressed && { backgroundColor: C.cardMuted }]}
              >
                <View style={styles.avatar}><Text style={styles.avatarText}>{p.authorName.charAt(0)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{p.title}</Text>
                  <Text style={styles.rowSub}>{p.mine ? '나' : p.authorName}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textPlaceholder} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingHorizontal: SPACING.xl, paddingBottom: 60 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13.5, color: C.textCaption, fontFamily: FONT.regular, textAlign: 'center', lineHeight: 20 },

  card: { backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: SPACING.xl, marginBottom: SPACING.lg },
  clubIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.tier.periodBg, alignItems: 'center', justifyContent: 'center' },
  clubName: { fontSize: 19, color: C.text, fontFamily: FONT.bold, marginTop: SPACING.md },
  clubDesc: { fontSize: 14, color: C.textSecondary, fontFamily: FONT.regular, marginTop: 4 },
  clubMeta: { fontSize: 12.5, color: C.textCaption, fontFamily: FONT.regular, marginTop: 10 },

  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: RADIUS.md, backgroundColor: C.primary, marginTop: SPACING.lg },
  shareText: { fontSize: 14.5, color: '#fff', fontFamily: FONT.semibold },
  sectionTitle: { fontSize: 13, color: C.textCaption, fontFamily: FONT.semibold, marginBottom: SPACING.sm, paddingHorizontal: 2 },
  group: { backgroundColor: C.surface, borderRadius: RADIUS.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.lg, paddingVertical: 14 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.avatarBg, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, color: C.avatarText, fontFamily: FONT.medium },
  rowTitle: { fontSize: 15, color: C.text, fontFamily: FONT.medium },
  rowSub: { fontSize: 12.5, color: C.textCaption, fontFamily: FONT.regular, marginTop: 2 },
});

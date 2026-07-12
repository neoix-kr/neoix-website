import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Image } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, FONT, RADIUS, SPACING, CLOUD_SHADOW, Palette } from '../theme';
import { usePrayerStore } from '../store/PrayerStore';
import ScreenHeader from '../components/common/ScreenHeader';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TIER_LABEL = { urgent: '긴급 · 오늘', week: '이번 주', period: '올해 · 이번 달' } as const;
const VIS_LABEL = { private: '나만 보기', neighbors: '이웃 공유', clubs: '모임 공유' } as const;

export default function PrayerDetailScreen() {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const TIER_STYLE = {
    urgent: { bg: C.tier.urgentBg, text: C.tier.urgentText },
    week: { bg: C.tier.weekBg, text: C.tier.weekText },
    period: { bg: C.tier.periodBg, text: C.tier.periodText },
  } as const;
  const nav = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'PrayerDetail'>>();
  const store = usePrayerStore();
  const prayer = store.prayers.find((p) => p.id === route.params.id);

  if (!prayer) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="기도제목" />
        <View style={styles.empty}><Text style={styles.emptyText}>삭제된 기도제목이에요</Text></View>
      </View>
    );
  }

  const prayed = store.prayedToday(prayer.id);
  const club = prayer.clubId ? store.clubs.find((c) => c.id === prayer.clubId) : null;

  const remove = () =>
    Alert.alert('삭제할까요?', '이 기도제목이 기도함에서 사라져요.', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => { store.deletePrayer(prayer.id); nav.goBack(); } },
    ]);

  const answer = () =>
    Alert.alert('응답된 기도로 옮길까요?', '응답된 기도 목록에 감사의 기록으로 남아요.', [
      { text: '취소', style: 'cancel' },
      { text: '응답됐어요', onPress: () => store.markAnswered(prayer.id) },
    ]);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="기도제목"
        right={
          prayer.mine ? (
            <Pressable onPress={() => nav.navigate('PrayerCompose', { editId: prayer.id })} hitSlop={8}>
              <Text style={styles.edit}>수정</Text>
            </Pressable>
          ) : undefined
        }
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* 본문 카드 */}
        <View style={[styles.card, CLOUD_SHADOW.soft]}>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: TIER_STYLE[prayer.period].bg }]}>
              <Text style={[styles.badgeText, { color: TIER_STYLE[prayer.period].text }]}>
                {TIER_LABEL[prayer.period]}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: C.cardMuted }]}>
              <Text style={[styles.badgeText, { color: C.textSecondary }]}>
                {club ? club.name : VIS_LABEL[prayer.visibility]}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{prayer.title}</Text>
          {!!prayer.photoUri && <Image source={{ uri: prayer.photoUri }} style={styles.photo} />}
          {!!prayer.body && <Text style={styles.body}>{prayer.body}</Text>}

          <View style={styles.metaRow}>
            <View style={styles.metaAvatar}><Text style={styles.metaAvatarText}>{prayer.authorName.charAt(0)}</Text></View>
            <Text style={styles.metaText}>{prayer.mine ? '내 기도제목' : `${prayer.authorName} 님의 기도제목`}</Text>
          </View>
        </View>

        {/* 오늘 기도 체크 */}
        {!prayer.answeredAt && (
          <Pressable
            onPress={() => store.togglePrayedToday(prayer.id)}
            style={({ pressed }) => [styles.prayRow, CLOUD_SHADOW.soft, pressed && { opacity: 0.9 }]}
          >
            <View style={[styles.check, prayed && { backgroundColor: C.primary, borderColor: C.primary }]}>
              {prayed && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
            <Text style={[styles.prayRowText, prayed && { color: C.primary }]}>
              {prayed ? '오늘 이 제목으로 기도했어요' : '오늘 기도했다면 체크해요'}
            </Text>
          </Pressable>
        )}

        {/* 액션 */}
        {prayer.mine && !prayer.answeredAt && (
          <Pressable onPress={answer} style={({ pressed }) => [styles.actionRow, CLOUD_SHADOW.soft, pressed && { opacity: 0.9 }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color={C.success} />
            <Text style={[styles.actionText, { color: C.success }]}>응답된 기도로 표시</Text>
          </Pressable>
        )}
        {prayer.answeredAt && (
          <View style={[styles.answered, CLOUD_SHADOW.soft]}>
            <Ionicons name="checkmark-circle" size={20} color={C.success} />
            <Text style={styles.answeredText}>응답된 기도 · 감사함으로 기록됐어요</Text>
          </View>
        )}
        {prayer.mine && (
          <Pressable onPress={remove} style={({ pressed }) => [styles.actionRow, CLOUD_SHADOW.soft, pressed && { opacity: 0.9 }]}>
            <Ionicons name="trash-outline" size={19} color={C.error} />
            <Text style={[styles.actionText, { color: C.error }]}>삭제</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  edit: { fontSize: 15, color: C.primary, fontFamily: FONT.semibold, paddingHorizontal: 6 },
  scroll: { paddingHorizontal: SPACING.xl, paddingBottom: 60 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: C.textCaption, fontFamily: FONT.regular },

  card: { backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: SPACING.xl },
  badges: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.sm },
  badgeText: { fontSize: 12, fontFamily: FONT.semibold },
  title: { fontSize: 21, color: C.text, fontFamily: FONT.bold, lineHeight: 31, marginTop: SPACING.lg },
  photo: { width: '100%', height: 200, borderRadius: RADIUS.md, marginTop: SPACING.md },
  body: { fontSize: 15, color: C.textBody, fontFamily: FONT.regular, lineHeight: 25, marginTop: SPACING.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACING.xl, paddingTop: SPACING.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider },
  metaAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.avatarBg, alignItems: 'center', justifyContent: 'center' },
  metaAvatarText: { fontSize: 12, color: C.avatarText, fontFamily: FONT.medium },
  metaText: { fontSize: 13, color: C.textCaption, fontFamily: FONT.regular },

  prayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.lg, paddingVertical: 16, marginTop: SPACING.md },
  prayRowText: { fontSize: 15, color: C.textSecondary, fontFamily: FONT.medium },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: C.borderStrong, alignItems: 'center', justifyContent: 'center' },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.lg, paddingVertical: 15, marginTop: SPACING.md },
  actionText: { fontSize: 15, fontFamily: FONT.medium },
  answered: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.successLight, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.lg, paddingVertical: 15, marginTop: SPACING.md },
  answeredText: { fontSize: 14, color: C.success, fontFamily: FONT.medium },
});

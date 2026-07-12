import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Image, Share, Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, FONT, RADIUS, SPACING, CLOUD_SHADOW, Palette } from '../theme';
import SkyHeader from '../components/common/SkyHeader';
import { useAuth } from '../contexts/AuthContext';
import { usePrayerStore } from '../store/PrayerStore';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { PrayerPeriod } from '../types/db';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// 홈 — 하늘 인사말 + [오늘의 기도] + 3단계 기도 그룹 + [오늘의 말씀] + 광고칸.

const TIER_LABEL: Record<PrayerPeriod, string> = {
  urgent: '긴급한 기도',
  week: '이번 주',
  period: '올해 · 이번 달',
};

// 안드로이드 LayoutAnimation 활성화 (접기/펼치기 부드럽게)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// 오늘의 말씀 — 날짜 기준 로테이션
const VERSES = [
  { text: '“너는 마음을 다하고 뜻을 다하고 힘을 다하여 네 하나님 여호와를 사랑하라”', ref: '신명기 6:5' },
  { text: '“쉬지 말고 기도하라 범사에 감사하라”', ref: '데살로니가전서 5:17-18' },
  { text: '“너희 염려를 다 주께 맡기라 이는 그가 너희를 돌보심이라”', ref: '베드로전서 5:7' },
  { text: '“여호와는 나의 목자시니 내게 부족함이 없으리로다”', ref: '시편 23:1' },
  { text: '“수고하고 무거운 짐 진 자들아 다 내게로 오라 내가 너희를 쉬게 하리라”', ref: '마태복음 11:28' },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const { profile } = useAuth();
  const store = usePrayerStore();
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const name = store.profileName ?? profile?.display_name ?? '동반자';

  const total = store.todayTargets.length;
  const done = store.todayDoneCount;
  const featured = store.todayTargets.find((p) => !store.prayedToday(p.id));
  const verse = VERSES[new Date().getDate() % VERSES.length];
  const tierDot: Record<PrayerPeriod, string> = {
    urgent: C.tier.urgent,
    week: C.tier.week,
    period: C.tier.period,
  };

  const shareVerse = () => {
    Share.share({ message: `${verse.text}\n— ${verse.ref}\n\n중보와 함께` }).catch(() => {});
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* ── 하늘 인사말 ── */}
        <SkyHeader paddingBottom={52}>
          <View style={styles.topIcons}>
            <Pressable hitSlop={10} onPress={() => nav.navigate('NotificationSettings')}>
              <Ionicons name="notifications-outline" size={23} color={C.textBody} />
            </Pressable>
            <Pressable hitSlop={10} onPress={() => nav.navigate('Me' as never)}>
              <Ionicons name="settings-outline" size={22} color={C.textBody} />
            </Pressable>
          </View>
          <Text style={styles.greeting}>
            {name}님,{'\n'}오늘도 <Text style={styles.greetingAccent}>기도로</Text>{'\n'}하나님과 동행해요
          </Text>
        </SkyHeader>

        {/* ── 오늘의 기도 ── */}
        <View style={[styles.section, { marginTop: -34 }]}>
          <View style={[styles.card, CLOUD_SHADOW.card]}>
            <View style={styles.todayRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.todayLabel}>오늘의 기도</Text>
                <Text style={styles.todayTitle} numberOfLines={2}>
                  {featured ? featured.title : total > 0 ? '오늘의 기도를 모두 마쳤어요' : '기도제목을 담아보세요'}
                </Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: total ? `${Math.round((done / total) * 100)}%` : '0%' }]} />
                </View>
                <Text style={styles.todayCount}>{done} / {total} 기도 완료</Text>
              </View>
              <Image source={require('../../assets/adaptive-icon.png')} style={styles.hands} resizeMode="contain" />
            </View>
            <Pressable
              onPress={() => total > 0 && nav.navigate('PrayerSession', { sources: ['urgent', 'week', 'period'] })}
              disabled={total === 0}
              style={({ pressed }) => [styles.cta, total === 0 && { opacity: 0.4 }, pressed && { opacity: 0.88 }]}
            >
              <Text style={styles.ctaText}>오늘의 기도 시작하기</Text>
            </Pressable>
          </View>
        </View>

        {/* ── 3단계 그룹 (긴급 / 이번 주 / 올해·이번 달) — 헤더 탭으로 접기/펼치기 ── */}
        {(['urgent', 'week', 'period'] as PrayerPeriod[]).map((g) => {
          const items = store.prayers.filter((p) => p.period === g && !p.answeredAt);
          if (items.length === 0) return null;
          const collapsed = store.collapsedTiers.includes(g);
          const doneInTier = items.filter((p) => store.prayedToday(p.id)).length;
          return (
            <View key={g} style={styles.section}>
              <Pressable
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  store.toggleTierCollapsed(g);
                }}
                hitSlop={6}
                style={({ pressed }) => [styles.sectionHead, pressed && { opacity: 0.6 }]}
              >
                <View style={[styles.tierDot, { backgroundColor: tierDot[g] }]} />
                <Text style={styles.sectionTitle}>{TIER_LABEL[g]}</Text>
                <Text style={styles.sectionCount}>
                  {collapsed ? `${doneInTier}/${items.length}` : items.length}
                </Text>
                <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={15} color={C.textPlaceholder} />
              </Pressable>
              {!collapsed && (
              <View style={[styles.group, CLOUD_SHADOW.soft]}>
                {items.map((it, idx) => {
                  const prayed = store.prayedToday(it.id);
                  return (
                    <Pressable
                      key={it.id}
                      onPress={() => nav.navigate('PrayerDetail', { id: it.id })}
                      style={({ pressed }) => [styles.row, idx > 0 && styles.rowDivider, pressed && { backgroundColor: C.cardMuted }]}
                    >
                      <Pressable
                        onPress={() => store.togglePrayedToday(it.id)}
                        hitSlop={8}
                        style={[styles.check, prayed && { backgroundColor: C.primary, borderColor: C.primary }]}
                      >
                        {prayed && <Ionicons name="checkmark" size={13} color="#fff" />}
                      </Pressable>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowTitle2, prayed && styles.rowTitleDone]}>{it.title}</Text>
                        <Text style={styles.rowSub}>
                          {it.mine
                            ? it.visibility === 'private' ? '나만 보기' : it.visibility === 'neighbors' ? '이웃과 공유 중' : '모임과 공유 중'
                            : `${it.authorName} 님의 기도제목`}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={C.textPlaceholder} />
                    </Pressable>
                  );
                })}
              </View>
              )}
            </View>
          );
        })}

        {/* ── 오늘의 말씀 ── */}
        <View style={styles.section}>
          <View style={[styles.card, CLOUD_SHADOW.soft]}>
            <View style={styles.cardHead}>
              <View style={styles.verseHead}>
                <Ionicons name="sunny" size={17} color={C.gold} />
                <Text style={styles.cardTitle}>오늘의 말씀</Text>
              </View>
              <Pressable onPress={shareVerse} hitSlop={8}>
                <Text style={styles.headActionText}>공유하기</Text>
              </Pressable>
            </View>
            <Text style={styles.verseText}>{verse.text}</Text>
            <Text style={styles.verseRef}>{verse.ref}</Text>
          </View>
        </View>

        {/* ── 광고 영역 (Google AdMob 배너 자리 — SDK 연동 시 교체) ── */}
        <View style={styles.section}>
          <View style={styles.adSlot}>
            <Text style={styles.adBadge}>AD</Text>
            <Text style={styles.adText}>광고 영역 · Google AdMob</Text>
          </View>
        </View>
      </ScrollView>

      {/* 기도제목 추가 */}
      <Pressable
        onPress={() => nav.navigate('PrayerCompose')}
        style={({ pressed }) => [styles.fab, CLOUD_SHADOW.primary, { bottom: insets.bottom + 76 }, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },

    topIcons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 18, marginBottom: SPACING.lg },
    greeting: { fontSize: 27, color: C.textStrong, fontFamily: FONT.bold, lineHeight: 39 },
    greetingAccent: { color: C.primary },

    section: { paddingHorizontal: SPACING.xl, marginBottom: SPACING.lg },
    card: { backgroundColor: C.surface, borderRadius: RADIUS.xl, padding: SPACING.xl },

    todayRow: { flexDirection: 'row', alignItems: 'center' },
    todayLabel: { fontSize: 14, color: C.primary, fontFamily: FONT.semibold },
    todayTitle: { fontSize: 21, color: C.text, fontFamily: FONT.bold, lineHeight: 30, marginTop: 8 },
    track: { height: 8, borderRadius: 4, backgroundColor: C.backgroundSky, marginTop: SPACING.lg, overflow: 'hidden' },
    fill: { height: 8, borderRadius: 4, backgroundColor: C.primary },
    todayCount: { fontSize: 13.5, color: C.textSecondary, fontFamily: FONT.regular, marginTop: 10 },
    hands: { width: 104, height: 104 },
    cta: { height: 54, borderRadius: RADIUS.md, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.lg },
    ctaText: { fontSize: 16, color: '#fff', fontFamily: FONT.semibold },

    cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    cardTitle: { fontSize: 17, color: C.text, fontFamily: FONT.bold },
    headAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    headActionText: { fontSize: 13, color: C.textCaption, fontFamily: FONT.medium },

    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: SPACING.sm, paddingHorizontal: 2 },
    tierDot: { width: 7, height: 7, borderRadius: 4 },
    sectionTitle: { flex: 1, fontSize: 15, color: C.text, fontFamily: FONT.semibold },
    sectionCount: { fontSize: 13, color: C.textCaption, fontFamily: FONT.regular },
    group: { backgroundColor: C.surface, borderRadius: RADIUS.lg, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.lg, paddingVertical: 15 },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider },
    check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: C.borderStrong, alignItems: 'center', justifyContent: 'center' },
    rowTitle2: { fontSize: 15, color: C.text, fontFamily: FONT.medium, lineHeight: 21 },
    rowTitleDone: { color: C.textCaption, textDecorationLine: 'line-through' },
    rowSub: { fontSize: 12.5, color: C.textCaption, fontFamily: FONT.regular, marginTop: 3 },

    fab: { position: 'absolute', right: SPACING.xl, width: 54, height: 54, borderRadius: 27, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },

    adSlot: {
      height: 84,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: C.borderStrong,
      backgroundColor: C.cardMuted,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },
    adBadge: { fontSize: 10, color: C.textPlaceholder, fontFamily: FONT.bold, letterSpacing: 1, borderWidth: 1, borderColor: C.borderStrong, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden' },
    adText: { fontSize: 12.5, color: C.textPlaceholder, fontFamily: FONT.regular },

    verseHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    verseText: { fontSize: 15, color: C.textBody, fontFamily: FONT.medium, lineHeight: 25, marginTop: SPACING.md },
    verseRef: { fontSize: 13.5, color: C.primary, fontFamily: FONT.semibold, marginTop: 10 },
  });

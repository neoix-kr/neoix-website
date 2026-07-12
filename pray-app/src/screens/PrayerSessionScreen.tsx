import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, PanResponder, Dimensions, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FONT, RADIUS, SPACING } from '../theme';
import { usePrayerStore } from '../store/PrayerStore';
import type { RootStackParamList } from '../navigation/RootNavigator';

// 기도 세션 — 선택한 소스(긴급/이번주/올해/모임/기도마당)를 합쳐 스와이프.
// 카드를 통째로 스와이프(오른쪽=아멘) 하거나 하단 [다음 기도 | 아멘] 버튼.

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.3;

const BG = '#0A101F';
const CARD = '#161E33';
const TEXT = '#F2F5FB';
const TEXT_SUB = '#A9B4CE';
const TEXT_MUTED = '#6E7A96';
const CAT = '#8FA3C8';

// 소스에서 만들어진 통합 기도 카드
type Card = {
  key: string;           // 고유 키 (중복 제거)
  prayerId: string | null; // 내 기도제목이면 로그 기록용 id
  category: string;
  title: string;
  body: string | null;
  author: string;
  mine: boolean;
  photoUri: string | null;
};

const TIER_LABEL: Record<string, string> = { urgent: '긴급 · 오늘', week: '이번 주', period: '올해 · 이번 달' };

export default function PrayerSessionScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'PrayerSession'>>();
  const store = usePrayerStore();
  const sources = route.params?.sources ?? ['urgent', 'week', 'period'];

  // 선택된 소스 → 통합 카드 목록 (세션 시작 시 고정 스냅샷)
  const cards: Card[] = useMemo(() => {
    const out: Card[] = [];
    const seen = new Set<string>();
    const active = store.prayers.filter((p) => !p.answeredAt);
    const addPrayer = (p: (typeof active)[number]) => {
      if (seen.has(p.id)) return;
      seen.add(p.id);
      out.push({
        key: p.id,
        prayerId: p.id,
        category: store.clubs.find((c) => c.id === p.clubId)?.name ?? TIER_LABEL[p.period] ?? '기도',
        title: p.title,
        body: p.body,
        author: p.mine ? '나' : p.authorName,
        mine: p.mine,
        photoUri: p.photoUri,
      });
    };
    sources.forEach((s) => {
      if (s === 'urgent' || s === 'week' || s === 'period') {
        active.filter((p) => p.period === s).forEach(addPrayer);
      } else if (s.startsWith('club:')) {
        const cid = s.slice(5);
        active.filter((p) => p.clubId === cid).forEach(addPrayer);
      } else if (s === 'community') {
        store.posts.slice(0, 10).forEach((post) => {
          const k = `post:${post.id}`;
          if (seen.has(k)) return;
          seen.add(k);
          out.push({ key: k, prayerId: null, category: `기도마당 · ${post.category}`, title: post.title, body: post.body, author: post.authorName, mine: false, photoUri: null });
        });
      }
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const targets = cards;
  const [index, setIndex] = useState(0);
  const [prayedCount, setPrayedCount] = useState(0);
  const finished = index >= targets.length;

  const pan = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    pan.setValue(0);
    enter.setValue(0);
    Animated.spring(enter, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const goNext = (prayed: boolean) => {
    const cur = targets[index];
    if (cur && prayed) {
      if (cur.prayerId) store.markPrayed(cur.prayerId);
      setPrayedCount((c) => c + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    setIndex((i) => i + 1);
  };

  const animateOut = (dir: 1 | -1, prayed: boolean) => {
    Animated.timing(pan, { toValue: dir * SCREEN_W * 1.15, duration: 230, useNativeDriver: true }).start(() => goNext(prayed));
  };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
      onPanResponderMove: (_, g) => pan.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD || g.vx > 1.2) animateOut(1, true);
        else if (g.dx < -SWIPE_THRESHOLD || g.vx < -1.2) animateOut(-1, false);
        else Animated.spring(pan, { toValue: 0, useNativeDriver: true, friction: 7 }).start();
      },
    })
  ).current;

  const rotate = pan.interpolate({ inputRange: [-SCREEN_W, 0, SCREEN_W], outputRange: ['-5deg', '0deg', '5deg'] });
  const enterRise = enter.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });
  const enterScale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });
  const absPan = pan.interpolate({ inputRange: [-SCREEN_W, 0, SCREEN_W], outputRange: [1, 0, 1], extrapolate: 'clamp' });
  const backScale = absPan.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const backOpacity = absPan.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  const cur = targets[index];
  const next = targets[index + 1];

  const CardInner = ({ p }: { p: Card }) => (
    <View style={styles.cardInner}>
      <Text style={styles.category}>{p.category}</Text>
      {!!p.photoUri && <Image source={{ uri: p.photoUri }} style={styles.photo} />}
      <Text style={styles.title}>{p.title}</Text>
      <View style={styles.divider} />
      {!!p.body && <Text style={styles.body}>{p.body}</Text>}
      <View style={styles.metaRow}>
        <View style={styles.metaAvatar}>
          <Ionicons name="person" size={13} color={TEXT_SUB} />
        </View>
        <Text style={styles.metaText}>
          {p.mine ? '내 기도제목이에요' : `${p.author} 님이 요청했어요`}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <StatusBar style="light" animated />

      {/* 진행바 + 닫기 */}
      <View style={styles.topRow}>
        <View style={styles.segments}>
          {targets.map((_, i) => (
            <View key={i} style={[styles.segment, i < index && styles.segmentDone, i === index && styles.segmentNow]} />
          ))}
        </View>
        <Pressable onPress={() => nav.goBack()} hitSlop={12} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={TEXT_MUTED} />
        </Pressable>
      </View>

      {finished ? (
        <View style={styles.doneWrap}>
          <Text style={styles.doneTitle}>오늘의 기도를 마쳤어요</Text>
          <Text style={styles.doneSub}>{targets.length}개 중 {prayedCount}개의 제목으로 함께 기도했어요</Text>
          <Pressable
            onPress={() => nav.goBack()}
            style={({ pressed }) => [styles.doneBtn, { marginBottom: insets.bottom + 16 }, pressed && { opacity: 0.88 }]}
          >
            <Text style={styles.doneBtnText}>마치기</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>기도 카드</Text>
            <Text style={styles.headerSub}>마음으로 함께 기도해요</Text>
          </View>

          {/* 카드 스택 */}
          <View style={styles.cardArea}>
            {next && (
              <Animated.View style={[styles.card, styles.cardAbs, { opacity: backOpacity, transform: [{ scale: backScale }] }]}>
                <CardInner p={next} />
              </Animated.View>
            )}
            {cur && (
              <Animated.View
                {...responder.panHandlers}
                style={[
                  styles.card,
                  styles.cardAbs,
                  { transform: [{ translateX: pan }, { rotate }, { translateY: enterRise }, { scale: enterScale }] },
                ]}
              >
                <CardInner p={cur} />
              </Animated.View>
            )}
          </View>

          {/* 하단 버튼 */}
          <View style={[styles.btnRow, { paddingBottom: insets.bottom + 18 }]}>
            <Pressable onPress={() => animateOut(-1, false)} style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.8 }]}>
              <Text style={styles.skipText}>다음 기도</Text>
            </Pressable>
            <Pressable onPress={() => animateOut(1, true)} style={({ pressed }) => [styles.amenBtn, pressed && { opacity: 0.9 }]}>
              <Text style={styles.amenText}>아멘</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: SPACING.xl },
  segments: { flex: 1, flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 3.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.14)' },
  segmentDone: { backgroundColor: 'rgba(255,255,255,0.55)' },
  segmentNow: { backgroundColor: '#FFFFFF' },
  closeBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },

  header: { alignItems: 'center', marginTop: SPACING.xl },
  headerTitle: { fontSize: 17, color: TEXT, fontFamily: FONT.bold },
  headerSub: { fontSize: 13, color: TEXT_MUTED, fontFamily: FONT.regular, marginTop: 6 },

  cardArea: { flex: 1, marginTop: SPACING.xl, marginBottom: SPACING.lg },
  cardAbs: { position: 'absolute', top: 0, bottom: 0, left: SPACING.xl, right: SPACING.xl },
  card: { backgroundColor: CARD, borderRadius: 28 },
  cardInner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  category: { fontSize: 14, color: CAT, fontFamily: FONT.medium },
  photo: { width: 148, height: 148, borderRadius: 20, marginTop: SPACING.xl },
  title: { fontSize: 28, color: TEXT, fontFamily: FONT.bold, textAlign: 'center', lineHeight: 41, marginTop: SPACING.xl },
  divider: { width: 30, height: 1.5, backgroundColor: 'rgba(255,255,255,0.22)', marginVertical: SPACING.xxl },
  body: { fontSize: 16, color: TEXT_SUB, fontFamily: FONT.regular, textAlign: 'center', lineHeight: 28 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: SPACING.xxxl },
  metaAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  metaText: { fontSize: 14, color: TEXT_MUTED, fontFamily: FONT.regular },

  btnRow: { flexDirection: 'row', gap: 12, paddingHorizontal: SPACING.xl },
  skipBtn: {
    flex: 1,
    height: 62,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: { fontSize: 16, color: TEXT_SUB, fontFamily: FONT.semibold },
  amenBtn: { flex: 1.25, height: 62, borderRadius: RADIUS.lg, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  amenText: { fontSize: 17, color: '#0A101F', fontFamily: FONT.bold },

  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xxl },
  doneTitle: { fontSize: 23, color: TEXT, fontFamily: FONT.bold },
  doneSub: { fontSize: 14, color: TEXT_SUB, fontFamily: FONT.regular, marginTop: 10 },
  doneBtn: { position: 'absolute', bottom: 0, left: SPACING.xl, right: SPACING.xl, height: 56, borderRadius: RADIUS.lg, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { fontSize: 16, color: '#0A101F', fontFamily: FONT.bold },
});

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ScrollView, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme, FONT, RADIUS, SPACING, CLOUD_SHADOW, Palette } from '../theme';
import { catMeta, catTint } from '../theme/categories';
import SkyHeader from '../components/common/SkyHeader';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { usePrayerStore, LocalPost, POST_CATEGORIES, timeAgo } from '../store/PrayerStore';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Sort = 'latest' | 'amen';
type Scope = 'all' | 'local';

// 기도마당 — 익명의 성도들과 함께 중보하는 커뮤니티.
// 검색 + 전체/우리동네 + 아이콘 분류 칩 + 최신/아멘 정렬.
export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const store = usePrayerStore();
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [category, setCategory] = useState<string>('전체');
  const [sort, setSort] = useState<Sort>('latest');

  // 우리동네 — 위치 권한 요청 후 동네 이름 갱신
  const goLocal = async () => {
    setScope('local');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('위치 권한', '위치를 허용하면 우리동네 기도제목을 정확히 보여드려요.\n(설정 > 중보 > 위치에서 변경 가능)');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geo = await Location.reverseGeocodeAsync(pos.coords);
      const g = geo[0];
      const region = g?.district || g?.subregion || g?.city;
      if (region && region !== store.myRegion) store.setMyRegion(region);
    } catch {}
  };

  const posts = useMemo(() => {
    let list = store.posts.filter((p) => !store.hiddenPostIds.includes(p.id));
    if (scope === 'local') list = list.filter((p) => p.region === store.myRegion);
    if (category !== '전체') {
      if (category === '기타') list = list.filter((p) => p.category === '기타' || !POST_CATEGORIES.includes(p.category as any));
      else list = list.filter((p) => p.category === category);
    }
    const q = query.trim();
    if (q) list = list.filter((p) => p.title.includes(q) || p.body.includes(q));
    if (sort === 'amen') list.sort((a, b) => b.amenCount - a.amenCount);
    else list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [store.posts, store.hiddenPostIds, scope, category, query, sort]);

  const renderItem = ({ item }: { item: LocalPost }) => {
    const meta = catMeta(item.category);
    return (
      <Pressable
        onPress={() => nav.navigate('PostDetail', { id: item.id })}
        style={({ pressed }) => [styles.post, CLOUD_SHADOW.soft, pressed && { opacity: 0.92 }]}
      >
        <View style={styles.postHead}>
          <View style={[styles.catPill, { backgroundColor: catTint(item.category) }]}>
            <Ionicons name={meta.icon} size={12} color={meta.color} />
            <Text style={[styles.catPillText, { color: meta.color }]}>{item.category}</Text>
          </View>
          {!!item.region && (
            <View style={styles.regionPill}>
              <Ionicons name="location" size={11} color={C.textCaption} />
              <Text style={styles.regionText}>{item.region}</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <Text style={styles.postMeta}>{timeAgo(item.createdAt)}</Text>
        </View>
        <Text style={styles.postTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.postBody} numberOfLines={2}>{item.body}</Text>
        <View style={styles.postFoot}>
          <Pressable onPress={() => store.toggleAmen(item.id)} hitSlop={8} style={styles.footBtn}>
            <Ionicons name={item.amened ? 'heart' : 'heart-outline'} size={16} color={item.amened ? C.like : C.textCaption} />
            <Text style={[styles.footText, item.amened && { color: C.like }]}>아멘 {item.amenCount}</Text>
          </Pressable>
          <Pressable onPress={() => store.togglePray(item.id)} hitSlop={8} style={styles.footBtn}>
            <MaterialCommunityIcons name="hands-pray" size={15} color={item.praying ? C.primary : C.textCaption} />
            <Text style={[styles.footText, item.praying && { color: C.primary }]}>기도 {item.prayCount}</Text>
          </Pressable>
          <View style={styles.footBtn}>
            <Ionicons name="chatbubble-outline" size={14} color={C.textCaption} />
            <Text style={styles.footText}>{item.comments.length}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => store.addPostToBox(item.id)}
            hitSlop={8}
            style={[styles.boxBtn, item.inBox && styles.boxBtnOn]}
          >
            <Ionicons name={item.inBox ? 'checkmark' : 'add'} size={13} color={C.primary} />
            <Text style={styles.boxBtnText}>{item.inBox ? '담았어요' : '담기'}</Text>
          </Pressable>
        </View>
        {item.comments.length > 0 && (
          <View style={styles.commentPreview}>
            <Text style={styles.commentPreviewText} numberOfLines={1}>
              <Text style={styles.commentPreviewAuthor}>{item.comments[item.comments.length - 1].authorName}  </Text>
              {item.comments[item.comments.length - 1].body}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      {/* ── 하늘 헤더: 타이틀 + 검색 ── */}
      <SkyHeader paddingBottom={18}>
        <Text style={styles.h1}>기도마당</Text>
        <Text style={styles.sub}>이름 모를 성도들과 함께 중보해요</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color={C.textCaption} />
          <TextInput
            style={styles.searchInput}
            placeholder="기도제목 검색"
            placeholderTextColor={C.textPlaceholder}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={C.textPlaceholder} />
            </Pressable>
          )}
        </View>
      </SkyHeader>

      {/* ── 전체/우리동네 + 분류 칩 ── */}
      <View style={styles.filters}>
        <View style={styles.scopeRow}>
          <View style={styles.scopeSeg}>
            {(['all', 'local'] as Scope[]).map((s) => (
              <Pressable key={s} onPress={() => (s === 'local' ? goLocal() : setScope(s))} style={[styles.scopeBtn, scope === s && styles.scopeBtnOn]}>
                {s === 'local' && <Ionicons name="location" size={13} color={scope === s ? C.textInverse : C.textCaption} />}
                <Text style={[styles.scopeText, scope === s && styles.scopeTextOn]}>
                  {s === 'all' ? '전체' : `우리동네`}
                </Text>
              </Pressable>
            ))}
          </View>
          {scope === 'local' && <Text style={styles.regionHint}>{store.myRegion}</Text>}
          <View style={{ flex: 1 }} />
          {(['latest', 'amen'] as Sort[]).map((s) => (
            <Pressable key={s} onPress={() => setSort(s)} hitSlop={6} style={{ paddingVertical: 4, marginLeft: 12 }}>
              <Text style={[styles.sortText, sort === s && styles.sortTextOn]}>{s === 'latest' ? '최신순' : '아멘순'}</Text>
            </Pressable>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {['전체', ...POST_CATEGORIES].map((c) => {
            const on = category === c;
            const meta = c === '전체' ? null : catMeta(c);
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[
                  styles.chip,
                  meta && { backgroundColor: on ? meta.color : catTint(c) },
                  !meta && on && styles.chipAllOn,
                ]}
              >
                {meta && <Ionicons name={meta.icon} size={13} color={on ? '#fff' : meta.color} />}
                <Text
                  style={[
                    styles.chipText,
                    meta && { color: on ? '#fff' : meta.color },
                    !meta && on && { color: C.textInverse },
                  ]}
                >
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingBottom: 140, paddingTop: 4 }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="cloud-outline" size={36} color={C.textPlaceholder} />
            <Text style={styles.emptyText}>
              {query ? '검색 결과가 없어요' : scope === 'local' ? '우리동네 기도제목이 아직 없어요' : '아직 기도제목이 없어요'}
            </Text>
          </View>
        }
      />

      {/* 글쓰기 */}
      <Pressable
        onPress={() => nav.navigate('PostCompose')}
        style={({ pressed }) => [styles.fab, CLOUD_SHADOW.primary, { bottom: insets.bottom + 76 }, pressed && { opacity: 0.9 }]}
      >
        <Ionicons name="create" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    h1: { fontSize: 24, color: C.textStrong, fontFamily: FONT.bold },
    sub: { fontSize: 13.5, color: C.textSecondary, fontFamily: FONT.regular, marginTop: 4 },

    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: C.surface,
      borderRadius: RADIUS.pill,
      paddingHorizontal: 14,
      height: 44,
      marginTop: SPACING.lg,
      ...CLOUD_SHADOW.soft,
    },
    searchInput: { flex: 1, height: '100%', fontSize: 14.5, color: C.text, fontFamily: FONT.regular, paddingVertical: 0, textAlignVertical: 'center' },

    filters: { paddingTop: SPACING.md, paddingBottom: SPACING.sm },
    scopeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.xl },
    scopeSeg: { flexDirection: 'row', backgroundColor: C.backgroundSky, borderRadius: RADIUS.pill, padding: 3 },
    scopeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 13, height: 32, borderRadius: RADIUS.pill, justifyContent: 'center' },
    scopeBtnOn: { backgroundColor: C.text },
    scopeText: { fontSize: 13, color: C.textCaption, fontFamily: FONT.medium },
    scopeTextOn: { color: C.textInverse, fontFamily: FONT.semibold },
    regionHint: { fontSize: 12, color: C.textCaption, fontFamily: FONT.medium, marginLeft: 8 },
    sortText: { fontSize: 13, color: C.textPlaceholder, fontFamily: FONT.medium },
    sortTextOn: { color: C.text, fontFamily: FONT.semibold },

    chips: { gap: 7, paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, height: 34, borderRadius: RADIUS.pill, backgroundColor: C.surface },
    chipAllOn: { backgroundColor: C.text },
    chipText: { fontSize: 13.5, color: C.textSecondary, fontFamily: FONT.semibold },

    post: { backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md },
    postHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    catPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill },
    catPillText: { fontSize: 11.5, fontFamily: FONT.semibold },
    regionPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 4, borderRadius: RADIUS.pill, backgroundColor: C.cardMuted },
    regionText: { fontSize: 11, color: C.textCaption, fontFamily: FONT.medium },
    postMeta: { fontSize: 12, color: C.textCaption, fontFamily: FONT.regular },
    postTitle: { fontSize: 16, color: C.text, fontFamily: FONT.semibold, marginTop: SPACING.sm, lineHeight: 23 },
    postBody: { fontSize: 14, color: C.textBody, fontFamily: FONT.regular, lineHeight: 21, marginTop: 3 },
    postFoot: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: SPACING.md },
    footBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    footText: { fontSize: 12.5, color: C.textCaption, fontFamily: FONT.medium },
    footAuthor: { fontSize: 12, color: C.textPlaceholder, fontFamily: FONT.regular },
    boxBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, height: 30, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
    boxBtnOn: { backgroundColor: C.primaryLight, borderColor: C.primaryLight },
    boxBtnText: { fontSize: 12, color: C.primary, fontFamily: FONT.semibold },

    commentPreview: { marginTop: SPACING.md, backgroundColor: C.cardMuted, borderRadius: RADIUS.sm + 2, paddingHorizontal: 12, paddingVertical: 9 },
    commentPreviewText: { fontSize: 12.5, color: C.textSecondary, fontFamily: FONT.regular },
    commentPreviewAuthor: { fontFamily: FONT.semibold, color: C.textSecondary },

    emptyWrap: { alignItems: 'center', gap: 10, paddingTop: 56 },
    emptyText: { fontSize: 13.5, color: C.textCaption, fontFamily: FONT.regular },

    fab: { position: 'absolute', right: SPACING.xl, width: 52, height: 52, borderRadius: 26, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  });

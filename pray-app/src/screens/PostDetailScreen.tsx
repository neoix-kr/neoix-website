import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { FONT, RADIUS, SPACING, useTheme, CLOUD_SHADOW, Palette } from '../theme';
import { usePrayerStore, timeAgo } from '../store/PrayerStore';
import ScreenHeader from '../components/common/ScreenHeader';
import type { RootStackParamList } from '../navigation/RootNavigator';

export default function PostDetailScreen() {
  const { C } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'PostDetail'>>();
  const nav = useNavigation();
  const store = usePrayerStore();
  const post = store.posts.find((p) => p.id === route.params.id);
  const [comment, setComment] = useState('');

  if (!post) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="기도마당" />
        <View style={styles.empty}><Text style={styles.emptyText}>삭제된 게시물이에요</Text></View>
      </View>
    );
  }

  const sendComment = () => {
    if (!comment.trim()) return;
    store.addComment(post.id, comment.trim());
    setComment('');
  };

  const openReport = () => {
    Alert.alert('이 글을 신고할까요?', '신고된 글은 내 화면에서 바로 숨겨지고, 운영진이 검토해요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '숨기기만',
        onPress: () => { store.hidePost(post.id); nav.goBack(); },
      },
      {
        text: '신고하기',
        style: 'destructive',
        onPress: () => {
          store.reportPost(post.id, 'user-report');
          nav.goBack();
          Alert.alert('신고 접수', '알려주셔서 감사해요. 검토 후 필요한 조치를 할게요.');
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="기도마당"
        right={
          <Pressable onPress={openReport} hitSlop={10} style={{ padding: 6 }}>
            <Ionicons name="ellipsis-horizontal" size={21} color={C.textSecondary} />
          </Pressable>
        }
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* 본문 */}
          <View style={[styles.card, CLOUD_SHADOW.soft]}>
            <View style={styles.head}>
              <View style={styles.avatar}>
                {post.isAnonymous
                  ? <Ionicons name="person" size={14} color={C.textCaption} />
                  : <Text style={styles.avatarText}>{post.authorName.charAt(0)}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.author}>{post.authorName}</Text>
                <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
              </View>
              <View style={styles.catTag}><Text style={styles.catTagText}>{post.category}</Text></View>
            </View>
            <Text style={styles.title}>{post.title}</Text>
            <Text style={styles.body}>{post.body}</Text>

            <View style={styles.actions}>
              <Pressable onPress={() => store.toggleAmen(post.id)} style={({ pressed }) => [styles.amenBtn, post.amened && styles.amenBtnOn, pressed && { opacity: 0.9 }]}>
                <Ionicons name={post.amened ? 'heart' : 'heart-outline'} size={17} color={post.amened ? '#fff' : C.like} />
                <Text style={[styles.amenText, post.amened && { color: '#fff' }]}>아멘 {post.amenCount}</Text>
              </Pressable>
              <Pressable onPress={() => store.togglePray(post.id)} style={({ pressed }) => [styles.prayBtn, post.praying && styles.prayBtnOn, pressed && { opacity: 0.9 }]}>
                <MaterialCommunityIcons name="hands-pray" size={16} color={post.praying ? '#fff' : C.primary} />
                <Text style={[styles.prayText, post.praying && { color: '#fff' }]}>기도할게요 {post.prayCount}</Text>
              </Pressable>
              <Pressable
                onPress={() => store.addPostToBox(post.id)}
                style={({ pressed }) => [styles.boxBtn, post.inBox && { backgroundColor: C.primaryLight, borderColor: C.primaryLight }, pressed && { opacity: 0.9 }]}
              >
                <Ionicons name={post.inBox ? 'checkmark' : 'add'} size={15} color={C.primary} />
                <Text style={styles.boxText}>{post.inBox ? '기도함에 담았어요' : '내 기도함에 담기'}</Text>
              </Pressable>
            </View>
          </View>

          {/* 댓글 */}
          <Text style={styles.sectionTitle}>댓글 {post.comments.length}</Text>
          {post.comments.length === 0 ? (
            <View style={[styles.card, CLOUD_SHADOW.soft, { alignItems: 'center', paddingVertical: 26 }]}>
              <Text style={styles.emptyText}>첫 번째로 위로의 말을 남겨보세요</Text>
            </View>
          ) : (
            <View style={[styles.group, CLOUD_SHADOW.soft]}>
              {post.comments.map((c, idx) => (
                <View key={c.id} style={[styles.commentRow, idx > 0 && styles.rowDivider]}>
                  <View style={styles.commentAvatar}><Text style={styles.commentAvatarText}>{c.authorName.charAt(0)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentAuthor}>{c.authorName}</Text>
                    <Text style={styles.commentBody}>{c.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* 댓글 입력 */}
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            style={styles.input}
            placeholder="따뜻한 한마디를 남겨요"
            placeholderTextColor={C.textPlaceholder}
            value={comment}
            onChangeText={setComment}
            onSubmitEditing={sendComment}
            returnKeyType="send"
          />
          <Pressable onPress={sendComment} disabled={!comment.trim()} style={[styles.sendBtn, !comment.trim() && { opacity: 0.4 }]}>
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (C: Palette) =>
  StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { paddingHorizontal: SPACING.xl, paddingBottom: 30 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13.5, color: C.textCaption, fontFamily: FONT.regular },

  card: { backgroundColor: C.surface, borderRadius: RADIUS.lg, padding: SPACING.xl, marginBottom: SPACING.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.cardMuted, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, color: C.avatarText, fontFamily: FONT.medium },
  author: { fontSize: 14, color: C.textSecondary, fontFamily: FONT.medium },
  time: { fontSize: 12, color: C.textPlaceholder, fontFamily: FONT.regular, marginTop: 1 },
  catTag: { backgroundColor: C.cardMuted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  catTagText: { fontSize: 11.5, color: C.textSecondary, fontFamily: FONT.semibold },
  title: { fontSize: 20, color: C.text, fontFamily: FONT.bold, lineHeight: 30, marginTop: SPACING.md },
  body: { fontSize: 15, color: C.textBody, fontFamily: FONT.regular, lineHeight: 26, marginTop: SPACING.sm },

  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: SPACING.xl },
  prayBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 40, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.primaryLight, backgroundColor: C.primaryLight },
  prayBtnOn: { backgroundColor: C.primary, borderColor: C.primary },
  prayText: { fontSize: 14, color: C.primary, fontFamily: FONT.semibold },
  amenBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 40, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.errorLight, backgroundColor: C.errorLight },
  amenBtnOn: { backgroundColor: C.like, borderColor: C.like },
  amenText: { fontSize: 14, color: C.like, fontFamily: FONT.semibold },
  boxBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, height: 40, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  boxText: { fontSize: 14, color: C.primary, fontFamily: FONT.semibold },

  sectionTitle: { fontSize: 13, color: C.textCaption, fontFamily: FONT.semibold, marginBottom: SPACING.sm, paddingHorizontal: 2 },
  group: { backgroundColor: C.surface, borderRadius: RADIUS.lg, overflow: 'hidden' },
  commentRow: { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.lg, paddingVertical: 13 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider },
  commentAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.avatarBg, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { fontSize: 12, color: C.avatarText, fontFamily: FONT.medium },
  commentAuthor: { fontSize: 13, color: C.textSecondary, fontFamily: FONT.medium },
  commentBody: { fontSize: 14, color: C.textBody, fontFamily: FONT.regular, lineHeight: 21, marginTop: 2 },

  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SPACING.lg, paddingTop: 10, backgroundColor: C.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  input: { flex: 1, height: 42, backgroundColor: C.cardMuted, borderRadius: RADIUS.pill, paddingHorizontal: 16, fontSize: 14.5, color: C.text, fontFamily: FONT.regular },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
});

// 설정 — 계정·약관·앱 정보·계정 삭제(Apple 5.1.1(v))·사업자 정보(전자상거래법 표시)
// 스타일은 ArchiveScreen(P0 exemplar)의 헤더/카드 패턴을 따른다.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { deleteMyAccount } from '../lib/account';
import { useAuth } from '../contexts/AuthContext';
import { useMember } from '../contexts/MemberContext';
import { useTheme } from '../theme/ThemeContext';
import { TYPO, SPACING, RADIUS } from '../theme/colors';
import { APP_VERSION } from '../appVersion';

const TERMS_URL = 'https://neoix.kr/terms/';
const PRIVACY_URL = 'https://neoix.kr/privacy/';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { member } = useMember();
  const { COLORS, SHADOWS } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [deleting, setDeleting] = useState(false);
  const s = useMemo(() => styles(COLORS), [COLORS]);

  // 계정 삭제 (Apple 5.1.1(v)) — NEOIX 통합 계정 전체 삭제, 2단계 확인.
  // 순서: 서버 데이터(RPC가 mp_* 선삭제 후 auth 계정 삭제) → 로컬 signOut.
  const onDeleteAccount = () => {
    Alert.alert(
      '계정을 삭제할까요?',
      '계정과 모든 의정 기록·연락처·민원 데이터가 영구 삭제되며 되돌릴 수 없어요.\n\nNEOIX 통합 계정이라 폴리·기도해요 등 다른 NEOIX 앱에서도 로그인할 수 없게 됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () =>
            Alert.alert('정말 삭제할까요?', '이 작업은 되돌릴 수 없어요.', [
              { text: '취소', style: 'cancel' },
              {
                text: '영구 삭제',
                style: 'destructive',
                onPress: async () => {
                  try {
                    setDeleting(true);
                    const { error } = await deleteMyAccount();
                    if (error) throw error;
                    await signOut();
                  } catch {
                    setDeleting(false);
                    Alert.alert('삭제 실패', '잠시 후 다시 시도해 주세요.');
                  }
                },
              },
            ]),
        },
      ],
    );
  };

  const openUrl = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => {});

  const Row = ({ label, onPress, danger, right }: {
    label: string; onPress?: () => void; danger?: boolean; right?: string;
  }) => (
    <Pressable style={s.row} onPress={onPress} disabled={!onPress}>
      <Text style={[s.rowLabel, danger && { color: COLORS.error }]}>{label}</Text>
      {right ? (
        <Text style={s.rowRight}>{right}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={COLORS.textCaption} />
      ) : null}
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={[s.header, { paddingTop: insets.top + SPACING.md }]}>
        <View style={s.headerRow}>
          <Text style={s.h1}>설정</Text>
          <Pressable hitSlop={10} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={COLORS.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.base, paddingBottom: insets.bottom + 40, gap: SPACING.md }}>
        {/* 계정 */}
        <View style={[s.card, SHADOWS.standard]}>
          <Text style={s.sectionTitle}>계정</Text>
          <View style={s.row}>
            <Text style={s.rowLabel}>{member?.name ?? '—'}</Text>
            <Text style={s.rowRight}>{member?.position ?? ''}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rowLabel}>이메일</Text>
            <Text style={s.rowRight}>{user?.email ?? '—'}</Text>
          </View>
          <Row label="로그아웃" onPress={() => {
            Alert.alert('로그아웃할까요?', '이 기기에서만 로그아웃돼요.', [
              { text: '취소', style: 'cancel' },
              { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
            ]);
          }} />
        </View>

        {/* 약관·정책 */}
        <View style={[s.card, SHADOWS.standard]}>
          <Text style={s.sectionTitle}>약관·정책</Text>
          <Row label="이용약관" onPress={() => openUrl(TERMS_URL)} />
          <Row label="개인정보처리방침" onPress={() => openUrl(PRIVACY_URL)} />
        </View>

        {/* 앱 정보 */}
        <View style={[s.card, SHADOWS.standard]}>
          <Text style={s.sectionTitle}>앱 정보</Text>
          <View style={s.row}>
            <Text style={s.rowLabel}>버전</Text>
            <Text style={s.rowRight}>{APP_VERSION}</Text>
          </View>
          <Row label="문의" right="support@polyx.kr" />
        </View>

        {/* 계정 삭제 */}
        <View style={[s.card, SHADOWS.standard]}>
          <Row label={deleting ? '삭제 중…' : '계정 삭제'} danger onPress={deleting ? undefined : onDeleteAccount} />
          <Text style={s.deleteNote}>
            계정과 모든 데이터가 영구 삭제돼요. NEOIX 통합 계정이라 다른 NEOIX 앱에도 함께 적용됩니다.
          </Text>
        </View>

        {/* 사업자 정보 (전자상거래법 표시) */}
        <Text style={s.bizInfo}>
          네오익스(NEOIX) · 대표 박정겸{'\n'}사업자등록번호 292-33-01829 · jg@neoix.kr
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = (C: any) => StyleSheet.create({
  header: { paddingHorizontal: SPACING.base, paddingBottom: SPACING.md, backgroundColor: C.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { ...TYPO.displayLarge, color: C.text },
  card: { backgroundColor: C.surface, borderRadius: RADIUS.comfortable, padding: SPACING.base },
  sectionTitle: { ...TYPO.subtitle, color: C.text, marginBottom: SPACING.xs },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.md - 2, gap: SPACING.md,
  },
  rowLabel: { ...TYPO.body, color: C.textBody },
  rowRight: { ...TYPO.bodySmall, color: C.textCaption, flexShrink: 1 },
  deleteNote: { ...TYPO.caption, color: C.textCaption, lineHeight: 17 },
  bizInfo: { ...TYPO.caption, color: C.textCaption, textAlign: 'center', lineHeight: 18, marginTop: SPACING.md },
});

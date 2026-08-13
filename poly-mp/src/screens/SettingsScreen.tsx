// 설정 — 계정·약관·앱 정보·계정 삭제(Apple 5.1.1(v))·사업자 정보(전자상거래법 표시)
// 화면 문법은 폴리 공용(Header + 카드 radius 18 + subtle 섀도 + 바깥 섹션 라벨)을 따른다.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Header from '../components/Header';
import GlassIconButton from '../components/GlassIconButton';
import { deleteMyAccount } from '../lib/account';
import { useAuth } from '../contexts/AuthContext';
import { useMember } from '../contexts/MemberContext';
import { useTheme, type ThemeColors, type ThemeShadows } from '../theme/ThemeContext';
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
  const s = useMemo(() => makeStyles(COLORS, SHADOWS), [COLORS]);

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
        <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
      ) : null}
    </Pressable>
  );

  const Divider = () => <View style={s.divider} />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Header
        title="설정"
        rightElement={
          <GlassIconButton
            icon="close"
            onPress={() => navigation.goBack()}
            size={40}
            iconSize={22}
            iconColor={COLORS.grey700}
            fallbackVariant="plain"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          />
        }
      />

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* 계정 */}
        <Text style={s.sectionTitle}>계정</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.rowLabel}>{member?.name ?? '—'}</Text>
            <Text style={s.rowRight}>{member?.position ?? ''}</Text>
          </View>
          <Divider />
          <View style={s.row}>
            <Text style={s.rowLabel}>이메일</Text>
            <Text style={s.rowRight}>{user?.email ?? '—'}</Text>
          </View>
          <Divider />
          <Row label="로그아웃" onPress={() => {
            Alert.alert('로그아웃할까요?', '이 기기에서만 로그아웃돼요.', [
              { text: '취소', style: 'cancel' },
              { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
            ]);
          }} />
        </View>

        {/* 약관·정책 */}
        <Text style={s.sectionTitle}>약관·정책</Text>
        <View style={s.card}>
          <Row label="이용약관" onPress={() => openUrl(TERMS_URL)} />
          <Divider />
          <Row label="개인정보처리방침" onPress={() => openUrl(PRIVACY_URL)} />
        </View>

        {/* 앱 정보 */}
        <Text style={s.sectionTitle}>앱 정보</Text>
        <View style={s.card}>
          <View style={s.row}>
            <Text style={s.rowLabel}>버전</Text>
            <Text style={s.rowRight}>{APP_VERSION}</Text>
          </View>
          <Divider />
          <Row label="문의" right="support@polyx.kr" />
        </View>

        {/* 계정 삭제 */}
        <View style={[s.card, { marginTop: 8 }]}>
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

const makeStyles = (COLORS: ThemeColors, SHADOWS: ThemeShadows) => StyleSheet.create({
  // 섹션 라벨 — 카드 바깥 위, 소문자 톤
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textTertiary,
    letterSpacing: -0.2,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  // 폴리 리스트 카드 문법 — radius 18 + subtle
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 16,
    borderRadius: 18,
    ...SHADOWS.subtle,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    gap: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  rowRight: {
    fontSize: 13,
    color: COLORS.textTertiary,
    letterSpacing: -0.2,
    flexShrink: 1,
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.divider,
  },
  deleteNote: {
    fontSize: 11.5,
    color: COLORS.textTertiary,
    lineHeight: 16,
    letterSpacing: -0.2,
    paddingBottom: 13,
  },
  bizInfo: {
    fontSize: 11.5,
    color: COLORS.textCaption,
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: -0.2,
    marginTop: 12,
  },
});

// 로그인 — 애플(심사 4.8 필수, 최상단 검정) · 카카오 · 이메일
import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { TYPO, SPACING, RADIUS } from '../theme/colors';

const TERMS_URL = 'https://neoix.kr/terms/';
const PRIVACY_URL = 'https://neoix.kr/privacy/';

export default function LoginScreen() {
  const { signInEmail, signUpEmail, signInKakao, signInApple } = useAuth();
  const { COLORS, SHADOWS } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [agreed, setAgreed] = useState(false); // 필수 동의 — 만14세·약관·개인정보 (가입 모드에서만 노출)

  const run = async (fn: () => Promise<{ error: any }>, label: string) => {
    if (busy) return;
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) Alert.alert(label, String(error?.message ?? error));
  };

  const emailAuth = () => {
    if (!email.trim() || !pw) return Alert.alert('입력 확인', '이메일과 비밀번호를 입력해 주세요.');
    if (mode === 'in') return run(() => signInEmail(email.trim(), pw), '로그인 실패');
    if (!agreed) return Alert.alert('동의 확인', '만 14세 이상 확인과 약관·개인정보 동의가 필요해요.');
    run(() => signUpEmail(email.trim(), pw, email.split('@')[0]), '가입 실패');
  };

  const s = styles(COLORS);
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={[s.wrap, { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.brand}>폴리 오피스</Text>
        <Text style={s.tagline}>의정활동 기록·민원·후원회·조직 관리{'\n'}의원의 하루를 한 앱으로</Text>

        {/* 이메일 폼이 위, 카카오·애플은 아래 — 확정 배치(로그인 소셜버튼 하단 규칙) */}
        <View style={[s.card, SHADOWS.standard]}>
          <TextInput
            style={s.input} placeholder="이메일" placeholderTextColor={COLORS.textPlaceholder}
            autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}
          />
          <TextInput
            style={s.input} placeholder="비밀번호" placeholderTextColor={COLORS.textPlaceholder}
            secureTextEntry value={pw} onChangeText={setPw}
          />
          {/* 필수 동의 — 만14세·약관·개인정보 (개인정보보호법·전자상거래법 대응, poly 최소형) */}
          {mode === 'up' && (
            <Pressable style={s.consentRow} onPress={() => setAgreed(v => !v)}>
              <View style={[s.checkbox, agreed && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                {agreed && <Text style={{ color: COLORS.textInverse, fontSize: 11, fontWeight: '800' }}>✓</Text>}
              </View>
              <Text style={s.consentText}>
                <Text style={{ color: COLORS.primary, fontWeight: '700' }}>(필수)</Text> 만 14세 이상이며{' '}
                <Text style={s.consentLink} onPress={() => WebBrowser.openBrowserAsync(TERMS_URL).catch(() => {})}>이용약관</Text>과{' '}
                <Text style={s.consentLink} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL).catch(() => {})}>개인정보처리방침</Text>에 동의합니다
              </Text>
            </Pressable>
          )}
          <Pressable style={[s.btn, { backgroundColor: COLORS.primary }]} disabled={busy} onPress={emailAuth}>
            <Text style={[s.btnText, { color: COLORS.textInverse }]}>{mode === 'in' ? '로그인' : '회원가입'}</Text>
          </Pressable>
          <Pressable onPress={() => setMode(m => (m === 'in' ? 'up' : 'in'))}>
            <Text style={s.switch}>{mode === 'in' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있어요 · 로그인'}</Text>
          </Pressable>

          <View style={s.hr}><View style={s.hrLine} /><Text style={s.hrText}>또는 간편 로그인</Text><View style={s.hrLine} /></View>

          <Pressable style={[s.btn, { backgroundColor: '#FEE500' }]} disabled={busy}
            onPress={() => run(signInKakao, '카카오 로그인')}>
            <Text style={[s.btnText, { color: '#191600' }]}>카카오로 계속하기</Text>
          </Pressable>
          {Platform.OS === 'ios' && (
            <Pressable style={[s.btn, { backgroundColor: '#000' }]} disabled={busy}
              onPress={() => run(signInApple, 'Apple 로그인')}>
              <Text style={[s.btnText, { color: '#fff' }]}> Apple로 계속하기</Text>
            </Pressable>
          )}
        </View>

        <Text style={s.note}>네오익스 통합계정으로 로그인돼요. 폴리 계정이 있다면 그대로 쓰시면 됩니다.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (C: any) => StyleSheet.create({
  wrap: { paddingHorizontal: SPACING.xl },
  brand: { ...TYPO.displayHero, color: C.text, letterSpacing: -0.5 },
  tagline: { ...TYPO.body, color: C.textSecondary, marginTop: SPACING.sm, marginBottom: SPACING.xxl, lineHeight: 22 },
  card: { backgroundColor: C.surface, borderRadius: RADIUS.large, padding: SPACING.lg, gap: SPACING.sm },
  btn: { height: 50, borderRadius: RADIUS.standard, alignItems: 'center', justifyContent: 'center' },
  btnText: { ...TYPO.subtitle },
  hr: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginVertical: SPACING.xs },
  hrLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.border },
  hrText: { ...TYPO.caption, color: C.textCaption },
  input: {
    height: 48, borderRadius: RADIUS.standard, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: SPACING.base, color: C.text, backgroundColor: C.surface, ...TYPO.bodyLarge,
  },
  switch: { ...TYPO.bodySmall, color: C.primary, textAlign: 'center', marginTop: SPACING.xs, fontWeight: '600' },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginTop: SPACING.xs },
  checkbox: {
    width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: C.borderStrong,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  consentText: { ...TYPO.caption, color: C.textSecondary, flex: 1, lineHeight: 17 },
  consentLink: { color: C.primary, fontWeight: '600', textDecorationLine: 'underline' },
  note: { ...TYPO.caption, color: C.textCaption, textAlign: 'center', marginTop: SPACING.lg, lineHeight: 18 },
});

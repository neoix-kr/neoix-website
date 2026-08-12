// 로그인 — poly-build auth/LoginScreen과 동일한 디자인 언어:
// 라벨+밑줄 입력, 인라인 에러, primary 버튼(radius 16), "또는 간편하게 로그인" 후 카톡/Apple.
// 소셜 버튼은 항상 하단(확정 배치 규칙). 이메일 폼 하나로 로그인/가입 모드 토글.
import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/ThemeContext';

const TERMS_URL = 'https://neoix.kr/terms/';
const PRIVACY_URL = 'https://neoix.kr/privacy/';

export default function LoginScreen() {
  const { signInEmail, signUpEmail, signInKakao, signInApple } = useAuth();
  const { COLORS } = useTheme();
  const styles = useMemo(() => makeStyles(COLORS), [COLORS]);
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [agreed, setAgreed] = useState(false); // 필수 동의 — 만14세·약관·개인정보 (가입 모드에서만 노출)
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'kakao' | 'apple' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleEmail = async () => {
    setErrorMsg(null);
    if (!email.trim() || !password.trim()) {
      setErrorMsg('이메일과 비밀번호를 입력하세요.');
      return;
    }
    if (mode === 'up' && !agreed) {
      setErrorMsg('만 14세 이상 확인과 약관·개인정보 동의가 필요해요.');
      return;
    }
    setIsLoading(true);
    const { error } = mode === 'in'
      ? await signInEmail(email.trim(), password)
      : await signUpEmail(email.trim(), password, email.split('@')[0]);
    setIsLoading(false);
    if (error) {
      setErrorMsg(mode === 'in' ? '이메일 또는 비밀번호를 확인하세요.' : String((error as any)?.message ?? '가입에 실패했어요.'));
    }
    // 성공 시 세션 게이트가 자동 전환
  };

  const handleSocial = async (provider: 'kakao' | 'apple') => {
    setErrorMsg(null);
    setSocialLoading(provider);
    const { error } = provider === 'kakao' ? await signInKakao() : await signInApple();
    setSocialLoading(null);
    if (error) setErrorMsg(String((error as any)?.message ?? '로그인에 실패했어요. 잠시 후 다시 시도해주세요.'));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={styles.body}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.brand}>폴리 오피스</Text>
          <Text style={styles.tagline}>의정활동 기록·민원·후원회·조직 관리{'\n'}의원의 하루를 한 앱으로</Text>

          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={styles.input}
            placeholder="이메일 주소"
            placeholderTextColor={COLORS.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>비밀번호</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordInput}
              placeholder="비밀번호"
              placeholderTextColor={COLORS.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* 필수 동의 — 만14세·약관·개인정보 (가입 모드, poly SignUpScreen 한 줄형) */}
          {mode === 'up' && (
            <Pressable style={styles.consentRow} onPress={() => setAgreed(v => !v)}>
              <View style={[styles.checkbox, agreed && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                {agreed && <Ionicons name="checkmark" size={13} color={COLORS.textInverse} />}
              </View>
              <Text style={styles.consentText}>
                <Text style={{ color: COLORS.primary, fontWeight: '700' }}>(필수)</Text> 만 14세 이상이며{' '}
                <Text style={styles.consentLink} onPress={() => WebBrowser.openBrowserAsync(TERMS_URL).catch(() => {})}>이용약관</Text>과{' '}
                <Text style={styles.consentLink} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL).catch(() => {})}>개인정보처리방침</Text>에 동의합니다
              </Text>
            </Pressable>
          )}

          {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

          <TouchableOpacity
            style={[styles.loginBtn, isLoading && { opacity: 0.6 }]}
            onPress={handleEmail}
            disabled={isLoading || !!socialLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.textInverse} />
            ) : (
              <Text style={styles.loginBtnText}>{mode === 'in' ? '로그인' : '회원가입'}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.bottomRow}>
            <TouchableOpacity onPress={() => { setErrorMsg(null); setMode(m => (m === 'in' ? 'up' : 'in')); }}>
              <Text style={styles.linkText}>{mode === 'in' ? '회원가입' : '이미 계정이 있어요 · 로그인'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>또는 간편하게 로그인</Text>
            <View style={styles.orLine} />
          </View>

          {/* 카카오 — 공식 가이드: #FEE500 + 검정 라벨 (양 테마 고정색) */}
          <TouchableOpacity
            style={[styles.kakaoBtn, socialLoading === 'kakao' && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={() => handleSocial('kakao')}
            disabled={!!socialLoading || isLoading}
          >
            {socialLoading === 'kakao' ? (
              <ActivityIndicator color="#191919" />
            ) : (
              <>
                <Ionicons name="chatbubble" size={17} color="#191919" />
                <Text style={styles.kakaoBtnText}>카톡으로 로그인하기</Text>
              </>
            )}
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.appleBtn, socialLoading === 'apple' && { opacity: 0.7 }]}
              activeOpacity={0.85}
              onPress={() => handleSocial('apple')}
              disabled={!!socialLoading || isLoading}
            >
              {socialLoading === 'apple' ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={18} color={COLORS.text} />
                  <Text style={styles.appleBtnText}>Apple로 로그인하기</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.note}>네오익스 통합계정으로 로그인돼요. 폴리 계정이 있다면 그대로 쓰시면 됩니다.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (COLORS: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  body: { paddingHorizontal: 24 },
  brand: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.6,
    marginTop: 48,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
    letterSpacing: -0.2,
    marginTop: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textTertiary,
    marginTop: 20,
    letterSpacing: -0.1,
  },
  input: {
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.border,
    paddingVertical: 13,
    fontSize: 17,
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.border,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 17,
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  eyeBtn: { paddingHorizontal: 8, paddingVertical: 13 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 18 },
  checkbox: {
    width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: COLORS.borderStrong,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  consentText: { fontSize: 12.5, color: COLORS.textSecondary, flex: 1, lineHeight: 18, letterSpacing: -0.1 },
  consentLink: { color: COLORS.primary, fontWeight: '600', textDecorationLine: 'underline' },
  errorText: { fontSize: 13, color: COLORS.error, marginTop: 14, letterSpacing: -0.1 },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.textInverse, letterSpacing: -0.2 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, gap: 12 },
  linkText: { fontSize: 14, color: COLORS.primary, fontWeight: '600', letterSpacing: -0.2 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, marginBottom: 2 },
  orLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  orText: { fontSize: 12, color: COLORS.textTertiary, letterSpacing: -0.1 },
  kakaoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#FEE500',
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 14,
  },
  kakaoBtnText: { fontSize: 15.5, fontWeight: '700', color: '#191919', letterSpacing: -0.2 },
  appleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: COLORS.surface, borderRadius: 14, paddingVertical: 15, marginTop: 10,
    borderWidth: 1, borderColor: COLORS.borderStrong,
  },
  appleBtnText: { fontSize: 15.5, fontWeight: '700', color: COLORS.text, letterSpacing: -0.2 },
  note: {
    fontSize: 12, color: COLORS.textCaption, textAlign: 'center', lineHeight: 18,
    letterSpacing: -0.1, marginTop: 24,
  },
});

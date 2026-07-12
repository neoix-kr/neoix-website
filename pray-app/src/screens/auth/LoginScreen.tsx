import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { FONT, RADIUS, SPACING, useTheme, Palette } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';

const CLOUD_BIG = require('../../../assets/cloud-big.png');
const CLOUD_SMALL = require('../../../assets/cloud-small.png');

// iOS 26 리퀴드 글래스 로그인 — 첫 화면은 소셜 3버튼(카카오/구글/이메일),
// 이메일 선택 시에만 폼 노출. 카카오는 네이티브(카톡 앱) 직행.
export default function LoginScreen() {
  const { C, isDark } = useTheme();
  const styles = useMemo(() => createStyles(C, isDark), [C, isDark]);
  const insets = useSafeAreaInsets();
  const { signInEmail, signUpEmail, signInKakao, signInGoogle } = useAuth();
  const [step, setStep] = useState<'select' | 'email'>('select');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const openTerms = () => WebBrowser.openBrowserAsync('https://neoix.kr/terms/');
  const openPrivacy = () => WebBrowser.openBrowserAsync('https://neoix.kr/privacy/');

  const submit = async () => {
    if (!email || !password) return Alert.alert('입력 확인', '이메일과 비밀번호를 입력해 주세요.');
    if (mode === 'signup' && !name) return Alert.alert('입력 확인', '이름을 입력해 주세요.');
    if (mode === 'signup' && !agreed) return Alert.alert('동의 필요', '만 14세 이상 확인 및 약관 동의에 체크해 주세요.');
    setBusy(true);
    const { error } = mode === 'signin'
      ? await signInEmail(email.trim(), password)
      : await signUpEmail(email.trim(), password, name.trim());
    setBusy(false);
    if (error) Alert.alert('로그인 실패', error.message ?? '다시 시도해 주세요.');
  };

  const social = async (fn: () => Promise<{ error: any }>, label: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) Alert.alert(`${label} 로그인 실패`, error.message ?? '다시 시도해 주세요.');
  };

  const glassPh = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(60,70,95,0.5)';

  return (
    <LinearGradient colors={C.sky} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.root}>
      {/* 뭉게구름 */}
      <Image source={CLOUD_BIG} resizeMode="contain" style={[styles.cloudBig, { top: insets.top + 30 }]} />
      <Image source={CLOUD_SMALL} resizeMode="contain" style={[styles.cloudSmall, { top: insets.top + 150 }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 브랜드 */}
          <View style={styles.brand}>
            <View style={styles.logoWrap}>
              <Image source={require('../../../assets/icon.png')} style={styles.logo} />
            </View>
            <Text style={styles.title}>기도해요</Text>
            <Text style={styles.subtitle}>서로의 기도제목을 나누고 함께 기도해요</Text>
          </View>

          {step === 'select' ? (
            <View style={{ gap: 12 }}>
              {/* 카카오 — 네이티브 직행 */}
              <Pressable disabled={busy} style={({ pressed }) => [styles.kakao, (pressed || busy) && { opacity: 0.92 }]} onPress={() => social(signInKakao, '카카오')}>
                <Ionicons name="chatbubble" size={17} color="#3C1E1E" />
                <Text style={styles.kakaoText}>카카오로 시작하기</Text>
              </Pressable>

              {/* 구글 */}
              <Pressable disabled={busy} style={({ pressed }) => [styles.google, (pressed || busy) && { opacity: 0.92 }]} onPress={() => social(signInGoogle, '구글')}>
                <Ionicons name="logo-google" size={17} color="#1F1F1F" />
                <Text style={styles.googleText}>구글로 시작하기</Text>
              </Pressable>

              {/* 이메일 */}
              <Pressable disabled={busy} style={({ pressed }) => [styles.emailBtn, (pressed || busy) && { opacity: 0.9 }]} onPress={() => setStep('email')}>
                <Ionicons name="mail-outline" size={17} color={C.text} />
                <Text style={styles.emailBtnText}>이메일로 시작하기</Text>
              </Pressable>
            </View>
          ) : (
            <BlurView intensity={isDark ? 40 : 60} tint={isDark ? 'dark' : 'light'} style={styles.card}>
              <Pressable onPress={() => setStep('select')} style={styles.backRow} hitSlop={8}>
                <Ionicons name="chevron-back" size={16} color={C.textSecondary} />
                <Text style={styles.backText}>다른 방법으로 시작하기</Text>
              </Pressable>

              {mode === 'signup' && (
                <TextInput style={styles.input} placeholder="이름" placeholderTextColor={glassPh} value={name} onChangeText={setName} />
              )}
              <TextInput style={styles.input} placeholder="이메일" placeholderTextColor={glassPh} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
              <TextInput style={styles.input} placeholder="비밀번호" placeholderTextColor={glassPh} secureTextEntry value={password} onChangeText={setPassword} />

              {mode === 'signup' && (
                <Pressable onPress={() => setAgreed(!agreed)} style={styles.agreeRow} hitSlop={6}>
                  <View style={[styles.agreeBox, agreed && styles.agreeBoxOn]}>
                    {agreed && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </View>
                  <Text style={styles.agreeText}>
                    만 14세 이상이며 <Text style={styles.agreeLink} onPress={openTerms}>이용약관</Text>과{' '}
                    <Text style={styles.agreeLink} onPress={openPrivacy}>개인정보처리방침</Text>에 동의합니다
                  </Text>
                </Pressable>
              )}

              <Pressable onPress={submit} disabled={busy} style={({ pressed }) => [styles.primaryBtn, (pressed || busy) && { opacity: 0.9 }]}>
                <Text style={styles.primaryText}>{busy ? '잠시만요…' : mode === 'signin' ? '로그인' : '회원가입'}</Text>
              </Pressable>

              <Pressable onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')} style={styles.toggle}>
                <Text style={styles.toggleText}>
                  {mode === 'signin' ? '처음이신가요?  회원가입' : '이미 계정이 있으신가요?  로그인'}
                </Text>
              </Pressable>
            </BlurView>
          )}

          <Text style={styles.footer}>
            로그인 시 <Text style={styles.footerLink} onPress={openTerms}>이용약관</Text> 및{' '}
            <Text style={styles.footerLink} onPress={openPrivacy}>개인정보처리방침</Text>에 동의하는 것으로 봅니다{'\n'}
            네오익스 통합계정 · 한 번 가입으로 모든 서비스에서 로그인
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const createStyles = (C: Palette, isDark: boolean) => {
  const glassField = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)';
  const glassBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.7)';
  return StyleSheet.create({
    root: { flex: 1 },
    cloudBig: { position: 'absolute', right: -70, width: 320, height: 88, opacity: isDark ? 0.2 : 0.9 },
    cloudSmall: { position: 'absolute', left: -40, width: 180, height: 66, opacity: isDark ? 0.14 : 0.6 },

    scroll: { paddingHorizontal: SPACING.xxl, minHeight: '100%', justifyContent: 'center' },

    brand: { alignItems: 'center', marginBottom: SPACING.xxl },
    logoWrap: {
      width: 92,
      height: 92,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.35)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.6)',
      shadowColor: '#2A3550',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
    },
    logo: { width: 72, height: 72, borderRadius: 18 },
    title: { fontSize: 28, color: C.textStrong, fontFamily: FONT.bold, marginTop: SPACING.lg, letterSpacing: -0.3 },
    subtitle: { fontSize: 14, color: C.textSecondary, fontFamily: FONT.regular, marginTop: 7 },

    kakao: {
      height: 54,
      borderRadius: RADIUS.lg,
      backgroundColor: '#FEE500',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      shadowColor: '#C9A800',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 14,
    },
    kakaoText: { color: '#3C1E1E', fontSize: 16, fontFamily: FONT.semibold },
    google: {
      height: 54,
      borderRadius: RADIUS.lg,
      backgroundColor: '#FFFFFF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: 'rgba(60,70,95,0.15)',
      shadowColor: '#2A3550',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 14,
    },
    googleText: { color: '#1F1F1F', fontSize: 16, fontFamily: FONT.semibold },
    emailBtn: {
      height: 54,
      borderRadius: RADIUS.lg,
      backgroundColor: glassField,
      borderWidth: 1,
      borderColor: glassBorder,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    emailBtnText: { color: C.text, fontSize: 16, fontFamily: FONT.semibold },

    card: {
      borderRadius: 28,
      overflow: 'hidden',
      padding: SPACING.xl,
      gap: 11,
      borderWidth: 1,
      borderColor: glassBorder,
      shadowColor: '#2A3550',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.16,
      shadowRadius: 28,
    },
    backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', marginBottom: 2 },
    backText: { fontSize: 13, color: C.textSecondary, fontFamily: FONT.medium },
    input: {
      height: 54,
      backgroundColor: glassField,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: glassBorder,
      paddingHorizontal: 18,
      fontSize: 15.5,
      fontFamily: FONT.regular,
      color: C.text,
    },
    primaryBtn: {
      height: 54,
      borderRadius: RADIUS.lg,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 14,
    },
    primaryText: { color: '#fff', fontSize: 16, fontFamily: FONT.semibold },
    agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingHorizontal: 2, marginTop: 2 },
    agreeBox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(60,70,95,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    agreeBoxOn: { backgroundColor: C.primary, borderColor: C.primary },
    agreeText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: C.textSecondary, fontFamily: FONT.regular },
    agreeLink: { textDecorationLine: 'underline', color: C.text, fontFamily: FONT.medium },
    toggle: { alignSelf: 'center', marginTop: 6, padding: 6 },
    toggleText: { fontSize: 13, color: C.textSecondary, fontFamily: FONT.medium },

    footer: { fontSize: 12, lineHeight: 19, color: C.textSecondary, fontFamily: FONT.regular, textAlign: 'center', marginTop: SPACING.xxl, opacity: 0.85 },
    footerLink: { textDecorationLine: 'underline', fontFamily: FONT.medium },
  });
};

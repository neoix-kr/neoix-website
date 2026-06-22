// ============================================================
// NEOIX 통합 계정 모듈 (Expo / React Native 용)
// 모든 네오익스 앱에 이 파일 하나를 복사해 넣으면
// "네오익스 통합 회원가입/로그인"이 그대로 동작합니다.
//
// 설치 필요 패키지:
//   npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
//   (애플 로그인)  npx expo install expo-apple-authentication
//   (구글 로그인)  npx expo install expo-auth-session expo-crypto  또는 @react-native-google-signin/google-signin
// ============================================================
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session, type User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';

// ── 네오익스 공용 Supabase (모든 앱 동일) ──
const SUPABASE_URL = 'https://nroddjekdjwnwguwkudl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Uygr7NmVn1wmqopNrb4FRw_CRWw7Xeg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,        // 네이티브: 세션을 기기에 안전 저장
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,    // 네이티브에서는 URL 세션 감지 끔
  },
});

// ── 이 앱이 무엇인지 (가입 추적용) — 앱마다 바꿔주세요 ──
export const SERVICE = { key: 'my-app', name: '내 앱 이름' };

// ── 이메일 회원가입 ──
export async function signUpWithEmail(email: string, password: string, displayName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw error;
  await joinService();           // 가입 즉시 이 서비스 멤버로 기록
  return data;
}

// ── 이메일 로그인 ──
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await joinService();
  return data;
}

// ── 애플 로그인 (iOS) ──
// App Store 정책: 소셜 로그인을 제공하면 Apple 로그인 필수.
// 사전: Supabase > Authentication > Providers > Apple 활성화 + Services ID 등록.
export async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) throw new Error('애플 로그인 토큰 없음');
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;
  // 애플은 이름을 최초 1회만 줌 → 프로필에 채워줌
  if (credential.fullName?.givenName) {
    const name = [credential.fullName.familyName, credential.fullName.givenName].filter(Boolean).join(' ');
    await supabase.from('profiles').update({ display_name: name }).eq('id', data.user!.id);
  }
  await joinService();
  return data;
}

// ── 구글 로그인 ──
// 사전: Supabase > Authentication > Providers > Google 활성화 + OAuth 클라이언트 ID 등록.
// 네이티브 ID 토큰 방식 권장(@react-native-google-signin). idToken 을 받아 아래로 교환:
export async function signInWithGoogleIdToken(idToken: string) {
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error) throw error;
  await joinService();
  return data;
}

// ── 이 계정이 이 서비스를 쓴다고 서버에 기록 (admin 대시보드에서 통합 관리) ──
export async function joinService() {
  try {
    await supabase.rpc('record_membership', {
      p_service_key: SERVICE.key,
      p_service_name: SERVICE.name,
    });
  } catch { /* 멤버십 기록 실패는 로그인 자체를 막지 않음 */ }
}

// ── 세션/유저/로그아웃/구독 ──
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
export async function getUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user;
}
export async function signOut() {
  await supabase.auth.signOut();
}
export function onAuthChange(cb: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

// ── 내 프로필 읽기/수정 ──
export async function getMyProfile() {
  const user = await getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data;
}
export async function updateMyProfile(patch: { display_name?: string; avatar_url?: string }) {
  const user = await getUser();
  if (!user) throw new Error('로그인 필요');
  const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
  if (error) throw error;
}

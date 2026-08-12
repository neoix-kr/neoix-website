import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { initializeKakaoSDK } from '@react-native-kakao/core';
import { login as kakaoNativeLogin, me as kakaoMe } from '@react-native-kakao/user';
import { supabase, recordMembership } from '../lib/supabase';

// 카카오 콘솔 NEOIX 앱(1497732)의 "폴리 오피스" 전용 네이티브 앱 키 — kr.polyx.mp 번들 등록됨.
// Supabase Kakao provider의 client_id 콤마 유니언에도 이 키가 있어야 signInWithIdToken이 통과한다.
const KAKAO_NATIVE_KEY = '16cdb1c7fa120c1588aaa6b39ca5755a';

// 카카오 네이티브 로그인 직후 me()로 받은 이름(승인 항목) — 세션 확정 후 bootstrap에서 프로필에 반영
let pendingKakaoName: string | null = null;
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '../types/db';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signUpEmail: (email: string, password: string, displayName: string) => Promise<{ error: any }>;
  signInEmail: (email: string, password: string) => Promise<{ error: any }>;
  signInKakao: () => Promise<{ error: any }>;
  signInGoogle: () => Promise<{ error: any }>;
  signInApple: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 로그아웃 시 비워야 하는 서버 유래 캐시 (PrayerStore의 CACHE_KEY와 같은 값).
//
// 여기서 지우는 건 '디스크에 남은 남의 데이터'뿐이다. 인메모리 상태 비우기는 PrayerStore 가
// user.id 변화를 보고 직접 처리한다(clearServerData) — 태블릿을 함께 쓸 때 다음 로그인 사용자에게
// 이전 사용자의 기도제목·이웃 실명이 잠깐 노출되는 걸 막기 위해서다.
//
// 지키는 선:
//  · 인증 토큰 저장키(sb-*-auth-token)는 절대 건드리지 않는다. supabase 가 관리하는 영역을
//    앱이 지우면 멀쩡한 세션까지 날아가 오히려 "다시 로그인" 증상을 만든다.
//  · 환경설정 PREFS_KEY·마이그레이션 플래그는 기기 설정이라 유지한다.
const SERVER_CACHE_KEY = 'mp-server-cache-v1';

async function clearServerCache() {
  try { await AsyncStorage.removeItem(SERVER_CACHE_KEY); } catch { /* 무시 */ }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try { initializeKakaoSDK(KAKAO_NATIVE_KEY); } catch {}
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) bootstrap(session.user.id);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        bootstrap(session.user.id);
      } else {
        setProfile(null);
        // 토큰 만료 등으로 세션이 끊기면 서버 캐시를 비운다
        if (event === 'SIGNED_OUT') clearServerCache();
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 로그인 직후: mp_profiles 보장 + 멤버십 기록 + 프로필 로드 + 푸시 토큰 등록
  const bootstrap = async (userId: string) => {
    try {
      await supabase.rpc('mp_ensure_profile');
    } catch { /* 프로필 트리거가 이미 있으면 무시 */ }
    // 카카오에서 받은 실명(승인 항목) — 프로필 이름이 비어 있을 때만 채움
    if (pendingKakaoName) {
      const name = pendingKakaoName;
      pendingKakaoName = null;
      try {
        const { data } = await supabase.from('mp_profiles').select('display_name').eq('id', userId).single();
        const cur = (data as any)?.display_name;
        if (!cur || !String(cur).trim()) {
          await supabase.from('mp_profiles').update({ display_name: name }).eq('id', userId);
        }
      } catch { /* 무시 */ }
    }
    recordMembership();
    fetchProfile(userId);
    // 푸시 토큰 등록(알림 권한 요청)은 여기서 하지 않는다 —
    // 신규 유저가 약관동의 화면에서 프롬프트를 만나지 않도록, 온보딩 통과 후 RootNavigator에서 요청.
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('mp_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) setProfile(data as Profile);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const signUpEmail = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    return { error };
  };

  const signInEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  // 소셜 로그인(웹 OAuth 공용) — 브라우저 → 앱 딥링크 복귀 → 코드 교환(PKCE)
  const signInOAuthWeb = async (provider: 'kakao' | 'google', scopes?: string) => {
    try {
      const redirectTo = makeRedirectUri(); // pray-app://
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo, skipBrowserRedirect: true, ...(scopes ? { scopes } : {}) },
      });
      if (error || !data?.url) return { error: error ?? new Error('인증 URL 생성 실패') };
      const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (res.type !== 'success' || !res.url) return { error: new Error('로그인이 취소됐어요') };
      const code = new URL(res.url).searchParams.get('code');
      if (!code) return { error: new Error('인증 코드를 받지 못했어요') };
      const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
      return { error: exErr };
    } catch (e) {
      return { error: e };
    }
  };

  // 카카오 — 네이티브(카톡 앱 직행) 우선, 실패 시 웹 OAuth 폴백. 사용자가 취소하면 조용히 종료.
  const signInKakao = async () => {
    try {
      const t = await kakaoNativeLogin();
      if (t?.idToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'kakao',
          token: t.idToken,
          access_token: t.accessToken,
        });
        if (!error) {
          // 승인 항목(이름·이메일) 수집 — 이름은 프로필 반영, 이메일은 Supabase 계정에 이미 포함
          try {
            const u = await kakaoMe();
            const nm = (u?.name && u.name.trim()) ? u.name.trim() : (u?.nickname?.trim() || '');
            if (nm) pendingKakaoName = nm;
          } catch { /* 이름 미동의/조회 실패 — 닉네임으로 진행 */ }
          return { error: null };
        }
        // 네이티브 idToken은 받았지만 Supabase 교환 실패 → 웹 OAuth로 폴백
      }
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (/cancel/i.test(msg) || /취소/.test(msg)) return { error: null }; // 사용자 취소 — 에러 아님
      // 그 외 네이티브 예외 → 웹 OAuth 폴백
    }
    // 네이티브 실패 → 웹 OAuth 폴백 (조용히)
    return signInOAuthWeb('kakao', 'profile_nickname account_email');
  };

  // 구글 — 웹 OAuth (Supabase Google 프로바이더 활성화 시 즉시 동작)
  const signInGoogle = async () => {
    const { error } = await signInOAuthWeb('google');
    if (error && /provider is not enabled|unsupported provider/i.test(String((error as any)?.message ?? ''))) {
      return { error: new Error('구글 로그인은 준비 중이에요. 카카오나 이메일로 시작해 주세요.') };
    }
    return { error };
  };

  // 애플 — 네이티브 (iOS). App Store 심사 4.8 필수. Supabase Apple 프로바이더 활성화 시 동작.
  const signInApple = async () => {
    try {
      const AppleAuthentication = await import('expo-apple-authentication');
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!cred.identityToken) return { error: new Error('Apple 인증 토큰을 받지 못했어요') };
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken });
      if (error) {
        if (/provider is not enabled|unsupported provider/i.test(String((error as any)?.message ?? ''))) {
          return { error: new Error('애플 로그인은 준비 중이에요. 카카오나 이메일로 시작해 주세요.') };
        }
        return { error };
      }
      // 애플은 이름을 최초 1회만 준다 → 있으면 프로필 이름으로 반영
      const name = [cred.fullName?.familyName, cred.fullName?.givenName].filter(Boolean).join(' ').trim();
      if (name) pendingKakaoName = name;
      return { error: null };
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED' || /cancel/i.test(String(e?.message ?? ''))) return { error: null }; // 사용자 취소
      return { error: e };
    }
  };

  const signOut = async () => {
    /* scope:'local' 필수 — NEOIX 앱들이 하나의 Supabase 계정 풀을 공유하므로
     기본값 'global' 이면 이 앱에서 로그아웃할 때 사용자의 모든 기기·모든 NEOIX 앱의
     리프레시 토큰이 함께 폐기된다. 다른 앱들은 액세스 토큰(60분)이 만료되는 순간
     갑자기 로그아웃되고, 사용자에겐 "한동안 안 썼더니 로그아웃됨"으로 보인다. */
    await supabase.auth.signOut({ scope: 'local' });
    setProfile(null);
    await clearServerCache();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('로그인이 필요합니다') };
    const { error } = await supabase.from('mp_profiles').update(updates).eq('id', user.id);
    if (!error) setProfile(prev => (prev ? { ...prev, ...updates } : null));
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      session, user, profile, isLoading,
      signUpEmail, signInEmail, signInKakao, signInGoogle, signInApple, signOut, updateProfile, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

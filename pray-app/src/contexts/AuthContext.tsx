import React, { createContext, useContext, useState, useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { initializeKakaoSDK } from '@react-native-kakao/core';
import { login as kakaoNativeLogin } from '@react-native-kakao/user';
import { supabase, recordMembership } from '../lib/supabase';

const KAKAO_NATIVE_KEY = 'd8125f725e9c9eadec1d5be97ee1f273';
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
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) bootstrap(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 로그인 직후: pray_profiles 보장 + 멤버십 기록 + 프로필 로드 + 푸시 토큰 등록
  const bootstrap = async (userId: string) => {
    try {
      await supabase.rpc('pray_ensure_profile');
    } catch { /* 프로필 트리거가 이미 있으면 무시 */ }
    recordMembership();
    fetchProfile(userId);
    import('../lib/notifications').then((m) => m.registerPushToken().catch(() => {}));
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('pray_profiles')
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
        if (!error) return { error: null };
        // aud 불일치 등 — Supabase에 네이티브 키 미등록이면 웹 폴백
      }
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (/cancel/i.test(msg) || /취소/.test(msg)) return { error: null }; // 사용자 취소 — 에러 아님
      // 그 외 네이티브 실패 → 웹 폴백
    }
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

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('로그인이 필요합니다') };
    const { error } = await supabase.from('pray_profiles').update(updates).eq('id', user.id);
    if (!error) setProfile(prev => (prev ? { ...prev, ...updates } : null));
    return { error };
  };

  return (
    <AuthContext.Provider value={{
      session, user, profile, isLoading,
      signUpEmail, signInEmail, signInKakao, signInGoogle, signOut, updateProfile, refreshProfile,
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

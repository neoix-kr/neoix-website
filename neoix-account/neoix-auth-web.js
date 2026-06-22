// ============================================================
// NEOIX 통합 계정 모듈 (웹 / 정적 사이트 용)
// neoix.kr/○○ 같은 정적 HTML 페이지에서 <script type="module"> 로 import.
//   import * as neoix from './neoix-auth-web.js';
// 같은 도메인(neoix.kr) 사이트끼리는 세션이 자동 공유됩니다.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://nroddjekdjwnwguwkudl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Uygr7NmVn1wmqopNrb4FRw_CRWw7Xeg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 이 사이트가 무엇인지 (가입 추적용) — 사이트마다 바꾸세요
export const SERVICE = { key: 'my-site', name: '내 사이트' };

export async function signUpWithEmail(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email, password, options: { data: { display_name: displayName } },
  });
  if (error) throw error;
  await joinService();
  return data;
}

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await joinService();
  return data;
}

// 웹 소셜 로그인은 OAuth 리다이렉트 방식
export async function signInWithProvider(provider /* 'google' | 'apple' */, redirectTo) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: redirectTo || window.location.href },
  });
  if (error) throw error;
}

export async function joinService() {
  try {
    await supabase.rpc('record_membership', { p_service_key: SERVICE.key, p_service_name: SERVICE.name });
  } catch {}
}

export async function getSession() { return (await supabase.auth.getSession()).data.session; }
export async function getUser()    { return (await supabase.auth.getUser()).data.user; }
export async function signOut()    { await supabase.auth.signOut(); }
export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_e, s) => cb(s));
  return () => data.subscription.unsubscribe();
}

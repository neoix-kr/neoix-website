import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// 네오익스 통합계정 공유 풀 (모든 네오익스 앱 동일 · 절대 바꾸지 말 것)
// 기도앱 전용 테이블은 pray_ 접두사 — 스키마: neoix/pray-setup.sql
const SUPABASE_URL = 'https://nroddjekdjwnwguwkudl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Uygr7NmVn1wmqopNrb4FRw_CRWw7Xeg';

// 이 앱 식별자 (가입 추적용 — neoix.kr/admin 통합 디렉토리에 기록)
export const SERVICE = { key: 'pray', name: '기도해요' };

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // React Native에서는 false
    flowType: 'pkce',          // 카카오 OAuth 코드 교환(exchangeCodeForSession)용
  },
});

// 이 계정이 이 서비스를 쓴다고 기록 (실패해도 로그인은 막지 않음)
export async function recordMembership() {
  try {
    await supabase.rpc('record_membership', {
      p_service_key: SERVICE.key,
      p_service_name: SERVICE.name,
    });
  } catch {
    /* noop */
  }
}

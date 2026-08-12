import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// 네오익스 통합계정 공유 풀 (모든 네오익스 앱 동일 · 절대 바꾸지 말 것)
// 의원용 앱 전용 테이블은 mp_ 접두사 — 스키마: poly-mp/mp-schema-p0.sql
// 값은 .env 의 EXPO_PUBLIC_* 에서 주입된다(.env.example 참고).
// .env 가 없는 환경(CI 초기 세팅 등)에서도 빌드가 깨지지 않도록 기존 값을 폴백으로 둔다.
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://nroddjekdjwnwguwkudl.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_Uygr7NmVn1wmqopNrb4FRw_CRWw7Xeg';

// 이 앱 식별자 (가입 추적용 — neoix.kr/admin 통합 디렉토리에 기록)
export const SERVICE = { key: 'polymp', name: '폴리 오피스' };

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // React Native에서는 false
    flowType: 'pkce',          // 카카오 OAuth 코드 교환(exchangeCodeForSession)용
  },
});

// ★ "한동안 안 쓰면 다시 로그인해야 하는" 증상의 실제 원인 차단 (Supabase RN 공식 요구사항)
//
// supabase 는 리프레시 토큰을 쓸 때마다 새 토큰으로 '회전'시키고, 옛 토큰은 몇 초 뒤 무효가 된다.
// AppState 배선이 없으면 앱이 백그라운드로 내려가는 순간에도 갱신 타이머가 살아 있어서,
// 요청은 서버에 닿아 토큰이 회전됐는데 앱이 정지돼 새 토큰을 저장하지 못하는 일이 생긴다.
// 다음 실행 때 앱은 이미 무효가 된 옛 토큰을 보내고, 서버는 이를 탈취로 간주해 세션을 통째로 폐기한다
// (Invalid Refresh Token: Already Used). auth-js 는 이 오류를 '재시도 불가'로 분류해 세션을 지우고,
// 사용자에게는 그냥 "로그아웃됨"으로 보인다.
//
// 포그라운드에서만 갱신 타이머를 돌리면 이 경쟁 자체가 사라진다.
// (서버 설정은 문제 없음 — 액세스 토큰 60분, 리프레시 토큰 만료 없음. 즉 계속 로그인 유지가 정상이다.)
if (Platform.OS !== 'web') {
  supabase.auth.startAutoRefresh();
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

// 이 계정이 이 서비스를 쓴다고 기록 (실패해도 로그인은 막지 않음)
// phone 전달 시 통합 회원기록(service_memberships)에 연락처도 함께 저장 — 통합 어드민 조회용
export async function recordMembership(phone?: string) {
  try {
    await supabase.rpc('record_membership', {
      p_service_key: SERVICE.key,
      p_service_name: SERVICE.name,
      ...(phone ? { p_phone: phone } : {}),
    });
  } catch {
    /* noop */
  }
}

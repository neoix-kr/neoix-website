// 앱 전역 설정 플래그

// 개발 중 로그인 게이트 우회 — true면 로그인 없이 바로 메인 탭으로 진입.
// TODO: NEOIX 통합계정(카카오/이메일) 배포 전에 반드시 false로.
export const DEV_BYPASS_AUTH = false;

// ── Google AdMob ──
// 앱이 스토어 출시 전이라 실제 광고는 게재 제한(no-fill)됨 → 지금은 테스트 광고 표시.
// 스토어 출시 + AdMob 검토 통과 후 USE_TEST_ADS=false로 바꾸면 아래 실제 단위로 실광고·수익.
export const USE_TEST_ADS = true;

// 실제 배너 광고 단위 ID (AdMob 발급 완료)
export const ADMOB_BANNER = {
  ios: 'ca-app-pub-3210058400326728/7400530758',
  android: 'ca-app-pub-3210058400326728/7592102442',
};

// ── 프리미엄 (광고 제거 구독) ──
export const PREMIUM_PRICE = '월 9,900원';
export const PREMIUM_PRODUCT_ID = 'pray_premium_monthly'; // App Store/Play 구독 상품 ID

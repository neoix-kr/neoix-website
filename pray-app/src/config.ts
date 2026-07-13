// 앱 전역 설정 플래그

// 개발 중 로그인 게이트 우회 — true면 로그인 없이 바로 메인 탭으로 진입.
// TODO: NEOIX 통합계정(카카오/이메일) 배포 전에 반드시 false로.
export const DEV_BYPASS_AUTH = false;

// ── Google AdMob ──
// 실제 수익화 시 AdMob 콘솔(admob.google.com)에서 발급받은 값으로 교체.
// 지금은 구글 공식 '테스트 광고 단위' — 실제 광고가 뜨지만 수익은 없고 클릭해도 안전.
// USE_TEST_ADS=false로 바꾸면 아래 실제 단위 ID를 사용.
export const USE_TEST_ADS = true;

// 실제 배너 광고 단위 ID (AdMob에서 발급 후 여기 채우기)
export const ADMOB_BANNER = {
  ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
};

# 기도의 동반자 (pray-app)

교회 성도들이 서로의 기도제목을 나누고 매일 함께 중보하는 앱. iOS · Android 동시 배포 (Expo).

## 스택
- Expo 54 / React Native 0.81 / React 19 / TypeScript
- Supabase — 네오익스 통합계정 공유 풀, 전용 테이블 `pray_` 접두사
- 로그인 — NEOIX 통합계정 (이메일 작동, 카카오는 딥링크 연결 예정 · `kakao` 스킬)
- 디자인 — "천국 같은 구름 하늘" 테마 (`src/theme/colors.ts`)

## 시작하기
```bash
cd pray-app
npm install
npx expo start        # QR로 Expo Go 또는 개발 빌드에서 실행
```

## Supabase 준비
`../pray-setup.sql` 을 Supabase SQL Editor에 붙여넣어 실행하면 테이블·RLS·트리거가 생성됩니다.

## 구조
```
src/
  theme/       천국 구름 하늘 팔레트 + 토큰(간격/모서리/타이포/그림자)
  lib/         supabase 클라이언트(공유 풀) + 멤버십 기록
  contexts/    AuthContext — 세션/프로필/로그인
  navigation/  RootNavigator(인증 게이트) + MainTabs(구름 탭바)
  screens/     HomeScreen(기도함) · PrayerModeScreen(기도 모드) · Neighbors · Community · Me · auth/Login
  types/       DB 타입 (pray-setup.sql 과 1:1)
```

## 로드맵
- [x] Phase 0 — 스캐폴드 · 테마 · 인증 · 스키마 · 기도함 홈
- [ ] Phase 1 — 기도제목 CRUD/공유설정 + 기도 모드 스와이프 체크 (Supabase 연동)
- [ ] Phase 2 — 이웃(연락처 매칭) + 클럽
- [ ] Phase 3 — 기도마당(커뮤니티)
- [ ] Phase 4 — 통계·목표 + EAS 양대 스토어 빌드

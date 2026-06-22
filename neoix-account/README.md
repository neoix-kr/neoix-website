# NEOIX 통합 계정 (Unified Identity)

모든 네오익스 앱(웹 + iOS/Android)이 **하나의 계정 풀**을 공유합니다.
한 번 가입하면 모든 네오익스 앱에 같은 계정으로 로그인됩니다.

- **백엔드**: 단일 Supabase 프로젝트 `nroddjekdjwnwguwkudl`
- **로그인 방식**: 이메일 + 소셜(애플/구글)
- **관리**: `neoix.kr/admin` → 사용자 탭에서 전 서비스 가입자 통합 관리

---

## 새 앱에 붙이는 법 (3단계)

### 1) 모듈 복사
- **Expo/React Native 앱** → `neoixAuth.ts` 를 앱의 `src/lib/` 에 복사
- **웹 정적 사이트** → `neoix-auth-web.js` 를 사이트 폴더에 복사

### 2) 서비스 식별자 설정
복사한 파일 상단의 `SERVICE` 를 이 앱에 맞게 수정:
```ts
export const SERVICE = { key: 'travel-globe', name: '트래블 글로브' };
```
→ 이 값으로 admin 대시보드에서 "이 사용자가 어떤 앱을 쓰는지" 추적됩니다.

### 3) 화면에서 호출
```ts
import { signUpWithEmail, signInWithEmail, signInWithApple, signOut, onAuthChange } from './lib/neoixAuth';

await signUpWithEmail('a@b.com', 'pw1234', '홍길동');   // 가입
await signInWithEmail('a@b.com', 'pw1234');             // 로그인
await signInWithApple();                                // 애플 로그인 (iOS)
onAuthChange(session => { /* 로그인 상태 변화 반영 */ });
```

가입/로그인 시 자동으로 `record_membership` 이 호출되어 admin에 집계됩니다.

---

## ⚠️ 대표님이 직접 해야 하는 것 — 소셜 로그인 자격증명

이메일 로그인은 **지금 바로 동작**합니다. 애플/구글 소셜 로그인은 각 개발자
콘솔에서 OAuth 자격증명을 발급해 Supabase에 등록해야 켜집니다.

### 애플 로그인 (App Store 필수)
1. [Apple Developer](https://developer.apple.com) → Certificates, IDs & Profiles
2. **Services ID** 생성 (예: `kr.neoix.signin`) → Sign In with Apple 활성화
3. **Key (.p8)** 생성 (Sign In with Apple용) → Key ID 메모
4. Supabase → Authentication → Providers → **Apple** → Services ID / Team ID / Key ID / .p8 키 입력
   - (회사 Apple Developer 계정 발급되면 그때 진행 — `project_news` 메모 참고)

### 구글 로그인
1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. **OAuth 2.0 클라이언트 ID** 생성: Web / iOS / Android 각각
3. Supabase → Authentication → Providers → **Google** → 클라이언트 ID/시크릿 입력
4. 네이티브 앱은 `@react-native-google-signin` 으로 idToken 받아 `signInWithGoogleIdToken()` 호출

### 이메일 확인(Confirm email) 정책
- 현재 OGX 호환을 위해 **OFF** 상태(가짜 이메일 아이디 트릭 때문).
- 소셜(애플/구글)은 이메일이 이미 검증돼서 OFF여도 안전.
- 순수 이메일/비번 가입에 이메일 인증을 받으려면 별도 검토 필요(OGX 기존 계정 영향 확인).

---

## DB 구조 (이미 적용됨)
- `profiles` — 통합 프로필 1계정 1행 (가입 시 트리거로 자동 생성)
- `service_memberships` — 어떤 계정이 어떤 앱을 쓰는지
- `record_membership(key, name)` — 앱이 로그인 후 호출
- `get_user_directory()` — admin 통합 사용자 조회
- 스키마 원본: `../admin/unified-auth-setup.sql`

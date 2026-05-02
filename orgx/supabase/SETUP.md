# OrgX — Supabase 백엔드 (전체 마이그레이션 완료)

**LocalStorage 기반 단일 사용자 도구 → Supabase 기반 다중 사용자 협업 도구로 전환 완료.**

## ✅ 인프라 (Supabase)

| 항목 | 상태 |
|---|---|
| 프로젝트 | `nroddjekdjwnwguwkudl` (orgX, ap-northeast-1) |
| 스키마 (8 테이블) | ✅ |
| RLS 정책 (대표/관리자/작업자) | ✅ |
| Storage 버킷 `orgx-files` + 정책 | ✅ |
| 이메일 매직 링크 인증 | ✅ |
| Redirect URL 허용 리스트 | ✅ `http://localhost:8080/**`, `https://neoix.kr/**` |

## ✅ 프론트엔드 (`work.html`)

| 영역 | 처리 |
|---|---|
| 데이터 저장소 | LocalStorage → **Supabase Postgres** |
| 첨부파일 | base64 → **Supabase Storage** (50MB → 사실상 GB) |
| 인증 | (없음) → **이메일 매직 링크** |
| 회사 / 멤버 | localStorage 더미 → **DB orgs/memberships** |
| 권한 | 클라이언트 only → **RLS로 서버에서 강제** |
| 협업 | 단일 사용자 → **Realtime 구독** (다른 사람 변경 즉시 반영) |
| 댓글 핀 (x,y) | 로컬 → **DB `pin_x`/`pin_y`** |
| 댓글 해결 체크 | 로컬 → **DB `resolved`/`resolved_by`/`resolved_at`** |
| 계획 승인 워크플로우 | 로컬 → **DB `pending_review`** |

## 🚀 사용 시작 방법

1. **로컬 미리보기**: `http://localhost:8080/work.html` 접속
2. **이메일 입력 → 매직 링크 받기 → 클릭** → 자동 로그인
3. **회사 만들기** 화면에서 회사 이름 + 본인 표시 이름 입력
   - 첫 번째 사람은 자동으로 **대표(♛)**
4. 작업/계획/자료/댓글 등 모든 기능이 그대로 작동 — 다만 이제 Supabase에 저장됨
5. **다른 사람 합류**: 회사 설정 모달에서 회사 ID 복사 → 그 사람이 같은 사이트에서 로그인 후 "합류" 화면에서 입력 → 작업자로 합류 → CEO가 역할 변경 가능

## 🔜 다음에 손볼 만한 것

- **이메일 초대** (현재는 회사 ID 공유 방식) → Supabase Edge Function 또는 트리거로 자동 멤버십 생성
- **회사 전환** UI (한 사람이 여러 회사 소속일 때)
- **이전 LocalStorage 데이터 마이그레이션** 도구 (지금은 새로 시작해야 함)
- **알림** (멘션, 댓글 답장 시)
- **배포** — neoix.kr/work.html 또는 별도 도메인 (현재 GitHub Pages 사용 중이지만 Netlify로 옮기면 환경 변수 관리 더 쉬움)

## 파일 구조

```
work.html                  # 단일 페이지 앱 (Supabase 클라이언트 인라인)
supabase/
├── schema.sql             # 적용 완료 — 보존용
├── policies.sql           # 적용 완료 — 보존용
└── SETUP.md               # 이 문서
```

## 직링크 모음

- **대시보드**: https://supabase.com/dashboard/project/nroddjekdjwnwguwkudl
- **사용자 목록**: https://supabase.com/dashboard/project/nroddjekdjwnwguwkudl/auth/users
- **테이블 데이터**: https://supabase.com/dashboard/project/nroddjekdjwnwguwkudl/editor
- **SQL 에디터**: https://supabase.com/dashboard/project/nroddjekdjwnwguwkudl/sql/new
- **Storage**: https://supabase.com/dashboard/project/nroddjekdjwnwguwkudl/storage/buckets/orgx-files

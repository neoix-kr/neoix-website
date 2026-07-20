-- 폴리 서포트: 후원회 개설 사전 신청 테이블
-- 네오익스 공유 Supabase(nroddjekdjwnwguwkudl) SQL Editor에서 실행하세요.
-- (폴리앱에 하드코딩된 hpjquisntmvlpnsxdomm 프로젝트는 DNS가 소멸된 상태라 사용 불가)

create table if not exists public.support_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  position text not null,
  district text not null,
  phone text not null,
  email text,
  message text,
  status text not null default 'pending' -- pending | contacted | onboarded | rejected
);

alter table public.support_applications enable row level security;

-- 익명(웹 방문자)은 신청 insert만 가능, 조회 불가
create policy "anon can insert application"
  on public.support_applications for insert
  to anon
  with check (true);

-- 로그인한 관리자(authenticated)는 조회/수정 가능 — 필요 시 admin 체크로 좁히세요
create policy "authenticated can read applications"
  on public.support_applications for select
  to authenticated
  using (true);

create policy "authenticated can update applications"
  on public.support_applications for update
  to authenticated
  using (true);

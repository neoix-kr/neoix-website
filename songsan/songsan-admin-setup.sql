-- ============================================================
-- 송산 수련회 앱 — 선장실(관리자) 확장 SQL
-- Supabase SQL Editor(프로젝트 nroddjekdjwnwguwkudl)에서 통째로 실행. 재실행 안전.
--
-- ✅ 비밀번호 교체 불필요 — 아래 함수들은 기존
--    songsan_admin_signups(=2026-07-15 보안 SQL에서 정한 관리자 비번)을
--    그대로 재사용해 검증합니다. 그 SQL을 먼저 실행해 둔 상태여야 합니다.
--
-- 추가되는 것:
--   0. songsan_check_admin  기존 관리자 비번 검증 헬퍼
--   1. songsan_crew         승선 명단 (승선권 만들면 자동 등록, 관리자만 열람)
--   2. songsan_notice       선장의 공지 (관리자가 쏘면 전 승선자 화면에 표시)
--   3. songsan_quiz_scores  퀴즈 기록 (학생이 풀면 자동 수신, 관리자만 열람)
--   4. songsan_delete_post  항해일지(게시판) 글 삭제 RPC
-- ============================================================

-- 0) 관리자 비번 검증 헬퍼 -------------------------------------
--    기존 songsan_admin_signups(p_pass)는 비번이 틀리면 예외를 던짐.
--    그 성질을 이용해 true/false 로 감싼다. → 새 비번을 여기 적을 필요 없음.
create or replace function public.songsan_check_admin(p_pass text)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  perform * from public.songsan_admin_signups(p_pass);
  return true;
exception when others then
  return false;
end $$;
revoke all on function public.songsan_check_admin(text) from public;
grant execute on function public.songsan_check_admin(text) to anon, authenticated;

-- 1) 승선 명단 ------------------------------------------------
create table if not exists public.songsan_crew (
  id uuid primary key default gen_random_uuid(),
  device_id text unique not null,
  name text not null,
  dept text,
  grp text,
  vow text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.songsan_crew enable row level security;
drop policy if exists songsan_crew_ins on public.songsan_crew;
create policy songsan_crew_ins on public.songsan_crew
  for insert to anon, authenticated with check (true);
drop policy if exists songsan_crew_upd on public.songsan_crew;
create policy songsan_crew_upd on public.songsan_crew
  for update to anon, authenticated using (true) with check (true);
-- select 정책 없음 → 명단은 아래 관리자 RPC로만 조회

create or replace function public.songsan_admin_crew(p_pass text)
returns setof public.songsan_crew
language plpgsql security definer set search_path = public as $$
begin
  if not public.songsan_check_admin(p_pass) then
    raise exception 'wrong_password';
  end if;
  return query select * from public.songsan_crew order by updated_at desc;
end $$;
revoke all on function public.songsan_admin_crew(text) from public;
grant execute on function public.songsan_admin_crew(text) to anon, authenticated;

-- 2) 선장의 공지 ----------------------------------------------
create table if not exists public.songsan_notice (
  id text primary key,
  title text,
  body text,
  updated_at timestamptz default now()
);
insert into public.songsan_notice (id) values ('current') on conflict (id) do nothing;
alter table public.songsan_notice enable row level security;
drop policy if exists songsan_notice_sel on public.songsan_notice;
create policy songsan_notice_sel on public.songsan_notice
  for select to anon, authenticated using (true);
-- 쓰기 정책 없음 → 공지는 아래 RPC로만 송출/내림

create or replace function public.songsan_set_notice(p_pass text, p_title text, p_body text)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.songsan_check_admin(p_pass) then
    raise exception 'wrong_password';
  end if;
  update public.songsan_notice
    set title = p_title, body = p_body, updated_at = now()
    where id = 'current';
  return true;
end $$;
revoke all on function public.songsan_set_notice(text, text, text) from public;
grant execute on function public.songsan_set_notice(text, text, text) to anon, authenticated;

-- 3) 퀴즈 기록 ------------------------------------------------
create table if not exists public.songsan_quiz_scores (
  id uuid primary key default gen_random_uuid(),
  device_id text,
  name text,
  dept text,
  grp text,
  score int,
  total int,
  created_at timestamptz default now()
);
alter table public.songsan_quiz_scores enable row level security;
drop policy if exists songsan_quiz_ins on public.songsan_quiz_scores;
create policy songsan_quiz_ins on public.songsan_quiz_scores
  for insert to anon, authenticated with check (true);
-- select 정책 없음 → 관리자 RPC로만 조회

create or replace function public.songsan_admin_quiz(p_pass text)
returns setof public.songsan_quiz_scores
language plpgsql security definer set search_path = public as $$
begin
  if not public.songsan_check_admin(p_pass) then
    raise exception 'wrong_password';
  end if;
  return query select * from public.songsan_quiz_scores order by created_at desc limit 300;
end $$;
revoke all on function public.songsan_admin_quiz(text) from public;
grant execute on function public.songsan_admin_quiz(text) to anon, authenticated;

-- 4) 항해일지(게시판) 글 삭제 ---------------------------------
-- songsan_board.id 타입이 uuid든 bigint든 동작하도록 text로 비교
create or replace function public.songsan_delete_post(p_id text, p_pass text)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not public.songsan_check_admin(p_pass) then
    raise exception 'wrong_password';
  end if;
  delete from public.songsan_board where id::text = p_id;
  return found;
end $$;
revoke all on function public.songsan_delete_post(text, text) from public;
grant execute on function public.songsan_delete_post(text, text) to anon, authenticated;

-- 완료. 실행 후 앱을 새로고침하면 선장실에서 명단·공지·퀴즈·게시판 관리가 활성화됩니다.

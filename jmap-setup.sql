-- ============================================================
-- J맵 사전오픈 신청 — Supabase SQL Editor에서 1회 실행
-- 중보(pray-app) 프로필 탭의 "J맵 사전오픈 신청하기" 폼이 이 테이블에 저장하고,
-- neoix.kr/admin 의 "J맵 신청" 섹션이 이 테이블을 읽는다.
-- ============================================================

create table if not exists public.jmap_preorders (
  id           uuid primary key default gen_random_uuid(),
  phone        text not null,
  source       text not null default 'pray-app',   -- 신청 유입 앱
  church       text,                                -- 신청자가 등록한 우리교회 (선택)
  denomination text,                                -- 교단 (선택)
  marketing_agreed boolean not null default false,  -- 안내(마케팅) 수신 동의 — 정보통신망법 제50조
  created_at   timestamptz not null default now()
);

-- 기존 테이블에 동의 컬럼 추가 (2026-07-11 법령 검토 반영)
alter table public.jmap_preorders add column if not exists marketing_agreed boolean not null default false;

alter table public.jmap_preorders enable row level security;

-- 누구나(비로그인 포함) 신청 가능 — INSERT만 허용
drop policy if exists jmap_preorders_insert on public.jmap_preorders;
create policy jmap_preorders_insert on public.jmap_preorders
  for insert
  with check (true);

-- 조회는 관리자만 (admin_users에 등록된 계정)
drop policy if exists jmap_preorders_admin_read on public.jmap_preorders;
create policy jmap_preorders_admin_read on public.jmap_preorders
  for select
  using (exists (select 1 from public.admin_users au where au.user_id = auth.uid()));

grant insert on public.jmap_preorders to anon, authenticated;
grant select on public.jmap_preorders to authenticated;

-- 중복 신청 방지(같은 번호 1회) — 필요시 주석 해제
-- create unique index if not exists jmap_preorders_phone_uniq on public.jmap_preorders (phone);

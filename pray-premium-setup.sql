-- ============================================================
-- 프리미엄(광고 제거 구독) — pray_profiles에 컬럼 추가 (2026-07-13)
-- Supabase SQL Editor에서 1회 실행.
-- ============================================================

alter table public.pray_profiles add column if not exists is_premium boolean not null default false;
alter table public.pray_profiles add column if not exists premium_until timestamptz;

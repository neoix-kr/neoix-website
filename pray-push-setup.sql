-- ============================================================
-- 원격 푸시(팝업 알림) 토큰 저장 — Supabase SQL Editor에서 1회 실행
-- 앱이 기기의 Expo 푸시 토큰을 여기에 저장하고,
-- 관리자/서버가 이 토큰들로 Expo Push API에 POST하면 팝업 알림이 발송된다.
-- ============================================================

create table if not exists public.pray_push_tokens (
  token      text primary key,                 -- ExponentPushToken[...]
  user_id    uuid not null references auth.users(id) on delete cascade,
  platform   text,                             -- ios / android
  updated_at timestamptz not null default now()
);
create index if not exists pray_push_tokens_user_idx on public.pray_push_tokens(user_id);

alter table public.pray_push_tokens enable row level security;

-- 본인 토큰만 등록/갱신/삭제
drop policy if exists pray_push_ins on public.pray_push_tokens;
create policy pray_push_ins on public.pray_push_tokens for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists pray_push_upd on public.pray_push_tokens;
create policy pray_push_upd on public.pray_push_tokens for update to authenticated
  using (user_id = auth.uid());
drop policy if exists pray_push_del on public.pray_push_tokens;
create policy pray_push_del on public.pray_push_tokens for delete to authenticated
  using (user_id = auth.uid());
drop policy if exists pray_push_sel on public.pray_push_tokens;
create policy pray_push_sel on public.pray_push_tokens for select to authenticated
  using (user_id = auth.uid());

-- upsert(onConflict: token)가 UPDATE로 떨어질 때 통과하도록 갱신 시각 자동
create or replace function pray_touch_push() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists pray_push_touch on public.pray_push_tokens;
create trigger pray_push_touch before update on public.pray_push_tokens
  for each row execute function pray_touch_push();

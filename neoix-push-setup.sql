-- ============================================================
-- NEOIX 통합 푸시 토큰 (앱별 발송) — Supabase SQL Editor에서 1회 실행
-- 각 NEOIX 앱이 자기 app 키로 토큰을 저장하고,
-- neoix.kr/admin '푸시 발송'에서 앱을 골라 발송한다.
-- (Expo 푸시 토큰은 프로젝트 스코프라, 앱별 자격증명은 각 EAS 프로젝트에 설정)
-- ============================================================

create table if not exists public.neoix_push_tokens (
  token      text primary key,                 -- ExponentPushToken[...]
  user_id    uuid not null references auth.users(id) on delete cascade,
  app        text not null,                     -- pray / poly / travel-globe / ogx
  platform   text,                              -- ios / android
  updated_at timestamptz not null default now()
);
create index if not exists neoix_push_tokens_app_idx on public.neoix_push_tokens(app);
create index if not exists neoix_push_tokens_user_idx on public.neoix_push_tokens(user_id);

alter table public.neoix_push_tokens enable row level security;

-- 본인 토큰만 등록/수정/삭제, 조회는 본인 것 + (관리자는 전체)
drop policy if exists neoix_push_ins on public.neoix_push_tokens;
create policy neoix_push_ins on public.neoix_push_tokens for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists neoix_push_upd on public.neoix_push_tokens;
create policy neoix_push_upd on public.neoix_push_tokens for update to authenticated
  using (user_id = auth.uid());
drop policy if exists neoix_push_del on public.neoix_push_tokens;
create policy neoix_push_del on public.neoix_push_tokens for delete to authenticated
  using (user_id = auth.uid());
drop policy if exists neoix_push_sel on public.neoix_push_tokens;
create policy neoix_push_sel on public.neoix_push_tokens for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.admin_users au where au.user_id = auth.uid())
  );

create or replace function neoix_touch_push() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists neoix_push_touch on public.neoix_push_tokens;
create trigger neoix_push_touch before update on public.neoix_push_tokens
  for each row execute function neoix_touch_push();

-- 기존 pray_push_tokens 데이터가 있으면 이관 (app='pray')
insert into public.neoix_push_tokens (token, user_id, app, platform, updated_at)
select token, user_id, 'pray', platform, updated_at from public.pray_push_tokens
on conflict (token) do nothing;

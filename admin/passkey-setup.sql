-- ============================================================
-- 어드민 패스키(Face ID) — 자격증명 저장소
-- Supabase SQL Editor에서 실행 (재실행 안전)
-- ============================================================

create table if not exists admin_passkeys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,          -- base64url (WebAuthn rawId)
  public_key    text not null,                 -- base64url (COSE 공개키)
  counter       bigint not null default 0,     -- 서명 카운터(복제 탐지)
  transports    text[],                        -- internal/hybrid 등
  device_label  text,                          -- "박정겸 아이폰" 처럼 사람이 읽는 이름
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);
create index if not exists admin_passkeys_user_idx on admin_passkeys(user_id);

alter table admin_passkeys enable row level security;

-- 본인 것만 조회/삭제 가능 (등록·검증은 서버(Worker)가 service_role로 처리)
drop policy if exists "passkey_select_own" on admin_passkeys;
drop policy if exists "passkey_delete_own" on admin_passkeys;
create policy "passkey_select_own" on admin_passkeys
  for select using (auth.uid() = user_id);
create policy "passkey_delete_own" on admin_passkeys
  for delete using (auth.uid() = user_id);

-- 등록 시 사용할 챌린지 임시 보관 (5분 만료)
create table if not exists admin_passkey_challenges (
  challenge  text primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('register','login')),
  created_at timestamptz not null default now()
);
alter table admin_passkey_challenges enable row level security;
-- 클라이언트 직접 접근 불가 (서버만 service_role로 사용)

-- 만료 정리
create or replace function admin_passkey_gc() returns void
language sql security definer set search_path=public as $$
  delete from admin_passkey_challenges where created_at < now() - interval '5 minutes';
$$;

select 'ok' as done;

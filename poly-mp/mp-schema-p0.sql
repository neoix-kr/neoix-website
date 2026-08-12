-- 폴리 의원용 앱(폴리 오피스) — P0 스키마
-- Supabase SQL Editor에서 1회 실행. 선행: fix-manager-role.sql
--
-- 원칙
--  · 기존 테이블 무수정. 신규는 전부 mp_ 접두사.
--  · RLS는 처음부터 mp_can_access(owner) 헬퍼 경유 — P2 보좌관 공유 때 함수 1개만 고치면 됨.
--  · 의원↔후원회 연결은 mp_members.committee_id 로만 (committee_managers에 politician 행 금지).

-- ─────────────────────────────────────────────
-- 0) 접근 헬퍼 — 지금은 본인만, P2에서 보좌관 확장
-- ─────────────────────────────────────────────
create or replace function public.mp_can_access(owner uuid)
returns boolean language sql stable as $$
  select owner = auth.uid()          -- P2: or exists(select 1 from mp_staff ...)
$$;

-- ─────────────────────────────────────────────
-- 1) 의원 (승격 게이트 — 어드민에서 활성화해야 앱이 열림)
-- ─────────────────────────────────────────────
create table if not exists public.mp_members (
  user_id      uuid primary key,                 -- auth.users.id
  created_at   timestamptz not null default now(),
  name         text not null,
  position     text,                             -- 시의회의원 등
  district     text,
  party        text,
  photo_url    text,
  committee_id uuid references public.committees(id),  -- 후원회 연결(선택)
  plan         text,                             -- poly_subscriptions 캐시(원천은 구독 테이블)
  status       text not null default 'pending',  -- pending | active | suspended
  updated_at   timestamptz not null default now()
);
alter table public.mp_members enable row level security;
drop policy if exists "self read member" on public.mp_members;
create policy "self read member" on public.mp_members
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "self apply member" on public.mp_members;
create policy "self apply member" on public.mp_members
  for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "admin manage members" on public.mp_members;
create policy "admin manage members" on public.mp_members
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────
-- 2) 아카이빙 — 게시물·일정
-- ─────────────────────────────────────────────
create table if not exists public.mp_posts (
  id           uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  created_at   timestamptz not null default now(),
  body         text not null,
  category     text not null default 'activity',  -- assembly(의정)|district(지역구)|press(보도)|event(행사)|activity
  event_at     timestamptz,                       -- 활동 시각(피드 정렬·캘린더 연동)
  place        text,
  media        jsonb not null default '[]'::jsonb, -- [{path,w,h}]
  updated_at   timestamptz not null default now()
);
create index if not exists mp_posts_owner_idx on public.mp_posts(owner_user_id, event_at desc);

create table if not exists public.mp_schedules (
  id           uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  created_at   timestamptz not null default now(),
  title        text not null,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  place        text,
  kind         text not null default 'etc',       -- assembly|district|meeting|etc
  post_id      uuid references public.mp_posts(id) on delete set null,
  memo         text
);
create index if not exists mp_sched_owner_idx on public.mp_schedules(owner_user_id, starts_at);

-- ─────────────────────────────────────────────
-- 3) 연락처 · 단체 (조직관리용 연락처 앱)
-- ─────────────────────────────────────────────
create table if not exists public.mp_contacts (
  id           uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  created_at   timestamptz not null default now(),
  name         text not null,
  phone        text,
  phone_hash   text,                              -- E.164 정규화 후 sha256 (후원 매칭 키)
  title        text,                              -- 직함
  memo         text,
  tags         text[] not null default '{}',
  favorite     boolean not null default false,
  updated_at   timestamptz not null default now()
);
create index if not exists mp_contacts_owner_idx on public.mp_contacts(owner_user_id, name);
create index if not exists mp_contacts_hash_idx on public.mp_contacts(phone_hash);

create table if not exists public.mp_orgs (
  id           uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  created_at   timestamptz not null default now(),
  name         text not null,
  kind         text not null default 'group',     -- group(단체)|company(기업)|gov(기관)|media(언론)|party(정당)|etc
  region       text,
  memo         text,
  friendly     int                                 -- 우호도 -2~2 (null=미평가)
);
create index if not exists mp_orgs_owner_idx on public.mp_orgs(owner_user_id, name);

create table if not exists public.mp_contact_orgs (
  contact_id   uuid not null references public.mp_contacts(id) on delete cascade,
  org_id       uuid not null references public.mp_orgs(id) on delete cascade,
  owner_user_id uuid not null default auth.uid(),
  role         text,                               -- 대표|임원|회원|직원 등 자유입력
  primary key (contact_id, org_id)
);

-- ─────────────────────────────────────────────
-- 4) 민원 · 미팅
-- ─────────────────────────────────────────────
create table if not exists public.mp_cases (
  id           uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  created_at   timestamptz not null default now(),
  contact_id   uuid references public.mp_contacts(id) on delete set null,
  title        text not null,
  category     text not null default 'etc',        -- traffic|env|welfare|edu|safety|econ|etc
  body         text,
  status       text not null default 'open',       -- open | progress | resolved | closed
  resolved_at  timestamptz,
  updated_at   timestamptz not null default now()
);
create index if not exists mp_cases_owner_idx on public.mp_cases(owner_user_id, status, created_at desc);

create table if not exists public.mp_meetings (
  id           uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  created_at   timestamptz not null default now(),
  contact_id   uuid references public.mp_contacts(id) on delete set null,
  case_id      uuid references public.mp_cases(id) on delete set null,
  met_at       timestamptz not null default now(),
  place        text,
  summary      text,                               -- P0: 수기 메모 / P1: STT 요약
  audio_path   text                                -- P1: Storage 경로
);
create index if not exists mp_meetings_owner_idx on public.mp_meetings(owner_user_id, met_at desc);

-- ─────────────────────────────────────────────
-- 5) RLS 일괄 — owner 경유 (mp_can_access)
-- ─────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['mp_posts','mp_schedules','mp_contacts','mp_orgs','mp_contact_orgs','mp_cases','mp_meetings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner all" on public.%I', t);
    execute format('create policy "owner all" on public.%I for all to authenticated
                    using (public.mp_can_access(owner_user_id))
                    with check (owner_user_id = auth.uid())', t);
  end loop;
end $$;

-- ─────────────────────────────────────────────
-- 6) 후원 요약 RPC — 숫자만, 본인 연결 후원회 한정
-- ─────────────────────────────────────────────
create or replace function public.mp_donor_summary(hashes text[])
returns table(phone_hash text, cnt int, total bigint, last_at timestamptz)
language sql stable security definer as $$
  select c.phone_hash,
         count(d.id)::int,
         coalesce(sum(d.amount),0)::bigint,
         max(d.created_at)
  from unnest(hashes) as c(phone_hash)
  join public.mp_members m on m.user_id = auth.uid() and m.status = 'active'
  join public.donors dn on encode(digest(coalesce(dn.phone,''),'sha256'),'hex') = c.phone_hash
  join public.donations d on d.donor_id = dn.id
       and d.committee_id = m.committee_id
       and d.pay_status = 'paid'
  group by c.phone_hash
$$;

select
  (select count(*) from public.mp_members) as 의원수,
  'P0 스키마 완료' as done;

-- ─────────────────────────────────────────────
-- 7) 계정 프로필 + 멤버십 집계 (네오익스 표준 패턴 — supabase-db.md §7)
-- ─────────────────────────────────────────────
create table if not exists public.mp_profiles (
  id           uuid primary key,               -- auth.users.id
  created_at   timestamptz not null default now(),
  display_name text,
  phone        text                            -- 원문(정규화 숫자) — 온보딩 수집
);
alter table public.mp_profiles enable row level security;
drop policy if exists "own profile" on public.mp_profiles;
create policy "own profile" on public.mp_profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- 로그인 부트스트랩: 프로필 보장 (+ 통합 멤버십은 클라이언트 record_membership이 기록)
create or replace function public.mp_ensure_profile()
returns void language plpgsql security definer as $$
begin
  insert into public.mp_profiles (id, display_name)
  values (auth.uid(), coalesce(
    (select raw_user_meta_data->>'display_name' from auth.users where id = auth.uid()),
    (select raw_user_meta_data->>'name'        from auth.users where id = auth.uid())))
  on conflict (id) do nothing;
end $$;

-- ─────────────────────────────────────────────
-- 8) 후원회 요약 RPC — 의원용 읽기 전용 (원본 명부는 절대 열지 않음)
--    연결 경로는 mp_members.committee_id 뿐 — committee_managers에 politician 행 금지.
-- ─────────────────────────────────────────────
create or replace function public.mp_committee_summary()
returns table(
  politician text, raised_this_year bigint, annual_limit bigint,
  donation_count int, donor_count int, receipt_pending int
) language sql stable security definer as $$
  select
    c.politician,
    coalesce(sum(d.amount) filter (where d.pay_status='paid'
      and d.created_at >= date_trunc('year', now())), 0)::bigint,
    c.annual_limit,
    count(d.id) filter (where d.pay_status='paid')::int,
    count(distinct d.donor_id) filter (where d.pay_status='paid')::int,
    count(d.id) filter (where d.pay_status='paid' and d.receipt_id is null
      and not (d.is_anonymous and d.amount <= 100000))::int
  from public.mp_members m
  join public.committees c on c.id = m.committee_id
  left join public.donations d on d.committee_id = c.id
  where m.user_id = auth.uid() and m.status = 'active'
  group by c.id
$$;

-- ─────────────────────────────────────────────
-- 9) 미디어 버킷 (게시물 사진) — 본인 폴더에만 쓰기
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('mp-media','mp-media', true)
on conflict (id) do nothing;

drop policy if exists "mp media owner write" on storage.objects;
create policy "mp media owner write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'mp-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "mp media public read" on storage.objects;
create policy "mp media public read" on storage.objects
  for select to public using (bucket_id = 'mp-media');

-- ══════════════════════════════════════════════════════════════
-- 폴리 서포트 · 원클릭 셋업  (스키마 + 샘플 회계책임자 계정 + 데모 데이터)
-- 공유 Supabase(nroddjekdjwnwguwkudl) → SQL Editor 에 통째로 붙여넣고 RUN 한 번.
--
-- 실행 후 로그인:  demo-accountant@polyx.kr  /  poly1234!
--   → https://polyx.kr/support/manage/
--
-- ⚠ 실행 시 뜨는 경고 2개(destructive / RLS)는 정상입니다. 그대로 실행하세요.
--   - "destructive" = 아래 drop policy(정책 재생성)뿐, 데이터 삭제 아님
--   - "RLS 없음"    = 아래에서 5개 테이블 전부 enable row level security 로 켭니다
-- 여러 번 실행해도 안전(idempotent).
-- ══════════════════════════════════════════════════════════════


-- ╔══════════════════════════════════════════════════════════╗
-- ║  PART 1 · 스키마 (테이블 6개 + 헬퍼함수 + RLS + 뷰)        ║
-- ╚══════════════════════════════════════════════════════════╝

-- 0) 후원회 개설 사전신청 (committees.application_id 가 참조)
create table if not exists public.support_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  position text not null,
  district text not null,
  phone text not null,
  email text,
  message text,
  status text not null default 'pending'
);
alter table public.support_applications enable row level security;
drop policy if exists "anon can insert application" on public.support_applications;
create policy "anon can insert application"
  on public.support_applications for insert to anon with check (true);
drop policy if exists "authenticated can read applications" on public.support_applications;
create policy "authenticated can read applications"
  on public.support_applications for select to authenticated using (true);
drop policy if exists "authenticated can update applications" on public.support_applications;
create policy "authenticated can update applications"
  on public.support_applications for update to authenticated using (true);

-- 1) 후원회 (수취인)
create table if not exists public.committees (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  slug          text unique,
  politician    text not null,
  position      text not null,
  district      text not null,
  party         text,
  photo_url     text,
  intro         text,
  reg_no        text,
  account_bank  text,
  account_no    text,
  account_holder text,
  annual_limit  bigint not null default 150000000,
  status        text not null default 'pending',
  application_id uuid references public.support_applications(id),
  updated_at    timestamptz not null default now()
);
create index if not exists committees_status_idx on public.committees(status);

-- 2) 후원자
create table if not exists public.donors (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  user_id      uuid,
  name         text not null,
  phone        text,
  email        text,
  ci           text unique,
  verified     boolean not null default false,
  is_foreigner boolean not null default false,
  is_corporate boolean not null default false
);
create index if not exists donors_ci_idx on public.donors(ci);

-- 3) 후원 내역
create table if not exists public.donations (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  committee_id  uuid not null references public.committees(id),
  donor_id      uuid references public.donors(id),
  amount        integer not null check (amount > 0),
  is_anonymous  boolean not null default false,
  pg_provider   text,
  pg_tid        text,
  oid           text unique,
  pay_status    text not null default 'pending',
  paid_at       timestamptz,
  receipt_id    uuid,
  reported_at   timestamptz
);
create index if not exists donations_committee_idx on public.donations(committee_id, created_at desc);
create index if not exists donations_donor_idx on public.donations(donor_id);

-- 4) 정치자금영수증
create table if not exists public.receipts (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  donation_id   uuid not null references public.donations(id),
  committee_id  uuid not null references public.committees(id),
  receipt_no    text unique,
  issued_at     timestamptz,
  due_at        timestamptz,
  pdf_url       text
);

-- 5) 회계책임자 매핑
create table if not exists public.committee_managers (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  committee_id uuid not null references public.committees(id) on delete cascade,
  user_id      uuid not null,
  role         text not null default 'accountant',
  name         text,
  unique (committee_id, user_id)
);
create index if not exists cm_user_idx on public.committee_managers(user_id);

-- 헬퍼: 로그인 사용자가 해당 후원회의 관리자인지
create or replace function public.is_committee_manager(cid uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.committee_managers
    where committee_id = cid and user_id = auth.uid()
  );
$$;

-- RLS 켜기
alter table public.committees         enable row level security;
alter table public.donors             enable row level security;
alter table public.donations          enable row level security;
alter table public.receipts           enable row level security;
alter table public.committee_managers enable row level security;

drop policy if exists "anon read active committees" on public.committees;
create policy "anon read active committees"
  on public.committees for select to anon using (status = 'active');

drop policy if exists "manager read own committee" on public.committees;
create policy "manager read own committee"
  on public.committees for select to authenticated
  using (status = 'active' or public.is_committee_manager(id));

drop policy if exists "manager update own committee" on public.committees;
create policy "manager update own committee"
  on public.committees for update to authenticated
  using (public.is_committee_manager(id)) with check (public.is_committee_manager(id));

drop policy if exists "manager read own memberships" on public.committee_managers;
create policy "manager read own memberships"
  on public.committee_managers for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "manager read own donations" on public.donations;
create policy "manager read own donations"
  on public.donations for select to authenticated
  using (public.is_committee_manager(committee_id));

drop policy if exists "manager read own donors" on public.donors;
create policy "manager read own donors"
  on public.donors for select to authenticated
  using (exists (
    select 1 from public.donations d
    where d.donor_id = donors.id and public.is_committee_manager(d.committee_id)
  ));

drop policy if exists "manager read own receipts" on public.receipts;
create policy "manager read own receipts"
  on public.receipts for select to authenticated
  using (public.is_committee_manager(committee_id));

drop policy if exists "manager update own receipts" on public.receipts;
create policy "manager update own receipts"
  on public.receipts for update to authenticated
  using (public.is_committee_manager(committee_id)) with check (public.is_committee_manager(committee_id));

-- 편의 뷰 — 웹/관리자 후원회 카드용
create or replace view public.committee_public as
select
  c.id, c.slug, c.politician, c.position, c.district, c.party,
  c.photo_url, c.intro, c.annual_limit,
  coalesce(sum(d.amount) filter (where d.pay_status = 'paid'
    and d.created_at >= date_trunc('year', now())), 0) as raised_this_year,
  count(d.id) filter (where d.pay_status = 'paid') as donation_count
from public.committees c
left join public.donations d on d.committee_id = c.id
where c.status = 'active'
group by c.id;


-- ╔══════════════════════════════════════════════════════════╗
-- ║  PART 2 · 샘플 계정 + 데모 데이터                          ║
-- ╚══════════════════════════════════════════════════════════╝

-- 1) 로그인 계정 (auth.users + auth.identities)
do $$
declare
  v_uid uuid;
  v_email text := 'demo-accountant@polyx.kr';
  v_pass  text := 'poly1234!';
begin
  select id into v_uid from auth.users where email = v_email;

  if v_uid is null then
    v_uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      v_email, extensions.crypt(v_pass, extensions.gen_salt('bf')),
      now(), now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"홍길동 후원회 회계책임자"}'::jsonb,
      '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_uid, v_uid::text,
      jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
      'email', now(), now(), now()
    );
  else
    update auth.users
       set encrypted_password = extensions.crypt(v_pass, extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now())
     where id = v_uid;
  end if;
end $$;

-- 2) 샘플 후원회
insert into public.committees (id, slug, politician, position, district, party, intro, annual_limit, status)
values (
  '11111111-1111-1111-1111-111111111111', 'hong-gildong',
  '홍길동', '국회의원', '서울 종로구', '무소속',
  '투명한 정치, 시민과 함께합니다. 후원금은 선관위에 신고된 후원회 계좌로만 전달됩니다.',
  150000000, 'active'
)
on conflict (id) do update set status = 'active';

-- 3) 후원자 15명 + 후원 내역 (재실행 대비 데모 데이터 정리)
delete from public.donations where committee_id = '11111111-1111-1111-1111-111111111111' and oid like 'DEMO-%';
delete from public.donors where ci like 'DEMOCI-%';

with new_donors as (
  insert into public.donors (name, phone, verified, ci)
  select
    (array['김후원','이지원','박정성','최마음','정성실','한결같','오래도','서포터',
           '문금미','강한후','조용한','윤슬기','배려심','신뢰도','공정한'])[g],
    '010-' || lpad((1000 + g*13)::text, 4, '0') || '-' || lpad((3000 + g*7)::text, 4, '0'),
    (g % 6 <> 0),
    'DEMOCI-' || g
  from generate_series(1, 15) g
  returning id, ci
),
d as (
  select id, (regexp_replace(ci, 'DEMOCI-', ''))::int as rn from new_donors
)
insert into public.donations (committee_id, donor_id, amount, is_anonymous, oid, pay_status, paid_at, created_at, receipt_id)
select
  '11111111-1111-1111-1111-111111111111',
  d.id,
  (array[30000,50000,50000,100000,100000,100000,200000,300000,500000,1000000,2000000])[1 + (k % 11)],
  false,
  'DEMO-' || k,
  'paid',
  ts, ts,
  case when k % 5 <> 0 and ts < now() - interval '35 days' then gen_random_uuid() else null end
from generate_series(0, 44) k
join d on d.rn = 1 + (k % 15)
cross join lateral (
  select date_trunc('year', now()) + ((k * 8)::text || ' days')::interval + interval '9 days' as ts
) t
where t.ts <= now();

insert into public.donations (committee_id, donor_id, amount, is_anonymous, oid, pay_status, paid_at, created_at)
select
  '11111111-1111-1111-1111-111111111111',
  null,
  (array[30000,50000,100000,50000])[k+1],
  true,
  'DEMO-anon-' || k,
  'paid',
  now() - ((k*11)::text||' days')::interval,
  now() - ((k*11)::text||' days')::interval
from generate_series(0, 3) k;

-- 4) 회계책임자 매핑
insert into public.committee_managers (committee_id, user_id, role, name)
select '11111111-1111-1111-1111-111111111111', u.id, 'accountant', '홍길동 후원회 회계책임자'
from auth.users u
where u.email = 'demo-accountant@polyx.kr'
on conflict (committee_id, user_id) do nothing;

-- 5) 확인
select
  (select count(*) from public.donations where committee_id='11111111-1111-1111-1111-111111111111') as 후원건수,
  (select to_char(sum(amount),'FM999,999,999') from public.donations where committee_id='11111111-1111-1111-1111-111111111111') as 총모금,
  (select count(*) from public.committee_managers where committee_id='11111111-1111-1111-1111-111111111111') as 회계책임자수,
  (select email from auth.users where email='demo-accountant@polyx.kr') as 로그인계정;

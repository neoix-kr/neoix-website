-- 폴리 서포트 · Phase 0 — 후원회 운영 공유 스키마
-- 네오익스 공유 Supabase(nroddjekdjwnwguwkudl) SQL Editor에서 실행.
-- 앱(poly-build)·관리자(admin/index.html)·웹(poly-support)이 모두 이 테이블을 공유 → 자동 동기화.
--
-- 정치자금법 반영 포인트:
--  · 후원금은 신고된 후원회 계좌로만 (account_* 필드)
--  · 후원회 연 모금한도 / 후원자 연 2,000만·1후원회 500만 / 익명 회 10만·연 120만
--  · 정치자금영수증은 기부일부터 30일 내 교부

-- ─────────────────────────────────────────────
-- 1) 후원회 (수취인)  ── 관리자에서 등록/승인 → 웹에 노출
-- ─────────────────────────────────────────────
create table if not exists public.committees (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  slug          text unique,                    -- 유니버설링크/URL용 (/support/c/<slug>)
  politician    text not null,                  -- 정치인명
  position      text not null,                  -- 국회의원 | 시의회 | 구의회 | 군의회 | 도의회 | 예비후보 등
  district      text not null,                  -- 지역구
  party         text,                           -- 정당 (선택)
  photo_url     text,                           -- 프로필 이미지
  intro         text,                           -- 소개/후원 요청글
  reg_no        text,                           -- 선관위 후원회 등록번호
  -- 신고 정산계좌 (정치자금법상 후원금 수령 계좌)
  account_bank  text,
  account_no    text,
  account_holder text,
  -- 연 모금 한도 (원). 국회의원 평시 1.5억 / 선거有 3억 등 케이스별로 관리자 입력
  annual_limit  bigint not null default 150000000,
  status        text not null default 'pending', -- pending | active | paused | closed
  application_id uuid references public.support_applications(id), -- 사전신청에서 승격된 경우 연결
  updated_at    timestamptz not null default now()
);
create index if not exists committees_status_idx on public.committees(status);

-- ─────────────────────────────────────────────
-- 2) 후원자  ── 실명확인 + 연 누적(전체/후원회별) 한도 집계용
-- ─────────────────────────────────────────────
create table if not exists public.donors (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  user_id      uuid,                            -- 통합계정 로그인 시 auth.users.id (익명 후원은 null)
  name         text not null,
  phone        text,
  email        text,
  ci           text unique,                     -- 본인인증 CI (실명확인·중복합산 키). 익명이면 null
  verified     boolean not null default false,  -- 실명확인 완료 여부
  is_foreigner boolean not null default false,  -- 외국인(후원 불가 대상) 차단용
  is_corporate boolean not null default false   -- 법인/단체(후원 불가) 차단용
);
create index if not exists donors_ci_idx on public.donors(ci);

-- ─────────────────────────────────────────────
-- 3) 후원 내역  ── 결제 1건 = 1행. 회계보고·영수증의 원천 데이터
-- ─────────────────────────────────────────────
create table if not exists public.donations (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  committee_id  uuid not null references public.committees(id),
  donor_id      uuid references public.donors(id),
  amount        integer not null check (amount > 0),
  is_anonymous  boolean not null default false,  -- 익명 후원 (회 10만/연 120만 한도)
  -- 결제(Phase 2에서 채움)
  pg_provider   text,                            -- inicis | tosspayments | nicepay
  pg_tid        text,                            -- PG 거래 고유번호
  oid           text unique,                     -- 가맹점 주문번호
  pay_status    text not null default 'pending', -- pending | paid | cancelled | failed
  paid_at       timestamptz,
  -- 회계/영수증
  receipt_id    uuid,                            -- 발급된 정치자금영수증
  reported_at   timestamptz                      -- 회계보고 반영 시각
);
create index if not exists donations_committee_idx on public.donations(committee_id, created_at desc);
create index if not exists donations_donor_idx on public.donations(donor_id);

-- ─────────────────────────────────────────────
-- 4) 정치자금영수증  ── 기부일+30일 내 교부
-- ─────────────────────────────────────────────
create table if not exists public.receipts (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  donation_id   uuid not null references public.donations(id),
  committee_id  uuid not null references public.committees(id),
  receipt_no    text unique,                     -- 영수증 발급번호
  issued_at     timestamptz,                     -- 교부일 (null=발급대기)
  due_at        timestamptz,                     -- 교부기한 (기부일+30일)
  pdf_url       text
);

-- ─────────────────────────────────────────────
-- 5) 회계책임자 매핑  ── NEOIX 통합계정(auth.users) ↔ 후원회. 포털 접근권한의 핵심
-- ─────────────────────────────────────────────
create table if not exists public.committee_managers (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  committee_id uuid not null references public.committees(id) on delete cascade,
  user_id      uuid not null,                   -- auth.users.id (NEOIX 통합계정)
  role         text not null default 'accountant', -- accountant(회계책임자) | treasurer(회계원) | viewer
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

-- ─────────────────────────────────────────────
-- RLS — 익명=active 후원회만 조회 / 회계책임자=자기 후원회 것만 / insert=Edge Function(service_role)
-- ─────────────────────────────────────────────
alter table public.committees         enable row level security;
alter table public.donors             enable row level security;
alter table public.donations          enable row level security;
alter table public.receipts           enable row level security;
alter table public.committee_managers enable row level security;

-- 후원회: 익명은 active만, 회계책임자는 자기 것 조회/수정
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

-- 매핑: 본인 소속만 조회 (배정은 슈퍼관리자/Edge Function)
drop policy if exists "manager read own memberships" on public.committee_managers;
create policy "manager read own memberships"
  on public.committee_managers for select to authenticated
  using (user_id = auth.uid());

-- 후원 내역: 자기 후원회 것만 (명단·대시보드 원천)
drop policy if exists "manager read own donations" on public.donations;
create policy "manager read own donations"
  on public.donations for select to authenticated
  using (public.is_committee_manager(committee_id));

-- 후원자: 자기 후원회에 후원 이력이 있는 후원자만
drop policy if exists "manager read own donors" on public.donors;
create policy "manager read own donors"
  on public.donors for select to authenticated
  using (exists (
    select 1 from public.donations d
    where d.donor_id = donors.id and public.is_committee_manager(d.committee_id)
  ));

-- 영수증: 자기 후원회 것 조회/발급(교부일 기록 등)
drop policy if exists "manager read own receipts" on public.receipts;
create policy "manager read own receipts"
  on public.receipts for select to authenticated
  using (public.is_committee_manager(committee_id));

drop policy if exists "manager update own receipts" on public.receipts;
create policy "manager update own receipts"
  on public.receipts for update to authenticated
  using (public.is_committee_manager(committee_id)) with check (public.is_committee_manager(committee_id));

-- ─────────────────────────────────────────────
-- 편의 뷰 — 웹/관리자 후원회 카드용 (모금 집계 포함)
-- ─────────────────────────────────────────────
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

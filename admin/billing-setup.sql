-- ═══════════════════════════════════════════════════════════
-- 결제(구독) 관리 — 어드민 전용 · Supabase SQL Editor에서 1회 실행
-- 2026-08-02 비용 전수조사 결과를 시드로 넣는다 (표가 비어있을 때만)
-- ═══════════════════════════════════════════════════════════

create table if not exists public.admin_subscriptions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '기타',        -- 인프라 | AI | 스토어 | 도메인 | 기타
  amount numeric not null default 0,            -- 통화 단위 그대로 (USD면 달러 숫자)
  currency text not null default 'KRW',         -- KRW | USD
  cycle text not null default 'monthly',        -- monthly | yearly | usage(변동)
  billing_day int,                              -- 매월 결제일(1~31), 모르면 null
  billing_month int,                            -- 연간 결제월(1~12) — yearly만 사용
  card text not null default '',                -- 어떤 카드로 나가는지
  status text not null default 'active',        -- active | review(확인필요) | cancel_pending(해지예정) | cancelled(해지완료) | free(무료)
  url text,                                     -- 결제/청구 관리 페이지 링크
  memo text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_subscriptions enable row level security;

drop policy if exists admin_subscriptions_admin on public.admin_subscriptions;
create policy admin_subscriptions_admin on public.admin_subscriptions
  for all using (is_admin()) with check (is_admin());

insert into public.admin_subscriptions (name, category, amount, currency, cycle, billing_day, billing_month, card, status, url, memo, sort_order)
select * from (values
  ('Claude Max 구독','AI',200::numeric,'USD','monthly',null::int,null::int,'','active','https://claude.ai/settings/billing','개발 전반 · $200/월',1),
  ('AWS (바른문자+폴리 인프라)','인프라',220000::numeric,'KRW','usage',null,null,'','active','https://console.aws.amazon.com/billing/home','변동비 · 7월 실청구 약 22만원 · Fargate 4개+RDS+ALB',2),
  ('Netlify','인프라',9::numeric,'USD','monthly',null,null,'','cancel_pending','https://app.netlify.com','미사용 — 토큰 유출 건으로 해지 예정',3),
  ('Cloudflare Workers Paid','인프라',5::numeric,'USD','monthly',null,null,'','review','https://dash.cloudflare.com','가입 여부 미확인 — Billing→Subscriptions에서 확인',4),
  ('Apple Developer Program','스토어',99::numeric,'USD','yearly',null,null,'','active','https://developer.apple.com/account','연 $99 — 앱스토어 게시',5),
  ('Expo EAS','인프라',0::numeric,'USD','monthly',null,null,'','review','https://expo.dev/settings/billing','플랜 미확인 — 유료면 월 $99',6),
  ('Anthropic API (종량제)','AI',0::numeric,'USD','usage',null,null,'','review','https://console.anthropic.com/settings/billing','구독($200)과 별개 청구 — 폴리랩 PDF 파싱이 사용',7),
  ('Neon PostgreSQL','인프라',0::numeric,'USD','monthly',null,null,'','review','https://console.neon.tech','폴리랩 전용 DB — 플랜 미확인',8),
  ('Google Maps Platform','인프라',0::numeric,'USD','usage',null,null,'','review','https://console.cloud.google.com/billing','슈웅 지도 API — 월 $200 크레딧 내 무료 예상',9),
  ('가비아 — neoix.kr','도메인',23100::numeric,'KRW','yearly',null,3,'','active','https://my.gabia.com','2028-03 만료 · 실제 갱신가 확인 필요',10),
  ('가비아 — barunsms.com','도메인',26400::numeric,'KRW','yearly',null,3,'','active','https://my.gabia.com','2027-03 만료',11),
  ('가비아 — polyx.kr','도메인',23100::numeric,'KRW','yearly',null,4,'','active','https://my.gabia.com','2027-04 만료',12),
  ('가비아 — fxn.kr','도메인',23100::numeric,'KRW','yearly',null,4,'','review','https://my.gabia.com','2027-04 만료 · 갱신 여부 검토(링컷)',13),
  ('가비아 — goyangjung.kr','도메인',23100::numeric,'KRW','yearly',null,4,'','review','https://my.gabia.com','2027-04 만료 · 고객사 명의이전 검토',14),
  ('Supabase','인프라',0::numeric,'KRW','monthly',null,null,'','free','https://supabase.com/dashboard','무료 티어 — 통합 계정 DB',15),
  ('Firebase (FCM)','인프라',0::numeric,'KRW','monthly',null,null,'','free','https://console.firebase.google.com','안드로이드 푸시 — 무료',16),
  ('GitHub','인프라',0::numeric,'KRW','monthly',null,null,'','free','https://github.com','공개 레포 무료',17)
) as v(name, category, amount, currency, cycle, billing_day, billing_month, card, status, url, memo, sort_order)
where not exists (select 1 from public.admin_subscriptions);

-- ═══════════════════════════════════════════════════════════
-- 결제 관리 v2 — 서비스(앱)별 유지비 · Supabase SQL Editor에서 1회 실행
-- billing-setup.sql 실행 후에 돌리는 추가분 (여러 번 실행해도 안전)
-- ═══════════════════════════════════════════════════════════

alter table public.admin_subscriptions
  add column if not exists service text not null default '공통';

-- 기존 시드 행에 서비스 태깅
update public.admin_subscriptions set service='폴리'     where name in ('Anthropic API (종량제)','Neon PostgreSQL','가비아 — polyx.kr') and service='공통';
update public.admin_subscriptions set service='슈웅'     where name='Google Maps Platform' and service='공통';
update public.admin_subscriptions set service='바른문자' where name in ('가비아 — barunsms.com','가비아 — fxn.kr') and service='공통';
update public.admin_subscriptions set service='고양정'   where name='가비아 — goyangjung.kr' and service='공통';
update public.admin_subscriptions set service='기도해요' where name='Firebase (FCM)' and service='공통';

-- AWS 한 줄(22만)을 실측 기반 서비스별 4줄로 분리 (2026-08-02 리소스 전수조사 근거)
delete from public.admin_subscriptions where name='AWS (바른문자+폴리 인프라)';
insert into public.admin_subscriptions (name, service, category, amount, currency, cycle, billing_day, card, status, url, memo, sort_order)
select * from (values
  ('AWS — 바른문자 서버','바른문자','인프라',142000::numeric,'KRW','usage',4::int,'','active','https://console.aws.amazon.com/billing/home','Fargate+RDS+ALB+IP · 공용 인프라·미확인분 포함',2),
  ('AWS — 폴리랩','폴리','인프라',36000::numeric,'KRW','usage',4,'','review','https://console.aws.amazon.com/billing/home','7일 요청 145건 — 중지 검토 (월 3.6만 절감)',3),
  ('AWS — 폴리 서포트','폴리','인프라',20000::numeric,'KRW','usage',4,'','review','https://console.aws.amazon.com/billing/home','7일 요청 12건 — 딥링크 확인 후 중지 검토',4),
  ('AWS — 고양정 서버','고양정','인프라',20000::numeric,'KRW','usage',4,'','review','https://console.aws.amazon.com/billing/home','실사용 있음 — 고객사 유지비 청구 검토',5)
) as v(name, service, category, amount, currency, cycle, billing_day, card, status, url, memo, sort_order)
where not exists (select 1 from public.admin_subscriptions where name='AWS — 바른문자 서버');

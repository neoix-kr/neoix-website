-- 폴리 서포트 · 샘플 회계책임자 계정 + 데모 데이터 시드
-- 공유 Supabase(nroddjekdjwnwguwkudl) → SQL Editor 에서 실행.
--
-- ⚠ 먼저 support-committees.sql(Phase 0 스키마)을 1회 실행해 테이블을 만든 뒤 이 파일을 실행하세요.
--
-- 이 스크립트가 하는 일
--   1) 로그인 계정 생성           demo-accountant@polyx.kr  /  poly1234!
--   2) 샘플 후원회(홍길동 후원회, active) 등록
--   3) 후원자 15명 + 올해 후원 내역 ~45건(일부 익명·일부 영수증 발급완료) 시드
--   4) ①번 계정을 ②번 후원회의 회계책임자(accountant)로 매핑
-- 여러 번 실행해도 안전(idempotent). 데이터 초기화는 맨 아래 롤백 블록 참고.

-- ─────────────────────────────────────────────
-- 1) 로그인 계정 (auth.users + auth.identities)
--    Supabase SQL Editor는 postgres 권한이라 auth 스키마에 직접 삽입 가능.
--    email_confirmed_at 을 채워 이메일 인증 없이 바로 로그인되게 함.
-- ─────────────────────────────────────────────
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
    -- 이미 있으면 비밀번호만 데모값으로 재설정
    update auth.users
       set encrypted_password = extensions.crypt(v_pass, extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now())
     where id = v_uid;
  end if;
end $$;

-- ─────────────────────────────────────────────
-- 2) 샘플 후원회
-- ─────────────────────────────────────────────
insert into public.committees (id, slug, politician, position, district, party, intro, annual_limit, status)
values (
  '11111111-1111-1111-1111-111111111111', 'hong-gildong',
  '홍길동', '국회의원', '서울 종로구', '무소속',
  '투명한 정치, 시민과 함께합니다. 후원금은 선관위에 신고된 후원회 계좌로만 전달됩니다.',
  150000000, 'active'
)
on conflict (id) do update set status = 'active';

-- ─────────────────────────────────────────────
-- 3) 후원자 15명 + 후원 내역
-- ─────────────────────────────────────────────
-- 기존 데모 데이터 정리(재실행 대비)
delete from public.donations where committee_id = '11111111-1111-1111-1111-111111111111'
  and oid like 'DEMO-%';
delete from public.donors where ci like 'DEMOCI-%';

-- 후원자 15명 (일부 실명 미확인)
with new_donors as (
  insert into public.donors (name, phone, verified, ci)
  select
    (array['김후원','이지원','박정성','최마음','정성실','한결같','오래도','서포터',
           '문금미','강한후','조용한','윤슬기','배려심','신뢰도','공정한'])[g],
    '010-' || lpad((1000 + g*13)::text, 4, '0') || '-' || lpad((3000 + g*7)::text, 4, '0'),
    (g % 6 <> 0),                      -- 6명 중 1명꼴 실명 미확인
    'DEMOCI-' || g
  from generate_series(1, 15) g
  returning id, ci
),
d as (
  select id, (regexp_replace(ci, 'DEMOCI-', ''))::int as rn from new_donors
)
-- 실명 후원 45건: 연중 고르게 분포, 금액 다양, 오래된 건 일부 영수증 발급완료
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

-- 익명 후원 4건 (소액, 영수증 대상 아님)
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

-- ─────────────────────────────────────────────
-- 4) 회계책임자 매핑
-- ─────────────────────────────────────────────
insert into public.committee_managers (committee_id, user_id, role, name)
select '11111111-1111-1111-1111-111111111111', u.id, 'accountant', '홍길동 후원회 회계책임자'
from auth.users u
where u.email = 'demo-accountant@polyx.kr'
on conflict (committee_id, user_id) do nothing;

-- ─────────────────────────────────────────────
-- 확인
-- ─────────────────────────────────────────────
select
  (select count(*) from public.donations where committee_id='11111111-1111-1111-1111-111111111111') as 후원건수,
  (select to_char(sum(amount),'FM999,999,999') from public.donations where committee_id='11111111-1111-1111-1111-111111111111') as 총모금,
  (select count(*) from public.committee_managers where committee_id='11111111-1111-1111-1111-111111111111') as 회계책임자수;

-- ─────────────────────────────────────────────
-- (선택) 데모 데이터 전체 삭제하려면 아래 주석 해제 후 실행
-- ─────────────────────────────────────────────
-- delete from public.donations  where committee_id = '11111111-1111-1111-1111-111111111111';
-- delete from public.donors     where ci like 'DEMOCI-%';
-- delete from public.committee_managers where committee_id = '11111111-1111-1111-1111-111111111111';
-- delete from public.committees where id = '11111111-1111-1111-1111-111111111111';
-- delete from auth.users where email = 'demo-accountant@polyx.kr';

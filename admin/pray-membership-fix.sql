-- ============================================================
-- 기도해요 통계 누락 복구 + 재발 방지 (2026-08-01)
-- 증상: 카카오 가입자(박준엽·강석민)가 계정은 생겼는데 '기도해요' 멤버십이
--       기록되지 않아 어드민 앱별 통계에 안 잡힘.
-- 조치: ① 누락자 직접 복구 ② 프로필 보유자 전체 백필
--       ③ 프로필 생성 시 서버가 자동 기록하는 트리거(앱 버전 무관 — 재발 방지)
-- Supabase SQL Editor에서 실행 (재실행 안전)
-- ============================================================

-- 1) 누락 확인된 두 명 직접 복구
insert into service_memberships (user_id, service_key, service_name, first_seen, last_seen)
select p.id, 'pray', '기도해요', p.created_at, p.created_at
from profiles p
where p.email in ('ubesta13@naver.com', 'tjrals58@gmail.com')
on conflict (user_id, service_key) do nothing;

-- 2) 기도해요 프로필 보유자 전원 백필 (혹시 더 누락된 사람까지)
insert into service_memberships (user_id, service_key, service_name, first_seen, last_seen)
select pp.id, 'pray', '기도해요', coalesce(pp.created_at, now()), coalesce(pp.created_at, now())
from pray_profiles pp
on conflict (user_id, service_key) do nothing;

-- 3) 재발 방지 트리거 — 이제 앱이 기록에 실패해도 서버가 무조건 기록
create or replace function pray_auto_membership() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into service_memberships (user_id, service_key, service_name, first_seen, last_seen)
  values (new.id, 'pray', '기도해요', now(), now())
  on conflict (user_id, service_key) do nothing;
  return new;
end $$;
drop trigger if exists trg_pray_auto_membership on pray_profiles;
create trigger trg_pray_auto_membership after insert on pray_profiles
for each row execute function pray_auto_membership();

-- 4) 확인 — 기도해요 멤버 명단
select p.email, p.display_name, sm.first_seen
from service_memberships sm join profiles p on p.id = sm.user_id
where sm.service_key = 'pray' order by sm.first_seen desc;

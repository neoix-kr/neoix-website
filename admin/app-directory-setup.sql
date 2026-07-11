-- ============================================================
-- 어드민 앱별 사용자 구분 재편 (2026-07-11)
-- 1) 과거 가입자를 service_memberships로 백필 (poly/pray/ogx)
-- 2) get_user_directory2: 가입 앱(signup_app) + 사용 앱 목록(apps)
-- 3) get_app_stats: 앱별 가입자 통계
-- Supabase SQL Editor에서 실행 (재실행 안전)
-- ============================================================

-- 1) 백필 ------------------------------------------------------
-- 폴리: poly_profiles 보유자 = 폴리 사용자
INSERT INTO service_memberships (user_id, service_key, service_name, first_seen, last_seen)
SELECT p.id, 'poly', '폴리',
       COALESCE(p.created_at, now()), COALESCE(p.updated_at, p.created_at, now())
FROM poly_profiles p
ON CONFLICT (user_id, service_key) DO NOTHING;

-- 기도해요: pray_profiles 보유자
INSERT INTO service_memberships (user_id, service_key, service_name, first_seen, last_seen)
SELECT p.id, 'pray', '기도해요',
       COALESCE(p.created_at, now()), COALESCE(p.created_at, now())
FROM pray_profiles p
ON CONFLICT (user_id, service_key) DO NOTHING;

-- OGX 찬양팀: room_members 참여 이력자
INSERT INTO service_memberships (user_id, service_key, service_name, first_seen, last_seen)
SELECT rm.user_id, 'ogx', 'OGX 찬양팀', MIN(rm.joined_at), MAX(rm.joined_at)
FROM room_members rm
WHERE rm.user_id IS NOT NULL
GROUP BY rm.user_id
ON CONFLICT (user_id, service_key) DO NOTHING;

-- 슈웅(travel-globe): 데이터가 별도 프로젝트라 백필 불가.
-- 앱이 로그인 시 record_membership('travel-globe')을 호출하므로 신규 로그인부터 자동 집계됨.

-- 2) 사용자 디렉토리 v2 ----------------------------------------
-- signup_app = 가장 먼저 기록된 앱(first_seen 최솟값). 기록 없으면 NULL(→어드민에서 '홈' 처리)
CREATE OR REPLACE FUNCTION get_user_directory2()
RETURNS TABLE (
  id UUID, email TEXT, display_name TEXT, signup_provider TEXT,
  created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ,
  signup_app TEXT, apps JSONB
)
LANGUAGE SQL SECURITY DEFINER STABLE SET search_path=public AS $$
  SELECT
    p.id, p.email, p.display_name, p.signup_provider,
    p.created_at, u.last_sign_in_at,
    (SELECT sm.service_key FROM service_memberships sm
      WHERE sm.user_id = p.id
      ORDER BY sm.first_seen ASC NULLS LAST LIMIT 1) AS signup_app,
    COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'key', sm.service_key, 'name', sm.service_name, 'first_seen', sm.first_seen)
        ORDER BY sm.first_seen)
      FROM service_memberships sm WHERE sm.user_id = p.id), '[]'::jsonb) AS apps
  FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE is_admin()
  ORDER BY p.created_at DESC;
$$;

-- 3) 앱별 통계 --------------------------------------------------
CREATE OR REPLACE FUNCTION get_app_stats()
RETURNS TABLE (app_key TEXT, total BIGINT, new_7d BIGINT)
LANGUAGE SQL SECURITY DEFINER STABLE SET search_path=public AS $$
  WITH first_app AS (
    SELECT DISTINCT ON (sm.user_id) sm.user_id, sm.service_key, sm.first_seen
    FROM service_memberships sm
    ORDER BY sm.user_id, sm.first_seen ASC NULLS LAST
  ), everyone AS (
    SELECT p.id, COALESCE(fa.service_key, 'home') AS app_key, p.created_at
    FROM profiles p LEFT JOIN first_app fa ON fa.user_id = p.id
  )
  SELECT e.app_key, COUNT(*)::BIGINT AS total,
         COUNT(*) FILTER (WHERE e.created_at > now() - interval '7 days')::BIGINT AS new_7d
  FROM everyone e
  WHERE is_admin()
  GROUP BY e.app_key;
$$;

-- 검증
SELECT service_key, COUNT(*) FROM service_memberships GROUP BY service_key ORDER BY 2 DESC;

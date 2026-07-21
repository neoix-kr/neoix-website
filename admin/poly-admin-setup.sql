-- ============================================================
-- NEOIX Admin — 폴리(정치앱) 관리 RPC 셋업 SQL
-- Supabase Dashboard > SQL Editor 에서 실행 (재실행 안전)
-- 사전 조건:
--   1) admin/setup.sql (admin_users 테이블 + is_admin() 함수)
--   2) poly-full-setup.sql (poly_profiles, poly_complaints, poly_polls 등)
-- 권한 체크: 모든 함수 내부에서 is_admin() 확인 — 관리자 아니면 EXCEPTION
-- ============================================================

-- ------------------------------------------------------------
-- 1. 정치인 목록 (poly_profiles + auth.users 이메일/인증상태 조인)
--    정치인 인증 상태는 auth.users.raw_user_meta_data->>'poly_verification_status'
--    ('pending' | 'approved' | 'rejected', 없으면 pending 취급)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION poly_admin_list_politicians()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  politician_id TEXT,
  region_province TEXT,
  region_city TEXT,
  verification_status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    u.email::TEXT,
    p.politician_id,
    p.region_province,
    p.region_city,
    COALESCE(u.raw_user_meta_data->>'poly_verification_status', 'pending') AS verification_status,
    p.created_at
  FROM poly_profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.role = 'politician'
  ORDER BY p.created_at DESC;
END $$;

-- ------------------------------------------------------------
-- 2. 정치인 인증 승인/반려 (raw_user_meta_data 갱신)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION poly_admin_set_verification(p_user_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;
  IF p_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION '잘못된 상태값입니다: %', p_status;
  END IF;
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{poly_verification_status}',
    to_jsonb(p_status)
  )
  WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION '해당 사용자를 찾을 수 없습니다';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3. 폴리 대시보드 통계
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION poly_admin_stats()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;
  SELECT jsonb_build_object(
    'citizens',       (SELECT COUNT(*) FROM poly_profiles WHERE role = 'citizen'),
    'politicians',    (SELECT COUNT(*) FROM poly_profiles WHERE role = 'politician'),
    'pending_verification', (
      SELECT COUNT(*)
      FROM poly_profiles p
      JOIN auth.users u ON u.id = p.id
      WHERE p.role = 'politician'
        AND COALESCE(u.raw_user_meta_data->>'poly_verification_status', 'pending') = 'pending'
    ),
    'complaints_total', (SELECT COUNT(*) FROM poly_complaints),
    'complaints_by_status', (
      SELECT COALESCE(jsonb_object_agg(s.status, s.cnt), '{}'::jsonb)
      FROM (SELECT status, COUNT(*) AS cnt FROM poly_complaints GROUP BY status) s
    ),
    'active_polls', (SELECT COUNT(*) FROM poly_polls WHERE ends_at > now())
  ) INTO v_result;
  RETURN v_result;
END $$;

-- ------------------------------------------------------------
-- 4-1. 공식 여론조사 등록 (is_official = true, created_by = NULL)
--      p_options 예: [{"id":"opt1","label":"찬성"},{"id":"opt2","label":"반대"}]
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION poly_admin_create_poll(
  p_title TEXT,
  p_description TEXT,
  p_category TEXT,
  p_region_province TEXT,
  p_region_city TEXT,
  p_options JSONB,
  p_ends_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION '제목을 입력하세요';
  END IF;
  IF p_category NOT IN ('정책', '조례', '지역이슈') THEN
    RAISE EXCEPTION '잘못된 카테고리입니다: %', p_category;
  END IF;
  IF p_options IS NULL OR jsonb_typeof(p_options) <> 'array'
     OR jsonb_array_length(p_options) < 2 OR jsonb_array_length(p_options) > 4 THEN
    RAISE EXCEPTION '보기는 2~4개여야 합니다';
  END IF;
  IF p_ends_at IS NULL OR p_ends_at <= now() THEN
    RAISE EXCEPTION '마감일은 미래 시각이어야 합니다';
  END IF;
  INSERT INTO poly_polls (title, description, category, region_province, region_city, options, ends_at, created_by, is_official)
  VALUES (trim(p_title), NULLIF(trim(COALESCE(p_description, '')), ''), p_category,
          NULLIF(trim(COALESCE(p_region_province, '')), ''), NULLIF(trim(COALESCE(p_region_city, '')), ''),
          p_options, p_ends_at, NULL, true)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- ------------------------------------------------------------
-- 4-2. 여론조사 조기 마감 (ends_at = now())
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION poly_admin_close_poll(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;
  UPDATE poly_polls SET ends_at = now() WHERE id = p_id AND ends_at > now();
  IF NOT FOUND THEN
    RAISE EXCEPTION '진행 중인 여론조사를 찾을 수 없습니다';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 5-1. 민원 목록 (작성자명 · 수신 의원 · 상태 · 동의수)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION poly_admin_list_complaints()
RETURNS TABLE (
  id UUID,
  title TEXT,
  user_name TEXT,
  politician_name TEXT,
  target_type TEXT,
  target_province TEXT,
  target_city TEXT,
  category TEXT,
  status TEXT,
  agree_count INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.user_name,
    c.politician_name,
    c.target_type,
    c.target_province,
    c.target_city,
    c.category,
    c.status,
    c.agree_count,
    c.created_at
  FROM poly_complaints c
  ORDER BY c.created_at DESC;
END $$;

-- ------------------------------------------------------------
-- 5-2. 민원 상태 변경 (상태별 타임스탬프 자동 기록)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION poly_admin_set_complaint_status(p_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION '관리자 권한이 필요합니다';
  END IF;
  IF p_status NOT IN ('pending', 'reviewing', 'accepted', 'processing', 'resolved', 'rejected') THEN
    RAISE EXCEPTION '잘못된 상태값입니다: %', p_status;
  END IF;
  UPDATE poly_complaints
  SET status = p_status,
      reviewed_at   = CASE WHEN p_status = 'reviewing'  THEN now() ELSE reviewed_at END,
      accepted_at   = CASE WHEN p_status = 'accepted'   THEN now() ELSE accepted_at END,
      processing_at = CASE WHEN p_status = 'processing' THEN now() ELSE processing_at END,
      resolved_at   = CASE WHEN p_status = 'resolved'   THEN now() ELSE resolved_at END
  WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION '해당 민원을 찾을 수 없습니다';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 실행 권한: authenticated 에게만 (내부에서 is_admin() 체크)
-- ------------------------------------------------------------
REVOKE ALL ON FUNCTION poly_admin_list_politicians() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION poly_admin_set_verification(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION poly_admin_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION poly_admin_create_poll(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION poly_admin_close_poll(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION poly_admin_list_complaints() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION poly_admin_set_complaint_status(UUID, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION poly_admin_list_politicians() TO authenticated;
GRANT EXECUTE ON FUNCTION poly_admin_set_verification(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION poly_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION poly_admin_create_poll(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION poly_admin_close_poll(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION poly_admin_list_complaints() TO authenticated;
GRANT EXECUTE ON FUNCTION poly_admin_set_complaint_status(UUID, TEXT) TO authenticated;

-- ============================================================
-- 프로필 인증(폴리 프로필 사이트 = polyx.kr/profile) 어드민 연동
-- 사전조건: poly-profile/poly-setup.sql (poly_pages, poly_verifications,
--           poly_review_verification, poly_is_admin) 적용됨
-- 목적: 어드민(admin_users, @users.neoix.kr 계정)도 poly_is_admin 권한을 갖게 확장
--       → 네오익스 어드민 "프로필 인증" 탭에서 서류 조회·서명URL·승인 가능
-- 재실행 안전
-- ============================================================
CREATE OR REPLACE FUNCTION poly_is_admin() RETURNS boolean
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce((auth.jwt() ->> 'email') = 'wjdrua7315@gmail.com', false)
      OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
$$;

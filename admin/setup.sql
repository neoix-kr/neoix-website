-- ============================================================
-- NEOIX Admin Panel — Supabase 셋업 SQL
-- Supabase Dashboard > SQL Editor 에서 실행하세요
-- ============================================================

-- 1. 관리자 테이블
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read_self" ON admin_users
  FOR SELECT USING (auth.uid() = user_id);

-- 2. 관리자 체크 함수
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid());
$$;

-- 3. 전체 auth 사용자 조회 (관리자 전용, SECURITY DEFINER로 auth.users 접근)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  username TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
)
LANGUAGE SQL SECURITY DEFINER STABLE
AS $$
  SELECT
    u.id,
    u.email,
    u.raw_user_meta_data->>'username' AS username,
    u.created_at,
    u.last_sign_in_at
  FROM auth.users u
  WHERE is_admin()
  ORDER BY u.created_at DESC;
$$;

-- 4. 관리자가 모든 방/멤버를 볼 수 있도록 RLS 추가
-- (기존 정책과 OR로 동작, 충돌 없음)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'admin_read_all_rooms'
  ) THEN
    CREATE POLICY "admin_read_all_rooms" ON rooms FOR SELECT USING (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'admin_read_all_members'
  ) THEN
    CREATE POLICY "admin_read_all_members" ON room_members FOR SELECT USING (is_admin());
  END IF;
END $$;

-- 5. 프로젝트 테이블
CREATE TABLE IF NOT EXISTS admin_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  icon TEXT DEFAULT '📦',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'development', 'archived')),
  infra TEXT,
  category TEXT DEFAULT 'web' CHECK (category IN ('web', 'mobile', 'tool', 'api')),
  has_own_admin BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE admin_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_projects" ON admin_projects
  FOR ALL USING (is_admin());

-- 6. 초기 프로젝트 시드
INSERT INTO admin_projects (name, description, url, icon, status, infra, category, has_own_admin, sort_order)
VALUES
  ('NEOIX', '네오익스 회사 홈페이지', 'https://neoix.kr', '🏢', 'active', 'Netlify', 'web', false, 1),
  ('OGX 찬양팀', '교회 찬양팀 도구 모음', 'https://neoix.kr/ogx', '🎵', 'active', 'Netlify + Supabase', 'tool', false, 2),
  ('폴리랩', '데이터 기반 선거 전략 분석', 'https://polyx.kr/lab', '📊', 'active', 'AWS ECS', 'web', false, 3),
  ('travel-globe', '세계여행 기록 앱', NULL, '🌍', 'development', 'Expo (로컬)', 'mobile', false, 4),
  ('NEW''S', '종합 뉴스 플랫폼', NULL, '📰', 'development', 'Next.js + Expo', 'web', false, 5),
  ('바른문자', '대량 문자 발송 서비스', 'https://barunsms.com', '💬', 'active', 'AWS ECS + RDS', 'web', true, 6)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. 관리자 등록 (로그인 후 본인 user_id 확인하고 아래 실행)
-- 방법: 관리자 페이지에서 로그인 → 콘솔에 user_id 표시됨
-- 그 값을 아래에 넣고 실행:
--
-- INSERT INTO admin_users (user_id) VALUES ('여기에-user-id-입력');
-- ============================================================

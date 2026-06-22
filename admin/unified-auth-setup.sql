-- ============================================================
-- NEOIX 통합 계정 (Unified Identity) 셋업 SQL
-- 모든 네오익스 앱(웹 + iOS/Android)이 공유하는 계정 기반
-- Supabase SQL Editor 에서 실행 (재실행 안전)
-- ============================================================

-- 1. 통합 프로필: 네오익스 계정 1개당 1행
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  signup_provider TEXT,              -- 'email' | 'apple' | 'google'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. 서비스 가입 추적: 한 계정이 어떤 앱들을 쓰는지
CREATE TABLE IF NOT EXISTS service_memberships (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service_key TEXT NOT NULL,         -- 'ogx' | 'travel-globe' | 'news' ...
  service_name TEXT,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, service_key)
);
ALTER TABLE service_memberships ENABLE ROW LEVEL SECURITY;

-- 3. 신규 가입 시 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, avatar_url, signup_provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name',
             NEW.raw_user_meta_data->>'full_name',
             NEW.raw_user_meta_data->>'name',
             NEW.raw_user_meta_data->>'username'),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. 앱이 로그인 후 호출 → "이 계정이 이 서비스를 쓴다" 기록
CREATE OR REPLACE FUNCTION record_membership(p_service_key TEXT, p_service_name TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO service_memberships (user_id, service_key, service_name, first_seen, last_seen)
  VALUES (auth.uid(), p_service_key, p_service_name, now(), now())
  ON CONFLICT (user_id, service_key)
  DO UPDATE SET last_seen = now(),
                service_name = COALESCE(EXCLUDED.service_name, service_memberships.service_name);
END $$;

-- 5. RLS — 본인은 본인 것 관리, 관리자는 전체 조회
DROP POLICY IF EXISTS "profiles_self_read"   ON profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_read"  ON profiles;
CREATE POLICY "profiles_self_read"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_read"  ON profiles FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "memb_self"       ON service_memberships;
DROP POLICY IF EXISTS "memb_admin_read" ON service_memberships;
CREATE POLICY "memb_self"       ON service_memberships FOR ALL    USING (auth.uid() = user_id);
CREATE POLICY "memb_admin_read" ON service_memberships FOR SELECT USING (is_admin());

-- 6. 기존 16명 가입자 → 프로필 백필
INSERT INTO profiles (id, email, display_name, avatar_url, signup_provider)
SELECT u.id, u.email,
       COALESCE(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'username'),
       u.raw_user_meta_data->>'avatar_url',
       COALESCE(u.raw_app_meta_data->>'provider', 'email')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- 7. 관리자용 통합 사용자 디렉토리 (프로필 + 가입 서비스 수)
CREATE OR REPLACE FUNCTION get_user_directory()
RETURNS TABLE (
  id UUID, email TEXT, display_name TEXT, signup_provider TEXT,
  service_count BIGINT, services TEXT, created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ
)
LANGUAGE SQL SECURITY DEFINER STABLE SET search_path=public AS $$
  SELECT
    p.id, p.email, p.display_name, p.signup_provider,
    COUNT(sm.service_key) AS service_count,
    STRING_AGG(COALESCE(sm.service_name, sm.service_key), ', ' ORDER BY sm.first_seen) AS services,
    p.created_at, u.last_sign_in_at
  FROM profiles p
  LEFT JOIN service_memberships sm ON sm.user_id = p.id
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE is_admin()
  GROUP BY p.id, p.email, p.display_name, p.signup_provider, p.created_at, u.last_sign_in_at
  ORDER BY p.created_at DESC;
$$;

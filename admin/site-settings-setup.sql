-- ============================================================
-- 사이트 설정 (홈 히어로 단어 등) — 공개 읽기 / 관리자 쓰기
-- ============================================================
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 (홈페이지가 비로그인으로 단어를 가져와야 함)
DROP POLICY IF EXISTS "settings_public_read" ON site_settings;
CREATE POLICY "settings_public_read" ON site_settings FOR SELECT USING (true);

-- 관리자만 쓰기
DROP POLICY IF EXISTS "settings_admin_write" ON site_settings;
CREATE POLICY "settings_admin_write" ON site_settings FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- 기본 단어 시드
INSERT INTO site_settings (key, value)
VALUES ('hero_words', '["아이디어의","세대의","경험의"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

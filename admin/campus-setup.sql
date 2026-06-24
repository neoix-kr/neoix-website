-- ============================================================
-- AI 캠퍼스 좌석 예약 데모 — 공개 읽기/등록 (데모용)
-- ============================================================
CREATE TABLE IF NOT EXISTS campus_reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL,
  seat TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_id, seat)
);
ALTER TABLE campus_reservations ENABLE ROW LEVEL SECURITY;

-- 예약 현황은 누구나 조회(좌석 점유 표시), 데모라 등록도 공개 허용
DROP POLICY IF EXISTS "res_read" ON campus_reservations;
CREATE POLICY "res_read" ON campus_reservations FOR SELECT USING (true);
DROP POLICY IF EXISTS "res_insert" ON campus_reservations;
CREATE POLICY "res_insert" ON campus_reservations FOR INSERT WITH CHECK (true);
-- 관리자만 삭제(예약 초기화)
DROP POLICY IF EXISTS "res_admin_delete" ON campus_reservations;
CREATE POLICY "res_admin_delete" ON campus_reservations FOR DELETE USING (is_admin());

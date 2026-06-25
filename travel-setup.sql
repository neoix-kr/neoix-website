-- ============================================================
-- 트레블 (neoix.kr/travel) — 여행 날짜 조율 Supabase 셋업 SQL
-- Supabase Dashboard > SQL Editor 에서 통째로 실행하세요.
-- (기존 NEOIX 프로젝트 nroddjekdjwnwguwkudl 에 travel_ 접두사로 추가)
-- ============================================================

-- 1) 여행 방
CREATE TABLE IF NOT EXISTS travel_rooms (
  id          TEXT PRIMARY KEY,                 -- URL용 짧은 랜덤 ID
  title       TEXT NOT NULL,                    -- 여행 제목
  months      INT  NOT NULL DEFAULT 4,          -- 캘린더에 펼칠 개월 수
  start_ym    TEXT,                             -- 시작 연-월 (예: '2026-06'), NULL이면 이번 달
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2) 참가자 (로그인 없이 이름만)
CREATE TABLE IF NOT EXISTS travel_participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     TEXT NOT NULL REFERENCES travel_rooms(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#111111',
  done        BOOLEAN NOT NULL DEFAULT false,   -- 날짜 선택 완료 여부
  created_at  TIMESTAMPTZ DEFAULT now()
);
-- 기존 테이블에 done 컬럼 보강 (이미 있으면 무시)
ALTER TABLE travel_participants ADD COLUMN IF NOT EXISTS done BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_travel_participants_room ON travel_participants(room_id);

-- 3) 가능한 날짜 (참가자별로 1행 = 1날짜)
CREATE TABLE IF NOT EXISTS travel_availability (
  participant_id UUID NOT NULL REFERENCES travel_participants(id) ON DELETE CASCADE,
  room_id        TEXT NOT NULL REFERENCES travel_rooms(id) ON DELETE CASCADE,
  d              DATE NOT NULL,
  PRIMARY KEY (participant_id, d)
);
CREATE INDEX IF NOT EXISTS idx_travel_avail_room ON travel_availability(room_id);

-- ============================================================
-- RLS: 익명(publishable key) 접근 허용.
-- 방 ID 자체가 비공개 토큰 역할을 하는 간단한 조율 도구이므로
-- anon 역할에 전체 권한을 부여합니다.
-- ============================================================
ALTER TABLE travel_rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS travel_rooms_anon        ON travel_rooms;
DROP POLICY IF EXISTS travel_participants_anon ON travel_participants;
DROP POLICY IF EXISTS travel_availability_anon ON travel_availability;

CREATE POLICY travel_rooms_anon        ON travel_rooms        FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY travel_participants_anon ON travel_participants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY travel_availability_anon ON travel_availability FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Realtime: 실시간 동기화용 publication 등록
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE travel_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE travel_availability;

-- 완료!

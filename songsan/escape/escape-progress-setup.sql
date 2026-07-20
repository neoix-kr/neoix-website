-- 믿음의 항해 방탈출 — 팀 진행 현황 (관리자 대시보드용)
-- Supabase SQL Editor에 붙여넣고 실행하세요.

create table if not exists escape_progress (
  team_name   text primary key,
  team_code   int  not null default 0,   -- 팀별 현장 코드 세트 (0/1/2)
  act         int  not null default 0,   -- 현재 막 0~5
  solved      int  not null default 0,   -- 해결한 관문 수 0~13
  solved_ids  text[] not null default '{}',
  items       text[] not null default '{}',
  ship        text[] not null default '{}',
  locks       text[] not null default '{}',
  hints       int  not null default 0,
  reveals     int  not null default 0,
  penalty_min int  not null default 0,
  elapsed_ms  bigint not null default 0,
  phase       text not null default 'play',
  finished    boolean not null default false,
  last_event  text,
  updated_at  timestamptz not null default now()
);

-- 대시보드 정렬용
create index if not exists escape_progress_updated_idx on escape_progress (updated_at desc);

alter table escape_progress enable row level security;

-- 수련회 현장용: 익명 키로 자기 팀 행을 쓰고, 관리자 창이 전체를 읽는다.
-- 학생이 이 테이블을 봐도 정답은 없다(진행 상황만 저장).
drop policy if exists escape_progress_read on escape_progress;
create policy escape_progress_read on escape_progress
  for select using (true);

drop policy if exists escape_progress_upsert on escape_progress;
create policy escape_progress_upsert on escape_progress
  for insert with check (true);

drop policy if exists escape_progress_update on escape_progress;
create policy escape_progress_update on escape_progress
  for update using (true) with check (true);

-- 수련회 끝나고 초기화할 때:
-- truncate escape_progress;

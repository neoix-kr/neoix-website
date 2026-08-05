-- ═══════════════════════════════════════════════════════════════
--  송산 수련회 — 로그인 · 레크레이션 방 · 마피아 v2
--  Supabase SQL Editor 에 통째로 붙여넣고 Run 하세요. 여러 번 실행해도 안전합니다.
-- ═══════════════════════════════════════════════════════════════

-- ── 1) 참가자 (조 + 성명 로그인) ──────────────────────────────
create table if not exists songsan_members (
  id         uuid primary key default gen_random_uuid(),
  device     text unique not null,          -- 폰마다 고유값
  team       text not null,                 -- 조
  name       text not null,                 -- 성 + 이름
  dept       text,                          -- 부서(선택)
  created_at timestamptz default now(),
  seen_at    timestamptz default now()
);
create index if not exists songsan_members_team_idx on songsan_members(team);

-- ── 2) 레크레이션 방 ─────────────────────────────────────────
create table if not exists songsan_rooms (
  code        text primary key,             -- 4자리 입장코드
  kind        text not null default 'mafia',-- mafia | liar
  title       text,
  host_device text,
  status      text default 'lobby',         -- lobby | playing | ended
  settings    jsonb default '{}'::jsonb,    -- {seats, roles:{...}, dayLen, nightLen}
  state       jsonb default '{}'::jsonb,    -- {phase, round, mission, notice, winner, log:[]}
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── 3) 방 참가자 (마피아 진행 상태 포함) ──────────────────────
create table if not exists songsan_room_members (
  id           uuid primary key default gen_random_uuid(),
  room         text not null references songsan_rooms(code) on delete cascade,
  device       text not null,
  name         text not null,
  team         text,
  playing      boolean default true,        -- 이번 판에 참가할지 토글
  role         text,                        -- mafia|doctor|police|soldier|spy|clown|citizen
  alive        boolean default true,
  seen_card    boolean default false,       -- 역할 카드를 한 번 열어봤는지
  shield       int     default 0,           -- 군인 남은 방어 횟수
  vote         text,                        -- 투표 대상 member id
  night_target text,                        -- 밤 행동 대상 member id
  night_result text,                        -- 경찰·스파이 조사 결과(본인만 봄)
  joined_at    timestamptz default now(),
  unique (room, device)
);
create index if not exists songsan_room_members_room_idx on songsan_room_members(room);

-- ── 4) 사회자가 실시간으로 고르는 미션 ────────────────────────
create table if not exists songsan_rec_missions (
  id    uuid primary key default gen_random_uuid(),
  kind  text default 'mafia',
  text  text not null,
  sort  int  default 0
);

insert into songsan_rec_missions (kind, text, sort)
select * from (values
  ('mafia','오늘 낮에는 서로를 "형제님/자매님"이라고만 부르기', 1),
  ('mafia','발언할 때 반드시 손을 들고 지목받은 뒤에 말하기', 2),
  ('mafia','자기 차례에 성경 인물 한 명을 말하고 시작하기', 3),
  ('mafia','투표 전에 각자 30초씩만 변론하기', 4),
  ('mafia','한 사람도 빠짐없이 한 마디씩 하고 투표하기', 5),
  ('mafia','"마피아"라는 단어를 말하면 그 사람은 다음 발언 금지', 6),
  ('mafia','밤이 끝나면 다 함께 히브리서 12:2 암송하기', 7)
) as v(kind, text, sort)
where not exists (select 1 from songsan_rec_missions);

-- ── 5) RLS (수련회용 공개 정책) ───────────────────────────────
alter table songsan_members      enable row level security;
alter table songsan_rooms        enable row level security;
alter table songsan_room_members enable row level security;
alter table songsan_rec_missions enable row level security;

drop policy if exists "members all"      on songsan_members;
drop policy if exists "rooms all"        on songsan_rooms;
drop policy if exists "room_members all" on songsan_room_members;
drop policy if exists "rec_missions all" on songsan_rec_missions;

create policy "members all"      on songsan_members      for all using (true) with check (true);
create policy "rooms all"        on songsan_rooms        for all using (true) with check (true);
create policy "room_members all" on songsan_room_members for all using (true) with check (true);
create policy "rec_missions all" on songsan_rec_missions for all using (true) with check (true);

-- ── 6) 방 정리 (사회자가 방을 닫으면 참가자도 함께 사라짐) ─────
create or replace function songsan_close_room(p_code text)
returns void language sql security definer as $$
  delete from songsan_rooms where code = p_code;
$$;

-- ── 7) 오래된 방 자동 정리용 (원할 때 수동 실행) ──────────────
create or replace function songsan_purge_old_rooms()
returns int language sql security definer as $$
  with d as (delete from songsan_rooms where updated_at < now() - interval '12 hours' returning 1)
  select count(*)::int from d;
$$;

-- ── 8) 같은 역할끼리만 보는 채팅 (마피아 채팅 등) ───────────
create table if not exists songsan_room_chat (
  id     uuid primary key default gen_random_uuid(),
  room   text not null,
  team   text not null,          -- 역할 키 (mafia / doctor / police …)
  member uuid,
  name   text,
  body   text not null,
  at     timestamptz default now()
);
create index if not exists songsan_room_chat_idx on songsan_room_chat(room, team, at);
alter table songsan_room_chat enable row level security;
drop policy if exists "room_chat all" on songsan_room_chat;
create policy "room_chat all" on songsan_room_chat for all using (true) with check (true);

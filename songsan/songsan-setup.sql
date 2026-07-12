-- ============================================================
-- 송산제일교회 2026 여름수련회 '믿음의 항해' — Supabase 셋업
-- NEOIX 공용 프로젝트(nroddjekdjwnwguwkudl)에서 1회 실행
-- (SQL Editor에 붙여넣고 Run)
-- ============================================================

-- 1) 일정별 사진 테이블
create table if not exists songsan_photos (
  id          uuid primary key default gen_random_uuid(),
  session     text not null,           -- 일정 (예: '2일차 · 물놀이')
  dept        text,                    -- 부서 (선택: 유치/유년/초등/중고등)
  url         text not null,           -- 스토리지 공개 URL
  caption     text,                    -- 사진 설명 (선택)
  created_at  timestamptz default now()
);
create index if not exists songsan_photos_session_idx on songsan_photos(session);

-- 2) 참가신청 테이블
create table if not exists songsan_signups (
  id             uuid primary key default gen_random_uuid(),
  student_name   text not null,        -- 학생 이름
  dept           text not null,        -- 부서
  grade          text,                 -- 학년 (선택)
  guardian_name  text,                 -- 보호자 이름
  guardian_phone text not null,        -- 보호자 연락처
  notes          text,                 -- 알레르기 / 복용약 / 특이사항
  agreed         boolean default false,-- 참가 동의
  created_at     timestamptz default now()
);

-- 3) RLS (수련회용 공개 정책 — 익명 키로 읽기/쓰기 허용)
alter table songsan_photos  enable row level security;
alter table songsan_signups enable row level security;

drop policy if exists "songsan_photos read"   on songsan_photos;
drop policy if exists "songsan_photos insert" on songsan_photos;
drop policy if exists "songsan_photos delete" on songsan_photos;
create policy "songsan_photos read"   on songsan_photos for select using (true);
create policy "songsan_photos insert" on songsan_photos for insert with check (true);
create policy "songsan_photos delete" on songsan_photos for delete using (true);

drop policy if exists "songsan_signups read"   on songsan_signups;
drop policy if exists "songsan_signups insert" on songsan_signups;
create policy "songsan_signups read"   on songsan_signups for select using (true);
create policy "songsan_signups insert" on songsan_signups for insert with check (true);

-- 3-1) 신청 삭제 — 직접 delete는 막고, 관리자 암호를 서버에서 검증하는 RPC로만 허용
create or replace function songsan_delete_signup(p_id uuid, p_pass text)
returns boolean
language plpgsql security definer set search_path=public as $$
begin
  if p_pass <> 'songsan2026' then
    raise exception 'wrong_password';
  end if;
  delete from songsan_signups where id = p_id;
  return found;
end $$;

-- 2-1) 라이브 상태 (관리자가 띄우는 성경암송 말씀 등) — 단일 행
create table if not exists songsan_live (
  id         text primary key default 'current',
  verse_ref  text,                    -- 예: 히브리서 12:2
  verse_body text,                    -- 말씀 본문
  updated_at timestamptz default now()
);
insert into songsan_live (id) values ('current') on conflict (id) do nothing;

-- 2-2) 커뮤니케이션 보드 (항해일지)
create table if not exists songsan_board (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  dept       text,
  message    text not null,
  created_at timestamptz default now()
);

alter table songsan_live  enable row level security;
alter table songsan_board enable row level security;
drop policy if exists "songsan_live read"   on songsan_live;
drop policy if exists "songsan_live write"   on songsan_live;
create policy "songsan_live read"  on songsan_live for select using (true);
create policy "songsan_live write" on songsan_live for update using (true) with check (true);
drop policy if exists "songsan_board read"   on songsan_board;
drop policy if exists "songsan_board insert" on songsan_board;
create policy "songsan_board read"   on songsan_board for select using (true);
create policy "songsan_board insert" on songsan_board for insert with check (true);

-- 3-1) 마피아 게임 (실시간)
create table if not exists songsan_mafia (
  id          text primary key default 'current',
  phase       text default 'lobby',   -- lobby|night|day|vote|result|ended
  settings    jsonb default '{}',      -- {mafia,doctor,police}
  round       int default 0,
  mission     text,
  last_killed text,
  message     text,
  winner      text,
  updated_at  timestamptz default now()
);
insert into songsan_mafia (id) values ('current') on conflict (id) do nothing;

create table if not exists songsan_mafia_players (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  role         text,
  alive        boolean default true,
  vote         text,
  night_target text,
  joined_at    timestamptz default now()
);

create table if not exists songsan_mafia_missions (
  id   uuid primary key default gen_random_uuid(),
  text text not null
);

alter table songsan_mafia          enable row level security;
alter table songsan_mafia_players  enable row level security;
alter table songsan_mafia_missions enable row level security;
drop policy if exists "mafia all"          on songsan_mafia;
drop policy if exists "mafia_players all"   on songsan_mafia_players;
drop policy if exists "mafia_missions all"  on songsan_mafia_missions;
create policy "mafia all"          on songsan_mafia          for all using (true) with check (true);
create policy "mafia_players all"  on songsan_mafia_players  for all using (true) with check (true);
create policy "mafia_missions all" on songsan_mafia_missions for all using (true) with check (true);

-- 4) 사진 스토리지 버킷 (공개)
insert into storage.buckets (id, name, public)
values ('songsan', 'songsan', true)
on conflict (id) do nothing;

drop policy if exists "songsan_obj read"   on storage.objects;
drop policy if exists "songsan_obj insert" on storage.objects;
drop policy if exists "songsan_obj delete" on storage.objects;
create policy "songsan_obj read"   on storage.objects for select using (bucket_id = 'songsan');
create policy "songsan_obj insert" on storage.objects for insert with check (bucket_id = 'songsan');
create policy "songsan_obj delete" on storage.objects for delete using (bucket_id = 'songsan');
